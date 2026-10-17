/* ---------- Comptes (Supabase) : connexion, collection en ligne, échanges, classement ---------- */
// Clé publique (anon) : faite pour être dans le site, les règles du jeu sont protégées côté serveur (supabase/schema.sql)
const SB_URL = 'https://oqnaakxtndmferidfkcz.supabase.co', SB_KEY = 'sb_publishable_th67M5nsWrJROYkYXbHQ3Q_RzGfgsyw';
const sb = window.supabase.createClient(SB_URL, SB_KEY);
const ERR = { 'Invalid login credentials': 'Pseudo ou mot de passe incorrect.', 'User already registered': 'Ce pseudo est déjà pris.' };

async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(ERR[error.message] || error.message);
  return data;
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  sfx.nope();
  setTimeout(() => t.remove(), 3200);
}

// Copie l'état du serveur dans l'interface
let museumSent = '';
function applyState(s) {
  Object.assign(state, { coins: s.coins, owned: s.cards, pityM: s.pity_m, pityS: s.pity_s, freeAt: Date.parse(s.free_at) }); // shortcut: horloge du PC pour le booster gratuit, le serveur revérifie
  Object.assign(M, { wall: [], items: [], theme: 'galerie' }, s.museum, { inv: s.inv });
  M.wall = Array.from({ length: WALL }, (_, i) => M.wall[i] ?? null);
  museumSent = museumJSON();
  myName = s.pseudo; setAvatar();
  renderTop(); tick();
  const v = document.querySelector('.view.on')?.id;
  if (v === 'market') renderMarket();
  if (v === 'museum') renderMuseum();
  if (v === 'book' && !turning) renderBook();
}
const refreshState = async () => applyState(await rpc('my_state'));

// Le musée s'enregistre tout seul, regroupé, à chaque changement
const museumJSON = () => JSON.stringify({ wall: M.wall, items: M.items, theme: M.theme });
let museumTimer;
window.onSave = () => {
  clearTimeout(museumTimer);
  museumTimer = setTimeout(() => {
    const j = museumJSON();
    if (j === museumSent) return;
    museumSent = j;
    rpc('museum_save', { p: JSON.parse(j) }).catch(e => toast(e.message));
  }, 800);
};

/* Écran de connexion */
function authScreen(msg = '') {
  const a = document.createElement('div');
  a.className = 'overlay game'; a.id = 'auth';
  a.innerHTML = `<form class="g-card auth"><img src="steven.png" alt=""><h2>StevenDex</h2>
    <p>Ta collection est enregistrée en ligne : retrouve-la sur n'importe quel appareil.</p>
    <input name="u" placeholder="Pseudo" maxlength="16" autocomplete="username" required pattern="[A-Za-z0-9_\\-]{3,16}" title="3 à 16 lettres, chiffres, _ ou -">
    <input name="p" type="password" placeholder="Mot de passe" minlength="6" autocomplete="current-password" required>
    <p class="warn" id="authErr">${esc(msg)}</p>
    <div class="sum-actions"><button class="btn" value="in">Se connecter</button><button class="btn ghost" value="up">Créer un compte</button></div></form>`;
  document.body.appendChild(a);
  a.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, up = e.submitter?.value === 'up', pseudo = f.u.value.trim();
    const cred = { email: pseudo.toLowerCase() + '@stevendex.app', password: f.p.value };
    f.querySelectorAll('button').forEach(b => b.disabled = true);
    const { error } = up ? await sb.auth.signUp({ ...cred, options: { data: { pseudo } } }) : await sb.auth.signInWithPassword(cred);
    f.querySelectorAll('button').forEach(b => b.disabled = false);
    if (error) return $('#authErr').textContent = ERR[error.message] || error.message;
    await start();
  };
}
async function start() {
  try { await refreshState(); } catch (e) { $('#auth')?.remove(); return authScreen(e.message); }
  $('#auth')?.remove();
  sfx.coin();
  pollTrades();
}
async function logout() { await sb.auth.signOut(); location.reload(); }

/* ---------- Échanges ---------- */
const miniCards = list => list.map(({ k, n }) => { const { p, shiny } = keyInfo(k); return `<span class="tr-c" title="${p.name}">${cardHTML(p, shiny)}${n > 1 ? `<b>×${n}</b>` : ''}</span>`; }).join('');
const coinTxt = n => n ? `<span class="tr-coins"><i class="coin"></i>${n}</span>` : '';
const side = (list, coins) => miniCards(list) + coinTxt(coins) || '<span class="muted">rien</span>';
const STATUS = { accepted: 'Accepté ✅', declined: 'Refusé', cancelled: 'Annulé' };

async function renderFriends() {
  const [trades, lb] = await Promise.all([rpc('my_trades'), rpc('leaderboard')]).catch(e => (toast(e.message), [[], []]));
  $('#trList').innerHTML = trades.map(t => {
    const other = t.mine ? t.to : t.from;
    const act = t.status !== 'pending' ? `<span class="tr-st">${STATUS[t.status]}</span>`
      : t.mine ? `<button class="btn ghost" data-cancel="${t.id}">Annuler</button>`
      : `<button class="btn" data-ok="${t.id}">Accepter</button><button class="btn ghost" data-no="${t.id}">Refuser</button>`;
    return `<div class="tr-item${t.status === 'pending' ? ' pend' : ''}"><p><b>${esc(other)}</b> ${t.mine ? '· ton offre' : 'te propose'}</p>
      <div class="tr-sides"><div><small>${t.mine ? 'Tu donnes' : 'Tu reçois'}</small>${side(t.give, t.give_coins)}</div><span>⇄</span>
      <div><small>${t.mine ? 'Tu reçois' : 'Tu donnes'}</small>${side(t.want, t.want_coins)}</div></div><div class="tr-act">${act}</div></div>`;
  }).join('') || '<p class="muted">Aucun échange pour l\'instant.</p>';
  $('#lbList').innerHTML = `<ol class="lb">${lb.map((x, i) => `<li class="${x.pseudo === myName ? 'me' : ''}"><span>${['🥇', '🥈', '🥉'][i] || i + 1}</span><b>${esc(x.pseudo)}</b><em>${x.dex}/151</em><small>✦ ${x.rares}</small></li>`).join('')}</ol>`;
  $('#tradeCount').textContent = trades.filter(t => !t.mine && t.status === 'pending').length || '';
}
$('#trList').onclick = async e => {
  const b = e.target.closest('button');
  if (!b) return;
  b.disabled = true;
  try {
    if (b.dataset.cancel) await rpc('trade_cancel', { p_id: +b.dataset.cancel });
    else { applyState(await rpc('trade_respond', { p_id: +(b.dataset.ok || b.dataset.no), p_accept: !!b.dataset.ok })); if (b.dataset.ok) sfx.win(); }
  } catch (err) { toast(err.message); }
  renderFriends();
};

// Composer une offre : clique les cartes à donner et celles que tu veux, avec des Pokédollars en plus si besoin
async function newTrade() {
  const to = $('#trTo').value.trim();
  if (!to) return $('#trTo').focus();
  if (to.toLowerCase() === myName.toLowerCase()) return toast('Choisis le pseudo d\'un ami.');
  let theirs;
  try { theirs = await rpc('player_cards', { p_pseudo: to }); } catch (e) { return toast(e.message); }
  const give = {}, want = {}, o = $('#overlay');
  const sorted = owned => Object.keys(owned).sort((a, b) => priceOf(b) - priceOf(a) || parseInt(a) - parseInt(b));
  const grid = (owned, sel, tag) => `<div class="team-grid">${sorted(owned).map(k => {
    const { p, shiny } = keyInfo(k);
    return `<button class="tm${sel[k] ? ' on' : ''}" data-${tag}="${k}">${cardHTML(p, shiny)}<span class="st">×${owned[k]}</span>${sel[k] ? `<b class="tm-n">${sel[k]}</b>` : ''}</button>`;
  }).join('') || '<p class="muted">Aucune carte.</p>'}</div>`;
  const list = sel => Object.entries(sel).map(([k, n]) => ({ k, n }));
  const draw = () => {
    const gc = +($('#trGc')?.value || 0), wc = +($('#trWc')?.value || 0);
    o.innerHTML = `<div class="g-card wide"><h2>Échange avec ${esc(to)}</h2>
      <p>Clique sur une carte pour l'ajouter (re-clique pour en mettre plusieurs, clic droit pour en retirer).</p>
      <h3>Tu donnes</h3>${grid(state.owned, give, 'g')}
      <label class="tr-coin">+ <i class="coin"></i><input id="trGc" type="number" min="0" max="${state.coins}" value="${gc}"></label>
      <h3>Tu veux de ${esc(to)}</h3>${grid(theirs, want, 'w')}
      <label class="tr-coin">+ <i class="coin"></i><input id="trWc" type="number" min="0" value="${wc}"></label>
      <div class="sum-actions"><button class="btn" id="trSend">Envoyer l'offre</button><button class="btn ghost" id="trClose">Annuler</button></div></div>`;
  };
  const bump = (e, d) => {
    const b = e.target.closest('[data-g], [data-w]');
    if (!b) return false;
    const [sel, owned, k] = b.dataset.g ? [give, state.owned, b.dataset.g] : [want, theirs, b.dataset.w];
    sel[k] = Math.max(0, Math.min(owned[k], (sel[k] || 0) + d));
    if (!sel[k]) delete sel[k];
    const y = o.scrollTop; draw(); o.scrollTop = y; sfx.select();
    return true;
  };
  o.hidden = false; o.className = 'overlay zoomed'; o.onclick = null;
  draw();
  o.oncontextmenu = e => { if (bump(e, -1)) e.preventDefault(); };
  o.onclick = async e => {
    if (bump(e, 1)) return;
    if (e.target.id === 'trClose' || e.target === o) { o.oncontextmenu = null; return closeOverlay(); }
    if (e.target.id !== 'trSend') return;
    e.target.disabled = true;
    try {
      await rpc('trade_offer', { p_to: to, p_give: list(give), p_want: list(want), p_give_coins: +$('#trGc').value || 0, p_want_coins: +$('#trWc').value || 0 });
      o.oncontextmenu = null; closeOverlay(); sfx.coin(); $('#trTo').value = ''; renderFriends();
    } catch (err) { e.target.disabled = false; toast(err.message); }
  };
}
$('#trNew').onclick = newTrade;
$('#trTo').onkeydown = e => { if (e.key === 'Enter') newTrade(); };

// Pastille « Amis » quand une offre t'attend (vérifiée toutes les 30 s)
function pollTrades() {
  rpc('my_trades').then(ts => { $('#tradeCount').textContent = ts.filter(t => !t.mine && t.status === 'pending').length || ''; }).catch(() => {});
  clearTimeout(pollTrades.t); pollTrades.t = setTimeout(pollTrades, 30e3);
}

sb.auth.getSession().then(({ data }) => data.session ? start() : authScreen());
