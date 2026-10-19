# Independent review of the debug guide (`RobinAnatomyDebug`), 19 Oct 2026

The review ran on the first render's script (commit `0f88bc5`) and had two rounds:

- **Five reviewers, one lens each:** safety, hardware, firmware match, docs match, ELI5 + picture. Each read `review/debug-script.md`, the script source, the firmware, the backend and docs/03–05, plus part datasheets where needed.
- **A skeptic per finding:** each finding went to a separate agent that tried to refute it against the primary sources.
- **A completeness critic:** after the verify round, it looked for anything the five lenses had missed, and its findings went through the same skeptics.

**Result:** 43 findings after de-duplication. **32 were confirmed** (11 MEDIUM, 21 LOW, no HIGH) and **11 were refuted**. Every confirmed finding is fixed in the second render.

The same problem was often found by several lenses. The groups below combine them; the numbers are the review's finding ids.

## Confirmed and fixed

| # | Case | What was wrong | What changed |
|---|---|---|---|
| 0, 20 | 6 No sound | To check the files, you need the module on micro-USB, but the line never said to pull the Gravity plug out first. That joins the laptop's USB and the Arduino's 5 V (docs/04 5b forbids it). | The line is split in three: speaker joints; Gravity plug out → micro-USB data cable → files; micro-USB out, Gravity plug back in. The docs/04 "No sound" row says the same. |
| 8 | 6 No sound | "Try vol 20" does nothing, because the sketch sets volume 20 at every start. | "Plug in and listen for hello: Robin sets the volume to 20 by itself" (video + docs/04). |
| 5, 9, 17, 19 | 1, 8, tools | The start message on screen was cleaner than the real one. The firmware also prints `[queue] events waiting: 1`, and `[tx-failed] {…}` every 2 s in offline test mode. | The real start message is shown. The tools scene explains `[tx-failed]` (normal offline: no network to send to). docs/04 step 2 and docs/05 C.4 say it too. |
| 10 | 11 Crossed eyes | Serial sequences the firmware can't print: no `[wifi] connecting…` before connected, two `[mqtt] failed` lines without `[mqtt] connecting…` between them. | Sequences are copied from `robin.ino`. After the fix, `[tx-failed]` becomes `[tx]`. |
| 11, 14 | 2, 4, 5 | `raw` is a 2-second snapshot, but the tests showed new readings after a re-plug without anyone typing `raw`. | Every test types `raw` again. "Stays high for minutes" is shown as several `raw` runs. |
| 4, 13, 16, 18 | 3 PIR jumps | The symptom flipped HIGH/LOW on every line (100 ms apart). An HC-SR501 holds HIGH for at least the Tx time, then blocks for ~2 s. | Runs of ~670 for a few seconds, then ~0, over several `raw` runs. |
| 26 | 3 PIR jumps | The case had no "unplug" step, so the doctor card said "Unplug: not needed" while the narrator said "Unplug". | A separate Unplug line, then "point it away". |
| 7 | 3 PIR jumps | Didn't say which way to turn Sx (clockwise = more sensitive). | "a little counter-clockwise" (video + docs/04). |
| 21, 30 | 4 PIR stays HIGH | The test skipped the 60 s warm-up. Also, with the jumper on H, every movement restarts the time, even with Tx at minimum. | The test waits 60 s, waves once and steps out of view. The last line names jumper H (video + docs/04). |
| 23 | 5 Button | The ELI5 card ("Diagonal legs never do") gave the Predict answer away. | Card: "Inside, the legs hold hands in pairs." |
| 15 | 7 Wrong sentence | "micro-USB cable" lacked "data": a charge-only cable shows no drive. | "micro-USB data cable". |
| 6, 25 | 8 Pops | The test changed two things at once (capacitor back and vol 15), and `vol 15` is lost at the next restart. | Capacitor first, then test. Only if it still pops: vol 15, plus how to keep it (`DEFAULT_VOLUME` in robin.ino, `volume` in config.yaml). Same in docs/04. |
| 28 | 9 Short | The check covered the rails only. docs/04 also names boards lying on metal or on the laptop, and module pins touching the Arduino. | The check names all three (video + docs/04). |
| 2 | 9 Short | "Try a powered hub" came before ruling out a reversed part, which draws too much current on every plug-in. | "Did nothing get warm? Check the capacitor stripe and the module's minus wire, then…" |
| 1 | 10 Warm capacitor | "It stays cool" could only be checked by touching a powered capacitor that had just overheated. | Test by looking and listening while plugged in; touch it only after unplugging. |
| 3 | 10 Warm capacitor | Nothing said what to do with the bad one, which looks like the spare. | "Put it in the electronics recycling, so it never gets mixed up with the spare" (video + docs/04). |
| 12, 27 | 11 Crossed eyes | Error -1 and -2 were treated as one. In ArduinoMqttClient, -2 = port 1883 not reachable, -1 = reached but no answer within 5 s. Also missing: Mosquitto running without our config (localhost only). | Split, with the config case added (video + docs/05 C.4). |
| 29 | 11 Crossed eyes | "Upload again" was given for every fix, but phone and laptop fixes need no upload. Robin retries every few seconds. | Says where each fix is made and when an upload is needed. |
| 24 | 11 Crossed eyes | "Post office = phone hotspot" clashes with docs/09 (post office = broker). | Road (through the hotspot) + mailbox (Mosquitto), as on the figure. |
| 22 | tools | Robin's face was named while the camera showed the UNO, where the front header hides the LED matrix. | For that one line, the FACE card (✗ eyes) takes the Serial Monitor's place. |
| 31 | the method | "The mistake is in what you added after it" was stated as always true. | "usually …, or in a wire you bumped while adding it". |

Also found during this review: the cable rule **R3** ("micro-USB only with the Gravity cable off") could never fire in the debug guide, because its bench starts built. It now follows the Gravity plug from the narration ("pull the Gravity…" / "Gravity plug back"). It was tested by removing those words from case 7: R3 then fails.

## Refuted (no change)

| Case | Claim | Why not |
|---|---|---|
| 10 | Only one diagnosis for a warm capacitor | The case follows the docs/04 row word for word, and the drawn fault is a reversed capacitor. |
| 6 | Reversed module power missing from "no sound" | "Four usual suspects" doesn't claim to be complete, and it matches the docs/04 row. Step 5's test checks the module's + and − before the first power-up. A reversed module acts like a short (heat, smell, port off), which case 9 and the safety rules cover. |
| method | Step 3 needs the cable in, so step 4 might be done plugged in | Step two states "never change wiring with the USB cable in" as an absolute rule. Every wiring fix is checked by rule D1. |
| 3 | The PIR might be propped on the laptop | No basis in the sources. The line repeats docs/04. |
| 8 | "A good phone charger" is vague | A wording nit. docs/04 already sets the charger rules. |
| end | Pin-map columns are only a suggestion | The pin map itself says so. "The labels and the pin map are always right" still holds. |
| 8 | "The brain" isn't explained | The build video introduces the metaphor, and the line is clear in context. |
| 10 | The water-tank analogy | It is weak but not false, so this is a style preference. |
| 3 | Floating A1 as a third cause | "Two usual reasons" is hedged and true. A floating A1 tends to follow the previous ADC channel (A0, ~430) rather than snap between ~670 and ~0. The step-3 test catches an open OUT wire, and the method covers loose wires. |
| 1 | A charge-only USB-C cable | The line is hedged ("usually") and repeats the docs/04 row. |
| 6 | The ELI5 card gives the T/R Predict answer away | The card states the rule ("must cross"). The Predict asks for the pin, which still needs thought. |

Gates after the fixes:
- `npm run debug:review`: all passed (R1–R3, D0–D3).
- `npm run netcheck`: 369/369.
- `npx tsc --noEmit`: clean.
- Stills of every line of the 13 changed scenes were checked.
- The drawn guide's on-screen troubleshooting table (a copy of docs/04) still fits after the row changes.
