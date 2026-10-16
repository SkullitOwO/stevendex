// Bruitages synthétisés avec Web Audio : aucun fichier son à charger.
const sfx = (() => {
  let ctx, muted = false;
  try { muted = localStorage.getItem('boosterdex-mute') === '1'; } catch {}
  const ac = () => {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function tone(f, t0, dur, { type = 'sine', vol = .15, to = null } = {}) {
    const c = ac(), t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + .05);
  }
  function noise(t0, dur, { vol = .2, f = 2000, to = null, q = 1, type = 'bandpass' } = {}) {
    const c = ac(), t = c.currentTime + t0, len = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl).connect(g).connect(c.destination);
    s.start(t);
  }
  const play = fn => (...a) => { if (!muted) try { fn(...a); } catch {} };
  const NOTES = { C: [523], R: [659, 880], E: [659, 880, 1175] };
  return {
    get muted() { return muted; },
    toggle() { muted = !muted; try { localStorage.setItem('boosterdex-mute', muted ? '1' : '0'); } catch {} return muted; },
    select: play(() => { noise(0, .16, { vol: .1, f: 700, to: 3200 }); tone(560, 0, .07, { vol: .05, type: 'triangle' }); }),
    cut: play(() => noise(0, .035, { vol: .09, f: 4200, q: 5 })),
    tear: play(() => { noise(0, .38, { vol: .35, f: 1200, to: 6500, q: .7 }); noise(.04, .28, { vol: .18, f: 300, to: 900 }); }),
    whoosh: play(() => noise(0, .3, { vol: .12, f: 400, to: 2600, q: .8 })),
    flip: play(() => { noise(0, .07, { vol: .18, f: 2600, q: 1.5 }); tone(320, 0, .09, { vol: .06, to: 640, type: 'triangle' }); }),
    reveal: play(r => (NOTES[r] || NOTES.C).forEach((f, i) => tone(f, i * .07, .28, { vol: .1, type: 'triangle' }))),
    charge: play(() => { tone(180, 0, 1.3, { vol: .07, to: 950, type: 'sawtooth' }); noise(0, 1.3, { vol: .05, f: 500, to: 5000 }); }),
    epic: play(() => {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .08, .7, { vol: .12, type: 'triangle' }));
      tone(131, 0, 1, { vol: .22 });
      noise(0, .7, { vol: .12, f: 6000, to: 9000, q: .5, type: 'highpass' });
    }),
    pop: play(() => tone(620, 0, .09, { vol: .07, to: 1150 })),
    coin: play(() => { tone(988, 0, .07, { vol: .06, type: 'square' }); tone(1319, .06, .28, { vol: .06, type: 'square' }); }),
    page: play(() => noise(0, .38, { vol: .12, f: 1600, to: 600, q: .6 })),
    nope: play(() => tone(170, 0, .2, { vol: .1, type: 'square', to: 110 })),
    hit: play(spe => { noise(0, .18, { vol: spe ? .4 : .28, f: 900, to: 200, q: .8 }); tone(spe ? 90 : 140, 0, .2, { vol: .2, to: 50 }); }),
    win: play(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, i === 3 ? .6 : .18, { vol: .12, type: 'triangle' }))),
    lose: play(() => [392, 330, 262].forEach((f, i) => tone(f, i * .18, .3, { vol: .1, type: 'triangle' }))),
  };
})();
