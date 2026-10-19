// Copy the part renders (video-assets/parts/*.png, the parts we received) to public/parts/, where Remotion serves
// them from (public/parts/ is git-ignored, video-assets/parts/ is the source). Run before a render or stills.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '../../video-assets/parts');
const DST = path.resolve(HERE, '../public/parts');
fs.mkdirSync(DST, { recursive: true });
let n = 0;
for (const f of fs.readdirSync(SRC)) {
  if (!f.endsWith('.png')) continue;
  const a = path.join(SRC, f), b = path.join(DST, f);
  if (!fs.existsSync(b) || fs.statSync(b).size !== fs.statSync(a).size) { fs.copyFileSync(a, b); n++; }
}
console.log(`[anatomy] ${fs.readdirSync(DST).length} part renders in public/parts/ (${n} copied)`);
