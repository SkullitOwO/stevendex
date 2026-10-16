/* ---------- Jouer : duel de boosters et combat de cartes ---------- */
const PTS = { C: 1, R: 3, E: 8, L: 20, M: 50 };
const STAKES = [50, 100, 250, 500];
const G = { online: false, oppName: "L'ordi", S: null, me: 'A' };
let myName = 'Dresseur';
try { myName = localStorage.getItem('boosterdex-name') || 'Dresseur'; } catch {}

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
const vsTxt = () => G.online ? `contre <b>${G.oppName}</b>` : "contre l'ordi";

async function hostRoom(mode) {
  gameScreen(waitBox('Création du salon…'));
  let code;
  try { code = await netHost(); } catch { return stage(errBox('Impossible de créer le salon. Vérifie ta connexion internet.')); }
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
  try { await netJoin(code); } catch { netClose(); return stage(errBox('Salon introuvable. Vérifie le code et que ton ami est toujours dans son salon.')); }
  net.onclose = () => stage(errBox(`${G.oppName} a quitté la partie.`));
  const h = await recv('hello');
  G.oppName = h.name;
  send({ t: 'hello', name: myName });
  sfx.coin();
  h.mode === 'duel' ? duelWait() : battleTeam();
}

/* ---------- Duel de boosters ---------- */
function botPack(b) {
  const pool = poolOf(b), n = dist(pool, false), g = dist(pool, true), taken = new Set();
  return [roll(n), roll(n), roll(n), roll(n), roll(g)].map(r => {
    let bucket = pool.filter(p => p.r === r && !taken.has(p.id));
    if (!bucket.length) bucket = pool.filter(p => !taken.has(p.id));
    const p = pick(bucket);
    taken.add(p.id);
    return { p, shiny: Math.random() < SHINY };
  }).sort((a, b) => RKEYS.indexOf(a.p.r) - RKEYS.indexOf(b.p.r) || a.shiny - b.shiny);
}
const scoreOf = c => PTS[c.p.r] * (c.shiny ? 2 : 1);
const RULES = 'Barème : Commune 1 · Rare 3 · Épique 8 · Légendaire 20 · Mythique 50 · dorée ×2';

function duelSetup() {
  let bi = sel, stake = 100;
  const draw = () => {
    const b = BOOSTERS[bi], cost = b.price + stake;
    const g = stage(`<div class="g-card wide"><h2>Duel de boosters</h2>
      <p>Vous ouvrez chacun le même booster ${vsTxt()}. Le plus gros score remporte la mise, et chacun garde ses cartes.</p>
      <h3>Booster</h3><div class="pick">${BOOSTERS.map((x, i) => `<button class="chip${i === bi ? ' on' : ''}" data-b="${i}" style="--c:${x.color}">${x.icon} ${x.name}</button>`).join('')}</div>
      <h3>Mise</h3><div class="pick">${STAKES.map(s => `<button class="chip${s === stake ? ' on' : ''}" data-s="${s}"><i class="coin"></i>${s}</button>`).join('')}</div>
      <p class="muted">Il te faut <b><i class="coin"></i>${cost}</b> (booster ${b.price} + mise ${stake}). ${RULES}</p>
      <button class="btn" id="go" ${state.coins < cost ? 'disabled' : ''}>${G.online ? 'Envoyer le défi' : 'Lancer le duel'}</button></div>`);
    g.onclick = async e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.b) { bi = +t.dataset.b; sfx.select(); return draw(); }
      if (t.dataset.s) { stake = +t.dataset.s; sfx.select(); return draw(); }
      if (t.id !== 'go') return;
      if (!G.online) return runDuel(bi, stake);
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
  const b = BOOSTERS[bi];
  state.coins -= b.price;
  const mine = openPack(b).cards;
  save(); renderTop(); renderShop();
  let theirs;
  if (G.online) {
    send({ t: 'pack', cards: mine.map(c => [c.p.id, c.shiny ? 1 : 0]) });
    stage(waitBox(`${G.oppName} ouvre son booster…`));
    theirs = (await recv('pack')).cards.map(([id, s]) => ({ p: POKEMON[id - 1], shiny: !!s }));
  } else theirs = botPack(b);
  duelReveal(stake, mine, theirs);
}
async function duelReveal(stake, mine, theirs) {
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
      if (epic) { f.classList.add('charging'); sfx.charge(); await wait(1000); f.classList.remove('charging'); sfx.epic(); burst(f, rcOf(c), 40); }
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
  const win = sc.sMe > sc.sOpp, tie = sc.sMe === sc.sOpp;
  if (!tie) { state.coins += win ? stake : -stake; save(); renderTop(); }
  (win ? sfx.win : tie ? sfx.pop : sfx.lose)();
  const end = $('#duEnd');
  if (!end) return;
  end.innerHTML = `<h2 class="${win ? 'win' : tie ? '' : 'lose'}">${win ? 'Victoire !' : tie ? 'Égalité' : 'Défaite…'}</h2>
    <p>${tie ? 'Personne ne remporte la mise.' : win ? `Tu remportes <i class="coin"></i>${stake}` : `Tu perds <i class="coin"></i>${stake}`} · tes 5 cartes sont dans ton classeur.</p>
    <div class="sum-actions"><button class="btn" id="rematch">Revanche</button><button class="btn ghost" id="leave">Quitter</button></div>`;
  if (win) burst(end, '#ffd76a', 60);
  $('#leave').onclick = quitGame;
  $('#rematch').onclick = () => (!G.online || net.host ? duelSetup() : duelWait());
}

/* ---------- Combat de cartes ---------- */
// Stats tirées de la rareté, avec une variation fixe par Pokémon ; la version dorée a +10 %.
const BASE = { C: [60, 20, 40], R: [80, 27, 50], E: [100, 34, 60], L: [125, 42, 70], M: [150, 50, 80] };
function stats(p, shiny) {
  const [hp, atk, spd] = BASE[p.r], h = (p.id * 2654435761 >>> 0) % 1000 / 1000, m = shiny ? 1.1 : 1;
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

const mkSide = team => ({ team: team.map(([id, s]) => { const st = stats(POKEMON[id - 1], !!s); return { id, s, hp: st.hp, max: st.hp, atk: st.atk, spd: st.spd, sp: true }; }), act: 0, lastG: false });

// Un tour : changements, puis protections, puis attaques par ordre de vitesse. L'hôte (ou le jeu solo) fait foi.
function resolve(S, acts, rnd = Math.random) {
  const ev = [], guard = {};
  for (const k of ['A', 'B']) {
    const s = S[k], a = acts[k];
    if (a.a === 'swp' && a.to !== s.act && s.team[a.to]?.hp > 0) { s.act = a.to; ev.push({ k, e: 'swp', to: a.to }); }
  }
  for (const k of ['A', 'B']) {
    const s = S[k];
    guard[k] = acts[k].a === 'grd' && !s.lastG;
    s.lastG = guard[k];
    if (guard[k]) ev.push({ k, e: 'grd' });
  }
  const order = ['A', 'B'].sort((x, y) => (S[y].team[S[y].act].spd - S[x].team[S[x].act].spd) || (rnd() - .5));
  for (const k of order) {
    const a = acts[k];
    if (a.a !== 'atk' && a.a !== 'spe') continue;
    const o = k === 'A' ? 'B' : 'A', me = S[k].team[S[k].act], him = S[o].team[S[o].act];
    if (me.hp <= 0 || him.hp <= 0) continue;
    const spe = a.a === 'spe' && me.sp;
    if (spe) me.sp = false;
    const m = mult(me.id, him.id);
    const dmg = Math.max(1, Math.round(me.atk * m * (spe ? 1.8 : 1) * (.85 + rnd() * .15) * (guard[o] ? .4 : 1)));
    him.hp = Math.max(0, him.hp - dmg);
    ev.push({ k, e: 'hit', dmg, m, spe, guarded: !!guard[o], ko: him.hp === 0 });
  }
  for (const k of ['A', 'B']) {
    const s = S[k];
    if (s.team[s.act].hp > 0) continue;
    const nx = s.team.findIndex(c => c.hp > 0);
    ev.push(nx >= 0 ? { k, e: 'next', to: nx } : { k, e: 'lose' });
    if (nx >= 0) s.act = nx;
  }
  return ev;
}
function battleTeam() {
  const keys = Object.keys(state.owned).sort((a, b) => priceOf(b) - priceOf(a) || parseInt(a) - parseInt(b));
  if (keys.length < 3) return stage(errBox("Il te faut au moins 3 cartes dans ton classeur. Ouvre quelques boosters d'abord !"));
  const chosen = [];
  const draw = () => {
    const g = stage(`<div class="g-card wide"><h2>Choisis tes 3 cartes</h2>
      <p>Combat ${vsTxt()} · <b>${chosen.length}/3</b> · l'ordre compte : la 1ʳᵉ entre en premier.</p>
      <div class="team-grid">${keys.map(k => {
        const { p, shiny } = keyInfo(k), s = stats(p, shiny), n = chosen.indexOf(k);
        return `<button class="tm${n >= 0 ? ' on' : ''}" data-k="${k}">${cardHTML(p, shiny)}<span class="st">❤ ${s.hp} · ⚔ ${s.atk} · ⚡ ${s.spd}</span>${n >= 0 ? `<b class="tm-n">${n + 1}</b>` : ''}</button>`;
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
  const mine = keys.map(k => [parseInt(k), k.endsWith('s') ? 1 : 0]);
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
    <div class="bt-row"><div class="bt-name">${G.oppName}</div><div class="bench" id="bOpp"></div><div class="fighter" id="fOpp"></div></div>
    <div class="bt-log" id="log">Que le combat commence !</div>
    <div class="bt-row me"><div class="fighter" id="fMe"></div><div class="bench" id="bMe"></div><div class="bt-name">${myName}</div></div>
    <div class="bt-actions" id="acts"></div></div>`);
  drawFighters(S);
  sfx.whoosh();
  askAction();
}
function drawFighters(S) {
  for (const [k, f, b] of [[G.me, '#fMe', '#bMe'], [opp(), '#fOpp', '#bOpp']]) {
    const s = S[k], c = s.team[s.act], r = c.hp / c.max;
    $(f).innerHTML = `<div class="ft-card">${cardHTML(POKEMON[c.id - 1], !!c.s)}</div>
      <div class="hpbox"><b>${pname(c)}</b><div class="hp"><i class="${r < .25 ? 'low' : r < .5 ? 'mid' : ''}" style="width:${r * 100}%"></i></div><span>${c.hp} / ${c.max} PV</span></div>`;
    $(b).innerHTML = s.team.map((x, i) => `<div class="bn${i === s.act ? ' act' : ''}${x.hp ? '' : ' ko'}">${cardHTML(POKEMON[x.id - 1], !!x.s)}</div>`).join('');
  }
}
function askAction() {
  const s = G.S[G.me], c = s.team[s.act], o = G.S[opp()], oc = o.team[o.act], m = mult(c.id, oc.id);
  const eff = m > 1 ? ' · <em class="up">super efficace</em>' : m < 1 ? ' · <em class="down">peu efficace</em>' : '';
  const acts = $('#acts');
  if (!acts) return;
  acts.innerHTML = `<button class="act" data-a="atk">⚔️ Attaque<small>~${Math.round(c.atk * m)} dégâts${eff}</small></button>
    <button class="act sp" data-a="spe" ${c.sp ? '' : 'disabled'}>💥 Coup spécial<small>${c.sp ? `~${Math.round(c.atk * m * 1.8)} dégâts · une fois` : 'déjà utilisé'}</small></button>
    <button class="act" data-a="grd" ${s.lastG ? 'disabled' : ''}>🛡️ Protection<small>${s.lastG ? 'pas deux fois de suite' : '−60 % de dégâts ce tour'}</small></button>
    <button class="act" data-a="swp" ${s.team.some((x, i) => i !== s.act && x.hp > 0) ? '' : 'disabled'}>🔄 Changer<small>envoyer une autre carte</small></button>`;
  acts.onclick = e => {
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
    } else if (x.e === 'grd') {
      $('#f' + side(x.k)).classList.add('guard');
      sfx.pop();
      log(`${pname(cur)}${whose(x.k)} se protège !`);
      await wait(700);
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
      log(`${pname(cur)}${whose(x.k)} ${x.spe ? 'lance son <b>coup spécial</b>' : 'attaque'} : ${x.dmg} dégâts${x.m > 1 ? ' · <b class="up">super efficace !</b>' : x.m < 1 ? ' · peu efficace…' : ''}${x.guarded ? ' (protégé)' : ''}`);
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
  if (win) { state.coins += prize; save(); renderTop(); }
  (win ? sfx.win : tie ? sfx.pop : sfx.lose)();
  $('#acts').innerHTML = `<div class="bt-end"><h2 class="${win ? 'win' : tie ? '' : 'lose'}">${win ? 'Victoire !' : tie ? 'Égalité' : 'Défaite…'}</h2>
    <p>${win ? `Tu gagnes <i class="coin"></i>${prize}` : tie ? 'Les deux équipes sont K.O.' : 'Retente ta chance avec une autre équipe.'}</p>
    <div class="sum-actions"><button class="btn" id="rematch">Revanche</button><button class="btn ghost" id="leave">Quitter</button></div></div>`;
  if (win) burst($('#acts'), '#ffd76a', 60);
  $('#acts').onclick = e => {
    if (e.target.id === 'leave') quitGame();
    if (e.target.id === 'rematch') battleTeam();
  };
}

/* ---------- Onglet Jouer ---------- */
const setAvatar = () => { $('#avatar').textContent = myName[0].toUpperCase(); $('#avatar').title = myName; };
$('#plName').value = myName;
setAvatar();
$('#plName').onchange = e => {
  myName = e.target.value.trim().slice(0, 16) || 'Dresseur';
  e.target.value = myName;
  try { localStorage.setItem('boosterdex-name', myName); } catch {}
  setAvatar();
};
$('#avatar').onclick = () => { show('play'); $('#plName').focus(); };
$('#play').onclick = e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const mode = b.closest('.mode').dataset.mode;
  G.online = b.dataset.act === 'host';
  G.oppName = G.online ? 'Ton ami' : "L'ordi";
  sfx.select();
  if (G.online) return hostRoom(mode);
  gameScreen('');
  mode === 'duel' ? duelSetup() : battleTeam();
};
$('#joinBtn').onclick = () => {
  const code = $('#joinCode').value.trim().toUpperCase();
  if (code.length !== 5) { sfx.nope(); return $('#joinCode').focus(); }
  G.online = true; G.oppName = 'Ton ami';
  sfx.select();
  joinRoom(code);
};
$('#joinCode').onkeydown = e => e.key === 'Enter' && $('#joinBtn').click();
