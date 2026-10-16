// Décors dessinés en SVG, un par type ; la graine (n° Pokédex) varie le relief d'une carte à l'autre.
const SW = 63, SH = 88;
const f1 = n => +n.toFixed(1);
function rnd(seed) {
  let s = seed * 2654435761 % 4294967296;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

function ridge(r, { y, amp, step, color, op = 1, smooth = false, flat = false }) {
  let d = `M-2 ${SH} L-2 ${y}`, py = y;
  for (let x = -2; x <= SW + step; x += step) {
    const yy = f1(y - r() * amp);
    if (smooth) d += ` Q${f1(x - step / 2)} ${f1((py + yy) / 2 - amp * .4)} ${f1(x)} ${yy}`;
    else if (flat) d += ` L${f1(x + step * .2)} ${yy} L${f1(x + step * .7)} ${yy}`;
    else d += ` L${f1(x)} ${yy}`;
    py = yy;
  }
  return `<path d="${d} L${SW + step + 2} ${SH}Z" fill="${color}" opacity="${op}"/>`;
}
function dots(r, n, { colors, r0, r1, y0 = 0, y1 = SH, op = 1, ring = false }) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const c = colors[r() * colors.length | 0];
    s += `<circle cx="${f1(r() * SW)}" cy="${f1(y0 + r() * (y1 - y0))}" r="${f1(r0 + r() * (r1 - r0))}" ${ring ? `fill="none" stroke="${c}" stroke-width=".25"` : `fill="${c}"`} opacity="${f1(op * (.4 + r() * .6))}"/>`;
  }
  return s;
}
const orb = (x, y, rad, c) =>
  `<circle cx="${x}" cy="${y}" r="${rad * 2.8}" fill="${c}" opacity=".1"/><circle cx="${x}" cy="${y}" r="${rad * 1.7}" fill="${c}" opacity=".22"/><circle cx="${x}" cy="${y}" r="${rad}" fill="${c}"/>`;
const cloud = (x, y, s, c, op = 1) =>
  `<g fill="${c}" opacity="${op}"><ellipse cx="${x}" cy="${y}" rx="${7 * s}" ry="${2.6 * s}"/><circle cx="${f1(x - 2.5 * s)}" cy="${f1(y - 1.5 * s)}" r="${2.6 * s}"/><circle cx="${f1(x + 1.5 * s)}" cy="${f1(y - 2.4 * s)}" r="${3.3 * s}"/></g>`;
function pines(r, y, n, h, c) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = f1(-3 + r() * (SW + 6)), hh = f1(h * (.6 + r() * .6)), w = f1(hh * .28);
    d += `M${f1(x - w)} ${y}L${x} ${f1(y - hh)}L${f1(x + w)} ${y}Z`;
  }
  return `<path d="${d}" fill="${c}"/><rect x="0" y="${y}" width="${SW}" height="${SH - y}" fill="${c}"/>`;
}
function bolt(r, x) {
  let pts = `${f1(x)},0`, y = 0;
  while (y < 55) { y += 6 + r() * 8; x += (r() - .5) * 12; pts += ` ${f1(x)},${f1(y)}`; }
  return `<polyline points="${pts}" fill="none" stroke="#fff7b0" stroke-width="3" opacity=".25"/><polyline points="${pts}" fill="none" stroke="#fffbe0" stroke-width=".8"/>`;
}
const rays = (x, y, c, op) => [-50, -25, 0, 25, 50].map(a => {
  const t = (a + 90) * Math.PI / 180, u = (a + 98) * Math.PI / 180;
  return `<path d="M${x} ${y}L${f1(x + Math.cos(t) * 120)} ${f1(y + Math.sin(t) * 120)}L${f1(x + Math.cos(u) * 120)} ${f1(y + Math.sin(u) * 120)}Z" fill="${c}" opacity="${op}"/>`;
}).join('');
function aurora(r, c) {
  let d = `M-5 ${f1(18 + r() * 8)}`;
  for (let x = 5; x <= 75; x += 10) d += ` Q${x - 5} ${f1(10 + r() * 20)} ${x} ${f1(16 + r() * 12)}`;
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="9" opacity=".13"/><path d="${d}" fill="none" stroke="${c}" stroke-width="3" opacity=".3"/>`;
}
const deadTree = (x, y, c) =>
  `<path d="M${x} ${y}L${x + 1} ${y - 22}M${x + .6} ${y - 12}L${x - 6} ${y - 19}M${x + .8} ${y - 16}L${x + 7} ${y - 23}M${x - 3} ${y - 15.5}L${x - 4} ${y - 21}M${x + 4} ${y - 19}L${x + 8} ${y - 18}" stroke="${c}" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
const grave = (x, y, c) => `<path d="M${x} ${y}v-5a2.5 2.5 0 0 1 5 0v5Z" fill="${c}"/>`;
const birds = (r, n, c) => Array.from({ length: n }, () => {
  const x = f1(r() * 55), y = f1(8 + r() * 25);
  return `<path d="M${x} ${y}q1.2 -1.2 2.4 0q1.2 -1.2 2.4 0" stroke="${c}" stroke-width=".4" fill="none"/>`;
}).join('');
const cloudBank = (r, y, c, op = 1) =>
  Array.from({ length: 9 }, (_, i) => `<circle cx="${f1(i * 8 - 2 + r() * 3)}" cy="${f1(y + r() * 4)}" r="${f1(6 + r() * 4)}" fill="${c}" opacity="${op}"/>`).join('') +
  `<rect x="0" y="${y + 3}" width="${SW}" height="${SH}" fill="${c}" opacity="${op}"/>`;

const SCENES = {
  normal: r => ({
    sky: ['#4fb0ff', '#a4dbff', '#eef9ff'],
    back: orb(49, 15, 4.5, '#fff6c8') + cloud(13, 17, 1.1, '#fff', .95) + cloud(46, 31, .7, '#fff', .75) +
      ridge(r, { y: 58, amp: 6, step: 14, color: '#b2df86', smooth: true }) + ridge(r, { y: 66, amp: 5, step: 11, color: '#86c45a', smooth: true }),
    front: ridge(r, { y: 80, amp: 3, step: 9, color: '#5d9d37', smooth: true }) + dots(r, 22, { colors: ['#fff', '#ffe066', '#ff9ec4'], r0: .35, r1: .75, y0: 79, y1: 88 }),
  }),
  mix: r => ({
    sky: ['#6aa8ff', '#ffb3d9', '#ffe58a'],
    back: rays(31, -5, '#fff', .12) + orb(31, 52, 9, '#fff4c4') + cloud(12, 20, 1.2, '#fff', .9) + cloud(52, 28, .9, '#fff', .8) +
      ridge(r, { y: 60, amp: 6, step: 13, color: '#9ed8a0', smooth: true }) + ridge(r, { y: 68, amp: 5, step: 10, color: '#6fbf7a', smooth: true }),
    front: ridge(r, { y: 81, amp: 3, step: 9, color: '#3f9a5c', smooth: true }) + dots(r, 30, { colors: ['#fff', '#fff3a0', '#ffd1ec'], r0: .2, r1: .6, y0: 0, y1: 60 }),
  }),
  feu: r => {
    const vx = 10 + r() * 30;
    return {
      sky: ['#1c0612', '#8f1f1a', '#ff8a3d'],
      back: orb(f1(48 - vx / 3), 30, 7, '#ffd27a') + ridge(r, { y: 54, amp: 14, step: 8, color: '#6b1a14', op: .85 }) +
        `<path d="M${f1(vx - 16)} 68L${f1(vx - 2)} 34L${f1(vx + 4)} 34L${f1(vx + 20)} 68Z" fill="#451010"/><path d="M${f1(vx + 1)} 35q-2 8 1 14t-2 14" stroke="#ff6a1f" stroke-width="1" fill="none"/>` +
        orb(f1(vx + 1), 33, 2.4, '#ff9a3d') + ridge(r, { y: 68, amp: 8, step: 7, color: '#2f0a0b' }),
      front: ridge(r, { y: 81, amp: 4, step: 6, color: '#160506' }) + dots(r, 30, { colors: ['#ffb347', '#ff6a1f', '#ffe08a'], r0: .25, r1: .8, y1: 86 }),
    };
  },
  eau: r => ({
    sky: ['#a6e4ff', '#4fb2ec', '#1d6fc0'],
    back: rays(14, -4, '#fff', .1) + orb(15, 15, 5, '#fffbe0') + cloud(46, 16, .9, '#fff', .85) +
      ridge(r, { y: 51, amp: 1.5, step: 5, color: '#3a92dd', smooth: true }) + ridge(r, { y: 60, amp: 2, step: 6, color: '#2373c4', smooth: true }) +
      ridge(r, { y: 69, amp: 2.5, step: 7, color: '#1a5eae', smooth: true }),
    front: ridge(r, { y: 77, amp: 3, step: 7, color: '#ffffff', op: .55, smooth: true }) + ridge(r, { y: 80, amp: 3, step: 7, color: '#0d4590', smooth: true }) +
      dots(r, 16, { colors: ['#fff'], r0: .4, r1: 1.2, y0: 40, y1: 86, ring: true }),
  }),
  plante: r => ({
    sky: ['#fff1b8', '#b9e48f', '#5aa65a'],
    back: rays(8, -6, '#fffbe0', .28) + ridge(r, { y: 52, amp: 8, step: 12, color: '#93d27b', smooth: true }) +
      pines(r, 62, 11, 15, '#4f9450') + pines(r, 70, 8, 20, '#2f6b37'),
    front: ridge(r, { y: 81, amp: 4, step: 8, color: '#1f4f27', smooth: true }) + dots(r, 20, { colors: ['#fff8a8', '#e6ff9a'], r0: .3, r1: .7, y0: 25, y1: 85 }),
  }),
  electrik: r => ({
    sky: ['#141033', '#30286b', '#6b56b8'],
    back: bolt(r, 8 + r() * 14) + bolt(r, 40 + r() * 15) + cloud(14, 10, 1.6, '#29225a') + cloud(50, 8, 1.8, '#231d4e') + cloud(32, 14, 1.2, '#352c6e') +
      ridge(r, { y: 64, amp: 12, step: 7, color: '#1d1946' }),
    front: ridge(r, { y: 81, amp: 3, step: 6, color: '#0e0b24' }) + dots(r, 26, { colors: ['#fff38a', '#ffe14d'], r0: .2, r1: .6, y1: 86 }),
  }),
  glace: r => ({
    sky: ['#0a1838', '#2a5a8c', '#bfe8ff'],
    back: dots(r, 30, { colors: ['#fff'], r0: .1, r1: .35, y1: 40 }) + aurora(r, '#6effc8') + aurora(r, '#6ed5ff') +
      ridge(r, { y: 58, amp: 24, step: 8, color: '#e9f6ff' }) + ridge(r, { y: 64, amp: 14, step: 8, color: '#a8cde8' }),
    front: ridge(r, { y: 80, amp: 3, step: 9, color: '#ffffff', smooth: true }) + dots(r, 35, { colors: ['#fff'], r0: .2, r1: .6, y1: 86 }),
  }),
  psy: r => ({
    sky: ['#0b0524', '#3b1670', '#b2479a'],
    back: `<circle cx="${f1(15 + r() * 30)}" cy="30" r="22" fill="#ff6ec7" opacity=".12"/><circle cx="${f1(25 + r() * 30)}" cy="45" r="18" fill="#6e7bff" opacity=".14"/>` +
      dots(r, 45, { colors: ['#fff', '#ffd6f5'], r0: .1, r1: .45, y1: 70 }) + orb(48, 18, 5, '#ffd1f0') +
      `<ellipse cx="48" cy="18" rx="9" ry="2" fill="none" stroke="#fff" stroke-width=".5" opacity=".7" transform="rotate(-18 48 18)"/>` +
      ridge(r, { y: 74, amp: 5, step: 10, color: '#2b0f55', smooth: true }),
    front: ridge(r, { y: 82, amp: 3, step: 9, color: '#14072e', smooth: true }) + dots(r, 12, { colors: ['#ffb8ec'], r0: .3, r1: .8, y0: 40, y1: 86 }),
  }),
  fee: r => ({
    sky: ['#4a2160', '#d066a8', '#ffd6ea'],
    back: dots(r, 35, { colors: ['#fff', '#fff3b0'], r0: .15, r1: .5, y1: 60 }) + orb(46, 16, 5, '#fff3fb') +
      ridge(r, { y: 64, amp: 6, step: 12, color: '#f2a2cc', smooth: true }) + ridge(r, { y: 71, amp: 5, step: 10, color: '#e083b6', smooth: true }),
    front: ridge(r, { y: 81, amp: 3, step: 9, color: '#c25d97', smooth: true }) + dots(r, 20, { colors: ['#fff', '#ffe3f3'], r0: .3, r1: .7, y0: 30, y1: 86 }),
  }),
  spectre: r => ({
    sky: ['#07040f', '#24123a', '#57306d'],
    back: orb(46, 18, 8, '#efe8ff') + `<circle cx="43" cy="16" r="1.6" fill="#cfc4ea"/><circle cx="49" cy="21" r="1.1" fill="#cfc4ea"/>` +
      `<ellipse cx="20" cy="60" rx="30" ry="4" fill="#fff" opacity=".07"/>` + ridge(r, { y: 70, amp: 5, step: 10, color: '#1a0f28', smooth: true }) +
      deadTree(f1(6 + r() * 8), 70, '#120a1d') + grave(f1(40 + r() * 6), 71, '#1d1230') + grave(f1(50 + r() * 6), 72, '#1d1230'),
    front: `<ellipse cx="40" cy="80" rx="35" ry="4" fill="#d7c4ff" opacity=".1"/>` + ridge(r, { y: 83, amp: 2, step: 9, color: '#08050e', smooth: true }) +
      dots(r, 14, { colors: ['#b98cff', '#e0ccff'], r0: .4, r1: 1, y0: 30, y1: 84 }),
  }),
  poison: r => ({
    sky: ['#0c0a14', '#2b1840', '#4f2a5e'],
    back: orb(16, 18, 6, '#e8ffd8') + `<ellipse cx="35" cy="62" rx="34" ry="5" fill="#a6f06a" opacity=".1"/>` +
      ridge(r, { y: 70, amp: 6, step: 9, color: '#1d1229', smooth: true }) + deadTree(f1(44 + r() * 8), 70, '#140c1e'),
    front: `<ellipse cx="25" cy="81" rx="40" ry="4" fill="#a6f06a" opacity=".13"/>` + ridge(r, { y: 83, amp: 2, step: 9, color: '#0a0710', smooth: true }) +
      dots(r, 18, { colors: ['#a6f06a', '#d6ff9a'], r0: .4, r1: 1.1, y0: 30, y1: 84, ring: true }),
  }),
  combat: r => ({
    sky: ['#ff9f5a', '#ffcb7d', '#ffe7b8'],
    back: orb(40, 46, 8, '#fff3c4') + ridge(r, { y: 54, amp: 18, step: 14, color: '#c0603a', flat: true }) +
      ridge(r, { y: 66, amp: 12, step: 12, color: '#8f3f26', flat: true }),
    front: ridge(r, { y: 81, amp: 3, step: 8, color: '#5a2418' }) + dots(r, 24, { colors: ['#ffd9a0', '#ffe9c4'], r0: .2, r1: .5, y0: 40, y1: 86 }),
  }),
  vol: r => ({
    sky: ['#2f78d4', '#86c2f2', '#ffe6c2'],
    back: orb(48, 52, 7, '#fff4d6') + cloud(14, 22, 1.3, '#fff', .9) + cloud(50, 14, 1, '#fff', .8) + cloud(30, 40, 1.6, '#fff', .7) + birds(r, 4, '#2a4f86') +
      cloudBank(r, 66, '#ffffff', .55),
    front: cloudBank(r, 80, '#ffffff', .95),
  }),
  dragon: r => ({
    sky: ['#160b33', '#5a2a8a', '#ff8a5c'],
    back: orb(31, 58, 9, '#ffd08a') + cloud(14, 20, 1.3, '#ffb38a', .35) + cloud(50, 30, 1.1, '#ff9a7a', .35) +
      ridge(r, { y: 62, amp: 26, step: 7, color: '#2a1640' }) + ridge(r, { y: 70, amp: 12, step: 8, color: '#1c0e2e' }),
    front: cloudBank(r, 81, '#3a1f5a', .9),
  }),
};
const SCENE_OF = { insecte: 'plante', sol: 'combat', roche: 'combat', acier: 'combat' };

function scene(type, seed) {
  const s = SCENES[SCENE_OF[type] || type](rnd(seed));
  const svg = (inner, cls) => `<svg class="sc ${cls}" viewBox="0 0 ${SW} ${SH}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${inner}</svg>`;
  return { bg: `linear-gradient(${s.sky.join(',')})`, back: svg(s.back, 'sc-back'), front: svg(s.front, 'sc-front') };
}
