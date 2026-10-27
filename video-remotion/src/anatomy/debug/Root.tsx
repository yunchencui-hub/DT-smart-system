import React from 'react';
import { Composition } from 'remotion';
import tl from '../../gen/debug-timeline.json';
import { IsoVideo } from '../IsoVideo';
import { makeVideo, TLJson } from '../video';
import { SCENES } from './script';

// The debugging guide: the same bench, finished, with one fault drawn in per case. Own entry point
// (src/anatomy/debug/index.ts); designed at 1280 x 720, rendered at scale 1.5 = 1920 x 1080.
const v = makeVideo({
  tl: tl as TLJson, scenes: SCENES, audio: 'gen/debug-narration.wav', built: true,
  label: 'ROBIN · DEBUG GUIDE · ANATOMY + ELI5 · follows docs/04 + docs/05 · drawings, not footage',
});
const Video: React.FC = () => <IsoVideo v={v} />;
export const DebugRoot: React.FC = () => (
  <Composition id="RobinAnatomyDebug" component={Video} durationInFrames={v.TOTAL_FRAMES} fps={v.FPS} width={1280} height={720} />
);
