// Pure geometry of the off-board modules, shared by the drawings (src/kit) and the wiring data.
import { BENCH, Pt } from './geom';

// HC-SR501 PIR, front view. Pins along the bottom edge; their names are printed under the dome.
export const PIR_PINS = ['VCC', 'OUT', 'GND'] as const;
export const pirPin = (name: string, at = BENCH.pir): Pt => {
  const i = (PIR_PINS as readonly string[]).indexOf(name);
  if (i < 0) throw new Error(`PIR has no pin ${name}`);
  return { x: at.x + (44 + i * 20) * at.s, y: at.y + 104 * at.s };
};

// DFR0534 voice module, drawn from the board photo in its datasheet (page 2, Voice Module V1.0):
//   white Gravity socket (left edge): T, R, -, +      (T = TX, R = RX, - = GND, + = 3.3-5 V)
//   top row of holes:    VCC GND RX TX BUSY
//   bottom row of holes: ONE DACR DACL SP- SP+       (we solder the speaker to SP- / SP+ only)
//   white 2-pin SPK socket (right edge) = the same speaker output; our speaker's plug does not fit it
//   micro-USB on the back, right edge (file update only)
export const VOICE_W = 150, VOICE_H = 104;
export const GRAVITY_PINS = ['T', 'R', '−', '+'] as const;
export const TOP_HOLES = ['VCC', 'GND', 'RX', 'TX', 'BUSY'] as const;
export const BOTTOM_HOLES = ['ONE', 'DACR', 'DACL', 'SP−', 'SP+'] as const;
export const HOLE_TOP_Y = 12, HOLE_BOTTOM_Y = 92;
export const holeX = (i: number) => 42 + i * 19;
export const gravityPinY = (i: number) => 31 + i * 14;
export const voicePin = (name: string, at = BENCH.voice): Pt => {
  const g = (GRAVITY_PINS as readonly string[]).indexOf(name);
  if (g >= 0) return { x: at.x - 14 * at.s, y: at.y + gravityPinY(g) * at.s };
  const tp = (TOP_HOLES as readonly string[]).indexOf(name);
  if (tp >= 0) return { x: at.x + holeX(tp) * at.s, y: at.y + HOLE_TOP_Y * at.s };
  const bt = (BOTTOM_HOLES as readonly string[]).indexOf(name);
  if (bt >= 0) return { x: at.x + holeX(bt) * at.s, y: at.y + HOLE_BOTTOM_Y * at.s };
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

// One speaker from the 2 W speaker set, below-right of the voice module; its two wires leave from the top.
export const SPEAKER = { cx: 1222, cy: 206, r: 34 };
export const speakerTab = (which: '+' | '−'): Pt => ({ x: SPEAKER.cx + (which === '+' ? 12 : -12), y: SPEAKER.cy - SPEAKER.r - 6 });
