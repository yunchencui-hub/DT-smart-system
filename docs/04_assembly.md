# 04 · Assembly guide: build one circuit, test it, then the next

> **Golden rule:** wire with the USB cable **unplugged**; plug in only to test, and **unplug again after every test**. After every step there is a **✅ Test**. Don't continue until it passes, because debugging 1 new thing is easy and debugging 6 at once is misery.

> **Updated 30 Sep 2026** for the new order (see [03](03_shopping_list.md)): the voice module now connects through its own Gravity cable with 4 **male-male** wires (the old guide said female-male, which was wrong), the speaker comes from the 2 W speaker set, and a 680 µF capacitor steadies the power. The older build video in `video/` still shows the old voice wiring; follow this guide.

## 0. Before you start
**You need:** everything from [03_shopping_list.md](03_shopping_list.md), the Arduino IDE installed ([05_software_setup.md](05_software_setup.md), part A), and the firmware uploaded in **offline test mode** (`SECRET_WIFI_SSID ""`, so no network is needed yet).
**Tools (Pulsed):** small screwdriver, wire cutter/stripper, soldering iron with a stand, **safety glasses**, insulating tape (or heat-shrink), hot-glue gun, and for step 8 a drill with a step drill and a clamp.

**ELI5: the breadboard.**
```
   + + + + + + + + + + + + +   ← power rail "+": all holes along the RED line are connected (5 V)
   - - - - - - - - - - - - -   ← power rail "-": all holes along the BLUE line are connected (GND)
   a b c d e | f g h i j       ← each numbered COLUMN of 5 holes (a-e) is connected,
 1 o o o o o | o o o o o          and separately (f-j). The middle gap separates them.
 2 o o o o o | o o o o o
```
Two legs in the same 5-hole group = connected. Two legs in different groups = not connected.
There is a pair of rails on each long side, and the two pairs are **not** connected to each other. Use only the pair next to the Arduino's power pins.
**Which rail is + ?** Breadboards differ: on some the red (+) row is on the outside, on others on the inside. Always follow the **red line (+)** and **blue line (−)** printed on *your* board, not the position in a picture.

**Safety (read once):**
- 5 V can't hurt you, but it can kill a module. Never connect the + rail to the − rail (a short circuit).
- **Read the label, not the picture.** Pin order differs between module versions. Always go by the names printed on *your* part (PIR: under the white dome; voice module: next to its white plug).
- Three things have a + and a − and break when reversed: the **module power pins**, the **capacitor** (step 5d), and the breadboard **rails** themselves. Check them twice.
- Check each wire twice before plugging in the USB. If something gets warm, smells, or the power LED stays off, **unplug immediately**.
- Wear **safety glasses** when you cut wire ends (they fly), solder, or drill.

## Pin map (keep this open while wiring)
The columns are a suggestion (the video uses the same ones). Any free column works, as long as the parts that must meet share one column.

| From | To | Wire |
|---|---|---|
| Arduino **5V** | breadboard **+ rail** (red line) | M-M (red if you have it) |
| Arduino **GND** | breadboard **− rail** (blue line) | M-M (black) |
| LDR leg 1 | + rail | (the leg itself) |
| LDR leg 2 **and** 10 kΩ leg 1 | same column, bottom half, e.g. column 5 | |
| 10 kΩ leg 2 | − rail | |
| column 5 | Arduino **A0** | M-M |
| PIR **VCC** | + rail | F-M |
| PIR **GND** | − rail | F-M |
| PIR **OUT** | Arduino **A1** | F-M |
| YES button (green), across the middle gap (columns 11 and 13) | one leg's column to the − rail, the **diagonally opposite** leg's column to Arduino **D2** | 2× M-M |
| NO button (red), across the middle gap (columns 17 and 19) | one leg's column to the − rail, diagonal leg's column to Arduino **D3** | 2× M-M |
| DFR0534 white **Gravity plug** | the 4-wire cable that comes with the module; its other end has 4 **female** sockets | (the cable) |
| cable wire from plug pin **+** | + rail | M-M |
| cable wire from plug pin **−** | − rail | M-M |
| cable wire from plug pin **T** (module talks) | Arduino **D0** (RX, Arduino listens) | M-M |
| cable wire from plug pin **R** (module listens) | column 22, top half; **1 kΩ** from column 22 to column 26; column 26 → Arduino **D1** (TX) | M-M + resistor + M-M |
| **680 µF capacitor** | long leg (+) in the + rail, **striped leg (−) in the − rail**, next to the module's + and − wires | its own legs |
| DFR0534 **SP+ / SP−** | the two wires of **one** speaker from the set | soldered (step 5a) |

```
                       Arduino UNO R4 WiFi
                     ┌─────────────────────┐
   + rail (5V) ──────┤ 5V               D0 ├──────────────────── T ┐
   − rail (GND) ─────┤ GND              D1 ├──[ 1 kΩ ]────────── R │  DFR0534 (via its Gravity cable)
                     │                  D2 ├──── YES button ── GND │  + → + rail,  − → − rail
                     │                  D3 ├──── NO  button ── GND │  SP+/SP− → one 8 Ω speaker
                     │                  A0 ├──●── LDR ── +5V       │
                     │                     │  └── 10 kΩ ── GND     ┘
                     │                  A1 ├──── PIR OUT   (PIR VCC → +5V, GND → GND)
                     └─────────────────────┘
   + rail ──┤(+ 680 µF −)├── − rail      (stripe = −, next to the module's power wires)
```

---

## Step 1: Power rails (2 min)
Connect Arduino 5V → + rail and GND → − rail.
**✅ Test:** plug in USB. The board's power LED is on. The face shows ✗ eyes for a moment while it starts, then 😊 (offline test mode shows the happy face). **Unplug.**

## Step 2: Light sensor (LDR voltage divider)
**ELI5:** the Arduino can't measure *resistance*, only *voltage*. An LDR's resistance drops when light shines on it. Put it in series with a fixed 10 kΩ resistor and the voltage in the middle rises with light:
```
 5V ── LDR ──●── 10kΩ ── GND        V(A0) = 5 V × 10k / (10k + R_LDR)
             └── A0                 dark: R_LDR ≈ 1 MΩ → ≈ 0.05 V → reads ~10
                                    room: R_LDR ≈ 10–20 kΩ → ≈ 1.7–2.5 V → reads ~340–510
```
Wire it as in the pin map (LDR and resistor legs share one column; that column goes to A0). The LDR and the resistor have no + or −, so either way round is fine.
**Which resistor is 10 kΩ?** Read the label on its bag. Colour bands: 4 bands = brown, black, orange, (gold); 5 bands = brown, black, black, red, (brown). Keep the 1 kΩ bag closed for now.
**✅ Test:** plug in, open the Serial Monitor (115200 baud, line ending "Newline"), type `raw` + Enter. Cover the LDR with your finger: `light_raw` must drop a lot. Shine your phone torch on it: it must rise. **Unplug.**

## Step 3: PIR motion sensor
1. Gently pull off the white dome to read the pin labels (**VCC, OUT, GND**), then put it back.
2. Set the two knobs (use a small screwdriver):
   - **Time delay (Tx)**: fully **counter-clockwise** (shortest, ≈ 3 s).
   - **Sensitivity (Sx)**: middle to start.
   - If there's a jumper: put it on **H** (repeat trigger: stays HIGH while you keep moving).
3. Wire VCC → + rail, GND → − rail, **OUT → A1** (F-M wires: the female end onto the PIR pin, the male end into the rail or straight into the Arduino header). Go by the labels you read under the dome.

**Why A1 (analog) and not a digital pin?** The PIR's "HIGH" is **3.3 V**, but the UNO R4 runs at 5 V and only reliably sees ≳ 3.5 V as HIGH on a digital pin. Via analogRead, 3.3 V reads as ≈ 675 of 1023, so our threshold of 400 is rock solid. (Great oral-exam story: *logic levels*.)

**✅ Test:** plug in and wait **60 s** (a PIR "warms up" and gives random output first). Type `raw`: sit still, then `pir_raw` ≈ 0; wave, then ≈ 650–700. **Unplug.**

## Step 4: Yes/No buttons
**ELI5:** we use the Arduino's built-in **pull-up** resistor, which keeps the pin at 5 V (HIGH) when nobody presses. Pressing connects the pin to GND, so it reads LOW. That's why "pressed = LOW": it looks backwards, but it saves a resistor.

A 4-leg button has two pairs of legs that are *always* connected. **Trick that always works:** put the button across the middle gap and use two **diagonally opposite** legs: one to the − rail, the other to D2 (green) / D3 (red). Our 12 × 12 mm buttons are big: their legs land about two rows from the gap on each side (rows d and g) and two columns apart. Press them in firmly; if a leg won't go in, straighten it gently with pliers. **A button never goes to the + rail**, only to the − rail and a D-pin. Put the caps on.
**✅ Test:** plug in. `raw` shows `yes=pressed` while you hold green. Also: pressing shows ✓ or ✗ on the LED face, and the Serial Monitor prints `[button] yes`. **Unplug.**

## Step 5: Voice module (DFR0534) + speaker
The module has two sets of pins. The small **white Gravity plug** carries **+, −, T, R** (power and talking). A row of pins or holes carries VCC, GND, BUSY, **SP+, SP−** and a few others; we only use SP+ and SP− there. The module comes with a **Gravity cable**: its white plug fits the module one way only, and its other end has 4 **female** sockets. So you connect it with **male-male** wires.

### 5a. Speaker (the only soldering, 2 joints)
The speaker set has **two** speakers whose four wires end in one white plug. We use one speaker; the other is a spare.
1. **Safety glasses on.** Cut the wires right behind the white plug.
2. Follow each wire back to its speaker, so you know which **two** wires belong to the speaker you'll use. Never connect both speakers to the module (together they would be 4 Ω, too heavy for its amplifier).
3. The spare speaker: wrap each of its two bare wire ends **separately** in tape, so they can't touch anything (or cut them again with ~1 cm of insulation left, so no copper shows).
4. Strip 5 mm from your speaker's two wires and twist the strands.
5. Look at **SP+ / SP−** on the module:
   - **pins**: solder each speaker wire to one half of a cut female-female jumper, cover the joint with tape or heat-shrink, and push the halves onto SP+ and SP−;
   - **holes**: solder the wires straight into the SP+ and SP− holes. Make sure no solder bridges to the hole next to it (BUSY, or each other).
   Red wire → SP+ (if your wires aren't red/black, either way round works for one speaker).
Solder at Pulsed with the iron in its stand, in a ventilated spot, and wash your hands afterwards. Never soldered? Ask at Pulsed; it takes 5 minutes to learn.

### 5b. Put Robin's voice on the module
1. **Pull the white Gravity plug out of the module first**, so the module is connected to nothing else. (Otherwise the laptop's USB and the Arduino's 5 V would be connected together.)
2. Connect the module to the laptop with the **micro-USB data cable**: it appears as a small USB drive.
3. **Delete** any demo files on it. Copy `audio/en/01.mp3 … 13.mp3` (or `audio/nl/` for Dutch) to the **root** of the drive. Eject safely, unplug the micro-USB.

### 5c. Wire it (USB unplugged)
1. Plug the Gravity cable into the module's white plug (it fits one way only).
2. Push one **male-male** wire **fully** into each of the cable's 4 female sockets (no bare metal showing). Follow each wire back to the plug and read the label printed next to its pin on the module: **+, −, T, R**. Put a small tape flag with that letter on each wire. **Don't trust the wire colours:** go by the labels.
3. **+** → + rail, **−** → − rail.
4. **T** → Arduino **D0**.
5. **R** → column 22 (top half). The **1 kΩ** resistor (bag label; 4 bands brown, black, red, (gold) or 5 bands brown, black, black, brown, (brown)) goes from column 22 to column 26. A wire from column 26 → Arduino **D1**.
6. Lay the module flat on the table, **away from the Arduino** (its pins must not touch the Arduino or any wire). A piece of tape holds it in place.

**ELI5, T↔R:** T (TX) means "I talk", R (RX) means "I listen". One device's mouth goes to the other's ear, so they cross: the module's T goes to the Arduino's ear (D0 = RX), and the Arduino's mouth (D1 = TX) goes to the module's R. The **1 kΩ resistor** limits the current from the Arduino's 5 V signal into the module's input. (On the UNO R4, D0/D1 are separate from the USB port, so uploading still works with the module connected.)

### 5d. The capacitor (polarity!)
**ELI5:** when Robin speaks loudly, the speaker suddenly gulps current and the 5 V dips for a moment: you hear pops, or the Arduino even restarts. The 680 µF capacitor is a small water tank right next to the module that covers those gulps.
An electrolytic capacitor has a **+** and a **−**:
- the **−** leg is under the light **stripe** (with − signs) on the side of the can, and it is the **shorter** leg;
- the **+** leg is the longer one.

Put the **long (+) leg in the + rail** (red line) and the **striped (−) leg in the − rail** (blue line), next to where the module's + and − wires go in. Its legs are 5 mm apart, so put them one or two columns apart, or bend them gently to fit.
**Backwards is dangerous for the part:** a reversed capacitor gets warm, bulges, or pops open. If a capacitor ever gets warm or bulges: unplug, don't touch it, and replace it with the spare the right way round.

**✅ Test (check first, then plug in):**
1. Before you plug in, check: capacitor stripe in the − rail; module + in the + rail and − in the − rail; T → D0; R → 1 kΩ → D1; the spare speaker's wire ends are taped; no bare metal touches anything.
2. Plug in. After ~2 s you hear *"Hello, I'm Robin"* (track 1 plays on every boot).
3. Type `say 3` and hear the medicine question. `vol 15` makes it quieter; stay at `vol 22` or lower so the small speaker doesn't distort.
4. **Unplug.**

## Step 6: Faces
**✅ Test:** plug in, type `face ask`, `face concern`, `face sleep`, `face happy`. The happy face blinks every few seconds, like Tessa's eyes. **Unplug.**

## Step 7: Go online
Only now: fill in `arduino_secrets.h` with the hotspot and laptop IP, start Mosquitto, upload again. See [05_software_setup.md](05_software_setup.md), part C.
**✅ Test:** the face changes from ✗ eyes to 😊, and `mosquitto_sub -t "robin/#" -v` shows messages. **Unplug** before step 8.

## Step 8: The body (optional but recommended)
**Drill first, build in after:** make every hole while the box is **empty**. Take everything out, clamp the box (never hold it in your hand), wear safety glasses, and use a step drill at Pulsed. Remove plastic burrs with a knife or file afterwards.

Suggested layout for the Kradex box, standing up with the **transparent lid as the face**:
```
       top:  breadboard stuck on the outside (adhesive back) with the 2 buttons + LDR
     ┌─────────────────────────┐
     │  (o) PIR dome           │ ← 23–24 mm hole drilled in the lid, PIR looks into the room
     │   ┌───────────────┐     │
     │   │  LED matrix   │     │ ← Arduino inside, matrix right behind the clear lid = face
     │   └───────────────┘     │
     │  ::::: speaker holes    │ ← 6–8 small holes (4 mm) on the side, speaker glued behind
     └─────────────────────────┘
       back: notch for the USB cable; one 10 mm hole in the top for the button/LDR wires
```
Then build in: glue the speaker behind its holes with a few dots of **hot glue on its rim** (never on the paper cone), and fix the voice module with tape so its pins can't touch the Arduino. Let the glue cool before you close the box.
Tessa is made of felt and wood to feel warm. A strip of felt around the grey sides (not over the face, PIR, speaker holes or the USB notch) is a cheap "Tessa touch".
**At home for a week:** power Robin from an undamaged, CE-marked phone charger, lay the cable where nobody trips over it, and don't cover the box. If the box ever feels warm, unplug it.

---

## Troubleshooting
| Symptom | Likely cause | Fix |
|---|---|---|
| Nothing in Serial Monitor | wrong baud / port | 115200 baud, correct COM port; press reset |
| `light_raw` always ~0 or ~1023 | LDR/resistor not in the same column, or A0 wire in the wrong column | re-check the divider |
| `pir_raw` random HIGH/LOW | warm-up, or it sees you | wait 60 s; point it away; lower sensitivity |
| PIR stays HIGH ~minutes | time-delay knob not at minimum | turn Tx fully counter-clockwise |
| Button always "pressed" | used two *always-connected* legs | use diagonal legs |
| No sound | T/R swapped or not crossed, missing files, volume 0 | check T → D0 and D1 → 1 kΩ → R; `vol 20`; files in the root |
| Plays the wrong sentence | old demo files still on the module | pull the Gravity plug out, then delete everything and copy again |
| Pops, buzzing, or the board resets when it talks loudly | the speaker's current gulps make the 5 V dip | check the capacitor (stripe in the − rail, next to the module); `vol 15`; use a better USB port/charger |
| Laptop says "USB device needs more power" or the port switches off when you plug in | the capacitor charging, or a short | unplug; check for a short (+ rail touching − rail); try another port or a powered hub |
| Capacitor warm or bulging | put in backwards | unplug now, don't touch it; fit the spare with the stripe in the − rail |
| ✗ eyes forever | WiFi/MQTT problem | see 05, part C troubleshooting |
