// Moteur de particules sur canvas, textures du « Particle Pack » de Kenney (CC0, kenney.nl).
// Les textures sont blanches : on les teinte à la volée, puis on les dessine en mélange additif.
const FX = (() => {
  const NAMES = ['spark1', 'spark2', 'spark5', 'spark6', 'magic1', 'magic3', 'magic5', 'light3', 'star6', 'star8', 'flame1', 'flame3',
    'muzzle2', 'twirl1', 'twirl2', 'smoke1', 'circle3', 'circle5', 'trace1', 'scorch2'];
  const tex = {}, tinted = new Map();
  NAMES.forEach(n => { const i = new Image(); i.src = `fx/${n}.png`; tex[n] = i; });
  const cv = document.createElement('canvas'), cx = cv.getContext('2d');
  cv.className = 'fx-canvas';
  document.body.appendChild(cv);
  let parts = [], running = false, dpr = 1;
  const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
  fit();
  addEventListener('resize', fit);

  function tint(name, color) {
    const k = name + color;
    if (tinted.has(k)) return tinted.get(k);
    const img = tex[name];
    if (!img.complete || !img.naturalWidth) return null;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tinted.set(k, c);
    return c;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickOf = a => a[Math.random() * a.length | 0];
  function add(p) {
    parts.push(Object.assign({ age: 0, vx: 0, vy: 0, ay: 0, rot: 0, vr: 0, s0: 40, s1: 40, a: 1, drag: 1, flicker: false, align: false, white: false }, p));
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  let last = 0;
  function loop(t) {
    const dt = Math.min(.05, (t - last) / 1000);
    last = t;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.globalCompositeOperation = 'lighter';
    parts = parts.filter(p => (p.age += dt) < p.life);
    for (const p of parts) {
      p.vy += p.ay * dt;
      p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const k = p.age / p.life, size = p.s0 + (p.s1 - p.s0) * k;
      let alpha = p.a * Math.min(1, k * 6) * (1 - k) ** 1.2;
      if (p.flicker) alpha *= Math.random() < .35 ? .15 : 1;
      const img = tint(p.tex, p.white ? '#ffffff' : p.color);
      if (!img || alpha <= 0) continue;
      cx.globalAlpha = Math.min(1, alpha);
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.align ? Math.atan2(p.vy, p.vx) + Math.PI / 2 : p.rot);
      const h = p.stretch ? size * p.stretch : size;
      cx.drawImage(img, -size / 2, -h / 2, size, h);
      cx.restore();
    }
    cx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop); else { running = false; cx.clearRect(0, 0, cv.width, cv.height); }
  }

  // Élément propre à chaque type : texture, couleur, et façon de bouger
  const TYPE = {
    feu: { c: '#ff7a2a', t: ['flame1', 'flame3', 'muzzle2'], rise: -260 }, eau: { c: '#4fb2ff', t: ['circle5', 'light3'], rise: -80 },
    plante: { c: '#5fe35f', t: ['twirl1', 'twirl2', 'star6'], rise: -60 }, insecte: { c: '#b6e04a', t: ['twirl1', 'star6'], rise: -60 },
    electrik: { c: '#ffe14d', t: ['spark1', 'spark2'], rise: 0 }, glace: { c: '#9fe8ff', t: ['star8', 'magic3'], rise: 40 },
    psy: { c: '#ff6ec7', t: ['twirl1', 'twirl2', 'magic5'], rise: -40 }, fee: { c: '#ffb3e0', t: ['star8', 'star6', 'magic5'], rise: -40 },
    spectre: { c: '#b98cff', t: ['smoke1', 'twirl2'], rise: -120 }, poison: { c: '#c86bff', t: ['smoke1', 'circle5'], rise: -100 },
    combat: { c: '#ff6b4a', t: ['scorch2', 'muzzle2'], rise: 0 }, sol: { c: '#e0b060', t: ['scorch2', 'smoke1'], rise: 60 },
    roche: { c: '#d9b56a', t: ['scorch2'], rise: 80 }, vol: { c: '#d6ecff', t: ['trace1', 'twirl1'], rise: -40 },
    dragon: { c: '#8a6bff', t: ['flame1', 'twirl1', 'muzzle2'], rise: -160 }, acier: { c: '#d7dee8', t: ['star8', 'spark1'], rise: 0 },
    normal: { c: '#ffffff', t: ['star6', 'magic5'], rise: -40 },
  };
  const centre = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  const edgePoint = b => {
    const side = Math.random() * 4 | 0, u = Math.random() - .5;
    return side < 2 ? { x: b.x + u * b.w, y: b.y + (side ? 1 : -1) * b.h / 2 } : { x: b.x + (side === 2 ? 1 : -1) * b.w / 2, y: b.y + u * b.h };
  };

  // Montée en tension : éclairs qui crépitent sur les bords, élément du type qui s'échappe, cercle magique dessous
  function charge(el, type, color, power = 1) {
    const b = centre(el), T = TYPE[type] || TYPE.normal;
    for (let i = 0; i < 5 * power; i++) {
      const e = edgePoint(b), a = Math.atan2(e.y - b.y, e.x - b.x);
      add({ tex: pickOf(['spark5', 'spark6']), color: Math.random() < .5 ? color : T.c, x: e.x + Math.cos(a) * 30, y: e.y + Math.sin(a) * 30,
        rot: a + Math.PI / 2, s0: rnd(70, 130) * power ** .5, s1: rnd(90, 160) * power ** .5, life: rnd(.12, .28), flicker: true, stretch: 1.4 });
      add({ tex: pickOf(['spark1', 'spark2']), color: T.c, x: e.x, y: e.y, rot: rnd(0, 6.3), s0: rnd(60, 110), s1: rnd(80, 130), life: rnd(.15, .3), flicker: true });
    }
    for (let i = 0; i < 9 * power; i++) {
      const e = edgePoint(b), a = Math.atan2(e.y - b.y, e.x - b.x), sp = rnd(80, 260) * power ** .5;
      add({ tex: pickOf(T.t), color: T.c, x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: T.rise, drag: .97,
        rot: rnd(0, 6.3), vr: rnd(-3, 3), s0: rnd(26, 50), s1: rnd(60, 110), life: rnd(.6, 1.1), a: .9 });
    }
    add({ tex: 'magic1', color, x: b.x, y: b.y + b.h * .05, rot: rnd(0, 6.3), vr: 1.6, s0: b.w * 1.2 * power ** .3, s1: b.w * 1.6 * power ** .3, life: .5, a: .7 });
    add({ tex: 'magic5', color: T.c, x: b.x, y: b.y, s0: b.w * .9, s1: b.w * 1.4, life: .4, a: .35 * power });
  }

  // Révélation : onde de choc, gros halo, étoiles, traînées et éclat du type
  function explode(el, type, color, power = 1) {
    const b = centre(el), T = TYPE[type] || TYPE.normal, R = Math.max(b.w, b.h);
    add({ tex: 'circle3', color, x: b.x, y: b.y, s0: R * .3, s1: R * 3.2 * power ** .5, life: .7, a: 1 });
    add({ tex: 'circle3', color: T.c, x: b.x, y: b.y, s0: R * .2, s1: R * 2.2 * power ** .5, life: .55, a: .8 });
    add({ tex: 'light3', color, x: b.x, y: b.y, s0: R * .8, s1: R * 2.4, life: .8, a: .9 });
    add({ tex: 'magic5', white: true, x: b.x, y: b.y, s0: R * 1.2, s1: R * .4, life: .45, a: 1 });
    add({ tex: 'magic3', color, x: b.x, y: b.y, rot: rnd(0, 1), vr: 2, s0: R * .4, s1: R * 1.6, life: .7, a: .9 });
    for (let i = 0; i < 40 * power; i++) {
      const a = rnd(0, 6.3), sp = rnd(300, 900) * power ** .4;
      add({ tex: 'trace1', color: Math.random() < .5 ? color : T.c, x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: .93, align: true,
        s0: rnd(14, 26), s1: rnd(8, 14), stretch: 3.2, life: rnd(.4, .8) });
    }
    for (let i = 0; i < 26 * power; i++) {
      const a = rnd(0, 6.3), sp = rnd(120, 520);
      add({ tex: pickOf(['star8', 'star6']), color: Math.random() < .4 ? '#ffffff' : color, x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: .94, ay: 60,
        rot: rnd(0, 6.3), vr: rnd(-4, 4), s0: rnd(30, 60), s1: rnd(10, 24), life: rnd(.7, 1.4) });
    }
    for (let i = 0; i < 18 * power; i++) {
      const a = rnd(0, 6.3), sp = rnd(150, 480);
      add({ tex: pickOf(T.t), color: T.c, x: b.x + Math.cos(a) * b.w * .3, y: b.y + Math.sin(a) * b.h * .3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: T.rise, drag: .95,
        rot: rnd(0, 6.3), vr: rnd(-3, 3), s0: rnd(40, 70), s1: rnd(90, 150), life: rnd(.7, 1.2), a: .9 });
    }
    for (let i = 0; i < 8 * power; i++) {
      const e = edgePoint(b), a = Math.atan2(e.y - b.y, e.x - b.x);
      add({ tex: pickOf(['spark5', 'spark6']), color, x: e.x + Math.cos(a) * 60, y: e.y + Math.sin(a) * 60, rot: a + Math.PI / 2,
        s0: rnd(120, 200), s1: rnd(150, 240), life: rnd(.18, .35), flicker: true, stretch: 1.5 });
    }
  }
  return { charge, explode, clear: () => { parts = []; } };
})();
