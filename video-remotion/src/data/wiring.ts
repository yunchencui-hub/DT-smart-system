// THE wiring of Robin, as data. One source for:
//   - the workbench drawing (src/bench/Bench.tsx),
//   - the on-screen pin map,
//   - the review document (scripts/review.ts),
//   - the automatic electrical check (scripts/netcheck.ts).
// It follows docs/04_assembly.md (the columns are the ones suggested there).
import { H, Hole, P, Pt, Row } from './geom';
import { gravityEnd, pirPin, speakerTab, voicePin } from './modules';

export type End =
  | { kind: 'hole'; c: number; r: Row }
  | { kind: 'uno'; pin: string }
  | { kind: 'pir'; pin: string }
  | { kind: 'grav'; pin: string } // the female housing at the end of the DFR0534's Gravity cable
  | { kind: 'voice'; pin: string } // a pin on the DFR0534 header (SP+ / SP−)
  | { kind: 'spk'; pin: '+' | '−' };

export type WireType = 'M-M' | 'F-M' | 'speaker wire';
export const WIRE_COLORS = {
  red: '#e53935', black: '#212121', blue: '#1e63d6', yellow: '#f2b705', green: '#2e9e4f', orange: '#f57c00',
  purple: '#8e44ad', white: '#ffffff', teal: '#00a3a3', brown: '#795548', grey: '#9e9e9e', pink: '#ec407a',
} as const;
export type WireColor = keyof typeof WIRE_COLORS;

type Base = { id: string; step: 1 | 2 | 3 | 4 | 5; desc: string };
export type WireItem = Base & { kind: 'wire'; wire: WireType; color: WireColor; from: End; to: End; via: [number, number][] };
export type Item =
  | WireItem
  | (Base & { kind: 'ldr'; legs: { a: Hole; b: Hole } })
  | (Base & { kind: 'resistor'; ohms: 10000 | 1000; legs: { a: Hole; b: Hole } })
  | (Base & { kind: 'button'; cap: 'green' | 'red'; legs: { tl: Hole; tr: Hole; bl: Hole; br: Hole } })
  | (Base & { kind: 'capacitor'; legs: { plus: Hole; minus: Hole } })
  | (Base & { kind: 'pir' })
  | (Base & { kind: 'voice' })
  | (Base & { kind: 'gravity' })
  | (Base & { kind: 'speaker' });

const hole = (c: number, r: Row): End => ({ kind: 'hole', c, r });
const uno = (pin: string): End => ({ kind: 'uno', pin });

export const endPoint = (e: End): Pt => {
  switch (e.kind) {
    case 'hole': return H(e.c, e.r);
    case 'uno': return P(e.pin);
    case 'pir': return pirPin(e.pin);
    case 'grav': return gravityEnd(e.pin);
    case 'voice': return voicePin(e.pin);
    case 'spk': return speakerTab(e.pin);
  }
};
export const endName = (e: End): string => {
  switch (e.kind) {
    case 'hole': return e.r.length === 2 ? `${e.r[0] === '+' ? '+' : '−'} rail (col ${e.c})` : `column ${e.c}, row ${e.r} (${'abcde'.includes(e.r) ? 'top' : 'bottom'} half)`;
    case 'uno': return `Arduino ${e.pin}`;
    case 'pir': return `PIR ${e.pin}`;
    case 'grav': return `Gravity cable socket "${e.pin}"`;
    case 'voice': return `DFR0534 ${e.pin}`;
    case 'spk': return `speaker ${e.pin}`;
  }
};

export const ITEMS: Item[] = [
  // ---- Step 1: power rails (the bottom rail pair: - inside, + outside, as printed on the drawn board)
  { id: 'w5v', step: 1, kind: 'wire', wire: 'M-M', color: 'red', from: uno('5V'), to: hole(2, '+b'), via: [[238, 492], [410, 508], [494, 452]], desc: 'Arduino 5V → + rail' },
  { id: 'wgnd', step: 1, kind: 'wire', wire: 'M-M', color: 'black', from: uno('GND'), to: hole(1, '-b'), via: [[252, 478], [395, 490], [478, 430]], desc: 'Arduino GND → − rail' },
  // ---- Step 2: LDR + 10k divider in column 5 (bottom half), to A0
  { id: 'ldr', step: 2, kind: 'ldr', legs: { a: { c: 3, r: '+b' }, b: { c: 5, r: 'i' } }, desc: 'LDR: one leg in the + rail, the other in column 5 (bottom half)' },
  { id: 'r10k', step: 2, kind: 'resistor', ohms: 10000, legs: { a: { c: 5, r: 'g' }, b: { c: 9, r: '-b' } }, desc: '10 kΩ: one leg in column 5, the other in the − rail' },
  { id: 'wA0', step: 2, kind: 'wire', wire: 'M-M', color: 'yellow', from: hole(5, 'f'), to: uno('A0'), via: [[522, 292], [452, 352], [336, 506], [308, 480]], desc: 'column 5 → Arduino A0' },
  // ---- Step 3: PIR (off the board, female ends on its pins)
  { id: 'pir', step: 3, kind: 'pir', desc: 'PIR motion sensor (HC-SR501), off the board' },
  { id: 'wPV', step: 3, kind: 'wire', wire: 'F-M', color: 'red', from: { kind: 'pir', pin: 'VCC' }, to: hole(29, '+b'), via: [[1050, 420], [960, 440], [880, 425]], desc: 'PIR VCC → + rail' },
  { id: 'wPG', step: 3, kind: 'wire', wire: 'F-M', color: 'black', from: { kind: 'pir', pin: 'GND' }, to: hole(30, '-b'), via: [[1100, 410], [1000, 430], [900, 408]], desc: 'PIR GND → − rail' },
  { id: 'wPO', step: 3, kind: 'wire', wire: 'F-M', color: 'orange', from: { kind: 'pir', pin: 'OUT' }, to: uno('A1'), via: [[1076, 480], [900, 532], [520, 544], [340, 522]], desc: 'PIR OUT → Arduino A1' },
  // ---- Step 4: 12x12 buttons across the gap (legs in rows d and g), diagonal legs used
  { id: 'btnG', step: 4, kind: 'button', cap: 'green', legs: { tl: { c: 11, r: 'd' }, tr: { c: 13, r: 'd' }, bl: { c: 11, r: 'g' }, br: { c: 13, r: 'g' } }, desc: 'green (YES) button across the gap, legs in columns 11 and 13' },
  { id: 'wD2', step: 4, kind: 'wire', wire: 'M-M', color: 'green', from: hole(11, 'b'), to: uno('D2'), via: [[610, 150], [480, 120], [362, 140]], desc: 'column 11 (top half) → Arduino D2' },
  { id: 'wGG', step: 4, kind: 'wire', wire: 'M-M', color: 'black', from: hole(13, 'i'), to: hole(14, '-b'), via: [[662, 366]], desc: 'column 13 (bottom half, the diagonal leg) → − rail' },
  { id: 'btnR', step: 4, kind: 'button', cap: 'red', legs: { tl: { c: 17, r: 'd' }, tr: { c: 19, r: 'd' }, bl: { c: 17, r: 'g' }, br: { c: 19, r: 'g' } }, desc: 'red (NO) button across the gap, legs in columns 17 and 19' },
  { id: 'wD3', step: 4, kind: 'wire', wire: 'M-M', color: 'purple', from: hole(17, 'b'), to: uno('D3'), via: [[690, 128], [520, 104], [346, 124]], desc: 'column 17 (top half) → Arduino D3' },
  { id: 'wGR', step: 4, kind: 'wire', wire: 'M-M', color: 'black', from: hole(19, 'i'), to: hole(20, '-b'), via: [[741, 366]], desc: 'column 19 (bottom half, the diagonal leg) → − rail' },
  // ---- Step 5: voice module via its Gravity cable (female sockets -> 4 male-male wires), 1k in the R line, capacitor, speaker
  { id: 'voice', step: 5, kind: 'voice', desc: 'DFR0534 voice module, off the board, lying flat away from the Arduino' },
  { id: 'spk', step: 5, kind: 'speaker', desc: 'one speaker of the 2 W set (the other is a spare with taped wire ends)' },
  { id: 'wSPp', step: 5, kind: 'wire', wire: 'speaker wire', color: 'red', from: { kind: 'spk', pin: '+' }, to: { kind: 'voice', pin: 'SP+' }, via: [[1236, 146], [1190, 132], [1140, 130]], desc: 'speaker + (red) → DFR0534 SP+ hole (bottom row, last; soldered in step 5a)' },
  { id: 'wSPm', step: 5, kind: 'wire', wire: 'speaker wire', color: 'black', from: { kind: 'spk', pin: '−' }, to: { kind: 'voice', pin: 'SP−' }, via: [[1208, 152], [1160, 144], [1118, 136]], desc: 'speaker − (black) → DFR0534 SP− hole (bottom row, next to SP+; soldered in step 5a)' },
  { id: 'grav', step: 5, kind: 'gravity', desc: "Gravity cable: its white plug into the module's white Gravity socket, 4 female sockets at the other end" },
  { id: 'wVp', step: 5, kind: 'wire', wire: 'M-M', color: 'red', from: { kind: 'grav', pin: '+' }, to: hole(27, '+b'), via: [[880, 132], [940, 250], [950, 430], [860, 440]], desc: 'cable socket "+" → + rail' },
  { id: 'wVm', step: 5, kind: 'wire', wire: 'M-M', color: 'black', from: { kind: 'grav', pin: '−' }, to: hole(26, '-b'), via: [[870, 110], [925, 250], [930, 420], [840, 424]], desc: 'cable socket "−" → − rail' },
  { id: 'wT', step: 5, kind: 'wire', wire: 'M-M', color: 'blue', from: { kind: 'grav', pin: 'T' }, to: uno('D0'), via: [[840, 40], [620, 38], [420, 70], [374, 150]], desc: 'cable socket "T" (module talks) → Arduino D0 (RX)' },
  { id: 'wR', step: 5, kind: 'wire', wire: 'M-M', color: 'teal', from: { kind: 'grav', pin: 'R' }, to: hole(22, 'b'), via: [[850, 76], [800, 120], [776, 176]], desc: 'cable socket "R" (module listens) → column 22 (top half)' },
  { id: 'r1k', step: 5, kind: 'resistor', ohms: 1000, legs: { a: { c: 22, r: 'd' }, b: { c: 26, r: 'd' } }, desc: '1 kΩ from column 22 to column 26 (top half)' },
  { id: 'wD1', step: 5, kind: 'wire', wire: 'M-M', color: 'pink', from: hole(26, 'b'), to: uno('D1'), via: [[812, 150], [640, 84], [430, 96], [360, 146]], desc: 'column 26 (top half) → Arduino D1 (TX)' },
  { id: 'cap', step: 5, kind: 'capacitor', legs: { plus: { c: 22, r: '+b' }, minus: { c: 24, r: '-b' } }, desc: '680 µF capacitor: long + leg in the + rail, striped − leg in the − rail' },
];
export const item = (id: string): Item => {
  const it = ITEMS.find((i) => i.id === id);
  if (!it) throw new Error(`unknown bench item ${id}`);
  return it;
};

// The pin map shown on screen: the same rows as the table in docs/04 (scripts/netcheck.ts compares them).
export const PINMAP_ROWS: [string, string, string][] = [
  ['Arduino 5V', 'breadboard + rail (red line)', 'M-M (red if you have it)'],
  ['Arduino GND', 'breadboard − rail (blue line)', 'M-M (black)'],
  ['LDR leg 1', '+ rail', '(the leg itself)'],
  ['LDR leg 2 and 10 kΩ leg 1', 'same column, bottom half, e.g. column 5', ''],
  ['10 kΩ leg 2', '− rail', ''],
  ['column 5', 'Arduino A0', 'M-M'],
  ['PIR VCC', '+ rail', 'F-M'],
  ['PIR GND', '− rail', 'F-M'],
  ['PIR OUT', 'Arduino A1', 'F-M'],
  ['YES button (green), across the middle gap (columns 11 and 13)', "one leg's column to the − rail, the diagonally opposite leg's column to Arduino D2", '2× M-M'],
  ['NO button (red), across the middle gap (columns 17 and 19)', "one leg's column to the − rail, diagonal leg's column to Arduino D3", '2× M-M'],
  ['DFR0534 white Gravity socket (T, R, −, +)', 'the 4-wire cable that comes with the module: its white plug goes in here; its other end has 4 female sockets', '(the cable)'],
  ['cable wire at socket pin +', '+ rail', 'M-M'],
  ['cable wire at socket pin −', '− rail', 'M-M'],
  ['cable wire at socket pin T (module talks)', 'Arduino D0 (RX, Arduino listens)', 'M-M'],
  ['cable wire at socket pin R (module listens)', 'column 22, top half; 1 kΩ from column 22 to column 26; column 26 → Arduino D1 (TX)', 'M-M + resistor + M-M'],
  ['680 µF capacitor', 'long leg (+) in the + rail, striped leg (−) in the − rail, next to the module\'s + and − wires', 'its own legs'],
  ['DFR0534 SP+ / SP− holes (bottom row, next to DACL)', 'the two wires of one speaker from the set (never the SPK socket)', 'soldered (step 5a)'],
];

// Order quantities (see src/script/order.ts) of the wires the build consumes.
export const WIRES_IN_ORDER = { 'M-M': 30, 'F-M': 20, 'F-F': 10 };

