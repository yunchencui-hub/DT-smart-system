// After `npm run render`: loudness-normalise the audio, add chapter markers (one per scene) and write the
// .srt subtitles, then make a small 720p copy for size-limited uploads.
//   FFMPEG=/path/to/full/ffmpeg npx tsx scripts/finish.ts
// In:  out/robin_build_guide.mp4 (from remotion render)
// Out: out/robin_build_guide_v2.mp4, out/robin_build_guide_v2.srt, out/robin_build_guide_v2_720p.mp4
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tl from '../src/gen/timeline.json';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../out');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const SRC = path.join(OUT, 'robin_build_guide.mp4');
const DST = path.join(OUT, 'robin_build_guide_v2.mp4');
const SRT = path.join(OUT, 'robin_build_guide_v2.srt');
const SMALL = path.join(OUT, 'robin_build_guide_v2_720p.mp4');
if (!fs.existsSync(SRC)) throw new Error(`${SRC} not found: run npm run render first`);

// ---------- subtitles: one cue per sentence (Robin's own lines prefixed), until the next cue starts
const ts = (s: number) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const cues: { start: number; end: number; text: string }[] = [];
for (const s of tl.scenes) for (const l of s.lines) for (const c of l.chunks) {
  cues.push({ start: c.start, end: c.end + 0.25, text: l.kind === 'robin' ? `ROBIN: ${c.cap}` : l.kind === 'pause' ? `(${c.cap})` : c.cap });
}
cues.sort((a, b) => a.start - b.start);
cues.forEach((c, i) => { if (i + 1 < cues.length) c.end = Math.min(c.end, cues[i + 1].start - 0.01); });
fs.writeFileSync(SRT, cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n'));

// ---------- chapters: one per scene, "Step 5 of 8 · Voice wiring: …"
const meta = [';FFMETADATA1', 'title=Robin build guide (follows docs/04, parts of 30 Sep 2026)'];
for (const s of tl.scenes) {
  meta.push('[CHAPTER]', 'TIMEBASE=1/1000', `START=${Math.round(s.start * 1000)}`, `END=${Math.round(s.end * 1000)}`, `title=${(s.step ? s.step + ' · ' : '') + s.title}`);
}
const metaFile = path.join(OUT, 'chapters.txt');
fs.writeFileSync(metaFile, meta.join('\n') + '\n');

// ---------- mux: copy the video, normalise the audio (EBU R128, -16 LUFS), add chapters
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', SRC, '-i', metaFile, '-map', '0:v', '-map', '0:a', '-map_metadata', '1', '-map_chapters', '1',
  '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', DST], { stdio: 'inherit' });
// ---------- 720p copy for uploads with a size limit (the scenes are designed at 1280 x 720, so it stays readable)
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', DST, '-map', '0:v', '-map', '0:a', '-map_chapters', '0', '-vf', 'scale=1280:720:flags=lanczos',
  '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '28', '-pix_fmt', 'yuv420p', '-g', '240',
  '-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-ar', '24000', '-movflags', '+faststart', SMALL], { stdio: 'inherit' });
const mb = (f: string) => (fs.statSync(f).size / 1e6).toFixed(1);
console.log(`[finish] ${path.relative(process.cwd(), DST)} (${mb(DST)} MB), ${path.relative(process.cwd(), SMALL)} (${mb(SMALL)} MB), ${path.relative(process.cwd(), SRT)} (${cues.length} cues), ${tl.scenes.length} chapters`);
