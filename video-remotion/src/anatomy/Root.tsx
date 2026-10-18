import React from 'react';
import { Composition } from 'remotion';
import { AnatomyBuild } from './AnatomyBuild';
import { FPS, TOTAL_FRAMES } from './timeline';

// Its own entry point (src/anatomy/index.ts), like RobinRealBuild. Designed at 1280 x 720 like the build guide;
// remotion.config.ts renders it at scale 1.5 = 1920 x 1080.
export const AnatomyRoot: React.FC = () => (
  <Composition id="RobinAnatomyBuild" component={AnatomyBuild} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1280} height={720} />
);
