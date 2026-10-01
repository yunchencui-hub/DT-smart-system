# Project memory: "Robin", a routine-aware care robot

Read this file first in every session. Keep it short. Update **Status** and **Decisions** whenever something changes.

## Context
- Course: *Digital Designs and Applications* (DT master, year 2, Fontys). Tech-push duo project.
- Graded by: 7 knock-out components + oral assessment (rubric: sensing part 1-4, smart part 5-7, architecture, test objectives, test execution).
- Deliverables: functioning prototype (video/photos), test plan + results (duo), **Prototype Design Notes (individual, max 5 pages)**.
- Inspiration: Tinybots **Tessa** (idea #12 in the assignment). Register the concept with the lecturer (the idea list is first-come).
- The user is a newbie; I act as the senior partner and teach ELI5 (`docs/09_learning_guide.md`).

## Hard constraints
- Budget: **€50 incl. VAT, shipping included**. Order only from the approved supplier list (Tinytronics is the main one).
- Board: the school gives an **Arduino UNO R4 WiFi** (assumed; confirm). 5 V GPIO, Serial1 = D0/D1, 12x8 LED matrix.
- Keep it simple. Buy modules; don't build electronics from scratch.
- Academic integrity: do **not** write the Design Notes text or the test cases for the user. Give templates, prompts and worked examples on *other* components. Code, BOM, wiring and setup are fine.

## Decisions (why, in one line each)
- Sensors: PIR HC-SR501 (activity), LDR (light), 2 buttons (yes/no answers). Cheap, proven (Sensara-style lifestyle monitoring).
- PIR read on **analog pin A1** with a threshold, because R4 VIH is about 3.5-4 V and the PIR outputs 3.3 V.
- Voice: DFRobot **DFR0534** MP3 module (8 MB onboard flash, so no microSD, since SD cards cost ≥ €18 in 2026). Our own ~40-line UART driver in `voice.h`.
- Voice wiring: the module's **Gravity cable** (female DuPont end) + 4 **M-M** wires: + / − to the rails, T → D0, R → 1 kΩ → D1. Speaker: **8 Ω 2 W speaker set** (003415, one of its two speakers used). A **680 µF** capacitor (006948) across the rails next to the module, stripe to −, against current gulps (tutor: "speakers can be tricky").
- Protocol: **MQTT** (Mosquitto on the laptop). Telemetry QoS0 every 2 s, events QoS1, retained status + Last Will.
- Storage: **SQLite** (WAL). Processing: pandas windows. ML: **IsolationForest** plus a per-hour threshold baseline.
- Extra data source: Open-Meteo weather API (no key). Caregiver alerts: ntfy.sh push.
- Autonomous actions: presence-aware spoken reminders, anomaly check-in, caregiver alert, LED-matrix face.

## Repo map
- `docs/`: numbered guides 00-09 (start at `00_START_HERE.md`); `docs/templates/` has prompt-only templates.
- `firmware/robin/`: Arduino sketch (`robin.ino`, `voice.h`, `face.h`, `arduino_secrets.example.h`).
- `backend/robin/`: Python package, CLI `python -m robin <cmd>`. Tests in `backend/tests/`.
- `audio/`: `tracks.yaml` (texts), `make_audio.py` (Piper TTS), generated `en/NN.mp3`.
- `broker/mosquitto.conf`: LAN broker config.
- `video/`: generated build-guide video (SVG scenes + Piper narration → MP4). `node video/build.mjs all`; see `video/README.md`.

## How to verify
- `cd backend && python -m pytest -q`
- Compile firmware: `arduino-cli compile -b arduino:renesas_uno:unor4wifi firmware/robin`
- E2E without hardware: `mosquitto -c broker/mosquitto.conf` + `python -m robin simulate` + `python -m robin run`

## Lessons learned (don't re-learn these)
- IsolationForest missed "normal value at the wrong hour", so it now gets per-hour z-score context features (`model._matrix`).
- Inactivity is a separate learned rule (quiet_min > P99×1.2 per hour); inside the forest it broke the night demo.
- The brain must not score or talk while the robot is offline (`robot_online`). Found in the E2E test.
- The demo clock starts when the brain starts: start the brain at minute 5:30 of the demo (docs/08).
- `pkill -f "robin ..."` kills your own shell. Use `pgrep -f "^[^ ]*python[^ ]* -m robin"`.
- Video: SVG `stroke-dasharray` drawing makes dashed lines solid, so fade them in instead. Inline styles beat the `.night` CSS, so set header colours in `seek`.
- DFR0534 (datasheet p.2 board photo, V1.0; the pin TABLE is incomplete): white Gravity **socket** T R − + on the module (the cable has the plug); holes VCC GND RX TX BUSY / ONE DACR DACL SP− SP+; a separate 2-pin SPK socket (our speaker plug doesn't fit). Speaker → SP+/SP− holes only. The Gravity cable ends in FEMALE sockets, so M-M wires (docs/04 said F-M until 30 Sep). The speaker set's 4-pin plug also fits the Gravity socket: never plug it in.
- Fontys order form (FOR 05-03, .xlsm): write the sheet XML directly. Re-saving with openpyxl or LibreOffice drops the macro buttons. tinytronics.nl blocks curl (Cloudflare), but the WebFetch tool gets through. The SKU is the 6-digit number, not the model code in the title (breadboard = 000070, not BB400P).

## Status (update me)
- 2026-09-24: v1 done. BOM verified: **€39.00** (scenario A) / €30.95 (B) / €25.00 (C). Firmware compiles (R4 WiFi + UNO WiFi Rev2), 36 pytest pass, E2E with Mosquitto + simulator verified (night check-in, yes/no, offline alert, latency, report). Audio en+nl generated.
- 2026-09-26: build-guide video added (`video/`, 51 scenes, 31.9 min, 1080p, SRT + chapters). The MP4 is git-ignored (too big) and was shared in the session.
- 2026-09-27: Fontys order form FOR 05-03 filled: user buys everything (scenario A, 15 Tinytronics lines, €32.05 incl. VAT). All SKUs and prices re-checked on the product pages; docs/03 corrected. All required fields filled; the user already owns the micro-USB cable. Ready to e-mail to store-room@fontys.nl. The form adds no Tinytronics shipping (its own AND() quirk). The form is not committed (personal data).
- 2026-09-30: tutor feedback (Jules: more jumper wires; speakers are tricky). Order form updated in another session to **16 lines, €35.95** (≈ €42.90 with parcel): speaker set 8 Ω 2 W (003415) replaces the 1 W speaker, M-M ×3, M-F ×2, + 680 µF 25 V ×2 (006948). docs/03, docs/04 (Gravity cable + M-M, capacitor step, speaker-set step, safety fixes), README, docs/00 updated.
- **Next for user:** register concept #12, confirm board = UNO R4 WiFi, e-mail the completed order form (30 Sep version) to store-room@fontys.nl, run the simulator (docs/05 B).
