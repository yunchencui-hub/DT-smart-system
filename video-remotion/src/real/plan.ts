// The real-footage video's chapters and the shots planned for each (= the shot list in video-assets/README.md).
// Pure data: no React, so scripts/real-assets.ts can import it. Keep it in step with that README.

export type Planned = { kind: 'photo' | 'clip'; what: string };
export type Chapter = {
  id: string; // file-name prefix: s2-03-ldr-test.jpg belongs to chapter s2; tc01-… to chapter tc
  chip: string; // the label in the header
  title: string;
  ref: string; // where the viewer can read more
  drawing?: boolean; // made by the anatomy skill, not filmed: always labelled DRAWING
  plan: Planned[];
};

const P = (what: string): Planned => ({ kind: 'photo', what });
const V = (what: string): Planned => ({ kind: 'clip', what });

export const CHAPTERS: Chapter[] = [
  { id: 'anatomy', chip: 'Inside', title: 'Robin, inside out', ref: 'drawn with the anatomy skill', drawing: true, plan: [V('Exploded view: the parts come apart in build order')] },
  { id: 's0', chip: 'Step 0', title: 'Before you start', ref: 'docs/04, part 0', plan: [P('All parts laid out, with their bags and labels'), P('The tools and the safety glasses'), P('Breadboard close-up: the red and blue lines')] },
  { id: 's1', chip: 'Step 1', title: 'Power rails', ref: 'docs/04, step 1', plan: [P('The 5V and GND wires at the Arduino header'), P('The same wires at the rails'), V('Test: power LED on, face ✗ → 😊')] },
  { id: 's2', chip: 'Step 2', title: 'Light sensor (LDR)', ref: 'docs/04, step 2', plan: [P('The 10 kΩ bag label or colour bands'), P('LDR + 10 kΩ in one column, the wire to A0'), V('Test: `raw` while covering the LDR, then the torch')] },
  { id: 's3', chip: 'Step 3', title: 'PIR motion sensor', ref: 'docs/04, step 3', plan: [P('Dome off: the VCC / OUT / GND labels'), P('The knobs (Tx fully counter-clockwise) and the jumper on H'), P('The wires to the rails and A1'), V('Test: sit still (≈ 0), then wave (≈ 650–700)')] },
  { id: 's4', chip: 'Step 4', title: 'Yes/No buttons', ref: 'docs/04, step 4', plan: [P('Both buttons across the gap: diagonal legs, − rail, D2 / D3'), V('Test: green → ✓ on the face, red → ✗')] },
  { id: 's5a', chip: 'Step 5a', title: 'The speaker', ref: 'docs/04, step 5a', plan: [P('The speaker set, then its 4-pin plug cut off'), P('Your speaker\'s two stripped wires'), P('Close-up of the SP+ / SP− joints'), P('The spare speaker\'s taped ends'), P('The tape that holds the wires down')] },
  { id: 's5b', chip: 'Step 5b', title: 'Robin\'s voice files', ref: 'docs/04, step 5b', plan: [P('Screenshot: the module as a USB drive with 01.mp3 … 13.mp3')] },
  { id: 's5c', chip: 'Step 5c', title: 'Voice module wiring', ref: 'docs/04, step 5c', plan: [P('The Gravity plug in its socket'), P('The tape flags + − T R'), V('The multimeter beep (+ → VCC, − → GND)'), P('T → D0'), P('R → column 22 → 1 kΩ → column 26 → D1'), P('The module flat on the table, away from the Arduino')] },
  { id: 's5d', chip: 'Step 5d', title: 'The capacitor', ref: 'docs/04, step 5d', plan: [P('Close-up: the stripe and the short leg'), P('In the rails, next to the module\'s power wires'), V('Test: "Hello, I\'m Robin", then `say 3`')] },
  { id: 's6', chip: 'Step 6', title: 'Faces', ref: 'docs/04, step 6', plan: [V('`face ask`, `concern`, `sleep`, `happy` (with the blink)')] },
  { id: 's7', chip: 'Step 7', title: 'Go online', ref: 'docs/04, step 7', plan: [V('Face ✗ → 😊'), V('Screen recording: the `mosquitto_sub` messages')] },
  { id: 's8', chip: 'Step 8', title: 'The body', ref: 'docs/04, step 8', plan: [P('The empty box in the clamp'), P('The PIR hole, speaker holes and USB notch'), P('Building in: speaker glued by its rim, module taped down'), V('The tests again: `raw`, `say 3`, faces'), P('The finished Robin: front, side, top')] },
  { id: 'demo', chip: 'Tests', title: 'The whole system', ref: 'docs/08, the demo', plan: [V('Telemetry in MQTT Explorer while you wave'), V('Green button → event message + ✓'), V('The cup over Robin'), V('Torch on, walk in → Robin asks → red → the phone buzzes'), V('USB pulled → the offline alert')] },
  { id: 'tc', chip: 'Tests', title: 'Our test cases', ref: 'our test plan (docs/07)', plan: [P('For each test case: a photo of the setup and a screenshot of the result')] },
];

// s2-03-ldr-test-covered.jpg → chapter s2, number 03, what "ldr-test-covered"; tc04-01-… → chapter tc.
export const NAME = /^(anatomy|s[0-8][a-d]?|demo|tc\d{2})-(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.(jpe?g|png|mp4|mov)$/;
export const chapterOf = (prefix: string) => (/^tc\d{2}$/.test(prefix) ? 'tc' : prefix);
export const isClip = (file: string) => /\.(mp4|mov)$/.test(file);

// What the generated manifest (src/gen/real.json, written by scripts/real-assets.ts) contains.
export type Item = { file: string; chapter: string; prefix: string; nn: number; caption: string; kind: 'photo' | 'clip'; dur?: number };
export type Manifest = { final: boolean; items: Item[] };
