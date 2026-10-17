const $ = s => document.querySelector(s);
const SAVE = 'boosterdex-v1', FREE_MS = 5 * 60e3, PITY_M = 150, PITY_S = 15, SHINY = 0.012;
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
// Clé de collection : n° Pokédex, suivi de « s » pour la version dorée
const keyInfo = k => ({ p: POKEMON[parseInt(k) - 1], shiny: k.endsWith('s') });
const priceOf = k => { const { p, shiny } = keyInfo(k); return RAR[p.r].dup * (shiny ? 3 : 1); };

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
  for (const c of cards) {
    const k = c.p.id + (c.shiny ? 's' : '');
    c.isNew = !state.owned[k];
    state.owned[k] = (state.owned[k] || 0) + 1;
  }
  cards.sort((a, b) => RKEYS.indexOf(a.p.r) - RKEYS.indexOf(b.p.r) || a.shiny - b.shiny);
  return { cards };
}

/* ---------- Rendus ---------- */
function packHTML(b) {
  return `<div class="pack" style="--c:${b.color}"><div class="pack-in">
    <div class="pk-bg"></div>
    <img class="pk-mon" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${b.mascot}.png" alt="">
    <div class="pk-low"></div>
    <div class="crimp"></div><div class="crimp bot"></div>
    <div class="pk-top">StevenDex</div>
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
const backHTML = () => '<div class="back"><div class="back-in"><div class="back-ball"></div><div class="back-txt">StevenDex</div></div></div>';

/* ---------- Boutique ---------- */
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
const dupKeys = () => Object.keys(state.owned).filter(k => state.owned[k] > 1);
function renderTop() {
  $('#coins').textContent = state.coins.toLocaleString('fr-FR');
  const got = POKEMON.filter(owns).length, dups = dupKeys().reduce((a, k) => a + state.owned[k] - 1, 0);
  $('#bookCount').textContent = `${got}/${POKEMON.length}`;
  $('#hudBar').style.width = got / POKEMON.length * 100 + '%';
  $('#dupCount').textContent = dups ? dups : '';
  $('#bookTxt').textContent = `${got} / ${POKEMON.length} Pokémon`;
  $('#bookBar').style.width = got / POKEMON.length * 100 + '%';
  $('#mute').textContent = sfx.muted ? '🔇' : '🔊';
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
const closeOverlay = () => { FX.clear(); const o = $('#overlay'); o.hidden = true; o.className = 'overlay'; o.innerHTML = ''; o.onclick = null; };
function burst(host, color, n) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 140 + Math.random() * 300;
    s.className = 'spark' + (i % 3 ? '' : ' star');
    s.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--c:${color};--s:${5 + Math.random() * 10}px;animation-delay:${Math.random() * 150}ms`;
    host.appendChild(s);
    setTimeout(() => s.remove(), 1800);
  }
}
const epicOf = c => c.shiny || 'LM'.includes(c.p.r);
function confetti(o, c) {
  const pal = c.shiny ? ['#ffd76a', '#fff3b0', '#ffb300', '#fff'] : c.p.r === 'M' ? ['#ff6b6b', '#ffd93b', '#6bff95', '#5ac8ff', '#b46bff'] : ['#f5c518', '#fff1b0', '#fff', '#ffcb05'];
  for (let i = 0; i < 110; i++) {
    const k = document.createElement('i');
    k.className = 'conf';
    k.style.cssText = `left:${Math.random() * 100}vw;--c:${pal[i % pal.length]};--x:${(Math.random() - .5) * 240}px;--r:${Math.random() * 1080 - 540}deg;--t:${2.2 + Math.random() * 1.6}s;--d:${Math.random() * .7}s;width:${6 + Math.random() * 8}px`;
    o.appendChild(k);
    setTimeout(() => k.remove(), 4800);
  }
}
const LABEL = c => c.shiny ? '✦ Carte dorée ✦' : c.p.r === 'M' ? '👑 Mythique !' : '★ Légendaire !';
const rcOf = c => c.shiny ? '#ffd76a' : RAR[c.p.r].color;

function openFlow(b, res) {
  const o = $('#overlay');
  o.hidden = false; o.className = 'overlay opening'; o.style.setProperty('--c', b.color); o.onclick = null;
  o.innerHTML = `<button class="skip" id="skip">Tout révéler ⏭</button>
    <div class="op-stage">
      <div class="op-pack" id="opPack"><div class="op-light"></div>
        <div class="tear-rest">${packHTML(b)}</div><div class="tear-body">${packHTML(b)}</div><div class="tear-top">${packHTML(b)}</div>
        <div class="tear-line"><i id="cutFill"></i><span id="scis">✂</span></div></div>
      <p class="hint" id="hint">Glisse le long des pointillés pour déchirer</p>
    </div>`;
  sfx.whoosh();
  let done = false;
  $('#skip').onclick = () => { done = true; summary(b, res); };
  const pk = $('#opPack'), fill = $('#cutFill'), scis = $('#scis'), flap = pk.querySelector('.tear-top'), rest = pk.querySelector('.tear-rest');
  const J = Array.from({ length: 41 }, () => Math.random()); // bord déchiré irrégulier
  let prog = 0, dragging = false, lastTick = 0, x0 = 0;
  // Le rabat déjà découpé (de 0 au doigt) se soulève en pivotant autour du doigt ; le reste du haut reste collé.
  const drawTear = () => {
    const p = prog * 100;
    let poly = `0% 0%, ${p}% 0%, ${p}% 9%`;
    for (let i = Math.floor(p / 2.5); i >= 0; i--) poly += `, ${i * 2.5}% ${(9 + (J[i] - .5) * 2.4).toFixed(2)}%`;
    flap.style.clipPath = `polygon(${poly})`;
    flap.style.transformOrigin = `${p}% 9%`;
    flap.style.transform = `translateY(${-prog * 6}px) rotate(${-Math.min(14, prog * 18)}deg)`;
    rest.style.clipPath = `polygon(${p}% 0%, 100% 0%, 100% 9%, ${p}% 9%)`;
    fill.style.width = p + '%';
    scis.style.left = `calc(${p}% - 11px)`;
  };
  const setProg = v => {
    prog = Math.max(prog, Math.min(1, v));
    drawTear();
    if (prog - lastTick > .07) { lastTick = prog; sfx.cut(); }
  };
  drawTear();
  const tear = async () => {
    if (pk.classList.contains('torn')) return;
    prog = 1; drawTear();
    pk.classList.add('torn');
    sfx.tear();
    $('#hint').textContent = '';
    await wait(750);
    if (!done) deck(b, res, () => done);
  };
  const rel = e => { const r = pk.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
  pk.onpointerdown = e => { e.preventDefault(); if (pk.classList.contains('torn')) return; dragging = true; x0 = e.clientX; pk.setPointerCapture(e.pointerId); pk.classList.add('cutting'); };
  pk.onpointermove = e => { if (dragging) setProg(rel(e)); };
  pk.onpointerup = async e => {
    if (!dragging) return;
    dragging = false;
    pk.classList.remove('cutting');
    if (prog > .6) return tear();
    if (Math.abs(e.clientX - x0) < 8) { // simple clic : les ciseaux font le tour tout seuls
      for (let v = prog; v <= 1; v += .08) { setProg(v); await wait(28); }
      return tear();
    }
  };
}

function deck(b, res, skipped) {
  const o = $('#overlay'), cards = res.cards;
  o.querySelector('.op-stage').innerHTML = `
    <div class="counter" id="counter">Carte 1 / ${cards.length}</div>
    <div class="deck" id="deck"><div class="rays"></div>
      ${cards.map((c, i) => `<div class="flip" data-i="${i}" style="--rc:${rcOf(c)};--d:${(cards.length - i) * 90}ms;z-index:${cards.length - i}">
        <div class="flip-in">${backHTML()}<div class="front">${cardHTML(c.p, c.shiny, c.isNew)}</div></div></div>`).join('')}
    </div>
    <div class="pile" id="pile"></div>
    <p class="hint" id="hint">Touche la carte pour la retourner</p>`;
  const flips = [...o.querySelectorAll('.flip')], deckEl = $('#deck');
  let i = 0, busy = false;
  const layout = () => flips.forEach((f, k) => {
    const d = k - i;
    if (d >= 0) f.style.transform = `translate(${d * 5}px, ${d * -5}px) rotate(${d * 2}deg)`;
    f.classList.toggle('tease', d === 0 && epicOf(cards[k]) && !f.classList.contains('open'));
  });
  layout();
  cards.forEach((_, k) => setTimeout(sfx.flip, 200 + k * 90));
  deckEl.onclick = async () => {
    if (busy || skipped()) return;
    const f = flips[i], c = cards[i];
    if (!f) return;
    busy = true;
    if (!f.classList.contains('open')) {
      if (epicOf(c)) {
        const col = rcOf(c);
        $('#hint').textContent = '';
        o.classList.add('dim');
        deckEl.style.setProperty('--rc', col);
        f.classList.remove('tease');
        f.classList.add('charging');
        sfx.charge();
        for (const pw of [.5, .8, 1.1, 1.5]) { FX.charge(f, c.p.types[0], col, pw); await wait(375); }
        f.classList.remove('charging');
        o.insertAdjacentHTML('beforeend', '<div class="flash"></div>');
        setTimeout(() => o.querySelector('.flash')?.remove(), 900);
        deckEl.insertAdjacentHTML('beforeend', '<div class="shock"></div><div class="shock s2"></div>');
        setTimeout(() => deckEl.querySelectorAll('.shock').forEach(s => s.remove()), 1300);
        f.classList.add('open', 'epic');
        deckEl.classList.add('show-rays');
        o.classList.add('quake', c.shiny ? 'gold' : c.p.r === 'M' ? 'myth' : 'leg');
        sfx.epic();
        FX.explode(f, c.p.types[0], col, 1.6);
        confetti(o, c);
        deckEl.insertAdjacentHTML('beforeend', `<div class="banner" style="--rc:${col}">${[...LABEL(c)].map((ch, n) => `<span style="--i:${n}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</div>
          <div class="reveal-name" style="--rc:${col}">${c.p.name}<small>${RAR[c.p.r].name}${c.shiny ? ' · dorée' : ''}</small></div>`);
        await wait(1100);
        o.classList.remove('quake');
      } else {
        if (c.p.r === 'E') { FX.charge(f, c.p.types[0], RAR.E.color, .7); await wait(250); }
        f.classList.add('open');
        sfx.flip();
        setTimeout(() => sfx.reveal(c.p.r), 260);
        if (c.p.r === 'E') setTimeout(() => FX.explode(f, c.p.types[0], RAR.E.color, .5), 260);
        await wait(550);
      }
      $('#hint').textContent = i < cards.length - 1 ? 'Touche encore pour la carte suivante' : 'Touche pour voir ton booster';
    } else {
      o.classList.remove('dim', 'gold', 'myth', 'leg');
      deckEl.classList.remove('show-rays');
      deckEl.querySelectorAll('.banner, .reveal-name').forEach(x => x.remove());
      f.classList.add('gone');
      sfx.whoosh();
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
  const news = res.cards.filter(c => c.isNew).length, dups = res.cards.length - news, price = BOOSTERS[sel].price;
  const canAgain = Date.now() >= state.freeAt || state.coins >= price;
  o.querySelector('#skip')?.remove();
  o.querySelector('.op-stage').innerHTML = `<div class="summary">
    <h2>Booster ${b.name} ouvert !</h2>
    <p class="sum-sub">${news ? `${news} nouvelle${news > 1 ? 's' : ''} carte${news > 1 ? 's' : ''} pour ton classeur` : 'Que des cartes que tu avais déjà'}${dups ? ` · ${dups} doublon${dups > 1 ? 's' : ''} à revendre au Marché` : ''}</p>
    <div class="sum-row">${res.cards.map((c, i) => `<div class="sum-card" style="--d:${i * 110}ms">${cardHTML(c.p, c.shiny, c.isNew)}</div>`).join('')}</div>
    <div class="sum-actions">
      <button class="btn ghost" id="toBook">Voir le classeur</button>
      <button class="btn" id="again" ${canAgain ? '' : 'disabled'}>Encore un ! <small>${Date.now() >= state.freeAt ? 'Gratuit' : `<i class="coin"></i>${price}`}</small></button>
    </div>
    <button class="link" id="close">Retour à la boutique</button>
  </div>`;
  res.cards.forEach((_, i) => setTimeout(sfx.pop, i * 110));
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
  sfx.page();
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

/* ---------- Marché ---------- */
function renderMarket() {
  const onlyDups = $('#mkDups').checked;
  const keys = Object.keys(state.owned).filter(k => state.owned[k] > (onlyDups ? 1 : 0))
    .sort((a, b) => priceOf(b) - priceOf(a) || parseInt(a) - parseInt(b));
  const total = dupKeys().reduce((a, k) => a + (state.owned[k] - 1) * priceOf(k), 0);
  $('#mkTotal').innerHTML = `Tes doublons valent <b><i class="coin"></i>${total.toLocaleString('fr-FR')}</b>`;
  $('#mkSellAll').disabled = !total;
  $('#mkGrid').innerHTML = keys.length ? keys.map(k => {
    const { p, shiny } = keyInfo(k), n = state.owned[k];
    return `<div class="mk-item">${cardHTML(p, shiny)}
      <div class="mk-row"><span class="mk-n">×${n}</span><button class="sell" data-k="${k}"><i class="coin"></i>${priceOf(k)}</button></div></div>`;
  }).join('') : `<p class="mk-empty">${onlyDups ? 'Aucun doublon pour l\'instant. Ouvre des boosters !' : 'Ton classeur est vide.'}</p>`;
}
function flyCoin(from) {
  const a = from.getBoundingClientRect(), b = $('#coins').getBoundingClientRect(), c = document.createElement('i');
  c.className = 'coin fly';
  document.body.appendChild(c);
  c.animate([{ transform: `translate(${a.left + a.width / 2}px, ${a.top}px) scale(1.6)` },
    { transform: `translate(${(a.left + b.left) / 2}px, ${Math.min(a.top, b.top) - 80}px) scale(1.3)`, offset: .5 },
    { transform: `translate(${b.left}px, ${b.top + 6}px) scale(.8)` }], { duration: 650, easing: 'ease-in' }).onfinish = () => {
    c.remove(); sfx.coin();
    $('.coins').animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 250);
  };
}
let armed = null;
function sell(btn) {
  const k = btn.dataset.k, n = state.owned[k];
  if (!n) return;
  if (n === 1 && armed !== btn) { // dernier exemplaire : on demande confirmation
    armed = btn; btn.textContent = 'Sûr ? Dernière !'; btn.classList.add('warn');
    setTimeout(() => { if (armed === btn) { armed = null; renderMarket(); } }, 2500);
    return;
  }
  armed = null;
  state.owned[k] = n - 1;
  if (!state.owned[k]) delete state.owned[k];
  state.coins += priceOf(k);
  save(); flyCoin(btn); renderTop(); renderMarket();
}

function show(v) {
  document.querySelectorAll('.view').forEach(e => e.classList.toggle('on', e.id === v));
  document.querySelectorAll('.tabs button').forEach(e => e.classList.toggle('on', e.dataset.view === v));
  if (v === 'book') renderBook();
  if (v === 'market') renderMarket();
}

/* ---------- Événements ---------- */
const select = i => {
  const ni = Math.max(0, Math.min(BOOSTERS.length - 1, i));
  if (ni !== sel) sfx.select();
  sel = ni; renderShop();
};
$('#packs').onclick = e => {
  const s = e.target.closest('.slot');
  if (!s) return;
  if (+s.dataset.i !== sel) return select(+s.dataset.i);
  if (Date.now() < state.freeAt && state.coins < BOOSTERS[sel].price) {
    s.classList.remove('nope'); void s.offsetWidth; s.classList.add('nope');
    sfx.nope();
    $('#timer').textContent = 'Pas assez de Pokédollars : revends des doublons au Marché';
    return;
  }
  buy();
};
$('#prev').onclick = () => select(sel - 1);
$('#next').onclick = () => select(sel + 1);
$('#pgPrev').onclick = () => turn(-1);
$('#pgNext').onclick = () => turn(1);
$('#mute').onclick = () => { sfx.toggle(); renderTop(); };
$('#mkDups').onchange = renderMarket;
$('#mkGrid').onclick = e => { const b = e.target.closest('.sell'); if (b) sell(b); };
$('#mkSellAll').onclick = e => {
  const keys = dupKeys();
  if (!keys.length) return;
  for (const k of keys) { state.coins += (state.owned[k] - 1) * priceOf(k); state.owned[k] = 1; }
  save();
  for (let i = 0; i < Math.min(keys.length, 8); i++) setTimeout(() => flyCoin(e.target), i * 90);
  renderTop(); renderMarket();
};
document.querySelector('.tabs').onclick = e => e.target.closest('button') && show(e.target.closest('button').dataset.view);
document.addEventListener('keydown', e => {
  const o = $('#overlay');
  if (e.key === 'Escape' && o.classList.contains('zoomed')) return closeOverlay();
  if (!o.hidden) return;
  const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
  if (!d) return;
  if ($('#shop').classList.contains('on')) select(sel + d);
  else if ($('#book').classList.contains('on')) turn(d);
});
$('#binder').onclick = e => {
  const c = e.target.closest('.pocket.has');
  if (!c || turning) return;
  const p = POKEMON[c.dataset.id - 1], n = state.owned[p.id] || 0, s = state.owned[p.id + 's'] || 0, o = $('#overlay');
  sfx.pop();
  o.hidden = false; o.className = 'overlay zoomed';
  o.innerHTML = `<div class="zoom">${cardHTML(p, c.dataset.s === '1')}
    <p>${p.name} · ${RAR[p.r].name}${n ? ` · ×${n}` : ''}${s ? ` · ✦ dorée ×${s}` : ''}</p></div>`;
  o.onclick = ev => { if (!ev.target.closest('.zoom .card')) closeOverlay(); };
};
addEventListener('resize', () => !turning && $('#book').classList.contains('on') && renderBook());

// Inclinaison 3D + reflet holo qui suit la souris
document.addEventListener('pointermove', e => {
  const el = e.target.closest('.card, .slot.on .pack, .op-pack:not(.cutting)');
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
