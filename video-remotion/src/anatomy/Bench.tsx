// The isometric workbench (an anatomy-skill figure) as one SVG: the bench, the Arduino and the breadboard, and every
// part and wire of src/data/wiring.ts at its own place. The video drives it per frame: which items are in (and how
// far they have dropped or grown), what glows, whether the USB cable is in, and which face the LED matrix shows.
import React from 'react';
import facesJson from '../gen/faces.json';
import { Row } from '../data/geom';
import { glowRect, tube } from './draw';
import * as k from './kit/iso-kit';
import { buildBench, Built, ledsSvg, usbSvg } from './parts';
import { BB, colX, HEADER_TOP, PCB_TOP, PIR, rowY, SPEAKER, unoPinXY, V3, VOICE, VOICE_TOP, voiceHoleXY } from './world';

const FACES = facesJson as Record<string, number[][]>;
export const FIG = { w: 848, h: 528 };
export const AZIMUTH = 56, ELEVATION = 40;

// Everything that can be on the bench, so one fixed camera fits all of it.
const BOUNDS: V3[] = [
  [-14, -2, 0], [-14, 56, 0], [70, 56, 0], [70, -2, 0], [0, 0, 16],
  [BB.x, BB.y, 0], [BB.x + BB.w, BB.y + BB.d, 0], [BB.x + BB.w, BB.y + BB.d, 32],
  [PIR.x, PIR.y + 18, 0], [PIR.x + PIR.w, PIR.y + 18, 0], [PIR.x + PIR.w, PIR.y, PIR.h + 1],
  [VOICE.x - 8, VOICE.y, 0], [SPEAKER.x + SPEAKER.w + 5, SPEAKER.y, 0], [SPEAKER.x + SPEAKER.w + 5, SPEAKER.y + SPEAKER.d, 14],
  [136, -20, 0], [130, -24, 40], [60, 64, 0],
];
export const PROJ: k.Projection = k.fitProjection(BOUNDS, FIG.w, FIG.h, { pad: 14, azimuth: AZIMUTH, elevation: ELEVATION });

let built: Built | null = null;
export const bench = () => (built ??= buildBench(PROJ));

// ---------- camera: a named region of the bench, fitted to the figure's aspect ratio
export type ViewBox = [number, number, number, number];
export const FULL_VIEW: ViewBox = [0, 0, FIG.w, FIG.h];
export function viewOf(points: V3[], pad = 18): ViewBox {
  const f = points.map((q) => k.iso(q, PROJ));
  let x0 = Math.min(...f.map((q) => q[0])) - pad, x1 = Math.max(...f.map((q) => q[0])) + pad;
  let y0 = Math.min(...f.map((q) => q[1])) - pad, y1 = Math.max(...f.map((q) => q[1])) + pad;
  const a = FIG.w / FIG.h;
  if ((x1 - x0) / (y1 - y0) < a) { const w = (y1 - y0) * a, c = (x0 + x1) / 2; x0 = c - w / 2; x1 = c + w / 2; }
  else { const h = (x1 - x0) / a, c = (y0 + y1) / 2; y0 = c - h / 2; y1 = c + h / 2; }
  return [x0, y0, x1 - x0, y1 - y0];
}
export const lerpView = (a: ViewBox, b: ViewBox, t: number): ViewBox => a.map((v, i) => v + (b[i] - v) * t) as ViewBox;

// ---------- glows: what the narrator is pointing at, as light on the surface (never a leader line)
export const GLOW = { teal: '#12b5bf', orange: '#f57c00', red: '#e53935', blue: '#1e63d6', green: '#2e9e4f' };
export function glowSvg(spec: string, o: number): string {
  const p = PROJ, [kind, a, b] = spec.split(':');
  switch (kind) {
    case 'rail': {
      const r = a as Row;
      return glowRect(p, colX(1) - 1.7, rowY(r) - 1.15, colX(30) - colX(1) + 3.4, 2.3, BB.h + 0.05, a.startsWith('+') ? GLOW.red : GLOW.blue, o);
    }
    case 'col': { // col:5:bottom
      const c = Number(a), top = b === 'top';
      const y0 = rowY(top ? 'a' : 'f') - 1.2, y1 = rowY(top ? 'e' : 'j') + 1.2;
      return glowRect(p, colX(c) - 1.15, y0, 2.3, y1 - y0, BB.h + 0.05, GLOW.teal, o);
    }
    case 'hole': { const c = Number(a); return glowRect(p, colX(c) - 1.1, rowY(b as Row) - 1.1, 2.2, 2.2, BB.h + 0.05, GLOW.orange, o); }
    case 'pin': {
      return a.split(',').map((n) => { const [x, y] = unoPinXY(n); return glowRect(p, x - 1.3, y - 1.3, 2.6, 2.6, HEADER_TOP + 0.05, GLOW.orange, o); }).join('');
    }
    case 'vhole': {
      return a.split(',').map((n) => { const [x, y] = voiceHoleXY(n); return glowRect(p, x - 1.2, y - 1.2, 2.4, 2.4, VOICE_TOP + 0.05, GLOW.orange, o); }).join('');
    }
    case 'matrix': return glowRect(p, 28.6, 29.8, 24.4, 16.8, PCB_TOP + 0.4, GLOW.teal, o);
    default: return '';
  }
}

export type BenchProps = {
  view: ViewBox;
  progress: (id: string) => number; // 0 = not there yet, 0..1 = dropping in / growing, 1 = in place
  lit?: string[]; // items that glow (the ones being added right now)
  glows?: { spec: string; o: number }[];
  usbOut: number; // 0 = USB-C cable plugged in, 1 = out
  face: string | null;
  talking?: number; // 0..1: the speaker cone pulses
};

const css = `${k.ISO_CSS}
.anat{--anatomy-weight:.9px}
.anat .iso-solid path{vector-effect:non-scaling-stroke}
.anat .lit{filter:drop-shadow(0 0 2.2px #12b5bf) drop-shadow(0 0 1.2px #12b5bf)}`;

const Raw: React.FC<{ svg: string; transform?: string; opacity?: number; className?: string }> = ({ svg, transform, opacity, className }) =>
  svg ? <g transform={transform} opacity={opacity} className={className} dangerouslySetInnerHTML={{ __html: svg }} /> : null;

export const Bench: React.FC<BenchProps> = ({ view, progress, lit = [], glows = [], usbOut, face, talking = 0 }) => {
  const B = bench();
  const power = usbOut < 0.05;
  const onBoard = glows.filter((g) => !g.spec.startsWith('vhole'));
  const surface = onBoard.map((g) => glowSvg(g.spec, g.o)).join('');
  // every piece that is on the bench now, painted back to front
  type Piece = { key: string; depth: number; node: React.ReactNode };
  const pieces: Piece[] = [];
  for (const it of B.items.values()) {
    const pr = progress(it.id);
    if (pr <= 0) continue;
    const on = lit.includes(it.id);
    if (it.wire) {
      const w = it.wire, a = Math.min(1, pr * 4), z = Math.max(0, (pr - 0.93) / 0.07);
      pieces.push({ key: it.id + ':a', depth: w.fromDepth, node: <Raw svg={w.from} opacity={a} transform={k.translateAlong(PROJ, [0, 0, (1 - a) * 6])} /> });
      pieces.push({ key: it.id, depth: it.depth, node: <Raw svg={tube(PROJ, w.pts, w.color, w.d, { upto: Math.min(1, pr * 1.08), glow: on ? GLOW.teal : undefined })} /> });
      if (z > 0) pieces.push({ key: it.id + ':b', depth: w.toDepth, node: <Raw svg={w.to} opacity={z} transform={k.translateAlong(PROJ, [0, 0, (1 - z) * 6])} /> });
      continue;
    }
    const drop = (1 - pr) * 26;
    pieces.push({ key: it.id, depth: it.depth, node: <Raw svg={it.svg} className={on ? 'lit' : undefined} opacity={Math.min(1, pr * 2.5)} transform={drop > 0.01 ? k.translateAlong(PROJ, [0, 0, drop]) : undefined} /> });
  }
  const voice = B.items.get('voice');
  for (const g of glows) if (g.spec.startsWith('vhole') && voice && progress('voice') >= 1) pieces.push({ key: g.spec, depth: voice.depth + 0.01, node: <Raw svg={glowSvg(g.spec, g.o)} /> });
  pieces.sort((a, b) => a.depth - b.depth);
  return (
    <svg viewBox={view.map((v) => v.toFixed(2)).join(' ')} width={FIG.w} height={FIG.h} style={{ display: 'block', overflow: 'hidden' }}>
      <style>{css}</style>
      <g className="iso anat" data-theme="light">
        <Raw svg={B.back} />
        <Raw svg={ledsSvg(PROJ, power && face ? FACES[face] : null, power)} />
        <Raw svg={B.front} />
        <Raw svg={surface} />
        {pieces.map((q) => <React.Fragment key={q.key}>{q.node}</React.Fragment>)}
        {talking > 0 && progress('spk') >= 1 && (
          <Raw svg={[1, 2, 3].map((i) => {
            const c = k.iso([SPEAKER.x + SPEAKER.w / 2, SPEAKER.y + SPEAKER.d / 2, SPEAKER.h + 2 + i * 3.5], PROJ);
            const r = (6 + i * 3.5) * PROJ.scale;
            return `<ellipse cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.45).toFixed(1)}" fill="none" stroke="${GLOW.teal}" stroke-width="1.6" stroke-opacity="${(talking * (0.9 - i * 0.22)).toFixed(2)}"/>`;
          }).join('')} />
        )}
        <Raw svg={usbSvg(PROJ, usbOut)} />
      </g>
    </svg>
  );
};
