// Robin's workbench in 3D, for the isometric (anatomy-style) build video. Pure data, no React.
// Units are millimetres: x runs along the breadboard, y towards the viewer, z up; the table top is z = 0.
// Every hole and pin is the logical one from src/data/wiring.ts (checked by scripts/netcheck.ts), so this
// picture and the drawn build guide always agree on where each wire goes. Sizes are the parts' real ones
// (UNO R4 WiFi 68.6 x 53.3, breadboard 84 x 55 x 8.5, DFR0534 30 x 22, HC-SR501 32 x 24, 2.54 mm pitch).
import { Row, UNO_BOT, UNO_TOP } from '../data/geom';
import { BOTTOM_HOLES, GRAVITY_PINS, PIR_PINS, TOP_HOLES } from '../data/modules';
import type { End, WireItem } from '../data/wiring';
import type { Point3 } from './kit/iso-kit';

export const PITCH = 2.54;
export type V3 = Point3;
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul3 = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const len3 = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const UP: V3 = [0, 0, 1];

// ---------- Arduino UNO R4 WiFi: USB-C and the barrel jack at x = 0, the digital header at the back (y = 2.54).
export const UNO = { x: 0, y: 0, w: 68.58, d: 53.34, z: 1.5, t: 1.6 };
export const PCB_TOP = UNO.z + UNO.t;
export const HEADER_H = 8.5;
export const HEADER_TOP = PCB_TOP + HEADER_H;
export const unoPinXY = (name: string): [number, number] => {
  if (name in UNO_TOP) return [UNO.x + UNO_TOP[name], UNO.y + 2.54];
  if (name in UNO_BOT) return [UNO.x + UNO_BOT[name], UNO.y + 50.8];
  throw new Error(`unknown Arduino pin ${name}`);
};
// The four female header strips, as [first pin, last pin, y].
export const HEADERS: [string, string][] = [['SCL', 'D8'], ['D7', 'D0'], ['NC', 'VIN'], ['A0', 'A5']];
export const USB_C = { x: -1.2, y: 6.2, w: 8.6, d: 8.8, z: PCB_TOP, h: 3.2 }; // port centre y = 10.6
export const MATRIX = { x0: 30.2, y0: 31.4, pitch: 1.92 }; // 12 x 8 LEDs, row 0 at the back

// ---------- Breadboard (400 points): 30 columns, rows a-j, a rail pair on each long side.
// Drawn like the build guide: top pair + outside / - inside, bottom pair - inside / + outside.
export const BB = { x: 82, y: -0.8, w: 84, d: 55, h: 8.5 };
export const BB_MX = (BB.w - 29 * PITCH) / 2;
export const BB_MY = (BB.d - 17 * PITCH) / 2;
export const ROW_U: Record<Row, number> = { '+t': 0, '-t': 1, a: 3, b: 4, c: 5, d: 6, e: 7, f: 10, g: 11, h: 12, i: 13, j: 14, '-b': 16, '+b': 17 };
export const ROWS: Row[] = ['+t', '-t', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', '-b', '+b'];
export const colX = (c: number) => BB.x + BB_MX + (c - 1) * PITCH;
export const rowYu = (u: number) => BB.y + BB_MY + u * PITCH;
export const rowY = (r: Row) => rowYu(ROW_U[r]);
export const hole3 = (c: number, r: Row): V3 => [colX(c), rowY(r), BB.h];

// ---------- HC-SR501 PIR, standing on its edge with its back (knobs, jumper, pins) towards the viewer.
// The pins stick out of the back; seen from behind their order is the mirror of the front (where the labels are).
export const PIR = { x: 186, y: 25, w: 32, t: 1.2, z: 0.6, h: 24 };
export const PIR_BACK = PIR.y + PIR.t;
export const PIR_PIN_Z = PIR.z + 2.2;
export const PIR_PIN_LEN = 6;
export const PIR_BACK_ORDER = [...PIR_PINS].reverse();
export const pirPinX = (name: string) => {
  const i = PIR_BACK_ORDER.indexOf(name as (typeof PIR_PINS)[number]);
  if (i < 0) throw new Error(`PIR has no pin ${name}`);
  return PIR.x + PIR.w / 2 + (i - 1) * PITCH;
};

// ---------- DFR0534 voice module, flat on the table, well away from the Arduino.
// Gravity socket (T R - +) on its left end, holes VCC GND RX TX BUSY at the back, ONE DACR DACL SP- SP+ at the front.
export const VOICE = { x: 182, y: -50, w: 30, d: 22, z: 0.5, t: 1.6 };
export const VOICE_TOP = VOICE.z + VOICE.t;
export const GRAV_SOCKET = { x: VOICE.x + 0.6, y: -44.4, w: 6, d: 10.8, h: 5.6 };
export const gravPinY = (i: number) => GRAV_SOCKET.y + 1.65 + i * 2.5;
export const voiceHoleXY = (name: string): [number, number] => {
  const t = (TOP_HOLES as readonly string[]).indexOf(name);
  if (t >= 0) return [191.4 + t * PITCH, -47.2];
  const b = (BOTTOM_HOLES as readonly string[]).indexOf(name);
  if (b >= 0) return [191.4 + b * PITCH, -30.8];
  throw new Error(`DFR0534 has no hole ${name}`);
};
// The Gravity cable: white plug in the socket, 4 wires, 4 female housings lying behind the breadboard.
export const GRAV_PLUG = { x: 176.2, y: -43.6, w: 7, d: 9.2, h: 4.8 };
export const GRAV_HOUSING = { x: 150, len: 14, y0: -18.4, gap: 2.8, s: 2.5 };
export const gravHousingY = (name: string) => {
  const i = (GRAVITY_PINS as readonly string[]).indexOf(name);
  if (i < 0) throw new Error(`Gravity cable has no wire ${name}`);
  return GRAV_HOUSING.y0 + i * GRAV_HOUSING.gap;
};

// ---------- One 8 ohm 2 W speaker of the set, cone up, to the right of the module.
export const SPEAKER = { x: 220, y: -54, w: 40, d: 16, h: 12.5 };
export const speakerTerm = (which: '+' | '−'): V3 => [SPEAKER.x - 0.5, SPEAKER.y + (which === '+' ? 6 : 10), 6];

// ---------- Jumper wires: a plastic housing at each end, the wire leaves the housing's far end.
export const HOUSING = { len: 11, s: 2.5 };
export type Anchor = { at: V3; dir: V3; seat: V3; housing: 'up' | '+y' | '-x' | null };
// at = where the wire itself leaves; seat = where the pin or housing sits; dir = which way the wire leaves.
export function anchorOf(e: End): Anchor {
  switch (e.kind) {
    case 'hole': {
      const p = hole3(e.c, e.r);
      return { seat: p, at: add3(p, [0, 0, HOUSING.len]), dir: UP, housing: 'up' };
    }
    case 'uno': {
      const [x, y] = unoPinXY(e.pin);
      const p: V3 = [x, y, HEADER_TOP];
      return { seat: p, at: add3(p, [0, 0, HOUSING.len]), dir: UP, housing: 'up' };
    }
    case 'pir': {
      const p: V3 = [pirPinX(e.pin), PIR_BACK + 1, PIR_PIN_Z];
      return { seat: p, at: add3(p, [0, 14, 0]), dir: [0, 1, 0], housing: '+y' };
    }
    case 'grav': {
      // the male pin goes into the cable's female housing; the jumper's own housing continues towards -x
      const p: V3 = [GRAV_HOUSING.x, gravHousingY(e.pin), GRAV_HOUSING.s / 2];
      return { seat: p, at: add3(p, [-HOUSING.len, 0, 0]), dir: [-1, 0, 0], housing: '-x' };
    }
    case 'voice': {
      const [x, y] = voiceHoleXY(e.pin);
      return { seat: [x, y, VOICE_TOP], at: [x, y, VOICE_TOP + 0.6], dir: UP, housing: null };
    }
    case 'spk': {
      const p = speakerTerm(e.pin);
      return { seat: p, at: p, dir: [-1, 0, 0.15], housing: null };
    }
  }
}

// Extra waypoints (world mm) for wires that would otherwise cross a part; the rest arc freely.
export const WIRE_VIA: Record<string, V3[]> = {
  w5v: [[50, 62, 26], [76, 60, 24]],
  wgnd: [[52, 59, 23], [74, 57, 21]],
  wPO: [[170, 63, 12], [100, 66, 16], [62, 62, 26]],
  wT: [[112, -22, 24], [72, -12, 28]],
  wD1: [[104, -8, 30]],
  wSPp: [[214, -36, 10]],
  wSPm: [[212, -38, 9]],
};

// ---------- Curves: centripetal Catmull-Rom through the control points (no overshoot or loops when the points
// are unevenly spaced), with mirrored phantom points at both ends.
export function catmull(pts: V3[], per = 10): V3[] {
  const n = pts.length;
  const P = [sub3(mul3(pts[0], 2), pts[1]), ...pts, sub3(mul3(pts[n - 1], 2), pts[n - 2])];
  const out: V3[] = [];
  const knot = (t: number, a: V3, b: V3) => t + Math.max(1e-4, Math.sqrt(len3(sub3(b, a))));
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const t0 = 0, t1 = knot(t0, p0, p1), t2 = knot(t1, p1, p2), t3 = knot(t2, p2, p3);
    const lerp = (a: V3, b: V3, ta: number, tb: number, t: number) => add3(mul3(a, (tb - t) / (tb - ta)), mul3(b, (t - ta) / (tb - ta)));
    for (let s = 0; s < per; s++) {
      const t = t1 + ((t2 - t1) * s) / per;
      const a1 = lerp(p0, p1, t0, t1, t), a2 = lerp(p1, p2, t1, t2, t), a3 = lerp(p2, p3, t2, t3, t);
      const b1 = lerp(a1, a2, t0, t2, t), b2 = lerp(a2, a3, t1, t3, t);
      out.push(lerp(b1, b2, t1, t2, t));
    }
  }
  out.push(pts[n - 1]);
  return out;
}

// The 3D path of a wire: out of one housing, a low arch (through any waypoints), into the other.
export function wirePath(w: WireItem): V3[] {
  const a = anchorOf(w.from), b = anchorOf(w.to);
  const dist = len3(sub3(a.at, b.at));
  const e = w.wire === 'speaker wire' ? 3 : Math.max(4, Math.min(11, dist * 0.22));
  const pts: V3[] = [a.at, add3(a.at, mul3(a.dir, e)), ...(WIRE_VIA[w.id] ?? []), add3(b.at, mul3(b.dir, e)), b.at];
  return catmull(pts, 10);
}
