# Robin build-guide video

A 32-minute animated, narrated walkthrough in plain language. It covers the idea, the parts, all 8 build steps with a test after each one, and a day with the finished robot. The output is 1920×1080 at 24 fps, with burned-in captions, a separate `.srt` subtitle file and chapter markers.

The video is **generated from code**: every picture is an SVG/HTML scene that is a pure function of time, and the narration is synthesised offline with Piper. So you can change a sentence or a wire colour and rebuild. You never need to touch a video editor.

## Chapters

| Time | Part | What you learn |
|---|---|---|
| 0:00 | Welcome | what we build |
| 0:25 | **1 · The idea** | who Robin is for, Tessa vs Robin, the body parts, the big picture (robot → MQTT → laptop brain → family) |
| 2:55 | **2 · Get ready** | shopping list (€39.00), extras, jumper-wire ends, software first, the golden rule (unplug while wiring), breadboard, pin map |
| 7:23 | **3 · Build**, steps 1–8 | the same numbering as [docs/04_assembly.md](../docs/04_assembly.md) |
| 7:23 | Step 1 | power rails |
| 8:05 | Step 2 | LDR: why a voltage divider, wiring, `raw` test |
| 10:17 | Step 3 | PIR: dome, knobs + jumper, wiring, why an analog pin, test |
| 12:59 | Step 4 | buttons: pull-up + bounce, the four-leg puzzle, wiring, test |
| 14:59 | Step 5 | voice: soldering the speaker, loading the MP3s, wiring, why TX/RX cross, test |
| 18:27 | Step 6 | LED faces |
| 19:09 | Step 7 | go online: hotspot, `arduino_secrets.h`, broker, test |
| 21:11 | Step 8 | the Kradex body + felt |
| 22:18 | Recap + troubleshooting | the whole circuit, what to check when something fails |
| 23:14 | **4 · Robin at work** | start-up, MQTT + QoS, Last Will, storage + windows, Isolation Forest, a day with Mrs. Jansen, the 03:00 check-in, "too quiet", privacy, the 7 requirements |
| 30:30 | **5 · Wrap-up** | 3-question self-quiz (pause and answer out loud), your next steps |

When an orange **⏸ pill** with a countdown appears in the caption bar, it is a thinking moment: pause the video, predict or answer out loud, then continue.

## Watch it

The MP4 is not in git because it is too big for GitHub. Build it yourself (below), or use the copy that was shared with you. Most players pick up `robin_build_guide.srt` automatically when it sits next to the MP4.

The full build is 1080p and about 126 MB. For an upload with a size limit (Canvas, Teams, email), make a 720p copy of about 28 MB. The scenes are designed at 1280×720, so everything stays readable, and the chapters are kept:

```bash
cd video
ffmpeg -i robin_build_guide.mp4 -map 0:v -map 0:a -map_chapters 0 -vf scale=1280:720:flags=lanczos \
  -c:v libx264 -preset slow -tune animation -crf 28 -pix_fmt yuv420p -g 240 \
  -c:a aac -b:a 32k -ac 1 -ar 24000 -movflags +faststart robin_build_guide_720p.mp4
```

## Rebuild it

Requirements:
- Node 18+
- `ffmpeg` + `ffprobe`
- [Playwright](https://playwright.dev) with Chromium (`npm i -g playwright && npx playwright install chromium`)
- For the narration: Python with `piper-tts` and the narrator voice:

```bash
python -m venv .ttsvenv && source .ttsvenv/bin/activate
pip install piper-tts
python -m piper.download_voices en_US-norman-medium --download-dir audio/voices
```

Robin's own lines come from the ready-made clips in `audio/en/NN.mp3`, so the robot in the video sounds exactly like your real robot.

```bash
# from the repository root
node video/build.mjs all --python .ttsvenv/bin/python        # everything: ~30 min render on 3 cores
node video/build.mjs all --draft                            # no TTS: estimated timings, no narrator voice, quick layout check
```

Single stages (useful while editing):

| Command | Does |
|---|---|
| `timeline` | synthesise any new sentences (cached per sentence), write `build/timeline.js` |
| `check` | seek through every scene in Chromium, report JS errors |
| `snap --at 12,40.5` / `snap --scene step3a,night --n 3` | PNG stills in `build/snaps/` |
| `audio` | mix the narration + Robin clips into `build/narration.wav` |
| `frames [--scenes id,id] [--force]` | render per-scene segments `build/seg/NN_id.mp4` (only missing ones unless `--force`) |
| `mux` | concatenate the segments, add audio (loudness-normalised), chapters and the `.srt` |

Typical edit loop: change a line in `scenes/*.js`, run `timeline`, `check`, `snap --scene <id>`, `audio`, `frames --scenes <id> --force`, then `mux`. If a sentence changes length, every later scene moves in time, so re-render all segments after it.

## How it works

- `engine.js`: drawing kit (Arduino UNO R4, breadboard with x-ray strips, LDR, PIR, buttons, DFR0534, speaker, robot, room, phone, terminal, cards). It also holds the tiny runtime: `window.__seek(t)` draws the frame at time *t*, with scene crossfades, captions and the header.
- `scenes/`: 51 scenes in 5 parts. Each scene has `lines` (narrator text, `{ robin: N }` for Robin's clip *N*, `{ pause: s }` for a thinking pause) and a `build()` that returns `update(t)`. `T.s(i)` and `T.e(i)` are the real start/end times of line *i*, so the animations stay in sync with the voice.
- `build.mjs`: the pipeline (Piper per sentence → timeline → audio mix → Playwright screenshots piped into ffmpeg → mux).
- The LED faces are read straight from `firmware/robin/face.h`, so the video always shows the faces the robot really draws.
- `build/` is generated and git-ignored.

## Credits and licences

- Fonts: [Nunito](https://github.com/googlefonts/nunito) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), both SIL Open Font License 1.1 (see `fonts/LICENSE-*.txt`). Emoji come from the system emoji font (Noto Color Emoji).
- Narrator: Piper voice `en_US-norman-medium` ([piper-voices](https://huggingface.co/rhasspy/piper-voices), trained on public-domain LibriVox recordings). Robin: `en_GB-cori-high` (see the main README). Fine for this course project; check the model cards before any commercial use.
