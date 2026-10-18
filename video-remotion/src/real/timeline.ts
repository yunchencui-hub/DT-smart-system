// The real-footage video's timeline, built from the manifest (src/gen/real.json, scripts/real-assets.ts).
// Everything is counted in whole frames, so a clip never runs past its own last frame.
import manifest from '../gen/real.json';
import { Chapter, CHAPTERS, Item, Manifest } from './plan';

export const FPS = 30;
export const FADE = Math.round(0.4 * FPS);
export const M = manifest as Manifest;

const SEC = { intro: 4.5, title: 2.6, todo: 5, photo: 4.5, end: 4.5 };
const fr = (s: number) => Math.round(s * FPS);

type Base = { from: number; len: number };
export type Seg = Base & (
  | { kind: 'intro' | 'end' }
  | { kind: 'title'; chapter: Chapter; photos: number; clips: number }
  | { kind: 'todo'; chapter: Chapter }
  | { kind: 'photo' | 'clip'; chapter: Chapter; item: Item }
);
type NoBase<T> = T extends Base ? Omit<T, keyof Base> : never;

const segs: Seg[] = [];
let at = 0;
const push = (s: NoBase<Seg>, len: number) => { segs.push({ ...s, from: at, len } as Seg); at += len; };

push({ kind: 'intro' }, fr(SEC.intro));
for (const chapter of CHAPTERS) {
  const items = M.items.filter((i) => i.chapter === chapter.id);
  if (!items.length && M.final) continue;
  push({ kind: 'title', chapter, photos: items.filter((i) => i.kind === 'photo').length, clips: items.filter((i) => i.kind === 'clip').length }, fr(SEC.title));
  if (!items.length) push({ kind: 'todo', chapter }, fr(SEC.todo));
  for (const item of items) {
    if (item.kind === 'clip') push({ kind: 'clip', chapter, item }, Math.max(FPS, Math.floor((item.dur ?? 0) * FPS) - 1));
    else push({ kind: 'photo', chapter, item }, fr(SEC.photo));
  }
}
push({ kind: 'end' }, fr(SEC.end));

export const SEGS = segs;
export const TOTAL = at;
export const segAt = (frame: number) => {
  let i = 0;
  while (i + 1 < SEGS.length && SEGS[i + 1].from <= frame) i++;
  return SEGS[i];
};
// Filmed by us (the anatomy drawing doesn't count), and how much of the shot list that covers.
export const filmed = M.items.filter((i) => !CHAPTERS.find((c) => c.id === i.chapter)?.drawing);
export const planned = CHAPTERS.filter((c) => !c.drawing).reduce((n, c) => n + c.plan.length, 0);
