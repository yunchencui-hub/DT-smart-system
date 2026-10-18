// THE script of the anatomy + ELI5 build video (composition "RobinAnatomyBuild"): every spoken line, what the
// isometric figure shows while it is spoken, and every on-screen text. It follows docs/04_assembly.md step by step.
// scripts/voice.ts and scripts/review.ts read it with --script anatomy (same cable rules R1-R5 as the drawn guide).
//
// ELI5 rules used for every line (from the "learn" skill, adapted to a video that cannot ask back):
//   - explain directly, in short concrete sentences, with one analogy per idea (Robin as a body);
//   - one idea per picture: only the part being added lights up;
//   - before a test, a "Predict" pause asks what will happen, and the test shows the answer;
//   - say plainly when a step trips most people up.
import type { PauseLine, RobinLine, SayLine, SceneDef } from '../script/types';

export type AView = 'full' | 'desk' | 'power' | 'ldr' | 'pir' | 'pirBack' | 'buttons' | 'voice' | 'voiceWires' | 'cap' | 'matrix' | 'uno';
export type AFig = 'bench' | 'xray' | 'pirFront' | 'render';
type Extra = {
  view?: AView; // camera on the bench from this line on
  glow?: string[]; // light on a rail, a column, a pin (see Bench.tsx glowSvg)
  face?: string; // LED matrix face from this line on (when powered)
  serial?: string[]; // Serial Monitor lines that appear during this line
  fig?: AFig; // which figure from this line on
  render?: string; // for fig 'render': one of the part renders in video-assets/parts/
  lift?: number; // xray: how far the breadboard's plastic is lifted (0..1); pirFront: how far the dome is off
  group?: string; // kit scene: which body part is highlighted
};
export type ALine = string | (SayLine & Extra) | (RobinLine & Extra) | (PauseLine & Extra);
export type AScene = Omit<SceneDef, 'lines'> & {
  lines: ALine[];
  kind: 'title' | 'kit' | 'figure' | 'files' | 'end';
  fig?: { n: number; title: string; hint?: string; readout?: string };
  need?: string[]; // part renders shown in the side panel (video-assets/parts/<name>.png)
  eli5?: string; // the one-line analogy in the side panel
  notes?: { from: number; icon: string; text: string }[]; // side-panel cards that appear from line `from` (0-based) on
  faceCard?: boolean; // side panel shows the LED face large (the front header hides its bottom rows in the 3D view)
  start?: Extra; // the figure's state at the start of the scene
};

const GET = '1 · Get ready';
const BUILD = '2 · Build';
const WRAP = '3 · Wrap-up';
const RAW = (pir: number, light: number, yes = '-', no = '-') => `pir_raw=${pir} (HIGH if > 400)  light_raw=${light}  yes=${yes}  no=${no}`;

export const SCENES: AScene[] = [
  // =============================================================================================
  {
    id: 'a-title', part: 'Welcome', title: 'Build Robin: the anatomy, step by step', kind: 'title',
    lines: [
      'This is Robin, a small care robot. In this video we build it, one step at a time.',
      'Every picture is a drawing of the parts you received, and every part sits exactly where it goes on your bench.',
      'We follow the assembly guide, file 04, and for each step you hear what to do and why it works, in plain words.',
    ],
    ui: { title: 'Build Robin', sub: 'The anatomy of the build, step by step · follows docs/04', badge: 'DRAWING · not real footage' },
  },

  // =============================================================================================
  {
    id: 'a-kit', part: GET, title: 'What came in the box', kind: 'kit',
    lines: [
      { say: 'First, check what you received. Tick off every part, and if something is missing, tell the store room before you start.', group: 'all' },
      { say: 'Think of Robin as a body. The Arduino is the brain. It reads the sensors, and its grid of little lights is Robin\'s face.', group: 'brain' },
      { say: 'The motion sensor and the light sensor are its eyes. The two buttons are its ears: green means yes, red means no.', group: 'senses' },
      { say: 'The voice module and the speaker are its mouth. The breadboard and the jumper wires are its nerves: they connect everything.', group: 'mouth' },
      { say: 'The capacitor is a small water tank for electricity. And the box with the clear lid is Robin\'s skin.', group: 'tank' },
      { say: 'Some parts come with a spare: two light sensors, two capacitors, two speakers, three buttons. Keep the spares in the bag.', group: 'spares' },
    ],
    ui: { brain: 'brain + face', senses: 'eyes + ears', mouth: 'mouth + nerves', tank: 'water tank + skin', note: 'Renders of the parts we received (video-assets/parts/)' },
  },
  {
    id: 'a-rules', part: GET, title: 'Three rules before you build', kind: 'figure',
    fig: { n: 1, title: 'The bench', readout: 'nothing wired yet' },
    eli5: 'Wire unplugged. Test plugged in. Unplug again.',
    start: { view: 'desk', fig: 'bench' },
    notes: [
      { from: 1, icon: '🔌', text: 'Wire only with the USB cable unplugged' },
      { from: 2, icon: '📦', text: 'Cardboard or wood, never metal' },
      { from: 3, icon: '🏷️', text: 'Read the label, not the picture' },
      { from: 4, icon: '⚠️', text: 'Module power, capacitor, rails: check + and − twice' },
      { from: 5, icon: '✅', text: 'Test after every step' },
    ],
    lines: [
      'Before step one, upload the firmware in offline test mode, as in file 05. Then no WiFi is needed yet.',
      { say: 'Rule one, the golden rule: wire only while the USB cable is unplugged. Plug in only to test, and unplug again after every test.', usb: 'out', glow: [] },
      'Rule two: work on cardboard or wood, never on metal or on your laptop. The pins under the boards are bare, and metal would connect them.',
      'Rule three: read the label, not the picture. Pin order can differ between versions of a module, so always go by the names printed on your own part.',
      'Three things have a plus and a minus, and do damage when they are reversed: the module\'s power pins, the capacitor, and the breadboard rails. Check them twice.',
      'After every step there is a test. Don\'t continue until it passes. One new mistake is easy to find. Six at once is misery.',
    ],
  },
  {
    id: 'a-breadboard', part: GET, title: 'Inside the breadboard', kind: 'figure',
    fig: { n: 2, title: 'Breadboard, x-ray', hint: 'the plastic lifted off', readout: '30 columns · 4 rails' },
    eli5: 'Holes in the same metal clip are connected. Different clips are not.',
    start: { fig: 'xray', lift: 0 },
    lines: [
      'Now the breadboard. It looks like a field of holes, but inside it is simple.',
      { say: 'Lift off the plastic, and you see metal clips. Each clip connects a few holes into one group.', lift: 1 },
      { say: 'Each short column of five holes is one group. Two legs in the same group are connected.', glow: ['col:5:bottom'] },
      { say: 'The middle gap splits every column into a top half and a bottom half, and the two halves are not connected.', glow: ['col:5:bottom', 'col:5:top'] },
      { say: 'Along the long sides run the rails. Every hole along the red line is connected: that is the plus rail, 5 volts. Every hole along the blue line is the minus rail, ground.', glow: ['rail:+b', 'rail:-b'] },
      { say: 'The two pairs of rails are not connected to each other. We only use the pair next to the Arduino\'s power pins.', glow: ['rail:+b', 'rail:-b'] },
      { say: 'Some boards put the red line on the outside, others on the inside. Always follow the red and blue lines printed on your own board.', lift: 0, glow: [] },
      'If a line has a break in the middle, that rail is split in two. Join the halves with a short wire: plus to plus, minus to minus, never red to blue.',
    ],
  },

  // =============================================================================================
  {
    id: 'a-step1', part: BUILD, step: 'Step 1', title: 'Power rails', kind: 'figure',
    fig: { n: 3, title: 'Step 1 · Power' },
    need: ['dupont_mm_200mm'],
    eli5: 'The rails are a power strip: every part can plug in there.',
    start: { fig: 'bench', view: 'power' },
    lines: [
      'Step one: power. The brain shares its power with the breadboard.',
      { say: 'With the USB cable unplugged, connect the Arduino\'s 5V pin to the plus rail, the red line.', usb: 'out', adds: ['w5v'], glow: ['pin:5V', 'rail:+b'] },
      { say: 'Then connect GND to the minus rail, the blue line.', adds: ['wgnd'], glow: ['pin:GND', 'rail:-b'] },
      { say: 'Now the whole red line carries 5 volts, and the whole blue line is ground. Every part can take its power there, like plugging into a power strip.', glow: ['rail:+b', 'rail:-b'] },
      { say: 'Test: plug in the USB cable. The power LED comes on. The face shows crossed eyes for a moment while it starts, then a happy face.', usb: 'in', view: 'uno', glow: [] },
      { say: 'Unplug.', usb: 'out', view: 'power' },
    ],
  },
  {
    id: 'a-step2', part: BUILD, step: 'Step 2', title: 'Light sensor (LDR)', kind: 'figure',
    fig: { n: 4, title: 'Step 2 · Light' },
    need: ['ldr_gl5528', 'resistor_10k_quarter_watt', 'dupont_mm_200mm'],
    eli5: 'Two resistors share 5 volts. The bigger one takes the bigger share.',
    start: { view: 'ldr' },
    lines: [
      'Step two: the light sensor, Robin\'s eye for light.',
      'The Arduino can\'t measure resistance. It can only measure voltage. So we build a voltage divider.',
      { say: 'Push one leg of the LDR into the plus rail, and the other leg into column 5, in the bottom half.', speak: 'Push one leg of the LDR into the plus rail, and the other leg into column five, in the bottom half.', adds: ['ldr'], glow: ['rail:+b', 'col:5:bottom'] },
      { say: 'Which resistor is 10 kΩ? Read the label on its bag. Keep the 1 kΩ bag closed for now.', speak: 'Which resistor is ten kilo-ohm? Read the label on its bag. Keep the one kilo-ohm bag closed for now.', glow: [] },
      { say: 'Put the 10 kΩ resistor from column 5 to the minus rail. The LDR and the resistor have no plus or minus, so either way round is fine.', speak: 'Put the ten kilo-ohm resistor from column five to the minus rail. The LDR and the resistor have no plus or minus, so either way round is fine.', adds: ['r10k'], glow: ['col:5:bottom', 'rail:-b'] },
      { say: 'Then a wire from column 5 to the Arduino\'s A0 pin.', speak: 'Then a wire from column five to the Arduino\'s A0 pin.', adds: ['wA0'], glow: ['col:5:bottom', 'pin:A0'] },
      { say: 'Why this works: the LDR and the resistor share the 5 volts, and the bigger one takes the bigger share. In the dark the LDR is huge, so A0 sees almost nothing. In light the LDR shrinks, and A0 rises.', glow: ['col:5:bottom'] },
      { say: 'Predict: when you cover the LDR with your finger, does light_raw go up, or down?', glow: [] },
      { pause: 2.5, cap: 'Predict: cover the LDR → light_raw goes up or down?' },
      { say: 'Test: plug in, open the Serial Monitor at 115200 baud, type raw and press Enter.', usb: 'in', serial: ['> raw', '[cmd] raw', RAW(4, 431), RAW(3, 428)] },
      { say: 'Cover the LDR: light_raw drops a lot. Shine your phone torch on it: it rises. So the answer was: down.', serial: [RAW(5, 38), RAW(4, 31), RAW(3, 874), RAW(4, 902)] },
      { say: 'Unplug.', usb: 'out' },
    ],
  },
  {
    id: 'a-step3', part: BUILD, step: 'Step 3', title: 'PIR motion sensor', kind: 'figure',
    fig: { n: 5, title: 'Step 3 · Motion' },
    need: ['hc_sr501_pir', 'dupont_mf_200mm'],
    eli5: 'It notices warm bodies that move, and says "yes" with 3.3 volts.',
    start: { fig: 'pirFront', lift: 0 },
    lines: [
      'Step three: the motion sensor, Robin\'s eye for movement. It notices warm bodies that move.',
      { say: 'Gently pull off the white dome to read the pin labels: VCC, OUT and GND. Then put the dome back.', lift: 1 },
      { say: 'On your board the order may be different. Go by the labels you read there, not by this drawing.', lift: 1 },
      { say: 'On the back are two knobs. Turn the time knob, Tx, fully counter-clockwise: the shortest time, about 3 seconds.', speak: 'On the back are two knobs. Turn the time knob, T x, fully counter-clockwise: the shortest time, about three seconds.', fig: 'bench', view: 'pirBack', adds: ['pir'] },
      { say: 'Set the sensitivity knob, Sx, to the middle. If there is a jumper, put it on H, so the output stays high while you keep moving.', speak: 'Set the sensitivity knob, S x, to the middle. If there is a jumper, put it on H, so the output stays high while you keep moving.' },
      { say: 'Knobs not labelled? Turn both fully counter-clockwise, then turn one back to the middle. If pir_raw stays high for minutes in the test, unplug and swap them.', speak: 'Knobs not labelled? Turn both fully counter-clockwise, then turn one back to the middle. If P I R raw stays high for minutes in the test, unplug and swap them.' },
      { say: 'Now three male to female wires: the female end goes onto the PIR pin, the male end into the breadboard or the Arduino.', view: 'pir' },
      { say: 'VCC to the plus rail.', adds: ['wPV'], glow: ['rail:+b'] },
      { say: 'GND to the minus rail.', adds: ['wPG'], glow: ['rail:-b'] },
      { say: 'And OUT to A1.', adds: ['wPO'], glow: ['pin:A1'] },
      { say: 'Why A1, an analog pin? The PIR says yes with 3.3 volts. On a digital pin the Arduino only reliably hears a yes above about 3.5 volts, so 3.3 volts is a whisper it might miss.', glow: ['pin:A1'] },
      { say: 'On an analog pin, 3.3 volts reads as about 675 out of 1023, far above our threshold of 400.', speak: 'On an analog pin, three point three volts reads as about 675 out of 1023, far above our threshold of four hundred.', glow: ['pin:A1'] },
      { say: 'Test: plug in and wait 60 seconds. A PIR has to warm up, and gives random output at first.', speak: 'Test: plug in and wait sixty seconds. A P I R has to warm up, and gives random output at first.', usb: 'in', glow: [], serial: ['> raw', '[cmd] raw'] },
      { say: 'Type raw. Sit still, and pir_raw is about 0. Wave, and it is about 650 to 700.', speak: 'Type raw. Sit still, and P I R raw is about zero. Wave, and it is about six hundred and fifty to seven hundred.', serial: [RAW(3, 433), RAW(2, 430), RAW(671, 431), RAW(668, 429)] },
      { say: 'Unplug.', usb: 'out' },
    ],
  },
  {
    id: 'a-step4', part: BUILD, step: 'Step 4', title: 'Yes and no buttons', kind: 'figure',
    fig: { n: 6, title: 'Step 4 · Buttons' },
    need: ['tactile_switch_with_green_cap', 'tactile_switch_with_red_cap', 'dupont_mm_200mm'],
    eli5: 'Pressed connects the pin to ground: pressed reads LOW.',
    start: { view: 'buttons' },
    lines: [
      'Step four: the yes and no buttons, Robin\'s ears.',
      'A button has four legs, but only two connections: inside, the legs are joined in two pairs. This trips most people up.',
      'The trick that always works: put the button across the middle gap, and use two diagonally opposite legs.',
      { say: 'Press the green button in across the gap: its legs land in columns 11 and 13, rows d and g. Press firmly. If a leg won\'t go in, straighten it gently with pliers.', speak: 'Press the green button in across the gap: its legs land in columns eleven and thirteen, rows d and g. Press firmly. If a leg won\'t go in, straighten it gently with pliers.', adds: ['btnG'] },
      { say: 'A wire from column 11, top half, to the Arduino\'s D2 pin.', speak: 'A wire from column eleven, top half, to the Arduino\'s D2 pin.', adds: ['wD2'], glow: ['col:11:top', 'pin:D2'] },
      { say: 'From the diagonally opposite leg, column 13 in the bottom half, a wire to the minus rail.', speak: 'From the diagonally opposite leg, column thirteen in the bottom half, a wire to the minus rail.', adds: ['wGG'], glow: ['col:13:bottom', 'rail:-b'] },
      { say: 'The red button goes in columns 17 and 19: column 17, top half, to D3. Column 19, bottom half, to the minus rail.', speak: 'The red button goes in columns seventeen and nineteen: column seventeen, top half, to D3. Column nineteen, bottom half, to the minus rail.', adds: ['btnR', 'wD3', 'wGR'], glow: ['pin:D3'] },
      { say: 'A button never goes to the plus rail: only to the minus rail and a D pin. Then put the caps on.', glow: ['rail:-b'] },
      { say: 'Why: inside the Arduino, a pull-up resistor keeps the pin at 5 volts, a HIGH, while nobody presses. Pressing connects the pin to ground, so it reads LOW. It looks backwards, but it saves a resistor.', glow: ['pin:D2,D3'] },
      { say: 'Predict: while you hold the green button, does D2 read HIGH, or LOW?', glow: [] },
      { pause: 2.5, cap: 'Predict: green held → D2 reads HIGH or LOW?' },
      { say: 'Test: plug in and type raw. While you hold green, it shows yes equals pressed: the pin reads LOW.', usb: 'in', serial: ['> raw', '[cmd] raw', RAW(2, 430), RAW(3, 431, 'pressed')] },
      { say: 'Pressing also shows a tick or a cross on the face, and the Serial Monitor prints button yes, or button no.', face: 'yes', serial: ['[button] yes', '[button] no'] },
      { say: 'Unplug.', usb: 'out', face: 'happy' },
    ],
  },
  {
    id: 'a-step5a', part: BUILD, step: 'Step 5a', title: 'The speaker (the only soldering)', kind: 'figure',
    fig: { n: 7, title: 'Step 5a · Speaker' },
    need: ['dfrobot_dfr0534', 'speaker_set_with_cable'],
    eli5: 'The voice module is the mouth; the speaker is its lips.',
    start: { fig: 'render', render: 'speaker_set_with_cable' },
    lines: [
      'Step five is the voice, in four parts: the speaker, the sound files, the wiring, and the capacitor.',
      'Part a, the speaker. This is the only soldering in the project: two joints.',
      'Safety glasses on. Solder at Pulsed with the iron in its stand, in a ventilated spot. Hold the wire with tape, not your fingers. Never touch the tip, and if the iron falls, let it fall.',
      'The speaker set has two speakers, and their four wires end in one white plug. Cut the wires right behind the plug.',
      'Careful: that four-pin plug also fits the voice module\'s Gravity socket. Never plug it in there. Cut it off.',
      'Follow the wires back to find the two that belong to the speaker you will use. Never connect both speakers. Tape each bare end of the spare separately.',
      { say: 'Here is the voice module, the DFR0534, lying flat on the table.', fig: 'bench', view: 'voice', adds: ['voice'] },
      { say: 'Strip 5 millimetres of your speaker\'s two wires and twist the strands.', speak: 'Strip five millimetres of your speaker\'s two wires and twist the strands.', adds: ['spk'] },
      { say: 'Solder them into the SP+ and SP− holes, at the end of the row that starts with ONE. Red goes to SP+.', adds: ['wSPp', 'wSPm'], glow: ['vhole:SP+,SP−'] },
      { say: 'No solder may reach the next hole, DACL, or join SP+ to SP−. Never solder the speaker to VCC, GND, RX, TX, BUSY or a DAC hole.', speak: 'No solder may reach the next hole, D A C L, or join S P plus to S P minus. Never solder the speaker to V C C, G N D, R X, T X, busy, or a D A C hole.', glow: ['vhole:SP+,SP−'] },
      { say: 'If your module has pins there instead of holes, use a cut female to female jumper, as file 04 shows.', glow: [] },
      'Tape both wires down about 2 centimetres from the joints. Then switch the iron off, and wash your hands.',
    ],
  },
  {
    id: 'a-step5b', part: BUILD, step: 'Step 5b', title: 'Robin\'s voice files', kind: 'files',
    lines: [
      'Part b: Robin\'s voice. The module stores its sentences in its own memory.',
      { say: 'Keep the Gravity cable out of the module for now. Otherwise the laptop\'s USB and the Arduino\'s 5 volts would be connected together.', usb: 'out' },
      { say: 'Connect the module to the laptop with the micro-USB data cable. It shows up as a small USB drive.', usb: 'micro' },
      { say: 'Delete any demo files on it. Copy 01.mp3 to 13.mp3 from audio/en into the root of the drive.' },
      { say: 'Eject the drive safely, and unplug the micro-USB cable.', usb: 'out' },
    ],
    ui: { drive: 'DFR0534 (USB drive)', files: '01.mp3 … 13.mp3 in the root', warn: 'Gravity cable OUT while the micro-USB is in' },
  },
  {
    id: 'a-step5c', part: BUILD, step: 'Step 5c', title: 'Voice module wiring', kind: 'figure',
    fig: { n: 8, title: 'Step 5c · Voice wiring' },
    need: ['dfrobot_gravity_cable', 'dupont_mm_200mm', 'resistor_1k_quarter_watt'],
    eli5: 'One device\'s mouth goes to the other\'s ear, so T and R cross.',
    start: { fig: 'bench', view: 'voice' },
    lines: [
      'Part c: wire the voice module, with the USB cable unplugged.',
      { say: 'Push the Gravity cable\'s white plug into the module\'s white socket. It fits one way only.', adds: ['grav'] },
      'Push a male to male wire fully into each of the cable\'s four female sockets, so no bare metal shows.',
      'Follow each wire back to the module, and read the label next to its pin: plus, minus, T and R. Put a small tape flag with that letter on each wire. Don\'t trust the wire colours.',
      'Extra check, recommended: with a multimeter set to beep, the wire flagged plus must beep steadily with the VCC hole, and the wire flagged minus with GND.',
      { say: 'Plus goes to the plus rail, minus goes to the minus rail.', view: 'voiceWires', adds: ['wVp', 'wVm'], glow: ['rail:+b', 'rail:-b'] },
      { say: 'Predict: the module\'s T means "I talk". Does it go to the Arduino\'s RX pin, or its TX pin?', glow: ['pin:D0,D1'] },
      { pause: 2.5, cap: 'Predict: module T → Arduino RX (D0) or TX (D1)?' },
      { say: 'T goes to D0, the Arduino\'s RX: its ear.', adds: ['wT'], glow: ['pin:D0'] },
      { say: 'R goes to column 22, top half. The 1 kΩ resistor goes from column 22 to column 26, and a wire from column 26 goes to D1, the Arduino\'s TX: its mouth.', speak: 'R goes to column twenty-two, top half. The one kilo-ohm resistor goes from column twenty-two to column twenty-six, and a wire from column twenty-six goes to D1, the Arduino\'s T X: its mouth.', adds: ['wR', 'r1k', 'wD1'], glow: ['col:22:top', 'col:26:top', 'pin:D1'] },
      { say: 'T means I talk, R means I listen. One device\'s mouth goes to the other\'s ear, so they cross. The 1 kΩ resistor limits the current from the Arduino\'s 5 volt signal into the module\'s input.', speak: 'T means I talk, R means I listen. One device\'s mouth goes to the other\'s ear, so they cross. The one kilo-ohm resistor limits the current from the Arduino\'s five volt signal into the module\'s input.', glow: ['pin:D0,D1'] },
      { say: 'Lay the module flat on the table, away from the Arduino, so its pins can\'t touch anything. A piece of tape holds it in place.', view: 'full', glow: [] },
    ],
  },
  {
    id: 'a-step5d', part: BUILD, step: 'Step 5d', title: 'The capacitor (polarity!)', kind: 'figure',
    fig: { n: 9, title: 'Step 5d · Capacitor' },
    need: ['aishi_680uf_25v'],
    eli5: 'A small water tank next to the mouth, for the loud words.',
    start: { view: 'cap' },
    lines: [
      'Part d: the capacitor, Robin\'s small water tank.',
      'When Robin speaks loudly, the speaker suddenly gulps current and the 5 volts dips. You hear pops, or the Arduino even restarts. The capacitor sits next to the module and covers those gulps.',
      'It has a plus and a minus. The minus leg is under the light stripe with minus signs, and it is the shorter leg.',
      { say: 'Predict: which leg goes into the minus rail?' },
      { pause: 2.5, cap: 'Predict: which leg goes into the − rail?' },
      { say: 'The striped, short leg goes into the minus rail, the blue line. The long leg goes into the plus rail, next to where the module\'s wires go in.', adds: ['cap'], glow: ['rail:-b', 'rail:+b'] },
      { say: 'Its legs are 5 millimetres apart, so put them a column or two apart, or bend them gently to fit.', speak: 'Its legs are five millimetres apart, so put them a column or two apart, or bend them gently to fit.' },
      { say: 'Backwards is dangerous for the part: a reversed capacitor gets warm, bulges, or pops open. If one ever gets warm or bulges, unplug, leave it for ten minutes without touching it, and fit the spare the right way round.', glow: [] },
      { say: 'Before you plug in, check: the stripe is in the minus rail. Module plus in the plus rail, minus in the minus rail. T to D0, and R through the 1 kΩ resistor to D1.', speak: 'Before you plug in, check: the stripe is in the minus rail. Module plus in the plus rail, minus in the minus rail. T to D0, and R through the one kilo-ohm resistor to D1.', view: 'voiceWires', glow: ['rail:-b', 'rail:+b'] },
      { say: 'The speaker wires are in SP+ and SP− and nothing else, the spare\'s ends are taped, and no bare metal touches anything.', speak: 'The speaker wires are in S P plus and S P minus and nothing else, the spare\'s ends are taped, and no bare metal touches anything.', glow: ['vhole:SP+,SP−'] },
      { say: 'Plug in, with your face away from the capacitor. After about 2 seconds, Robin says hello.', speak: 'Plug in, with your face away from the capacitor. After about two seconds, Robin says hello.', usb: 'in', view: 'full', glow: [], serial: [] },
      { robin: 1 },
      { say: 'Type say 3, and you hear the medicine question.', serial: ['> say 3', '[cmd] say 3'] },
      { robin: 3 },
      { say: 'Too loud? Type vol 15. Stay at vol 22 or lower, so the small speaker doesn\'t distort.', speak: 'Too loud? Type vol fifteen. Stay at vol twenty-two or lower, so the small speaker doesn\'t distort.', serial: ['> vol 15', '[cmd] vol 15'] },
      { say: 'Unplug.', usb: 'out' },
    ],
  },
  {
    id: 'a-step6', part: BUILD, step: 'Step 6', title: 'Faces', kind: 'figure',
    fig: { n: 10, title: 'Step 6 · Faces' },
    eli5: '96 little lights, 12 by 8: Robin\'s face.',
    faceCard: true,
    start: { view: 'matrix', face: 'happy' },
    lines: [
      { say: 'Step six: faces. Plug in.', usb: 'in', serial: [] },
      { say: 'Type face ask.', face: 'ask', serial: ['> face ask', '[cmd] face ask'] },
      { say: 'Face concern.', face: 'concern', serial: ['> face concern', '[cmd] face concern'] },
      { say: 'Face sleep.', face: 'sleep', serial: ['> face sleep', '[cmd] face sleep'] },
      { say: 'And face happy. The happy face blinks every few seconds, like Tessa\'s eyes.', face: 'happy', serial: ['> face happy', '[cmd] face happy'] },
      { say: 'Unplug.', usb: 'out' },
    ],
  },
  {
    id: 'a-step7', part: BUILD, step: 'Step 7', title: 'Go online', kind: 'figure',
    fig: { n: 11, title: 'Step 7 · Online' },
    eli5: 'Robin posts its senses to the laptop, like letters to a mailbox.',
    start: { view: 'full', face: 'happy' },
    lines: [
      'Step seven: go online. Only now, fill in arduino_secrets.h with your hotspot\'s name and password and your laptop\'s IP address, and start Mosquitto. File 05, part C, shows how.',
      { say: 'Plug in and upload the sketch again.', usb: 'in', face: 'offline' },
      { say: 'Test: the face changes from crossed eyes to a happy face, and mosquitto_sub shows Robin\'s messages.', face: 'happy', serial: ['$ mosquitto_sub -t "robin/#" -v', 'robin/robin-01/status online', 'robin/robin-01/telemetry {"boot":1,"seq":4,…', '  …,"pir":0,"edges":0,"high_ms":0,"light":431,…}'] },
      { say: 'Unplug before step eight.', usb: 'out' },
    ],
  },
  {
    id: 'a-step8', part: BUILD, step: 'Step 8', title: 'The body', kind: 'figure',
    fig: { n: 12, title: 'Step 8 · Body' },
    need: ['kradex_z74_base', 'kradex_z74_gasket', 'kradex_z74_lid', 'kradex_z74_cover_screw'],
    eli5: 'The box is Robin\'s skin. The clear lid is its face.',
    start: { fig: 'render', render: 'kradex_z74_exploded' },
    lines: [
      'Step eight: the body. The Kradex box comes apart into a grey base, a rubber seal, the clear lid, six screws and six small plugs.',
      'Drill first, build in after: make every hole while the box is still empty. Clamp the box, never hold it in your hand, wear safety glasses, and use a step drill at Pulsed.',
      { say: 'The clear lid is the face: the LED matrix sits right behind it. Drill a 23 to 24 millimetre hole in the lid for the PIR dome.', render: 'kradex_z74_lid' },
      'Six to eight small holes on the side for the speaker, a notch at the back for the USB cable, and one 10 millimetre hole in the top for the button and LDR wires. Remove the plastic burrs with a file.',
      { say: 'Glue the speaker behind its holes with a few dots of hot glue on its rim, never on the paper cone. Hot glue and the nozzle burn: keep the gun on its stand, and let the glue cool. Tape the voice module down, so its pins can\'t touch the Arduino.', render: 'kradex_z74_base' },
      'Moving everything into the box means re-plugging wires. So afterwards, do the step five check again, then the tests: raw, say 3, and the faces.',
      { say: 'Put a cable tie on the USB cable just inside the notch, so a pull on the cable doesn\'t drag the Arduino.', render: 'kradex_z74_closed' },
      'At home, power Robin from an undamaged, CE-marked phone charger. Lay the cable where nobody trips over it, and don\'t cover the box. If the box ever feels warm, unplug it.',
    ],
  },

  // =============================================================================================
  {
    id: 'a-end', part: WRAP, title: 'That\'s Robin', kind: 'end',
    lines: [
      'That\'s Robin, built step by step: power, light, motion, buttons, voice, faces, network, and body.',
      'Remember the golden rule: wire unplugged, test plugged in, then unplug again.',
      'These pictures are drawings that explain. The proof of your build is your own photos and clips, in the real build video.',
    ],
    ui: { recap: 'power · light · motion · buttons · voice · faces · online · body', rule: 'Wire unplugged → test plugged in → unplug' },
  },
];
