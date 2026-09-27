#!/usr/bin/env node
/* Build the Robin build-guide video.
 *
 *   node video/build.mjs all            narration -> timeline -> audio -> frames -> final MP4 (+ .srt)
 *   node video/build.mjs timeline       only (re)generate narration + build/timeline.js
 *   node video/build.mjs check          seek through every scene in a browser, report JS errors
 *   node video/build.mjs snap --at 12,40.5   PNG screenshots at those seconds (build/snaps/)
 *   node video/build.mjs frames|audio|mux    single stages
 *
 * Options: --draft (no TTS, estimated timings) --fps 24 --scale 1.5 (1280x720 css px -> 1920x1080)
 *          --workers 3 --python <python with piper-tts> --voice <piper .onnx> --length-scale 1.05
 * Needs: Node 18+, ffmpeg/ffprobe, Playwright + Chromium, and piper-tts in --python (not for --draft).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const BUILD = path.join(HERE, 'build');
const SCENE_FILES = ['scenes/common.js', 'scenes/1_idea.js', 'scenes/2_build.js', 'scenes/2b_build.js', 'scenes/3_work.js'];

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes('--' + n);
const CMD = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'all';
const FPS = Number(opt('fps', 24));
const SCALE = Number(opt('scale', 1.5));
const WORKERS = Number(opt('workers', 3));
const DRAFT = flag('draft');
const PYTHON = opt('python', process.env.PIPER_PYTHON || 'python3');
const VOICE = opt('voice', path.join(REPO, 'audio/voices/en_US-norman-medium.onnx'));
const LENGTH_SCALE = Number(opt('length-scale', 1.05));
const OUT = path.resolve(opt('out', path.join(HERE, 'robin_build_guide.mp4')));
const SR = 22050;

// Timing rules (seconds)
const LEAD = 0.6, TAIL = 1.0, GAP_SENTENCE = 0.28, GAP_LINE = 0.5, GAP_ROBIN = 0.75, GAP_PAUSE = 0.3;

fs.mkdirSync(BUILD, { recursive: true });
const log = (...a) => console.log('[video]', ...a);

// ---------------------------------------------------------------------------------------------
// Narration text
// ---------------------------------------------------------------------------------------------
const SPEAK = [
  [/\bUNO R4 WiFi\b/g, 'Uno R4 Wi-Fi'], [/\bUNO R4\b/g, 'Uno R4'], [/\bWiFi\b/g, 'Wi-Fi'],
  [/\b5V\b/g, 'five volt'], [/\b3\.3 volts\b/g, 'three point three volts'], [/\b0\.05 volts\b/g, 'zero point zero five volts'],
  [/\bGND\b/g, 'G N D'], [/\bVCC\b/g, 'V C C'], [/\bLDRs\b/g, 'L D Rs'], [/\bLDR\b/g, 'L D R'], [/\bPIR\b/g, 'P I R'],
  [/\bMQTT\b/g, 'M Q T T'], [/\bQoS\b/g, 'Q O S'], [/\bIDE\b/g, 'I D E'], [/\bUSB-C\b/g, 'U S B C'], [/\bmicro-USB\b/g, 'micro U S B'],
  [/\bUSB\b/g, 'U S B'], [/\bLEDs\b/g, 'L E Ds'], [/\bLED\b/g, 'L E D'], [/\bIP\b/g, 'I P'], [/\bTX\b/g, 'T X'], [/\bRX\b/g, 'R X'],
  [/\bA0\b/g, 'A zero'], [/\bA1\b/g, 'A one'], [/\bD0\b/g, 'D zero'], [/\bD1\b/g, 'D one'], [/\bD2\b/g, 'D two'], [/\bD3\b/g, 'D three'],
  [/\bSQLite\b/g, 'S Q Lite'], [/\brobin-01\b/g, 'robin zero one'], [/\bDFR0534\b/g, 'D F R zero five three four'],
  [/\bVAT\b/g, 'V A T'], [/\bOpen-Meteo\b/g, 'Open Meteo'], [/\bArduinoMqttClient\b/g, 'Arduino M Q T T Client'],
  [/\barduino_secrets\.example\.h\b/g, 'arduino secrets dot example dot h'], [/\barduino_secrets\.h\b/g, 'arduino secrets dot h'],
  [/\brobin\.ino\b/g, 'robin dot ino'], [/\blight_raw\b/g, 'light raw'], [/\bpir_raw\b/g, 'P I R raw'], [/\btx-failed\b/g, 'T X failed'],
  [/\bmosquitto_sub\b/g, 'mosquitto sub'], [/\bipconfig getifaddr en0\b/g, 'I P config, get if addr, E N zero'], [/\bipconfig\b/g, 'I P config'],
  [/\bpython -m robin run\b/g, 'python, dash m, robin, run'], [/\bKradex\b/g, 'Kradex'], [/\b8 47\b/g, 'eight forty-seven'],
  [/\bvol 15\b/g, 'vol fifteen'], [/\bvol 20\b/g, 'vol twenty'], [/\bsay 3\b/g, 'say three'], [/\b115200\b/g, 'one hundred fifteen thousand two hundred'],
  [/\b1023\b/g, 'ten twenty-three'], [/\bMrs\. /g, 'Missus '], [/\bIsolation Forest\b/g, 'Isolation Forest'],
];
const speakify = (s) => SPEAK.reduce((r, [a, b]) => r.replace(a, b), s);
function sentences(text) {
  const prot = text.replace(/\b(Mrs|Mr|Dr|e\.g|i\.e)\./g, '$1§');
  return prot.split(/(?<=[.!?])\s+(?=[A-Z0-9'"‘“(])/).map((s) => s.replace(/§/g, '.').trim()).filter(Boolean);
}

function loadScenes() {
  const defs = [];
  const ctx = vm.createContext({ defineScene: (d) => defs.push(d), V: {}, console });
  for (const f of SCENE_FILES) vm.runInContext(fs.readFileSync(path.join(HERE, f), 'utf8'), ctx, { filename: f });
  return defs;
}

function robinTracks() {
  const yaml = fs.readFileSync(path.join(REPO, 'audio/tracks.yaml'), 'utf8');
  const out = {};
  for (const m of yaml.matchAll(/^\s*(\d+):\s*\{name:\s*(\w+),\s*en:\s*"([^"]*)"/gm)) out[+m[1]] = { name: m[2], text: m[3] };
  return out;
}

function wavInfo(file) {
  const b = fs.readFileSync(file);
  let off = 12, fmt = null;
  while (off < b.length - 8) {
    const id = b.toString('ascii', off, off + 4), size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(off + 10), rate: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22) };
    if (id === 'data') {
      const n = size / (fmt.ch * fmt.bits / 8);
      const pcm = new Int16Array(b.buffer.slice(b.byteOffset + off + 8, b.byteOffset + off + 8 + n * 2 * fmt.ch));
      return { ...fmt, samples: n, dur: n / fmt.rate, pcm };
    }
    off += 8 + size + (size % 2);
  }
  throw new Error('bad wav ' + file);
}

function robinWav(track) {
  const out = path.join(BUILD, 'robin', `${String(track).padStart(2, '0')}.wav`);
  if (!fs.existsSync(out)) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(REPO, 'audio/en', `${String(track).padStart(2, '0')}.mp3`), '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', out]);
  }
  return out;
}

function facesJs() {
  const src = fs.readFileSync(path.join(REPO, 'firmware/robin/face.h'), 'utf8');
  const names = [...src.match(/MOOD_NAMES\[MOOD_COUNT\]\s*=\s*\{([^}]*)\}/)[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);
  const rows = [...src.matchAll(/\{([01](?:\s*,\s*[01]){11})\}/g)].map((m) => m[1].split(',').map((x) => +x.trim()));
  if (rows.length !== names.length * 8) throw new Error(`face.h: expected ${names.length * 8} rows, got ${rows.length}`);
  const faces = Object.fromEntries(names.map((n, i) => [n, rows.slice(i * 8, i * 8 + 8)]));
  fs.writeFileSync(path.join(BUILD, 'faces.js'), `// generated from firmware/robin/face.h by build.mjs\nwindow.FACES = ${JSON.stringify(faces)};\n`);
}

// ---------------------------------------------------------------------------------------------
// 1. Narration + timeline
// ---------------------------------------------------------------------------------------------
function buildTimeline() {
  facesJs();
  const defs = loadScenes();
  const tracks = robinTracks();
  const hash = (s) => crypto.createHash('sha1').update(`${path.basename(VOICE)}|${LENGTH_SCALE}|${s}`).digest('hex').slice(0, 16);
  // collect TTS jobs
  const jobs = [];
  for (const d of defs) for (const l of d.lines) if (typeof l === 'string') for (const s of sentences(l)) {
    const text = speakify(s);
    jobs.push({ text, out: path.join(BUILD, 'tts', hash(text) + '.wav') });
  }
  if (!DRAFT) {
    const jf = path.join(BUILD, 'tts_jobs.json');
    fs.writeFileSync(jf, JSON.stringify(jobs));
    const todo = jobs.filter((j) => !fs.existsSync(j.out)).length;
    log(`narration: ${jobs.length} sentences, ${todo} to synthesise`);
    if (todo) execFileSync(PYTHON, [path.join(HERE, 'tts.py'), VOICE, jf, String(LENGTH_SCALE)], { stdio: 'inherit' });
  }
  const estimate = (s) => 0.35 + s.split(/\s+/).length / 2.55;
  let t = 0;
  const scenes = [];
  for (const d of defs) {
    const sc = { id: d.id, title: d.title, step: d.step || '', part: d.part || '', start: t, lines: [] };
    t += LEAD;
    let lastGap = 0;
    for (const l of d.lines) {
      const line = { start: t };
      if (typeof l === 'string') {
        line.kind = 'say'; line.cap = l; line.chunks = [];
        for (const s of sentences(l)) {
          const text = speakify(s);
          const file = path.join(BUILD, 'tts', hash(text) + '.wav');
          const dur = DRAFT ? estimate(s) : wavInfo(file).dur;
          line.chunks.push({ start: t, end: t + dur, cap: s, file: DRAFT ? null : path.relative(HERE, file) });
          t += dur + GAP_SENTENCE;
        }
        t -= GAP_SENTENCE; line.end = t; t += GAP_LINE; lastGap = GAP_LINE;
      } else if (l.robin) {
        const tr = tracks[l.robin];
        const dur = wavInfo(robinWav(l.robin)).dur;
        Object.assign(line, { kind: 'robin', track: l.robin, cap: tr.text, end: t + dur, chunks: [{ start: t, end: t + dur, cap: tr.text }] });
        t += dur + GAP_ROBIN; lastGap = GAP_ROBIN;
      } else if (l.pause) {
        Object.assign(line, { kind: 'pause', cap: l.cap || 'Pause the video and think', end: t + l.pause, chunks: [] });
        t += l.pause + GAP_PAUSE; lastGap = GAP_PAUSE;
      } else throw new Error(`scene ${d.id}: unknown line ${JSON.stringify(l)}`);
      sc.lines.push(line);
    }
    t += TAIL - lastGap;
    sc.end = t;
    scenes.push(sc);
  }
  const round = (x) => Math.round(x * 1000) / 1000;
  const tl = { fps: FPS, total: round(t), draft: DRAFT, scenes: scenes.map((s) => ({ ...s, start: round(s.start), end: round(s.end), lines: s.lines.map((l) => ({ ...l, start: round(l.start), end: round(l.end), chunks: l.chunks.map((c) => ({ ...c, start: round(c.start), end: round(c.end) })) })) })) };
  fs.writeFileSync(path.join(BUILD, 'timeline.json'), JSON.stringify(tl, null, 1));
  fs.writeFileSync(path.join(BUILD, 'timeline.js'), `// generated by build.mjs\nwindow.TIMELINE = ${JSON.stringify(tl)};\n`);
  log(`timeline: ${scenes.length} scenes, ${(t / 60).toFixed(1)} min${DRAFT ? ' (draft estimate)' : ''}`);
  return tl;
}
const readTimeline = () => JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json'), 'utf8'));

// ---------------------------------------------------------------------------------------------
// 2. Audio: one mono track, every clip placed at its exact time
// ---------------------------------------------------------------------------------------------
function buildAudio(tl) {
  const total = Math.ceil(tl.total * SR) + SR;
  const mix = new Float32Array(total);
  const TARGET = 0.08; // RMS per clip, so the narrator and Robin sound equally loud
  const place = (file, t0) => {
    const w = wavInfo(file);
    if (w.rate !== SR || w.ch !== 1) throw new Error(`${file}: expected ${SR} Hz mono`);
    let sq = 0, peak = 1e-4;
    for (let i = 0; i < w.samples; i++) { const v = w.pcm[i] / 32768; sq += v * v; peak = Math.max(peak, Math.abs(v)); }
    const gain = Math.min(3, TARGET / Math.max(1e-4, Math.sqrt(sq / w.samples)), 0.9 / peak);
    const o = Math.round(t0 * SR);
    for (let i = 0; i < w.samples && o + i < total; i++) mix[o + i] += (w.pcm[i] / 32768) * gain;
  };
  for (const s of tl.scenes) for (const l of s.lines) {
    if (l.kind === 'say') for (const c of l.chunks) place(path.join(HERE, c.file), c.start);
    if (l.kind === 'robin') place(robinWav(l.track), l.start);
  }
  const pcm = Buffer.alloc(total * 2);
  for (let i = 0; i < total; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mix[i] * 32767))), i * 2);
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
  hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(SR, 24);
  hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(BUILD, 'narration.wav'), Buffer.concat([hdr, pcm]));
  log('audio: build/narration.wav');
}

// ---------------------------------------------------------------------------------------------
// 3. Frames: a local web server + Playwright, several browsers in parallel
// ---------------------------------------------------------------------------------------------
function loadPlaywright() {
  const req = createRequire(import.meta.url);
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) {
    try { return req(p); } catch { /* try next */ }
  }
  throw new Error('Playwright not found (npm i -g playwright, or set NODE_PATH)');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.css': 'text/css' };
async function serve() {
  const server = http.createServer((req, res) => {
    const p = path.join(HERE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(HERE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html` };
}

async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: SCALE });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true || window.__initError, null, { timeout: 60000 }).catch(() => {});
  if (errors.length) throw new Error('page errors:\n' + errors.join('\n'));
  return { page, errors };
}

// One video segment per scene (build/seg/<id>.mp4), so a fixed scene can be re-rendered alone:
//   node video/build.mjs frames --scenes step3c,step4a     (existing segments are kept otherwise)
async function renderFrames(tl) {
  const { chromium } = loadPlaywright();
  const { server, url } = await serve();
  const segDir = path.join(BUILD, 'seg');
  fs.mkdirSync(segDir, { recursive: true });
  const only = opt('scenes', null) ? opt('scenes').split(',') : null;
  const bounds = tl.scenes.map((s, i) => ({ id: s.id, f0: Math.round(s.start * FPS), f1: i + 1 < tl.scenes.length ? Math.round(tl.scenes[i + 1].start * FPS) : Math.ceil(tl.total * FPS) }));
  const segOf = (b) => path.join(segDir, `${String(tl.scenes.findIndex((s) => s.id === b.id)).padStart(2, '0')}_${b.id}.mp4`);
  const queue = bounds.filter((b) => (only ? only.includes(b.id) : flag('force') || !fs.existsSync(segOf(b))));
  const totalFrames = queue.reduce((n, b) => n + b.f1 - b.f0, 0);
  log(`frames: ${queue.length} scene(s), ${totalFrames} frames, ${WORKERS} workers`);
  let done = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(WORKERS, queue.length) }, async () => {
    const browser = await chromium.launch();
    const { page, errors } = await openPage(browser, url);
    for (let b = queue.shift(); b; b = queue.shift()) {
      const tmp = segOf(b).replace(/\.mp4$/, '.tmp.mp4');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', String(FPS * 4), '-threads', '1', '-f', 'mp4', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = b.f0; f < b.f1; f++) {
        await page.evaluate((t) => window.__seek(t), f / FPS);
        const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
        if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
        if (errors.length) throw new Error(`scene ${b.id} frame ${f}: ` + errors.join('\n'));
        if (++done % 1200 === 0) {
          const el = (Date.now() - t0) / 1000;
          log(`frames ${done}/${totalFrames}  (${(done / el).toFixed(1)} fps, ~${Math.round((totalFrames - done) / (done / el) / 60)} min left)`);
        }
      }
      ff.stdin.end();
      await once(ff, 'exit');
      fs.renameSync(tmp, segOf(b));
    }
    await browser.close();
  }));
  server.close();
  const missing = bounds.filter((b) => !fs.existsSync(segOf(b)));
  if (missing.length) { log(`not concatenated yet, missing: ${missing.map((b) => b.id).join(', ')}`); return; }
  const list = path.join(BUILD, 'segments.txt');
  fs.writeFileSync(list, bounds.map((b) => `file '${segOf(b)}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(BUILD, 'video.mp4')]);
  log(`frames: build/video.mp4 (${totalFrames} new frames in ${((Date.now() - t0) / 60000).toFixed(1)} min)`);
}

// ---------------------------------------------------------------------------------------------
// 4. Subtitles, chapters, final MP4
// ---------------------------------------------------------------------------------------------
const srtTime = (t) => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
function writeSrt(tl, file) {
  const cues = [];
  for (const s of tl.scenes) for (const l of s.lines) {
    if (l.kind === 'pause') cues.push({ start: l.start, end: l.end, text: `(${l.cap})` });
    for (const c of l.chunks) cues.push({ start: c.start, end: c.end + 0.25, text: l.kind === 'robin' ? `ROBIN: ${c.cap}` : c.cap });
  }
  fs.writeFileSync(file, cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(Math.min(c.end, cues[i + 1] ? cues[i + 1].start : c.end))}\n${c.text}\n`).join('\n'));
}
function writeChapters(tl, file) {
  let txt = ';FFMETADATA1\ntitle=Robin build guide (explained like you\'re five)\nartist=DT smart system\n';
  for (const s of tl.scenes) txt += `\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(s.start * 1000)}\nEND=${Math.round(s.end * 1000)}\ntitle=${(s.step ? s.step + ' · ' : '') + s.title}\n`;
  fs.writeFileSync(file, txt);
}
function mux(tl) {
  const srt = OUT.replace(/\.mp4$/, '.srt');
  writeSrt(tl, srt);
  const meta = path.join(BUILD, 'chapters.txt');
  writeChapters(tl, meta);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(BUILD, 'video.mp4'), '-i', path.join(BUILD, 'narration.wav'), '-i', meta,
    '-map', '0:v', '-map', '1:a', '-map_metadata', '2', '-map_chapters', '2', '-c:v', 'copy',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  log(`done: ${path.relative(REPO, OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB) + ${path.relative(REPO, srt)}`);
}

// ---------------------------------------------------------------------------------------------
async function check(tl) {
  const { chromium } = loadPlaywright();
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser, url);
  const times = [];
  for (const s of tl.scenes) { times.push(s.start + 0.01, (s.start + s.end) / 2, s.end - 0.05); for (const l of s.lines) times.push(l.start + 0.3, l.end); }
  for (const t of times) {
    try { await page.evaluate((x) => window.__seek(x), t); } catch (e) { errors.push(`t=${t.toFixed(2)}: ${e.message}`); }
  }
  await browser.close(); server.close();
  if (errors.length) { console.error(errors.slice(0, 20).join('\n')); process.exit(1); }
  log(`check: ${times.length} seeks OK`);
}

async function snap(tl) {
  const { chromium } = loadPlaywright();
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const { page } = await openPage(browser, url);
  const dir = path.join(BUILD, 'snaps');
  fs.mkdirSync(dir, { recursive: true });
  let at = (opt('at', '') || '').split(',').filter(Boolean).map(Number);
  const sceneArg = opt('scene', null);
  if (sceneArg) for (const id of sceneArg.split(',')) {
    const s = tl.scenes.find((x) => x.id === id);
    if (!s) throw new Error('no scene ' + id);
    const n = Number(opt('n', 4));
    for (let i = 1; i <= n; i++) at.push(s.start + ((s.end - s.start) * i) / (n + 1));
  }
  for (const t of at) {
    await page.evaluate((x) => window.__seek(x), t);
    const f = path.join(dir, `t${t.toFixed(1).padStart(7, '0')}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await browser.close(); server.close();
}

(async () => {
  let tl;
  if (['all', 'timeline'].includes(CMD) || !fs.existsSync(path.join(BUILD, 'timeline.json'))) tl = buildTimeline();
  else { tl = readTimeline(); facesJs(); }
  if (CMD === 'check') await check(tl);
  if (CMD === 'snap') await snap(tl);
  if (['all', 'audio'].includes(CMD)) buildAudio(tl);
  if (['all', 'frames'].includes(CMD)) await renderFrames(tl);
  if (['all', 'mux'].includes(CMD)) mux(tl);
})().catch((e) => { console.error(e); process.exit(1); });
