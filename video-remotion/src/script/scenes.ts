// THE video script: every spoken line and every on-screen text, in order.
// It follows docs/04_assembly.md (updated 30 Sep 2026) step by step.
// scripts/review.ts turns this into review/script.md for the safety review.
import type { SceneDef } from './types';

const GET = '1 · Get ready';
const BUILD = '2 · Build';
const WRAP = '3 · Wrap-up';

export const SCENES: SceneDef[] = [
  // =============================================================================================
  {
    id: 'title', part: 'Welcome', title: 'Build Robin, step by step',
    lines: [
      'Welcome! In this video we build Robin, step by step, exactly like the assembly guide, file 04.',
      'Robin is a small care robot. It notices movement and light, asks yes or no questions, and speaks with its own voice.',
      'This version uses the parts of the updated order from the thirtieth of September. If you watched the older video, follow this one for the voice module.',
    ],
    ui: {
      title: 'Build Robin',
      sub: 'Step by step, exactly like docs/04 · parts of 30 Sep 2026',
      chip1: '1 · Get ready',
      chip2: '2 · Build: steps 1–8',
      chip3: '3 · Recap & fixes',
    },
  },

  // =============================================================================================
  {
    id: 'delivery', part: GET, title: 'Check your delivery: 16 order lines',
    lines: [
      'When the box from Tinytronics arrives, first check that everything is there. Here are the sixteen lines of the order form.',
      'The voice module, the DFR0534. The speaker set, with two speakers. The motion sensor. And the box with the clear lid.',
      'Two light sensors, three push buttons, and three caps: green, red, and a spare white one. And the breadboard.',
      'Three packs of male to male jumper wires, two packs of male to female, and one pack of female to female.',
      'A bag of ten kilo-ohm resistors, a bag of one kilo-ohm resistors, and two capacitors of 680 microfarad.',
      { say: "Three things are new since the tutor's feedback: the 2 watt speaker set, the extra jumper wires, and the capacitors. The parts cost 35 euros 95.", speak: "Three things are new since the tutor's feedback: the two watt speaker set, the extra jumper wires, and the capacitors. The parts cost thirty-five euros ninety-five." },
      'Tick each line off. If something is missing, tell the store room before you start building.',
    ],
    ui: {
      new: 'NEW 30 Sep',
      total: 'Parts €35.95 incl. VAT · with shipping ≈ €42.90',
      tip: 'Something missing? Tell the store room before you build.',
    },
  },
  {
    id: 'extras', part: GET, title: 'Also needed (not in the order)',
    lines: [
      'A few things are not in the order.',
      'The Arduino UNO R4 WiFi comes from school. Check that it has a USB-C port, and a grid of little LEDs on the board.',
      'You need a USB-C data cable, and the micro-USB data cable you already have, for the voice module. Careful: some cheap cables can only charge, and then nothing works.',
      'At Pulsed you use a soldering iron with a stand, a drill with a clamp, a wire cutter, a small screwdriver, a hot-glue gun, insulating tape, and safety glasses.',
      'And later, a phone charger to power Robin at home.',
    ],
    ui: {
      unoT: 'Arduino UNO R4 WiFi', unoX: 'From school. Check: USB-C port + 12 × 8 LED grid.',
      usbT: 'USB-C data cable', usbX: 'Uploads the code and powers Robin while you test.',
      microT: 'micro-USB data cable', microX: 'You already have it. Copies the voice files onto the module.',
      chargeT: 'Charge-only cables!', chargeX: 'They carry no data. Laptop sees nothing? Try another cable.',
      toolsT: 'At Pulsed', toolsX: 'Soldering iron + stand, drill + clamp, wire cutter, screwdriver, hot glue, tape, safety glasses.',
      phoneT: 'Phone charger (5 V)', phoneX: 'Powers Robin at home, later.',
    },
  },
  {
    id: 'wires', part: GET, title: 'Jumper wires, and the voice module’s cable',
    lines: [
      'A quick word about jumper wires. A male end has a pin. A female end has a little hole.',
      'Male to male wires go between the Arduino and the breadboard.',
      'Male to female wires plug onto the pins of the motion sensor.',
      'The voice module brings its own cable. Its white plug goes into the module, and the other end has four female sockets. So you connect it with four male to male wires.',
      'And one female to female wire may become two speaker wires. More about that in step five.',
    ],
    ui: {
      male: 'male = pin', female: 'female = hole',
      mm: 'M – M', mmUse: 'Arduino ↔ breadboard',
      fm: 'M – F', fmUse: 'onto the PIR pins',
      grav: 'Gravity cable', gravUse: 'white plug → 4 female sockets → 4 × M-M',
      ff: 'F – F', ffUse: 'maybe: speaker wires (step 5)',
    },
  },
  {
    id: 'software', part: GET, title: 'Before wiring: upload the firmware',
    lines: [
      'Before we touch a single wire, upload the firmware. The software guide, file 05, part A, has every click.',
      'Install Arduino IDE 2, the UNO R4 boards package, and the ArduinoMqttClient library.',
      'Copy arduino_secrets.example.h to arduino_secrets.h, and leave the WiFi name empty. That is offline test mode: no network needed yet.',
      { say: 'Plug in the Arduino, and upload robin.ino. Open the Serial Monitor at 115200 baud, line ending Newline, and type help.', usb: 'in' },
      { say: 'Then unplug the USB cable. From now on, we wire with the cable unplugged.', usb: 'out' },
    ],
    ui: {
      s1: 'Arduino IDE 2', s2: 'Boards: Arduino UNO R4 Boards', s3: 'Library: ArduinoMqttClient',
      s4: 'arduino_secrets.h: SECRET_WIFI_SSID ""  → offline test mode', s5: 'Upload robin.ino', s6: 'Serial Monitor: 115200 baud · Newline',
      guide: 'docs/05, part A',
    },
  },
  {
    id: 'rules', part: GET, title: 'The golden rule, and safety',
    lines: [
      'The golden rule: wire with the USB cable unplugged. Plug in only to test, and unplug again after every test.',
      'The badge in the top corner shows it all the time: USB out while you wire, USB in only while you test.',
      "Five volts can't hurt you, but it can destroy a module. Never connect the plus rail to the minus rail. That's a short circuit.",
      'Read the label, not the picture. Pin order can differ between versions of a module, so always go by the names printed on your part.',
      'Three things have a plus and a minus, and break when reversed: the module power pins, the capacitor, and the breadboard rails. Check them twice.',
      'Check every wire twice before you plug in. If something gets warm or smells, or the power light stays off, unplug immediately.',
      'And wear safety glasses when you cut wire ends, solder, or drill.',
    ],
    ui: {
      goldenT: 'Golden rule', goldenX: 'Wire with the USB unplugged. Plug in only to test, then unplug again.',
      shortT: 'Never + rail to − rail', shortX: 'That is a short circuit.',
      labelT: 'Read the label, not the picture', labelX: 'Pin order differs between module versions.',
      polT: '+ and − matter here', polX: 'Module power pins · the capacitor · the rails. Check twice.',
      warmT: 'Warm? Smells? LED off?', warmX: 'Unplug immediately.',
      glassesT: 'Safety glasses', glassesX: 'Cutting wire ends, soldering, drilling.',
      short: 'Short circuit: + straight to −',
    },
  },
  {
    id: 'breadboard', part: GET, title: 'How a breadboard works',
    lines: [
      'Meet the breadboard. Underneath the holes, metal strips connect them in groups.',
      'The long rows along the edges are the power rails. All holes along the red line are connected: that is plus. All holes along the blue line are connected: that is minus.',
      'Careful: on some breadboards the red row is on the outside, on others on the inside. Always follow the red and blue lines printed on your board, not the picture.',
      'There is a pair of rails on each long side, and the two pairs are not connected. We use only the pair next to the Arduino’s power pins.',
      'In the middle, each numbered column of five holes is one group. The gap in the middle separates the top five from the bottom five.',
      'Two legs in the same group are connected. Two legs in different groups are not.',
    ],
    ui: {
      follow: 'Follow the red (+) and blue (−) lines printed on YOUR board',
      boardA: 'board A: + outside', boardB: 'board B: + inside',
      use: 'we use this pair (next to the Arduino)',
      group: 'one group of 5',
    },
  },
  {
    id: 'pinmap', part: GET, title: "The whole map (don't memorise it!)",
    lines: [
      "Here is the map of everything we'll connect. Don't try to remember it. We'll do it one small piece at a time.",
      'Keep this table open next to you while you wire. It is in the assembly guide, file 04.',
    ],
    ui: { doc: '📄 docs/04_assembly.md', head1: 'From', head2: 'To', head3: 'Wire' },
  },

  // =============================================================================================
  // Step 1
  {
    id: 'step1', part: BUILD, step: 'Step 1 of 8', title: 'Power rails',
    lines: [
      'Step one: the power rails. Two wires, two minutes.',
      { say: 'Take a male to male wire, red if you have one. Connect the Arduino pin labelled 5V to the plus rail, along the red line.', adds: ['w5v'] },
      { say: 'Take a black wire. Connect a pin labelled GND to the minus rail, along the blue line.', adds: ['wgnd'] },
      'Now the rails carry five volts and ground for every part.',
      { say: 'Test: plug in the USB cable. The power LED turns on. The face shows crossed eyes for a moment while it starts, then a happy face.', usb: 'in' },
      { say: 'Unplug again.', usb: 'out' },
    ],
    ui: { t5v: '5V', tgnd: 'GND', tplus: '+ rail (red line)', tminus: '− rail (blue line)' },
  },

  // Step 2
  {
    id: 'step2a', part: BUILD, step: 'Step 2 of 8', title: 'Light sensor: why a voltage divider?',
    lines: [
      'Step two: the light sensor, an LDR. Its resistance drops when light shines on it.',
      "But the Arduino can't measure resistance. It can only measure voltage.",
      'So we put the LDR in series with a fixed ten kilo-ohm resistor, between five volts and ground.',
      'The voltage in the middle rises with light. More light, lower LDR resistance, higher voltage on A0.',
      'In the dark, it reads about 10. In a normal room, about 340 to 510.',
    ],
    ui: { formula: 'V(A0) = 5 V × 10k / (10k + R_LDR)', dark: 'dark: ≈ 10', room: 'room: ≈ 340–510' },
  },
  {
    id: 'step2b', part: BUILD, step: 'Step 2 of 8', title: 'Light sensor: wiring',
    lines: [
      { say: 'Wiring. Put one leg of the LDR into the plus rail. Its other leg goes into column 5, in the bottom half of the board.', adds: ['ldr'] },
      'Take a ten kilo-ohm resistor. The label on the bag tells you which is which. With four colour bands it reads brown, black, orange. With five bands, brown, black, black, red.',
      { say: 'Put one leg in the same column 5, and the other leg in the minus rail.', adds: ['r10k'] },
      { say: 'Finally, a wire from column 5 to pin A0.', adds: ['wA0'] },
      'The LDR and the resistor have no plus or minus side. Either way round is fine.',
    ],
    ui: { col5: 'column 5 = one group', bands: '10 kΩ: brown · black · orange  (5 bands: brown · black · black · red)', bag: 'check the bag label' },
  },
  {
    id: 'step2c', part: BUILD, step: 'Step 2 of 8', title: 'Light sensor: test',
    lines: [
      { say: 'Test time. Plug in, open the Serial Monitor, type raw, and press Enter.', usb: 'in' },
      'Cover the LDR with your finger: light_raw drops a lot. Shine your phone torch on it: it rises.',
      'Stuck near zero or near 1023? Then the LDR and the resistor are not in the same column, or the A0 wire is in the wrong column.',
      { say: 'Unplug.', usb: 'out' },
    ],
    ui: { note: 'pir_raw: the PIR is not connected yet, ignore it', fix: 'Stuck at ~0 or ~1023 → LDR and resistor in one column? A0 wire in column 5?' },
  },

  // Step 3
  {
    id: 'step3a', part: BUILD, step: 'Step 3 of 8', title: 'Motion sensor: read its labels',
    lines: [
      'Step three: the motion sensor, a PIR. It sees warm bodies move. It does not see faces.',
      'Gently pull off the white dome. Underneath, the three pins are labelled: VCC, OUT, and GND.',
      'Remember the order on your sensor, then put the dome back. Always go by these labels, not by the picture.',
    ],
    ui: { labels: 'VCC · OUT · GND are printed under the dome', yours: 'go by the labels on YOUR sensor' },
  },
  {
    id: 'step3b', part: BUILD, step: 'Step 3 of 8', title: 'PIR: the two knobs and the jumper',
    lines: [
      'Turn the PIR over. There are two orange knobs. Use a small screwdriver.',
      'The time delay knob: turn it fully counter-clockwise. That is the shortest time, about three seconds.',
      'The sensitivity knob: start in the middle.',
      'If your sensor has a jumper, put it on H. Then the output stays high while you keep moving.',
    ],
    ui: { tx: 'time delay: fully counter-clockwise (≈ 3 s)', sx: 'sensitivity: middle', jumper: 'jumper on H (repeat trigger)' },
  },
  {
    id: 'step3c', part: BUILD, step: 'Step 3 of 8', title: 'PIR: wiring',
    lines: [
      { say: 'Now three male to female wires. The female end goes onto the sensor pin. The male end goes into the breadboard, or straight into the Arduino.', adds: ['pir'] },
      { say: 'VCC goes to the plus rail.', adds: ['wPV'] },
      { say: 'GND goes to the minus rail.', adds: ['wPG'] },
      { say: 'And OUT goes straight to pin A1.', adds: ['wPO'] },
    ],
    ui: { vcc: 'VCC → + rail', gnd: 'GND → − rail', out: 'OUT → A1' },
  },
  {
    id: 'step3d', part: BUILD, step: 'Step 3 of 8', title: 'Why an analog pin? (logic levels)',
    lines: [
      'Why A1, an analog pin? The PIR says high with 3.3 volts.',
      'But the UNO R4 runs at five volts, and a digital pin only reliably sees high above about three and a half volts. So 3.3 volts could be missed.',
      'An analog pin measures the voltage instead. 3.3 volts reads about 675 out of 1023. Our threshold is 400, so it is rock solid.',
    ],
    ui: { pir: 'PIR HIGH = 3.3 V', dig: 'digital HIGH needs ≳ 3.5 V', ana: 'analog: 3.3 V ≈ 675 of 1023 · threshold 400' },
  },
  {
    id: 'step3e', part: BUILD, step: 'Step 3 of 8', title: 'PIR: test',
    lines: [
      { say: 'Test. Plug in, and wait sixty seconds. A PIR warms up, and gives random output at first.', usb: 'in' },
      'Type raw. Sit still: pir_raw stays around zero. Wave your hand: it jumps to about 650 to 700.',
      'High for minutes? The time knob is not at minimum. Random flicker? Wait longer, point it away, or lower the sensitivity.',
      { say: 'Unplug.', usb: 'out' },
    ],
    ui: { warm: 'PIR warming up…', ready: 'Ready ✓', fix: 'HIGH for minutes → time knob to minimum. Flicker → wait, point away, lower sensitivity.' },
  },

  // Step 4
  {
    id: 'step4a', part: BUILD, step: 'Step 4 of 8', title: 'Buttons: pull-up and bounce',
    lines: [
      'Step four: the yes and no buttons.',
      'Inside the Arduino, a pull-up resistor gently holds the pin at five volts. So when nobody presses, the pin reads high.',
      'Pressing connects the pin to ground, and it reads low. Pressed means low. It looks backwards, but it saves a resistor.',
      'Buttons also bounce: the contacts chatter for a few milliseconds. The firmware waits forty milliseconds for them to settle.',
    ],
    ui: { inside: 'inside the Arduino', pullup: 'pull-up', high: 'not pressed → HIGH', low: 'pressed → LOW', debounce: 'debounce: 40 ms' },
  },
  {
    id: 'step4b', part: BUILD, step: 'Step 4 of 8', title: 'Buttons: the four-leg puzzle',
    lines: [
      'A button has four legs, and two pairs of them are always connected. Pressing only connects one pair to the other.',
      'The trick that always works: put the button across the middle gap, and use two diagonally opposite legs.',
      'Our buttons are big, 12 by 12 millimetres. Their legs land about two rows from the gap on each side, and two columns apart. Press them in firmly.',
      'A button only ever goes to the minus rail and a D pin. Never to the plus rail.',
    ],
    ui: { always: 'always connected', diag: 'use diagonal legs', big: '12 × 12 mm: legs in rows d and g, 2 columns apart', never: 'never to the + rail' },
  },
  {
    id: 'step4c', part: BUILD, step: 'Step 4 of 8', title: 'Buttons: wiring',
    lines: [
      { say: 'Place the green button across the gap, in columns 11 and 13.', adds: ['btnG'] },
      { say: 'Connect column 11, top half, to pin D2.', adds: ['wD2'] },
      { say: 'Connect column 13, bottom half, the diagonal leg, to the minus rail.', adds: ['wGG'] },
      { say: 'Do the same with the red button in columns 17 and 19: column 17, top half, to pin D3, and column 19, bottom half, to the minus rail.', adds: ['btnR', 'wD3', 'wGR'] },
      'Press the caps on: green for yes, red for no.',
    ],
    ui: { g: 'YES: col 11 → D2, col 13 → − rail', r: 'NO: col 17 → D3, col 19 → − rail' },
  },
  {
    id: 'step4d', part: BUILD, step: 'Step 4 of 8', title: 'Buttons: test',
    lines: [
      { say: 'Test. Plug in, type raw, and hold green: yes equals pressed.', usb: 'in' },
      'Pressing also shows a tick or a cross on the face, and the Serial Monitor prints: button, yes.',
      'Always pressed? You used two legs that are always connected. Move a wire to the diagonal leg.',
      { say: 'Unplug.', usb: 'out' },
    ],
    ui: { fix: 'Always "pressed" → move a wire to the diagonal leg.' },
  },

  // Step 5
  {
    id: 'step5a', part: BUILD, step: 'Step 5 of 8', title: 'Voice module: two sets of pins',
    lines: [
      'Step five: Robin’s voice. This step has the most parts, so we go slowly: speaker, sound files, cable, capacitor, and test.',
      'The voice module has two sets of pins. The small white plug carries plus, minus, T and R: power and talking.',
      'A row of pins or holes carries the speaker outputs, SP+ and SP−, and a few others we do not use.',
      'Read the labels printed on your module. We go by those names, never by position.',
    ],
    ui: {
      plug: 'white Gravity plug: T · R · − · +', header: 'header: … SP+ · SP− …', usb: 'micro-USB (sound files)',
      parts: 'A speaker · B sound files · C cable · D capacitor · E test', yours: 'go by the labels on YOUR module',
    },
  },
  {
    id: 'step5b', part: BUILD, step: 'Step 5 of 8', title: 'Speaker: use one of the two',
    lines: [
      'Part A: the speaker. The set has two speakers, and their four wires end in one white plug. We use one speaker. The other is a spare.',
      'Safety glasses on. Cut the wires right behind the plug.',
      'Follow each wire back to its speaker, so you know which two wires belong to the speaker you will use. Never connect both speakers to the module. Together they would be too heavy for its amplifier.',
      'Wrap each bare end of the spare speaker separately in tape, so they cannot touch anything.',
      'Strip five millimetres from your speaker’s two wires, and twist the strands.',
    ],
    ui: {
      cut: '1 · cut behind the plug', follow: '2 · find the pair of ONE speaker', tape: '3 · tape the spare’s ends, each separately', strip: '4 · strip 5 mm, twist',
      glasses: 'Safety glasses on', never: 'Never both speakers on the module',
    },
  },
  {
    id: 'step5c', part: BUILD, step: 'Step 5 of 8', title: 'Speaker: two solder joints',
    lines: [
      'Now look at SP+ and SP− on your module.',
      'Are they pins? Then solder each speaker wire to one half of a cut female to female jumper, cover the joint with tape or heat-shrink, and push the halves onto the pins.',
      'Are they holes? Then solder the wires straight into them, without a blob that reaches the hole next to it.',
      { say: 'Red goes to SP+. For a single speaker, either way round works if your wires have no colours.', adds: ['voice', 'spk', 'wSPp', 'wSPm'] },
      'Solder at Pulsed, with the iron in its stand, in a ventilated spot, and wash your hands afterwards. Never touch the tip. Never soldered before? Ask at Pulsed. It takes five minutes to learn.',
    ],
    ui: {
      pinsT: 'SP+ / SP− are pins', pinsX: 'solder to F-F jumper halves, insulate, push on',
      holesT: 'SP+ / SP− are holes', holesX: 'solder straight in, no blob to the next hole',
      red: 'red → SP+',
      safeT: 'Hot tip: never touch it', safeX: 'Iron in its stand · ventilated spot · wash your hands · ask at Pulsed',
    },
  },
  {
    id: 'step5d', part: BUILD, step: 'Step 5 of 8', title: 'Sound files onto the module',
    lines: [
      'Part B: Robin’s voice files. The module has its own eight megabytes of memory.',
      { say: 'First, pull the white plug out of the module, so the module is connected to nothing else. Otherwise the laptop and the Arduino would both feed it five volts.', usb: 'micro' },
      'Connect the module to your laptop with the micro-USB data cable. It shows up as a small USB drive.',
      'Delete any demo files on it. Copy the thirteen files, 01.mp3 to 13.mp3, from the folder audio/en into the root of the drive. Not inside a folder.',
      { say: 'Use audio/nl for Dutch. Eject the drive safely, and unplug the micro-USB cable.', usb: 'out' },
    ],
    ui: {
      unplug: 'Gravity plug OUT first: never two 5 V sources at once',
      drive: '💽  USB drive (DFR0534)  ›  root', demo: 'demo files from the factory…',
      nl: '🇳🇱 Dutch? use audio/nl', eject: '⏏️ Eject safely, then unplug',
    },
  },
  {
    id: 'step5e', part: BUILD, step: 'Step 5 of 8', title: 'Voice wiring: the Gravity cable',
    lines: [
      { say: 'Part C: wiring, with the Arduino’s USB still unplugged. Plug the cable into the module’s white plug. It only fits one way.', adds: ['grav'] },
      'Push one male to male wire fully into each of the four female sockets, so no metal shows.',
      'Follow each wire back to the plug, and read the letter printed next to its pin: plus, minus, T, R. Put a small tape flag with that letter on each wire. Do not trust the wire colours.',
      { say: 'Plus goes to the plus rail. Minus goes to the minus rail.', adds: ['wVp', 'wVm'] },
      { say: 'T goes to pin D0.', adds: ['wT'] },
      { say: 'R goes to column 22, in the top half. A one kilo-ohm resistor bridges column 22 to column 26. With four bands it reads brown, black, red. With five bands, brown, black, black, brown.', adds: ['wR', 'r1k'] },
      { say: 'And a wire from column 26 goes to pin D1.', adds: ['wD1'] },
      'Lay the module flat, away from the Arduino, and tape it down, so its pins cannot touch anything.',
    ],
    ui: {
      flags: 'tape flags: + · − · T · R (go by the letters, not the colours)',
      plus: 'socket + → + rail', minus: 'socket − → − rail', t: 'socket T → D0 (RX)', r: 'socket R → col 22 (top half)', d1: 'col 26 → D1 (TX)',
      band: '1 kΩ: brown · black · red  (5 bands: brown · black · black · brown)',
      flat: 'module flat, taped down, away from the Arduino',
    },
  },
  {
    id: 'step5f', part: BUILD, step: 'Step 5 of 8', title: 'Why do T and R cross?',
    lines: [
      'Why does T go to D0, and D1 to R? T means: I talk. R means: I listen.',
      'One device’s mouth goes to the other device’s ear, so the wires cross. D0 is the Arduino’s ear. D1 is its mouth.',
      'The one kilo-ohm resistor limits the current from the Arduino’s five volt signal into the module’s ear.',
    ],
    ui: { ard: 'Arduino', mod: 'Voice module', aMouth: 'D1 = TX', aEar: 'D0 = RX', mMouth: 'T', mEar: 'R', cross: 'mouth → ear, both ways', res: '1 kΩ limits the current into the module’s ear' },
  },
  {
    id: 'step5g', part: BUILD, step: 'Step 5 of 8', title: 'The capacitor: mind the stripe!',
    lines: [
      'Part D: the capacitor. When Robin speaks loudly, the speaker suddenly gulps current, and the five volts dip for a moment. You hear pops, or the Arduino even restarts.',
      'The 680 microfarad capacitor is a small water tank, right next to the module. It covers those gulps.',
      'But it has a plus and a minus. The minus leg is under the light stripe with the minus signs, and it is the shorter leg.',
      { say: 'Put the long plus leg in the plus rail, and the striped minus leg in the minus rail, next to the module’s power wires. The legs are five millimetres apart, so put them a column or two apart.', adds: ['cap'] },
      'Backwards is bad: a reversed capacitor gets warm, bulges, or pops open. If one ever gets warm, unplug, do not touch it, and fit the spare the right way round.',
    ],
    ui: {
      tank: 'a small water tank for current gulps',
      stripe: 'stripe (− − −) = minus leg, the SHORTER one', long: 'longer leg = plus',
      place: 'long + leg → + rail · striped − leg → − rail',
      warnT: 'Backwards = warm, bulging, popping', warnX: 'Warm? Unplug, don’t touch, fit the spare the right way round.',
    },
  },
  {
    id: 'step5h', part: BUILD, step: 'Step 5 of 8', title: 'Voice: check, then test',
    lines: [
      'Before you plug in, check: the capacitor stripe is in the minus rail. The module’s plus is in the plus rail, and its minus in the minus rail.',
      'T goes to D0. R goes through one kilo-ohm to D1. The spare speaker’s ends are taped, and no bare metal touches anything.',
      { say: 'Now plug in. After about two seconds, you hear:', usb: 'in' },
      { robin: 1 },
      'That is track one. Robin plays it on every start, as a sound check.',
      'Now type: say 3.',
      { robin: 3 },
      'Type vol 15 to make it quieter. Stay at 22 or lower, so the small speaker does not distort.',
      'No sound? Check that T and R cross, that the files are in the root, and try vol 20. Pops or restarts when it is loud? Check the capacitor, and lower the volume.',
      { say: 'Unplug.', usb: 'out' },
    ],
    ui: {
      c1: 'capacitor stripe in the − rail', c2: 'module + → + rail, − → − rail', c3: 'T → D0 · R → 1 kΩ → D1', c4: 'spare speaker ends taped · no bare metal touching',
      checkT: 'Check before you plug in', fix: 'No sound → T/R crossed? files in root? vol 20.  Pops / restarts → capacitor, lower volume.',
    },
  },

  // Step 6
  {
    id: 'step6', part: BUILD, step: 'Step 6 of 8', title: 'Faces',
    lines: [
      'Step six: faces. No wiring needed. The LED grid is already on the board.',
      { say: 'Plug in and type: face ask, face concern, face sleep, and face happy.', usb: 'in' },
      'The happy face blinks every few seconds, just like Tessa’s eyes. These faces come straight from the firmware file face.h.',
      { say: 'Unplug.', usb: 'out' },
    ],
    ui: { src: 'drawn from firmware/robin/face.h' },
  },

  // Step 7
  {
    id: 'step7', part: BUILD, step: 'Step 7 of 8', title: 'Go online',
    lines: [
      'Step seven: go online. Only now do we add the network.',
      'Use your phone’s hotspot on 2.4 gigahertz. Eduroam will not work. Connect the laptop to the same hotspot, and find its IP address.',
      { say: 'Fill in arduino_secrets.h with the hotspot name, the password, and the laptop’s IP. Start Mosquitto on the laptop, and upload again. File 05, part C, has the details.', usb: 'in' },
      'Test: the face changes from crossed eyes to a happy face, and mosquitto_sub shows Robin’s messages.',
      { say: 'Unplug before step eight.', usb: 'out' },
    ],
    ui: { hot: 'phone hotspot · 2.4 GHz · not eduroam', sec: 'arduino_secrets.h: SSID · password · laptop IP', broker: 'Mosquitto on the laptop (docs/05, part C)' },
  },

  // Step 8
  {
    id: 'step8a', part: BUILD, step: 'Step 8 of 8', title: 'The body: drill first',
    lines: [
      'Step eight: the body. It is optional, but it turns a pile of wires into a robot.',
      'Drill first, build in after. Make every hole while the box is empty. Take everything out.',
      'Clamp the box down, never hold it in your hand, wear safety glasses, and use a step drill at Pulsed. Clean the edges afterwards.',
      'The lid gets a hole of 23 to 24 millimetres for the PIR dome. One side gets six to eight small holes of 4 millimetres, for the speaker.',
      'The top gets one 10 millimetre hole for the button and LDR wires, and the back a notch for the USB cable.',
    ],
    ui: {
      empty: 'Box EMPTY while drilling', clamp: 'clamped · safety glasses · step drill · at Pulsed',
      pir: 'Ø 23–24 mm for the PIR dome', spk: '6–8 holes, Ø 4 mm (speaker)', top: 'Ø 10 mm (wires)', usb: 'notch for the USB cable',
      box: 'Kradex 176 × 126 × 57 mm, standing, clear lid = face',
    },
  },
  {
    id: 'step8b', part: BUILD, step: 'Step 8 of 8', title: 'The body: build it in',
    lines: [
      'Now build in. The Arduino goes inside, with the LED grid right behind the clear lid. That is Robin’s face.',
      'Glue the speaker behind its holes, with a few dots of hot glue on its rim. Never on the paper cone.',
      'Tape the voice module down, so its pins cannot touch the Arduino. Stick the breadboard on top, with its sticky back.',
      'For the Tessa touch: wrap a strip of felt around the grey sides, but never over the face, the PIR, the speaker holes, or the USB notch.',
      'At home, power Robin from an undamaged, CE-marked phone charger, lay the cable where nobody trips over it, and do not cover the box.',
    ],
    ui: {
      glue: 'hot glue on the speaker RIM, never the cone', tape: 'voice module taped down, away from the Arduino',
      felt: 'felt: sides only (not face, PIR, speaker holes, USB notch)', home: 'At home: CE-marked charger · cable out of the way · box uncovered',
    },
  },

  // =============================================================================================
  {
    id: 'recap', part: WRAP, title: 'Recap: the whole circuit',
    lines: [
      "Let's recap the whole circuit.",
      'Power: 5V to the plus rail, GND to the minus rail.',
      'Light: the LDR and the ten kilo-ohm resistor share column 5, which goes to A0. Motion: PIR OUT goes to A1.',
      'Answers: green to D2, red to D3, and both to the minus rail through their diagonal legs.',
      'Voice: through its cable, plus and minus to the rails, T to D0, and D1 through one kilo-ohm to R. The capacitor sits across the rails, stripe to minus.',
      'Twelve male to male wires, three male to female, two resistors, one capacitor, and a test after every step.',
    ],
    ui: { power: '⚡ power', sense: '💡 light + 👁️ motion', buttons: '🟢 yes · 🔴 no', voice: '🗣️ voice + capacitor', all: '✅ all together' },
  },
  {
    id: 'troubleshoot', part: WRAP, title: "If something doesn't work",
    lines: [
      "If something doesn't work, don't panic. The most common problems and their fixes are in the troubleshooting table of file 04.",
      'Most problems are one wire in the wrong hole. Unplug, compare with the map, and test again.',
    ],
    ui: {
      tip: 'Most problems = one wire in the wrong hole. Unplug → compare with the map → test again.',
    },
  },
  {
    id: 'next', part: WRAP, title: 'Your next steps',
    lines: [
      'That is it. Robin is built.',
      'Next: run the simulator from file 05, connect Robin to the laptop, and start collecting your own data, as in file 06.',
      'And whenever you are unsure about a wire: unplug first, then ask. Happy building!',
    ],
    ui: { n1: 'Simulator run (docs/05, part B)', n2: 'Connect Robin (docs/05, part C)', n3: 'Collect your own data (docs/06)', rule: 'Unsure about a wire? Unplug first, then ask.' },
  },
];

// The troubleshooting table (on screen) = the table in docs/04.
export const TROUBLE_ROWS: [string, string, string][] = [
  ['Nothing in Serial Monitor', 'wrong baud / port', '115200 baud, correct COM port; press reset'],
  ['light_raw always ~0 or ~1023', 'LDR/resistor not in the same column, or A0 wire in the wrong column', 're-check the divider'],
  ['pir_raw random HIGH/LOW', 'warm-up, or it sees you', 'wait 60 s; point it away; lower sensitivity'],
  ['PIR stays HIGH ~minutes', 'time-delay knob not at minimum', 'turn Tx fully counter-clockwise'],
  ['Button always "pressed"', 'used two always-connected legs', 'use diagonal legs'],
  ['No sound', 'T/R swapped or not crossed, missing files, volume 0', 'check T → D0 and D1 → 1 kΩ → R; vol 20; files in the root'],
  ['Plays the wrong sentence', 'old demo files still on the module', 'pull the Gravity plug out, then delete everything and copy again'],
  ['Pops, buzzing, or the board resets when it talks loudly', "the speaker's current gulps make the 5 V dip", 'check the capacitor (stripe in the − rail, next to the module); vol 15; use a better USB port/charger'],
  ['Laptop says "USB device needs more power" or the port switches off when you plug in', 'the capacitor charging, or a short', 'unplug; check for a short (+ rail touching − rail); try another port or a powered hub'],
  ['Capacitor warm or bulging', 'put in backwards', 'unplug now, don’t touch it; fit the spare with the stripe in the − rail'],
  ['✗ eyes forever', 'WiFi/MQTT problem', 'see 05, part C troubleshooting'],
];
