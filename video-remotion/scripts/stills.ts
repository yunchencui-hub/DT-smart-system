// Render still images for checking (bundles once, then renders many frames).
//   npx tsx scripts/stills.ts --scenes step5e,step5g --n 3      evenly spaced stills per scene
//   npx tsx scripts/stills.ts --adds                            one still at the end of every line that wires something
//   npx tsx scripts/stills.ts --at 12.5,300                     at global times (seconds)
// Output: review/stills/*.png (1920 x 1080). Set REMOTION_BROWSER to use an existing headless Chrome.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import tl from '../src/gen/timeline.json';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'review/stills');
const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : undefined; };

type Shot = { name: string; t: number };
const shots: Shot[] = [];
const fps = tl.fps;
if (arg('at')) for (const x of arg('at')!.split(',')) shots.push({ name: `t${x}`, t: +x });
if (arg('scenes')) {
  const n = +(arg('n') ?? 3);
  for (const id of arg('scenes')!.split(',')) {
    const s = tl.scenes.find((q) => q.id === id);
    if (!s) throw new Error(`no scene ${id}`);
    for (let k = 0; k < n; k++) shots.push({ name: `${id}_${k + 1}`, t: s.start + ((s.end - s.start) * (k + 1)) / (n + 1) });
  }
}
if (process.argv.includes('--adds')) {
  for (const s of tl.scenes) s.lines.forEach((l, i) => { if (l.adds.length) shots.push({ name: `${s.id}_line${i + 1}_${l.adds.join('+')}`, t: Math.min(l.end + 0.4, s.end - 0.1) }); });
}
if (!shots.length) { console.error('nothing to render: use --at, --scenes or --adds'); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public') });
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id: 'RobinBuildGuide', browserExecutable });
for (const s of shots) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s.t * fps));
  const output = path.join(OUT, `${s.name}.png`);
  await renderStill({ serveUrl, composition, frame, output, scale: 1.5, browserExecutable, imageFormat: 'png' });
  console.log(`[stills] ${path.relative(ROOT, output)}  (t=${s.t.toFixed(2)} s)`);
}
