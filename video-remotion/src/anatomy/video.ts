// One anatomy video = one script + its generated timeline (scripts/voice.ts --script <name>). makeVideo() turns them into
// the state of the figures at any moment: the camera, the glows, the face, the USB plug, and how far each part has
// dropped in (the build) or been swapped from wrong to right (the debugging guide). Every change is eased over a
// fraction of a second, so nothing in the picture jumps.
import { clamp, ease } from '../data/geom';
import { ITEMS } from '../data/wiring';
import { FAULT_ITEMS } from './faults';
import type { AFig, AScene, AView, Doc, Extra } from './types';

type Usb = 'out' | 'in' | 'micro';
export type Chunk = { start: number; end: number; cap: string; file?: string };
export type TLine = { kind: 'say' | 'robin' | 'pause'; start: number; end: number; cap: string; usb: Usb; adds: string[]; track?: number; chunks: Chunk[] };
export type TScene = { id: string; title: string; part: string; step?: string; start: number; end: number; lines: TLine[] };
export type TLJson = { fps: number; total: number; draft: boolean; scenes: TScene[] };
export type FigState = {
  view: AView; fig: AFig; render?: string; lift: number; face: string | null; glow: string[]; group?: string;
  doc?: Doc; readout?: string; press: number; net?: Extra['net']; drive?: Extra['drive'];
};
export type VideoCfg = {
  tl: TLJson; scenes: AScene[];
  audio: string; // narration in public/
  label: string; // the small line at the top of the header
  built?: boolean; // the bench starts finished (the debugging guide) instead of empty (the build)
};
export const FADE_S = 0.45;
const ALL_ITEMS = [...ITEMS, ...FAULT_ITEMS];

export function makeVideo(cfg: VideoCfg) {
  const TL = cfg.tl;
  const FPS = TL.fps;
  const defOf = (id: string) => {
    const d = cfg.scenes.find((s) => s.id === id);
    if (!d) throw new Error(`scene ${id} is in the timeline but not in its script (run voice --script <name> again)`);
    return d;
  };
  const sceneAt = (t: number) => {
    let i = 0;
    while (i + 1 < TL.scenes.length && TL.scenes[i + 1].start <= t) i++;
    return TL.scenes[i];
  };
  const lineStart = (sc: TScene, pick: (e: Extra) => boolean | undefined) => {
    const def = defOf(sc.id);
    const i = def.lines.findIndex((l) => typeof l !== 'string' && pick(l));
    return i >= 0 && sc.lines[i] ? sc.lines[i].start : Infinity;
  };

  // ---------- the build: each item drops in while its line is spoken (one after the other within the line)
  const ADD = new Map<string, [number, number]>();
  for (const sc of TL.scenes) for (const l of sc.lines) {
    const n = l.adds.length;
    if (!n) continue;
    const span = l.end - l.start;
    const each = Math.min(2.4, Math.max(1.0, (span - 0.4) / n));
    l.adds.forEach((id, k) => ADD.set(id, [l.start + 0.4 + k * each, Math.min(1.8, each * 0.9)]));
  }
  // ---------- the debugging guide: a case shows its faulty parts until the fix, then the right ones come back
  const fixAt = (sc: TScene) => lineStart(sc, (e) => e.fix);
  const blameAt = (sc: TScene) => lineStart(sc, (e) => e.blame);
  const progressAt = (t: number) => (id: string) => {
    const a = ADD.get(id);
    if (a) return ease(clamp((t - a[0]) / a[1]));
    const sc = sceneAt(t), f = defOf(sc.id).fault;
    if (f) {
      const fx = fixAt(sc);
      if (f.show.includes(id)) return t < fx + 0.2 ? 1 : 1 - ease(clamp((t - fx - 0.2) / 0.9));
      if (f.hide.includes(id)) return t < fx + 1.0 ? 0 : ease(clamp((t - fx - 1.0) / 1.1));
    }
    return cfg.built && ITEMS.some((i) => i.id === id) ? 1 : 0;
  };
  const litAt = (t: number) => {
    const lit = [...ADD.entries()].filter(([, [a, d]]) => t >= a - 0.1 && t <= a + d + 1.4).map(([id]) => id);
    const sc = sceneAt(t), f = defOf(sc.id).fault, fx = fixAt(sc);
    if (f && t >= fx + 1.0 && t <= fx + 4.5) lit.push(...f.hide);
    return lit;
  };
  // faulty parts the narrator has pointed at: they glow red until the fix lifts them out
  const badAt = (t: number) => {
    const sc = sceneAt(t), f = defOf(sc.id).fault;
    return f && t >= blameAt(sc) && t < fixAt(sc) + 0.4 ? f.show : [];
  };
  const addingAt = (t: number) => {
    const on = [...ADD.entries()].filter(([, [a, d]]) => t >= a - 0.1 && t <= a + d + 1.4).sort((x, y) => y[1][0] - x[1][0]);
    return on.length ? ALL_ITEMS.find((i) => i.id === on[0][0]) ?? null : null;
  };

  // ---------- the USB plug: 0 = in, 1 = out, animated over 0.6 s whenever the state changes
  const usbStateAt = (t: number): Usb => {
    let state: Usb = 'out';
    for (const s of TL.scenes) for (const l of s.lines) if (l.start <= t + 0.05) state = l.usb; else return state;
    return state;
  };
  const usbOutAt = (t: number) => {
    let last: { t: number; to: number } = { t: -10, to: 1 }, prev = 1;
    for (const s of TL.scenes) for (const l of s.lines) {
      if (l.start > t) break;
      const to = l.usb === 'in' ? 0 : 1;
      if (to !== last.to) { prev = last.to; last = { t: l.start, to }; }
    }
    return prev + (last.to - prev) * ease(clamp((t - last.t) / 0.6));
  };
  const sincePlugIn = (t: number) => {
    let last = -99, prev: Usb = 'out';
    for (const s of TL.scenes) for (const l of s.lines) { if (l.start > t) break; if (l.usb === 'in' && prev !== 'in') last = l.start; prev = l.usb; }
    return t - last;
  };

  // ---------- the figure's state: the scene's start state, then every line's changes in order
  const initial: FigState = { view: 'full', fig: 'bench', lift: 0, face: 'happy', glow: [], press: 0 };
  const applyExtra = (s: FigState, e: Partial<Extra> | undefined): FigState => {
    if (!e) return s;
    return {
      view: e.view ?? s.view, fig: e.fig ?? s.fig, render: e.render ?? s.render, lift: e.lift ?? s.lift,
      face: e.face ?? s.face, glow: e.glow ?? s.glow, group: e.group ?? s.group, doc: e.doc ?? s.doc,
      readout: e.readout ?? s.readout, press: e.press ?? s.press, net: e.net ?? s.net, drive: e.drive ?? s.drive,
    };
  };
  // the state carries over from scene to scene (the bench is one bench); glows, doctor's step and readout don't
  const STARTS = new Map<string, FigState>();
  {
    let s = initial;
    for (const sc of TL.scenes) {
      const def = defOf(sc.id);
      s = applyExtra({ ...s, glow: [], group: undefined, doc: undefined, readout: undefined, press: 0 }, def.start);
      STARTS.set(sc.id, s);
      for (const l of def.lines) if (typeof l !== 'string') s = applyExtra(s, l);
    }
  }
  const statesOf = (sc: TScene): { t: number; s: FigState }[] => {
    const def = defOf(sc.id);
    const out = [{ t: sc.start, s: STARTS.get(sc.id)! }];
    def.lines.forEach((l, i) => {
      if (typeof l === 'string' || !sc.lines[i]) return;
      out.push({ t: sc.lines[i].start, s: applyExtra(out[out.length - 1].s, l) });
    });
    return out;
  };
  const stateAt = (sc: TScene, t: number) => {
    const list = statesOf(sc);
    let i = 0;
    while (i + 1 < list.length && list[i + 1].t <= t) i++;
    return { now: list[i], before: i > 0 ? list[i - 1] : null, since: t - list[i].t };
  };

  // Serial Monitor lines shown so far in this scene (each line's entries appear one after another while it is spoken)
  const serialAt = (sc: TScene, t: number): string[] | null => {
    const def = defOf(sc.id);
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
  };

  // Captions: the sentence that started last, shown until 1 s after it ends (pauses: only while they run)
  const captionAt = (t: number): { cap: string; kind: TLine['kind']; end: number } | null => {
    let best: { cap: string; kind: TLine['kind']; end: number; start: number } | null = null;
    for (const s of TL.scenes) for (const l of s.lines) for (const c of l.chunks) {
      if (c.start <= t + 0.05 && (!best || c.start >= best.start)) best = { cap: c.cap, kind: l.kind, end: c.end, start: c.start };
    }
    if (!best) return null;
    if (best.kind === 'pause') return t < best.end ? best : null;
    return t < best.end + 1.0 ? best : null;
  };
  const robinTalkingAt = (t: number) => TL.scenes.some((s) => s.lines.some((l) => l.kind === 'robin' && t >= l.start && t < l.end));

  return {
    cfg, TL, FPS, TOTAL_FRAMES: Math.ceil(TL.total * FPS), defOf, sceneAt, progressAt, litAt, badAt, addingAt,
    usbStateAt, usbOutAt, sincePlugIn, statesOf, stateAt, serialAt, captionAt, robinTalkingAt,
    everything: () => 1, // the finished bench, for title and end screens
  };
}
export type Video = ReturnType<typeof makeVideo>;
