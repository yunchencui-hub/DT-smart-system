# Robin build guide, the Remotion video (follows docs/04)

A narrated, animated video of [docs/04_assembly.md](../docs/04_assembly.md), step by step, for the parts of the **30 Sep 2026 order** (16 lines: 2 W speaker set, 680 µF capacitor, extra jumper wires; see [docs/03](../docs/03_shopping_list.md)). About 21 minutes, 1920 × 1080, with subtitles (`.srt`) and one chapter per scene.

It replaces the build part of the older [`video/`](../video/README.md), whose voice-module wiring is outdated.

**Safety first, by design:**
- A badge in the top corner always shows whether the USB cable may be plugged in (🔌 USB OUT while wiring, ⚡ USB IN only for a test, 💽 when the voice module is alone on its micro-USB).
- Every test ends with "Unplug".
- The video says *read the label, not the picture* for every module, and *follow the red/blue lines printed on your breadboard*.
- **Before anything was rendered, a separate reviewer agent checked everything the viewer hears and sees** against docs/04, the firmware and the datasheets. The verdict is in [review/safety-review.md](review/safety-review.md).

## Chapters
1. **Get ready:** check your delivery (16 order lines with SKUs) · not in the order · jumper wires and the Gravity cable · upload the firmware · the golden rule and safety · how a breadboard works · the pin map
2. **Build:** step 1 power rails · step 2 LDR · step 3 PIR · step 4 buttons · step 5 voice (speaker, sound files, Gravity cable, why T/R cross, the capacitor, check then test) · step 6 faces · step 7 go online · step 8 the body
3. **Wrap-up:** recap · troubleshooting · next steps

## How it is built (Remotion structure)
```
src/index.ts, Root.tsx       registerRoot + the composition "RobinBuildGuide" (1280×720, rendered at scale 1.5)
src/BuildGuide.tsx           every scene at its exact place in the narration timeline + one narration track
src/Overlay.tsx              header, USB badge, captions
src/script/scenes.ts         THE script: every spoken line and every on-screen text (also what gets reviewed)
src/script/order.ts          the 16 order lines (= docs/03)
src/data/wiring.ts           THE wiring: every wire end and leg with its exact hole (= docs/04)
src/data/geom.ts, modules.ts Arduino / breadboard / module geometry (ported from video/engine.js)
src/kit/, src/bench/         SVG parts and the workbench, drawn from the wiring data
src/scenes/                  one React component per scene
scripts/netcheck.ts          electrical check of the wiring data (no short, polarity, pins = firmware, tables = docs)
scripts/review.ts            review/script.md + cable rules (never wire while plugged in, unplug after every test, …)
scripts/voice.ts             Piper narration per sentence (cached) + Robin's own clips → narration.wav + timeline
scripts/stills.ts            PNG stills for checking
scripts/finish.ts            loudness, chapters, .srt, 720p copy
```
The picture, the on-screen pin map, the review document and the electrical check are all generated from the **same** data, so they cannot disagree.

## Rebuild
Requirements: Node 18+, Python 3.10+ with `piper-tts` and `imageio-ffmpeg` (a full ffmpeg), the narrator voice `en_US-norman-medium`.
```bash
cd video-remotion
npm install
python -m venv .ttsvenv && .ttsvenv/bin/pip install piper-tts imageio-ffmpeg
.ttsvenv/bin/python -m piper.download_voices en_US-norman-medium --download-dir ../audio/voices
export PIPER_PYTHON=.ttsvenv/bin/python FFMPEG=$(.ttsvenv/bin/python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

npm run faces && npm run netcheck     # LED faces from firmware/robin/face.h; electrical check
npm run voice                         # narration + timeline (npm run voice:draft = estimated timings, no audio)
npm run review                        # review/script.md + cable rules
npm run studio                        # preview in the browser
npm run render && npm run finish      # out/robin_build_guide_v2.mp4 (+ .srt, 720p copy)
```
Optional: `REMOTION_BROWSER=/path/to/chrome-headless-shell` uses an existing browser instead of Remotion's download.
Change a sentence or a wire in `src/script/scenes.ts` / `src/data/wiring.ts`, then run `netcheck`, `voice` (only new sentences are synthesised), `review` and `stills` before rendering again.

## Credits and licences
- [Remotion](https://www.remotion.dev) (free for individuals; see its licence for companies).
- Fonts Nunito and JetBrains Mono (SIL OFL 1.1, `public/fonts/LICENSE-*.txt`); emoji from Noto Color Emoji.
- Narrator: Piper `en_US-norman-medium`; Robin: its own clips from `audio/en/` (`en_GB-cori-high`). See the main README.
