// Pure geometry (no React, no DOM), so the scripts can use it too.
// Ported from video/engine.js: the same Arduino pin positions (mm) and breadboard hole grid.

export type Pt = { x: number; y: number };
export type Row = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | '+t' | '-t' | '-b' | '+b';
export type Hole = { c: number; r: Row };

// ---------- Arduino UNO R4 WiFi (top view, USB-C on the left). k = pixels per millimetre.
export const UNO_TOP: Record<string, number> = {
  SCL: 18.8, SDA: 21.34, AREF: 23.88, GNDT: 26.42, D13: 28.96, D12: 31.5, D11: 34.04, D10: 36.58, D9: 39.12,
  D8: 41.66, D7: 45.72, D6: 48.26, D5: 50.8, D4: 53.34, D3: 55.88, D2: 58.42, D1: 60.96, D0: 63.5,
};
export const UNO_BOT: Record<string, number> = {
  NC: 27.94, IOREF: 30.48, RESET: 33.02, '3V3': 35.56, '5V': 38.1, GND: 40.64, GND2: 43.18, VIN: 45.72,
  A0: 50.8, A1: 53.34, A2: 55.88, A3: 58.42, A4: 60.96, A5: 63.5,
};
export const UNO_LABEL: Record<string, string> = {
  SCL: 'SCL', SDA: 'SDA', AREF: 'AREF', GNDT: 'GND', D13: '13', D12: '12', D11: '~11', D10: '~10', D9: '~9', D8: '8',
  D7: '7', D6: '~6', D5: '~5', D4: '4', D3: '~3', D2: '2', D1: 'TX 1', D0: 'RX 0', NC: '', IOREF: 'IOREF', RESET: 'RESET',
  '3V3': '3.3V', '5V': '5V', GND: 'GND', GND2: 'GND', VIN: 'VIN', A0: 'A0', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4', A5: 'A5',
};
export const UNO_W_MM = 68.6;
export const UNO_H_MM = 53.3;

export const unoPin = (x: number, y: number, k: number, name: string): Pt => {
  if (name in UNO_TOP) return { x: x + UNO_TOP[name] * k, y: y + 2.54 * k };
  if (name in UNO_BOT) return { x: x + UNO_BOT[name] * k, y: y + 50.8 * k };
  throw new Error(`unknown Arduino pin ${name}`);
};

// ---------- Breadboard (400 points): 30 columns, rows a-j, a rail pair on each long side.
// Drawn like the Tinytronics 000070 board: top pair + outside / - inside, bottom pair - inside / + outside.
// (Real boards differ; the video always says: follow the red/blue lines printed on YOUR board.)
export const BB_COLS = 30;
export const BB_MARGIN = 24;
export const rowY = (r: Row, p: number): number => {
  const map: Record<string, number> = { '+t': 16, '-t': 16 + p, '-b': 16 + 16 * p, '+b': 16 + 17 * p };
  if (r in map) return map[r];
  const i = 'abcdefghij'.indexOf(r);
  return 16 + (i < 5 ? 3 + i : 10 + (i - 5)) * p;
};
export const bbSize = (p: number) => ({ W: BB_MARGIN * 2 + (BB_COLS - 1) * p, H: 32 + 17 * p });
export const bbHole = (x: number, y: number, p: number, h: Hole): Pt => ({ x: x + BB_MARGIN + (h.c - 1) * p, y: y + rowY(h.r, p) });

// ---------- The workbench layout used in every wiring scene (same as the old video).
export const BENCH = {
  uno: { x: 40, y: 180, k: 5.2 },
  bb: { x: 470, y: 150, p: 13.2 },
  pir: { x: 1010, y: 250, s: 1 },
  voice: { x: 1010, y: 18, s: 1 },
};
export const H = (c: number, r: Row): Pt => bbHole(BENCH.bb.x, BENCH.bb.y, BENCH.bb.p, { c, r });
export const P = (name: string): Pt => unoPin(BENCH.uno.x, BENCH.uno.y, BENCH.uno.k, name);

// ---------- Maths
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const back = (t: number) => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
// linear progress of t through [t0, t0 + d]
export const prog = (t: number, t0: number, d = 0.5) => clamp((t - t0) / d);
// fade in at t0, out at t1
export const win = (t: number, t0: number, t1: number, f = 0.35) => Math.min(prog(t, t0, f), 1 - prog(t, t1 - f, f));
export const pulse = (t: number, speed = 2.2) => 0.5 + 0.5 * Math.sin(t * speed * Math.PI);

// Catmull-Rom through the points -> smooth cubic Bezier path (engine.js V.smooth).
export const smooth = (pts: [number, number][], tension = 0.5): string => {
  if (pts.length < 2) return '';
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

// Camera: [x, y, w, h] view box with the stage aspect ratio (1280 x 564).
export const STAGE_W = 1280, STAGE_H = 564;
export type Box = [number, number, number, number];
export const camBox = (cx: number, cy: number, w: number): Box => { const h = (w * STAGE_H) / STAGE_W; return [cx - w / 2, cy - h / 2, w, h]; };
export const FULL: Box = [0, 0, STAGE_W, STAGE_H];
export const cameraAt = (t: number, keys: [number, Box][]): Box => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [t0, b0] = keys[i - 1], [t1, b1] = keys[i];
      const q = ease(clamp((t - t0) / (t1 - t0)));
      return b0.map((v, j) => lerp(v, b1[j], q)) as Box;
    }
  }
  return keys[keys.length - 1][1];
};
