// The generated timeline (scripts/voice.ts) and the per-scene timing helper T.
import tlJson from './gen/timeline.json';
import { clamp, ease } from './data/geom';

export type Chunk = { start: number; end: number; cap: string; file?: string };
export type TLine = { kind: 'say' | 'robin' | 'pause'; start: number; end: number; cap: string; usb: 'out' | 'in' | 'micro'; adds: string[]; track?: number; chunks: Chunk[] };
export type TScene = { id: string; title: string; part: string; step?: string; start: number; end: number; lines: TLine[] };
export type Timeline = { fps: number; total: number; draft: boolean; scenes: TScene[] };

export const TL = tlJson as Timeline;
export const FPS = TL.fps;
export const FADE_S = 0.45;

// Timing helper for one scene. All times are seconds relative to the scene start.
export type T = {
  dur: number;
  n: number;
  s: (i: number) => number; // start of line i
  e: (i: number) => number; // end of line i
  line: (i: number) => TLine;
  // progress 0..1 of a bench item that a line "adds" (items of one line are drawn one after the other)
  add: (id: string) => number;
  addedIn: (id: string) => boolean;
  robinOn: (t: number) => boolean;
};

export function makeT(sc: TScene, tNow: number): T {
  const rel = (x: number) => x - sc.start;
  const addTimes = new Map<string, [number, number]>();
  for (const l of sc.lines) {
    const n = l.adds.length;
    if (!n) continue;
    const span = rel(l.end) - rel(l.start);
    const each = Math.min(2.4, Math.max(1.0, (span - 0.4) / n));
    l.adds.forEach((id, k) => addTimes.set(id, [rel(l.start) + 0.4 + k * each, Math.min(1.6, each * 0.85)]));
  }
  return {
    dur: sc.end - sc.start,
    n: sc.lines.length,
    s: (i) => rel(sc.lines[i].start),
    e: (i) => rel(sc.lines[i].end),
    line: (i) => sc.lines[i],
    add: (id) => {
      const a = addTimes.get(id);
      return a ? ease(clamp((tNow - a[0]) / a[1])) : 0;
    },
    addedIn: (id) => addTimes.has(id),
    robinOn: (t) => sc.lines.some((l) => l.kind === 'robin' && t >= rel(l.start) && t < rel(l.end)),
  };
}
// Which scene / line is current at global time t (seconds)?
export const sceneAt = (t: number) => {
  let i = 0;
  while (i + 1 < TL.scenes.length && TL.scenes[i + 1].start <= t) i++;
  return TL.scenes[i];
};
export const usbAt = (t: number): 'out' | 'in' | 'micro' => {
  let state: 'out' | 'in' | 'micro' = 'out';
  for (const s of TL.scenes) for (const l of s.lines) if (l.start <= t + 0.05) state = l.usb; else return state;
  return state;
};
// Caption: the sentence that started last (0.05 s look-ahead), shown until 1 s after it ends.
export const captionAt = (t: number): { cap: string; kind: TLine['kind']; end: number } | null => {
  let best: { cap: string; kind: TLine['kind']; end: number; start: number } | null = null;
  for (const s of TL.scenes) for (const l of s.lines) for (const c of l.chunks) {
    if (c.start <= t + 0.05 && (!best || c.start >= best.start)) best = { cap: c.cap, kind: l.kind, end: c.end, start: c.start };
  }
  if (!best) return null;
  if (best.kind === 'pause') return t < best.end ? best : null;
  return t < best.end + 1.0 ? best : null;
};
