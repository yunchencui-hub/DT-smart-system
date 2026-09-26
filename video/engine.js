/* Robin build-guide video: the drawing engine.
 *
 * Every picture is a pure function of the time t (seconds). The renderer (build.mjs) calls
 * window.__seek(t) for each frame and takes a screenshot, so every run gives the same video,
 * and the pictures stay in sync with the narration timings in timeline.js.
 *
 * Scenes live in scenes.js and are registered with defineScene({...}).
 */
'use strict';

const NS = 'http://www.w3.org/2000/svg';
const V = {};
const SCENE_DEFS = [];
function defineScene(def) { SCENE_DEFS.push(def); }

// =============================================================================================
// DOM helpers
// =============================================================================================
function setAttrs(el, a) {
  if (!a) return;
  for (const k in a) {
    const v = a[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
}
function addKids(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
  }
}
V.h = (tag, attrs, ...kids) => { const el = document.createElement(tag); setAttrs(el, attrs); addKids(el, kids); return el; };
V.s = (tag, attrs, ...kids) => { const el = document.createElementNS(NS, tag); setAttrs(el, attrs); addKids(el, kids); return el; };

// =============================================================================================
// Maths and easing
// =============================================================================================
V.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
V.lerp = (a, b, p) => a + (b - a) * p;
V.ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
V.out = (p) => 1 - Math.pow(1 - p, 3);
V.back = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
V.p = (t, t0, d = 0.5) => V.clamp((t - t0) / d);            // linear 0..1 progress
V.pe = (t, t0, d = 0.5) => V.ease(V.p(t, t0, d));            // eased progress
V.win = (t, t0, t1, f = 0.35) => Math.min(V.p(t, t0, f), 1 - V.p(t, t1 - f, f)); // fade in at t0, out at t1
V.pulse = (t, speed = 2.2) => 0.5 + 0.5 * Math.sin(t * Math.PI * speed);

// =============================================================================================
// Effects (all idempotent: they only set styles from the progress value)
// =============================================================================================
V.fade = (el, o) => {
  o = V.clamp(o);
  el.style.opacity = o.toFixed(3);
  el.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
};
V.rise = (el, p, dy = 18) => { V.fade(el, p); el.style.transform = `translateY(${((1 - V.out(V.clamp(p))) * dy).toFixed(1)}px)`; };
V.pop = (el, p) => {
  p = V.clamp(p);
  V.fade(el, Math.min(1, p * 2.5));
  el.style.transform = `scale(${(p <= 0 ? 0.6 : V.lerp(0.6, 1, V.back(p))).toFixed(3)})`;
};
// For SVG groups: pop around a known centre without touching the element's own transform attribute.
V.spop = (el, p, cx, cy) => {
  p = V.clamp(p);
  V.fade(el, Math.min(1, p * 2.5));
  const sc = p <= 0 ? 0.6 : V.lerp(0.6, 1, V.back(p));
  el.setAttribute('transform', `translate(${cx} ${cy}) scale(${sc.toFixed(3)}) translate(${-cx} ${-cy})`);
};
V.srise = (el, p, dy = 14) => {
  p = V.clamp(p);
  V.fade(el, p);
  el.setAttribute('transform', `translate(0 ${((1 - V.out(p)) * dy).toFixed(1)})`);
};

// =============================================================================================
// Text measuring (for labels that need a background box)
// =============================================================================================
const _measure = document.createElement('canvas').getContext('2d');
V.textW = (text, size = 14, weight = 700, family = 'Nunito') => {
  _measure.font = `${weight} ${size}px ${family}`;
  return _measure.measureText(text).width;
};

// =============================================================================================
// Paths
// =============================================================================================
// Smooth curve through points (Catmull-Rom converted to cubic Bezier).
V.smooth = (pts, tension = 0.5) => {
  if (pts.length === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2, c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2, c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};
// Progressive stroke drawing.
V.drawPath = (path, p) => {
  if (!path._len) path._len = path.getTotalLength() || 1;
  const L = path._len;
  path.style.strokeDasharray = `${L} ${L}`;
  path.style.strokeDashoffset = (L * (1 - V.clamp(p))).toFixed(1);
};

const DARKER = { '#e53935': '#8e1c1a', '#212121': '#000', '#1e63d6': '#0d3b85', '#f2b705': '#9a7400', '#2e9e4f': '#17602d',
  '#f57c00': '#9a4d00', '#8e44ad': '#5b2371', '#ffffff': '#9aa3ab', '#00a3a3': '#006666', '#795548': '#4a332b',
  '#9e9e9e': '#5f5f5f', '#ec407a': '#a0204d' };
V.WIRE = { red: '#e53935', black: '#212121', blue: '#1e63d6', yellow: '#f2b705', green: '#2e9e4f', orange: '#f57c00',
  purple: '#8e44ad', white: '#ffffff', teal: '#00a3a3', brown: '#795548', grey: '#9e9e9e', pink: '#ec407a' };

// A jumper wire through points. Returns {g, set(p)}: p = 0..1 draws it from the first point.
V.wire = (pts, color, { w = 5, plugs = [true, true] } = {}) => {
  const d = V.smooth(pts);
  const outline = V.s('path', { d, fill: 'none', stroke: DARKER[color] || '#333', 'stroke-width': w + 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const main = V.s('path', { d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const shine = V.s('path', { d, fill: 'none', stroke: '#fff', 'stroke-opacity': 0.35, 'stroke-width': w * 0.28, 'stroke-linecap': 'round', transform: `translate(-${w * 0.18} -${w * 0.18})` });
  const a = pts[0], b = pts[pts.length - 1];
  const plugA = plugs[0] ? V.s('rect', { x: a[0] - 4, y: a[1] - 4, width: 8, height: 8, rx: 1.5, fill: '#2b2b2b', stroke: '#000', 'stroke-width': 0.8 }) : null;
  const plugB = plugs[1] ? V.s('rect', { x: b[0] - 4, y: b[1] - 4, width: 8, height: 8, rx: 1.5, fill: '#2b2b2b', stroke: '#000', 'stroke-width': 0.8 }) : null;
  const g = V.s('g', { class: 'wire' }, outline, main, shine, plugA, plugB);
  const api = {
    g, a, b, path: main,
    set(p) {
      p = V.clamp(p);
      V.fade(g, p > 0 ? 1 : 0);
      [outline, main, shine].forEach((el) => V.drawPath(el, p));
      if (plugA) V.fade(plugA, p > 0 ? 1 : 0);
      if (plugB) V.fade(plugB, p >= 0.98 ? 1 : 0);
    },
    glow(on) { main.setAttribute('stroke-width', on ? w + 2 : w); },
  };
  api.set(0);
  return api;
};

// Pulsing ring to point at a hole or pin.
V.ring = (x, y, color = '#ff9800', r = 11) => {
  const c = V.s('circle', { cx: x, cy: y, r, fill: 'none', stroke: color, 'stroke-width': 3 });
  return {
    g: c,
    set(t, on) {
      if (!on) { V.fade(c, 0); return; }
      const k = V.pulse(t, 1.6);
      c.setAttribute('r', (r + k * 5).toFixed(1));
      V.fade(c, 0.95 - k * 0.5);
    },
  };
};

// Label bubble with optional leader line: V.tag(x, y, 'text', {dx, dy, color})
V.tag = (x, y, text, { dx = 0, dy = -34, color = '#1d2b3a', bg = '#ffffff', size = 15, weight = 800, line = true, anchor = 'middle', pad = 7 } = {}) => {
  const tw = V.textW(text, size, weight);
  const bx = x + dx, by = y + dy;
  const left = anchor === 'middle' ? bx - tw / 2 - pad : anchor === 'start' ? bx - pad : bx - tw - pad;
  const g = V.s('g', { class: 'tag' });
  if (line && (dx || dy)) g.appendChild(V.s('line', { x1: x, y1: y, x2: bx, y2: by, stroke: color, 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
  g.appendChild(V.s('rect', { x: left, y: by - size * 0.8 - pad * 0.6, width: tw + pad * 2, height: size * 1.25 + pad * 1.2, rx: 8, fill: bg, stroke: color, 'stroke-width': 2 }));
  g.appendChild(V.s('text', { x: left + pad + tw / 2, y: by + size * 0.28, 'text-anchor': 'middle', 'font-size': size, 'font-weight': weight, fill: color }, text));
  V.fade(g, 0);
  return g;
};

// =============================================================================================
// Hardware drawings
// =============================================================================================
// ---------- Arduino UNO R4 WiFi (top view, USB-C on the left). k = pixels per millimetre.
const UNO_TOP = { SCL: 18.8, SDA: 21.34, AREF: 23.88, GNDT: 26.42, D13: 28.96, D12: 31.5, D11: 34.04, D10: 36.58, D9: 39.12,
  D8: 41.66, D7: 45.72, D6: 48.26, D5: 50.8, D4: 53.34, D3: 55.88, D2: 58.42, D1: 60.96, D0: 63.5 };
const UNO_BOT = { NC: 27.94, IOREF: 30.48, RESET: 33.02, '3V3': 35.56, '5V': 38.1, GND: 40.64, GND2: 43.18, VIN: 45.72,
  A0: 50.8, A1: 53.34, A2: 55.88, A3: 58.42, A4: 60.96, A5: 63.5 };
const UNO_LABEL = { SCL: 'SCL', SDA: 'SDA', AREF: 'AREF', GNDT: 'GND', D13: '13', D12: '12', D11: '~11', D10: '~10', D9: '~9', D8: '8',
  D7: '7', D6: '~6', D5: '~5', D4: '4', D3: '~3', D2: '2', D1: 'TX 1', D0: 'RX 0', NC: '', IOREF: 'IOREF', RESET: 'RESET',
  '3V3': '3.3V', '5V': '5V', GND: 'GND', GND2: 'GND', VIN: 'VIN', A0: 'A0', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4', A5: 'A5' };

V.arduino = (x, y, k = 5.2) => {
  const W = 68.6 * k, H = 53.3 * k;
  const g = V.s('g', { transform: `translate(${x} ${y})` });
  g.appendChild(V.s('rect', { x: 3, y: 4, width: W, height: H, rx: 3 * k, fill: '#000', opacity: 0.12 }));
  g.appendChild(V.s('rect', { x: 0, y: 0, width: W, height: H, rx: 2.6 * k, fill: '#0f8a8f', stroke: '#0a5e62', 'stroke-width': 2 }));
  // mounting holes
  [[14, 2.5], [15.3, 50.7], [66.1, 7.6], [66.1, 35.5]].forEach(([mx, my]) =>
    g.appendChild(V.s('circle', { cx: mx * k, cy: my * k, r: 1.6 * k, fill: '#f4f1ea', stroke: '#c9c3b5', 'stroke-width': 1 })));
  // USB-C and barrel jack on the left edge
  g.appendChild(V.s('rect', { x: -2.2 * k, y: 8 * k, width: 8.5 * k, height: 5 * k, rx: 2 * k, fill: '#cfd6dc', stroke: '#8a949c', 'stroke-width': 1.2 }));
  g.appendChild(V.s('rect', { x: -1.2 * k, y: 9.6 * k, width: 5 * k, height: 1.8 * k, rx: 0.9 * k, fill: '#5d666e' }));
  g.appendChild(V.s('text', { x: 7.8 * k, y: 11.9 * k, 'font-size': 1.9 * k, fill: '#d9f2f2', 'font-weight': 800 }, 'USB-C'));
  g.appendChild(V.s('rect', { x: -2.5 * k, y: 37 * k, width: 13 * k, height: 9 * k, rx: 1 * k, fill: '#262626' }));
  // ESP32-S3 WiFi module + main chip
  g.appendChild(V.s('rect', { x: 9 * k, y: 17 * k, width: 15 * k, height: 12 * k, rx: 0.8 * k, fill: '#c7ccd1', stroke: '#9aa2a9', 'stroke-width': 1 }));
  g.appendChild(V.s('text', { x: 16.5 * k, y: 23.8 * k, 'font-size': 1.7 * k, 'text-anchor': 'middle', fill: '#4b545c', 'font-weight': 800 }, 'ESP32-S3'));
  g.appendChild(V.s('rect', { x: 11 * k, y: 32 * k, width: 7 * k, height: 7 * k, fill: '#1f1f1f' }));
  g.appendChild(V.s('text', { x: 14.5 * k, y: 36 * k, 'font-size': 1.3 * k, 'text-anchor': 'middle', fill: '#aaa' }, 'RA4M1'));
  // reset button, power LED
  g.appendChild(V.s('rect', { x: 3 * k, y: 2 * k, width: 4 * k, height: 4 * k, rx: 0.6 * k, fill: '#e0e0e0', stroke: '#9e9e9e' }));
  g.appendChild(V.s('circle', { cx: 5 * k, cy: 4 * k, r: 1.2 * k, fill: '#b0b0b0' }));
  const onLed = V.s('rect', { x: 26.2 * k, y: 30 * k, width: 2.2 * k, height: 1.3 * k, rx: 0.3 * k, fill: '#3b5b3b' });
  g.appendChild(onLed);
  g.appendChild(V.s('text', { x: 27.3 * k, y: 34 * k, 'font-size': 1.5 * k, fill: '#d9f2f2', 'font-weight': 800, 'text-anchor': 'middle' }, 'ON'));
  g.appendChild(V.s('text', { x: 12.5 * k, y: 45 * k, 'font-size': 2.3 * k, fill: '#e8fbfb', 'font-weight': 900 }, 'UNO R4 WiFi'));
  // headers
  const hdr = (x0, x1, yy) => g.appendChild(V.s('rect', { x: x0 * k, y: (yy - 1.6) * k, width: (x1 - x0) * k, height: 3.2 * k, rx: 0.4 * k, fill: '#1b1b1b' }));
  hdr(17.5, 42.95, 2.54); hdr(44.45, 64.8, 2.54); hdr(26.65, 47.0, 50.8); hdr(49.5, 64.8, 50.8);
  const pins = {};
  const pinDot = (name, mx, my, labelBelow) => {
    pins[name] = { x: x + mx * k, y: y + my * k };
    g.appendChild(V.s('rect', { x: (mx - 0.55) * k, y: (my - 0.55) * k, width: 1.1 * k, height: 1.1 * k, fill: '#6b6b6b' }));
    const lab = UNO_LABEL[name];
    if (!lab) return;
    const long = lab.length > 2;
    const ty = labelBelow ? my + 3.3 : my - 3.1;
    if (long) {
      g.appendChild(V.s('text', { x: mx * k, y: ty * k, 'font-size': 1.45 * k, fill: '#e8fbfb', 'font-weight': 700,
        'text-anchor': labelBelow ? 'end' : 'start', transform: `rotate(-90 ${mx * k} ${ty * k})`, dy: 0.5 * k }, lab));
    } else {
      g.appendChild(V.s('text', { x: mx * k, y: (labelBelow ? ty + 0.8 : ty) * k, 'font-size': 1.55 * k, 'text-anchor': 'middle', fill: '#e8fbfb', 'font-weight': 800 }, lab));
    }
  };
  for (const n in UNO_TOP) pinDot(n, UNO_TOP[n], 2.54, true);
  for (const n in UNO_BOT) pinDot(n, UNO_BOT[n], 50.8, false);
  // LED matrix 12 x 8 = the face
  const mx0 = 33 * k, my0 = 18.5 * k, pitch = 2.05 * k;
  g.appendChild(V.s('rect', { x: mx0 - 1.6 * k, y: my0 - 1.6 * k, width: 11 * pitch + 3.2 * k, height: 7 * pitch + 3.2 * k, rx: 1 * k, fill: '#0b6d71' }));
  const matrix = V.matrix(mx0, my0, pitch, pitch * 0.34);
  g.appendChild(matrix.g);
  const api = {
    g, pins, matrix, k, W, H, x, y,
    pin: (n) => pins[n],
    power(on) { onLed.setAttribute('fill', on ? '#5cff5c' : '#3b5b3b'); matrix.power(on); },
  };
  api.power(false);
  return api;
};

const OFF_LED = '#0b5f63';
// ---------- 12 x 8 LED matrix. set('happy') or set(gridArray). Uses FACES from faces.js.
V.matrix = (x0, y0, pitch, r) => {
  const g = V.s('g');
  const halos = [], dots = [];
  for (let row = 0; row < 8; row++) for (let col = 0; col < 12; col++) {
    const cx = x0 + col * pitch, cy = y0 + row * pitch;
    const halo = V.s('circle', { cx, cy, r: r * 2.2, fill: '#ff3b30', opacity: 0 });
    const dot = V.s('circle', { cx, cy, r, fill: OFF_LED });
    halos.push(halo); dots.push(dot); g.appendChild(halo); g.appendChild(dot);
  }
  let powered = true, last = null;
  const api = {
    g,
    power(on) { powered = on; last = null; if (!on) api.set(null); },
    set(face) {
      const grid = typeof face === 'string' ? FACES[face] : face;
      const key = powered ? (typeof face === 'string' ? face : JSON.stringify(face)) : 'off';
      if (key === last) return;
      last = key;
      for (let i = 0; i < 96; i++) {
        const on = powered && grid && grid[Math.floor(i / 12)][i % 12];
        dots[i].setAttribute('fill', on ? '#ff5a4a' : OFF_LED);
        halos[i].setAttribute('opacity', on ? 0.28 : 0);
      }
    },
  };
  return api;
};

// Tessa-style happy face with a 150 ms blink every few seconds (like the firmware).
V.blinkFace = (t, seed = 0) => {
  const period = 4.2 + (seed % 3) * 0.7;
  return ((t + seed) % period) < 0.15 ? 'blink' : 'happy';
};

// ---------- Breadboard (400 points). p = hole pitch in px.
V.breadboard = (x, y, p = 13.2) => {
  const cols = 30, mx = 24;
  const rowY = { '+t': 16, '-t': 16 + p };
  'abcde'.split('').forEach((r, i) => (rowY[r] = 16 + (3 + i) * p));
  'fghij'.split('').forEach((r, i) => (rowY[r] = 16 + (10 + i) * p));
  rowY['-b'] = 16 + 16 * p; rowY['+b'] = 16 + 17 * p;
  const W = mx * 2 + (cols - 1) * p, H = 32 + 17 * p;
  const g = V.s('g', { transform: `translate(${x} ${y})` });
  g.appendChild(V.s('rect', { x: 3, y: 4, width: W, height: H, rx: 8, fill: '#000', opacity: 0.12 }));
  g.appendChild(V.s('rect', { x: 0, y: 0, width: W, height: H, rx: 8, fill: '#f6f3ec', stroke: '#d8d1c3', 'stroke-width': 2 }));
  // middle ravine
  g.appendChild(V.s('rect', { x: 6, y: rowY.e + p * 0.9, width: W - 12, height: p * 1.2, rx: 3, fill: '#e3ddd0' }));
  // x-ray layer (metal strips), hidden until explained
  const xray = V.s('g', { opacity: 0 });
  for (let c = 0; c < cols; c++) {
    const cx = mx + c * p;
    xray.appendChild(V.s('rect', { x: cx - p * 0.28, y: rowY.a - p * 0.4, width: p * 0.56, height: 4.8 * p, rx: 2, fill: '#b7bec5' }));
    xray.appendChild(V.s('rect', { x: cx - p * 0.28, y: rowY.f - p * 0.4, width: p * 0.56, height: 4.8 * p, rx: 2, fill: '#b7bec5' }));
  }
  ['+t', '-t', '-b', '+b'].forEach((r) => xray.appendChild(V.s('rect', { x: mx - p * 0.4, y: rowY[r] - p * 0.28, width: (cols - 1) * p + p * 0.8, height: p * 0.56, rx: 2, fill: '#b7bec5' })));
  g.appendChild(xray);
  // highlight layer
  const hl = V.s('g');
  g.appendChild(hl);
  // rail lines
  const railLine = (yy, color) => g.appendChild(V.s('line', { x1: mx - p * 0.6, y1: yy, x2: W - mx + p * 0.6, y2: yy, stroke: color, 'stroke-width': 2.2 }));
  railLine(rowY['+t'] - p * 0.62, '#e53935'); railLine(rowY['-t'] + p * 0.62, '#1e63d6');
  railLine(rowY['-b'] - p * 0.62, '#1e63d6'); railLine(rowY['+b'] + p * 0.62, '#e53935');
  const sign = (xx, yy, s, color) => g.appendChild(V.s('text', { x: xx, y: yy + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 900, fill: color }, s));
  [[8, '+t', '+', '#e53935'], [8, '-t', '−', '#1e63d6'], [8, '-b', '−', '#1e63d6'], [8, '+b', '+', '#e53935']].forEach(([xx, r, s, c]) => { sign(xx + 2, rowY[r], s, c); sign(W - xx - 2, rowY[r], s, c); });
  // holes
  const holes = V.s('g', { fill: '#3b3b3b' });
  for (let c = 0; c < cols; c++) {
    const cx = mx + c * p;
    for (const r in rowY) holes.appendChild(V.s('rect', { x: cx - 1.7, y: rowY[r] - 1.7, width: 3.4, height: 3.4, rx: 0.6 }));
  }
  g.appendChild(holes);
  // numbers and letters
  [1, 5, 10, 15, 20, 25, 30].forEach((n) => {
    g.appendChild(V.s('text', { x: mx + (n - 1) * p, y: rowY.a - p * 0.75, 'text-anchor': 'middle', 'font-size': 8.5, fill: '#8a8272', 'font-weight': 700 }, n));
    g.appendChild(V.s('text', { x: mx + (n - 1) * p, y: rowY.j + p * 1.05, 'text-anchor': 'middle', 'font-size': 8.5, fill: '#8a8272', 'font-weight': 700 }, n));
  });
  'abcdefghij'.split('').forEach((r) => {
    g.appendChild(V.s('text', { x: 11, y: rowY[r] + 3, 'text-anchor': 'middle', 'font-size': 8.5, fill: '#8a8272', 'font-weight': 700 }, r));
    g.appendChild(V.s('text', { x: W - 11, y: rowY[r] + 3, 'text-anchor': 'middle', 'font-size': 8.5, fill: '#8a8272', 'font-weight': 700 }, r));
  });
  const hole = (c, r) => ({ x: x + mx + (c - 1) * p, y: y + rowY[r] });
  const api = {
    g, p, W, H, x, y, rowY, hole, xray,
    // highlight a group of 5 holes (half = 'top' | 'bottom') or a rail ('+t', '-t', '-b', '+b')
    group(c, half, color = '#ffb300') {
      const r0 = half === 'top' ? 'a' : 'f';
      const el = V.s('rect', { x: mx + (c - 1) * p - p * 0.48, y: rowY[r0] - p * 0.5, width: p * 0.96, height: 5 * p, rx: 4, fill: color, opacity: 0 });
      hl.appendChild(el);
      return el;
    },
    rail(r, color) {
      const col = color || (r[0] === '+' ? '#ef9a9a' : '#90caf9');
      const el = V.s('rect', { x: mx - p * 0.5, y: rowY[r] - p * 0.5, width: (cols - 1) * p + p, height: p, rx: 4, fill: col, opacity: 0 });
      hl.appendChild(el);
      return el;
    },
  };
  return api;
};

// ---------- Small parts. Coordinates are absolute (same space as the breadboard holes).
V.leg = (x1, y1, x2, y2) => V.s('line', { x1, y1, x2, y2, stroke: '#9ea7ad', 'stroke-width': 2.4, 'stroke-linecap': 'round' });

V.ldr = (h1, h2, { lift = 30 } = {}) => {
  const mxp = (h1.x + h2.x) / 2, myp = Math.min(h1.y, h2.y) - lift;
  const g = V.s('g');
  g.appendChild(V.s('polyline', { points: `${h1.x},${h1.y} ${h1.x},${myp + 10} ${mxp - 5},${myp + 6}`, fill: 'none', stroke: '#9ea7ad', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
  g.appendChild(V.s('polyline', { points: `${h2.x},${h2.y} ${h2.x},${myp + 10} ${mxp + 5},${myp + 6}`, fill: 'none', stroke: '#9ea7ad', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
  g.appendChild(V.s('ellipse', { cx: mxp, cy: myp, rx: 13, ry: 11, fill: '#f0e6c8', stroke: '#b89b52', 'stroke-width': 1.5 }));
  g.appendChild(V.s('ellipse', { cx: mxp, cy: myp, rx: 10, ry: 8, fill: '#e2553f' }));
  g.appendChild(V.s('path', { d: `M${mxp - 7},${myp - 4} h12 v2.6 h-12 v2.6 h12 v2.6 h-12`, fill: 'none', stroke: '#f6d58a', 'stroke-width': 1.4 }));
  return { g, cx: mxp, cy: myp };
};

const BAND = { black: '#1b1b1b', brown: '#6d3b1f', red: '#d32f2f', orange: '#ef6c00', yellow: '#fbc02d', gold: '#c9a227' };
V.resistor = (h1, h2, bands, { lift = 0 } = {}) => {
  const g = V.s('g');
  const ang = Math.atan2(h2.y - h1.y, h2.x - h1.x) * 180 / Math.PI;
  const cx = (h1.x + h2.x) / 2, cy = (h1.y + h2.y) / 2 - lift;
  g.appendChild(V.s('polyline', { points: `${h1.x},${h1.y} ${cx},${cy} ${h2.x},${h2.y}`, fill: 'none', stroke: '#9ea7ad', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
  const body = V.s('g', { transform: `translate(${cx} ${cy}) rotate(${ang})` });
  body.appendChild(V.s('rect', { x: -15, y: -6, width: 30, height: 12, rx: 5, fill: '#e3cf9c', stroke: '#b59a5a', 'stroke-width': 1.2 }));
  bands.forEach((b, i) => body.appendChild(V.s('rect', { x: -10 + i * 5.5 + (i === 3 ? 3 : 0), y: -6, width: 3, height: 12, fill: BAND[b] })));
  g.appendChild(body);
  return { g, cx, cy };
};

// Tactile push button; legs at the four holes given (tl, tr, bl, br).
V.button = (tl, tr, bl, br, cap = '#2e9e4f') => {
  const g = V.s('g');
  const cx = (tl.x + br.x) / 2, cy = (tl.y + br.y) / 2;
  [tl, tr, bl, br].forEach((h) => g.appendChild(V.s('rect', { x: h.x - 2.2, y: Math.min(h.y, cy) + (h.y < cy ? 0 : -0) - (h.y < cy ? 0 : Math.abs(h.y - cy)), width: 4.4, height: Math.abs(h.y - cy), fill: '#b9c1c7' })));
  g.appendChild(V.s('rect', { x: cx - 16, y: cy - 15, width: 32, height: 30, rx: 3, fill: '#2d2d2d', stroke: '#111', 'stroke-width': 1.2 }));
  g.appendChild(V.s('circle', { cx, cy, r: 12, fill: cap, stroke: '#00000055', 'stroke-width': 1.5 }));
  g.appendChild(V.s('circle', { cx: cx - 3.5, cy: cy - 3.5, r: 4, fill: '#ffffff', opacity: 0.35 }));
  const press = V.s('circle', { cx, cy, r: 12, fill: '#000', opacity: 0 });
  g.appendChild(press);
  return { g, cx, cy, press(on) { press.setAttribute('opacity', on ? 0.28 : 0); } };
};

// HC-SR501 PIR module, front view (white dome). Pins VCC / OUT / GND along the bottom edge.
V.pir = (x, y, s = 1) => {
  const g = V.s('g', { transform: `translate(${x} ${y}) scale(${s})` });
  g.appendChild(V.s('rect', { x: 0, y: 0, width: 128, height: 96, rx: 6, fill: '#2f7d46', stroke: '#1d5530', 'stroke-width': 2 }));
  [[8, 8], [120, 8], [8, 88], [120, 88]].forEach(([a, b]) => g.appendChild(V.s('circle', { cx: a, cy: b, r: 3.6, fill: '#f6f3ec' })));
  const labels = V.s('g');
  V.fade(labels, 0); // printed under the dome: only visible when the dome is lifted
  ['VCC', 'OUT', 'GND'].forEach((t, i) => labels.appendChild(V.s('text', { x: 44 + i * 20, y: 84, 'text-anchor': 'middle', 'font-size': 8.5, 'font-weight': 800, fill: '#e8f5e9' }, t)));
  g.appendChild(labels);
  const dome = V.s('g');
  dome.appendChild(V.s('circle', { cx: 64, cy: 44, r: 38, fill: '#fbfbf8', stroke: '#d6d6cf', 'stroke-width': 2 }));
  for (let i = -2; i <= 2; i++) dome.appendChild(V.s('path', { d: `M${64 + i * 13},${9 + Math.abs(i) * 3} Q${64 + i * 16},44 ${64 + i * 13},${79 - Math.abs(i) * 3}`, fill: 'none', stroke: '#e3e3dc', 'stroke-width': 1.4 }));
  dome.appendChild(V.s('path', { d: 'M28,44 Q64,36 100,44', fill: 'none', stroke: '#e3e3dc', 'stroke-width': 1.4 }));
  dome.appendChild(V.s('ellipse', { cx: 52, cy: 28, rx: 10, ry: 6, fill: '#fff', opacity: 0.9 }));
  g.appendChild(dome);
  // header pins (stick out of the bottom edge)
  [44, 64, 84].forEach((px) => g.appendChild(V.s('rect', { x: px - 3, y: 94, width: 6, height: 12, fill: '#c9a227' })));
  g.appendChild(V.s('rect', { x: 34, y: 92, width: 60, height: 7, fill: '#1b1b1b' }));
  const pin = (n) => ({ x: x + [44, 64, 84][['VCC', 'OUT', 'GND'].indexOf(n)] * s, y: y + 104 * s });
  return { g, dome, labels, pin };
};

// PIR back view: the two adjustment knobs and the trigger jumper.
V.pirBack = (x, y, s = 1) => {
  const g = V.s('g', { transform: `translate(${x} ${y}) scale(${s})` });
  g.appendChild(V.s('rect', { x: 0, y: 0, width: 128, height: 96, rx: 6, fill: '#2f7d46', stroke: '#1d5530', 'stroke-width': 2 }));
  g.appendChild(V.s('rect', { x: 48, y: 30, width: 30, height: 20, fill: '#1b1b1b' }));
  g.appendChild(V.s('text', { x: 63, y: 43, 'text-anchor': 'middle', 'font-size': 6, fill: '#9e9e9e' }, 'BISS0001'));
  const knob = (cx, label) => {
    const kg = V.s('g');
    kg.appendChild(V.s('rect', { x: cx - 11, y: 58, width: 22, height: 22, rx: 3, fill: '#f28b1f', stroke: '#a85a0c', 'stroke-width': 1.5 }));
    kg.appendChild(V.s('circle', { cx, cy: 69, r: 7, fill: '#f7b567', stroke: '#a85a0c', 'stroke-width': 1 }));
    const slot = V.s('line', { x1: cx, y1: 63, x2: cx, y2: 75, stroke: '#7a3f06', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    kg.appendChild(slot);
    kg.appendChild(V.s('text', { x: cx, y: 91, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 900, fill: '#e8f5e9' }, label));
    g.appendChild(kg);
    return { turn(deg) { slot.setAttribute('transform', `rotate(${deg} ${cx} 69)`); } };
  };
  const tx = knob(30, 'Tx time'), sx = knob(98, 'Sx sens.');
  // jumper L / H
  g.appendChild(V.s('text', { x: 18, y: 16, 'font-size': 9, 'font-weight': 900, fill: '#e8f5e9' }, 'L'));
  g.appendChild(V.s('text', { x: 18, y: 38, 'font-size': 9, 'font-weight': 900, fill: '#e8f5e9' }, 'H'));
  [10, 20, 30].forEach((yy) => g.appendChild(V.s('rect', { x: 6, y: yy + 1, width: 5, height: 5, fill: '#c9a227' })));
  const jumper = V.s('rect', { x: 3.5, y: 19, width: 10, height: 18, rx: 2, fill: '#1b1b1b' });
  g.appendChild(jumper);
  return { g, tx, sx, setJumper(pos) { jumper.setAttribute('y', pos === 'H' ? 19 : 9); } };
};

// DFR0534 voice module (stylised). Pins on the left edge: VCC, GND, TX, RX. Speaker terminals on the right.
V.voice = (x, y, s = 1) => {
  const g = V.s('g', { transform: `translate(${x} ${y}) scale(${s})` });
  g.appendChild(V.s('rect', { x: 0, y: 0, width: 130, height: 92, rx: 6, fill: '#1f3b70', stroke: '#10244a', 'stroke-width': 2 }));
  g.appendChild(V.s('rect', { x: 44, y: -6, width: 26, height: 12, rx: 3, fill: '#cfd6dc', stroke: '#8a949c' }));
  g.appendChild(V.s('text', { x: 57, y: 18, 'text-anchor': 'middle', 'font-size': 7.5, fill: '#cfe0ff', 'font-weight': 800 }, 'micro-USB'));
  g.appendChild(V.s('rect', { x: 50, y: 36, width: 30, height: 22, fill: '#111' }));
  g.appendChild(V.s('text', { x: 65, y: 76, 'text-anchor': 'middle', 'font-size': 10, fill: '#ffffff', 'font-weight': 900 }, 'DFR0534'));
  g.appendChild(V.s('text', { x: 65, y: 87, 'text-anchor': 'middle', 'font-size': 7.5, fill: '#cfe0ff', 'font-weight': 700 }, 'voice · 8 MB'));
  const pinNames = ['VCC', 'GND', 'TX', 'RX'];
  pinNames.forEach((n, i) => {
    g.appendChild(V.s('rect', { x: -9, y: 18 + i * 17 - 3, width: 12, height: 6, fill: '#c9a227' }));
    g.appendChild(V.s('text', { x: 8, y: 18 + i * 17 + 3.5, 'font-size': 9, fill: '#fff', 'font-weight': 900 }, n));
  });
  ['SP+', 'SP−'].forEach((n, i) => {
    g.appendChild(V.s('rect', { x: 118, y: 26 + i * 24, width: 16, height: 14, rx: 2, fill: '#2e7d32' }));
    g.appendChild(V.s('text', { x: 114, y: 36 + i * 24, 'text-anchor': 'end', 'font-size': 9, fill: '#fff', 'font-weight': 900 }, n));
  });
  const pin = (n) => {
    const i = pinNames.indexOf(n);
    if (i >= 0) return { x: x + (-9) * s, y: y + (18 + i * 17) * s };
    const j = n === 'SP+' ? 0 : 1;
    return { x: x + 134 * s, y: y + (33 + j * 24) * s };
  };
  return { g, pin };
};

V.speaker = (cx, cy, r = 40) => {
  const g = V.s('g');
  g.appendChild(V.s('circle', { cx, cy, r, fill: '#3a3a3a', stroke: '#1d1d1d', 'stroke-width': 2 }));
  g.appendChild(V.s('circle', { cx, cy, r: r * 0.8, fill: '#565656' }));
  const cone = V.s('circle', { cx, cy, r: r * 0.62, fill: '#2b2b2b' });
  g.appendChild(cone);
  g.appendChild(V.s('circle', { cx, cy, r: r * 0.25, fill: '#444', stroke: '#222' }));
  g.appendChild(V.s('rect', { x: cx - r * 0.55, y: cy + r * 0.82, width: 10, height: 12, fill: '#c9a227' }));
  g.appendChild(V.s('rect', { x: cx + r * 0.55 - 10, y: cy + r * 0.82, width: 10, height: 12, fill: '#c9a227' }));
  g.appendChild(V.s('text', { x: cx - r * 0.55 + 5, y: cy + r * 0.8 - 3, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: '#ff8a80' }, '+'));
  const waves = V.s('g', { opacity: 0 });
  [1, 2, 3].forEach((i) => waves.appendChild(V.s('path', { d: `M${cx + r + 6 * i},${cy - 14 - 6 * i} Q${cx + r + 14 + 8 * i},${cy} ${cx + r + 6 * i},${cy + 14 + 6 * i}`, fill: 'none', stroke: '#0f8a8f', 'stroke-width': 3, 'stroke-linecap': 'round' })));
  g.appendChild(waves);
  return {
    g, tabPlus: { x: cx - r * 0.55 + 5, y: cy + r * 0.82 + 12 }, tabMinus: { x: cx + r * 0.55 - 5, y: cy + r * 0.82 + 12 },
    talk(t, on) { V.fade(waves, on ? 0.35 + 0.65 * V.pulse(t, 3) : 0); cone.setAttribute('r', (r * 0.62 + (on ? V.pulse(t, 9) * 2 : 0)).toFixed(1)); },
  };
};

// ---------- The finished robot (3/4 view of the Kradex box). Returns {g, matrix, parts}.
V.robot = (cx, cy, s = 1, { felt = true, cable = true } = {}) => {
  const g = V.s('g', { transform: `translate(${cx} ${cy}) scale(${s}) translate(-73 -88)` });
  const parts = {};
  if (cable) g.appendChild(V.s('path', { d: 'M140,168 C170,176 190,190 240,192', fill: 'none', stroke: '#444', 'stroke-width': 4, 'stroke-linecap': 'round' }));
  // shadow
  g.appendChild(V.s('ellipse', { cx: 76, cy: 182, rx: 90, ry: 10, fill: '#000', opacity: 0.12 }));
  // side and top faces
  parts.side = V.s('polygon', { points: '126,0 146,-14 146,162 126,176', fill: '#7d848b', stroke: '#5f666d', 'stroke-width': 1.5 });
  g.appendChild(parts.side);
  parts.speakerHoles = V.s('g');
  for (let i = 0; i < 7; i++) parts.speakerHoles.appendChild(V.s('ellipse', { cx: 136, cy: 112 + (i % 4) * 9 - (i >= 4 ? -4.5 : 0), rx: 2.2, ry: 3.2, fill: '#2d3136', transform: i >= 4 ? 'translate(4 0)' : '' }));
  g.appendChild(parts.speakerHoles);
  g.appendChild(V.s('polygon', { points: '0,0 20,-14 146,-14 126,0', fill: '#a7aeb5', stroke: '#5f666d', 'stroke-width': 1.5 }));
  // breadboard on top with buttons + LDR
  parts.top = V.s('g');
  parts.top.appendChild(V.s('polygon', { points: '22,-3 34,-12 118,-12 106,-3', fill: '#f6f3ec', stroke: '#cfc8b8', 'stroke-width': 1 }));
  parts.btnG = V.s('ellipse', { cx: 52, cy: -7.5, rx: 8, ry: 3.4, fill: '#2e9e4f', stroke: '#1b5e20' });
  parts.btnR = V.s('ellipse', { cx: 78, cy: -7.5, rx: 8, ry: 3.4, fill: '#e53935', stroke: '#8e1c1a' });
  parts.ldrTop = V.s('ellipse', { cx: 98, cy: -8, rx: 4.5, ry: 2.4, fill: '#e2553f', stroke: '#b89b52' });
  parts.top.appendChild(parts.btnG); parts.top.appendChild(parts.btnR); parts.top.appendChild(parts.ldrTop);
  g.appendChild(parts.top);
  // front = transparent lid
  g.appendChild(V.s('rect', { x: 0, y: 0, width: 126, height: 176, rx: 7, fill: '#8f969d', stroke: '#5f666d', 'stroke-width': 1.5 }));
  parts.board = V.s('rect', { x: 18, y: 64, width: 90, height: 70, rx: 5, fill: '#0f8a8f', opacity: 0.85 });
  g.appendChild(parts.board);
  g.appendChild(V.s('rect', { x: 5, y: 5, width: 116, height: 166, rx: 5, fill: '#dfeef3', opacity: 0.38, stroke: '#ffffff', 'stroke-opacity': 0.7, 'stroke-width': 1.2 }));
  g.appendChild(V.s('path', { d: 'M12,12 L40,12 L14,60 Z', fill: '#fff', opacity: 0.22 }));
  // felt band on the grey side
  parts.felt = V.s('g', { opacity: felt ? 1 : 0 });
  parts.felt.appendChild(V.s('polygon', { points: '126,128 146,114 146,148 126,162', fill: '#c9956a' }));
  for (let i = 0; i < 12; i++) parts.felt.appendChild(V.s('circle', { cx: 129 + (i % 4) * 4.5, cy: 132 + Math.floor(i / 4) * 9 - (i % 4) * 3, r: 0.9, fill: '#a8764f' }));
  g.appendChild(parts.felt);
  // PIR dome in the lid
  parts.pir = V.s('g');
  parts.pir.appendChild(V.s('circle', { cx: 63, cy: 34, r: 15, fill: '#fbfbf8', stroke: '#cfcfc6', 'stroke-width': 1.5 }));
  [-1, 0, 1].forEach((i) => parts.pir.appendChild(V.s('path', { d: `M${63 + i * 6},${21} Q${63 + i * 8},34 ${63 + i * 6},47`, fill: 'none', stroke: '#e3e3dc' })));
  parts.pir.appendChild(V.s('ellipse', { cx: 57, cy: 27, rx: 4, ry: 2.5, fill: '#fff' }));
  g.appendChild(parts.pir);
  // face
  const matrix = V.matrix(63 - 5.5 * 7.2, 99 - 3.5 * 7.2, 7.2, 2.5);
  g.appendChild(matrix.g);
  return { g, matrix, parts };
};

// ---------- Simple people and objects
V.person = (x, y, s = 1, { hair = '#cfd4da', shirt = '#7e57c2', bun = true } = {}) => {
  const g = V.s('g', { transform: `translate(${x} ${y}) scale(${s})` });
  g.appendChild(V.s('path', { d: 'M-22,70 Q-22,26 0,26 Q22,26 22,70 Z', fill: shirt }));
  g.appendChild(V.s('circle', { cx: 0, cy: 8, r: 16, fill: '#f1c9a5' }));
  g.appendChild(V.s('path', { d: 'M-16,6 Q-14,-12 0,-10 Q14,-12 16,6 Q10,-2 0,-2 Q-10,-2 -16,6 Z', fill: hair }));
  if (bun) g.appendChild(V.s('circle', { cx: 0, cy: -12, r: 7, fill: hair }));
  g.appendChild(V.s('circle', { cx: -5.5, cy: 9, r: 1.8, fill: '#3b2c24' }));
  g.appendChild(V.s('circle', { cx: 5.5, cy: 9, r: 1.8, fill: '#3b2c24' }));
  g.appendChild(V.s('path', { d: 'M-5,15 Q0,19 5,15', fill: 'none', stroke: '#8d5b4c', 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
  return g;
};

V.phone = (x, y, s = 1) => {
  const g = V.s('g', { transform: `translate(${x} ${y}) scale(${s})` });
  g.appendChild(V.s('rect', { x: 0, y: 0, width: 150, height: 290, rx: 22, fill: '#1c1f24' }));
  g.appendChild(V.s('rect', { x: 8, y: 10, width: 134, height: 270, rx: 16, fill: '#eef2f6' }));
  g.appendChild(V.s('rect', { x: 55, y: 16, width: 40, height: 8, rx: 4, fill: '#1c1f24' }));
  const screen = V.s('g', { transform: 'translate(8 34)' });
  g.appendChild(screen);
  return { g, screen };
};

V.laptop = (x, y, s = 1) => {
  const g = V.s('g', { transform: `translate(${x} ${y}) scale(${s})` });
  g.appendChild(V.s('rect', { x: 10, y: 0, width: 180, height: 116, rx: 8, fill: '#2b3139' }));
  g.appendChild(V.s('rect', { x: 18, y: 8, width: 164, height: 100, rx: 3, fill: '#e8f1f8' }));
  g.appendChild(V.s('path', { d: 'M0,120 L200,120 L186,132 L14,132 Z', fill: '#9aa3ab' }));
  const screen = V.s('g', { transform: 'translate(18 8)' });
  g.appendChild(screen);
  return { g, screen };
};

// Emoji icon (Noto Color Emoji is installed in the render container).
V.emoji = (x, y, ch, size = 40) => V.s('text', { x, y, 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central', style: { fontFamily: 'Noto Color Emoji' } }, ch);

// =============================================================================================
// HTML widgets
// =============================================================================================
V.box = (css, ...kids) => V.h('div', { style: Object.assign({ position: 'absolute' }, css) }, ...kids);

// Stage-sized SVG inside a scene root.
V.svg = (root, vb = '0 0 1280 564') => {
  const svg = V.s('svg', { viewBox: vb, width: 1280, height: 564, style: { position: 'absolute', left: '0px', top: '0px' } });
  root.appendChild(svg);
  return svg;
};

// Big scene heading (HTML).
V.heading = (root, text, { x = 56, y = 26, size = 40, color = '#1d2b3a', sub = null } = {}) => {
  const el = V.box({ left: x + 'px', top: y + 'px', fontSize: size + 'px', fontWeight: 900, color, lineHeight: 1.1, letterSpacing: '-0.5px' }, text);
  if (sub) el.appendChild(V.h('div', { style: { fontSize: Math.round(size * 0.5) + 'px', fontWeight: 700, color: '#5b6b7b', marginTop: '6px', letterSpacing: '0' } }, sub));
  root.appendChild(el);
  return el;
};

// Card with an icon, title and text.
V.card = (root, { x, y, w = 260, h = null, icon = '', title = '', text = '', color = '#0f8a8f', bg = '#ffffff', size = 18 }) => {
  const el = V.box({ left: x + 'px', top: y + 'px', width: w + 'px', height: h ? h + 'px' : 'auto', background: bg, borderRadius: '16px',
    boxShadow: '0 6px 18px rgba(29,43,58,0.12)', padding: '14px 16px', boxSizing: 'border-box', borderTop: `6px solid ${color}` });
  const row = V.h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } });
  if (icon) row.appendChild(V.h('div', { style: { fontSize: '34px', fontFamily: 'Noto Color Emoji', lineHeight: 1 } }, icon));
  if (title) row.appendChild(V.h('div', { style: { fontSize: size + 3 + 'px', fontWeight: 900, color: '#1d2b3a', lineHeight: 1.15 } }, title));
  el.appendChild(row);
  if (text) el.appendChild(V.h('div', { style: { fontSize: size + 'px', fontWeight: 600, color: '#44546a', marginTop: '6px', lineHeight: 1.3 }, html: text }));
  root.appendChild(el);
  V.fade(el, 0);
  return el;
};

// Checklist / bullet list; returns the item elements.
V.list = (root, items, { x = 60, y = 120, w = 560, size = 23, gap = 14, bullet = '•', color = '#0f8a8f' } = {}) => {
  const wrap = V.box({ left: x + 'px', top: y + 'px', width: w + 'px' });
  const els = items.map((it) => {
    const row = V.h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: gap + 'px', fontSize: size + 'px', fontWeight: 700, lineHeight: 1.3 } });
    const b = typeof it === 'object' && it.icon ? it.icon : bullet;
    row.appendChild(V.h('div', { style: { color, fontWeight: 900, minWidth: '26px', fontFamily: /\p{Extended_Pictographic}/u.test(b) ? 'Noto Color Emoji' : 'inherit' } }, b));
    row.appendChild(V.h('div', { html: typeof it === 'object' ? it.text : it }));
    wrap.appendChild(row);
    V.fade(row, 0);
    return row;
  });
  root.appendChild(wrap);
  return els;
};

// Code block (HTML), lines can contain <b class=hl> for highlights.
V.code = (root, lines, { x, y, w = 520, size = 17, title = '' }) => {
  const el = V.box({ left: x + 'px', top: y + 'px', width: w + 'px', background: '#1e2630', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', overflow: 'hidden' });
  if (title) el.appendChild(V.h('div', { style: { background: '#2c3845', color: '#cfd8e3', fontSize: '14px', fontWeight: 800, padding: '7px 14px', fontFamily: 'JetBrains Mono' } }, title));
  const body = V.h('div', { style: { padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: size + 'px', color: '#e6edf3', lineHeight: 1.5, whiteSpace: 'pre' } });
  const rows = lines.map((l) => { const r = V.h('div', { html: l || '&nbsp;' }); body.appendChild(r); return r; });
  el.appendChild(body);
  root.appendChild(el);
  V.fade(el, 0);
  return { el, rows };
};

// Terminal / Serial Monitor. Script it with .type(t, text) and .out(t, text | [lines], gap).
V.term = (root, { x, y, w = 560, h = 300, kind = 'serial', title, prompt = '$ ', size = 15.5 }) => {
  const el = V.box({ left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', background: '#10161d', borderRadius: '12px',
    boxShadow: '0 10px 24px rgba(0,0,0,0.25)', overflow: 'hidden', fontFamily: 'JetBrains Mono' });
  const bar = V.h('div', { style: { background: kind === 'serial' ? '#0f8a8f' : '#2c3845', color: '#fff', fontSize: '13.5px', fontWeight: 700,
    padding: '6px 12px', display: 'flex', justifyContent: 'space-between', fontFamily: 'Nunito' } },
  V.h('span', {}, title || (kind === 'serial' ? 'Serial Monitor' : 'Terminal')),
  V.h('span', { style: { opacity: 0.85 } }, kind === 'serial' ? 'Newline  ·  115200 baud' : ''));
  el.appendChild(bar);
  let input = null;
  if (kind === 'serial') {
    input = V.h('div', { style: { margin: '8px 10px', background: '#1f2a36', border: '1.5px solid #3b4a5a', borderRadius: '6px', color: '#e6edf3',
      fontSize: size + 'px', padding: '5px 9px', minHeight: '22px', whiteSpace: 'pre' } });
    el.appendChild(input);
  }
  const log = V.h('div', { style: { padding: '6px 12px', color: '#d7e1ea', fontSize: size + 'px', lineHeight: 1.42, whiteSpace: 'pre' } });
  el.appendChild(log);
  root.appendChild(el);
  const events = [];
  const lineH = size * 1.42;
  const maxLines = Math.floor((h - (kind === 'serial' ? 88 : 44)) / lineH);
  const api = {
    el,
    type(t, text, { speed = 13 } = {}) { events.push({ t, kind: 'type', text, dur: text.length / speed }); return t + text.length / speed + 0.35; },
    out(t, lines, gap = 0.06, color) {
      (Array.isArray(lines) ? lines : [lines]).forEach((l, i) => events.push({ t: t + i * gap, kind: 'out', text: l, color }));
      return this;
    },
    update(t) {
      const shown = [];
      let typing = '';
      for (const e of events) {
        if (e.t > t) continue;
        if (e.kind === 'out') shown.push({ text: e.text, color: e.color });
        else {
          const n = Math.min(e.text.length, Math.floor(((t - e.t) / e.dur) * e.text.length + 0.001));
          const done = t >= e.t + e.dur + 0.3;
          if (kind === 'serial') { if (!done) typing = e.text.slice(0, n); }
          else shown.push({ text: prompt + e.text.slice(0, done ? e.text.length : n), color: '#8ee6a0', cursor: !done });
        }
      }
      const cursor = Math.floor(t * 2) % 2 === 0 ? '▌' : ' ';
      if (input) input.textContent = typing ? typing + cursor : (typing === '' ? cursor : '');
      const vis = shown.slice(-maxLines);
      const key = vis.map((l) => l.text + (l.cursor ? cursor : '')).join('\n');
      if (key !== api._key) {
        api._key = key;
        log.innerHTML = '';
        vis.forEach((l) => log.appendChild(V.h('div', { style: { color: l.color || '#d7e1ea' } }, l.text + (l.cursor ? cursor : ''))));
      }
    },
  };
  return api;
};

// Robin speech bubble (HTML).
V.bubble = (root, { x, y, w = 360, text = '', tail = 'left' }) => {
  const el = V.box({ left: x + 'px', top: y + 'px', width: w + 'px', background: '#ffffff', border: '3px solid #0f8a8f', borderRadius: '18px',
    padding: '12px 16px', fontSize: '20px', fontWeight: 700, color: '#0a5e62', boxShadow: '0 6px 16px rgba(15,138,143,0.18)', boxSizing: 'border-box', lineHeight: 1.3 });
  el.appendChild(V.h('div', { style: { fontSize: '13px', fontWeight: 900, letterSpacing: '1px', color: '#0f8a8f', marginBottom: '3px' } }, 'ROBIN SAYS'));
  const txt = V.h('div', {}, text);
  el.appendChild(txt);
  el.appendChild(V.h('div', { style: { position: 'absolute', [tail === 'left' ? 'left' : 'right']: '-14px', top: '26px', width: 0, height: 0,
    borderTop: '10px solid transparent', borderBottom: '10px solid transparent', [tail === 'left' ? 'borderRight' : 'borderLeft']: '14px solid #0f8a8f' } }));
  root.appendChild(el);
  V.fade(el, 0);
  return { el, setText(s) { if (txt.textContent !== s) txt.textContent = s; } };
};

// Phone notification (HTML) as the ntfy app shows it.
V.notif = (root, { x, y, w = 330, title, text, urgent = true }) => {
  const el = V.box({ left: x + 'px', top: y + 'px', width: w + 'px', background: '#ffffff', borderRadius: '16px', padding: '12px 14px',
    boxShadow: '0 10px 26px rgba(0,0,0,0.25)', borderLeft: `7px solid ${urgent ? '#e53935' : '#0f8a8f'}`, boxSizing: 'border-box' });
  el.appendChild(V.h('div', { style: { fontSize: '12.5px', fontWeight: 800, color: '#7b8794', marginBottom: '4px' } }, (urgent ? '🚨 ' : '') + 'ntfy · now'));
  el.appendChild(V.h('div', { style: { fontSize: '17px', fontWeight: 900, color: '#1d2b3a', marginBottom: '4px' } }, title));
  el.appendChild(V.h('div', { style: { fontSize: '14.5px', fontWeight: 600, color: '#44546a', lineHeight: 1.35 } }, text));
  root.appendChild(el);
  V.fade(el, 0);
  return el;
};

// Table (HTML); rows = array of arrays (first = header).
V.table = (root, rows, { x, y, w, size = 16, colW = null, headBg = '#0f8a8f' }) => {
  const tbl = V.h('table', { style: { position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', borderCollapse: 'separate', borderSpacing: '0',
    fontSize: size + 'px', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 6px 18px rgba(29,43,58,0.12)' } });
  const trs = rows.map((r, i) => {
    const tr = V.h('tr');
    r.forEach((c, j) => tr.appendChild(V.h(i === 0 ? 'th' : 'td', { html: String(c), style: {
      padding: '6px 10px', textAlign: 'left', fontWeight: i === 0 ? 900 : 700, color: i === 0 ? '#fff' : '#1d2b3a',
      background: i === 0 ? headBg : (i % 2 ? '#ffffff' : '#f3f7f8'), width: colW ? colW[j] : 'auto', borderBottom: '1px solid #e3e9ee' } })));
    tbl.appendChild(tr);
    if (i > 0) V.fade(tr, 0);
    return tr;
  });
  root.appendChild(tbl);
  return { tbl, trs };
};

// =============================================================================================
// Runtime: header, captions, scene switching
// =============================================================================================
const RT = { scenes: [], cur: [], fade: 0.45 };

function buildTimelineAPI(sc) {
  const lines = sc.lines;
  const idx = (i) => {
    if (typeof i === 'number') return i;
    const j = lines.findIndex((l) => l.k === i);
    if (j < 0) throw new Error(`scene ${sc.id}: unknown line label ${i}`);
    return j;
  };
  return {
    dur: sc.end - sc.start,
    s: (i) => lines[idx(i)].start - sc.start,
    e: (i) => lines[idx(i)].end - sc.start,
    cap: (i) => lines[idx(i)].cap,
    c: (i, k) => lines[idx(i)].chunks[k].start - sc.start, // start of sentence k inside line i
    n: lines.length,
  };
}

function buildHeader() {
  const header = document.getElementById('header');
  const logo = V.s('svg', { width: 44, height: 44, viewBox: '0 0 44 44', style: { position: 'absolute', left: '18px', top: '8px' } });
  logo.appendChild(V.s('rect', { x: 2, y: 2, width: 40, height: 40, rx: 10, fill: '#0f8a8f' }));
  const lm = V.matrix(8, 13, 2.55, 0.95);
  logo.appendChild(lm.g);
  header.appendChild(logo);
  RT.logoMatrix = lm;
  RT.hBrand = V.box({ left: '72px', top: '9px', fontSize: '13px', fontWeight: 900, color: '#0f8a8f', letterSpacing: '1.5px' }, 'ROBIN · BUILD GUIDE');
  RT.hTitle = V.box({ left: '72px', top: '26px', fontSize: '22px', fontWeight: 900, color: '#1d2b3a', whiteSpace: 'nowrap' }, '');
  RT.hStep = V.box({ right: '24px', top: '14px', fontSize: '15px', fontWeight: 900, color: '#fff', background: '#f57c00', borderRadius: '20px', padding: '5px 14px' }, '');
  RT.hPart = V.box({ right: '24px', top: '17px', fontSize: '15px', fontWeight: 800, color: '#5b6b7b' }, '');
  header.appendChild(RT.hBrand); header.appendChild(RT.hTitle); header.appendChild(RT.hStep); header.appendChild(RT.hPart);
  const bar = V.box({ left: '0px', top: '57px', width: '1280px', height: '3px', background: '#e4ddd0' });
  RT.hProg = V.box({ left: '0px', top: '0px', height: '3px', background: '#0f8a8f', width: '0px' });
  bar.appendChild(RT.hProg);
  header.appendChild(bar);
}

function buildCaption() {
  const cap = document.getElementById('caption');
  RT.capText = V.h('div', { class: 'captext' });
  RT.capRobin = V.h('div', { class: 'capbadge' }, 'ROBIN');
  RT.capPause = V.h('div', { class: 'cappause' });
  cap.appendChild(RT.capRobin); cap.appendChild(RT.capText); cap.appendChild(RT.capPause);
}

function initVideo() {
  const tl = window.TIMELINE;
  const byId = Object.fromEntries(SCENE_DEFS.map((d) => [d.id, d]));
  const stage = document.getElementById('stage');
  buildHeader();
  buildCaption();
  RT.total = tl.total;
  for (const sc of tl.scenes) {
    const def = byId[sc.id];
    if (!def) throw new Error('scene missing in scenes.js: ' + sc.id);
    const root = V.h('div', { class: 'scene' + (def.dark ? ' dark' : ''), 'data-id': sc.id });
    stage.appendChild(root);
    const T = buildTimelineAPI(sc);
    const update = def.build(root, T) || (() => {});
    RT.scenes.push({ sc, def, root, update, shown: false });
  }
  window.__ready = true;
}

function captionAt(t, sc) {
  // The sentence (chunk) that started most recently in the current scene; it stays up until the
  // next one starts, and disappears during longer silences.
  let best = null;
  for (const l of sc.lines) {
    if (l.kind === 'pause') { if (l.start <= t) best = { kind: 'pause', cap: l.cap, start: l.start, end: l.end }; continue; }
    for (const c of l.chunks) if (c.start <= t + 0.05) best = { kind: l.kind, cap: c.cap, start: c.start, end: c.end };
  }
  if (best && t > best.end + (best.kind === 'pause' ? 0 : 1.0)) best = null;
  return best;
}

function seek(t) {
  t = Math.max(0, Math.min(t, RT.total - 1e-3));
  let i = RT.scenes.findIndex((s) => t >= s.sc.start && t < s.sc.end);
  if (i < 0) i = RT.scenes.length - 1;
  const active = new Set([i]);
  const cur = RT.scenes[i];
  const intoScene = t - cur.sc.start;
  const fadeP = i > 0 ? V.clamp(intoScene / RT.fade) : 1;
  if (fadeP < 1) active.add(i - 1);
  RT.scenes.forEach((s, j) => {
    const on = active.has(j);
    if (on !== s.shown) { s.root.style.display = on ? 'block' : 'none'; s.shown = on; }
  });
  if (fadeP < 1) {
    const prev = RT.scenes[i - 1];
    prev.update(prev.sc.end - prev.sc.start);
    prev.root.style.opacity = 1;
    cur.root.style.opacity = V.ease(fadeP).toFixed(3);
    cur.root.style.zIndex = 2; prev.root.style.zIndex = 1;
  } else {
    cur.root.style.opacity = 1;
  }
  cur.update(intoScene);
  document.getElementById('frame').classList.toggle('night', !!cur.def.dark);
  // header
  const d = cur.def;
  if (RT._hdr !== d.id) {
    RT._hdr = d.id;
    RT.hTitle.textContent = d.title || '';
    RT.hStep.textContent = d.step || '';
    RT.hStep.style.display = d.step ? 'block' : 'none';
    RT.hPart.textContent = d.step ? '' : (d.part || '');
    RT.hTitle.style.color = d.dark ? '#e6edf3' : '#1d2b3a';
    RT.hPart.style.color = d.dark ? '#9fb3c8' : '#5b6b7b';
  }
  RT.hProg.style.width = ((t / RT.total) * 1280).toFixed(1) + 'px';
  RT.logoMatrix.set(V.blinkFace(t, 1));
  // caption
  const l = captionAt(t, cur.sc);
  const key = l ? l.kind + l.cap : '';
  if (key !== RT._cap) {
    RT._cap = key;
    RT.capText.textContent = l ? (l.kind === 'pause' ? '' : l.cap) : '';
    RT.capRobin.style.display = l && l.kind === 'robin' ? 'block' : 'none';
    RT.capText.className = 'captext' + (l && l.kind === 'robin' ? ' robin' : '');
  }
  if (l && l.kind === 'pause') {
    const left = Math.max(0, Math.ceil(l.end - t));
    RT.capPause.style.display = 'flex';
    RT.capPause.textContent = `⏸  ${l.cap || 'Pause the video and think'}  ·  ${left}`;
  } else RT.capPause.style.display = 'none';
}

window.__seek = seek;
window.__init = initVideo;
