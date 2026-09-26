/* Shared scene helpers: the wiring workbench, camera moves, the living room.
 * Only functions here: nothing runs at load time, so build.mjs can load these files in Node
 * to read the narration without a browser. */
'use strict';

const STAGE_AR = 564 / 1280;
// Camera box [x, y, w, h] around a centre, with the stage aspect ratio.
function camBox(cx, cy, w) { const h = w * STAGE_AR; return [cx - w / 2, cy - h / 2, w, h]; }
const FULL = [0, 0, 1280, 564];

// Animate an SVG viewBox through keyframes [[t, box], ...].
function camera(svg, t, keys) {
  let box = keys[0][1];
  if (t > keys[0][0]) {
    box = keys[keys.length - 1][1];
    for (let i = 1; i < keys.length; i++) {
      if (t < keys[i][0]) {
        const [t0, b0] = keys[i - 1], [t1, b1] = keys[i];
        const p = V.ease(V.clamp((t - t0) / (t1 - t0)));
        box = b0.map((v, j) => V.lerp(v, b1[j], p));
        break;
      }
    }
  }
  svg.setAttribute('viewBox', box.map((v) => v.toFixed(1)).join(' '));
  return box;
}

// Wrap an SVG element so it can pop in around its centre.
function part(layer, el, cx, cy) {
  const w = V.s('g', {}, el);
  layer.appendChild(w);
  const api = { g: w, set(p) { V.spop(w, p, cx, cy); }, dim(o) { w.style.filter = o < 1 ? 'saturate(0.3)' : ''; } };
  api.set(0);
  return api;
}

// =============================================================================================
// The workbench: Arduino + breadboard + every part, grouped per assembly step.
//   upto = steps that are already finished (drawn completely).
// =============================================================================================
const BENCH_VIEWS = {
  1: camBox(470, 420, 620),
  2: camBox(430, 380, 640),
  3: camBox(720, 365, 880),
  4: camBox(540, 245, 680),
  5: camBox(800, 215, 960),
};

function bench(svg, { upto = 0 } = {}) {
  const uno = V.arduino(40, 180, 5.2);
  const bb = V.breadboard(470, 150, 13.2);
  svg.appendChild(uno.g);
  svg.appendChild(bb.g);
  const partsL = V.s('g'), modL = V.s('g'), wireL = V.s('g'), topL = V.s('g');
  svg.appendChild(partsL); svg.appendChild(modL); svg.appendChild(wireL); svg.appendChild(topL);
  const H = (c, r) => { const h = bb.hole(c, r); return [h.x, h.y]; };
  const P = (n) => { const p = uno.pin(n); return [p.x, p.y]; };
  const C = V.WIRE;
  const it = {};
  const addW = (name, pts, color, opts) => { const w = V.wire(pts, color, Object.assign({ w: 4.2 }, opts)); wireL.appendChild(w.g); it[name] = w; return w; };

  // ---- Step 1: power rails (bottom pair: - inner, + outer)
  addW('w5v', [P('5V'), [238, 492], [410, 508], [494, 452], H(2, '+b')], C.red);
  addW('wgnd', [P('GND'), [252, 478], [395, 490], [478, 430], H(1, '-b')], C.black);

  // ---- Step 2: LDR + 10k divider in column 5, to A0
  const hl = bb.hole(3, '+b'), hl2 = bb.hole(5, 'i');
  it.ldr = part(partsL, V.ldr(hl, hl2, { lift: 22 }).g, (hl.x + hl2.x) / 2, hl2.y - 22);
  const r1 = bb.hole(5, 'g'), r2 = bb.hole(9, '-b');
  it.r10k = part(partsL, V.resistor(r1, r2, ['brown', 'black', 'orange', 'gold']).g, (r1.x + r2.x) / 2, (r1.y + r2.y) / 2);
  addW('wA0', [H(5, 'f'), [522, 292], [452, 352], [336, 506], [308, 480], P('A0')], C.yellow);

  // ---- Step 3: PIR module
  const pir = V.pir(1000, 246, 1);
  it.pir = part(modL, pir.g, 1064, 294);
  it.pirApi = pir;
  const pv = pir.pin('VCC'), po = pir.pin('OUT'), pg = pir.pin('GND');
  addW('wPV', [[pv.x, pv.y], [1040, 400], [960, 428], [872, 422], H(28, '+b')], C.red);
  addW('wPG', [[pg.x, pg.y], [1088, 418], [990, 446], [893, 408], H(30, '-b')], C.black);
  addW('wPO', [[po.x, po.y], [1066, 470], [900, 526], [520, 540], [340, 520], P('A1')], C.orange);

  // ---- Step 4: buttons across the gap (green cols 11/13, red cols 17/19)
  const bt = (c1, c2, cap) => V.button(bb.hole(c1, 'e'), bb.hole(c2, 'e'), bb.hole(c1, 'f'), bb.hole(c2, 'f'), cap);
  const bG = bt(11, 13, '#2e9e4f'), bR = bt(17, 19, '#e53935');
  it.btnG = part(partsL, bG.g, bG.cx, bG.cy); it.btnGApi = bG;
  it.btnR = part(partsL, bR.g, bR.cx, bR.cy); it.btnRApi = bR;
  addW('wD2', [H(11, 'a'), [618, 150], [480, 120], [362, 138], P('D2')], C.green);
  addW('wGG', [H(13, 'j'), [660, 366], H(14, '-b')], C.black);
  addW('wD3', [H(17, 'a'), [698, 128], [520, 104], [346, 124], P('D3')], C.purple);
  addW('wGR', [H(19, 'j'), [739, 366], H(20, '-b')], C.black);

  // ---- Step 5: voice module, 1k resistor, speaker
  const vm = V.voice(930, 40, 1);
  it.voice = part(modL, vm.g, 995, 86);
  it.voiceApi = vm;
  const spk = V.speaker(1180, 108, 44);
  it.spk = part(modL, spk.g, 1180, 108);
  it.spkApi = spk;
  const vp = (n) => { const q = vm.pin(n); return [q.x, q.y]; };
  addW('wVV', [vp('VCC'), [904, 70], [926, 240], [934, 382], [882, 420], H(29, '+b')], C.red);
  addW('wVG', [vp('GND'), [898, 88], [910, 250], [914, 356], [852, 402], H(27, '-b')], C.black);
  addW('wTX', [vp('TX'), [862, 92], [650, 44], [404, 58], [374, 150], P('D0')], C.blue);
  addW('wRX', [vp('RX'), [880, 118], [822, 150], H(24, 'a')], C.teal);
  const k1 = bb.hole(24, 'c'), k2 = bb.hole(28, 'c');
  it.r1k = part(partsL, V.resistor(k1, k2, ['brown', 'black', 'red', 'gold']).g, (k1.x + k2.x) / 2, k1.y);
  addW('wD1', [H(28, 'a'), [846, 128], [640, 72], [424, 92], [362, 142], P('D1')], C.pink);
  addW('wSPp', [vp('SP+'), [1092, 104], [1122, 192], [1158, 180], [spk.tabPlus.x, spk.tabPlus.y]], C.red, { plugs: [true, false] });
  addW('wSPm', [vp('SP−'), [1084, 140], [1146, 212], [1196, 190], [spk.tabMinus.x, spk.tabMinus.y]], C.black, { plugs: [true, false] });

  const groups = {
    1: ['w5v', 'wgnd'],
    2: ['ldr', 'r10k', 'wA0'],
    3: ['pir', 'wPV', 'wPG', 'wPO'],
    4: ['btnG', 'btnR', 'wD2', 'wGG', 'wD3', 'wGR'],
    5: ['voice', 'spk', 'wVV', 'wVG', 'wTX', 'wRX', 'r1k', 'wD1', 'wSPp', 'wSPm'],
  };
  for (let s = 1; s <= 5; s++) for (const n of groups[s]) it[n].set(s <= upto ? 1 : 0);

  const api = {
    uno, bb, it, groups, top: topL, H, P,
    set(name, p) { it[name].set(p); },
    // dim everything except the given step groups (recap)
    focus(steps, o = 0.18) {
      for (let s = 1; s <= 5; s++) {
        const on = !steps || steps.includes(s);
        for (const n of groups[s]) { const g = it[n].g; g.style.opacity = on ? 1 : o; }
      }
    },
    ring(x, y, color, r) { const rg = V.ring(x, y, color, r); topL.appendChild(rg.g); return rg; },
    tag(x, y, text, opts) { const tg = V.tag(x, y, text, opts); topL.appendChild(tg); return tg; },
  };
  return api;
}

// Helper to run a list of [startTime, duration, fn(p)] animations.
function run(t, list) { for (const [t0, d, fn] of list) fn(V.clamp((t - t0) / d)); }

// =============================================================================================
// Living room for the "day with Robin" scenes.
// =============================================================================================
function room(svg, { dark = false } = {}) {
  const g = V.s('g');
  svg.appendChild(g);
  const wall = V.s('rect', { x: 0, y: 0, width: 1280, height: 420, fill: dark ? '#1c2733' : '#f3e9da' });
  const floor = V.s('rect', { x: 0, y: 420, width: 1280, height: 144, fill: dark ? '#141c25' : '#d9c3a5' });
  g.appendChild(wall); g.appendChild(floor);
  // window
  const win = V.s('g');
  win.appendChild(V.s('rect', { x: 120, y: 70, width: 200, height: 170, rx: 6, fill: dark ? '#0b1320' : '#bfe3f5', stroke: '#8d7a63', 'stroke-width': 8 }));
  win.appendChild(V.s('line', { x1: 220, y1: 70, x2: 220, y2: 240, stroke: '#8d7a63', 'stroke-width': 6 }));
  win.appendChild(V.s('line', { x1: 120, y1: 155, x2: 320, y2: 155, stroke: '#8d7a63', 'stroke-width': 6 }));
  const sun = V.s('circle', { cx: 280, cy: 110, r: 18, fill: '#ffd54f' });
  const moon = V.s('circle', { cx: 280, cy: 110, r: 14, fill: '#f5f3ce' });
  win.appendChild(sun); win.appendChild(moon);
  g.appendChild(win);
  // door
  g.appendChild(V.s('rect', { x: 1030, y: 150, width: 150, height: 270, rx: 4, fill: dark ? '#2a2016' : '#a57b52', stroke: '#6b4c2e', 'stroke-width': 4 }));
  g.appendChild(V.s('circle', { cx: 1160, cy: 290, r: 6, fill: '#e0b75a' }));
  // lamp
  const lampLight = V.s('polygon', { points: '760,120 700,420 900,420 840,120', fill: '#fff3b0', opacity: 0 });
  g.appendChild(lampLight);
  g.appendChild(V.s('line', { x1: 800, y1: 0, x2: 800, y2: 90, stroke: '#555', 'stroke-width': 3 }));
  g.appendChild(V.s('path', { d: 'M770,120 L785,90 L815,90 L830,120 Z', fill: '#e8b04a' }));
  // table + robot
  g.appendChild(V.s('rect', { x: 420, y: 330, width: 300, height: 18, rx: 4, fill: '#8d6e4f' }));
  g.appendChild(V.s('rect', { x: 440, y: 348, width: 14, height: 110, fill: '#7a5d41' }));
  g.appendChild(V.s('rect', { x: 686, y: 348, width: 14, height: 110, fill: '#7a5d41' }));
  const robot = V.robot(560, 268, 0.62, { cable: false });
  g.appendChild(robot.g);
  // person
  const person = V.s('g');
  person.appendChild(V.person(0, 0, 2.1, { shirt: '#7e57c2' }));
  g.appendChild(person);
  const dim = V.s('rect', { x: 0, y: 0, width: 1280, height: 564, fill: '#000', opacity: 0 });
  g.appendChild(dim);
  return {
    g, robot, person, lampLight, sun, moon,
    // x position of the person (null = outside the room)
    walk(x, y = 280) { if (x === null) { V.fade(person, 0); return; } V.fade(person, 1); person.setAttribute('transform', `translate(${x.toFixed(1)} ${y})`); },
    night(on) { V.fade(sun, on ? 0 : 1); V.fade(moon, on ? 1 : 0); },
    darken(o) { dim.setAttribute('opacity', o); },
  };
}

// Big digital clock (HTML).
function clock(root, { x, y, dark = false }) {
  const el = V.box({ left: x + 'px', top: y + 'px', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '44px', color: dark ? '#e6edf3' : '#1d2b3a',
    background: dark ? '#243242' : '#ffffff', borderRadius: '14px', padding: '6px 18px', boxShadow: '0 6px 16px rgba(0,0,0,0.15)' });
  root.appendChild(el);
  return { el, set(txt) { if (el.textContent !== txt) el.textContent = txt; } };
}
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

// Robin's face while a clip plays: talk while speaking, then ask if it was a question.
function faceFor(t, t0, t1, { ask = false, after = 'happy' } = {}) {
  if (t < t0) return null;
  if (t < t1) return 'talk';
  return ask ? 'ask' : after;
}
