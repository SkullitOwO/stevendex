const $ = s => document.querySelector(s);
const SAVE = 'boosterdex-v1', FREE_MS = 5 * 60e3, PITY_M = 150, PITY_S = 10, SHINY = 0.02;
const RAR = Object.fromEntries(RARITIES.map(r => [r.key, r]));
const RKEYS = RARITIES.map(r => r.key);

let saved = {};
try { saved = JSON.parse(localStorage.getItem(SAVE)) || {}; } catch {}
const state = Object.assign({ coins: 1000, owned: {}, pityM: 0, pityS: 0, freeAt: 0 }, saved);
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(state)); } catch {} };
let sel = 0;

const pad = n => String(n).padStart(3, '0');
const pick = a => a[Math.random() * a.length | 0];
const wait = ms => new Promise(r => setTimeout(r, ms));
const art = (p, shiny) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shiny ? 'shiny/' : ''}${p.id}.png`;
const poolOf = b => POKEMON.filter(p => !b.types || p.types.some(t => b.types.includes(t)));
const owns = p => (state.owned[p.id] || 0) + (state.owned[p.id + 's'] || 0);

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

// Jamais deux fois le même Pokémon dans un booster ; une carte déjà possédée est retirée une fois pour limiter les doublons.
function draw(pool, r, taken) {
  let bucket = pool.filter(p => p.r === r && !taken.has(p.id));
  if (!bucket.length) bucket = pool.filter(p => !taken.has(p.id));
  let p = pick(bucket);
  if (owns(p)) p = pick(bucket);
  taken.add(p.id);
  return p;
}
function openPack(b) {
  const pool = poolOf(b), n = dist(pool, false), g = dist(pool, true), taken = new Set();
  state.pityM++; state.pityS++;
  const rars = [roll(n), roll(n), roll(n), roll(n), n.M && state.pityM >= PITY_M ? 'M' : roll(g)];
  const cards = rars.map(r => ({ p: draw(pool, r, taken), shiny: Math.random() < SHINY }));
  if (state.pityS >= PITY_S && !cards.some(c => c.shiny)) pick(cards).shiny = true;
  if (cards.some(c => c.p.r === 'M')) state.pityM = 0;
  if (cards.some(c => c.shiny)) state.pityS = 0;
  let gain = 0;
  for (const c of cards) {
    const k = c.p.id + (c.shiny ? 's' : '');
    c.isNew = !state.owned[k];
    state.owned[k] = (state.owned[k] || 0) + 1;
    if (!c.isNew) gain += RAR[c.p.r].dup * (c.shiny ? 3 : 1);
  }
  state.coins += gain;
  cards.sort((a, b) => RKEYS.indexOf(a.p.r) - RKEYS.indexOf(b.p.r) || a.shiny - b.shiny);
  return { cards, gain };
}

/* ---------- Rendus ---------- */
function packHTML(b) {
  return `<div class="pack" style="--c:${b.color}"><div class="pack-in">
    <div class="pk-bg"></div>
    <img class="pk-mon" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${b.mascot}.png" alt="">
    <div class="pk-low"></div>
    <div class="crimp"></div><div class="crimp bot"></div>
    <div class="pk-top">Boosterdex</div>
    <div class="pk-name"><b>${b.name}</b><i>${b.sub}</i></div>
    <div class="pk-wrap"></div><div class="pk-sheen"></div>
  </div></div>`;
}
// Carte « full art » : fanart (ou décor du type + artwork officiel), nom en bas.
function cardHTML(p, shiny = false, isNew = false) {
  const R = RAR[p.r], fan = window.FANART?.[p.id];
  const sc = fan ? null : scene(p.types[0], p.id);
  const inner = fan ? `<img class="full" src="${fan}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.className='poke';this.src='${art(p, shiny)}'">`
    : `${sc.back}<img class="poke" src="${art(p, shiny)}" alt="${p.name}" loading="lazy">${sc.front}`;
  return `<div class="card r-${p.r}${shiny ? ' shiny' : ''}" style="--rc:${R.color}">
    <div class="frame" style="background:${sc ? sc.bg : '#222'}">${inner}
      <div class="types">${p.types.map(t => `<i style="--t:${TYPES[t].color}">${TYPES[t].name}</i>`).join('')}</div>
      <div class="sym">${shiny ? '✦' : R.sym}</div>
      <div class="label"><b>${p.name}</b><span>N° ${pad(p.id)}</span></div>
    </div>${isNew ? '<div class="new">Nouveau !</div>' : ''}<div class="holo"></div></div>`;
}
const backHTML = () => '<div class="back"><div class="back-in"><div class="back-ball"></div><div class="back-txt">Boosterdex</div></div></div>';

/* ---------- Boutique ---------- */
const fmt = p => (p * 100).toLocaleString('fr-FR', { maximumFractionDigits: p < 0.1 ? 2 : 1 });
function renderShop() {
  const b = BOOSTERS[sel];
  document.body.style.setProperty('--sel', b.color);
  $('#packs').innerHTML = BOOSTERS.map((x, i) => {
    const o = i - sel, a = Math.abs(o);
    return `<button class="slot${o ? '' : ' on'}" data-i="${i}" style="--o:${o};--a:${a};${a > 2 ? 'pointer-events:none;' : ''}" aria-label="${x.name}">${packHTML(x)}</button>`;
  }).join('');
  const info = $('#info');
  info.style.setProperty('--c', b.color);
  info.innerHTML = `<h2>${b.name}</h2><p class="sub">${b.sub}</p>
    <div class="price" id="price"></div><p class="timer" id="timer"></p>`;
  tick();
}
function tick() {
  const price = $('#price');
  if (!price) return;
  const b = BOOSTERS[sel], left = state.freeAt - Date.now(), free = left <= 0, s = Math.ceil(left / 1000);
  price.className = 'price' + (free ? ' free' : state.coins < b.price ? ' poor' : '');
  price.innerHTML = free ? 'Gratuit' : `<i class="coin"></i>${b.price}`;
  $('#timer').innerHTML = free ? "Clique sur le booster pour l'ouvrir"
    : `Booster gratuit dans ${String(s / 60 | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function renderTop() {
  $('#coins').textContent = state.coins.toLocaleString('fr-FR');
  const got = POKEMON.filter(owns).length;
  $('#bookCount').textContent = `${got}/${POKEMON.length}`;
  $('#bookTxt').textContent = `${got} / ${POKEMON.length} Pokémon`;
  $('#bookBar').style.width = got / POKEMON.length * 100 + '%';
}
function buy() {
  const b = BOOSTERS[sel], free = Date.now() >= state.freeAt;
  if (!free && state.coins < b.price) return;
  if (free) state.freeAt = Date.now() + FREE_MS; else state.coins -= b.price;
  const res = openPack(b);
  save(); renderTop(); renderShop();
  openFlow(b, res);
}

/* ---------- Ouverture ---------- */
const closeOverlay = () => { const o = $('#overlay'); o.hidden = true; o.className = 'overlay'; o.innerHTML = ''; o.onclick = null; };
function burst(host, color, n) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 140 + Math.random() * 300;
    s.className = 'spark' + (i % 3 ? '' : ' star');
    s.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--c:${color};--s:${5 + Math.random() * 10}px;animation-delay:${Math.random() * 150}ms`;
    host.appendChild(s);
    setTimeout(() => s.remove(), 1800);
  }
}
const LABEL = c => c.shiny ? '✦ Carte dorée ✦' : c.p.r === 'M' ? '👑 Mythique !' : '★ Légendaire !';

function openFlow(b, res) {
  const o = $('#overlay');
  o.hidden = false; o.className = 'overlay opening'; o.style.setProperty('--c', b.color); o.onclick = null;
  o.innerHTML = `<button class="skip" id="skip">Tout révéler ⏭</button>
    <div class="op-stage">
      <div class="op-pack"><div class="op-light"></div><div class="tear-top">${packHTML(b)}</div><div class="tear-body">${packHTML(b)}</div><div class="tear-line"><span>✂</span></div></div>
      <p class="hint">Clique sur le booster pour le déchirer</p>
    </div>`;
  let done = false;
  $('#skip').onclick = () => { done = true; summary(b, res); };
  o.querySelector('.op-pack').onclick = async e => {
    const pk = e.currentTarget;
    if (pk.classList.contains('torn')) return;
    pk.classList.add('torn');
    o.querySelector('.hint').textContent = '';
    await wait(1100);
    if (!done) deck(b, res, () => done);
  };
}

function deck(b, res, skipped) {
  const o = $('#overlay'), cards = res.cards;
  o.querySelector('.op-stage').innerHTML = `
    <div class="counter" id="counter">Carte 1 / ${cards.length}</div>
    <div class="deck" id="deck"><div class="rays"></div>
      ${cards.map((c, i) => `<div class="flip" data-i="${i}" style="--rc:${c.shiny ? '#ffd76a' : RAR[c.p.r].color};--d:${(cards.length - i) * 80}ms;z-index:${cards.length - i}">
        <div class="flip-in">${backHTML()}<div class="front">${cardHTML(c.p, c.shiny, c.isNew)}</div></div></div>`).join('')}
    </div>
    <div class="pile" id="pile"></div>
    <p class="hint" id="hint">Touche la carte pour la retourner</p>`;
  const flips = [...o.querySelectorAll('.flip')], deckEl = $('#deck');
  let i = 0, busy = false;
  const layout = () => flips.forEach((f, k) => {
    const d = k - i;
    if (d >= 0) f.style.transform = `translate(${d * 5}px, ${d * -5}px) rotate(${d * 2}deg)`;
  });
  layout();
  deckEl.onclick = async () => {
    if (busy || skipped()) return;
    const f = flips[i], c = cards[i];
    if (!f) return;
    busy = true;
    if (!f.classList.contains('open')) {
      const epic = c.shiny || 'LM'.includes(c.p.r);
      if (epic) {
        $('#hint').textContent = '…';
        o.classList.add('dim');
        f.classList.add('charging');
        await wait(1300);
        f.classList.remove('charging');
        o.insertAdjacentHTML('beforeend', '<div class="flash"></div>');
        setTimeout(() => o.querySelector('.flash')?.remove(), 700);
        f.classList.add('open', 'epic');
        deckEl.classList.add('show-rays');
        deckEl.style.setProperty('--rc', f.style.getPropertyValue('--rc'));
        o.classList.add('quake');
        burst(deckEl, c.shiny ? '#ffd76a' : RAR[c.p.r].color, 60);
        deckEl.insertAdjacentHTML('beforeend', `<div class="banner" style="--rc:${c.shiny ? '#ffd76a' : RAR[c.p.r].color}">${LABEL(c)}</div>`);
        await wait(600);
        o.classList.remove('quake');
      } else {
        f.classList.add('open');
        if (c.p.r === 'E') burst(deckEl, RAR.E.color, 22);
        await wait(450);
      }
      $('#hint').textContent = i < cards.length - 1 ? 'Touche encore pour la carte suivante' : 'Touche pour voir ton booster';
    } else {
      o.classList.remove('dim');
      deckEl.classList.remove('show-rays');
      deckEl.querySelector('.banner')?.remove();
      f.classList.add('gone');
      $('#pile').insertAdjacentHTML('beforeend', `<div class="mini">${cardHTML(c.p, c.shiny)}</div>`);
      i++;
      layout();
      await wait(350);
      if (i >= cards.length) { busy = false; return summary(b, res); }
      $('#counter').textContent = `Carte ${i + 1} / ${cards.length}`;
      $('#hint').textContent = 'Touche la carte pour la retourner';
    }
    busy = false;
  };
}

function summary(b, res) {
  const o = $('#overlay');
  o.classList.remove('dim', 'quake');
  const news = res.cards.filter(c => c.isNew).length, price = BOOSTERS[sel].price;
  const canAgain = Date.now() >= state.freeAt || state.coins >= price;
  o.querySelector('#skip')?.remove();
  o.querySelector('.op-stage').innerHTML = `<div class="summary">
    <h2>Booster ${b.name} ouvert !</h2>
    <p class="sum-sub">${news ? `${news} nouvelle${news > 1 ? 's' : ''} carte${news > 1 ? 's' : ''} pour ton classeur` : 'Que des cartes que tu avais déjà'}${res.gain ? ` · +${res.gain} Pokédollars grâce aux doublons` : ''}</p>
    <div class="sum-row">${res.cards.map((c, i) => `<div class="sum-card" style="--d:${i * 110}ms">${cardHTML(c.p, c.shiny, c.isNew)}</div>`).join('')}</div>
    <div class="sum-actions">
      <button class="btn ghost" id="toBook">Voir le classeur</button>
      <button class="btn" id="again" ${canAgain ? '' : 'disabled'}>Encore un ! <small>${Date.now() >= state.freeAt ? 'Gratuit' : `<i class="coin"></i>${price}`}</small></button>
    </div>
    <button class="link" id="close">Retour à la boutique</button>
  </div>`;
  $('#close').onclick = closeOverlay;
  $('#toBook').onclick = () => { closeOverlay(); show('book'); };
  $('#again').onclick = () => { closeOverlay(); buy(); };
}

/* ---------- Classeur ---------- */
const PER = 9, PAGES = Math.ceil(POKEMON.length / PER);
let page = 0;
const perView = () => innerWidth < 760 ? 1 : 2;
function pocketHTML(p) {
  const n = state.owned[p.id] || 0, s = state.owned[p.id + 's'] || 0;
  return n || s
    ? `<div class="pocket has" data-id="${p.id}" data-s="${s ? 1 : 0}">${cardHTML(p, !!s)}${n + s > 1 ? `<b class="cnt">×${n + s}</b>` : ''}</div>`
    : `<div class="pocket"><img class="sil" src="${art(p)}" loading="lazy" alt=""><span>N° ${pad(p.id)}</span></div>`;
}
function pageHTML(i) {
  if (i < 0 || i >= PAGES) return '<div class="page blank"></div>';
  return `<div class="page"><div class="pockets">${POKEMON.slice(i * PER, (i + 1) * PER).map(pocketHTML).join('')}</div><div class="pnum">${i + 1}</div></div>`;
}
function renderBook() {
  const v = perView();
  page -= page % v;
  const bd = $('#binder');
  bd.className = 'binder v' + v;
  bd.innerHTML = v === 2 ? `<div class="leaf-l">${pageHTML(page)}</div><div class="rings"></div><div class="leaf-r">${pageHTML(page + 1)}</div>`
    : `<div class="leaf-r">${pageHTML(page)}</div>`;
  $('#pgTxt').textContent = v === 2 ? `Pages ${page + 1}–${Math.min(page + 2, PAGES)} sur ${PAGES}` : `Page ${page + 1} sur ${PAGES}`;
  $('#pgPrev').disabled = page === 0;
  $('#pgNext').disabled = page + v >= PAGES;
}
let turning = false;
function turn(dir) {
  const v = perView(), np = page + dir * v, bd = $('#binder');
  if (turning || np < 0 || np >= PAGES) return;
  turning = true;
  const end = () => { page = np; turning = false; renderBook(); };
  if (v === 1) { bd.classList.add(dir > 0 ? 'slide-next' : 'slide-prev'); return setTimeout(end, 260); }
  const leaf = document.createElement('div');
  leaf.className = 'turning ' + (dir > 0 ? 'fwd' : 'bwd');
  leaf.innerHTML = dir > 0
    ? `<div class="face">${pageHTML(page + 1)}</div><div class="face backf">${pageHTML(np)}</div>`
    : `<div class="face">${pageHTML(page)}</div><div class="face backf">${pageHTML(np + 1)}</div>`;
  bd.querySelector(dir > 0 ? '.leaf-r' : '.leaf-l').innerHTML = pageHTML(dir > 0 ? np + 1 : np);
  bd.appendChild(leaf);
  setTimeout(end, 820); // pas animationend : il ne part jamais si la page est redessinée pendant l'animation
}

function show(v) {
  document.querySelectorAll('.view').forEach(e => e.classList.toggle('on', e.id === v));
  document.querySelectorAll('.tabs button').forEach(e => e.classList.toggle('on', e.dataset.view === v));
  if (v === 'book') renderBook();
}

/* ---------- Événements ---------- */
const select = i => { sel = Math.max(0, Math.min(BOOSTERS.length - 1, i)); renderShop(); };
$('#packs').onclick = e => {
  const s = e.target.closest('.slot');
  if (!s) return;
  if (+s.dataset.i !== sel) return select(+s.dataset.i);
  const b = BOOSTERS[sel];
  if (Date.now() < state.freeAt && state.coins < b.price) {
    s.classList.remove('nope'); void s.offsetWidth; s.classList.add('nope');
    $('#timer').textContent = 'Pas assez de Pokédollars pour celui-ci';
    return;
  }
  buy();
};
$('#prev').onclick = () => select(sel - 1);
$('#next').onclick = () => select(sel + 1);
$('#pgPrev').onclick = () => turn(-1);
$('#pgNext').onclick = () => turn(1);
document.querySelector('.tabs').onclick = e => e.target.closest('button') && show(e.target.closest('button').dataset.view);
document.addEventListener('keydown', e => {
  const o = $('#overlay');
  if (e.key === 'Escape' && o.classList.contains('zoomed')) return closeOverlay();
  if (!o.hidden) return;
  const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
  if (!d) return;
  $('#shop').classList.contains('on') ? select(sel + d) : turn(d);
});
$('#binder').onclick = e => {
  const c = e.target.closest('.pocket.has');
  if (!c || turning) return;
  const p = POKEMON[c.dataset.id - 1], n = state.owned[p.id] || 0, s = state.owned[p.id + 's'] || 0, o = $('#overlay');
  o.hidden = false; o.className = 'overlay zoomed';
  o.innerHTML = `<div class="zoom">${cardHTML(p, c.dataset.s === '1')}
    <p>${p.name} · ${RAR[p.r].name}${n ? ` · ×${n}` : ''}${s ? ` · ✦ dorée ×${s}` : ''}</p></div>`;
  o.onclick = ev => { if (!ev.target.closest('.zoom .card')) closeOverlay(); };
};
addEventListener('resize', () => !turning && $('#book').classList.contains('on') && renderBook());

// Inclinaison 3D + reflet holo qui suit la souris
document.addEventListener('pointermove', e => {
  const el = e.target.closest('.card, .slot.on .pack, .op-pack');
  if (!el) return;
  const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.setProperty('--rx', (0.5 - y) * 18 + 'deg');
  el.style.setProperty('--ry', (x - 0.5) * 18 + 'deg');
  el.style.setProperty('--mx', x * 100 + '%');
  el.style.setProperty('--my', y * 100 + '%');
});
document.addEventListener('pointerout', e => {
  const el = e.target.closest('.card, .pack, .op-pack');
  if (el && !el.contains(e.relatedTarget)) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); }
});

renderTop();
renderShop();
setInterval(tick, 1000);
