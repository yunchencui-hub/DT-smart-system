// Wrong wiring, for the debugging guide (src/anatomy/debug/script.ts): each fault replaces one or two items of
// src/data/wiring.ts in one case, until the fix swaps the right ones back. Kept apart from wiring.ts on purpose:
// scripts/netcheck.ts checks the real wiring, and these are the mistakes the troubleshooting table in docs/04 names.
import type { Row } from '../data/geom';
import type { End, Item } from '../data/wiring';

const hole = (c: number, r: Row): End => ({ kind: 'hole', c, r });

export const FAULT_ITEMS: Item[] = [
  // light_raw always ~0: the LDR's second leg one hole too far, so it never meets the resistor and the A0 wire
  { id: 'f-ldr6', step: 2, kind: 'ldr', legs: { a: { c: 3, r: '+b' }, b: { c: 6, r: 'i' } }, desc: 'LDR: second leg in column 6, one hole too far' },
  // button always "pressed": the ground wire on the leg that is always joined to the D2 leg inside the button
  { id: 'f-wGG11', step: 4, kind: 'wire', wire: 'M-M', color: 'black', from: hole(11, 'i'), to: hole(14, '-b'), via: [], desc: 'ground wire on column 11, bottom half: the same leg pair as D2' },
  // no sound: T and R not crossed (module T to the resistor that leads to D1, module R to D0)
  { id: 'f-wT', step: 5, kind: 'wire', wire: 'M-M', color: 'blue', from: { kind: 'grav', pin: 'T' }, to: hole(22, 'b'), via: [], desc: 'cable socket "T" → column 22: not crossed' },
  { id: 'f-wR', step: 5, kind: 'wire', wire: 'M-M', color: 'teal', from: { kind: 'grav', pin: 'R' }, to: { kind: 'uno', pin: 'D0' }, via: [], desc: 'cable socket "R" → Arduino D0: not crossed' },
  // "USB device needs more power": a wire straight from the + rail to the − rail (a short circuit)
  { id: 'f-short', step: 1, kind: 'wire', wire: 'M-M', color: 'grey', from: hole(15, '+b'), to: hole(18, '-b'), via: [], desc: 'a wire from the + rail to the − rail: a short circuit' },
  // capacitor warm or bulging: in backwards, stripe (−) in the + rail
  { id: 'f-capRev', step: 5, kind: 'capacitor', legs: { plus: { c: 22, r: '-b' }, minus: { c: 24, r: '+b' } }, desc: '680 µF capacitor in backwards: stripe in the + rail' },
];
