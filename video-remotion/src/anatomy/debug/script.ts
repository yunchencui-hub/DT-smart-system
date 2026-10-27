// THE script of the debugging guide (composition "RobinAnatomyDebug"): how to find and fix what doesn't work, as
// the anatomy bench with the fault drawn in, explained ELI5. Every case is a row of the troubleshooting table in
// docs/04_assembly.md, or of the connection table in docs/05_software_setup.md (C.4), in the same order.
// scripts/voice.ts and scripts/review.ts read it with --script debug. Review rules on top of R1-R4:
//   D1 every wiring fix (fix: true, or a doctor's "fix" step that isn't marked soft) happens with the USB cable out
//   D2 every case tests again (plugged in) after its first fix
//   D3 a case that shows a faulty part blames it (red) before the fix
//
// ELI5 (the "learn" skill, adapted to a video): debugging = being Robin's doctor, five steps that never change;
// one suspect per picture (red), a Predict pause before the answer, plain words for why the fault does what it does.
import type { AScene } from '../types';

const METHOD = '1 · The method';
const CASES = '2 · The cases';
const WRAP = '3 · Wrap-up';
const RAW = (pir: number, light: number, yes = '-', no = '-') => `pir_raw=${pir} (HIGH if > 400)  light_raw=${light}  yes=${yes}  no=${no}`;
// What robin.ino really prints at start: the boot event waits in the queue until Robin is online
const BOOT = ['', 'Robin firmware 1.0.0', '[queue] events waiting: 1', "Offline test mode: type 'help' in the Serial Monitor."];
// Telemetry every 2 s (PUBLISH_MS), shortened: "[tx-failed]" while there is no MQTT connection, "[tx]" once online
const TX = (seq: number, ms: number, sent = false) => `[${sent ? 'tx' : 'tx-failed'}] {"boot":48213,"seq":${seq},"ms":${ms},…}`;

export const SCENES: AScene[] = [
  // =============================================================================================
  {
    id: 'd-title', part: 'Welcome', title: 'Debug Robin: be its doctor', kind: 'title',
    lines: [
      'Something doesn\'t work? That\'s normal. Every builder spends time debugging, and it is a skill you can learn.',
      'In this video you learn to be Robin\'s doctor: find what is wrong, fix one thing, and check that it is better.',
      'Every case comes from the troubleshooting tables in the assembly guide, file 04, and in the software guide, file 05.',
    ],
    ui: { title: 'Debug Robin', sub: 'Be Robin\'s doctor · follows the troubleshooting tables in docs/04 and docs/05', doctor: 'symptom → unplug → look → change one thing → test' },
  },
  {
    id: 'd-loop', part: METHOD, title: 'The doctor\'s five steps', kind: 'loop',
    lines: [
      'Debugging is being Robin\'s doctor. A good doctor always works in the same five steps.',
      { say: 'Step one: the symptom. What do you see or hear, and what did you expect instead? Say it in one sentence.', doc: 'symptom' },
      { say: 'Step two: unplug. Never change wiring with the USB cable in. A wire that slips while the power is on can short the 5 volts.', doc: 'unplug' },
      { say: 'Step three: look and measure. Compare every wire with the pin map, read the labels on your parts, and ask the Serial Monitor.', doc: 'look' },
      { say: 'Step four: change one thing. Only one. If you change three things and it works, you don\'t know which one was the cure.', doc: 'fix' },
      { say: 'Step five: test again, then unplug. Still not fixed? Back to step three, with the next suspect.', doc: 'test' },
      { say: 'Really stuck? Go back to the last test that passed. The mistake is usually in what you added after it, or in a wire you bumped while adding it. That is why the guide tests after every step.', doc: 'test' },
    ],
    ui: { back: 'Stuck? Go back to the last test that passed: the mistake is usually in what came after it, or in a wire you bumped.' },
  },
  {
    id: 'd-tools', part: METHOD, title: 'The doctor\'s bag', kind: 'figure',
    fig: { n: 1, title: 'The finished bench' },
    eli5: 'Debugging is being Robin\'s doctor.',
    start: { fig: 'bench', view: 'full' },
    notes: [
      { from: 1, icon: '🌡️', text: 'Serial Monitor: type raw' },
      { from: 3, icon: '🙂', text: 'Robin\'s face' },
      { from: 5, icon: '🗺️', text: 'Pin map + the labels' },
      { from: 6, icon: '📟', text: 'Multimeter beep (unplugged)' },
    ],
    lines: [
      'Your doctor\'s bag has four tools.',
      { say: 'One: the Serial Monitor, at 115200 baud. Type raw, and Robin tells you what every sensor feels. It is Robin\'s thermometer.', usb: 'in', view: 'uno', serial: ['> raw', '[cmd] raw', RAW(3, 431), RAW(4, 430)] },
      { say: 'In offline test mode, it also writes tx-failed every 2 seconds. There is no network to send to, so that is normal.', speak: 'In offline test mode, it also writes T X failed every two seconds. There is no network to send to, so that is normal.', serial: [TX(5, 12034), TX(6, 14034)] },
      { say: 'Two: Robin\'s face. Crossed eyes for a moment mean it is starting up. In online mode, crossed eyes that don\'t go away mean it can\'t reach the laptop.', face: 'offline', faceCard: true },
      { say: 'Unplug.', usb: 'out', face: 'happy' },
      { say: 'Three: the pin map in file 04, and the labels printed on your parts. The label is always right; a picture, or your memory, can be wrong.', view: 'full' },
      'Four: a multimeter set to beep, borrowed at Pulsed. It beeps when two points are connected. Use it only with the USB cable unplugged.',
    ],
  },

  // =============================================================================================
  {
    id: 'd-serial', part: CASES, step: 'Case 1', title: 'Nothing in the Serial Monitor', kind: 'figure',
    fig: { n: 2, title: 'Case 1 · Serial Monitor', readout: 'Serial Monitor: 115200 baud · Newline' },
    eli5: 'Two people must talk at the same speed to understand each other.',
    start: { fig: 'bench', view: 'reset', doc: 'symptom' },
    lines: [
      { say: 'Case one: you plug in and open the Serial Monitor, but you see nothing, or only strange symbols.', usb: 'in', doc: 'symptom', serial: ['?x~?ÿ?#?f??', 'ÿ?~x??#?'] },
      { say: 'Strange symbols mean the speed is wrong. The Arduino talks at 115200 baud, so the Serial Monitor must listen at the same speed.', doc: 'look' },
      { say: 'Nothing at all usually means the wrong port. In the Tools menu, pick the port of your UNO R4 WiFi.', doc: 'look' },
      { say: 'This fix is in the software, so the cable can stay in: set 115200 baud, and the line ending Newline.', doc: 'fix', soft: true, serial: [] },
      { say: 'Test: press the reset button on the board once. The start message appears.', doc: 'test', glow: ['reset'], serial: [...BOOT, TX(0, 4012)] },
      { say: 'Unplug.', usb: 'out', glow: [] },
    ],
  },
  {
    id: 'd-light', part: CASES, step: 'Case 2', title: 'light_raw stuck near 0 or 1023', kind: 'figure',
    fig: { n: 3, title: 'Case 2 · Light' },
    eli5: 'Parts only meet when their legs share the same five holes.',
    fault: { show: ['f-ldr6'], hide: ['ldr'] },
    start: { fig: 'bench', view: 'ldr', doc: 'symptom' },
    lines: [
      { say: 'Case two: you type raw, and light_raw stays near 0, whether you cover the LDR or shine your torch on it.', speak: 'Case two: you type raw, and light raw stays near zero, whether you cover the L D R or shine your torch on it.', usb: 'in', doc: 'symptom', serial: ['> raw', '[cmd] raw', RAW(3, 2), RAW(4, 1), RAW(3, 2)] },
      { say: 'Unplug, before you touch anything.', usb: 'out', doc: 'unplug' },
      { say: 'Look at the divider. The LDR, the resistor and the A0 wire must meet in one column: the same five holes.', doc: 'look', glow: ['col:5:bottom'] },
      { say: 'Predict: which leg is the suspect?', doc: 'look' },
      { pause: 2.5, cap: 'Predict: which leg misses column 5?' },
      { say: 'Here: the LDR\'s leg sits in column 6, one hole too far. Column 6 isn\'t joined to column 5, so A0 only feels the resistor pulling it down to ground: about 0.', speak: 'Here: the L D R\'s leg sits in column six, one hole too far. Column six isn\'t joined to column five, so A zero only feels the resistor pulling it down to ground: about zero.', doc: 'look', blame: true, glow: ['col:5:bottom', 'col:6:bottom'], readout: 'LDR leg in column 6: one hole too far' },
      { say: 'Move the leg into column 5. And if light_raw is ever stuck near 1023 instead, it is usually the resistor that misses the column.', speak: 'Move the leg into column five. And if light raw is ever stuck near ten twenty-three instead, it is usually the resistor that misses the column.', doc: 'fix', fix: true, glow: ['col:5:bottom'], readout: 'LDR leg → column 5' },
      { say: 'Test again: plug in, cover the LDR and type raw: light_raw drops. Type raw again with the torch on it: it rises.', speak: 'Test again: plug in, cover the L D R and type raw: light raw drops. Type raw again with the torch on it: it rises.', usb: 'in', doc: 'test', glow: [], serial: ['> raw', '[cmd] raw', RAW(4, 35), '> raw', '[cmd] raw', RAW(3, 889)] },
      { say: 'Unplug.', usb: 'out' },
    ],
  },
  {
    id: 'd-pirjump', part: CASES, step: 'Case 3', title: 'pir_raw jumps while nobody moves', kind: 'figure',
    fig: { n: 4, title: 'Case 3 · Motion, random' },
    eli5: 'A PIR needs a minute to wake up, and it sees anything warm that moves.',
    start: { fig: 'bench', view: 'pir', doc: 'symptom' },
    lines: [
      { say: 'Case three: nobody moves, but each time you type raw, pir_raw may be high again: about 670 for a few seconds, then near 0.', speak: 'Case three: nobody moves, but each time you type raw, P I R raw may be high again: about six hundred seventy for a few seconds, then near zero.', usb: 'in', doc: 'symptom', serial: ['> raw', '[cmd] raw', RAW(3, 430), RAW(671, 431), '> raw', '[cmd] raw', RAW(669, 430), '> raw', '[cmd] raw', RAW(2, 431)] },
      { say: 'Two usual reasons. A PIR needs about 60 seconds to warm up, and until then its output is random. Or it simply sees you: you are warm, and you never sit perfectly still.', speak: 'Two usual reasons. A P I R needs about sixty seconds to warm up, and until then its output is random. Or it simply sees you: you are warm, and you never sit perfectly still.', doc: 'look', readout: 'warm-up: 60 s after power-on' },
      { say: 'Unplug.', usb: 'out', doc: 'unplug' },
      { say: 'Point the PIR away from you, at an empty part of the room.', speak: 'Point the P I R away from you, at an empty part of the room.', doc: 'fix', view: 'pirBack' },
      { say: 'Test again: plug in, wait the full 60 seconds, then sit still and type raw. Now pir_raw stays near 0.', speak: 'Test again: plug in, wait the full sixty seconds, then sit still and type raw. Now P I R raw stays near zero.', usb: 'in', doc: 'test', serial: ['> raw', '[cmd] raw', RAW(3, 430), RAW(2, 431), RAW(3, 430)] },
      { say: 'Still jumping? Unplug, turn the sensitivity knob, Sx, a little counter-clockwise, and test again.', speak: 'Still jumping? Unplug, turn the sensitivity knob, S x, a little counter-clockwise, and test again.', usb: 'out', doc: 'fix', glow: ['knobs'] },
    ],
  },
  {
    id: 'd-pirhigh', part: CASES, step: 'Case 4', title: 'The PIR stays HIGH for minutes', kind: 'figure',
    fig: { n: 5, title: 'Case 4 · Motion, stuck' },
    eli5: 'The time knob is how long the PIR keeps saying "yes".',
    start: { fig: 'bench', view: 'pirBack', doc: 'symptom' },
    lines: [
      { say: 'Case four: you wave once, and for minutes, every raw still shows pir_raw high.', speak: 'Case four: you wave once, and for minutes, every raw still shows P I R raw high.', usb: 'in', doc: 'symptom', serial: ['> raw', '[cmd] raw', RAW(670, 431), RAW(668, 430), '> raw', '[cmd] raw', RAW(671, 431), RAW(669, 430)] },
      { say: 'Unplug.', usb: 'out', doc: 'unplug' },
      { say: 'Look at the time knob, Tx. It decides how long the PIR keeps saying yes after it saw a movement. Turned up, that can be minutes.', speak: 'Look at the time knob, T x. It decides how long the P I R keeps saying yes after it saw a movement. Turned up, that can be minutes.', doc: 'look', glow: ['knobs'], readout: 'time knob Tx turned up' },
      { say: 'Turn Tx fully counter-clockwise: the shortest time, about 3 seconds. Knobs not labelled? Use the trick from step 3 of the build.', speak: 'Turn T x fully counter-clockwise: the shortest time, about three seconds. Knobs not labelled? Use the trick from step three of the build.', doc: 'fix', glow: ['knobs'], readout: 'Tx fully counter-clockwise' },
      { say: 'Test again: plug in and wait 60 seconds. Wave once, then step out of its view. A few seconds later, type raw, and pir_raw is back near 0.', speak: 'Test again: plug in and wait sixty seconds. Wave once, then step out of its view. A few seconds later, type raw, and P I R raw is back near zero.', usb: 'in', doc: 'test', glow: [], serial: ['> raw', '[cmd] raw', RAW(4, 431), RAW(3, 430)] },
      { say: 'Unplug. Still high while you sit in front of it? With the jumper on H, every small movement starts the time again: it simply sees you.', usb: 'out' },
    ],
  },
  {
    id: 'd-button', part: CASES, step: 'Case 5', title: 'A button always reads "pressed"', kind: 'figure',
    fig: { n: 6, title: 'Case 5 · Button' },
    eli5: 'Inside, the legs hold hands in pairs.',
    fault: { show: ['f-wGG11'], hide: ['wGG'] },
    start: { fig: 'bench', view: 'buttons', doc: 'symptom' },
    lines: [
      { say: 'Case five: raw says yes equals pressed, even when nobody touches the green button.', usb: 'in', doc: 'symptom', serial: ['> raw', '[cmd] raw', RAW(3, 430, 'pressed'), RAW(2, 431, 'pressed')] },
      { say: 'Unplug.', usb: 'out', doc: 'unplug' },
      { say: 'Look inside a button. Two metal strips each join two legs, for good. Pressing only lets the dome connect one strip to the other.', doc: 'look', fig: 'buttonXray', lift: 1, readout: 'two strips inside: the legs are joined in pairs' },
      { say: 'In this button the strips run from front to back. The D2 wire and the ground wire sit on the same strip, so D2 is always connected to ground: always pressed.', doc: 'look', blame: true, readout: 'D2 and ground on the same strip' },
      { say: 'Predict: where should the ground wire go instead?', doc: 'look' },
      { pause: 2.5, cap: 'Predict: which leg for the ground wire?' },
      { say: 'To the diagonally opposite leg: column 13, bottom half. Diagonal legs are never on the same strip, whichever way your button is turned.', speak: 'To the diagonally opposite leg: column thirteen, bottom half. Diagonal legs are never on the same strip, whichever way your button is turned.', doc: 'fix', fix: true, readout: 'ground wire → column 13, bottom half' },
      { say: 'Now only a press lets the dome bridge the two strips, and only then is D2 connected to ground.', doc: 'fix', press: 1 },
      { say: 'Test again: plug in, type raw, and press green once. Yes is pressed only while you hold it.', usb: 'in', doc: 'test', fig: 'bench', press: 0, serial: ['> raw', '[cmd] raw', RAW(3, 430), RAW(2, 431, 'pressed'), RAW(3, 430)] },
      { say: 'Unplug.', usb: 'out' },
    ],
  },
  {
    id: 'd-sound', part: CASES, step: 'Case 6', title: 'No sound', kind: 'figure',
    fig: { n: 7, title: 'Case 6 · Voice' },
    eli5: 'Mouth to ear, ear to mouth: T and R must cross.',
    fault: { show: ['f-wT', 'f-wR'], hide: ['wT', 'wR'] },
    start: { fig: 'bench', view: 'voiceWires', doc: 'symptom' },
    lines: [
      { say: 'Case six: Robin stays silent. No hello when it starts, and say 3 does nothing.', usb: 'in', doc: 'symptom', serial: ['> say 3', '[cmd] say 3'] },
      { say: 'Unplug.', usb: 'out', doc: 'unplug' },
      { say: 'No sound has four usual suspects: the T and R wires, the speaker joints, the files, and the volume. Check them in that order, one at a time.', doc: 'look' },
      { say: 'Predict: follow the wire from the cable\'s T socket. Where should it end?', doc: 'look', glow: ['pin:D0,D1'] },
      { pause: 2.5, cap: 'Predict: module T → which Arduino pin?' },
      { say: 'Here, T ends at column 22, and R ends at D0. Mouth goes to mouth and ear to ear, so nobody hears anybody.', speak: 'Here, T ends at column twenty-two, and R ends at D0. Mouth goes to mouth and ear to ear, so nobody hears anybody.', doc: 'look', blame: true, glow: ['pin:D0', 'col:22:top'], readout: 'T and R not crossed' },
      { say: 'Swap them: T to D0, and R to column 22, through the 1 kΩ resistor to D1.', speak: 'Swap them: T to D0, and R to column twenty-two, through the one kilo-ohm resistor to D1.', doc: 'fix', fix: true, glow: ['pin:D0,D1', 'col:22:top'], readout: 'T → D0 · R → 1 kΩ → D1' },
      { say: 'Test again: plug in, and Robin says hello.', usb: 'in', doc: 'test', glow: [] },
      { robin: 1 },
      { say: 'Unplug. Still silent in your build? Then check, unplugged, that the speaker wires are in SP+ and SP−.', usb: 'out', doc: 'look' },
      { say: 'Then the files. First pull the Gravity plug out of the module, then connect the micro-USB data cable: the files 01.mp3 to 13.mp3 must be in the root of the drive. Case seven shows how.', speak: 'Then the files. First pull the Gravity plug out of the module, then connect the micro U S B data cable: the files zero one dot M P 3 to thirteen dot M P 3 must be in the root of the drive. Case seven shows how.', doc: 'look' },
      { say: 'Micro-USB out, Gravity plug back in. Then plug in and listen for hello: Robin sets the volume to 20 by itself at every start.', speak: 'Micro U S B out, Gravity plug back in. Then plug in and listen for hello: Robin sets the volume to twenty by itself at every start.', doc: 'look' },
    ],
  },
  {
    id: 'd-wrongfile', part: CASES, step: 'Case 7', title: 'Robin plays the wrong sentence', kind: 'figure',
    fig: { n: 8, title: 'Case 7 · Files' },
    eli5: 'Robin asks for a file by its first two digits.',
    start: { fig: 'drive', drive: 'old', doc: 'symptom' },
    lines: [
      { say: 'Case seven: you type say 3, and Robin plays music, or the wrong sentence.', usb: 'in', doc: 'symptom', serial: ['> say 3', '[cmd] say 3'] },
      { say: 'Robin asks the module for the first file whose name starts with 03. If an old demo file also starts with 03, the module may pick that one.', speak: 'Robin asks the module for the first file whose name starts with zero three. If an old demo file also starts with zero three, the module may pick that one.', doc: 'look', readout: 'old demo files still on the module' },
      { say: 'Unplug the Arduino. Then pull the Gravity cable\'s plug out of the module, by the plug\'s body, never by the wires.', usb: 'out', doc: 'unplug' },
      { say: 'Connect the module to the laptop with the micro-USB data cable, and delete everything on it.', usb: 'micro', doc: 'fix', soft: true, drive: 'empty' },
      { say: 'Copy 01.mp3 to 13.mp3 into the root again, and eject the drive.', drive: 'new' },
      { say: 'Unplug the micro-USB cable, and push the Gravity plug back into the module.', usb: 'out' },
      { say: 'Test: say 3 asks the medicine question.', usb: 'in', doc: 'test', serial: ['> say 3', '[cmd] say 3'] },
      { robin: 3 },
      { say: 'Unplug.', usb: 'out' },
    ],
  },
  {
    id: 'd-pops', part: CASES, step: 'Case 8', title: 'Pops, buzzing, or a restart when it talks', kind: 'figure',
    fig: { n: 9, title: 'Case 8 · Power dips' },
    eli5: 'No water tank: a big gulp empties the pipe.',
    fault: { show: [], hide: ['cap'] },
    start: { fig: 'bench', view: 'cap', doc: 'symptom' },
    lines: [
      { say: 'Case eight: when Robin talks loudly, you hear pops or buzzing, or the board restarts and the start message appears again.', usb: 'in', doc: 'symptom', serial: ['> say 3', '[cmd] say 3', ...BOOT] },
      { say: 'Unplug.', usb: 'out', doc: 'unplug' },
      { say: 'A loud word makes the speaker gulp current, and the 5 volts dips. Without its water tank, the dip resets the brain. Look next to the module\'s power wires: the capacitor is missing.', doc: 'look', glow: ['rail:+b', 'rail:-b'], readout: '680 µF capacitor missing' },
      { say: 'Put the capacitor back next to the module\'s power wires: the stripe and the short leg in the minus rail, the long leg in the plus rail.', doc: 'fix', fix: true, readout: 'capacitor back: stripe in the − rail' },
      { say: 'Check that the stripe is in the minus rail.', doc: 'fix', glow: ['rail:-b'] },
      { say: 'Test: plug in, with your face away from the capacitor, and type say 3. It plays without pops.', speak: 'Test: plug in, with your face away from the capacitor, and type say three. It plays without pops.', usb: 'in', doc: 'test', glow: [], serial: ['> say 3', '[cmd] say 3'] },
      { robin: 3 },
      { say: 'Unplug. Still popping? Then change the next thing, the volume: type vol 15, and test again.', speak: 'Unplug. Still popping? Then change the next thing, the volume: type vol fifteen, and test again.', usb: 'out', doc: 'fix', soft: true },
      { say: 'vol 15 only lasts until the next restart. To keep it, set DEFAULT_VOLUME to 15 in robin.ino and upload, and set volume to 15 in config.yaml.', speak: 'Vol fifteen only lasts until the next restart. To keep it, set default volume to fifteen in robin dot ino and upload, and set volume to fifteen in config dot yaml.' },
      { say: 'Still popping after that? Try another USB port, or a good phone charger.', speak: 'Still popping after that? Try another U S B port, or a good phone charger.' },
    ],
  },
  {
    id: 'd-short', part: CASES, step: 'Case 9', title: '"USB device needs more power"', kind: 'figure',
    fig: { n: 10, title: 'Case 9 · Short circuit' },
    eli5: 'A short is a shortcut: the current skips all the parts.',
    fault: { show: ['f-short'], hide: [] },
    start: { fig: 'bench', view: 'rails', doc: 'symptom' },
    lines: [
      { say: 'Case nine: you plug in, and the laptop says the USB device needs more power, or the port switches off.', usb: 'in', doc: 'symptom', readout: 'laptop: USB device needs more power' },
      { say: 'Unplug at once.', usb: 'out', doc: 'unplug' },
      { say: 'This often means a short circuit: somewhere the plus rail touches the minus rail. The current takes that shortcut instead of going through the parts, far too much flows, and the laptop switches the port off to protect itself.', doc: 'look' },
      { say: 'Predict: find the wire that joins the red line to the blue line.', doc: 'look', glow: ['rail:+b', 'rail:-b'] },
      { pause: 2.5, cap: 'Predict: which wire joins + to −?' },
      { say: 'Here: one wire goes straight from the plus rail to the minus rail.', doc: 'look', blame: true, readout: 'a wire from + to −: a short circuit' },
      { say: 'Take it out. Then check that no bare leg or wire end touches both rails, that the Arduino, the PIR and the voice module don\'t lie on metal or on your laptop, and that the module\'s pins don\'t touch the Arduino.', speak: 'Take it out. Then check that no bare leg or wire end touches both rails, that the Arduino, the P I R and the voice module don\'t lie on metal or on your laptop, and that the module\'s pins don\'t touch the Arduino.', doc: 'fix', fix: true, readout: 'short removed' },
      { say: 'Test again: the power LED comes on, and the laptop stays quiet.', usb: 'in', doc: 'test', glow: [] },
      { say: 'Unplug. Did the message come only once, and did nothing get warm? Check that the capacitor\'s stripe and the module\'s minus wire are in the minus rail. Then it can be the capacitor charging: try another port, or a powered hub.', usb: 'out' },
    ],
  },
  {
    id: 'd-hotcap', part: CASES, step: 'Case 10', title: 'The capacitor gets warm or bulges', kind: 'figure',
    fig: { n: 11, title: 'Case 10 · Capacitor' },
    eli5: 'A capacitor in backwards is like a tank filled the wrong way: it swells.',
    fault: { show: ['f-capRev'], hide: ['cap'] },
    start: { fig: 'bench', view: 'cap', doc: 'symptom' },
    lines: [
      { say: 'Case ten: the capacitor gets warm, smells, or its top bulges.', usb: 'in', doc: 'symptom', readout: 'capacitor warm' },
      { say: 'Unplug now. Don\'t touch it, keep your face away, and leave it for ten minutes to cool down.', usb: 'out', doc: 'unplug' },
      { say: 'Look at the stripe: it faces the plus rail. The capacitor is in backwards.', doc: 'look', blame: true, glow: ['rail:+b'], readout: 'stripe in the + rail: backwards' },
      { say: 'Don\'t use it again: put it in the electronics recycling, so it never gets mixed up with the spare.', doc: 'fix' },
      { say: 'Fit the spare: the stripe and the short leg in the minus rail, the long leg in the plus rail.', doc: 'fix', fix: true, glow: ['rail:-b'], readout: 'spare fitted: stripe in the − rail' },
      { say: 'Check that the stripe is in the minus rail.', doc: 'fix', glow: ['rail:-b'] },
      { say: 'Test: plug in, with your face away from the capacitor. Look and listen: nothing bulges, hisses or smells.', usb: 'in', doc: 'test', glow: [] },
      { say: 'Unplug. Only now touch it with a finger: it is cool.', usb: 'out' },
    ],
  },
  {
    id: 'd-eyes', part: CASES, step: 'Case 11', title: 'Crossed eyes forever (online mode)', kind: 'figure',
    fig: { n: 12, title: 'Case 11 · WiFi and MQTT' },
    eli5: 'WiFi is the road, MQTT is the mailbox. Find where the letter got stuck.',
    start: { fig: 'network', net: 'wifi', face: 'offline', doc: 'symptom' },
    lines: [
      { say: 'Case eleven: in online mode, the face keeps its crossed eyes and never turns happy.', usb: 'in', doc: 'symptom', serial: ['[wifi] connecting to my-hotspot', '[wifi] failed, will retry', TX(3, 9530)] },
      { say: 'Crossed eyes mean Robin can\'t deliver its messages. Think of letters: WiFi is the road, through your phone\'s hotspot. MQTT is the mailbox: Mosquitto on your laptop.', doc: 'look' },
      { say: 'The Serial Monitor tells you where the letter got stuck. Skip the tx-failed lines: they only mean "not sent yet".', speak: 'The Serial Monitor tells you where the letter got stuck. Skip the T X failed lines: they only mean: not sent yet.', doc: 'look' },
      { say: '"[wifi] failed, will retry" means the road is blocked: check the hotspot\'s name and password letter by letter, capitals count, and use 2.4 gigahertz.', speak: '"Wi-Fi failed, will retry" means the road is blocked: check the hotspot\'s name and password letter by letter, capitals count, and use 2.4 gigahertz.', doc: 'look', net: 'wifi' },
      { say: '"[mqtt] failed, error -2" means the road works, but the mailbox can\'t be reached: a wrong IP address, a firewall, Mosquitto not running or started without our config, or the laptop on another network. Error -1 means it was reached, but didn\'t answer within 5 seconds.', speak: '"M Q T T failed, error minus two" means the road works, but the mailbox can\'t be reached: a wrong IP address, a firewall, Mosquitto not running or started without our config, or the laptop on another network. Error minus one means it was reached, but didn\'t answer within five seconds.', doc: 'look', net: 'mqtt', serial: ['[wifi] connecting to my-hotspot', '[wifi] connected, IP 192.168.43.20', '[mqtt] connecting to 192.168.43.10:1883', '[mqtt] failed, error -2'] },
      { say: 'Error 4 or 5: the mailbox wants a password. Set it in the secrets, or use our broker config.', speak: 'Error four or five: the mailbox wants a password. Set it in the secrets, or use our broker config.', doc: 'look', net: 'auth', serial: ['[mqtt] connecting to 192.168.43.10:1883', '[mqtt] failed, error 5'] },
      { say: 'It connects, then drops every 20 seconds or so? Something blocks the loop: don\'t add delay() in loop().', speak: 'It connects, then drops every twenty seconds or so? Something blocks the loop: don\'t add a delay in the loop.', doc: 'look', net: 'drop' },
      { say: 'And if the Python brain says ConnectionRefusedError: start Mosquitto first.', speak: 'And if the Python brain says connection refused error: start Mosquitto first.', doc: 'look', net: 'mqtt' },
      { say: 'Fix the one thing the message points to: on the phone, on the laptop, or in arduino_secrets.h. Upload again only if you changed the code or the secrets; otherwise Robin tries again by itself every few seconds.', speak: 'Fix the one thing the message points to: on the phone, on the laptop, or in arduino secrets dot h. Upload again only if you changed the code or the secrets; otherwise Robin tries again by itself every few seconds.', doc: 'fix', soft: true, net: 'ok', face: 'happy', serial: ['', 'Robin firmware 1.0.0', '[queue] events waiting: 1', '[wifi] connecting to my-hotspot', '[wifi] connected, IP 192.168.43.20', '[mqtt] connecting to 192.168.43.10:1883', '[mqtt] connected'] },
      { say: 'Test: the face turns happy, tx-failed becomes tx, and mosquitto_sub shows Robin\'s messages.', speak: 'Test: the face turns happy, T X failed becomes T X, and mosquitto sub shows Robin\'s messages.', doc: 'test', serial: [TX(2, 6020, true)] },
      { say: 'Unplug.', usb: 'out' },
    ],
  },

  // =============================================================================================
  {
    id: 'd-end', part: WRAP, title: 'You can debug Robin', kind: 'end',
    lines: [
      'That\'s the doctor\'s routine: symptom, unplug, look and measure, change one thing, test again.',
      'Most problems are one wire in the wrong hole. The labels and the pin map are always right; memory isn\'t.',
      'Write down each symptom and what fixed it. Those notes help you, your duo partner, and your oral exam.',
    ],
    ui: { head: 'You can debug Robin.', recap: 'symptom · unplug · look and measure · change one thing · test again', rule: 'Never change wiring with the USB cable in', drawings: 'they explain; your own tests prove it works' },
  },
];
