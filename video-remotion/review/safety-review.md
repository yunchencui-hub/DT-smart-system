# Safety review of the build video (before rendering)

**What was reviewed:** everything the viewer hears and sees, i.e. `review/script.md`, which is generated from the video's own data. It was checked against `docs/04_assembly.md`, `docs/03_shopping_list.md`, the firmware (`robin.ino`, `voice.h`), the wiring data plus its automatic net check, and the real parts:
- the DFR0534 datasheet and its board photo;
- the Tinytronics pages for the speaker set 003415, the capacitor 006948, the 12×12 button 001204 and the Gravity cable.

**Who reviewed it:** a separate reviewer agent that did not write the script, briefed as *"a lab supervisor for a first-time maker who does not want to make a bomb or a stupid thing"*. Findings were fixed in docs/04 first, then in the video data. The same reviewer then checked the result again.

## Round 1: FAIL (0 BLOCKER, 2 HIGH)

| Sev. | Finding | Fix (commit `5a52a1a`) |
|---|---|---|
| **HIGH** | "Pull the white plug out of the module" (step 5b) came before the cable was ever plugged in, and the module's *soldered socket* was called "the white plug". A beginner could rip the socket off the board. | The module has a **socket** and the cable has the **plug**, in the video and in docs/04. Step 5b now says "The Gravity cable is not in the module yet. Keep it out while the micro-USB cable is in." The troubleshooting row says to pull the plug "by its body, not the wires". |
| **HIGH** | The module drawing showed one row of 8 pins, but the real board (datasheet photo) has two rows of holes plus an SPK socket. Matching the picture could put the speaker on TX/BUSY or across 5 V, and the pre-plug-in check never checked where the speaker went. | The drawing now matches the datasheet photo: Gravity socket **T R − +**, top holes **VCC GND RX TX BUSY**, bottom holes **ONE DACR DACL SP− SP+**, and a white **SPK** socket ("our plug doesn't fit; never bare wires in it"). The speaker goes on SP+/SP− only: this is said in 5a and 5c and is part of the step-5 check (spoken and on screen). docs/04 says the same. |
| MEDIUM | Fixes were spoken while the badge said USB IN (step 4d "move a wire", step 5h "check the capacitor"). | Every test now says **"Unplug."** first, then the fix "with the cable unplugged". A new cable rule (R1) flags hands-on verbs in USB IN lines. |
| MEDIUM | The speaker set's 4-pin plug also fits the module's Gravity socket, which would put one speaker across + and −. | Warning in step 5b (spoken plus an on-screen card) and in docs/04 §5a: never plug it in, cut it off. |
| MEDIUM | The only check of the module's + and − was the tape flags. | An optional multimeter beep check: the wire flagged + must beep with the VCC hole, the wire flagged − with the GND hole (step 5h and docs/04). |
| MEDIUM | "Leave the WiFi name empty", but the example file contains `"MyPhoneHotspot"`. | Now "change the WiFi name to two empty quotes", shown on screen as `"MyPhoneHotspot" → ""`. docs/04 §0 and docs/05 A.4 are reworded. |
| MEDIUM | No hot-glue burn warning. | Step 8b and docs/04: keep the gun on its stand, don't touch the glue for a minute, let it cool. |
| MEDIUM | Soldering advice was incomplete. | Hold the wire with tape or a helping hand (the wire gets hot), let a falling iron fall, switch the iron off. |
| MEDIUM | No re-check after moving everything into the box; no strain relief; nothing about drinks or metal on top. | Step 8b and docs/04: build in with the USB unplugged, redo the step-5 check and the tests, put a cable tie on the USB cable, keep drinks and metal off the top, unplug if the box gets warm. |
| MEDIUM | Nothing about the work surface (bare solder points on metal or a laptop short the 5 V). | New rule in the safety scene and in docs/04: work on wood or cardboard, never on metal or the laptop. Step 5e says the same. |
| LOW ×12 | The badge timing in 5d; the speaker missing from the 5d drawing; "5 V" splitting across a line; how to handle a failed capacitor; split rails; the tool list; unlabelled PIR knobs; the 1 kΩ bag; the rails wording; the breadboard gap drawn 4 pitches wide; speaker-wire strain relief; using a knife to remove burrs. | All fixed. The drawn capacitor's + leg is now also visibly the longer one. |

Verified as correct in round 1:
- netcheck 369/369;
- the firmware pins and serial settings;
- the 1 kΩ in the R line at 5 V;
- 680 µF across a USB rail (some laptop ports may switch off; this is covered in troubleshooting);
- the volume advice and "never two speakers (4 Ω)";
- the 12×12 button geometry (rows d/g);
- the resistor bands;
- the PIR settings;
- every table matches docs/03 and docs/04.

## Round 2
*(pending)*
