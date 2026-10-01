// Pure geometry of the off-board modules, shared by the drawings (src/kit) and the wiring data.
import { BENCH, Pt } from './geom';

// HC-SR501 PIR, front view. Pins along the bottom edge; their names are printed under the dome.
export const PIR_PINS = ['VCC', 'OUT', 'GND'] as const;
export const pirPin = (name: string, at = BENCH.pir): Pt => {
  const i = (PIR_PINS as readonly string[]).indexOf(name);
  if (i < 0) throw new Error(`PIR has no pin ${name}`);
  return { x: at.x + (44 + i * 20) * at.s, y: at.y + 104 * at.s };
};

// DFR0534 voice module, drawn from its datasheet pin table:
//   white Gravity plug (left edge): T, R, -, +      (1 T = TX, 2 R = RX, 3 - = GND, 4 + = 3.3-5 V)
//   header (bottom edge):           VCC GND BUSY SP+ SP- DACL DACR ONE
//   micro-USB on the top edge (file update).
export const VOICE_W = 150, VOICE_H = 104;
export const GRAVITY_PINS = ['T', 'R', '−', '+'] as const;
export const HEADER_PINS = ['VCC', 'GND', 'BUSY', 'SP+', 'SP−', 'DACL', 'DACR', 'ONE'] as const;
export const gravityPinY = (i: number) => 31 + i * 14;
export const voicePin = (name: string, at = BENCH.voice): Pt => {
  const g = (GRAVITY_PINS as readonly string[]).indexOf(name);
  if (g >= 0) return { x: at.x - 14 * at.s, y: at.y + gravityPinY(g) * at.s };
  const h = (HEADER_PINS as readonly string[]).indexOf(name);
  if (h >= 0) return { x: at.x + (19 + h * 16) * at.s, y: at.y + (VOICE_H + 8) * at.s };
  throw new Error(`DFR0534 has no pin ${name}`);
};

// The Gravity cable that comes with the module: white plug -> 4 wires -> 4 FEMALE DuPont housings.
// A male-male jumper plugs into the open end of each housing.
export const GRAVITY_CABLE_LEN = 92;
export const gravityEnd = (name: string, at = BENCH.voice): Pt => {
  const g = (GRAVITY_PINS as readonly string[]).indexOf(name);
  if (g < 0) throw new Error(`Gravity cable has no wire ${name}`);
  return { x: at.x - (14 + GRAVITY_CABLE_LEN + 18) * at.s, y: at.y + gravityPinY(g) * at.s };
};

// One speaker from the 2 W speaker set, placed right of the voice module.
export const SPEAKER = { cx: 1222, cy: 196, r: 36 };
export const speakerTab = (which: '+' | '−'): Pt => ({ x: SPEAKER.cx + (which === '+' ? -12 : 12), y: SPEAKER.cy + SPEAKER.r + 6 });
