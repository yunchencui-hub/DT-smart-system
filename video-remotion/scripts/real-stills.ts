// Stills of the real-footage video for checking (run scripts/real-assets.ts first).
//   npx tsx scripts/real-stills.ts            one still in the middle of the first segment of every kind
//   npx tsx scripts/real-stills.ts --all      one still per segment
//   npx tsx scripts/real-stills.ts --seg 3,7  these segments
// Output: review/stills/real_*.png (1920 x 1080). Set REMOTION_BROWSER to use an existing headless Chrome.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { SEGS } from '../src/real/timeline';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'review/stills');
const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : undefined; };

let pick: number[];
if (process.argv.includes('--all')) pick = SEGS.map((_, i) => i);
else if (arg('seg')) pick = arg('seg')!.split(',').map(Number);
else pick = [...new Set(SEGS.map((s) => s.kind))].map((k) => SEGS.findIndex((s) => s.kind === k));

fs.mkdirSync(OUT, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/real/index.ts'), publicDir: path.join(ROOT, 'public') });
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id: 'RobinRealBuild', browserExecutable });
for (const i of pick) {
  const s = SEGS[i];
  if (!s) throw new Error(`no segment ${i} (there are ${SEGS.length})`);
  const label = 'item' in s ? s.item.file.replace(/\.\w+$/, '') : 'chapter' in s ? s.chapter.id : '';
  const output = path.join(OUT, `real_${String(i).padStart(2, '0')}_${s.kind}${label ? '_' + label : ''}.png`);
  await renderStill({ serveUrl, composition, frame: s.from + Math.floor(s.len / 2), output, scale: 1.5, browserExecutable, imageFormat: 'png' });
  console.log(`[real-stills] ${path.relative(ROOT, output)}`);
}
