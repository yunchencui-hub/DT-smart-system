// The narrated videos of this project, for the scripts that work on any of them (voice, review, finish, stills).
//   --script guide (default)  the drawn build guide            src/script/scenes.ts      composition RobinBuildGuide
//   --script anatomy          the anatomy + ELI5 build video   src/anatomy/script.ts     composition RobinAnatomyBuild
//   --script debug            the anatomy + ELI5 debug guide   src/anatomy/debug/script.ts  composition RobinAnatomyDebug
import type { SceneDef } from '../src/script/types';

export type VideoName = 'guide' | 'anatomy' | 'debug';
export const VIDEOS: Record<VideoName, {
  scenes: () => Promise<SceneDef[]>;
  timeline: string; wav: string; review: string; // paths relative to video-remotion/
  out: string; version: string; title: string; // finished file names and chapter title
  entry: string; id: string; // Remotion entry point and composition
}> = {
  guide: {
    scenes: async () => (await import('../src/script/scenes')).SCENES,
    timeline: 'src/gen/timeline.json', wav: 'public/gen/narration.wav', review: 'review/script.md',
    out: 'robin_build_guide', version: 'v2', title: 'Robin build guide (follows docs/04, parts of 30 Sep 2026)',
    entry: 'src/index.ts', id: 'RobinBuildGuide',
  },
  anatomy: {
    scenes: async () => (await import('../src/anatomy/script')).SCENES as SceneDef[],
    timeline: 'src/gen/anatomy-timeline.json', wav: 'public/gen/anatomy-narration.wav', review: 'review/anatomy-script.md',
    out: 'robin_anatomy_build', version: 'v1', title: 'Robin build guide, anatomy + ELI5 (follows docs/04)',
    entry: 'src/anatomy/index.ts', id: 'RobinAnatomyBuild',
  },
  debug: {
    scenes: async () => (await import('../src/anatomy/debug/script')).SCENES as SceneDef[],
    timeline: 'src/gen/debug-timeline.json', wav: 'public/gen/debug-narration.wav', review: 'review/debug-script.md',
    out: 'robin_anatomy_debug', version: 'v1', title: 'Debugging Robin, anatomy + ELI5 (follows the troubleshooting tables in docs/04 and docs/05)',
    entry: 'src/anatomy/debug/index.ts', id: 'RobinAnatomyDebug',
  },
};
export function videoArg(argv = process.argv): VideoName {
  const i = argv.indexOf('--script');
  const name = (i >= 0 ? argv[i + 1] : 'guide') as VideoName;
  if (!(name in VIDEOS)) throw new Error(`unknown --script ${name} (use ${Object.keys(VIDEOS).join(', ')})`);
  return name;
}
