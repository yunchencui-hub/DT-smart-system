import React from 'react';
import { Composition } from 'remotion';
import { RealBuild } from './RealBuild';
import { FPS, TOTAL } from './timeline';

// Its own entry point (src/real/index.ts), so it renders without the build guide's narration timeline.
// Designed at 1280 x 720 like the build guide; remotion.config.ts renders it at scale 1.5 = 1920 x 1080.
export const RealRoot: React.FC = () => (
  <Composition id="RobinRealBuild" component={RealBuild} durationInFrames={TOTAL} fps={FPS} width={1280} height={720} />
);
