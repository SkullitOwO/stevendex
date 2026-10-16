const $ = s => document.querySelector(s);
const SAVE = 'boosterdex-v1', FREE_MS = 5 * 60e3, PITY_M = 150, PITY_S = 10, SHINY = 0.02;
const RAR = Object.fromEntries(RARITIES.map(r => [r.key, r]));
const RKEYS = RARITIES.map(r => r.key);

let saved = {};
try { saved = JSON.parse(localStorage.getItem(SAVE)) || {}; } catch {}
const state = Object.assign({ coins: 1000, owned: {}, pityM: 0, pityS: 0, freeAt: 0 }, saved);
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(state)); } catch {} };
let sel = BOOSTERS[0];

const pad = n => String(n).padStart(3, '0');
const pick = a => a[Math.random() * a.length | 0];
const art = (p, shiny) => window.FANART?.[p.id] ||
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shiny ? 'shiny/' : ''}${p.id}.png`;
const poolOf = b => POKEMON.filter(p => !b.types || p.types.some(t => b.types.includes(t)));

// Probabilité de chaque rareté pour une carte ; une rareté absente du booster cède son poids à la suivante en dessous.
function dist(pool, guar) {
  const have = new Set(pool.map(p => p.r)), d = {};
  let carry = 0;
  for (const r of [...RARITIES].reverse()) {
    const w = (guar ? r.guar : r.weight) + carry;
    if (have.has(r.key)) { d[r.key] = w; carry = 0; } else { d[r.key] = 0; carry = w; }
  }
  const sum = RKEYS.reduce((a, k) => a + d[k], 0);
  for (const k of RKEYS) d[k] /= sum;
  return d;
}
function roll(d) {
  let x = Math.random();
  for (const k of RKEYS) if (d[k] && (x -= d[k]) < 0) return k;
  return RKEYS.findLast(k => d[k]);
}
// Jamais de tirage dans une rareté vide
BOOSTERS.forEach(b => [false, true].forEach(g => {
  const pool = poolOf(b), d = dist(pool, g);
  console.assert(RKEYS.every(k => !d[k] || pool.some(p => p.r === k)), 'rareté vide', b.id);
}));

function openPack(b) {
  const pool = poolOf(b), n = dist(pool, false), g = dist(pool, true);
  state.pityM++; state.pityS++;
  const rars = [roll(n), roll(n), roll(n), roll(n), n.M && state.pityM >= PITY_M ? 'M' : roll(g)];
  const cards = rars.map(r => ({ p: pick(pool.filter(p => p.r === r)), shiny: Math.random() < SHINY }));
  if (state.pityS >= PITY_S && !cards.some(c => c.shiny)) pick(cards).shiny = true;
  if (rars.includes('M')) state.pityM = 0;
  if (cards.some(c => c.shiny)) state.pityS = 0;
  let gain = 0;
  for (const c of cards) {
    const k = c.p.id + (c.shiny ? 's' : '');
    c.isNew = !state.owned[k];
    state.owned[k] = (state.owned[k] || 0) + 1;
    if (!c.isNew) gain += RAR[c.p.r].dup * (c.shiny ? 3 : 1);
  }
  state.coins += gain;
  cards.sort((a, b) => RKEYS.indexOf(a.p.r) - RKEYS.indexOf(b.p.r));
  return { cards, gain };
}

function buy() {
  const free = Date.now() >= state.freeAt;
  if (!free && state.coins < sel.price) return;
  if (free) state.freeAt = Date.now() + FREE_MS; else state.coins -= sel.price;
  const res = openPack(sel);
  save(); render();
  showOpening(sel, res);
}

function packHTML(b) {
  return `<div class="pack" style="--c:${b.color}"><div class="pack-in">
    <div class="crimp"></div><div class="crimp bot"></div>
    <div class="logo-p">Booster<span>dex</span></div><div class="picon">${b.icon}</div>
    <img class="mascot" src="${art(POKEMON[b.mascot - 1])}" alt="">
    <div class="pname">${b.name}</div><div class="psub">${b.sub} · 5 cartes</div>
  </div></div>`;
}
function cardHTML(p, shiny = false, isNew = false) {
  const R = RAR[p.r], T = TYPES[p.types[0]];
  const hp = 30 + RKEYS.indexOf(p.r) * 30 + p.id * 7 % 4 * 10;
  return `<div class="card r-${p.r}${shiny ? ' shiny' : ''}" style="--c:${T.color};--rc:${R.color}"><div class="c-in">
    <div class="c-top"><b>${p.name}</b><span class="hp">PV<strong>${hp}</strong></span><span class="nrg">${T.icon}</span></div>
    <div class="c-art"><img src="${art(p, shiny)}" alt="${p.name}" loading="lazy"></div>
    <div class="c-info">N° ${pad(p.id)} · Pokémon ${p.types.map(t => TYPES[t].name).join(' / ')}</div>
    <div class="c-atk"><span class="nrg">${T.icon}</span><b>${T.atk}</b><span>${Math.round(hp / 20) * 10}</span></div>
    <div class="c-bot"><span>${pad(p.id)}/${POKEMON.length}</span><em>${shiny ? '✦ Doré' : R.sym + ' ' + R.name}</em></div>
    </div>${isNew ? '<div class="new">Nouveau !</div>' : ''}<div class="holo"></div></div>`;
}

const fmt = p => (p * 100).toLocaleString('fr-FR', { maximumFractionDigits: p < 0.1 ? 2 : 1 });
function renderPanel() {
  const b = sel, pool = poolOf(b), n = dist(pool, false), g = dist(pool, true);
  const odds = RARITIES.filter(r => r.key !== 'C' && n[r.key] + g[r.key] > 0).map(r => {
    const p = 1 - (1 - n[r.key]) ** 4 * (1 - g[r.key]);
    return `<div class="odd" style="--rc:${r.color}"><span><i></i>${r.sym} ${r.name}</span><div class="bar"><i style="width:${p * 100}%"></i></div><span class="v">${fmt(p)} %</span></div>`;
  }).join('');
  const panel = $('#panel');
  panel.style.setProperty('--c', b.color);
  panel.innerHTML = `<div class="ph"><div class="em">${b.icon}</div><div><b>${b.name}</b><span>${b.sub}</span></div></div>
    <div class="stats">
      <div class="stat"><b>5</b><span>cartes par booster</span></div>
      <div class="stat"><b style="color:${RAR.R.color}">Rare</b><span>ou mieux, garantie</span></div>
      <div class="stat"><b style="color:${RAR.M.color}">${n.M ? PITY_M - state.pityM : '—'}</b><span>${n.M ? 'avant Mythique sûre' : 'pas de Mythique ici'}</span></div>
      <div class="stat"><b style="color:#d9a400">${PITY_S - state.pityS}</b><span>avant le doré</span></div>
    </div>
    <button class="see" id="see">Voir les ${pool.length} Pokémon</button>
    <div class="odds"><h4>CHANCE PAR BOOSTER</h4>${odds}</div>
    <button class="btn" id="buy"></button><div class="timer" id="timer"></div>`;
  $('#buy').onclick = buy;
  $('#see').onclick = () => { $('#dexFilter').value = b.id; show('dex'); };
  tick();
}
function tick() {
  const left = state.freeAt - Date.now(), free = left <= 0, btn = $('#buy');
  btn.innerHTML = `Ouvrir <small>${free ? 'Gratuit' : sel.price + ' ₽'}</small>`;
  btn.disabled = !free && state.coins < sel.price;
  const s = Math.ceil(left / 1000);
  $('#timer').textContent = free ? 'Booster gratuit disponible !'
    : `Prochain gratuit dans ${String(s / 60 | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function render() {
  $('#coins').textContent = state.coins.toLocaleString('fr-FR');
  const got = POKEMON.filter(p => state.owned[p.id] || state.owned[p.id + 's']).length;
  $('#dexCount').textContent = `${got}/${POKEMON.length}`;
  $('#dexTxt').textContent = `${got} / ${POKEMON.length}`;
  $('#dexBar').style.width = got / POKEMON.length * 100 + '%';
  $('#packs').innerHTML = BOOSTERS.map(b =>
    `<button class="slot${b === sel ? ' on' : ''}" data-id="${b.id}">${packHTML(b)}<span class="price">${b.price} ₽</span></button>`).join('');
  renderPanel();
}

function renderDex() {
  const b = BOOSTERS.find(x => x.id === $('#dexFilter').value);
  $('#dexGrid').innerHTML = poolOf(b).map(p => {
    const n = state.owned[p.id] || 0, s = state.owned[p.id + 's'] || 0;
    return n || s
      ? `<div class="dex-cell has" data-id="${p.id}" data-s="${n ? 0 : 1}">${cardHTML(p, !n)}<div class="cnt">${n ? '×' + n : ''}${s ? ' ✦' + s : ''}</div></div>`
      : `<div class="dex-cell"><img class="sil" src="${art(p)}" loading="lazy" alt=""><span>#${pad(p.id)}</span></div>`;
  }).join('');
}

function show(v) {
  document.querySelectorAll('.view').forEach(e => e.classList.toggle('on', e.id === v));
  document.querySelectorAll('.tabs button').forEach(e => e.classList.toggle('on', e.dataset.view === v));
  if (v === 'dex') renderDex();
}

function showOpening(b, res) {
  const o = $('#overlay');
  o.hidden = false;
  o.innerHTML = `<div class="stage"><div class="big-pack shake">${packHTML(b)}</div><p class="hint">Clique sur le booster pour l'ouvrir</p></div>`;
  o.querySelector('.big-pack').onclick = e => {
    e.currentTarget.classList.replace('shake', 'tear');
    setTimeout(() => reveal(res), 700);
  };
}
function reveal(res) {
  const o = $('#overlay');
  o.innerHTML = `<div class="stage">
    <div class="row">${res.cards.map((c, i) => `<div class="flip${'LM'.includes(c.p.r) || c.shiny ? ' glow' : ''}" style="--d:${i * 90}ms;--rc:${c.shiny ? '#ffd76a' : RAR[c.p.r].color}">
      <div class="flip-in"><div class="back"></div><div class="front">${cardHTML(c.p, c.shiny, c.isNew)}</div></div></div>`).join('')}</div>
    <div class="actions"><button id="all" class="btn ghost">Tout révéler</button><button id="done" class="btn" hidden>Continuer</button><span id="gain" class="mono"></span></div></div>`;
  const flips = [...o.querySelectorAll('.flip')];
  flips.forEach(f => f.onclick = () => {
    if (f.classList.contains('open')) return;
    f.classList.add('open');
    if (flips.every(x => x.classList.contains('open'))) {
      $('#all').hidden = true; $('#done').hidden = false;
      if (res.gain) $('#gain').textContent = `+${res.gain} ₽ grâce aux doublons`;
    }
  });
  $('#all').onclick = () => flips.forEach((f, i) => setTimeout(() => f.click(), i * 220));
  $('#done').onclick = () => { o.hidden = true; o.innerHTML = ''; };
}

$('#packs').onclick = e => {
  const s = e.target.closest('.slot');
  if (s) { sel = BOOSTERS.find(b => b.id === s.dataset.id); render(); }
};
document.querySelector('.tabs').onclick = e => e.target.closest('button') && show(e.target.closest('button').dataset.view);
$('#dexFilter').innerHTML = BOOSTERS.map(b => `<option value="${b.id}">${b.id === 'mix' ? 'Tous' : b.name + ' — ' + b.sub}</option>`).join('');
$('#dexFilter').onchange = renderDex;
$('#dexGrid').onclick = e => {
  const c = e.target.closest('.dex-cell.has');
  if (!c) return;
  const o = $('#overlay');
  o.hidden = false;
  o.innerHTML = `<div class="zoom">${cardHTML(POKEMON[c.dataset.id - 1], c.dataset.s === '1')}</div>`;
  o.onclick = ev => { if (!ev.target.closest('.zoom')) { o.hidden = true; o.innerHTML = ''; o.onclick = null; } };
};

// Inclinaison 3D + reflet holo qui suit la souris
document.addEventListener('pointermove', e => {
  const el = e.target.closest('.card, .pack');
  if (!el) return;
  const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--rx', (0.5 - y) * 18 + 'deg');
  el.style.setProperty('--ry', (x - 0.5) * 18 + 'deg');
  el.style.setProperty('--mx', x * 100 + '%');
  el.style.setProperty('--my', y * 100 + '%');
});
document.addEventListener('pointerout', e => {
  const el = e.target.closest('.card, .pack');
  if (el && !el.contains(e.relatedTarget)) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); }
});

render();
setInterval(tick, 1000);
