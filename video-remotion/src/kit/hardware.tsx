// Hardware drawings (SVG), ported from video/engine.js and extended for the 30 Sep parts.
import React from 'react';
import faces from '../gen/faces.json';
import { BB_COLS, BB_MARGIN, bbSize, clamp, Pt, pulse, Row, rowY, UNO_BOT, UNO_H_MM, UNO_LABEL, UNO_TOP, UNO_W_MM } from '../data/geom';
import { BOTTOM_HOLES, GRAVITY_CABLE_LEN, GRAVITY_PINS, gravityPinY, HOLE_BOTTOM_Y, HOLE_TOP_Y, holeX, TOP_HOLES, VOICE_H, VOICE_W } from '../data/modules';

export type FaceName = keyof typeof faces;
const FACES = faces as Record<string, number[][]>;
const OFF_LED = '#0b5f63';

// ---------- 12 x 8 LED matrix = Robin's face
export const LedMatrix: React.FC<{ x0: number; y0: number; pitch: number; r: number; face: string | null; power?: boolean }> = ({ x0, y0, pitch, r, face, power = true }) => {
  const grid = power && face ? FACES[face] : null;
  const dots: React.ReactNode[] = [];
  for (let row = 0; row < 8; row++) for (let col = 0; col < 12; col++) {
    const on = !!grid && grid[row][col] === 1;
    const cx = x0 + col * pitch, cy = y0 + row * pitch;
    dots.push(
      <g key={`${row}-${col}`}>
        {on && <circle cx={cx} cy={cy} r={r * 2.2} fill="#ff3b30" opacity={0.28} />}
        <circle cx={cx} cy={cy} r={r} fill={on ? '#ff5a4a' : OFF_LED} />
      </g>,
    );
  }
  return <g>{dots}</g>;
};
// Tessa-style happy face with a 150 ms blink every few seconds (like the firmware).
export const blinkFace = (t: number, seed = 0) => (((t + seed) % (4.2 + (seed % 3) * 0.7)) < 0.15 ? 'blink' : 'happy');

// ---------- Arduino UNO R4 WiFi (top view, USB-C on the left). k = px per mm.
export const Arduino: React.FC<{ x: number; y: number; k?: number; power?: boolean; face?: string | null; labels?: boolean }> = ({ x, y, k = 5.2, power = false, face = null, labels = true }) => {
  const W = UNO_W_MM * k, Hh = UNO_H_MM * k;
  const pin = (name: string, mx: number, my: number, below: boolean) => {
    const lab = UNO_LABEL[name];
    const long = lab.length > 2;
    const ty = below ? my + 3.3 : my - 3.1;
    return (
      <g key={name}>
        <rect x={(mx - 0.55) * k} y={(my - 0.55) * k} width={1.1 * k} height={1.1 * k} fill="#6b6b6b" />
        {labels && lab && (long ? (
          <text x={mx * k} y={ty * k} fontSize={1.45 * k} fill="#e8fbfb" fontWeight={700} textAnchor={below ? 'end' : 'start'} transform={`rotate(-90 ${mx * k} ${ty * k})`} dy={0.5 * k}>{lab}</text>
        ) : (
          <text x={mx * k} y={(below ? ty + 0.8 : ty) * k} fontSize={1.55 * k} textAnchor="middle" fill="#e8fbfb" fontWeight={800}>{lab}</text>
        ))}
      </g>
    );
  };
  const mx0 = 33 * k, my0 = 18.5 * k, pitch = 2.05 * k;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={3} y={4} width={W} height={Hh} rx={3 * k} fill="#000" opacity={0.12} />
      <rect x={0} y={0} width={W} height={Hh} rx={2.6 * k} fill="#0f8a8f" stroke="#0a5e62" strokeWidth={2} />
      {[[14, 2.5], [15.3, 50.7], [66.1, 7.6], [66.1, 35.5]].map(([mx, my], i) => <circle key={i} cx={mx * k} cy={my * k} r={1.6 * k} fill="#f4f1ea" stroke="#c9c3b5" strokeWidth={1} />)}
      <rect x={-2.2 * k} y={8 * k} width={8.5 * k} height={5 * k} rx={2 * k} fill="#cfd6dc" stroke="#8a949c" strokeWidth={1.2} />
      <rect x={-1.2 * k} y={9.6 * k} width={5 * k} height={1.8 * k} rx={0.9 * k} fill="#5d666e" />
      <text x={7.8 * k} y={11.9 * k} fontSize={1.9 * k} fill="#d9f2f2" fontWeight={800}>USB-C</text>
      <rect x={-2.5 * k} y={37 * k} width={13 * k} height={9 * k} rx={1 * k} fill="#262626" />
      <rect x={9 * k} y={17 * k} width={15 * k} height={12 * k} rx={0.8 * k} fill="#c7ccd1" stroke="#9aa2a9" strokeWidth={1} />
      <text x={16.5 * k} y={23.8 * k} fontSize={1.7 * k} textAnchor="middle" fill="#4b545c" fontWeight={800}>ESP32-S3</text>
      <rect x={11 * k} y={32 * k} width={7 * k} height={7 * k} fill="#1f1f1f" />
      <text x={14.5 * k} y={36 * k} fontSize={1.3 * k} textAnchor="middle" fill="#aaa">RA4M1</text>
      <rect x={3 * k} y={2 * k} width={4 * k} height={4 * k} rx={0.6 * k} fill="#e0e0e0" stroke="#9e9e9e" />
      <circle cx={5 * k} cy={4 * k} r={1.2 * k} fill="#b0b0b0" />
      <rect x={26.2 * k} y={30 * k} width={2.2 * k} height={1.3 * k} rx={0.3 * k} fill={power ? '#5cff5c' : '#3b5b3b'} />
      <text x={27.3 * k} y={34 * k} fontSize={1.5 * k} fill="#d9f2f2" fontWeight={800} textAnchor="middle">ON</text>
      <text x={12.5 * k} y={45 * k} fontSize={2.3 * k} fill="#e8fbfb" fontWeight={900}>UNO R4 WiFi</text>
      {[[17.5, 42.95, 2.54], [44.45, 64.8, 2.54], [26.65, 47.0, 50.8], [49.5, 64.8, 50.8]].map(([x0, x1, yy], i) => (
        <rect key={i} x={x0 * k} y={(yy - 1.6) * k} width={(x1 - x0) * k} height={3.2 * k} rx={0.4 * k} fill="#1b1b1b" />
      ))}
      {Object.entries(UNO_TOP).map(([n, mx]) => pin(n, mx, 2.54, true))}
      {Object.entries(UNO_BOT).map(([n, mx]) => pin(n, mx, 50.8, false))}
      <rect x={mx0 - 1.6 * k} y={my0 - 1.6 * k} width={11 * pitch + 3.2 * k} height={7 * pitch + 3.2 * k} rx={1 * k} fill="#0b6d71" />
      <LedMatrix x0={mx0} y0={my0} pitch={pitch} r={pitch * 0.34} face={face} power={power} />
    </g>
  );
};

// USB-C cable plugged into the Arduino (for the test moments). p = 0..1 slides it in.
export const UsbCable: React.FC<{ x: number; y: number; k: number; p: number }> = ({ x, y, k, p }) => {
  if (p <= 0) return null;
  const px = x - 2.2 * k, py = y + 10.5 * k, dx = -(1 - (1 - Math.pow(1 - clamp(p), 3))) * 90;
  return (
    <g transform={`translate(${dx} 0)`}>
      <path d={`M${px - 38},${py} C${px - 120},${py} ${px - 140},${py + 120} ${px - 260},${py + 160}`} fill="none" stroke="#3d3d3d" strokeWidth={9} strokeLinecap="round" />
      <rect x={px - 44} y={py - 11} width={40} height={22} rx={5} fill="#e0e0e0" stroke="#9e9e9e" strokeWidth={1.5} />
      <rect x={px - 6} y={py - 5} width={10} height={10} rx={2} fill="#b0b0b0" />
    </g>
  );
};

// ---------- breadboard (400 points). xray = metal strips; rails / groups = highlights.
export const Breadboard: React.FC<{ x: number; y: number; p?: number; xray?: number; rails?: Partial<Record<Row, number>>; groups?: { c: number; half: 'top' | 'bottom'; color: string; o: number }[]; flip?: boolean }> = ({ x, y, p = 13.2, xray = 0, rails = {}, groups = [], flip = false }) => {
  const { W, H } = bbSize(p), mx = BB_MARGIN;
  const R = (r: Row) => rowY(r, p);
  // flip = draw the rail colours swapped (to show that boards differ)
  const plusRows: Row[] = flip ? ['-t', '+b'] : ['+t', '+b'];
  const railColor = (r: Row) => ((r[0] === '+') !== flip ? '#e53935' : '#1e63d6');
  const railSign = (r: Row) => ((r[0] === '+') !== flip ? '+' : '−');
  void plusRows;
  const cols = Array.from({ length: BB_COLS }, (_, c) => c);
  const rows: Row[] = ['+t', '-t', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', '-b', '+b'];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={3} y={4} width={W} height={H} rx={8} fill="#000" opacity={0.12} />
      <rect x={0} y={0} width={W} height={H} rx={8} fill="#f6f3ec" stroke="#d8d1c3" strokeWidth={2} />
      <rect x={6} y={R('e') + p * 0.9} width={W - 12} height={p * 1.2} rx={3} fill="#e3ddd0" />
      {xray > 0 && (
        <g opacity={xray}>
          {cols.map((c) => (
            <g key={c}>
              <rect x={mx + c * p - p * 0.28} y={R('a') - p * 0.4} width={p * 0.56} height={4.8 * p} rx={2} fill="#b7bec5" />
              <rect x={mx + c * p - p * 0.28} y={R('f') - p * 0.4} width={p * 0.56} height={4.8 * p} rx={2} fill="#b7bec5" />
            </g>
          ))}
          {(['+t', '-t', '-b', '+b'] as Row[]).map((r) => <rect key={r} x={mx - p * 0.4} y={R(r) - p * 0.28} width={(BB_COLS - 1) * p + p * 0.8} height={p * 0.56} rx={2} fill="#b7bec5" />)}
        </g>
      )}
      {Object.entries(rails).map(([r, o]) => (
        <rect key={r} x={mx - p * 0.5} y={R(r as Row) - p * 0.5} width={(BB_COLS - 1) * p + p} height={p} rx={4} fill={railColor(r as Row) === '#e53935' ? '#ef9a9a' : '#90caf9'} opacity={o} />
      ))}
      {groups.map((g, i) => (
        <rect key={i} x={mx + (g.c - 1) * p - p * 0.48} y={R(g.half === 'top' ? 'a' : 'f') - p * 0.5} width={p * 0.96} height={5 * p} rx={4} fill={g.color} opacity={g.o} />
      ))}
      <line x1={mx - p * 0.6} y1={R('+t') - p * 0.62} x2={W - mx + p * 0.6} y2={R('+t') - p * 0.62} stroke={railColor('+t')} strokeWidth={2.2} />
      <line x1={mx - p * 0.6} y1={R('-t') + p * 0.62} x2={W - mx + p * 0.6} y2={R('-t') + p * 0.62} stroke={railColor('-t')} strokeWidth={2.2} />
      <line x1={mx - p * 0.6} y1={R('-b') - p * 0.62} x2={W - mx + p * 0.6} y2={R('-b') - p * 0.62} stroke={railColor('-b')} strokeWidth={2.2} />
      <line x1={mx - p * 0.6} y1={R('+b') + p * 0.62} x2={W - mx + p * 0.6} y2={R('+b') + p * 0.62} stroke={railColor('+b')} strokeWidth={2.2} />
      {(['+t', '-t', '-b', '+b'] as Row[]).map((r) => (
        <g key={r}>
          <text x={10} y={R(r) + 5} textAnchor="middle" fontSize={15} fontWeight={900} fill={railColor(r)}>{railSign(r)}</text>
          <text x={W - 10} y={R(r) + 5} textAnchor="middle" fontSize={15} fontWeight={900} fill={railColor(r)}>{railSign(r)}</text>
        </g>
      ))}
      <g fill="#3b3b3b">
        {cols.map((c) => rows.map((r) => <rect key={`${c}${r}`} x={mx + c * p - 1.7} y={R(r) - 1.7} width={3.4} height={3.4} rx={0.6} />))}
      </g>
      {[1, 5, 10, 15, 20, 25, 30].map((n) => (
        <g key={n}>
          <text x={mx + (n - 1) * p} y={R('a') - p * 0.75} textAnchor="middle" fontSize={8.5} fill="#8a8272" fontWeight={700}>{n}</text>
          <text x={mx + (n - 1) * p} y={R('j') + p * 1.05} textAnchor="middle" fontSize={8.5} fill="#8a8272" fontWeight={700}>{n}</text>
        </g>
      ))}
      {'abcdefghij'.split('').map((r) => (
        <g key={r}>
          <text x={11} y={R(r as Row) + 3} textAnchor="middle" fontSize={8.5} fill="#8a8272" fontWeight={700}>{r}</text>
          <text x={W - 11} y={R(r as Row) + 3} textAnchor="middle" fontSize={8.5} fill="#8a8272" fontWeight={700}>{r}</text>
        </g>
      ))}
    </g>
  );
};

// ---------- small parts (absolute coordinates, same space as the holes)
const Leg: React.FC<{ pts: string }> = ({ pts }) => <polyline points={pts} fill="none" stroke="#9ea7ad" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />;

export const Ldr: React.FC<{ a: Pt; b: Pt; lift?: number }> = ({ a, b, lift = 22 }) => {
  const mxp = (a.x + b.x) / 2, myp = Math.min(a.y, b.y) - lift;
  return (
    <g>
      <Leg pts={`${a.x},${a.y} ${a.x},${myp + 10} ${mxp - 5},${myp + 6}`} />
      <Leg pts={`${b.x},${b.y} ${b.x},${myp + 10} ${mxp + 5},${myp + 6}`} />
      <ellipse cx={mxp} cy={myp} rx={13} ry={11} fill="#f0e6c8" stroke="#b89b52" strokeWidth={1.5} />
      <ellipse cx={mxp} cy={myp} rx={10} ry={8} fill="#e2553f" />
      <path d={`M${mxp - 7},${myp - 4} h12 v2.6 h-12 v2.6 h12 v2.6 h-12`} fill="none" stroke="#f6d58a" strokeWidth={1.4} />
    </g>
  );
};

const BAND: Record<string, string> = { black: '#1b1b1b', brown: '#6d3b1f', red: '#d32f2f', orange: '#ef6c00', gold: '#c9a227' };
export const Resistor: React.FC<{ a: Pt; b: Pt; bands: string[]; lift?: number }> = ({ a, b, bands, lift = 0 }) => {
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2 - lift;
  return (
    <g>
      <Leg pts={`${a.x},${a.y} ${cx},${cy} ${b.x},${b.y}`} />
      <g transform={`translate(${cx} ${cy}) rotate(${ang})`}>
        <rect x={-15} y={-6} width={30} height={12} rx={5} fill="#e3cf9c" stroke="#b59a5a" strokeWidth={1.2} />
        {bands.map((c, i) => <rect key={i} x={-10 + i * 5.5 + (i === 3 ? 3 : 0)} y={-6} width={3} height={12} fill={BAND[c]} />)}
      </g>
    </g>
  );
};

// 12 x 12 tactile button; legs at the four holes (tl, tr, bl, br) across the gap.
export const Button: React.FC<{ tl: Pt; tr: Pt; bl: Pt; br: Pt; cap: string; pressed?: boolean; showLegs?: boolean }> = ({ tl, tr, bl, br, cap, pressed = false, showLegs = false }) => {
  const cx = (tl.x + br.x) / 2, cy = (tl.y + br.y) / 2;
  // 12 x 12 mm square body; its legs (12.5 x 5 mm apart) sit underneath, in rows d and g, two columns apart
  const h = Math.abs(bl.y - tl.y) * 0.96, w = h;
  return (
    <g>
      {[tl, tr, bl, br].map((q, i) => <circle key={i} cx={q.x} cy={q.y} r={3.2} fill="#b9c1c7" stroke="#6d757b" strokeWidth={1} />)}
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4} fill="#2d2d2d" stroke="#111" strokeWidth={1.2} opacity={showLegs ? 0.55 : 1} />
      <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.34} fill={cap} stroke="#00000055" strokeWidth={1.5} opacity={showLegs ? 0.55 : 1} />
      <circle cx={cx - 4} cy={cy - 4} r={4.5} fill="#fff" opacity={0.35} />
      {pressed && <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.34} fill="#000" opacity={0.28} />}
    </g>
  );
};

// Electrolytic capacitor, top view on the bench: body lies just outside the board, legs up into the rails.
// The light stripe with minus signs marks the MINUS leg (the shorter one).
export const CapacitorTop: React.FC<{ plus: Pt; minus: Pt; body?: Pt; r?: number }> = ({ plus, minus, body, r = 15 }) => {
  // body lies just above the rails, so the + leg (to the outer + row) is visibly the longer one, as on the real part
  const b = body ?? { x: (plus.x + minus.x) / 2, y: Math.min(plus.y, minus.y) - 44 };
  const mSide = minus.x < plus.x ? -1 : 1;
  return (
    <g>
      <Leg pts={`${plus.x},${plus.y} ${plus.x},${b.y + 8} ${b.x - 5 * mSide},${b.y}`} />
      <Leg pts={`${minus.x},${minus.y} ${minus.x},${b.y + 8} ${b.x + 5 * mSide},${b.y}`} />
      <circle cx={plus.x} cy={plus.y} r={3.4} fill="#e53935" stroke="#fff" strokeWidth={1} />
      <circle cx={minus.x} cy={minus.y} r={3.4} fill="#1e63d6" stroke="#fff" strokeWidth={1} />
      <circle cx={b.x} cy={b.y} r={r} fill="#1f3f8f" stroke="#10245a" strokeWidth={1.5} />
      <path d={`M${b.x + mSide * r * 0.35},${b.y - r * 0.94} A${r},${r} 0 0 ${mSide > 0 ? 1 : 0} ${b.x + mSide * r * 0.35},${b.y + r * 0.94} Z`} fill="#cfd8e8" />
      {[-0.45, 0, 0.45].map((k, i) => <text key={i} x={b.x + mSide * r * 0.68} y={b.y + k * r + 3} fontSize={8} fontWeight={900} textAnchor="middle" fill="#1f3f8f">−</text>)}
      <circle cx={b.x - mSide * 3} cy={b.y - 3} r={4} fill="#fff" opacity={0.25} />
    </g>
  );
};

// Electrolytic capacitor, side view (for the explanation): can with stripe, long + leg, short − leg.
export const CapacitorSide: React.FC<{ x: number; y: number; s?: number; flip?: boolean }> = ({ x, y, s = 1, flip = false }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <line x1={flip ? 28 : -28} y1={60} x2={flip ? 28 : -28} y2={150} stroke="#9ea7ad" strokeWidth={6} strokeLinecap="round" />
    <line x1={flip ? -28 : 28} y1={60} x2={flip ? -28 : 28} y2={125} stroke="#9ea7ad" strokeWidth={6} strokeLinecap="round" />
    <rect x={-55} y={-110} width={110} height={175} rx={16} fill="#1f3f8f" stroke="#10245a" strokeWidth={3} />
    <rect x={flip ? -55 : 15} y={-110} width={40} height={175} rx={flip ? 0 : 0} fill="#cfd8e8" />
    {[-80, -45, -10, 25].map((yy, i) => <text key={i} x={flip ? -35 : 35} y={yy + 10} fontSize={30} fontWeight={900} textAnchor="middle" fill="#1f3f8f">−</text>)}
    <rect x={-55} y={-110} width={110} height={16} rx={8} fill="#b8c4d6" />
    <text x={flip ? 18 : -18} y={-10} fontSize={20} fontWeight={900} textAnchor="middle" fill="#e8eef8" transform={`rotate(-90 ${flip ? 18 : -18} -10)`}>680µF 25V</text>
  </g>
);

// ---------- HC-SR501 PIR, front view; labels (under the dome) visible when the dome is lifted.
export const Pir: React.FC<{ x: number; y: number; s?: number; dome?: number; labels?: boolean }> = ({ x, y, s = 1, dome = 1, labels = true }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={0} y={0} width={128} height={96} rx={6} fill="#2f7d46" stroke="#1d5530" strokeWidth={2} />
    {[[8, 8], [120, 8], [8, 88], [120, 88]].map(([a, b], i) => <circle key={i} cx={a} cy={b} r={3.6} fill="#f6f3ec" />)}
    {labels && ['VCC', 'OUT', 'GND'].map((t, i) => <text key={t} x={44 + i * 20} y={84} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#e8f5e9">{t}</text>)}
    <g transform={`translate(0 ${-(1 - dome) * 60})`} opacity={0.25 + 0.75 * dome}>
      <circle cx={64} cy={44} r={38} fill="#fbfbf8" stroke="#d6d6cf" strokeWidth={2} />
      {[-2, -1, 0, 1, 2].map((i) => <path key={i} d={`M${64 + i * 13},${9 + Math.abs(i) * 3} Q${64 + i * 16},44 ${64 + i * 13},${79 - Math.abs(i) * 3}`} fill="none" stroke="#e3e3dc" strokeWidth={1.4} />)}
      <path d="M28,44 Q64,36 100,44" fill="none" stroke="#e3e3dc" strokeWidth={1.4} />
      <ellipse cx={52} cy={28} rx={10} ry={6} fill="#fff" opacity={0.9} />
    </g>
    {[44, 64, 84].map((px) => <rect key={px} x={px - 3} y={94} width={6} height={12} fill="#c9a227" />)}
    <rect x={34} y={92} width={60} height={7} fill="#1b1b1b" />
  </g>
);

export const PirBack: React.FC<{ x: number; y: number; s?: number; txDeg: number; sxDeg: number; jumper: 'L' | 'H' }> = ({ x, y, s = 1, txDeg, sxDeg, jumper }) => {
  const knob = (cx: number, label: string, deg: number) => (
    <g>
      <rect x={cx - 11} y={58} width={22} height={22} rx={3} fill="#f28b1f" stroke="#a85a0c" strokeWidth={1.5} />
      <circle cx={cx} cy={69} r={7} fill="#f7b567" stroke="#a85a0c" strokeWidth={1} />
      <line x1={cx} y1={63} x2={cx} y2={75} stroke="#7a3f06" strokeWidth={2.4} strokeLinecap="round" transform={`rotate(${deg} ${cx} 69)`} />
      <text x={cx} y={91} textAnchor="middle" fontSize={9} fontWeight={900} fill="#e8f5e9">{label}</text>
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={0} y={0} width={128} height={96} rx={6} fill="#2f7d46" stroke="#1d5530" strokeWidth={2} />
      <rect x={48} y={30} width={30} height={20} fill="#1b1b1b" />
      <text x={63} y={43} textAnchor="middle" fontSize={6} fill="#9e9e9e">BISS0001</text>
      {knob(30, 'Tx time', txDeg)}
      {knob(98, 'Sx sens.', sxDeg)}
      <text x={18} y={16} fontSize={9} fontWeight={900} fill="#e8f5e9">L</text>
      <text x={18} y={38} fontSize={9} fontWeight={900} fill="#e8f5e9">H</text>
      {[10, 20, 30].map((yy) => <rect key={yy} x={6} y={yy + 1} width={5} height={5} fill="#c9a227" />)}
      <rect x={3.5} y={jumper === 'H' ? 19 : 9} width={10} height={18} rx={2} fill="#1b1b1b" />
    </g>
  );
};

// ---------- DFR0534 voice module, drawn from the board photo in its datasheet (Voice Module V1.0):
// Gravity socket left (T R − +), two rows of holes (VCC GND RX TX BUSY / ONE DACR DACL SP− SP+), SPK socket right.
// The video always says: go by the labels printed on YOUR module.
export type VoiceHighlight = 'socket' | 'holes' | 'sp' | 'spk' | null;
export const VoiceModule: React.FC<{ x: number; y: number; s?: number; highlight?: VoiceHighlight; plugIn?: boolean }> = ({ x, y, s = 1, highlight = null, plugIn = false }) => {
  const hl = (on: boolean, node: React.ReactNode) => (on ? node : null);
  const hole = (hx: number, hy: number, square: boolean, key: string) => (
    <g key={key}>
      {square ? <rect x={hx - 5} y={hy - 5} width={10} height={10} rx={1.5} fill="#d4a62a" /> : <circle cx={hx} cy={hy} r={5.2} fill="#d4a62a" />}
      <circle cx={hx} cy={hy} r={2.4} fill="#111" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={0} y={0} width={VOICE_W} height={VOICE_H} rx={9} fill="#1c1c1c" stroke="#000" strokeWidth={2} />
      {/* mounting holes on the right */}
      <circle cx={VOICE_W - 12} cy={22} r={8} fill="#d4a62a" /><circle cx={VOICE_W - 12} cy={22} r={4.5} fill="#f4f1ea" />
      <circle cx={VOICE_W - 12} cy={VOICE_H - 22} r={8} fill="#d4a62a" /><circle cx={VOICE_W - 12} cy={VOICE_H - 22} r={4.5} fill="#f4f1ea" />
      <text x={VOICE_W / 2} y={-7} fontSize={11} fill="#1d2b3a" fontWeight={900} textAnchor="middle">DFR0534 · voice 8 MB</text>
      {/* Gravity socket (left edge) */}
      {hl(highlight === 'socket', <rect x={-22} y={gravityPinY(0) - 13} width={56} height={gravityPinY(3) - gravityPinY(0) + 26} rx={6} fill="#ffd54f" opacity={0.55} />)}
      <rect x={-16} y={gravityPinY(0) - 10} width={18} height={gravityPinY(3) - gravityPinY(0) + 20} rx={2} fill={plugIn ? '#d0d0d0' : '#f4f4f4'} stroke="#9e9e9e" strokeWidth={1.2} />
      {GRAVITY_PINS.map((n, i) => (
        <g key={n}>
          <rect x={-11} y={gravityPinY(i) - 2} width={9} height={4} fill="#c9a227" />
          <text x={10} y={gravityPinY(i) + 4} fontSize={11} fill="#ffd54f" fontWeight={900}>{n}</text>
        </g>
      ))}
      {/* two rows of holes */}
      {hl(highlight === 'holes', <rect x={holeX(0) - 11} y={2} width={holeX(4) - holeX(0) + 22} height={VOICE_H - 4} rx={6} fill="#ffd54f" opacity={0.35} />)}
      {hl(highlight === 'sp', <rect x={holeX(3) - 11} y={HOLE_BOTTOM_Y - 34} width={holeX(4) - holeX(3) + 22} height={46} rx={6} fill="#ffd54f" opacity={0.6} />)}
      {TOP_HOLES.map((n, i) => hole(holeX(i), HOLE_TOP_Y, n === 'BUSY', `t${n}`))}
      {BOTTOM_HOLES.map((n, i) => hole(holeX(i), HOLE_BOTTOM_Y, n === 'SP+', `b${n}`))}
      {TOP_HOLES.map((n, i) => <text key={`tl${n}`} x={holeX(i)} y={HOLE_TOP_Y + 9} fontSize={6.4} fill="#fff" fontWeight={900} textAnchor="end" transform={`rotate(-90 ${holeX(i)} ${HOLE_TOP_Y + 9})`} dx={-14} dy={2.2}>{n}</text>)}
      {BOTTOM_HOLES.map((n, i) => <text key={`bl${n}`} x={holeX(i)} y={HOLE_BOTTOM_Y - 9} fontSize={6.4} fill="#fff" fontWeight={900} textAnchor="start" transform={`rotate(-90 ${holeX(i)} ${HOLE_BOTTOM_Y - 9})`} dy={2.2}>{n}</text>)}
      {/* SPK socket (right edge): same speaker output, our speaker's plug does not fit */}
      {hl(highlight === 'spk', <rect x={VOICE_W - 8} y={34} width={30} height={34} rx={6} fill="#ffd54f" opacity={0.6} />)}
      <rect x={VOICE_W - 2} y={39} width={16} height={24} rx={2} fill="#f4f4f4" stroke="#9e9e9e" strokeWidth={1.2} />
      <text x={VOICE_W + 17} y={55} fontSize={8} fill="#1d2b3a" fontWeight={900}>SPK</text>
      {/* micro-USB (on the back, right edge) */}
      <rect x={VOICE_W - 1} y={70} width={10} height={14} rx={2} fill="#cfd6dc" stroke="#8a949c" strokeDasharray="2 1.5" />
      <text x={VOICE_W + 12} y={81} fontSize={6.5} fill="#5b6b7b" fontWeight={800}>micro-USB (back)</text>
    </g>
  );
};

// Its Gravity cable: plug on the module, 4 plain grey wires (colours are not documented: go by the letters),
// 4 FEMALE housings at the far end. p = 0..1 draws it; flags = show tape flags with the letters.
export const GravityCable: React.FC<{ x: number; y: number; s?: number; p?: number; flags?: number }> = ({ x, y, s = 1, p = 1, flags = 0 }) => {
  if (p <= 0) return null;
  const L = GRAVITY_CABLE_LEN;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={Math.min(1, p * 2)}>
      {GRAVITY_PINS.map((n, i) => {
        const yy = gravityPinY(i);
        const x0 = -14, x1 = -14 - L * p;
        return (
          <g key={n}>
            <path d={`M${x0},${yy} C${x0 - L * 0.35},${yy} ${x1 + L * 0.35},${yy} ${x1},${yy}`} fill="none" stroke="#8d949a" strokeWidth={3.4} strokeLinecap="round" />
            {p >= 0.98 && (
              <g>
                <rect x={x1 - 18} y={yy - 5} width={18} height={10} rx={1.5} fill="#222" stroke="#000" strokeWidth={0.8} />
                <rect x={x1 - 19} y={yy - 2} width={3} height={4} fill="#555" />
                {flags > 0 && (
                  <g opacity={flags}>
                    <rect x={x1 + 4} y={yy - 7} width={16} height={14} rx={2} fill="#fff59d" stroke="#c0a000" strokeWidth={1} />
                    <text x={x1 + 12} y={yy + 4} fontSize={10} fontWeight={900} textAnchor="middle" fill="#5d4600">{n}</text>
                  </g>
                )}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

// ---------- speaker (front view) + sound waves when it talks
export const Speaker: React.FC<{ cx: number; cy: number; r?: number; t?: number; talking?: boolean }> = ({ cx, cy, r = 36, t = 0, talking = false }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="#3a3a3a" stroke="#1d1d1d" strokeWidth={2} />
    <circle cx={cx} cy={cy} r={r * 0.8} fill="#565656" />
    <circle cx={cx} cy={cy} r={r * 0.62 + (talking ? pulse(t, 9) * 2 : 0)} fill="#2b2b2b" />
    <circle cx={cx} cy={cy} r={r * 0.25} fill="#444" stroke="#222" />
    {talking && (
      <g opacity={0.35 + 0.65 * pulse(t, 3)}>
        {[1, 2, 3].map((i) => <path key={i} d={`M${cx + r + 6 * i},${cy - 14 - 6 * i} Q${cx + r + 14 + 8 * i},${cy} ${cx + r + 6 * i},${cy + 14 + 6 * i}`} fill="none" stroke="#0f8a8f" strokeWidth={3} strokeLinecap="round" />)}
      </g>
    )}
  </g>
);

// ---------- the finished robot: 3/4 view of the Kradex box with the clear lid as the face
export const Robot: React.FC<{ cx: number; cy: number; s?: number; face: string; felt?: boolean }> = ({ cx, cy, s = 1, face, felt = true }) => (
  <g transform={`translate(${cx} ${cy}) scale(${s}) translate(-73 -88)`}>
    <path d="M0,20 L20,0 L166,0 L146,20 Z" fill="#9aa1a8" stroke="#5f666d" strokeWidth={2} />
    <path d="M146,20 L166,0 L166,176 L146,196 Z" fill="#7e858c" stroke="#5f666d" strokeWidth={2} />
    <rect x={0} y={20} width={146} height={176} rx={6} fill="#dfeef3" stroke="#5f666d" strokeWidth={3} />
    {felt && <path d="M146,40 L166,20 L166,150 L146,170 Z" fill="#c9956a" opacity={0.95} />}
    <circle cx={73} cy={50} r={13} fill="#fbfbf8" stroke="#d6d6cf" strokeWidth={2} />
    <rect x={22} y={82} width={102} height={70} rx={6} fill="#0f8a8f" />
    <LedMatrix x0={30} y0={90} pitch={7.8} r={2.6} face={face} />
    <circle cx={60} cy={8} r={6} fill="#2e9e4f" />
    <circle cx={90} cy={8} r={6} fill="#e53935" />
    <ellipse cx={120} cy={8} rx={5} ry={4} fill="#e2553f" />
    {[0, 1, 2, 3].map((i) => <circle key={i} cx={152 + (i % 2) * 7} cy={120 + Math.floor(i / 2) * 9} r={2.4} fill="#2d3136" />)}
  </g>
);
