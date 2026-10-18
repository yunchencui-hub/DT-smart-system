# Robin build guide, the Remotion video (follows docs/04)

A narrated, animated video of [docs/04_assembly.md](../docs/04_assembly.md), step by step, for the parts of the **30 Sep 2026 order** (16 lines: 2 W speaker set, 680 µF capacitor, extra jumper wires; see [docs/03](../docs/03_shopping_list.md)). About 24 minutes (36 scenes), 1920 × 1080, with subtitles (`.srt`) and one chapter per scene.

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

## The real-footage video (`RobinRealBuild`)
A second video from **our own photos and clips** in [`video-assets/`](../video-assets/README.md): a chapter per docs/04 step, then the tests. It has its own entry point, so it needs neither Piper nor the narration timeline. Each picture is badged REAL PHOTO, REAL CLIP or DRAWING (the anatomy figure), and a step nobody has filmed yet shows a "still to shoot" card with its planned shots.
```
src/real/plan.ts             the chapters and the planned shots (= the shot list in video-assets/README.md)
src/real/timeline.ts         segments in whole frames, from the manifest
src/real/RealBuild.tsx       the video: intro, chapter titles, photos, clips (with their sound), placeholders, end
scripts/real-assets.ts       scan video-assets: names, HEIC, GPS in photos and clips → src/gen/real.json + public/real/
scripts/real-stills.ts       PNG stills for checking
```
```bash
npm run real                # draft manifest + coverage report (exit 1 if a file stores a GPS location)
npm run real:stills         # one still per kind of screen (--all, --seg 3,7)
npm run real:render         # out/robin_real_build.mp4
npm run real -- --final     # without the placeholder cards, for the version to hand in
```
`npm run real -- --assets <dir>` scans another folder, for layout tests with dummy files. Clips are used up to 30 s.

## The anatomy + ELI5 video (`RobinAnatomyBuild`)
The same build, step by step (docs/04), as **isometric figures in the style of the "anatomy" skill**, explained in plain words (ELI5). About 17 minutes, 16 chapters. The bench is drawn in 3D from the real sizes (UNO R4 WiFi, 400-point breadboard, HC-SR501, DFR0534, 2 W speaker, 680 µF can), and every part drops in exactly where `src/data/wiring.ts` puts it, so `netcheck` and the cable rules check this video too. The side panel shows the **renders of the parts we received** (`video-assets/parts/`), always badged RENDER; the header says *drawings, not footage*.

What the viewer sees:
- **Fig n card** (anatomy convention): Fig number top left, title top right, the USB state bottom left, a live readout bottom right (the wire going in now, e.g. `Arduino 5V → + rail`).
- **One idea per picture:** only the part being added glows; the rail, column or pin the narrator talks about lights up on the board (never a leader line).
- **Explainer figures:** the breadboard with its plastic lifted off (the metal clips), the PIR from the front with its dome pulled off (the pin labels).
- **Predict pauses** before the LDR, button, T/R and capacitor steps: guess first, then the test shows the answer.
- **Tests:** the USB-C plug slides in (ON LED, boot face ✗, then the scene's face), a Serial Monitor with example values in the firmware's own format, Robin's real voice clips; then it slides out again.
- **Faces:** a FACE card shows the face from above, because the 8.5 mm front header hides the matrix's bottom rows at this camera angle (as on the real board).

```
src/anatomy/kit/iso-kit.ts   the anatomy skill's core, unchanged (= the account upload's kit/iso-kit.ts; MIT, licence next to it)
src/anatomy/world.ts         the bench in 3D (mm): holes, pins, sockets, wire routes, from src/data/wiring.ts
src/anatomy/draw.ts          coloured kit solids, round rods (resistors), tubes (wires), surface glows
src/anatomy/parts.ts         every part as solids, built once; the LED matrix and the USB cable per frame
src/anatomy/Bench.tsx        the bench figure (painter's order by depth; a wire = 2 housings + 1 tube)
src/anatomy/figures.tsx      breadboard x-ray, PIR front, part render card
src/anatomy/script.ts        THE script: lines, cable state, adds, camera, glows, faces, Serial Monitor lines
src/anatomy/timeline.ts      figure state at any time (eased camera, glows, plug, part drop-in)
src/anatomy/AnatomyBuild.tsx the video: plate, side panel (renders, ELI5, CONNECT checklist), overlay, narration
scripts/anatomy-assets.ts    copies video-assets/parts/*.png to public/parts/
scripts/anatomy-stills.ts    stills per line (--scenes, --lines, --at)
```
```bash
npm run anatomy:prep            # part renders -> public/parts/, LED faces from face.h
npm run netcheck                # electrical check of the wiring data
npm run anatomy:voice           # Piper narration + timeline (anatomy:voice:draft = estimated timings, no audio)
npm run anatomy:review          # review/anatomy-script.md + cable rules R1-R5 (must pass)
npm run anatomy:stills -- --scenes a-step2 --scale 1   # check the pictures first
npm run anatomy:render && npm run anatomy:finish       # out/robin_anatomy_build_v1.mp4 (+ .srt, chapters, 720p copy)
```
Not used from the skill: its `audit.mjs` geometry proof and line-end check need its own recorder and HTML pages, so this bench was checked with close-up stills instead (every scene, several zooms). Two deliberate deviations from its craft rules: colour (wire colours, red/blue rails, caps and the capacitor stripe are what the viewer must match) and the silkscreen text printed on the real boards.

## Credits and licences
- [Remotion](https://www.remotion.dev) (free for individuals; see its licence for companies).
- The isometric kit `src/anatomy/kit/iso-kit.ts`: from the "anatomy" skill, [github.com/wheresryan22/anatomy](https://github.com/wheresryan22/anatomy), MIT, © 2026 Ryan (`src/anatomy/kit/LICENSE-anatomy.txt`).
- Fonts Nunito and JetBrains Mono (SIL OFL 1.1, `public/fonts/LICENSE-*.txt`); emoji from Noto Color Emoji.
- Narrator: Piper `en_US-norman-medium`; Robin: its own clips from `audio/en/` (`en_GB-cori-high`). See the main README.
