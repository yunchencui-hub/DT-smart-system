import React from 'react';
import { Box, cameraAt, camBox, FULL } from '../data/geom';
import { Bench, benchState, BenchProps } from '../bench/Bench';
import { Stage } from '../kit/basics';
import { blinkFace } from '../kit/hardware';
import type { T } from '../timeline';

export type SceneProps = { t: number; T: T; ui: Record<string, string> };
export type SceneFC = React.FC<SceneProps>;

// Cable state at scene time t (the state of the line that started last; 'out' before the first line).
export const usbNow = (T: T, t: number) => {
  let st: 'out' | 'in' | 'micro' = 'out';
  for (let i = 0; i < T.n; i++) if (T.s(i) <= t + 0.05) st = T.line(i).usb;
  return st;
};
// Time the cable state last changed to 'in' (for the plug-in slide), or -1.
export const pluggedSince = (T: T, t: number) => {
  let since = -1;
  let prev: string = 'out';
  for (let i = 0; i < T.n; i++) {
    if (T.s(i) > t + 0.05) break;
    const u = T.line(i).usb;
    if (u === 'in' && prev !== 'in') since = T.s(i);
    if (u !== 'in') since = -1;
    prev = u;
  }
  return since;
};

// Bench views per step (camera boxes), as in the older video; step 5 needs almost the whole stage.
export const VIEWS: Record<string, Box> = {
  1: camBox(470, 420, 620), 2: camBox(430, 380, 640), 3: camBox(720, 365, 880), 4: camBox(540, 245, 680), 5: camBox(640, 300, 1400), full: FULL,
};

// A standard workbench scene: earlier steps complete, this scene's `adds` animate in, the camera moves to `view`,
// and the board powers up whenever the timeline says USB IN.
export const BenchScene: React.FC<{
  t: number; T: T; upto: number; view: Box | [number, Box][]; extra?: string[]; face?: string | null;
  bench?: Partial<BenchProps>; children?: React.ReactNode; html?: React.ReactNode;
}> = ({ t, T, upto, view, extra = [], face, bench = {}, children, html }) => {
  const since = pluggedSince(T, t);
  const on = since >= 0 && t > since + 0.6;
  const keys: [number, Box][] = Array.isArray(view[0]) ? (view as [number, Box][]) : [[0, FULL], [1.3, view as Box]];
  return (
    <>
      <Stage view={cameraAt(t, keys)}>
        <Bench
          state={benchState(upto, T.add, T.addedIn, extra)}
          power={on}
          face={on ? (face === undefined ? (t - since < 1.4 ? 'offline' : blinkFace(t)) : face) : null}
          usb={since >= 0 ? Math.min(1, (t - since) / 0.5) : 0}
          t={t}
          {...bench}
        >
          {children}
        </Bench>
      </Stage>
      {html}
    </>
  );
};
