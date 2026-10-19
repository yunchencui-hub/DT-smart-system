import React from 'react';
import { Composition } from 'remotion';
import tl from '../gen/anatomy-timeline.json';
import { IsoVideo } from './IsoVideo';
import { SCENES } from './script';
import { makeVideo, TLJson } from './video';

// The build video. Its own entry point (src/anatomy/index.ts), like RobinRealBuild. Designed at 1280 x 720 like the
// build guide; remotion.config.ts renders it at scale 1.5 = 1920 x 1080.
const v = makeVideo({
  tl: tl as TLJson, scenes: SCENES, audio: 'gen/anatomy-narration.wav',
  label: 'ROBIN · BUILD GUIDE · ANATOMY + ELI5 · follows docs/04 · drawings, not footage',
});
const Video: React.FC = () => <IsoVideo v={v} />;
export const AnatomyRoot: React.FC = () => (
  <Composition id="RobinAnatomyBuild" component={Video} durationInFrames={v.TOTAL_FRAMES} fps={v.FPS} width={1280} height={720} />
);
