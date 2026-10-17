/* ---------- Musée : une vraie salle en perspective, tes cartes aux murs, des meubles 3D placés à la main, visitable par lien ---------- */
// Meubles 3D (Furniture Kit de Kenney, CC0) : nom, prix
const FURN = {
  pottedPlant: ['Grande plante', 120], plantSmall1: ['Petite plante', 60], bench: ['Banc en bois', 180], benchCushion: ['Banc rembourré', 240],
  loungeSofa: ['Canapé rouge', 380], loungeDesignSofa: ['Canapé bleu', 420], loungeChair: ['Fauteuil rouge', 220], loungeDesignChair: ['Fauteuil bleu', 240],
  lampRoundFloor: ['Lampadaire rond', 160], lampSquareFloor: ['Lampadaire carré', 160], rugRound: ['Tapis rond', 150], rugRectangle: ['Grand tapis', 200],
  tableCoffeeGlass: ['Table basse en verre', 240], tableRound: ['Table en bois', 200], sideTable: ['Guéridon', 130], bookcaseOpen: ['Bibliothèque', 300],
  bear: ['Ours', 150], speaker: ['Enceinte', 160], televisionVintage: ['Télé vintage', 280], radio: ['Radio', 120], coatRackStanding: ['Portemanteau', 110],
};
const THEMES = { galerie: 'Galerie lumineuse', classique: 'Salon classique', nuit: 'Nuit étoilée', bois: 'Bois chaleureux' };
// Accrochage « façon galerie » : 7 cadres au fond, 2 sur chaque mur latéral, et la pièce maîtresse sur le piédestal (dernier emplacement).
const SLOTS = [
  { m: 'back', l: 8, t: 14, w: 10 }, { m: 'back', l: 8, t: 46, w: 10 }, { m: 'back', l: 22, t: 22, w: 13 }, { m: 'back', l: 41, t: 10, w: 18 },
  { m: 'back', l: 65, t: 22, w: 13 }, { m: 'back', l: 82, t: 14, w: 10 }, { m: 'back', l: 82, t: 46, w: 10 },
  { m: 'left', l: 22, t: 20, w: 30 }, { m: 'left', l: 62, t: 26, w: 24 }, { m: 'right', l: 48, t: 20, w: 30 }, { m: 'right', l: 14, t: 26, w: 24 },
  { m: 'star' },
];
const WALL = SLOTS.length, MAX_ITEMS = 16, UNIT = 26; // UNIT : cqw par unité de modèle 3D
state.museum = Object.assign({ wall: [], items: [], theme: 'galerie', inv: {} }, state.museum);
const M = state.museum;
M.wall = Array.from({ length: WALL }, (_, i) => M.wall[i] ?? null);
M.items = (M.items || []).filter(it => FURN[it.id]);
delete M.floor;
if (!THEMES[M.theme]) M.theme = 'galerie';
for (const id in M.inv) if (!FURN[id]) delete M.inv[id];
let editing = false, selected = -1;
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const validKey = k => typeof k === 'string' && /^\d{1,3}[sa]?$/.test(k) && +parseInt(k) >= 1 && +parseInt(k) <= POKEMON.length;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const decorReady = () => (window.Decor ? Promise.resolve(window.Decor) : new Promise(r => addEventListener('decor-ready', () => r(window.Decor), { once: true })));

// Une carte exposée doit toujours être dans la collection (elle a pu être revendue)
const cleanWall = () => { M.wall = M.wall.map(k => (k && state.owned[k] ? k : null)); };
const placed = id => M.items.filter(it => it.id === id).length;

function frameHTML(k, i, s, edit) {
  const info = k && keyInfo(k), mark = info ? (info.shiny === 'anim' ? ' ✨' : info.shiny ? ' ✦' : '') : '';
  return `<div class="mf${k ? ' filled' : ''}" data-i="${i}" style="left:${s.l}%;top:${s.t}%;width:${s.w}%">
    <div class="fr">${k ? cardHTML(info.p, info.shiny) : edit ? '<span class="add">+</span>' : ''}</div>
    ${k && s.m === 'back' ? `<div class="cartel">${info.p.name}${mark}</div>` : ''}</div>`;
}
const itemHTML = (it, n, edit) => `<div class="bb item${edit && n === selected ? ' sel' : ''}" data-n="${n}" style="left:${it.x}%;--z:${it.z}"><img alt="${FURN[it.id][0]}" draggable="false"></div>`;
function roomHTML(m, edit) {
  const on = w => SLOTS.map((s, i) => (s.m === w ? frameHTML(m.wall[i], i, s, edit) : '')).join('');
  const star = m.wall[WALL - 1], si = star && keyInfo(star);
  return `<div class="mroom t-${m.theme}${edit ? ' editing' : ''}"><div class="scene"><div class="box">
      <div class="w back"><div class="lights"></div>${on('back')}</div>
      <div class="w left">${on('left')}</div><div class="w right">${on('right')}</div>
      <div class="w floor"></div><div class="w ceil"><div class="track"></div></div>
      ${[20, 35, 50, 65, 80].map(x => `<div class="bb lamp" style="left:${x}%;--z:.55"></div>`).join('')}
      <div class="bb pedestal" data-i="${WALL - 1}" style="left:50%;--z:.86">
        <div class="ped-card${star ? ' filled' : ''}">${star ? cardHTML(si.p, si.shiny) : edit ? '<span class="add">+</span>' : ''}</div><div class="ped-col"></div></div>
      <div class="bb rope" style="left:50%;--z:.62"><svg viewBox="0 0 100 22" preserveAspectRatio="none">
        <path d="M4 6 Q 18 16 32 6 Q 50 16 68 6 Q 82 16 96 6" fill="none" stroke="#c0182c" stroke-width="1.4"/></svg>
        ${[4, 32, 68, 96].map(x => `<i style="left:${x}%"></i>`).join('')}</div>
      ${m.items.map((it, n) => itemHTML(it, n, edit)).join('')}
    </div></div></div>`;
}
// Les photos 3D arrivent après coup : on les pose dans les meubles déjà affichés
async function fillItems(root, items) {
  const D = await decorReady();
  root.querySelectorAll('.item').forEach(async el => {
    const it = items[+el.dataset.n];
    if (!it) return;
    const s = await D.shot(it.id, it.r || 0);
    el.style.width = s.uw * UNIT + 'cqw';
    el.querySelector('img').src = s.url;
  });
}

function renderMuseum() {
  cleanWall();
  $('#muTheme').value = M.theme;
  $('#muEdit').textContent = editing ? '✔ Terminer' : '✏️ Décorer';
  const room = $('#museumRoom');
  room.innerHTML = roomHTML(M, editing);
  fillItems(room, M.items);
  const sel = M.items[selected];
  $('#muTools').hidden = !editing;
  $('#muTools').innerHTML = `<button class="btn" data-t="add" ${M.items.length >= MAX_ITEMS ? 'disabled' : ''}>＋ Ajouter un meuble</button>
    ${sel ? `<span class="mu-sel">${FURN[sel.id][0]}</span><button class="btn ghost" data-t="rot">⟳ Tourner</button><button class="btn ghost" data-t="del">🗑 Ranger</button>`
      : '<span class="mu-hint">Glisse un meuble pour le déplacer · clique un cadre pour y exposer une carte</span>'}`;
}

function pickCard(i) {
  const shown = new Set(M.wall);
  const keys = Object.keys(state.owned).filter(k => !shown.has(k)).sort((a, b) => priceOf(b) - priceOf(a) || parseInt(a) - parseInt(b));
  const o = $('#overlay');
  o.hidden = false; o.className = 'overlay zoomed';
  o.innerHTML = `<div class="g-card wide"><h2>Exposer une carte</h2><p>${i === WALL - 1 ? 'Choisis ta pièce maîtresse, posée sur le piédestal.' : 'Choisis la carte à accrocher dans ce cadre.'}</p>
    <div class="team-grid">${keys.map(k => { const { p, shiny } = keyInfo(k); return `<button class="tm" data-k="${k}">${cardHTML(p, shiny)}</button>`; }).join('') || '<p>Ton classeur est vide.</p>'}</div>
    <div class="sum-actions">${M.wall[i] ? '<button class="btn ghost" data-k="">Décrocher</button>' : ''}<button class="btn ghost" data-close="1">Annuler</button></div></div>`;
  o.onclick = e => {
    const b = e.target.closest('[data-k], [data-close]');
    if (!b && e.target !== o) return;
    if (b && 'k' in b.dataset) { M.wall[i] = b.dataset.k || null; save(); sfx.pop(); }
    closeOverlay(); renderMuseum();
  };
}

// Meubles : ton stock (acheté mais pas encore posé) et la boutique
function pickFurniture() {
  const o = $('#overlay');
  const tile = (id, extra) => `<span class="ph" data-ph="${id}"></span>${FURN[id][0]}<small>${extra}</small>`;
  const draw = () => {
    const mine = Object.keys(FURN).filter(id => (M.inv[id] || 0) - placed(id) > 0);
    o.innerHTML = `<div class="g-card wide"><h2>Ajouter un meuble</h2>
      <h3>Ton stock</h3><div class="deco-grid">${mine.map(id => `<button class="dc" data-put="${id}">${tile(id, '×' + (M.inv[id] - placed(id)))}</button>`).join('') || '<p class="muted">Rien en stock : achète des meubles ci-dessous.</p>'}</div>
      <h3>Boutique de meubles</h3><div class="deco-grid">${Object.entries(FURN).map(([id, [, pr]]) => `<button class="dc" data-buy="${id}" ${state.coins < pr ? 'disabled' : ''}>${tile(id, `<i class="coin"></i>${pr}`)}</button>`).join('')}</div>
      <div class="sum-actions"><button class="btn ghost" data-close="1">Fermer</button></div></div>`;
    decorReady().then(D => o.querySelectorAll('[data-ph]').forEach(async ph => { ph.innerHTML = `<img src="${(await D.shot(ph.dataset.ph, 1)).url}" alt="">`; }));
  };
  o.hidden = false; o.className = 'overlay zoomed';
  draw();
  o.onclick = e => {
    const b = e.target.closest('[data-put], [data-buy], [data-close]');
    if (!b && e.target !== o) return;
    if (b?.dataset.buy) {
      const pr = FURN[b.dataset.buy][1];
      if (state.coins < pr) return sfx.nope();
      state.coins -= pr; M.inv[b.dataset.buy] = (M.inv[b.dataset.buy] || 0) + 1;
      save(); renderTop(); sfx.coin(); flyCoin(b);
      return draw();
    }
    if (b?.dataset.put) {
      M.items.push({ id: b.dataset.put, x: 50, z: .35, r: 1 });
      selected = M.items.length - 1;
      save(); sfx.pop();
    }
    closeOverlay(); renderMuseum();
  };
}

/* Glisser un meuble : on retrouve le point du sol sous le doigt en inversant la perspective de la salle */
function floorAt(room, px, py) {
  const r = room.getBoundingClientRect(), W = r.width, H = r.height, P = .8 * W, D = (matchMedia('(max-width: 760px)').matches ? .40 : .46) * W;
  const s = (py - r.top - .4 * H) / (.6 * H);
  if (s <= .05) return null;
  const z = (P / s - P) / D, x = (.5 * W + (px - r.left - .5 * W) / s) / W * 100;
  return { x, z };
}
// Le navigateur détecte mal les clics dans une scène 3D : on cherche nous-mêmes l'objet sous le pointeur (le plus proche d'abord)
function hitAt(room, x, y) {
  const inside = el => { const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  const items = [...room.querySelectorAll('.item')].sort((a, b) => +getComputedStyle(a).getPropertyValue('--z') - +getComputedStyle(b).getPropertyValue('--z'));
  return items.find(inside) || [...room.querySelectorAll('.pedestal .ped-card, .mf .fr')].find(inside)?.closest('.pedestal, .mf') || null;
}
let drag = null;
$('#museumRoom').addEventListener('pointerdown', e => {
  if (!editing) return;
  const el = hitAt($('#museumRoom'), e.clientX, e.clientY);
  if (!el?.classList.contains('item')) return;
  e.preventDefault();
  const n = +el.dataset.n, it = M.items[n], f = floorAt(el.closest('.mroom'), e.clientX, e.clientY);
  if (selected !== n) { selected = n; renderMuseum(); }
  if (!f) return;
  drag = { n, dx: it.x - f.x, dz: it.z - f.z, moved: false };
  $('#museumRoom').setPointerCapture(e.pointerId);
});
$('#museumRoom').addEventListener('pointermove', e => {
  if (!drag) return;
  const room = $('#museumRoom .mroom'), f = floorAt(room, e.clientX, e.clientY);
  if (!f) return;
  const it = M.items[drag.n], el = room.querySelector(`.item[data-n="${drag.n}"]`);
  it.x = clamp(f.x + drag.dx, 4, 96); it.z = clamp(f.z + drag.dz, .05, .97);
  el.style.left = it.x + '%'; el.style.setProperty('--z', it.z);
  drag.moved = true;
});
$('#museumRoom').addEventListener('pointerup', () => { if (drag?.moved) { save(); sfx.pop(); } drag = null; });
$('#muTools').onclick = async e => {
  const t = e.target.closest('[data-t]')?.dataset.t, it = M.items[selected];
  if (t === 'add') return pickFurniture();
  if (!it) return;
  if (t === 'rot') {
    it.r = ((it.r || 0) + 1) % 8;
    save(); sfx.select();
    const el = $(`#museumRoom .item[data-n="${selected}"]`), s = await (await decorReady()).shot(it.id, it.r);
    el.style.width = s.uw * UNIT + 'cqw';
    el.querySelector('img').src = s.url;
  }
  if (t === 'del') { M.items.splice(selected, 1); selected = -1; save(); sfx.pop(); renderMuseum(); }
};

/* Partage : le musée entier tient dans le lien, donc aucun serveur n'est nécessaire */
const enc = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
function shareLink() {
  cleanWall();
  const url = `${location.origin}${location.pathname}#musee=${enc({ n: myName, w: M.wall, i: M.items.map(it => [it.id, Math.round(it.x * 10) / 10, Math.round(it.z * 1000) / 1000, it.r || 0]), t: M.theme })}`;
  const done = () => toast('Lien copié ! Envoie-le à tes amis pour qu\'ils visitent ton musée.');
  navigator.clipboard?.writeText(url).then(done, () => prompt('Copie ce lien :', url)) ?? prompt('Copie ce lien :', url);
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
// Visite : tout ce qui vient du lien est vérifié avant affichage (cartes, meubles et thème connus, positions bornées, nom échappé)
function visitFromHash() {
  const m = location.hash.match(/^#musee=([\w-]+)$/);
  if (!m) return;
  let d;
  try { d = dec(m[1]); } catch { return; }
  const num = (v, a, b, def) => (Number.isFinite(+v) ? clamp(+v, a, b) : def);
  const room = {
    wall: Array.from({ length: WALL }, (_, i) => (validKey(d.w?.[i]) ? d.w[i] : null)),
    items: (Array.isArray(d.i) ? d.i : []).slice(0, MAX_ITEMS).filter(a => Array.isArray(a) && FURN[a[0]])
      .map(([id, x, z, r]) => ({ id, x: num(x, 4, 96, 50), z: num(z, .05, .97, .5), r: Math.round(num(r, 0, 7, 0)) })),
    theme: THEMES[d.t] ? d.t : 'galerie',
  };
  const o = $('#overlay');
  o.hidden = false; o.className = 'overlay visit';
  o.innerHTML = `<div class="visit-in"><div class="visit-head"><h2>Musée de ${esc(String(d.n || 'un dresseur').slice(0, 16))}</h2>
    <button class="btn ghost" id="leaveVisit">Revenir à mon StevenDex</button></div>${roomHTML(room, false)}</div>`;
  fillItems(o, room.items);
  $('#leaveVisit').onclick = () => { history.replaceState(null, '', location.pathname); closeOverlay(); };
}

$('#muTheme').innerHTML = Object.entries(THEMES).map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
$('#muTheme').onchange = e => { M.theme = e.target.value; save(); sfx.select(); renderMuseum(); };
$('#muEdit').onclick = () => { editing = !editing; selected = -1; sfx.pop(); renderMuseum(); };
$('#muShare').onclick = shareLink;
$('#museumRoom').onclick = e => {
  if (!editing) return;
  const hit = hitAt($('#museumRoom'), e.clientX, e.clientY);
  if (hit?.classList.contains('item')) return;
  const f = hit;
  if (f) pickCard(+f.dataset.i);
  else if (selected >= 0) { selected = -1; renderMuseum(); }
};
visitFromHash();
addEventListener('hashchange', visitFromHash);
