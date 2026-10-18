// Stills of the anatomy + ELI5 video, for checking before a render (bundles once, renders many frames).
//   npx tsx scripts/anatomy-stills.ts --scenes a-step2,a-step5d   one still near the end of every line of these scenes
//   npx tsx scripts/anatomy-stills.ts --lines                     the same for every scene
//   npx tsx scripts/anatomy-stills.ts --at 12.5,300               at global times (seconds)
//   add --out <dir> to write elsewhere (default review/stills/), --scale 1 for quick 1280 x 720 checks
// Set REMOTION_BROWSER to use an existing headless Chrome.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import tl from '../src/gen/anatomy-timeline.json';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const OUT = path.resolve(arg('out') ?? path.join(ROOT, 'review/stills'));
const scale = Number(arg('scale') ?? 1.5);

const shots: { name: string; t: number }[] = [];
if (arg('at')) for (const x of arg('at')!.split(',')) shots.push({ name: `anat_t${x}`, t: +x });
const ids = process.argv.includes('--lines') ? tl.scenes.map((s) => s.id) : (arg('scenes')?.split(',') ?? []);
for (const id of ids) {
  const s = tl.scenes.find((q) => q.id === id);
  if (!s) throw new Error(`no scene ${id}`);
  s.lines.forEach((l, i) => shots.push({ name: `anat_${id}_${String(i + 1).padStart(2, '0')}`, t: Math.min(l.end - 0.15, s.end - 0.1) }));
}
if (!shots.length) { console.error('nothing to render: use --scenes, --lines or --at'); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/anatomy/index.ts'), publicDir: path.join(ROOT, 'public') });
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id: 'RobinAnatomyBuild', browserExecutable });
for (const s of shots) {
  const frame = Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(s.t * tl.fps)));
  const output = path.join(OUT, `${s.name}.png`);
  await renderStill({ serveUrl, composition, frame, output, scale, browserExecutable, imageFormat: 'png' });
  console.log(`[anatomy-stills] ${path.relative(process.cwd(), output)}  (t=${s.t.toFixed(2)} s)`);
}
