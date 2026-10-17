# video-assets · real photos for the assembly + test video

The build videos in `video/` and `video-remotion/` are **drawn**. This folder holds **real** photos (and short clips) of *your* Robin, for a video of the complete assembly and the tests with the real parts.

**Shoot while you build.** Once step 5 is wired, you can't go back and photograph step 2 without unwiring it. Keep this list open next to [docs/04](../docs/04_assembly.md).

## ⚠ This repository is public
Anyone can see what you upload here, and Git keeps it in the history even after you delete it.
- **Switch off location in photos before you start.** Phones hide the GPS position inside every photo, and you will photograph Robin at home. iPhone: *Settings → Privacy & Security → Location Services → Camera → Never*. Android: camera app *Settings → Location tags* (or *Save location*) off.
- **Nothing secret on screen:** crop or blur the WiFi name and password (`arduino_secrets.h`) and the **ntfy topic** (in the app and on the notification): anyone who knows the topic can read Robin's alerts.
- **No people or private things** unless you're fine with them being public: faces, mail with your address in the background, the order form.

## Phone settings (once)
- **JPG, not HEIC.** iPhone: *Settings → Camera → Formats → Most Compatible*. Browsers and video tools can't read HEIC.
- Hold the phone **sideways** (landscape): the video is 1920 × 1080.
- Clips: **1080p, 30 fps**.

## How to shoot
- **Same place, same light:** a wooden table or cardboard (never metal, see the docs/04 safety rules), daylight or a desk lamp from the side. **No flash:** its glare hides the breadboard holes.
- **Wiring: straight from above**, phone parallel to the table, the breadboard filling the frame. Tap the screen to focus on the wire end that matters. Zoom in on the photo afterwards: the column number and the pin label must be readable.
- **3D parts** (PIR dome, speaker, box): from about 45°.
- **The golden rule shows too:** photograph the wiring with the **USB unplugged**, then film the ✅ test with it plugged in.
- Take 2–3 of every shot and keep the best. Elbows on the table, so it's sharp.
- **Sound clips** (the voice): quiet room, phone about 30 cm from the speaker.
- **Laptop screens:** take a screenshot or screen recording, not a photo of the screen (Windows: *Snipping Tool*; Mac: `Cmd + Shift + 5`). Filming the robot and recording the screen at the same time? **Clap once** at the start of both: the clap lines them up in the edit.

## Names
`<step>-<nn>-<what>.jpg`, lowercase, no spaces, so the files group by build step:

| Prefix | Belongs to |
|---|---|
| `s0-` | parts, tools, the breadboard (docs/04 part 0) |
| `s1-` … `s8-` | docs/04 steps 1–8; `s5a-` … `s5d-` for the voice sub-steps |
| `demo-` | the full-system run (docs/08) |
| `tc01-`, `tc02-` … | your own test cases from your test plan |

Examples: `s0-01-all-parts.jpg`, `s2-03-ldr-test-covered.jpg`, `s5d-02-capacitor-stripe.jpg`, `demo-04-phone-alert.png`.
Clips go in `video-assets/clips/` with the same names (`.mp4` or `.mov`), **5–10 s each** (see the size limit under *Upload*).

## Shot list
📷 = photo, 🎬 = clip (it needs movement or sound).

### Assembly (follows docs/04)
| Step | Shots |
|---|---|
| **0** Before you start | 📷 all parts laid out, with their bags and labels · 📷 the tools and the safety glasses · 📷 breadboard close-up: the red and blue lines (and the break in the middle, if yours has one) |
| **1** Power rails | 📷 the 5V and GND wires at the Arduino header · 📷 the same wires at the rails · 🎬 test: power LED on, face ✗ → 😊 |
| **2** Light sensor | 📷 the 10 kΩ bag label or colour bands · 📷 LDR + 10 kΩ sharing one column, and the wire to A0 · 🎬 test: `raw` while you cover the LDR, then shine the torch on it |
| **3** PIR | 📷 dome off: the VCC / OUT / GND labels · 📷 the knobs (Tx fully counter-clockwise) and the jumper on H · 📷 the wires to the rails and A1 · 🎬 test: sit still (`pir_raw` ≈ 0), then wave (≈ 650–700) |
| **4** Buttons | 📷 both buttons across the gap: diagonal legs, wires to the − rail and D2 / D3 · 🎬 test: green → ✓ on the face, red → ✗ |
| **5a** Speaker | 📷 the speaker set with its 4-pin plug, then the plug cut off (it must never go into the Gravity socket) · 📷 your speaker's two stripped wires · 📷 close-up of the SP+ / SP− joints (no solder reaching DACL) · 📷 the spare speaker's taped ends · 📷 the tape that holds the wires down |
| **5b** Voice files | 📷 screenshot: the module as a USB drive, `01.mp3` … `13.mp3` in its root |
| **5c** Wiring | 📷 the Gravity plug in its socket · 📷 the tape flags + − T R · 🎬 the multimeter beep (+ → VCC, − → GND) · 📷 T → D0 · 📷 R → column 22 → 1 kΩ → column 26 → D1 · 📷 the module flat on the table, away from the Arduino |
| **5d** Capacitor | 📷 close-up: the stripe and the short leg · 📷 in the rails, next to the module's power wires · 🎬 test: plug in → *"Hello, I'm Robin"*, then `say 3` |
| **6** Faces | 🎬 `face ask`, `face concern`, `face sleep`, `face happy` (with the blink) |
| **7** Go online | 🎬 face ✗ → 😊 · screen recording of the `mosquitto_sub` messages (WiFi name and IP hidden) |
| **8** The body | 📷 the empty box in the clamp (a photo *while* drilling only if someone else holds the phone) · 📷 the PIR hole, speaker holes and USB notch · 📷 building in: speaker glued by its rim, module taped down · 🎬 the tests again (`raw`, `say 3`, faces) · 📷 the finished Robin: front, side, top |

### Tests
- **Each part on its own:** the 🎬 ✅ tests above already show this.
- **The whole system (docs/08):** film the moments of the demo: telemetry in MQTT Explorer while you wave · green button → event message + ✓ · the cup over Robin · torch on and walking in → Robin asks → red button → the phone buzzes (ntfy topic hidden) · USB pulled → the offline alert. Robot on the phone, laptop as a screen recording, one clap at the start.
- **Your test cases:** for every case in your own test plan (docs/07): a photo of the setup and a screenshot of the measured result, named `tc01-…`. You and your duo partner write the cases; this list doesn't.

Bonus: the photos for the docs/08 proof package (overview, wiring close-up, inside the box, the face, the phone notification) come out of this list.

## Upload
On github.com: open `video-assets/images` → **Add file → Upload files** → drag the photos in → **Commit changes**. For the first clips, open `video-assets` and drag a whole folder named `clips` onto the upload page: GitHub creates `video-assets/clips/` for you.
**Size:** the browser upload takes at most **25 MB per file**. Phone photos (2–6 MB) are fine. A 1080p clip is roughly 2 MB per second, so 5–10 s stays under the limit. Longer clips need `git` from the command line (GitHub refuses anything over 100 MB).
