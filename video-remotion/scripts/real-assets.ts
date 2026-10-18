// Prepare the real photos and clips for the real-footage video (composition "RobinRealBuild").
//   npx tsx scripts/real-assets.ts                 scan ../video-assets, check names and privacy, write src/gen/real.json
//   npx tsx scripts/real-assets.ts --final         the same, but without the "still to shoot" cards (for the real render)
//   npx tsx scripts/real-assets.ts --assets <dir>  scan another folder (layout tests with dummy files)
// Files are copied to public/real/ (git-ignored), because Remotion only serves files from public/.
// Optional captions: <assets>/captions.json, { "s2-03-ldr-test-covered.jpg": "Covered: light_raw drops to 12" }.
// Environment: FFPROBE (default: ffprobe next to FFMPEG, else ffprobe on the PATH).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTERS, chapterOf, isClip, Item, Manifest, NAME } from '../src/real/plan';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const ASSETS = path.resolve(arg('assets') ?? path.join(ROOT, '../video-assets'));
const PUB = path.join(ROOT, 'public/real');
const FINAL = process.argv.includes('--final');
const FFPROBE = process.env.FFPROBE || (process.env.FFMPEG ? path.join(path.dirname(process.env.FFMPEG), 'ffprobe') : 'ffprobe');
const MAX_CLIP_S = 30;

const problems: string[] = [];
const privacy: string[] = [];

// GPS position inside a JPEG (EXIF GPS IFD with a latitude). 'unknown' when the file can't be read as EXIF.
function jpegGps(buf: Buffer): 'yes' | 'no' | 'unknown' {
  try {
    if (buf.readUInt16BE(0) !== 0xffd8) return 'unknown';
    for (let p = 2; p + 4 <= buf.length; ) {
      if (buf[p] !== 0xff) return 'unknown';
      const marker = buf[p + 1];
      if (marker === 0xff) { p++; continue; } // fill byte before a marker
      if (marker === 0xda) return 'no'; // image data starts: no metadata after this
      const len = buf.readUInt16BE(p + 2);
      if (marker === 0xe1 && buf.toString('latin1', p + 4, p + 10) === 'Exif\0\0') {
        const t = p + 10;
        const le = buf.toString('latin1', t, t + 2) === 'II';
        const u16 = (o: number) => (le ? buf.readUInt16LE(t + o) : buf.readUInt16BE(t + o));
        const u32 = (o: number) => (le ? buf.readUInt32LE(t + o) : buf.readUInt32BE(t + o));
        const ifd = u32(4);
        for (let i = 0; i < u16(ifd); i++) {
          const e = ifd + 2 + i * 12;
          if (u16(e) !== 0x8825) continue;
          const gps = u32(e + 8);
          for (let j = 0; j < u16(gps); j++) if (u16(gps + 2 + j * 12) === 0x0002) return 'yes';
          return 'no';
        }
        return 'no';
      }
      p += 2 + len;
    }
    return 'unknown'; // the file ended before its image data: cut off, so don't claim it's clean
  } catch {
    return 'unknown';
  }
}

type Probe = { dur: number; location: boolean };
function probe(file: string): Probe | null {
  try {
    const out = execFileSync(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', file], { encoding: 'utf8' });
    const fmt = JSON.parse(out).format ?? {};
    const tags = Object.keys(fmt.tags ?? {}).map((k) => k.toLowerCase());
    return { dur: Number(fmt.duration), location: tags.some((k) => k.includes('location') || k.includes('iso6709')) };
  } catch {
    return null;
  }
}

// s3-02-pir-knobs-tx-min → "PIR knobs tx min" (until captions.json gives it a real caption)
const ACRONYM = /^(pir|ldr|usb|led|gnd|vcc|mqtt|ntfy|rx|tx|sp|ok|d\d+|a\d+)$/;
const words = (what: string) => {
  const s = what.split('-').map((w) => (ACRONYM.test(w) ? w.toUpperCase() : w)).join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

if (!fs.existsSync(ASSETS)) throw new Error(`${ASSETS} not found`);
const captionsFile = path.join(ASSETS, 'captions.json');
const captions: Record<string, string> = fs.existsSync(captionsFile) ? JSON.parse(fs.readFileSync(captionsFile, 'utf8')) : {};

const items: Item[] = [];
const source = new Map<string, string>();
for (const dir of ['images', 'clips']) {
  const abs = path.join(ASSETS, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of fs.readdirSync(abs).sort()) {
    if (file.startsWith('.')) continue;
    const src = path.join(abs, file);
    const rel = `${dir}/${file}`;
    if (/\.(heic|heif)$/i.test(file)) { problems.push(`${rel}: HEIC can't be used; set the phone to JPG (README, "Phone settings") and upload it again`); continue; }
    const m = NAME.exec(file);
    if (!m) { problems.push(`${rel}: name doesn't follow <step>-<nn>-<what>.jpg (lowercase, no spaces), e.g. s2-03-ldr-test.jpg`); continue; }
    const chapter = chapterOf(m[1]);
    if (!CHAPTERS.some((c) => c.id === chapter)) { problems.push(`${rel}: there is no step "${m[1]}"`); continue; }
    if (items.some((it) => it.file === file)) { problems.push(`${rel}: a file with this name is already in the other folder`); continue; }
    const item: Item = { file, chapter, prefix: m[1], nn: Number(m[2]), caption: captions[file] ?? words(m[3]), kind: isClip(file) ? 'clip' : 'photo' };
    if (item.kind === 'clip') {
      const pr = probe(src);
      if (!pr || !(pr.dur > 0)) { problems.push(`${rel}: ffprobe can't read this clip (is ffprobe installed? FFPROBE=…)`); continue; }
      if (pr.location) privacy.push(`${rel}: the clip stores a GPS location`);
      if (pr.dur > MAX_CLIP_S) problems.push(`${rel}: ${pr.dur.toFixed(0)} s long; only the first ${MAX_CLIP_S} s are used`);
      item.dur = Math.min(pr.dur, MAX_CLIP_S);
    } else if (/\.jpe?g$/.test(file)) {
      const gps = jpegGps(fs.readFileSync(src));
      if (gps === 'yes') privacy.push(`${rel}: the photo stores a GPS location`);
      if (gps === 'unknown') problems.push(`${rel}: couldn't check this photo for a GPS location; check it yourself`);
    }
    items.push(item);
    source.set(file, src);
  }
}
const order = new Map(CHAPTERS.map((c, i) => [c.id, i]));
items.sort((a, b) => order.get(a.chapter)! - order.get(b.chapter)! || a.prefix.localeCompare(b.prefix) || a.nn - b.nn || a.file.localeCompare(b.file));

// public/real/ holds exactly the files of the manifest (copied only when changed)
fs.mkdirSync(PUB, { recursive: true });
const keep = new Set(items.map((it) => it.file));
for (const f of fs.readdirSync(PUB)) if (!keep.has(f)) fs.rmSync(path.join(PUB, f));
for (const it of items) {
  const from = source.get(it.file)!;
  const dst = path.join(PUB, it.file);
  const a = fs.statSync(from);
  if (!fs.existsSync(dst) || fs.statSync(dst).size !== a.size || fs.statSync(dst).mtimeMs < a.mtimeMs) fs.copyFileSync(from, dst);
}

const manifest: Manifest = { final: FINAL, items };
fs.mkdirSync(path.join(ROOT, 'src/gen'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'src/gen/real.json'), JSON.stringify(manifest, null, 1));

// report: coverage per chapter, then everything that needs a fix
console.log(`[real] ${path.relative(process.cwd(), ASSETS)}: ${items.filter((i) => i.kind === 'photo').length} photos, ${items.filter((i) => i.kind === 'clip').length} clips${FINAL ? ' (final: no placeholder cards)' : ''}`);
for (const c of CHAPTERS) {
  const got = items.filter((i) => i.chapter === c.id);
  const ph = got.filter((i) => i.kind === 'photo').length, cl = got.filter((i) => i.kind === 'clip').length;
  const plPh = c.plan.filter((p) => p.kind === 'photo').length, plCl = c.plan.filter((p) => p.kind === 'clip').length;
  const mark = c.id === 'tc' ? (got.length ? '✓' : '·') : ph >= plPh && cl >= plCl ? '✓' : got.length ? '…' : '·';
  console.log(`  ${mark} ${c.chip.padEnd(7)} ${c.title.padEnd(24)} photos ${ph}/${plPh}  clips ${cl}/${plCl}`);
}
for (const p of problems) console.log(`  ! ${p}`);
if (privacy.length) {
  console.log('\n[real] PRIVACY: this repository is public, and these files show where they were taken:');
  for (const p of privacy) console.log(`  ✗ ${p}`);
  console.log('  Delete them on GitHub, switch off location in the camera (video-assets/README.md), and upload them again.');
  console.log('  Deleting only removes them from the current files; they stay in the Git history until that is cleaned up too.');
  process.exitCode = 1;
}
