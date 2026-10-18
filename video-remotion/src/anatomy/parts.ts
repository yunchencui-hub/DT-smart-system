// The parts of Robin as isometric solids (anatomy kit), built once per projection at their resting place.
// Colours follow the renders of the parts we received (video-assets/parts/).
import { UNO_BOT, UNO_LABEL, UNO_TOP } from '../data/geom';
import { BOTTOM_HOLES, GRAVITY_PINS, TOP_HOLES } from '../data/modules';
import { ITEMS, Item, WIRE_COLORS, WireItem } from '../data/wiring';
import * as k from './kit/iso-kit';
import { box, cyl, flatPoly, flatRect, line3, mix, P, prism, rod, topText, tube } from './draw';
import {
  add3, anchorOf, BB, colX, GRAV_HOUSING, GRAV_PLUG, GRAV_SOCKET, gravHousingY, gravPinY, HEADER_H, HEADER_TOP, HEADERS, hole3,
  HOUSING, MATRIX, PCB_TOP, PIR, PIR_BACK, PIR_BACK_ORDER, PIR_PIN_LEN, PIR_PIN_Z, pirPinX, PITCH, ROWS, rowY, rowYu, SPEAKER,
  speakerTerm, UNO, unoPinXY, USB_C, V3, VOICE, VOICE_TOP, voiceHoleXY, wirePath,
} from './world';

export const COL = {
  mat: '#dcc6a0', pcb: '#1f4fa3', header: '#1e2024', metal: '#c9ced5', silver: '#b9bec6', chip: '#16181b', jack: '#1d1e21',
  bb: '#efe9dc', bbHole: '#5d554a', bbGroove: '#d8cfbd', red: '#d8382f', blue: '#2c62c6', ink: '#8b8272',
  pirPcb: '#21704a', pot: '#f0a03a', dome: '#f4f1e8', voicePcb: '#1f242c', socket: '#e8e1cf', gold: '#c9a54a',
  housing: '#202226', cable: '#8d949a', spk: '#1c1d20', btn: '#1f2124', capCan: '#1f3d8f', capStripe: '#b9c6de',
  resBody: '#7fb3d9', lead: '#a9adb3', ldr: '#c7743a', ldrTrack: '#7e2c10', led: '#e9e3d4', ledOn: '#ff4a3a',
  silk: '#ffffff', capGreen: '#14806a', capRed: '#c2283a',
};

// ---------- bench mat (cardboard: never work on metal)
export const matSvg = (p: P) => box(p, -70, -160, -2.2, 420, 260, 2.2, COL.mat, 4);

// ---------- Arduino UNO R4 WiFi
const UNO_RING: k.Plane[] = [[0, 53.34], [66.04, 53.34], [66.04, 52.07], [68.58, 49.53], [68.58, 15.24], [66.04, 12.7], [66.04, 1.78], [64.52, 0], [0, 0]]
  .map(([x, y]) => [UNO.x + x, UNO.y + y] as k.Plane);
const SMD: [number, number, number, number][] = [
  [9, 18, 1.6, 0.8], [9, 21, 1.6, 0.8], [11, 34, 0.8, 1.6], [34, 6, 1.6, 0.8], [38, 9, 0.8, 1.6], [43, 26, 1.6, 0.8], [47, 13, 1.6, 0.8],
  [50, 27, 0.8, 1.6], [64, 22, 1.6, 0.8], [64, 37, 0.8, 1.6], [56, 29, 1.6, 0.8], [26, 9, 1.6, 0.8], [6, 31, 1.6, 0.8], [21, 34, 2.4, 1.2],
];
export const ON_LED: V3 = [62.5, 41.5, PCB_TOP];
// Painted in two halves with the LED matrix between them: the front header (8.5 mm tall) hides what lies just behind
// it, including the pin names printed there, exactly as on the real board seen from the front.
export function unoSvg(p: P): { back: string; front: string } {
  const strip = (a: string, b: string) => {
    const [xa, y] = unoPinXY(a), [xb] = unoPinXY(b);
    return box(p, xa - 1.27, y - 1.27, PCB_TOP, xb - xa + 2.54, 2.54, HEADER_H, COL.header, 0.15);
  };
  const holes = (names: string[]) => `<path d="${names.map((n) => { const [x, y] = unoPinXY(n); return k.onTop([[x - 0.5, y - 0.5], [x + 0.5, y - 0.5], [x + 0.5, y + 0.5], [x - 0.5, y + 0.5]], HEADER_TOP, p, true); }).join('')}" fill="#050506"/>`;
  const s: string[] = [];
  s.push(`<path class="iso-halo" d="${k.haloOf({ x: UNO.x, y: UNO.y, w: UNO.w, d: UNO.d, r: 2 }, 0, UNO.z, p)}"/>`);
  s.push(prism(p, UNO_RING, UNO.z, UNO.t, COL.pcb));
  // back to front: USB-C and the reset button (left of the back header), the back header and the pin names printed
  // in front of it, then the parts in the middle of the board
  s.push(box(p, USB_C.x, USB_C.y, USB_C.z, USB_C.w, USB_C.d, USB_C.h, COL.metal, 0.8));
  s.push(box(p, 9, 1.4, PCB_TOP, 6, 5.6, 1.8, COL.metal), cyl(p, 12, 4.2, 1.4, PCB_TOP + 1.8, 0.8, COL.chip, 16));
  s.push(...HEADERS.slice(0, 2).map(([a, b]) => strip(a, b)), holes(Object.keys(UNO_TOP)));
  for (const n of Object.keys(UNO_TOP)) {
    const [x, y] = unoPinXY(n);
    const t = UNO_LABEL[n].replace('TX 1', 'TX1').replace('RX 0', 'RX0');
    s.push(topText(p, x, y + 3.2, PCB_TOP, t, t.length > 3 ? 0.95 : 1.25, COL.silk));
  }
  for (const [x, y, w, d] of SMD) s.push(box(p, x, y, PCB_TOP, w, d, 0.5, mix(COL.silver, '#000000', 0.15), 0));
  s.push(box(p, 14, 12, PCB_TOP, 17, 17, 2.8, COL.silver, 0.6)); // ESP32-S3 module (shielded)
  s.push(box(p, 54, 17, PCB_TOP, 8, 8, 1.2, COL.chip, 0.3)); // RA4M1
  s.push(box(p, 62, 27, PCB_TOP, 5, 7.5, 2.5, COL.header, 0.2)); // ICSP
  for (let i = 0; i < 6; i++) { const x = 63.2 + (i % 2) * 2.54, y = 28.4 + Math.floor(i / 2) * 2.4; s.push(line3(p, [[x, y, PCB_TOP + 2.5], [x, y, PCB_TOP + 8]], '#9aa0a8', 0.7 * p.scale)); }
  s.push(box(p, -2, 38, PCB_TOP, 14, 9, 11, COL.jack, 0.8)); // barrel jack
  // (the LED matrix is painted here, every frame), then the names printed behind the front header, and the header
  const f: string[] = [];
  for (const n of Object.keys(UNO_BOT)) {
    const [x, y] = unoPinXY(n);
    const t = UNO_LABEL[n];
    if (t) f.push(topText(p, x, y - 3.2, PCB_TOP, t, t.length > 3 ? 0.8 : 1.25, COL.silk));
  }
  f.push(topText(p, 20.5, 46.2, PCB_TOP, 'UNO R4 WiFi', 1.9, COL.silk, 'middle', 800));
  f.push(topText(p, ON_LED[0] + 2.6, ON_LED[1], PCB_TOP, 'ON', 1.1, COL.silk));
  f.push(...HEADERS.slice(2).map(([a, b]) => strip(a, b)), holes(Object.keys(UNO_BOT)));
  return { back: s.join(''), front: f.join('') };
}
// The 12 x 8 LED matrix (Robin's face) and the ON LED: drawn every frame, because they light up.
export function ledsSvg(p: P, face: number[][] | null, power: boolean): string {
  const off: string[] = [], on: string[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
    const x = MATRIX.x0 + c * MATRIX.pitch, y = MATRIX.y0 + r * MATRIX.pitch;
    const q = k.onTop([[x - 0.55, y - 0.4], [x + 0.55, y - 0.4], [x + 0.55, y + 0.4], [x - 0.55, y + 0.4]], PCB_TOP + 0.35, p, true);
    (face && face[r][c] ? on : off).push(q);
  }
  const led = k.onTop([[ON_LED[0] - 0.8, ON_LED[1] - 0.4], [ON_LED[0] + 0.8, ON_LED[1] - 0.4], [ON_LED[0] + 0.8, ON_LED[1] + 0.4], [ON_LED[0] - 0.8, ON_LED[1] + 0.4]], PCB_TOP + 0.4, p, true);
  return `<path d="${off.join('')}" fill="${COL.led}" stroke="#9c9583" stroke-width=".3"/>`
    + (on.length ? `<path d="${on.join('')}" fill="${COL.ledOn}" stroke="${COL.ledOn}" stroke-width="2.4" stroke-opacity=".35"/><path d="${on.join('')}" fill="#ffd2c8"/>` : '')
    + (power ? `<path d="${led}" fill="#3cff7a" stroke="#3cff7a" stroke-width="3" stroke-opacity=".45"/>` : `<path d="${led}" fill="#2f6b45"/>`);
}

// ---------- the breadboard
export function breadboardSvg(p: P, o: { lift?: number; shell?: boolean } = {}): string {
  const s: string[] = [];
  const z0 = o.lift ?? 0, top = BB.h + z0;
  if (!z0) s.push(`<path class="iso-halo" d="${k.haloOf({ x: BB.x, y: BB.y, w: BB.w, d: BB.d, r: 1.2 }, 0, 1, p)}"/>`);
  s.push(box(p, BB.x, BB.y, z0, BB.w, BB.d, BB.h, COL.bb, 1.2, { bevel: 0.5 }));
  s.push(flatRect(p, BB.x + 1.6, rowYu(7) + 1.5, BB.w - 3.2, 3 * PITCH - 3, top, COL.bbGroove));
  s.push(line3(p, [[BB.x + 1.6, rowYu(7) + 1.5, top], [BB.x + BB.w - 1.6, rowYu(7) + 1.5, top]], mix(COL.bbGroove, '#000000', 0.25), 0.5));
  // printed rail lines: red next to the + rows, blue next to the - rows
  const railLine = (u: number, color: string) => flatRect(p, colX(1) - 1.2, rowYu(u) - 0.22, colX(30) - colX(1) + 2.4, 0.44, top, color);
  s.push(railLine(-0.8, COL.red), railLine(1.8, COL.blue), railLine(15.2, COL.blue), railLine(17.8, COL.red));
  // the holes: one path for all 420
  const holes: string[] = [];
  for (const r of ROWS) for (let c = 1; c <= 30; c++) {
    const x = colX(c), y = rowY(r);
    holes.push(k.onTop([[x - 0.55, y - 0.55], [x + 0.55, y - 0.55], [x + 0.55, y + 0.55], [x - 0.55, y + 0.55]], top, p, true));
  }
  s.push(`<path d="${holes.join('')}" fill="${COL.bbHole}"/>`);
  // column numbers and row letters, as moulded into the plastic
  for (const c of [1, 5, 10, 15, 20, 25, 30]) {
    s.push(topText(p, colX(c), rowYu(2), top, String(c), 1.5, COL.ink), topText(p, colX(c), rowYu(15), top, String(c), 1.5, COL.ink));
  }
  'abcdefghij'.split('').forEach((r) => {
    s.push(topText(p, colX(1) - 2.7, rowY(r as never), top, r, 1.4, COL.ink), topText(p, colX(30) + 2.7, rowY(r as never), top, r, 1.4, COL.ink));
  });
  for (const [u, sign, color] of [[0, '+', COL.red], [1, '−', COL.blue], [16, '−', COL.blue], [17, '+', COL.red]] as [number, string, string][]) {
    s.push(topText(p, colX(1) - 2.7, rowYu(u), top, sign, 2, color, 'middle', 900), topText(p, colX(30) + 2.7, rowYu(u), top, sign, 2, color, 'middle', 900));
  }
  return s.join('');
}
// The metal clips inside the breadboard (for the x-ray figure): a strip under each half-column, one under each rail.
export function clipsSvg(p: P, z = 2.2, color = '#b8bdc4'): string {
  const s: string[] = [];
  for (const u of [0, 1, 16, 17]) s.push(box(p, colX(1) - 1, rowYu(u) - 0.7, z, colX(30) - colX(1) + 2, 1.4, 1.6, color, 0));
  for (let c = 1; c <= 30; c++) for (const [u0, u1] of [[3, 7], [10, 14]]) s.push(box(p, colX(c) - 0.7, rowYu(u0) - 0.9, z, 1.4, rowYu(u1) - rowYu(u0) + 1.8, 1.6, color, 0));
  return s.join('');
}

// ---------- HC-SR501 PIR (seen from behind: knobs, jumper and pins towards the viewer)
export function domeSvg(p: P, c: V3, r: number): string {
  const [x, y] = k.iso(c, p), R = r * p.scale * Math.sqrt(1.6);
  const id = 'dome' + Math.round(x * 10) + Math.round(y * 10);
  const rings = [0.82, 0.64, 0.46, 0.28].map((f) => `<circle cx="${(x - R * 0.12).toFixed(1)}" cy="${(y - R * 0.16).toFixed(1)}" r="${(R * f).toFixed(1)}" fill="none" stroke="#c9c3b2" stroke-width=".6" stroke-opacity=".7"/>`).join('');
  return `<g><defs><radialGradient id="${id}" cx="${(x - R * 0.3).toFixed(1)}" cy="${(y - R * 0.35).toFixed(1)}" r="${(R * 1.35).toFixed(1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="${COL.dome}"/><stop offset="1" stop-color="#b8b2a2"/></radialGradient></defs><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R.toFixed(1)}" fill="url(#${id})" stroke="#a49d8a" stroke-width=".8"/>${rings}</g>`;
}
export function pirSvg(p: P): string {
  const s: string[] = [];
  s.push(`<path class="iso-halo" d="${k.haloOf({ x: PIR.x, y: PIR.y - 10, w: PIR.w, d: 20, r: 4 }, 0, 1, p)}"/>`);
  s.push(domeSvg(p, [PIR.x + PIR.w / 2, PIR.y - 1.5, PIR.z + PIR.h / 2], 11.4));
  s.push(box(p, PIR.x, PIR.y, PIR.z, PIR.w, PIR.t, PIR.h, COL.pirPcb, 0.6));
  const B = PIR_BACK;
  s.push(box(p, PIR.x + 11, B, PIR.z + 8, 8, 1.4, 4.4, COL.chip, 0.2)); // the BISS0001 chip
  for (const x0 of [PIR.x + 2.6, PIR.x + PIR.w - 9.1]) { // the two knobs (trimpots)
    s.push(box(p, x0, B, PIR.z + 15.5, 6.5, 3.6, 6.5, COL.pot, 0.6));
    const cx = x0 + 3.25, cz = PIR.z + 18.75, yy = B + 3.6;
    s.push(line3(p, [[cx - 1.8, yy, cz], [cx + 1.8, yy, cz]], '#7a4a12', 0.5 * p.scale), line3(p, [[cx, yy, cz - 1.8], [cx, yy, cz + 1.8]], '#7a4a12', 0.5 * p.scale));
  }
  s.push(box(p, PIR.x + PIR.w - 4.2, B, PIR.z + 3.2, 2.6, 4.2, 5.4, COL.chip, 0.3)); // the L/H jumper with its cap
  s.push(box(p, pirPinX('VCC') - 3.9, B, PIR_PIN_Z - 1.25, 7.8, 2.5, 2.5, COL.header, 0.1)); // header strip
  for (const n of PIR_BACK_ORDER) { const x = pirPinX(n); s.push(line3(p, [[x, B + 2.5, PIR_PIN_Z], [x, B + PIR_PIN_LEN, PIR_PIN_Z]], COL.gold, 0.64 * p.scale, { cap: 'butt' })); }
  return s.join('');
}

// ---------- DFR0534 voice module (after the board photo in its datasheet: socket T R - +, two rows of holes, SPK socket)
export function voiceSvg(p: P): string {
  const s: string[] = [];
  s.push(`<path class="iso-halo" d="${k.haloOf({ x: VOICE.x, y: VOICE.y, w: VOICE.w, d: VOICE.d, r: 2 }, 0, 1, p)}"/>`);
  s.push(box(p, VOICE.x, VOICE.y, VOICE.z, VOICE.w, VOICE.d, VOICE.t, COL.voicePcb, 2));
  for (const [x, y] of [[VOICE.x + VOICE.w - 3.2, VOICE.y + 3.2], [VOICE.x + VOICE.w - 3.2, VOICE.y + VOICE.d - 3.2]]) {
    s.push(flatPoly(p, k.circleRing(x, y, 2.2, 24), VOICE_TOP, '#a7adb5'), flatPoly(p, k.circleRing(x, y, 1.15, 20), VOICE_TOP, '#0d0f12'));
  }
  for (const [x, y] of [[190.5, -41.5], [194, -41.5], [190.5, -36.5], [203, -44], [203, -33.5], [199.5, -44]]) s.push(box(p, x, y, VOICE_TOP, 1.6, 0.8, 0.5, '#7a3d22', 0));
  s.push(box(p, 193.2, -41, VOICE_TOP, 7, 4.4, 1, COL.chip, 0.2));
  // holes with gold rings and their printed names
  for (const [names, dy] of [[TOP_HOLES, 2.2], [BOTTOM_HOLES, -2.2]] as [readonly string[], number][]) {
    for (const n of names) {
      const [x, y] = voiceHoleXY(n);
      s.push(flatPoly(p, k.circleRing(x, y, 0.95, 20), VOICE_TOP, COL.gold), flatPoly(p, k.circleRing(x, y, 0.45, 16), VOICE_TOP, '#0b0c0e'));
      s.push(topText(p, x, y + dy, VOICE_TOP, n, n.length > 3 ? 0.62 : 0.78, COL.silk));
    }
  }
  // the white Gravity socket (T R - +) and the 2-pin SPK socket
  const G = GRAV_SOCKET;
  s.push(box(p, G.x, G.y, VOICE_TOP, G.w, G.d, G.h, COL.socket, 0.3));
  s.push(flatRect(p, G.x + 0.8, G.y + 0.8, G.w - 1.6, G.d - 1.6, VOICE_TOP + G.h, mix(COL.socket, '#000000', 0.12)));
  GRAVITY_PINS.forEach((n, i) => s.push(topText(p, G.x + G.w + 1.4, gravPinY(i), VOICE_TOP, n, 1.15, COL.silk, 'middle', 900)));
  s.push(box(p, 205.6, -41.2, VOICE_TOP, 5, 6.2, 5, COL.socket, 0.3));
  s.push(topText(p, 208.1, -33.4, VOICE_TOP, 'SPK', 0.9, COL.silk));
  return s.join('');
}
// The Gravity cable: its white plug in the socket, four grey wires, four female housings.
export function gravitySvg(p: P): string {
  const s: string[] = [];
  const G = GRAV_PLUG;
  GRAVITY_PINS.forEach((n, i) => {
    const y0 = gravPinY(i), y1 = gravHousingY(n);
    const pts: V3[] = [[G.x, y0, 2.6], [G.x - 6, y0, 2.4], [GRAV_HOUSING.x + GRAV_HOUSING.len + 9, y1 - 3, 1.3], [GRAV_HOUSING.x + GRAV_HOUSING.len, y1, 1.25]];
    s.push(tube(p, catmullLite(pts), COL.cable, 1.05));
  });
  for (const n of GRAVITY_PINS) {
    const y = gravHousingY(n);
    s.push(box(p, GRAV_HOUSING.x, y - GRAV_HOUSING.s / 2, 0, GRAV_HOUSING.len, GRAV_HOUSING.s, GRAV_HOUSING.s, COL.housing, 0.15));
  }
  s.push(box(p, G.x, G.y, VOICE_TOP, G.w, G.d, G.h, COL.socket, 0.4));
  return s.join('');
}
const catmullLite = (pts: V3[]): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    for (let s = 0; s < 8; s++) {
      const t = s / 8, t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as V3);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

// ---------- the speaker (one of the set; cone up)
export function speakerSvg(p: P): string {
  const S = SPEAKER, s: string[] = [];
  s.push(`<path class="iso-halo" d="${k.haloOf({ x: S.x - 4, y: S.y, w: S.w + 8, d: S.d, r: 3 }, 0, 1, p)}"/>`);
  for (const x of [S.x - 4.5, S.x + S.w]) s.push(box(p, x, S.y + 3, 0, 4.5, S.d - 6, 1.6, COL.spk, 1));
  s.push(box(p, S.x, S.y, 0, S.w, S.d, S.h, COL.spk, 2, { bevel: 0.6 }));
  s.push(flatPoly(p, k.roundedPlan({ x: S.x + 3, y: S.y + 2.5, w: S.w - 6, d: S.d - 5, r: 5.5 }), S.h, '#2b2d31'));
  s.push(flatPoly(p, k.roundedPlan({ x: S.x + 9, y: S.y + 4.5, w: S.w - 18, d: S.d - 9, r: 3.5 }), S.h, '#3a3d42'));
  s.push(flatPoly(p, k.roundedPlan({ x: S.x + 16, y: S.y + 6.2, w: S.w - 32, d: S.d - 12.4, r: 1.8 }), S.h, '#4a4e55'));
  for (const w of ['+', '−'] as const) { const t = speakerTerm(w); s.push(box(p, t[0] - 1, t[1] - 0.9, t[2] - 0.9, 1.6, 1.8, 1.8, '#3a3a3a', 0.2)); }
  return s.join('');
}

// ---------- parts that sit in the breadboard
const RES_BANDS: Record<number, string[]> = { 10000: ['#7a4a2a', '#1b1b1b', '#1b1b1b', '#d23a2a', '#7a4a2a'], 1000: ['#7a4a2a', '#1b1b1b', '#1b1b1b', '#7a4a2a', '#7a4a2a'] };
function onBoardSvg(p: P, it: Item): string {
  const s: string[] = [];
  switch (it.kind) {
    case 'ldr': {
      const a = hole3(it.legs.a.c, it.legs.a.r), b = hole3(it.legs.b.c, it.legs.b.r);
      const c: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, BB.h + 10];
      for (const [h, dx] of [[a, -0.9], [b, 0.9]] as [V3, number][]) s.push(line3(p, [h, add3(h, [0, 0, 3.5]), [c[0] + dx, c[1], c[2]]], COL.lead, 0.5 * p.scale));
      s.push(cyl(p, c[0], c[1], 2.6, c[2], 1.6, COL.ldr, 24));
      const zz: k.Plane[] = [];
      for (let i = 0; i <= 6; i++) zz.push([c[0] - 1.6 + i * 0.53, c[1] + (i % 2 ? 1.5 : -1.5)]);
      s.push(`<path d="${k.onTop(zz, c[2] + 1.6, p)}" fill="none" stroke="${COL.ldrTrack}" stroke-width="${(0.32 * p.scale).toFixed(2)}" stroke-linejoin="round"/>`);
      break;
    }
    case 'resistor': {
      const a = hole3(it.legs.a.c, it.legs.a.r), b = hole3(it.legs.b.c, it.legs.b.r);
      const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, BB.h + 3];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const e1: V3 = [mid[0] - ux * 3.15, mid[1] - uy * 3.15, mid[2]], e2: V3 = [mid[0] + ux * 3.15, mid[1] + uy * 3.15, mid[2]];
      s.push(line3(p, [a, add3(a, [0, 0, 2.2]), [mid[0] - ux * 3.8, mid[1] - uy * 3.8, mid[2]], e1], COL.lead, 0.5 * p.scale));
      s.push(line3(p, [b, add3(b, [0, 0, 2.2]), [mid[0] + ux * 3.8, mid[1] + uy * 3.8, mid[2]], e2], COL.lead, 0.5 * p.scale));
      const bands = RES_BANDS[it.ohms].map((color, i) => ({ s: [0.16, 0.3, 0.44, 0.58, 0.84][i], w: 0.08, color }));
      s.push(rod(p, e1, e2, 1.2, COL.resBody, bands));
      break;
    }
    case 'button': {
      const hs = Object.values(it.legs).map((h) => hole3(h.c, h.r));
      const cx = hs.reduce((q, h) => q + h[0], 0) / 4, cy = hs.reduce((q, h) => q + h[1], 0) / 4;
      for (const h of hs) s.push(box(p, h[0] - 0.5, h[1] - 0.25, BB.h, 1, 0.5, 1.6, COL.metal, 0));
      s.push(box(p, cx - 6, cy - 6, BB.h + 0.3, 12, 12, 3.4, COL.btn, 0.4));
      s.push(box(p, cx - 6, cy - 6, BB.h + 3.7, 12, 12, 0.35, COL.metal, 0.3));
      for (const [dx, dy] of [[-4.6, -4.6], [4.6, -4.6], [-4.6, 4.6], [4.6, 4.6]]) s.push(flatPoly(p, k.circleRing(cx + dx, cy + dy, 0.7, 12), BB.h + 4.05, '#1b1c1f'));
      const capC = it.cap === 'green' ? COL.capGreen : COL.capRed;
      s.push(cyl(p, cx, cy, 6.4, BB.h + 4.05, 1.3, capC, 36), cyl(p, cx, cy, 5.9, BB.h + 5.35, 6.2, capC, 36));
      break;
    }
    case 'capacitor': {
      const a = hole3(it.legs.plus.c, it.legs.plus.r), b = hole3(it.legs.minus.c, it.legs.minus.r);
      const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, z0 = BB.h + 1.2, H = 20, R = 5;
      s.push(line3(p, [a, [a[0], a[1], z0]], COL.lead, 0.55 * p.scale), line3(p, [b, [b[0], b[1], z0]], COL.lead, 0.55 * p.scale));
      s.push(cyl(p, cx, cy, R, z0, H, COL.capCan, 40));
      // the stripe (and its minus signs) sits above the minus leg
      const mid = Math.atan2(b[1] - cy, b[0] - cx);
      const arc = (z: number, from: number, to: number) => Array.from({ length: 13 }, (_, i) => { const t = from + ((to - from) * i) / 12; return [cx + R * 1.004 * Math.cos(t), cy + R * 1.004 * Math.sin(t), z] as V3; });
      const [vx, vy] = k.towardViewer(p);
      const facing = Math.atan2(vy, vx);
      const lo = Math.max(mid - 0.8, facing - Math.PI / 2 + 0.05), hi = Math.min(mid + 0.8, facing + Math.PI / 2 - 0.05);
      if (hi > lo) {
        const ring = [...arc(z0 + 0.6, lo, hi), ...arc(z0 + H - 0.6, hi, lo)];
        s.push(`<path d="${k.pathOf(ring.map((q) => k.iso(q, p)), true)}" fill="${COL.capStripe}"/>`);
        const m = (lo + hi) / 2;
        for (let i = 0; i < 4; i++) {
          const z = z0 + 3.5 + i * 4.4;
          s.push(line3(p, [[cx + R * 1.01 * Math.cos(m - 0.18), cy + R * 1.01 * Math.sin(m - 0.18), z], [cx + R * 1.01 * Math.cos(m + 0.18), cy + R * 1.01 * Math.sin(m + 0.18), z]], COL.capCan, 0.55 * p.scale));
        }
      }
      s.push(flatPoly(p, k.circleRing(cx, cy, R - 0.5, 36), z0 + H + 0.01, '#c3c9d1'));
      s.push(`<path d="${k.onTop([[cx - 2.6, cy], [cx + 2.6, cy]], z0 + H + 0.02, p)}${k.onTop([[cx, cy - 2.6], [cx, cy + 2.6]], z0 + H + 0.02, p)}" stroke="#8d949c" stroke-width="${(0.35 * p.scale).toFixed(2)}" fill="none"/>`);
      break;
    }
    default:
      break;
  }
  return s.join('');
}

// ---------- jumper housings (the plastic at each end of a jumper wire)
function housingSvg(p: P, e: WireItem['from']): string {
  const a = anchorOf(e);
  const h = HOUSING.s / 2;
  if (a.housing === 'up') return box(p, a.seat[0] - h, a.seat[1] - h, a.seat[2] + 0.2, HOUSING.s, HOUSING.s, HOUSING.len - 0.2, COL.housing, 0.15);
  if (a.housing === '+y') return box(p, a.seat[0] - h, a.seat[1], a.seat[2] - h, HOUSING.s, 14, HOUSING.s, COL.housing, 0.15);
  if (a.housing === '-x') return box(p, a.at[0], a.seat[1] - h, 0, HOUSING.len, HOUSING.s, HOUSING.s, COL.housing, 0.15);
  // soldered speaker wire: a small bright solder joint on the hole
  if (e.kind === 'voice') return flatPoly(p, k.circleRing(a.seat[0], a.seat[1], 0.9, 16), a.seat[2] + 0.05, '#d9dde2');
  return '';
}

// ---------- everything, at rest
// A wire is painted as three pieces, each at its own depth: the housing at each end (where it sits) and the tube
// (at the nearest point of its route, since wires arch over the parts they cross).
export type BuiltItem = { id: string; kind: Item['kind']; depth: number; svg: string; wire?: { pts: V3[]; color: string; d: number; from: string; to: string; fromDepth: number; toDepth: number } };
export type Built = { back: string; front: string; items: Map<string, BuiltItem> };
export function buildBench(p: P): Built {
  const items = new Map<string, BuiltItem>();
  const depthAt = (q: V3) => k.depthOf([q[0], q[1], 0], p);
  for (const it of ITEMS) {
    if (it.kind === 'wire') {
      const pts = wirePath(it);
      items.set(it.id, {
        id: it.id, kind: it.kind, depth: Math.max(...pts.map(depthAt)) - 2, svg: '',
        wire: {
          pts, color: WIRE_COLORS[it.color], d: it.wire === 'speaker wire' ? 1.0 : 1.5, from: housingSvg(p, it.from), to: housingSvg(p, it.to),
          fromDepth: depthAt(anchorOf(it.from).seat) + 0.6, toDepth: depthAt(anchorOf(it.to).seat) + 0.6,
        },
      });
      continue;
    }
    let svg = '', depth = 0;
    switch (it.kind) {
      case 'pir': svg = pirSvg(p); depth = depthAt([PIR.x + PIR.w / 2, PIR.y, 0]); break;
      case 'voice': svg = voiceSvg(p); depth = depthAt([VOICE.x, VOICE.y, 0]); break;
      case 'gravity': svg = gravitySvg(p); depth = depthAt([GRAV_HOUSING.x, -30, 0]); break;
      case 'speaker': svg = speakerSvg(p); depth = depthAt([SPEAKER.x, SPEAKER.y, 0]); break;
      default: {
        svg = onBoardSvg(p, it);
        const hs = Object.values(it.legs).map((h) => hole3(h.c, h.r));
        depth = depthAt([hs.reduce((q, h) => q + h[0], 0) / hs.length, hs.reduce((q, h) => q + h[1], 0) / hs.length, 0]);
      }
    }
    items.set(it.id, { id: it.id, kind: it.kind, depth, svg });
  }
  const uno = unoSvg(p);
  return { back: matSvg(p) + uno.back, front: uno.front + breadboardSvg(p), items };
}

// ---------- the USB-C cable (slides in for a test, out for wiring)
export function usbSvg(p: P, out: number): string {
  const dx = -24 * out, y = USB_C.y + USB_C.d / 2, z = USB_C.z + USB_C.h / 2;
  const pts: V3[] = [[-13 + dx, y, z], [-30 + dx, y, z], [-46 + dx, y + 16, 2.2], [-58 + dx, y + 44, 1.8], [-62 + dx, y + 70, 1.8]];
  return tube(p, catmullLite(pts), '#2c2d30', 3.6)
    + box(p, -13 + dx, y - 3.6, z - 2, 11.8, 7.2, 4, '#3a3c40', 0.8)
    + box(p, -1.6 + dx, y - 2.6, z - 1.2, 2.4 + 0.4, 5.2, 2.4, COL.metal, 0.6);
}
