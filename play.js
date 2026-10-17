/* ---------- Jouer : duel de boosters et combat de cartes ---------- */
const PTS = { C: 1, R: 3, E: 8, L: 20, M: 50 };
const STAKES = [50, 100, 250, 500];
const G = { online: true, oppName: 'Ton ami', S: null, me: 'A' };
let myName = 'Dresseur'; // remplacé par le pseudo du compte
// Chaque partie d'un salon a un identifiant commun aux deux joueurs (code du salon + numéro), pour que le serveur rapproche leurs déclarations
const matchId = () => `${G.room}-${++G.n}`;

/* Réseau pair-à-pair (PeerJS) : le site reste statique, les deux navigateurs se parlent directement. */
const net = { peer: null, conn: null, host: false, onjoin: null, onclose: null };
let inbox = [], waiters = [];
const send = m => net.conn?.open && net.conn.send(m);
function onMsg(m) {
  if (m.t === 'bye') return net.onclose?.();
  const i = waiters.findIndex(w => w.t === m.t);
  if (i >= 0) waiters.splice(i, 1)[0].res(m); else inbox.push(m);
}
function recv(t) {
  const i = inbox.findIndex(m => m.t === t);
  if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
  return new Promise(res => waiters.push({ t, res }));
}
function wire(c) { net.conn = c; c.on('data', onMsg); c.on('close', () => net.onclose?.()); }
function netClose() {
  net.onjoin = net.onclose = null;
  try { net.conn?.close(); net.peer?.destroy(); } catch {}
  net.conn = net.peer = null; inbox = []; waiters = [];
}
function netHost() {
  return new Promise((res, rej) => {
    if (!window.Peer) return rej(new Error('peerjs'));
    const code = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');
    const peer = net.peer = new Peer('bdx-' + code);
    net.host = true;
    peer.on('open', () => res(code));
    peer.on('error', rej);
    peer.on('connection', c => { if (net.conn) return c.close(); c.on('open', () => { wire(c); net.onjoin?.(); }); });
  });
}
function netJoin(code) {
  return new Promise((res, rej) => {
    if (!window.Peer) return rej(new Error('peerjs'));
    const peer = net.peer = new Peer();
    net.host = false;
    peer.on('error', rej);
    peer.on('open', () => { const c = peer.connect('bdx-' + code, { reliable: true }); c.on('open', () => { wire(c); res(); }); });
    setTimeout(() => rej(new Error('timeout')), 12000);
  });
}

/* Écrans */
function gameScreen(html) {
  const o = $('#overlay');
  o.hidden = false; o.className = 'overlay game'; o.onclick = null;
  o.innerHTML = `<button class="quit" id="quit">✕ Quitter</button><div class="g-stage" id="gStage">${html}</div>`;
  $('#quit').onclick = quitGame;
}
function quitGame() { send({ t: 'bye' }); netClose(); closeOverlay(); renderTop(); }
const stage = html => { const g = $('#gStage'); if (g) { g.innerHTML = html; g.onclick = null; } return g; };
const errBox = msg => `<div class="g-card"><h2>Oups</h2><p>${msg}</p><button class="btn" onclick="quitGame()">Retour</button></div>`;
const waitBox = msg => `<div class="g-card"><div class="spinner"></div><p>${msg}</p></div>`;
const vsTxt = () => `contre <b>${G.oppName}</b>`;

async function hostRoom(mode) {
  gameScreen(waitBox('Création du salon…'));
  let code;
  try { code = await netHost(); G.room = code; G.n = 0; } catch { return stage(errBox('Impossible de créer le salon. Vérifie ta connexion internet.')); }
  stage(`<div class="g-card"><h2>${mode === 'duel' ? 'Duel de boosters' : 'Combat de cartes'}</h2><p>Envoie ce code à ton ami :</p>
    <div class="code">${code}</div><div class="spinner"></div><p class="muted">En attente d'un joueur…</p></div>`);
  net.onclose = () => stage(errBox(`${G.oppName} a quitté la partie.`));
  net.onjoin = async () => {
    send({ t: 'hello', name: myName, mode });
    G.oppName = (await recv('hello')).name;
    sfx.coin();
    mode === 'duel' ? duelSetup() : battleTeam();
  };
}
async function joinRoom(code) {
  gameScreen(waitBox(`Connexion au salon ${code}…`));
  G.room = code; G.n = 0;
  try { await netJoin(code); } catch { netClose(); return stage(errBox('Salon introuvable. Vérifie le code et que ton ami est toujours dans son salon.')); }
  net.onclose = () => stage(errBox(`${G.oppName} a quitté la partie.`));
  const h = await recv('hello');
  G.oppName = h.name;
  send({ t: 'hello', name: myName });
  sfx.coin();
  h.mode === 'duel' ? duelWait() : battleTeam();
}

/* ---------- Duel de boosters ---------- */
const scoreOf = c => PTS[c.p.r] * [1, 2, 4][vRank(c.shiny)];
const RULES = 'Barème : Commune 1 · Rare 3 · Épique 8 · Légendaire 20 · Mythique 50 · dorée ×2 · animée ×4';

function duelSetup() {
  let bi = sel, stake = 100;
  const draw = () => {
    const b = BOOSTERS[bi], cost = b.price + stake;
    const g = stage(`<div class="g-card wide"><h2>Duel de boosters</h2>
      <p>Vous ouvrez chacun le même booster ${vsTxt()}. Le plus gros score remporte la mise, et chacun garde ses cartes.</p>
      <h3>Booster</h3><div class="pick">${BOOSTERS.map((x, i) => `<button class="chip${i === bi ? ' on' : ''}" data-b="${i}" style="--c:${x.color}">${x.icon} ${x.name}</button>`).join('')}</div>
      <h3>Mise</h3><div class="pick">${STAKES.map(s => `<button class="chip${s === stake ? ' on' : ''}" data-s="${s}"><i class="coin"></i>${s}</button>`).join('')}</div>
      <p class="muted">Il te faut <b><i class="coin"></i>${cost}</b> (booster ${b.price} + mise ${stake}). ${RULES}</p>
      <button class="btn" id="go" ${state.coins < cost ? 'disabled' : ''}>Envoyer le défi</button></div>`);
    g.onclick = async e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.b) { bi = +t.dataset.b; sfx.select(); return draw(); }
      if (t.dataset.s) { stake = +t.dataset.s; sfx.select(); return draw(); }
      if (t.id !== 'go') return;
      send({ t: 'duel', b: bi, stake });
      stage(waitBox(`${G.oppName} regarde ton défi…`));
      const r = await recv('answer');
      if (r.ok) return runDuel(bi, stake);
      sfx.nope();
      stage(`<div class="g-card"><h2>Défi refusé</h2><p>${G.oppName} ${r.why}</p><button class="btn" id="again">Proposer autre chose</button></div>`).onclick = e2 => e2.target.id === 'again' && duelSetup();
    };
  };
  draw();
}
async function duelWait() {
  stage(waitBox(`${G.oppName} prépare un défi…`));
  const d = await recv('duel'), b = BOOSTERS[d.b], cost = b.price + d.stake, rich = state.coins >= cost;
  sfx.select();
  stage(`<div class="g-card"><h2>${G.oppName} te défie !</h2>
    <div class="defi" style="--c:${b.color}">${packHTML(b)}</div>
    <p>Booster <b>${b.name}</b> · mise <b><i class="coin"></i>${d.stake}</b></p>
    <p class="muted">Il te faut <i class="coin"></i>${cost}. ${RULES}</p>
    ${rich ? '' : '<p class="warn">Tu n\'as pas assez de Pokédollars.</p>'}
    <div class="sum-actions"><button class="btn" id="yes" ${rich ? '' : 'disabled'}>Accepter</button><button class="btn ghost" id="no">Refuser</button></div></div>`).onclick = e => {
    if (e.target.id === 'yes') { send({ t: 'answer', ok: true }); runDuel(d.b, d.stake); }
    if (e.target.id === 'no') { send({ t: 'answer', ok: false, why: rich ? 'a refusé.' : "n'a pas assez de Pokédollars." }); duelWait(); }
  };
}
async function runDuel(bi, stake) {
  const b = BOOSTERS[bi], mid = matchId();
  let mine, pack;
  try { ({ cards: mine, pack } = await openPack(b)); } catch (e) { send({ t: 'pack', cards: [] }); return stage(errBox(e.message)); }
  let theirs;
  {
    send({ t: 'pack', cards: mine.map(c => [c.p.id, vRank(c.shiny)]) });
    stage(waitBox(`${G.oppName} ouvre son booster…`));
    theirs = (await recv('pack')).cards.map(([id, s]) => ({ p: POKEMON[id - 1], shiny: s === 2 ? 'anim' : !!s }));
  }
  if (!theirs.length) return stage(errBox(`${G.oppName} n'a pas pu ouvrir son booster.`));
  // Le serveur compare les deux boosters qu'il a lui-même tirés et transfère la mise
  const settle = rpc('duel_report', { p_code: mid, p_pack: pack, p_stake: stake }).then(async r => {
    for (let i = 0; r.status !== 'settled' && i < 20; i++) { await wait(1500); r = await rpc('duel_result', { p_code: mid }); }
    return r;
  });
  duelReveal(stake, mine, theirs, settle);
}
async function duelReveal(stake, mine, theirs, settle) {
  const row = (cs, id) => `<div class="du-row" id="${id}">${cs.map(c => `<div class="flip du-card" style="--rc:${rcOf(c)}">
    <div class="flip-in">${backHTML()}<div class="front">${cardHTML(c.p, c.shiny)}</div></div></div>`).join('')}</div>`;
  stage(`<div class="duel">
    <div class="du-side"><div class="du-head"><b>${G.oppName}</b><span class="du-score" id="sOpp">0</span></div>${row(theirs, 'rOpp')}</div>
    <div class="du-vs"><span>VS</span><em><i class="coin"></i>${stake}</em></div>
    <div class="du-side"><div class="du-head"><b>${myName}</b><span class="du-score" id="sMe">0</span></div>${row(mine, 'rMe')}</div>
    <div class="du-end" id="duEnd"></div></div>`);
  const sc = { sOpp: 0, sMe: 0 };
  await wait(700);
  for (let i = 0; i < 5; i++) {
    for (const [cs, rid, sid] of [[theirs, 'rOpp', 'sOpp'], [mine, 'rMe', 'sMe']]) {
      const c = cs[i], f = $('#' + rid).children[i], pts = scoreOf(c), epic = c.shiny || 'LM'.includes(c.p.r);
      if (!f) return; // partie quittée pendant l'animation
      if (epic) { f.classList.add('charging'); sfx.charge(); for (const pw of [.4, .7, 1]) { FX.charge(f, c.p.types[0], rcOf(c), pw); await wait(330); } f.classList.remove('charging'); sfx.epic(); FX.explode(f, c.p.types[0], rcOf(c), 1); }
      else if (c.p.r === 'E') { FX.charge(f, c.p.types[0], RAR.E.color, .5); await wait(220); }
      else { sfx.flip(); setTimeout(() => sfx.reveal(c.p.r), 200); }
      f.classList.add('open');
      f.insertAdjacentHTML('beforeend', `<span class="pts" style="--rc:${rcOf(c)}">+${pts}</span>`);
      sc[sid] += pts;
      const el = $('#' + sid);
      el.textContent = sc[sid];
      el.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], 350);
      await wait(epic ? 1000 : 520);
    }
  }
  const r = await settle.catch(() => ({}));
  if (r.state) applyState(r.state);
  const win = r.delta > 0, tie = r.delta === 0;
  if (!$('#duEnd')) return;
  if (r.status !== 'settled') { $('#duEnd').innerHTML = `<p>Le serveur n'a pas pu confirmer le duel : la mise n'a pas bougé.</p><div class="sum-actions"><button class="btn ghost" onclick="quitGame()">Quitter</button></div>`; return; }
  stake = Math.abs(r.delta) || stake;
  (win ? sfx.win : tie ? sfx.pop : sfx.lose)();
  const end = $('#duEnd');
  if (!end) return;
  end.innerHTML = `<h2 class="${win ? 'win' : tie ? '' : 'lose'}">${win ? 'Victoire !' : tie ? 'Égalité' : 'Défaite…'}</h2>
    <p>${tie ? 'Personne ne remporte la mise.' : win ? `Tu remportes <i class="coin"></i>${stake}` : `Tu perds <i class="coin"></i>${stake}`} · tes 5 cartes sont dans ton classeur.</p>
    <div class="sum-actions"><button class="btn" id="rematch">Revanche</button><button class="btn ghost" id="leave">Quitter</button></div>`;
  if (win) burst(end, '#ffd76a', 60);
  $('#leave').onclick = quitGame;
  $('#rematch').onclick = () => (net.host ? duelSetup() : duelWait());
}

/* ---------- Combat de cartes ---------- */
// Stats tirées de la rareté, avec une variation fixe par Pokémon ; la version dorée a +10 %.
const BASE = { C: [60, 20, 40], R: [80, 27, 50], E: [100, 34, 60], L: [125, 42, 70], M: [150, 50, 80] };
function stats(p, shiny) {
  const [hp, atk, spd] = BASE[p.r], h = (p.id * 2654435761 >>> 0) % 1000 / 1000, m = [1, 1.1, 1.25][vRank(shiny)];
  return { hp: Math.round(hp * (.9 + h * .2) * m), atk: Math.round(atk * (1.1 - h * .2) * m), spd: Math.round(spd * (.85 + (p.id * 7919 % 100) / 100 * .3)) };
}
const STRONG = { feu: ['plante', 'insecte', 'glace', 'acier'], eau: ['feu', 'sol', 'roche'], plante: ['eau', 'sol', 'roche'], electrik: ['eau', 'vol'],
  glace: ['plante', 'sol', 'vol', 'dragon'], combat: ['normal', 'glace', 'roche', 'acier'], poison: ['plante', 'fee'], sol: ['feu', 'electrik', 'poison', 'roche', 'acier'],
  vol: ['plante', 'combat', 'insecte'], psy: ['combat', 'poison'], insecte: ['plante', 'psy'], roche: ['feu', 'glace', 'vol', 'insecte'], spectre: ['psy', 'spectre'],
  dragon: ['dragon'], fee: ['combat', 'dragon'], acier: ['glace', 'roche', 'fee'], normal: [] };
function mult(atkId, defId) {
  const a = POKEMON[atkId - 1].types[0];
  let m = 1;
  for (const t of POKEMON[defId - 1].types) {
    if (STRONG[a].includes(t)) m *= 2;
    else if (STRONG[t].includes(a) || t === a) m *= .5;
  }
  return Math.max(.5, Math.min(2, m));
}
console.assert(mult(6, 1) === 2 && mult(1, 6) === .5 && mult(25, 7) === 2, 'table des types');

// Passifs mécaniques : chaque carte en a un, tiré d'une liste cohérente avec son type (toujours le même pour un Pokémon donné)
const PASSIVES = {
  first: ['⚡', 'Ouverture', 'Sa première attaque inflige ×2.'],
  double: ['⚔️', 'Furie', 'Frappe deux fois (×0,85 chacune), puis s\'épuise le tour suivant : ni attaque, ni Abri, ni Barrière.'],
  quick: ['💨', 'Vif', 'Agit toujours en premier.'],
  rage: ['😤', 'Rage', '+12 % d\'attaque à chaque coup reçu (jusqu\'à +48 %).'],
  vamp: ['🩸', 'Vampirisme', 'Récupère 35 % des dégâts qu\'il inflige.'],
  thorns: ['🌵', 'Épines', 'Renvoie 25 % des dégâts reçus à l\'attaquant.'],
  sturdy: ['🪨', 'Dernier souffle', 'Survit une fois à un coup fatal avec 1 PV.'],
  focus: ['🎯', 'Concentration', 'Après un Abri, sa prochaine attaque inflige ×1,6.'],
  pierce: ['🗡️', 'Brise-garde', 'Passe en partie à travers l\'Abri (35 %) et la Barrière (75 %) adverses.'],
  crit: ['💥', 'Coup critique', '25 % de chances d\'infliger le double de dégâts.'],
  dodge: ['🪶', 'Esquive', '20 % de chances d\'esquiver une attaque.'],
  regen: ['💧', 'Régénération', 'Récupère 4 % de ses PV max à chaque fin de tour.'],
  burn: ['🔥', 'Brûlure', '25 % de chances de brûler la cible (−6 PV par tour, 3 tours).'],
  poison: ['☠️', 'Venin', 'Chaque coup empoisonne : −4 PV par dose et par tour (3 doses max).'],
  stun: ['💫', 'Paralysie', '20 % de chances que l\'adversaire perde son prochain tour.'],
  entry: ['🌟', 'Entrée fracassante', 'En entrant en jeu, inflige 25 dégâts à l\'adversaire.'],
  haunt: ['👻', 'Hantise', 'En tombant K.O., inflige 15 dégâts à son adversaire.'],
  energy: ['🔋', 'Catalyseur', 'Ton équipe gagne +1 énergie de sort en plus à chaque tour.'],
};
const POOLS = {
  feu: ['burn', 'first', 'rage'], eau: ['regen', 'vamp', 'dodge'], plante: ['vamp', 'thorns', 'regen'], electrik: ['stun', 'quick', 'energy'],
  glace: ['stun', 'sturdy', 'crit'], combat: ['double', 'rage', 'focus'], poison: ['poison', 'thorns', 'vamp'], sol: ['sturdy', 'rage', 'entry'],
  roche: ['sturdy', 'thorns', 'entry'], vol: ['dodge', 'quick', 'first'], psy: ['energy', 'focus', 'pierce'], insecte: ['double', 'poison', 'quick'],
  spectre: ['haunt', 'pierce', 'dodge'], dragon: ['rage', 'first', 'double'], fee: ['regen', 'energy', 'dodge'], acier: ['sturdy', 'thorns', 'focus'],
  normal: ['crit', 'quick', 'first'],
};
// Sorts : coût en énergie (2 au départ, +1 par tour, 6 max). Un sort par tour, lancé en plus de l'action.
const SPELLS = {
  boost: ['💪', 'Renforcement', 2, '+40 % d\'attaque pendant 2 tours'],
  heal: ['💚', 'Soin', 3, 'Rend 35 % des PV max'],
  barrier: ['🔰', 'Barrière', 2, 'Divise par deux les dégâts reçus ce tour'],
  haste: ['💨', 'Hâte', 1, 'Agis en premier ce tour'],
  weaken: ['🌀', 'Affaiblir', 2, 'L\'adversaire perd 30 % d\'attaque pendant 2 tours'],
  cleanse: ['✨', 'Purification', 1, 'Retire brûlure, poison et paralysie'],
};
const EN_MAX = 6;
// Type de référence : le type principal, sauf un Normal à double type qui prend son second type (ex. Roucool Normal/Vol)
const ptypeOf = p => (p.types[0] === 'normal' && p.types[1]) || p.types[0];
const pasIdOf = p => { const pool = POOLS[ptypeOf(p)]; return pool[p.id % pool.length]; };
const passiveFor = p => PASSIVES[pasIdOf(p)];
const pas = c => pasIdOf(POKEMON[c.id - 1]);
const passiveOf = c => PASSIVES[pas(c)];
const mkSide = team => ({ team: team.map(([id, s]) => { const st = stats(POKEMON[id - 1], s === 2 ? 'anim' : !!s); return { id, s, hp: st.hp, max: st.hp, atk: st.atk, spd: st.spd, sp: true, burn: 0, psn: 0, stun: false, solid: false, used: false, rest: 0, rage: 0, focus: false, boost: 0, weak: 0 }; }), act: 0, lastG: false, en: 2 });

// Un tour : changements, sorts, protections, attaques (priorité puis vitesse), effets de fin de tour. L'hôte fait foi.
// Événements : swp/next (entrée en jeu), spell, grd, hit (attaque), fx (effet : d = variation de PV de la carte active du camp k), lose
function resolve(S, acts, rnd = Math.random) {
  const ev = [], guard = {}, barrier = {}, haste = {}, other = k => (k === 'A' ? 'B' : 'A'), active = k => S[k].team[S[k].act];
  const hurt = (k, d, txt, nonLethal) => {
    const c = active(k), before = c.hp;
    c.hp = Math.max(nonLethal ? Math.min(1, before) : 0, Math.min(c.max, c.hp + d));
    ev.push({ k, e: 'fx', d: c.hp - before, txt, ko: before > 0 && c.hp === 0 });
  };
  const enter = k => { if (pas(active(k)) === 'entry' && active(other(k)).hp > 0) hurt(other(k), -25, 'Entrée fracassante', true); };
  for (const k of ['A', 'B']) {
    const s = S[k], a = acts[k];
    if (a.a === 'swp' && a.to !== s.act && s.team[a.to]?.hp > 0) { s.act = a.to; ev.push({ k, e: 'swp', to: a.to }); enter(k); }
  }
  for (const k of ['A', 'B']) {
    const s = S[k], sp = SPELLS[acts[k].sp], c = active(k);
    if (!sp || s.en < sp[2] || (acts[k].sp === 'barrier' && c.rest)) continue;
    s.en -= sp[2];
    const id = acts[k].sp;
    if (id === 'heal') { hurt(k, Math.round(c.max * .35), 'Soin'); ev[ev.length - 1].spell = id; continue; }
    if (id === 'boost') c.boost = 2;
    if (id === 'weaken') active(other(k)).weak = 2;
    if (id === 'barrier') barrier[k] = true;
    if (id === 'haste') haste[k] = true;
    if (id === 'cleanse') Object.assign(c, { burn: 0, psn: 0, stun: false });
    ev.push({ k, e: 'spell', sp: id });
  }
  for (const k of ['A', 'B']) {
    const s = S[k];
    guard[k] = acts[k].a === 'grd' && !s.lastG && !active(k).rest;
    s.lastG = guard[k];
    if (guard[k]) { ev.push({ k, e: 'grd' }); if (pas(active(k)) === 'focus') active(k).focus = true; }
  }
  const prio = k => (haste[k] ? 2 : 0) + (pas(active(k)) === 'quick' ? 1 : 0);
  const order = ['A', 'B'].sort((x, y) => (prio(y) - prio(x)) || (active(y).spd - active(x).spd) || (rnd() - .5));
  for (const k of order) {
    const a = acts[k], o = other(k), me = active(k);
    if (a.a !== 'atk' && a.a !== 'spe') continue;
    if (me.hp <= 0 || active(o).hp <= 0) continue;
    if (me.rest) { ev.push({ k, e: 'fx', d: 0, txt: 'est épuisé par sa Furie' }); continue; }
    if (me.stun) { me.stun = false; ev.push({ k, e: 'fx', d: 0, txt: 'est paralysé et ne peut pas attaquer' }); continue; }
    const spe = a.a === 'spe' && me.sp, hits = pas(me) === 'double' ? 2 : 1;
    if (spe) me.sp = false;
    for (let h = 0; h < hits; h++) {
      const him = active(o);
      if (him.hp <= 0 || me.hp <= 0) break;
      if (pas(him) === 'dodge' && rnd() < .2) { ev.push({ k, e: 'hit', dmg: 0, m: 1, spe: spe && !h, dodge: true }); continue; }
      const m = mult(me.id, him.id), pierce = pas(me) === 'pierce', tags = [];
      if (guard[o] && !pierce) { ev.push({ k, e: 'hit', dmg: 0, m, spe: spe && !h, blocked: true }); continue; }
      let f = m * (spe && !h ? 1.8 : 1) * (.85 + rnd() * .15) * (hits > 1 ? .85 : 1);
      if (guard[o]) f *= .35; // seul Brise-garde arrive jusqu'ici à travers l'Abri
      if (barrier[o]) f *= pierce ? .75 : .5;
      if (pas(me) === 'first' && !me.used) { f *= 2; tags.push('<b>Ouverture</b>'); }
      if (me.focus) { f *= 1.6; me.focus = false; tags.push('<b>Concentration</b>'); }
      if (me.rage) f *= 1 + .12 * me.rage;
      if (me.boost) f *= 1.4;
      if (me.weak) f *= .7;
      const crit = pas(me) === 'crit' && rnd() < .25;
      if (crit) { f *= 2; tags.push('<b>coup critique</b>'); }
      let dmg = Math.max(1, Math.round(me.atk * f)), solid = false;
      if (dmg >= him.hp && pas(him) === 'sturdy' && !him.solid && him.hp > 1) { dmg = him.hp - 1; him.solid = solid = true; }
      him.hp = Math.max(0, him.hp - dmg);
      let eff = '';
      if (him.hp > 0) {
        const p = pas(me);
        if (p === 'burn' && rnd() < .25) { him.burn = 3; eff = 'brûlé'; }
        if (p === 'poison') { him.psn = Math.min(3, him.psn + 1); eff = `empoisonné (×${him.psn})`; }
        if (p === 'stun' && rnd() < .2) { him.stun = true; eff = 'paralysé'; }
        if (pas(him) === 'rage') him.rage = Math.min(4, him.rage + 1);
      }
      ev.push({ k, e: 'hit', dmg, m, spe: spe && !h, guarded: (guard[o] || barrier[o]) && !pierce, pierce: pierce && (guard[o] || barrier[o]), ko: him.hp === 0, solid, eff, tags, n: hits > 1 ? h + 1 : 0 });
      if (pas(me) === 'vamp' && me.hp > 0 && me.hp < me.max) hurt(k, Math.max(1, Math.round(dmg * .35)), 'Vampirisme');
      if (pas(him) === 'thorns' && me.hp > 0) hurt(k, -Math.max(1, Math.round(dmg * .25)), 'Épines');
      if (him.hp === 0 && pas(him) === 'haunt' && me.hp > 0) hurt(k, -15, 'Hantise');
    }
    me.used = true;
    if (hits > 1) me.rest = 2;
  }
  // fin de tour : brûlure, poison, régénération, durées des sorts, énergie
  for (const k of ['A', 'B']) {
    const s = S[k], c = active(k);
    if (c.hp > 0) {
      if (c.burn) { c.burn--; hurt(k, -6, 'Brûlure'); }
      if (c.psn && c.hp > 0) hurt(k, -4 * c.psn, 'Venin');
      if (pas(c) === 'regen' && c.hp > 0 && c.hp < c.max) hurt(k, Math.max(1, Math.round(c.max * .04)), 'Régénération');
    }
    for (const x of s.team) { if (x.boost) x.boost--; if (x.weak) x.weak--; if (x.rest) x.rest--; }
    s.en = Math.min(EN_MAX, s.en + 1 + (s.team.some(x => x.hp > 0 && pas(x) === 'energy') ? 1 : 0));
  }
  for (const k of ['A', 'B']) {
    const s = S[k];
    if (active(k).hp > 0) continue;
    const nx = s.team.findIndex(c => c.hp > 0);
    ev.push(nx >= 0 ? { k, e: 'next', to: nx } : { k, e: 'lose' });
    if (nx >= 0) { s.act = nx; enter(k); }
  }
  return ev;
}
function battleTeam() {
  const keys = Object.keys(state.owned).sort((a, b) => priceOf(b) - priceOf(a) || parseInt(a) - parseInt(b));
  if (keys.length < 3) return stage(errBox("Il te faut au moins 3 cartes dans ton classeur. Ouvre quelques boosters d'abord !"));
  const chosen = [];
  const draw = () => {
    const g = stage(`<div class="g-card wide"><h2>Choisis tes 3 cartes</h2>
      <p>Combat ${vsTxt()} · <b>${chosen.length}/3</b> · l'ordre compte : la 1ʳᵉ entre en premier. Chaque carte a un passif (survole-la pour le détail), et tu lanceras des sorts avec ton énergie.</p>
      <div class="team-grid">${keys.map(k => {
        const { p, shiny } = keyInfo(k), s = stats(p, shiny), n = chosen.indexOf(k);
        const [pe, pn, pd] = passiveFor(p);
        return `<button class="tm${n >= 0 ? ' on' : ''}" data-k="${k}" title="${pn} : ${pd}">${cardHTML(p, shiny)}<span class="st">❤ ${s.hp} · ⚔ ${s.atk} · ⚡ ${s.spd}</span><span class="ps">${pe} ${pn}</span>${n >= 0 ? `<b class="tm-n">${n + 1}</b>` : ''}</button>`;
      }).join('')}</div>
      <button class="btn" id="go" ${chosen.length === 3 ? '' : 'disabled'}>Au combat !</button></div>`);
    g.onclick = e => {
      const t = e.target.closest('.tm, #go');
      if (!t) return;
      if (t.id === 'go') return startTeam(chosen);
      const i = chosen.indexOf(t.dataset.k);
      if (i >= 0) chosen.splice(i, 1); else if (chosen.length < 3) chosen.push(t.dataset.k); else return sfx.nope();
      sfx.pop();
      const o = $('#overlay'), y = o.scrollTop; draw(); o.scrollTop = y;
    };
  };
  draw();
}
async function startTeam(keys) {
  const mine = keys.map(k => [parseInt(k), vRank(keyInfo(k).shiny)]);
  send({ t: 'team', team: mine });
  stage(waitBox(`${G.oppName} choisit son équipe…`));
  if (net.host) {
    const S = { A: mkSide(mine), B: mkSide((await recv('team')).team) };
    send({ t: 'start', S });
    battle(S, 'A');
  } else battle((await recv('start')).S, 'B');
}

const opp = () => (G.me === 'A' ? 'B' : 'A');
const pname = c => POKEMON[c.id - 1].name;
function battle(S, me) {
  G.S = S; G.me = me;
  stage(`<div class="bt">
    <div class="bt-row"><div class="bt-name" id="nOpp">${G.oppName}</div><div class="bench" id="bOpp"></div><div class="fighter" id="fOpp"></div></div>
    <div class="bt-log" id="log">Que le combat commence !</div>
    <div class="bt-row me"><div class="fighter" id="fMe"></div><div class="bench" id="bMe"></div><div class="bt-name" id="nMe">${myName}</div></div>
    <div class="bt-actions" id="acts"></div></div>`);
  drawFighters(S);
  sfx.whoosh();
  askAction();
}
function drawFighters(S) {
  for (const [k, f, b, nm] of [[G.me, '#fMe', '#bMe', '#nMe'], [opp(), '#fOpp', '#bOpp', '#nOpp']]) {
    const s = S[k], c = s.team[s.act], r = c.hp / c.max;
    $(nm).innerHTML = `${k === G.me ? myName : G.oppName}<br><span class="en">${'◆'.repeat(s.en)}${'◇'.repeat(EN_MAX - s.en)}</span>`;
    const st = [c.burn && '🔥 brûlé', c.psn && `☠️ ×${c.psn}`, c.stun && '💫 paralysé', c.rest && '😮‍💨 épuisé', c.boost && '💪 renforcé', c.weak && '🌀 affaibli',
      c.focus && '🎯 concentré', c.rage && `😤 +${c.rage * 12} %`, pas(c) === 'first' && !c.used && '⚡ prêt'].filter(Boolean).join(' · ');
    $(f).innerHTML = `<div class="ft-card">${cardHTML(POKEMON[c.id - 1], c.s === 2 ? 'anim' : !!c.s)}</div>
      <div class="hpbox"><b>${pname(c)}</b><div class="hp"><i class="${r < .25 ? 'low' : r < .5 ? 'mid' : ''}" style="width:${r * 100}%"></i></div><span>${c.hp} / ${c.max} PV</span>
        <small class="pas" title="${passiveOf(c)[2]}">${passiveOf(c)[0]} ${passiveOf(c)[1]}</small>${st ? `<small class="sts">${st}</small>` : ''}</div>`;
    $(b).innerHTML = s.team.map((x, i) => `<div class="bn${i === s.act ? ' act' : ''}${x.hp ? '' : ' ko'}">${cardHTML(POKEMON[x.id - 1], x.s === 2 ? 'anim' : !!x.s)}</div>`).join('');
  }
}
function askAction() {
  const s = G.S[G.me], c = s.team[s.act], o = G.S[opp()], oc = o.team[o.act], m = mult(c.id, oc.id);
  const eff = m > 1 ? ' · <em class="up">super efficace</em>' : m < 1 ? ' · <em class="down">peu efficace</em>' : '';
  const acts = $('#acts');
  if (!acts) return;
  const spells = Object.entries(SPELLS).map(([id, [e, n, cost, d]]) => `<button class="spell${G.spell === id ? ' on' : ''}" data-sp="${id}" ${s.en < cost || (id === 'barrier' && c.rest) ? 'disabled' : ''} title="${d}">${e} ${n}<small>${'◆'.repeat(cost)}</small></button>`).join('');
  acts.innerHTML = `<div class="spells"><span class="sp-lbl">Sort (optionnel) · ⚡ ${s.en}/${EN_MAX}</span>${spells}</div><button class="act" data-a="atk">⚔️ Attaque<small>~${Math.round(c.atk * m)} dégâts${eff}</small></button>
    <button class="act sp" data-a="spe" ${c.sp ? '' : 'disabled'}>💥 Coup spécial<small>${c.sp ? `~${Math.round(c.atk * m * 1.8)} dégâts · une fois` : 'déjà utilisé'}</small></button>
    <button class="act" data-a="grd" ${s.lastG || c.rest ? 'disabled' : ''}>🛡️ Abri<small>${c.rest ? 'épuisé par sa Furie' : s.lastG ? 'pas deux fois de suite' : 'bloque toutes les attaques du tour'}</small></button>
    <button class="act" data-a="swp" ${s.team.some((x, i) => i !== s.act && x.hp > 0) ? '' : 'disabled'}>🔄 Changer<small>envoyer une autre carte</small></button>`;
  acts.onclick = e => {
    const sp = e.target.closest('.spell');
    if (sp && !sp.disabled) { G.spell = G.spell === sp.dataset.sp ? null : sp.dataset.sp; sfx.select(); return askAction(); }
    const b = e.target.closest('.act');
    if (!b || b.disabled) return;
    sfx.pop();
    if (b.dataset.a !== 'swp') return choose({ a: b.dataset.a });
    acts.innerHTML = s.team.map((x, i) => i !== s.act && x.hp > 0 ? `<button class="act" data-to="${i}">${pname(x)}<small>${x.hp} / ${x.max} PV · ⚔ ${x.atk}</small></button>` : '').join('')
      + '<button class="act ghost" data-back="1">↩ Retour</button>';
    acts.onclick = e2 => {
      const t = e2.target.closest('.act');
      if (!t) return;
      if (t.dataset.back) return askAction();
      choose({ a: 'swp', to: +t.dataset.to });
    };
  };
}
async function choose(a) {
  if (G.spell) a.sp = G.spell;
  G.spell = null;
  const acts = $('#acts');
  acts.onclick = null;
  acts.innerHTML = `<p class="wait">En attente de ${G.oppName}…</p>`;
  const D = structuredClone(G.S);
  let ev;
  if (net.host) { ev = resolve(G.S, { A: a, B: (await recv('act')).a }); send({ t: 'round', ev, S: G.S }); }
  else { send({ t: 'act', a }); const r = await recv('round'); ev = r.ev; G.S = r.S; }
  await playRound(ev, D);
}
async function playRound(ev, D) {
  const me = G.me, side = k => (k === me ? 'Me' : 'Opp'), whose = k => (k === me ? '' : ' adverse');
  const log = t => { const l = $('#log'); if (l) l.innerHTML = t; };
  const losers = [];
  for (const x of ev) {
    if (!$('#log')) return; // partie quittée
    const cur = D[x.k].team[D[x.k].act];
    if (x.e === 'lose') { losers.push(x.k); continue; }
    if (x.e === 'swp' || x.e === 'next') {
      D[x.k].act = x.to;
      drawFighters(D);
      sfx.whoosh();
      log(`${x.k === me ? 'Tu envoies' : `${G.oppName} envoie`} ${pname(D[x.k].team[x.to])} !`);
      await wait(850);
    } else if (x.e === 'spell') {
      const [e, n] = SPELLS[x.sp], f = $('#f' + side(x.k));
      sfx.select();
      burst(f, x.sp === 'weaken' ? '#b46bff' : '#7dd3fc', 18);
      log(`${x.k === me ? 'Tu lances' : `${G.oppName} lance`} <b>${e} ${n}</b>${x.sp === 'weaken' ? ` sur ${pname(D[x.k === 'A' ? 'B' : 'A'].team[D[x.k === 'A' ? 'B' : 'A'].act])}${whose(x.k === 'A' ? 'B' : 'A')}` : ''} !`);
      await wait(800);
    } else if (x.e === 'grd') {
      $('#f' + side(x.k)).classList.add('guard');
      sfx.pop();
      log(`${pname(cur)}${whose(x.k)} se met à l’<b>Abri</b> !`);
      await wait(700);
    } else if (x.e === 'fx') {
      const f = $('#f' + side(x.k));
      cur.hp = Math.max(0, Math.min(cur.max, cur.hp + x.d));
      const r = cur.hp / cur.max, bar = f.querySelector('.hp i');
      bar.style.width = r * 100 + '%';
      bar.className = r < .25 ? 'low' : r < .5 ? 'mid' : '';
      f.querySelector('.hpbox span').textContent = `${cur.hp} / ${cur.max} PV`;
      if (x.d) {
        f.insertAdjacentHTML('beforeend', `<span class="dmg${x.d > 0 ? ' heal' : ''}">${x.d > 0 ? '+' : ''}${x.d}</span>`);
        x.d < 0 ? (f.classList.add('hurt'), sfx.hit(false)) : sfx.pop();
      }
      log(`${pname(cur)}${whose(x.k)} · <b>${x.txt}</b>${x.d < 0 ? ` : −${-x.d} PV` : x.d > 0 ? ` : +${x.d} PV` : ''}`);
      await wait(800);
      f.classList.remove('hurt');
      f.querySelector('.dmg')?.remove();
      if (x.ko) { f.classList.add('ko'); sfx.nope(); log(`${pname(cur)}${whose(x.k)} est K.O. !`); await wait(950); f.classList.remove('ko'); }
    } else if (x.e === 'hit' && x.blocked) {
      const o = x.k === 'A' ? 'B' : 'A', fa = $('#f' + side(x.k)), fd = $('#f' + side(o));
      fa.classList.add(x.k === me ? 'lunge-up' : 'lunge-down');
      fd.classList.add('blocked');
      sfx.nope();
      log(`${pname(cur)}${whose(x.k)} ${x.spe ? 'lance son coup spécial' : 'attaque'}… <b>bloqué par l’Abri</b> de ${pname(D[o].team[D[o].act])}${whose(o)} !`);
      await wait(800);
      fa.classList.remove('lunge-up', 'lunge-down');
      fd.classList.remove('blocked');
    } else if (x.e === 'hit' && x.dodge) {
      const o = x.k === 'A' ? 'B' : 'A', fa = $('#f' + side(x.k)), fd = $('#f' + side(o));
      fa.classList.add(x.k === me ? 'lunge-up' : 'lunge-down');
      fd.classList.add('dodge');
      sfx.whoosh();
      log(`${pname(cur)}${whose(x.k)} attaque… mais ${pname(D[o].team[D[o].act])}${whose(o)} <b>esquive</b> !`);
      await wait(800);
      fa.classList.remove('lunge-up', 'lunge-down');
      fd.classList.remove('dodge');
    } else if (x.e === 'hit') {
      const o = x.k === 'A' ? 'B' : 'A', def = D[o].team[D[o].act], fa = $('#f' + side(x.k)), fd = $('#f' + side(o));
      fa.classList.add(x.k === me ? 'lunge-up' : 'lunge-down');
      sfx.hit(x.spe);
      await wait(230);
      def.hp = Math.max(0, def.hp - x.dmg);
      const r = def.hp / def.max, bar = fd.querySelector('.hp i');
      bar.style.width = r * 100 + '%';
      bar.className = r < .25 ? 'low' : r < .5 ? 'mid' : '';
      fd.querySelector('.hpbox span').textContent = `${def.hp} / ${def.max} PV`;
      fd.classList.add('hurt');
      fd.insertAdjacentHTML('beforeend', `<span class="dmg${x.m > 1 ? ' big' : ''}">-${x.dmg}</span>`);
      if (x.spe || x.m > 1) burst(fd, x.spe ? '#ffd76a' : '#ff6b6b', x.spe ? 30 : 14);
      log(`${pname(cur)}${whose(x.k)} ${x.spe ? 'lance son <b>coup spécial</b>' : 'attaque'}${x.n ? ` (coup ${x.n}/2)` : ''} : ${x.dmg} dégâts${x.tags?.length ? ' · ' + x.tags.join(' · ') : ''}${x.m > 1 ? ' · <b class="up">super efficace !</b>' : x.m < 1 ? ' · peu efficace…' : ''}${x.guarded ? ' (protégé)' : ''}${x.pierce ? ' · <b>Brise-garde</b> : passe à moitié à travers la défense' : ''}${x.solid ? ` · ${pname(def)} tient bon grâce à <b>Dernier souffle</b> !` : ''}${x.eff ? ` · ${pname(def)} est <b>${x.eff}</b>` : ''}`);
      await wait(750);
      fa.classList.remove('lunge-up', 'lunge-down');
      fd.classList.remove('hurt');
      fd.querySelector('.dmg')?.remove();
      if (x.ko) {
        fd.classList.add('ko');
        sfx.nope();
        log(`${pname(def)}${whose(o)} est K.O. !`);
        await wait(950);
        fd.classList.remove('ko');
      }
    }
  }
  document.querySelectorAll('.fighter.guard').forEach(f => f.classList.remove('guard'));
  if (losers.length) return endBattle(losers);
  drawFighters(G.S);
  askAction();
}
function endBattle(losers) {
  const tie = losers.length === 2, win = !tie && !losers.includes(G.me), prize = 120;
  // La prime n'est versée que si les deux joueurs déclarent le même gagnant (5 par jour)
  rpc('battle_report', { p_code: matchId(), p_winner: tie ? '-' : win ? myName : G.oppName })
    .then(r => r.state ? applyState(r.state) : wait(4000).then(refreshState)).catch(() => {});
  (win ? sfx.win : tie ? sfx.pop : sfx.lose)();
  $('#acts').innerHTML = `<div class="bt-end"><h2 class="${win ? 'win' : tie ? '' : 'lose'}">${win ? 'Victoire !' : tie ? 'Égalité' : 'Défaite…'}</h2>
    <p>${win ? `Tu gagnes <i class="coin"></i>${prize} (5 primes par jour)` : tie ? 'Les deux équipes sont K.O.' : 'Retente ta chance avec une autre équipe.'}</p>
    <div class="sum-actions"><button class="btn" id="rematch">Revanche</button><button class="btn ghost" id="leave">Quitter</button></div></div>`;
  if (win) burst($('#acts'), '#ffd76a', 60);
  $('#acts').onclick = e => {
    if (e.target.id === 'leave') quitGame();
    if (e.target.id === 'rematch') battleTeam();
  };
}

/* ---------- Onglet Jouer ---------- */
const setAvatar = () => { $('#avatar').textContent = myName[0].toUpperCase(); $('#avatar').title = myName; };
$('#avatar').onclick = () => confirm(`Connecté en tant que ${myName}. Se déconnecter ?`) && logout();
$('#play').onclick = e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const mode = b.closest('.mode').dataset.mode;
  G.online = true;
  G.oppName = 'Ton ami';
  sfx.select();
  hostRoom(mode);
};
$('#joinBtn').onclick = () => {
  const code = $('#joinCode').value.trim().toUpperCase();
  if (code.length !== 5) { sfx.nope(); return $('#joinCode').focus(); }
  G.online = true; G.oppName = 'Ton ami';
  sfx.select();
  joinRoom(code);
};
$('#joinCode').onkeydown = e => e.key === 'Enter' && $('#joinBtn').click();
