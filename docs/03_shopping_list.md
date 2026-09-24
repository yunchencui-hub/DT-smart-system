# 03 · Shopping list and purchase request

> Prices were checked on **24 Sep 2026** at [Tinytronics](https://www.tinytronics.nl) (Eindhoven, on your approved-supplier list). They are **incl. 21% VAT**. Prices and stock change, so re-check every link on the day you order.

## Why one supplier?
Every part is available at Tinytronics, which is on the approved list. One order means one shipping cost and one invoice for the lecturer. Most Dutch hobby shops (Kiwi Electronics, Conrad, bol.com) sell the same modules, but usually at a higher price or with extra shipping.

## ELI5: what each part does in Robin
| Part | Robin's body part | In one sentence |
|---|---|---|
| Arduino UNO R4 WiFi (from school) | brain stem + face | reads the sensors, talks over WiFi, shows a face on its 12x8 LED grid |
| PIR motion sensor | eyes for movement | its output goes HIGH when a warm body moves in front of it |
| LDR + 10 kΩ resistor | eyes for light | lets the Arduino measure how bright the room is |
| 2 push buttons + caps | ears for answers | green = "yes", red = "no" |
| DFR0534 voice module + speaker | mouth | plays our prerecorded sentences (stored on its own 8 MB memory) |
| Breadboard + jumper wires | nerves | connects everything without soldering |
| Enclosure | skin | protects it at home for a week and makes it look like a robot |

## The order (recommended)

| # | Product (click to check) | Tinytronics SKU | Qty | Unit € | Total € | Standard at Pulsed? |
|---|---|---|---|---|---|---|
| 1 | [DFRobot Gravity UART MP3 Voice Module, 8 MB flash (DFR0534)](https://www.tinytronics.nl/en/audio/audio-sources/dfrobot-gravity-uart-mp3-module-with-8mb-flash-memory) | 004047 | 1 | 9.50 | 9.50 | no, **must buy** |
| 2 | [Speaker 8Ω 1W 40 mm](https://www.tinytronics.nl/en/audio/speakers/speakers/speaker-8%CF%89-1w-40mm) | 007512 | 1 | 1.00 | 1.00 | maybe |
| 3 | [HC-SR501 PIR motion sensor](https://www.tinytronics.nl/en/sensors/motion/ir-pyroelectric-infrared-pir-motion-sensing-detector-module) | 000090 | 1 | 3.50 | 3.50 | maybe, ask |
| 4 | [GL5528 LDR light sensor](https://www.tinytronics.nl/en/sensors/optical/light-and-color/gl5528-ldr-light-sensitive-resistor) | 000759 | 2 | 0.30 | 0.60 | likely, ask |
| 5 | [Tactile push button 12x12x7.3 mm](https://www.tinytronics.nl/en/switches/manual-switches/pcb-switches/tactile-pushbutton-switch-momentary-4pin-12*12*7.3mm) | 001204 | 3 | 0.25 | 0.75 | likely, ask |
| 6 | Button caps 12x12 mm: [green](https://www.tinytronics.nl/shop/en/components/knobs,-caps-and-covers/button-cap-for-tactile-pushbutton-switch-momentary-12x12x7.3mm-green), [red](https://www.tinytronics.nl/shop/en/components/knobs,-caps-and-covers/button-cap-for-tactile-pushbutton-switch-momentary-12x12x7.3mm-red), [white](https://www.tinytronics.nl/shop/en/components/knobs,-caps-and-covers/button-cap-for-tactile-pushbutton-switch-momentary-12x12x7.3mm-white) | 003060 (green), 003062 (red) | 3 | 0.15 | 0.45 | maybe |
| 7 | [Breadboard 400 points](https://www.tinytronics.nl/en/tools-and-mounting/prototyping-supplies/breadboards/breadboard-400-points) | BB400P | 1 | 2.25 | 2.25 | likely, ask |
| 8 | [Jumper wires male-male 20 cm (10 pcs)](https://www.tinytronics.nl/en/cables-and-connectors/cables-and-adapters/prototyping-wires/dupont-compatible-and-jumper/dupont-jumper-wire-male-male-20cm-10-wires) | 000164 | 2 | 0.75 | 1.50 | likely, ask |
| 9 | [Jumper wires male-female 20 cm (10 pcs)](https://www.tinytronics.nl/en/cables-and-connectors/cables-and-adapters/prototyping-wires/dupont-compatible-and-jumper/dupont-jumper-wire-male-female-20cm-10-wires) | 000088 | 1 | 0.75 | 0.75 | likely, ask |
| 10 | [Jumper wires female-female 20 cm (10 pcs)](https://www.tinytronics.nl/en/cables/cables/dupont-jumper-wire-female-female-20cm-10-wires) | 000089 | 1 | 0.75 | 0.75 | likely, ask |
| 11 | [Resistor 10 kΩ 1/4 W (10 pcs)](https://www.tinytronics.nl/nl/componenten/weerstanden/weerstanden) | - | 1 | 0.50 | 0.50 | yes, ask |
| 12 | [Resistor 1 kΩ 1/4 W (10 pcs)](https://www.tinytronics.nl/nl/componenten/weerstanden/weerstanden) | - | 1 | 0.50 | 0.50 | yes, ask |
| 13 | [Kradex enclosure 176x126x57 mm, transparent lid (Z74JPH TM)](https://www.tinytronics.nl/en/tools-and-mounting/enclosures/universal/kradex-enclosure-176x126x57mm-ip65-grey-transparent-z74jph-tm-abs) | 003260 | 1 | 10.00 | 10.00 | no |
| | **Parts subtotal** | | | | **32.05** | |
| | Shipping: PostNL parcel (the 57 mm box is too thick for mailbox post) | | | | 6.95 | |
| | **TOTAL (everything bought)** | | | | **€39.00** | **€11.00 left** |

### Three budget scenarios
| Scenario | What you buy | Total | Left of €50 |
|---|---|---|---|
| A. Everything (table above) | 1–13 + parcel | **€39.00** | €11.00 |
| B. Pulsed supplies the common parts (rows 4–12) | 1, 2, 3, 13 + parcel | **€30.95** | €19.05 |
| C. No enclosure (shoebox or laser-cut body at Pulsed) | 1–12 + mailbox post €2.95 | **€25.00** | €25.00 |

**My advice as your partner: go for A, or B if Pulsed has the common parts.** The assignment says the €50 is for *"materials that are not expected to have standard availability at Pulsed"*, so first ask a DT guide whether they have a breadboard, jumper wires, resistors, LDRs and push buttons you can use. Keep the remaining money as a **repair buffer**. Beginners sometimes break a module (reversed power, a short circuit), and a replacement DFR0534 costs €9.50.

### Things you need that are NOT in the order
| Item | Why | Where |
|---|---|---|
| Arduino UNO R4 WiFi | the school lends it to your duo | DT guide (check it really is the **R4 WiFi**: USB-C port + LED grid on the board) |
| USB-C **data** cable | program the Arduino + power it | your phone cable (some cheap cables only charge, so test it) |
| micro-USB **data** cable | copy the voice files onto the DFR0534 | an old Android cable. Only if you have none: [Goobay micro-USB 1 m at Tinytronics](https://www.tinytronics.nl/en/cables-and-connectors/cables-and-adapters/usb/micro-usb/goobay-93918-micro-usb-cable-1m-black) (≈ €2–3) |
| USB phone charger (5 V) | power Robin at home for a week | any phone charger |
| Laptop | runs Mosquitto + Python | yours |
| Smartphone | WiFi hotspot + ntfy app (caregiver) | yours |
| Soldering iron + a bit of solder | 2 joints on the speaker | Pulsed |
| Drill / step drill | holes in the enclosure | Pulsed |

### If something is out of stock
| Part | Alternative | Notes |
|---|---|---|
| DFR0534 | [DFPlayer Pro (DFR0768), €10.25](https://www.tinytronics.nl/en/audio/audio-sources/dfrobot-fermion-dfplayer-pro-mp3-player-module): 128 MB onboard, USB-C | different commands (115200 baud, AT commands) and header pins must be soldered. Tell me and I'll adapt `voice.h` |
| DFR0534 | DFPlayer Mini (€8.00) + microSD card | microSD cards are expensive in 2026 (cheapest ≈ €18.50 at Tinytronics); only if you already own a microSD ≤ 32 GB |
| Tactile buttons | [DFRobot Gravity Digital Push Button](https://www.tinytronics.nl/en/switches/manual-switches/push-buttons-and-switches/dfrobot-gravity-digital-push-button-green) (€2.50 each, green/red; stock was low) | plug-and-play cable, and it has its own resistor, so it may output HIGH when pressed (the opposite of ours). Check with the `raw` command and tell me: it's a 2-line firmware change |
| HC-SR501 | [AM312 mini PIR](https://www.tinytronics.nl/en/sensors/motion/ir-pyroelectric-infrared-pir-motion-sensor-detector-module-mini), €3.50 | smaller, fixed ~2 s hold time, no adjustment knobs |
| Big enclosure | [Kradex 118x78x55 transparent](https://www.tinytronics.nl/en/tools-and-mounting/enclosures/universal/kradex-enclosure-118x78x55mm-ip65-grey-transparent-z57jph-tm-abs), €6.50 | fits, but tight |

### Things we deliberately do NOT buy (and why you can defend it)
- **A camera.** Privacy in someone's home is a huge issue (GDPR, dignity), and it needs heavy processing. PIR + light already capture *activity* without capturing *identity*.
- **A microphone / voice recognition.** Tessa uses it, but older people with dementia are hard to recognise reliably (Tinybots say so themselves), and an Uno cannot do it. Big buttons are robust and accessible.
- **A Raspberry Pi.** The laptop is our "edge server" for the prototype. A Pi would add €50+ and a Linux learning curve.
- **A microSD-card audio player.** SD cards now cost more than the whole voice module.

---

## Purchase request (copy, adapt, send)

> **Subject:** Purchase request tech-push duo [names], Digital Designs and Applications
>
> Dear [lecturer],
>
> For our smart system "Robin" (a routine-aware reminder robot inspired by Tinybots' Tessa, idea #12) we would like to request the following materials from Tinytronics (approved supplier). Total incl. VAT and shipping: **€39.00** (budget €50).
>
> | Product | SKU | Qty | Price incl. VAT |
> |---|---|---|---|
> | DFRobot Gravity UART MP3 Voice Module 8 MB (DFR0534) | 004047 | 1 | €9.50 |
> | Speaker 8Ω 1W 40 mm | 007512 | 1 | €1.00 |
> | HC-SR501 PIR motion sensor | 000090 | 1 | €3.50 |
> | GL5528 LDR | 000759 | 2 | €0.60 |
> | Tactile pushbutton 12x12x7.3 mm | 001204 | 3 | €0.75 |
> | Button caps 12x12 green / red / white | | 3 | €0.45 |
> | Breadboard 400 points | BB400P | 1 | €2.25 |
> | Jumper wires M-M 20 cm (10) | 000164 | 2 | €1.50 |
> | Jumper wires M-F 20 cm (10) | 000088 | 1 | €0.75 |
> | Jumper wires F-F 20 cm (10) | 000089 | 1 | €0.75 |
> | Resistor 10 kΩ (10) / 1 kΩ (10) | | 1 + 1 | €1.00 |
> | Kradex enclosure 176x126x57 transparent | 003260 | 1 | €10.00 |
> | Shipping (parcel) | | | €6.95 |
>
> If Pulsed already has breadboards, jumper wires, resistors, LDRs or push buttons available, we will use those and the total drops to €30.95.
>
> Kind regards, [names]
