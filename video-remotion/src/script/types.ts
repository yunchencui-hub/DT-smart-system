// Types for the video script (src/script/scenes.ts). Pure data: no React, so scripts can import it.

// Where the cables are while a line is spoken. Shown by the badge in the corner, checked by scripts/review.ts.
//   out   = Arduino USB unplugged (the only state in which we wire)
//   in    = Arduino USB plugged in (tests only)
//   micro = Arduino USB unplugged, voice module alone on its micro-USB cable (copying the sound files)
export type Usb = 'out' | 'in' | 'micro';

export type SayLine = {
  say: string; // caption text (what the viewer reads)
  speak?: string; // optional: what the narrator says, if it must differ from the caption
  usb?: Usb; // cable state from this line on
  adds?: string[]; // bench items (src/data/wiring.ts) that appear while this line is spoken
};
export type RobinLine = { robin: number; usb?: Usb }; // one of Robin's own clips, audio/en/NN.mp3
export type PauseLine = { pause: number; cap?: string; usb?: Usb }; // a silent "pause and think" moment
export type Line = string | SayLine | RobinLine | PauseLine;

export type SceneDef = {
  id: string;
  part: string;
  step?: string;
  title: string;
  lines: Line[];
  ui?: Record<string, string>; // every piece of on-screen text, so the review sees it too
  dark?: boolean;
};

export const isSay = (l: Line): l is string | SayLine => typeof l === 'string' || 'say' in l;
export const sayText = (l: string | SayLine) => (typeof l === 'string' ? l : l.say);
export const lineUsb = (l: Line): Usb | undefined => (typeof l === 'string' ? undefined : l.usb);
export const lineAdds = (l: Line): string[] => (typeof l === 'string' || !('adds' in l) ? [] : l.adds ?? []);
