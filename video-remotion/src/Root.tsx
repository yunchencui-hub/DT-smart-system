import React from 'react';
import { Composition } from 'remotion';
import { BuildGuide, TOTAL_FRAMES } from './BuildGuide';
import { FPS } from './timeline';

// Designed at 1280 x 720; remotion.config.ts renders it at scale 1.5 = 1920 x 1080.
export const RemotionRoot: React.FC = () => (
  <Composition id="RobinBuildGuide" component={BuildGuide} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1280} height={720} />
);
