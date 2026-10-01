// Narration + timeline.
//   npx tsx scripts/voice.ts --draft   estimated timings, no audio (quick; enough for the review and layout)
//   npx tsx scripts/voice.ts           Piper TTS per sentence (cached), Robin's clips, one mixed narration.wav
// Writes src/gen/timeline.json (+ public/gen/narration.wav). Every scene and animation is timed from it,
// so the picture always follows the voice. Timing rules are the same as the older video (video/build.mjs).
//
// Environment: PIPER_PYTHON (python with piper-tts), PIPER_VOICE (.onnx), FFMPEG (a full ffmpeg).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES } from '../src/script/scenes';
import { isSay, Line, sayText, Usb } from '../src/script/types';
import { sentences, speakify, UNSPEAKABLE } from '../src/script/speak';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REPO = path.resolve(ROOT, '..');
const BUILD = path.join(ROOT, 'build');
const DRAFT = process.argv.includes('--draft');
const PY = process.env.PIPER_PYTHON || 'python3';
const VOICE = process.env.PIPER_VOICE || path.join(REPO, 'audio/voices/en_US-norman-medium.onnx');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const LENGTH_SCALE = 1.05;
const SR = 22050;
export const FPS = 30;
const LEAD = 0.6, TAIL = 1.0, GAP_SENTENCE = 0.28, GAP_LINE = 0.5, GAP_ROBIN = 0.75, GAP_PAUSE = 0.3;

export type Chunk = { start: number; end: number; cap: string; file?: string };
export type TLine = { kind: 'say' | 'robin' | 'pause'; start: number; end: number; cap: string; usb: Usb; adds: string[]; track?: number; chunks: Chunk[] };
export type TScene = { id: string; title: string; part: string; step?: string; start: number; end: number; lines: TLine[] };
export type Timeline = { fps: number; total: number; draft: boolean; scenes: TScene[] };

// ---------- WAV helpers (16-bit PCM mono)
function readWav(file: string) {
  const b = fs.readFileSync(file);
  let o = 12, rate = 0, ch = 0, bits = 0;
  while (o < b.length - 8) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(o + 10); rate = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); }
    if (id === 'data') {
      if (bits !== 16) throw new Error(`${file}: expected 16-bit PCM`);
      const pcm = new Int16Array(b.buffer.slice(b.byteOffset + o + 8, b.byteOffset + o + 8 + size));
      return { rate, ch, pcm, dur: pcm.length / ch / rate };
    }
    o += 8 + size + (size % 2);
  }
  throw new Error(`bad wav ${file}`);
}
function writeWav(file: string, samples: Float32Array) {
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([h, pcm]));
}

// ---------- Robin's own clips (the same MP3s the real robot plays)
const robinCaption = (n: number): string => {
  const y = fs.readFileSync(path.join(REPO, 'audio/tracks.yaml'), 'utf8');
  const m = y.match(new RegExp(`^\\s*${n}:\\s*\\{[^\\n]*en:\\s*"([^"]+)"`, 'm'));
  if (!m) throw new Error(`track ${n} not found in audio/tracks.yaml`);
  return m[1];
};
const robinWav = (n: number) => {
  const out = path.join(BUILD, 'robin', `${String(n).padStart(2, '0')}.wav`);
  const mp3 = path.join(REPO, 'audio/en', `${String(n).padStart(2, '0')}.mp3`);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(mp3).mtimeMs) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', out]);
  }
  return out;
};
const robinDraftDur = (n: number) => JSON.parse(fs.readFileSync(path.join(REPO, 'audio/en/durations.json'), 'utf8'))[String(n)] / 1000;

// ---------- 1. every spoken sentence, with the symbol guard
type Job = { text: string; out: string };
const spokenOf = (l: string | { say: string; speak?: string }) => (typeof l === 'string' ? l : l.speak ?? l.say);
const jobs: Job[] = [];
const problems: string[] = [];
for (const s of SCENES) for (const l of s.lines) {
  if (!isSay(l)) continue;
  const caps = sentences(sayText(l)), spoken = sentences(spokenOf(l));
  if (caps.length !== spoken.length) problems.push(`${s.id}: caption and spoken text split into different sentence counts`);
  for (const sp of spoken) {
    const said = speakify(sp);
    if (UNSPEAKABLE.test(said)) problems.push(`${s.id}: the narrator cannot say "${said}" (symbol or SKU left)`);
    const hash = createHash('sha1').update(`${path.basename(VOICE)}|${LENGTH_SCALE}|${said}`).digest('hex').slice(0, 16);
    jobs.push({ text: said, out: path.join(BUILD, 'tts', `${hash}.wav`) });
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

if (!DRAFT) {
  const todo = jobs.filter((j) => !fs.existsSync(j.out));
  if (todo.length) {
    fs.mkdirSync(path.join(BUILD, 'tts'), { recursive: true });
    const jf = path.join(BUILD, 'tts_jobs.json');
    fs.writeFileSync(jf, JSON.stringify(todo));
    console.log(`[voice] synthesising ${todo.length} sentences with ${path.basename(VOICE)} …`);
    execFileSync(PY, [path.join(REPO, 'video/tts.py'), VOICE, jf, String(LENGTH_SCALE)], { stdio: 'inherit' });
  }
}

// ---------- 2. timeline
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
let t = 0, ji = 0, usb: Usb = 'out';
const scenes: TScene[] = [];
for (const s of SCENES) {
  const sc: TScene = { id: s.id, title: s.title, part: s.part, step: s.step, start: t, end: 0, lines: [] };
  t += LEAD;
  let lastGap = 0;
  for (const l of s.lines as Line[]) {
    if (typeof l !== 'string' && l.usb) usb = l.usb;
    const adds = typeof l !== 'string' && 'adds' in l ? l.adds ?? [] : [];
    if (isSay(l)) {
      const caps = sentences(sayText(l));
      const line: TLine = { kind: 'say', start: t, end: 0, cap: sayText(l), usb, adds, chunks: [] };
      caps.forEach((cap) => {
        const job = jobs[ji++];
        const dur = DRAFT ? 0.35 + words(job.text) / 2.55 : readWav(job.out).dur;
        line.chunks.push({ start: t, end: t + dur, cap, file: DRAFT ? undefined : path.relative(ROOT, job.out) });
        t += dur + GAP_SENTENCE;
      });
      t -= GAP_SENTENCE;
      line.end = t;
      t += GAP_LINE; lastGap = GAP_LINE;
      sc.lines.push(line);
    } else if ('robin' in l) {
      const dur = DRAFT ? robinDraftDur(l.robin) : readWav(robinWav(l.robin)).dur;
      const cap = robinCaption(l.robin);
      sc.lines.push({ kind: 'robin', start: t, end: t + dur, cap, usb, adds, track: l.robin, chunks: [{ start: t, end: t + dur, cap }] });
      t += dur + GAP_ROBIN; lastGap = GAP_ROBIN;
    } else {
      const cap = l.cap ?? 'Pause the video and think';
      sc.lines.push({ kind: 'pause', start: t, end: t + l.pause, cap, usb, adds, chunks: [{ start: t, end: t + l.pause, cap }] });
      t += l.pause + GAP_PAUSE; lastGap = GAP_PAUSE;
    }
  }
  t += TAIL - lastGap;
  sc.end = t;
  scenes.push(sc);
}
const r3 = (x: number) => Math.round(x * 1000) / 1000;
for (const s of scenes) {
  s.start = r3(s.start); s.end = r3(s.end);
  for (const l of s.lines) { l.start = r3(l.start); l.end = r3(l.end); for (const c of l.chunks) { c.start = r3(c.start); c.end = r3(c.end); } }
}
const tl: Timeline = { fps: FPS, total: r3(t), draft: DRAFT, scenes };
fs.mkdirSync(path.join(ROOT, 'src/gen'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'src/gen/timeline.json'), JSON.stringify(tl, null, 1));
console.log(`[voice] timeline: ${scenes.length} scenes, ${(t / 60).toFixed(1)} min${DRAFT ? ' (draft estimate)' : ''}`);

// ---------- 3. one mixed narration track (each clip levelled to the same loudness)
if (!DRAFT) {
  const total = Math.ceil(t * SR) + SR;
  const mix = new Float32Array(total);
  const TARGET = 0.08;
  const place = (file: string, t0: number) => {
    const w = readWav(file);
    if (w.rate !== SR || w.ch !== 1) throw new Error(`${file}: expected ${SR} Hz mono`);
    let sq = 0, peak = 1e-4;
    for (let i = 0; i < w.pcm.length; i++) { const v = w.pcm[i] / 32768; sq += v * v; peak = Math.max(peak, Math.abs(v)); }
    const gain = Math.min(3, TARGET / Math.max(1e-4, Math.sqrt(sq / w.pcm.length)), 0.9 / peak);
    const o = Math.round(t0 * SR);
    for (let i = 0; i < w.pcm.length && o + i < total; i++) mix[o + i] += (w.pcm[i] / 32768) * gain;
  };
  for (const s of scenes) for (const l of s.lines) {
    if (l.kind === 'say') for (const c of l.chunks) place(path.join(ROOT, c.file!), c.start);
    if (l.kind === 'robin') place(robinWav(l.track!), l.start);
  }
  writeWav(path.join(ROOT, 'public/gen/narration.wav'), mix);
  console.log('[voice] public/gen/narration.wav');
}
