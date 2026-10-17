/* ---------- Musée : une vraie salle en perspective, tes cartes aux murs, visitable par lien ---------- */
const DECOS = {
  plante: ['🪴', 'Plante verte', 100], fleurs: ['🌸', 'Pot de fleurs', 120], tournesol: ['🌻', 'Tournesols', 150], cactus: ['🌵', 'Cactus', 80],
  bambou: ['🎍', 'Bambou', 140], banc: ['🛋️', 'Banquette', 250], vase: ['🏺', 'Vase ancien', 300], bougie: ['🕯️', 'Chandelier', 180],
  peluche: ['🧸', 'Peluche', 160], statue: ['🗿', 'Statue', 400], fontaine: ['⛲', 'Fontaine', 600], trophee: ['🏆', 'Trophée', 800],
};
const THEMES = { galerie: 'Galerie lumineuse', classique: 'Salon classique', nuit: 'Nuit étoilée', bois: 'Bois chaleureux' };
// Accrochage « façon galerie » : 7 cadres au fond, 2 sur chaque mur latéral, et la pièce maîtresse sur le piédestal (dernier emplacement).
// l, t, w en % du mur ; la hauteur suit le format des cartes.
const SLOTS = [
  { m: 'back', l: 8, t: 14, w: 10 }, { m: 'back', l: 8, t: 46, w: 10 }, { m: 'back', l: 22, t: 22, w: 13 }, { m: 'back', l: 41, t: 10, w: 18 },
  { m: 'back', l: 65, t: 22, w: 13 }, { m: 'back', l: 82, t: 14, w: 10 }, { m: 'back', l: 82, t: 46, w: 10 },
  { m: 'left', l: 22, t: 20, w: 30 }, { m: 'left', l: 62, t: 26, w: 24 }, { m: 'right', l: 48, t: 20, w: 30 }, { m: 'right', l: 14, t: 26, w: 24 },
  { m: 'star' },
];
const WALL = SLOTS.length, FLOOR = 4;
const SPOTS_FLOOR = [{ x: 9, z: .16 }, { x: 91, z: .16 }, { x: 19, z: .8 }, { x: 81, z: .8 }]; // z : fraction de la profondeur
state.museum = Object.assign({ wall: [], floor: [], theme: 'galerie', inv: {} }, state.museum);
const M = state.museum;
M.wall = Array.from({ length: WALL }, (_, i) => M.wall[i] ?? null);
M.floor = Array.from({ length: FLOOR }, (_, i) => M.floor[i] ?? null);
if (!THEMES[M.theme]) M.theme = 'galerie';
let editing = false;
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const validKey = k => typeof k === 'string' && /^\d{1,3}[sa]?$/.test(k) && +parseInt(k) >= 1 && +parseInt(k) <= POKEMON.length;

// Une carte exposée doit toujours être dans la collection (elle a pu être revendue)
const cleanWall = () => { M.wall = M.wall.map(k => (k && state.owned[k] ? k : null)); };
const placed = id => M.floor.filter(d => d === id).length;

function frameHTML(k, i, s, edit) {
  const info = k && keyInfo(k), mark = info ? (info.shiny === 'anim' ? ' ✨' : info.shiny ? ' ✦' : '') : '';
  return `<div class="mf${k ? ' filled' : ''}" data-i="${i}" style="left:${s.l}%;top:${s.t}%;width:${s.w}%">
    <div class="fr">${k ? cardHTML(info.p, info.shiny) : edit ? '<span class="add">+</span>' : ''}</div>
    ${k && s.m === 'back' ? `<div class="cartel">${info.p.name}${mark}</div>` : ''}</div>`;
}
function roomHTML(m, edit) {
  const on = w => SLOTS.map((s, i) => (s.m === w ? frameHTML(m.wall[i], i, s, edit) : '')).join('');
  const star = m.wall[WALL - 1], si = star && keyInfo(star);
  const decos = m.floor.map((d, i) => { const p = SPOTS_FLOOR[i]; return `<div class="bb mdeco${d ? ' filled' : ''}" data-i="${i}" style="left:${p.x}%;--z:${p.z}">
    ${d ? `<span>${DECOS[d][0]}</span>` : edit ? '<em>+</em>' : ''}</div>`; }).join('');
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
      ${decos}
    </div></div></div>`;
}

function renderMuseum() {
  cleanWall();
  $('#muTheme').value = M.theme;
  $('#muEdit').textContent = editing ? '✔ Terminer' : '✏️ Décorer';
  $('#museumRoom').innerHTML = roomHTML(M, editing);
}

function pickCard(i) {
  const shown = new Set(M.wall);
  const keys = Object.keys(state.owned).filter(k => !shown.has(k)).sort((a, b) => priceOf(b) - priceOf(a) || parseInt(a) - parseInt(b));
  const o = $('#overlay');
  o.hidden = false; o.className = 'overlay zoomed';
  o.innerHTML = `<div class="g-card wide"><h2>Exposer une carte</h2><p>Choisis la carte à accrocher dans ce cadre.</p>
    <div class="team-grid">${keys.map(k => { const { p, shiny } = keyInfo(k); return `<button class="tm" data-k="${k}">${cardHTML(p, shiny)}</button>`; }).join('') || '<p>Ton classeur est vide.</p>'}</div>
    <div class="sum-actions">${M.wall[i] ? '<button class="btn ghost" data-k="">Décrocher</button>' : ''}<button class="btn ghost" data-close="1">Annuler</button></div></div>`;
  o.onclick = e => {
    const b = e.target.closest('[data-k], [data-close]');
    if (!b && e.target !== o) return;
    if (b && 'k' in b.dataset) { M.wall[i] = b.dataset.k || null; save(); sfx.pop(); }
    closeOverlay(); renderMuseum();
  };
}

function pickDeco(i) {
  const o = $('#overlay');
  const draw = () => {
    const mine = Object.keys(DECOS).filter(id => (M.inv[id] || 0) - placed(id) > 0);
    o.innerHTML = `<div class="g-card wide"><h2>Décorer</h2>
      <h3>Tes décos</h3><div class="deco-grid">${mine.map(id => `<button class="dc" data-put="${id}"><span>${DECOS[id][0]}</span>${DECOS[id][1]}<small>×${M.inv[id] - placed(id)}</small></button>`).join('') || '<p class="muted">Aucune déco disponible : achète-en ci-dessous.</p>'}</div>
      <h3>Boutique de décos</h3><div class="deco-grid">${Object.entries(DECOS).map(([id, [e, n, pr]]) => `<button class="dc" data-buy="${id}" ${state.coins < pr ? 'disabled' : ''}><span>${e}</span>${n}<small><i class="coin"></i>${pr}</small></button>`).join('')}</div>
      <div class="sum-actions">${M.floor[i] ? '<button class="btn ghost" data-put="">Retirer la déco</button>' : ''}<button class="btn ghost" data-close="1">Fermer</button></div></div>`;
  };
  o.hidden = false; o.className = 'overlay zoomed';
  draw();
  o.onclick = e => {
    const b = e.target.closest('[data-put], [data-buy], [data-close]');
    if (!b && e.target !== o) return;
    if (b?.dataset.buy) {
      const [, , pr] = DECOS[b.dataset.buy];
      if (state.coins < pr) return sfx.nope();
      state.coins -= pr; M.inv[b.dataset.buy] = (M.inv[b.dataset.buy] || 0) + 1;
      save(); renderTop(); sfx.coin(); flyCoin(b);
      return draw();
    }
    if (b && 'put' in b.dataset) { M.floor[i] = b.dataset.put || null; save(); sfx.pop(); }
    closeOverlay(); renderMuseum();
  };
}

/* Partage : le musée entier tient dans le lien, donc aucun serveur n'est nécessaire */
const enc = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
function shareLink() {
  cleanWall();
  const url = `${location.origin}${location.pathname}#musee=${enc({ n: myName, w: M.wall, f: M.floor, t: M.theme })}`;
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
// Visite : tout ce qui vient du lien est vérifié avant affichage (cartes, décos et thème connus, nom échappé)
function visitFromHash() {
  const m = location.hash.match(/^#musee=([\w-]+)$/);
  if (!m) return;
  let d;
  try { d = dec(m[1]); } catch { return; }
  const room = {
    wall: Array.from({ length: WALL }, (_, i) => (validKey(d.w?.[i]) ? d.w[i] : null)),
    floor: Array.from({ length: FLOOR }, (_, i) => (DECOS[d.f?.[i]] ? d.f[i] : null)),
    theme: THEMES[d.t] ? d.t : 'galerie',
  };
  const o = $('#overlay');
  o.hidden = false; o.className = 'overlay visit';
  o.innerHTML = `<div class="visit-in"><div class="visit-head"><h2>Musée de ${esc(String(d.n || 'un dresseur').slice(0, 16))}</h2>
    <button class="btn ghost" id="leaveVisit">Revenir à mon StevenDex</button></div>${roomHTML(room, false)}</div>`;
  $('#leaveVisit').onclick = () => { history.replaceState(null, '', location.pathname); closeOverlay(); };
}

$('#muTheme').innerHTML = Object.entries(THEMES).map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
$('#muTheme').onchange = e => { M.theme = e.target.value; save(); sfx.select(); renderMuseum(); };
$('#muEdit').onclick = () => { editing = !editing; sfx.pop(); renderMuseum(); };
$('#muShare').onclick = shareLink;
$('#museumRoom').onclick = e => {
  if (!editing) return;
  const f = e.target.closest('.mf, .pedestal'), d = e.target.closest('.mdeco');
  if (f) pickCard(+f.dataset.i);
  else if (d) pickDeco(+d.dataset.i);
};
visitFromHash();
addEventListener('hashchange', visitFromHash);
