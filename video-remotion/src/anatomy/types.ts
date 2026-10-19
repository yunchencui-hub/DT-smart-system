// Types shared by the anatomy videos' scripts (src/anatomy/script.ts = the build, src/anatomy/debug/script.ts = the
// debugging guide). Pure data: scripts/voice.ts and scripts/review.ts read the scripts as plain SceneDefs.
import type { PauseLine, RobinLine, SayLine, SceneDef } from '../script/types';

export type AView = 'full' | 'desk' | 'power' | 'ldr' | 'pir' | 'pirBack' | 'buttons' | 'voice' | 'voiceWires' | 'cap' | 'matrix' | 'uno' | 'rails' | 'reset';
export type AFig = 'bench' | 'xray' | 'pirFront' | 'render' | 'buttonXray' | 'network' | 'drive';
// The doctor's five steps of the debugging guide (src/anatomy/debug/script.ts).
export type Doc = 'symptom' | 'unplug' | 'look' | 'fix' | 'test';
export type Extra = {
  view?: AView; // camera on the bench from this line on
  glow?: string[]; // light on a rail, a column, a pin (see Bench.tsx glowSvg)
  face?: string; // LED matrix face from this line on (when powered)
  serial?: string[]; // Serial Monitor lines that appear during this line
  fig?: AFig; // which figure from this line on
  render?: string; // for fig 'render': one of the part renders in video-assets/parts/
  lift?: number; // xray: how far the breadboard's plastic is lifted (0..1); pirFront: how far the dome is off
  group?: string; // kit scene: which body part is highlighted
  // debugging guide only
  doc?: Doc; // which of the doctor's steps this line is
  blame?: boolean; // from this line until the fix, the scene's faulty parts glow red
  fix?: boolean; // the fix happens during this line: faulty parts lift out, the right ones drop in (only with the USB out)
  soft?: boolean; // a fix without wiring (baud rate, secrets, files): no need to unplug for it
  readout?: string; // the figure card's live readout from this line on
  press?: number; // buttonXray: 0 = up, 1 = pressed
  net?: 'wifi' | 'mqtt' | 'auth' | 'drop' | 'ok'; // network figure: where the message gets stuck
  drive?: 'old' | 'empty' | 'new'; // drive figure: what is on the voice module
};
export type ALine = string | (SayLine & Extra) | (RobinLine & Extra) | (PauseLine & Extra);
export type AScene = Omit<SceneDef, 'lines'> & {
  lines: ALine[];
  kind: 'title' | 'kit' | 'figure' | 'files' | 'end' | 'loop';
  fig?: { n: number; title: string; hint?: string; readout?: string };
  need?: string[]; // part renders shown in the side panel (video-assets/parts/<name>.png)
  eli5?: string; // the one-line analogy in the side panel
  notes?: { from: number; icon: string; text: string }[]; // side-panel cards that appear from line `from` (0-based) on
  faceCard?: boolean; // side panel shows the LED face large (the front header hides its bottom rows in the 3D view)
  start?: Extra; // the figure's state at the start of the scene
  // debugging guide only: the fault this case starts with (items of src/anatomy/faults.ts shown, items of wiring.ts hidden)
  fault?: { show: string[]; hide: string[] };
};
