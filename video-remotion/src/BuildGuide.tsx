// The whole video. Each scene sits at its absolute place in the timeline (so the picture never drifts from
// the narration); the next scene fades in over the previous one, which holds its last frame.
import React from 'react';
import { AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import './fonts';
import { Overlay } from './Overlay';
import { SCENE_COMPONENTS } from './scenes';
import { SCENES } from './script/scenes';
import { FADE_S, FPS, makeT, TL, TScene } from './timeline';
import { C, FONT } from './theme';

const FADE = Math.round(FADE_S * FPS);

const SceneHost: React.FC<{ sc: TScene; len: number; first: boolean }> = ({ sc, len, first }) => {
  const f = useCurrentFrame();
  const t = Math.min(f, len - 1) / FPS; // hold the last frame while the next scene fades in on top
  const o = first ? 1 : interpolate(f, [0, FADE], [0, 1], { extrapolateRight: 'clamp', easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2) });
  const Comp = SCENE_COMPONENTS[sc.id];
  const def = SCENES.find((s) => s.id === sc.id)!;
  if (!Comp) throw new Error(`no component for scene ${sc.id}`);
  return (
    <div style={{ position: 'absolute', left: 0, top: 60, width: 1280, height: 564, background: C.bg, opacity: o, overflow: 'hidden', fontFamily: FONT, color: C.ink }}>
      <Comp t={t} T={makeT(sc, t)} ui={def.ui ?? {}} />
    </div>
  );
};

export const BuildGuide: React.FC = () => {
  const total = Math.ceil(TL.total * FPS);
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      {TL.scenes.map((sc, i) => {
        const f0 = Math.round(sc.start * FPS);
        const f1 = i + 1 < TL.scenes.length ? Math.round(TL.scenes[i + 1].start * FPS) : total;
        const last = i === TL.scenes.length - 1;
        return (
          <Sequence key={sc.id} from={f0} durationInFrames={f1 - f0 + (last ? 0 : FADE)} name={sc.id} layout="none">
            <SceneHost sc={sc} len={f1 - f0} first={i === 0} />
          </Sequence>
        );
      })}
      <Overlay />
      {!TL.draft && <Html5Audio src={staticFile('gen/narration.wav')} />}
    </AbsoluteFill>
  );
};
export const TOTAL_FRAMES = Math.ceil(TL.total * FPS);
