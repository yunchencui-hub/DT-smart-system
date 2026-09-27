# 04 · Assembly guide: build one circuit, test it, then the next

> **Golden rule:** wire with the USB cable **unplugged**; plug in only to test. After every step there is a **✅ Test**. Don't continue until it passes, because debugging 1 new thing is easy and debugging 6 at once is misery.

## 0. Before you start
**You need:** everything from [03_shopping_list.md](03_shopping_list.md), the Arduino IDE installed ([05_software_setup.md](05_software_setup.md), part A), and the firmware uploaded in **offline test mode** (`SECRET_WIFI_SSID ""`, so no network is needed yet).

**ELI5: the breadboard.**
```
   + + + + + + + + + + + + +   ← power rail "+": all holes in this LINE are connected (5 V)
   - - - - - - - - - - - - -   ← power rail "-": all connected (GND)
   a b c d e | f g h i j       ← each numbered COLUMN of 5 holes (a-e) is connected,
 1 o o o o o | o o o o o          and separately (f-j). The middle gap separates them.
 2 o o o o o | o o o o o
```
Two legs in the same 5-hole group = connected. Two legs in different groups = not connected.

**Safety (read once):** 5 V can't hurt you, but it can kill a module. Never connect 5 V directly to GND (a short circuit). Check each wire twice before plugging in USB. If something gets warm or smells, unplug immediately.

## Pin map (keep this open while wiring)
| From | To | Wire |
|---|---|---|
| Arduino **5V** | breadboard **+ rail** | M-M (red if you have it) |
| Arduino **GND** | breadboard **− rail** | M-M (black) |
| LDR leg 1 | + rail | (the leg itself) |
| LDR leg 2 **and** 10 kΩ leg 1 | same column, e.g. column 5 | |
| 10 kΩ leg 2 | − rail | |
| column 5 | Arduino **A0** | M-M |
| PIR **VCC** | + rail | F-M |
| PIR **GND** | − rail | F-M |
| PIR **OUT** | Arduino **A1** | F-M |
| YES button (green), across the middle gap | one leg to − rail, the **diagonally opposite** leg to Arduino **D2** | 2× M-M |
| NO button (red), across the middle gap | one leg to − rail, diagonal leg to Arduino **D3** | 2× M-M |
| DFR0534 **VCC** / **GND** | + rail / − rail | 2× F-M |
| DFR0534 **TX** | Arduino **D0** (RX) | F-M |
| DFR0534 **RX** | 1 kΩ resistor → Arduino **D1** (TX) | F-M + resistor + M-M |
| DFR0534 **SP+ / SP−** | speaker + / − | F-F halves soldered to the speaker |

```
                       Arduino UNO R4 WiFi
                     ┌─────────────────────┐
   + rail (5V) ──────┤ 5V               D0 ├──────────────────── TX ┐
   − rail (GND) ─────┤ GND              D1 ├──[ 1 kΩ ]────────── RX │  DFR0534
                     │                  D2 ├──── YES button ── GND  │  VCC → +5V
                     │                  D3 ├──── NO  button ── GND  │  GND → GND
                     │                  A0 ├──●── LDR ── +5V        │  SP+/SP− → speaker
                     │                     │  └── 10 kΩ ── GND      ┘
                     │                  A1 ├──── PIR OUT   (PIR VCC → +5V, GND → GND)
                     └─────────────────────┘
```

---

## Step 1: Power rails (2 min)
Connect Arduino 5V → + rail and GND → − rail.
**✅ Test:** plug in USB. The board's power LED is on and the face shows 😊 (offline test mode shows the happy face, not ✗ eyes). Unplug.

## Step 2: Light sensor (LDR voltage divider)
**ELI5:** the Arduino can't measure *resistance*, only *voltage*. An LDR's resistance drops when light shines on it. Put it in series with a fixed 10 kΩ resistor and the voltage in the middle rises with light:
```
 5V ── LDR ──●── 10kΩ ── GND        V(A0) = 5 V × 10k / (10k + R_LDR)
             └── A0                 dark: R_LDR ≈ 1 MΩ → ≈ 0.05 V → reads ~10
                                    room: R_LDR ≈ 10–20 kΩ → ≈ 1.7–2.5 V → reads ~340–510
```
Wire it as in the pin map (LDR and resistor legs share one column; that column goes to A0).
**✅ Test:** open Serial Monitor (115200 baud, line ending "Newline"), type `raw` + Enter. Cover the LDR with your finger: `light_raw` must drop a lot. Shine your phone torch on it: it must rise.

## Step 3: PIR motion sensor
1. Gently pull off the white dome to read the pin labels (**VCC, OUT, GND**), then put it back.
2. Set the two knobs (use a small screwdriver):
   - **Time delay (Tx)**: fully **counter-clockwise** (shortest, ≈ 3 s).
   - **Sensitivity (Sx)**: middle to start.
   - If there's a jumper: put it on **H** (repeat trigger: stays HIGH while you keep moving).
3. Wire VCC → + rail, GND → − rail, **OUT → A1** (F-M wires; the male end goes straight into the Arduino header).

**Why A1 (analog) and not a digital pin?** The PIR's "HIGH" is **3.3 V**, but the UNO R4 runs at 5 V and only reliably sees ≳ 3.5 V as HIGH on a digital pin. Via analogRead, 3.3 V reads as ≈ 675 of 1023, so our threshold of 400 is rock solid. (Great oral-exam story: *logic levels*.)

**✅ Test:** wait **60 s** after plugging in (a PIR "warms up" and gives random output first). Type `raw`: sit still, then `pir_raw` ≈ 0; wave, then ≈ 650–700.

## Step 4: Yes/No buttons
**ELI5:** we use the Arduino's built-in **pull-up** resistor, which keeps the pin at 5 V (HIGH) when nobody presses. Pressing connects the pin to GND, so it reads LOW. That's why "pressed = LOW": it looks backwards, but it saves a resistor.

A 4-leg button has two pairs of legs that are *always* connected. **Trick that always works:** put the button across the middle gap and use two **diagonally opposite** legs: one to the − rail, the other to D2 (green) / D3 (red). Put the caps on.
**✅ Test:** `raw` shows `yes=pressed` while you hold green. Also: pressing shows ✓ or ✗ on the LED face, and the Serial Monitor prints `[button] yes`.

## Step 5: Voice module (DFR0534) + speaker
### 5a. Speaker wires (the only soldering, 2 joints)
Cut one female-female jumper in half. Strip 5 mm, twist, and solder one half to each speaker tab (ask at Pulsed if you've never soldered, it takes 5 minutes to learn). Red wire = "+" tab. (If your speaker already has wires, skip this.)

### 5b. Put Robin's voice on the module
1. Unplug the module from the breadboard. Connect it to the laptop with a **micro-USB data cable**: it appears as a small USB drive.
2. **Delete** any demo files on it. Copy `audio/en/01.mp3 … 13.mp3` (or `audio/nl/` for Dutch) to the **root** of the drive. Eject safely.

### 5c. Wire it
VCC → + rail, GND → − rail, **TX → D0**, **RX → 1 kΩ → D1**, speaker → SP+ / SP−.
**ELI5, TX↔RX:** TX means "I talk", RX means "I listen". One device's mouth goes to the other's ear, so they cross. The **1 kΩ resistor** limits current into the module's input from the Arduino's 5 V signal (the module's documentation recommends it for 5 V boards).

**✅ Test:** reset the Arduino. After ~2 s you hear *"Hello, I'm Robin"* (track 1 plays on every boot). Then type `say 3` and hear the medicine question. `vol 15` makes it quieter.

## Step 6: Faces
**✅ Test:** type `face ask`, `face concern`, `face sleep`, `face happy`. The happy face blinks every few seconds, like Tessa's eyes.

## Step 7: Go online
Only now: fill in `arduino_secrets.h` with the hotspot and laptop IP, start Mosquitto, upload again. See [05_software_setup.md](05_software_setup.md), part C.
**✅ Test:** the face changes from ✗ eyes to 😊, and `mosquitto_sub -t "robin/#" -v` shows messages.

## Step 8: The body (optional but recommended)
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
Tessa is made of felt and wood to feel warm. A strip of felt around the grey sides (not over the face, PIR or speaker) is a cheap "Tessa touch".

---

## Troubleshooting
| Symptom | Likely cause | Fix |
|---|---|---|
| Nothing in Serial Monitor | wrong baud / port | 115200 baud, correct COM port; press reset |
| `light_raw` always ~0 or ~1023 | LDR/resistor not in the same column, or A0 wire in the wrong column | re-check the divider |
| `pir_raw` random HIGH/LOW | warm-up, or it sees you | wait 60 s; point it away; lower sensitivity |
| PIR stays HIGH ~minutes | time-delay knob not at minimum | turn Tx fully counter-clockwise |
| Button always "pressed" | used two *always-connected* legs | use diagonal legs |
| No sound | TX/RX not crossed, missing files, volume 0 | check D0←TX, D1→1k→RX; `vol 20`; files in root |
| Plays the wrong sentence | old demo files still on the module | delete everything, copy again |
| Board resets when it talks loudly | USB can't deliver the current peak | `vol 15`; use a better USB port/charger |
| ✗ eyes forever | WiFi/MQTT problem | see 05, part C troubleshooting |
