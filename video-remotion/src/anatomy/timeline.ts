// The anatomy video's timeline (src/gen/anatomy-timeline.json, from scripts/voice.ts --script anatomy) and the state
// of its figures at any moment: the camera, the glows, the face, the USB plug, and how far each part has dropped in.
// Every change is eased over a fraction of a second, so nothing in the picture jumps.
import tlJson from '../gen/anatomy-timeline.json';
import { clamp, ease } from '../data/geom';
import { ITEMS } from '../data/wiring';
import { AFig, ALine, AScene, AView, SCENES } from './script';

type Usb = 'out' | 'in' | 'micro';
export type Chunk = { start: number; end: number; cap: string; file?: string };
export type TLine = { kind: 'say' | 'robin' | 'pause'; start: number; end: number; cap: string; usb: Usb; adds: string[]; track?: number; chunks: Chunk[] };
export type TScene = { id: string; title: string; part: string; step?: string; start: number; end: number; lines: TLine[] };
export const TL = tlJson as { fps: number; total: number; draft: boolean; scenes: TScene[] };
export const FPS = TL.fps;
export const FADE_S = 0.45;
export const TOTAL_FRAMES = Math.ceil(TL.total * FPS);

export const defOf = (id: string) => {
  const d = SCENES.find((s) => s.id === id);
  if (!d) throw new Error(`scene ${id} is in the timeline but not in src/anatomy/script.ts (run voice --script anatomy)`);
  return d;
};
export const sceneAt = (t: number) => {
  let i = 0;
  while (i + 1 < TL.scenes.length && TL.scenes[i + 1].start <= t) i++;
  return TL.scenes[i];
};
// ---------- when each bench item drops in (same rule as the drawn guide: one after the other within its line)
const ADD = new Map<string, [number, number]>();
for (const sc of TL.scenes) for (const l of sc.lines) {
  const n = l.adds.length;
  if (!n) continue;
  const span = l.end - l.start;
  const each = Math.min(2.4, Math.max(1.0, (span - 0.4) / n));
  l.adds.forEach((id, k) => ADD.set(id, [l.start + 0.4 + k * each, Math.min(1.8, each * 0.9)]));
}
export const progressAt = (t: number) => (id: string) => {
  const a = ADD.get(id);
  return a ? ease(clamp((t - a[0]) / a[1])) : 0;
};
export const litAt = (t: number) => [...ADD.entries()].filter(([, [a, d]]) => t >= a - 0.1 && t <= a + d + 1.4).map(([id]) => id);
export const everything = () => 1; // for the title and the end: the finished bench
export const addingAt = (t: number) => {
  const on = [...ADD.entries()].filter(([, [a, d]]) => t >= a - 0.1 && t <= a + d + 1.4).sort((x, y) => y[1][0] - x[1][0]);
  return on.length ? ITEMS.find((i) => i.id === on[0][0]) ?? null : null;
};

// ---------- the USB plug: 0 = in, 1 = out, animated over 0.6 s whenever the state changes
export const usbStateAt = (t: number): Usb => {
  let state: Usb = 'out';
  for (const s of TL.scenes) for (const l of s.lines) if (l.start <= t + 0.05) state = l.usb; else return state;
  return state;
};
export const usbOutAt = (t: number) => {
  let last: { t: number; to: number } = { t: -10, to: 1 }, prev = 1;
  for (const s of TL.scenes) for (const l of s.lines) {
    if (l.start > t) break;
    const to = l.usb === 'in' ? 0 : 1;
    if (to !== last.to) { prev = last.to; last = { t: l.start, to }; }
  }
  const q = ease(clamp((t - last.t) / 0.6));
  return prev + (last.to - prev) * q;
};

// ---------- the figure's state in a scene at time t: the scene's start state, then every line's changes in order
type Extra = Exclude<ALine, string>;
export type FigState = { view: AView; fig: AFig; render?: string; lift: number; face: string | null; glow: string[]; group?: string };
const initial: FigState = { view: 'full', fig: 'bench', lift: 0, face: 'happy', glow: [] };
const applyExtra = (s: FigState, e: Partial<Extra> | undefined): FigState => {
  if (!e) return s;
  const x = e as Partial<FigState> & { glow?: string[] };
  return {
    view: x.view ?? s.view, fig: x.fig ?? s.fig, render: x.render ?? s.render, lift: x.lift ?? s.lift,
    face: x.face ?? s.face, glow: x.glow ?? s.glow, group: x.group ?? s.group,
  };
};
// The state carries over from scene to scene (the bench is one bench), so walk every scene up to this one.
const STARTS = new Map<string, FigState>();
{
  let s = initial;
  for (const sc of TL.scenes) {
    const def = defOf(sc.id);
    s = applyExtra({ ...s, glow: [], group: undefined }, def.start);
    STARTS.set(sc.id, s);
    for (const l of def.lines) if (typeof l !== 'string') s = applyExtra(s, l);
  }
}
// The states at the start of each line of a scene, with the times they begin.
export function statesOf(sc: TScene): { t: number; s: FigState }[] {
  const def = defOf(sc.id);
  const out = [{ t: sc.start, s: STARTS.get(sc.id)! }];
  def.lines.forEach((l, i) => {
    if (typeof l === 'string' || !sc.lines[i]) return;
    out.push({ t: sc.lines[i].start, s: applyExtra(out[out.length - 1].s, l) });
  });
  return out;
}
export function stateAt(sc: TScene, t: number) {
  const list = statesOf(sc);
  let i = 0;
  while (i + 1 < list.length && list[i + 1].t <= t) i++;
  return { now: list[i], before: i > 0 ? list[i - 1] : null, since: t - list[i].t };
}

// Serial Monitor lines shown so far in this scene (each line's entries appear one after another while it is spoken).
export function serialAt(sc: TScene, t: number): string[] | null {
  const def: AScene = defOf(sc.id);
  let shown: string[] | null = null;
  def.lines.forEach((l, i) => {
    const tl = sc.lines[i];
    if (typeof l === 'string' || !tl || !l.serial || tl.start > t) return;
    if (l.serial.length === 0) { shown = []; return; }
    const span = Math.max(1, tl.end - tl.start);
    const n = l.serial.filter((_, k) => t >= tl.start + 0.3 + (k * span * 0.8) / l.serial!.length).length;
    shown = [...(shown ?? []), ...l.serial.slice(0, n)];
  });
  return shown;
}

// Captions: the sentence that started last, shown until 1 s after it ends (pauses: only while they run).
export const captionAt = (t: number): { cap: string; kind: TLine['kind']; end: number } | null => {
  let best: { cap: string; kind: TLine['kind']; end: number; start: number } | null = null;
  for (const s of TL.scenes) for (const l of s.lines) for (const c of l.chunks) {
    if (c.start <= t + 0.05 && (!best || c.start >= best.start)) best = { cap: c.cap, kind: l.kind, end: c.end, start: c.start };
  }
  if (!best) return null;
  if (best.kind === 'pause') return t < best.end ? best : null;
  return t < best.end + 1.0 ? best : null;
};
export const robinTalkingAt = (t: number) => TL.scenes.some((s) => s.lines.some((l) => l.kind === 'robin' && t >= l.start && t < l.end));
