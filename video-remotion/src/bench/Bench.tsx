// The workbench: Arduino + breadboard + every part and wire from src/data/wiring.ts.
// state(id) gives each item's progress 0..1 (0 = not there yet, 1 = fully placed), so the picture is always
// exactly the data that scripts/netcheck.ts checked.
import React from 'react';
import { BENCH, H, Hole, Row } from '../data/geom';
import { SPEAKER } from '../data/modules';
import { endPoint, ITEMS, Item, WIRE_COLORS } from '../data/wiring';
import { spop, Wire } from '../kit/basics';
import { Arduino, Breadboard, Button, CapacitorTop, GravityCable, Ldr, Pir, Resistor, Speaker, UsbCable, VoiceModule } from '../kit/hardware';

const hp = (h: Hole) => H(h.c, h.r as Row);
const BANDS: Record<number, string[]> = { 10000: ['brown', 'black', 'orange', 'gold'], 1000: ['brown', 'black', 'red', 'gold'] };

export type BenchProps = {
  state: (id: string) => number;
  power?: boolean;
  face?: string | null;
  usb?: number; // 0..1 cable slide-in
  dim?: (id: string) => boolean; // dim everything this returns true for (recap focus)
  glow?: (id: string) => boolean;
  talking?: boolean;
  t?: number;
  pressed?: string[]; // button ids shown pressed
  flags?: number; // tape flags on the Gravity cable
  xray?: number;
  children?: React.ReactNode; // overlay (tags, rings) drawn on top
};

const centreOf = (it: Item): [number, number] => {
  if ('legs' in it) {
    const ps = Object.values(it.legs).map((h) => hp(h as Hole));
    return [ps.reduce((s, q) => s + q.x, 0) / ps.length, ps.reduce((s, q) => s + q.y, 0) / ps.length];
  }
  if (it.kind === 'pir') return [BENCH.pir.x + 64, BENCH.pir.y + 48];
  if (it.kind === 'voice') return [BENCH.voice.x + 75, BENCH.voice.y + 52];
  if (it.kind === 'speaker') return [SPEAKER.cx, SPEAKER.cy];
  return [0, 0];
};

export const Bench: React.FC<BenchProps> = ({ state, power = false, face = null, usb = 0, dim, glow, talking = false, t = 0, pressed = [], flags = 0, xray = 0, children }) => {
  const layers: Record<'parts' | 'modules' | 'wires', React.ReactNode[]> = { parts: [], modules: [], wires: [] };
  for (const it of ITEMS) {
    const p = state(it.id);
    if (p <= 0) continue;
    const o = dim?.(it.id) ? 0.18 : 1;
    const [cx, cy] = centreOf(it);
    const pop = spop(p, cx, cy);
    const g = (node: React.ReactNode, layer: keyof typeof layers) =>
      layers[layer].push(<g key={it.id} opacity={o} style={{ visibility: pop.visibility }}><g transform={pop.transform} opacity={pop.opacity}>{node}</g></g>);
    switch (it.kind) {
      case 'wire': {
        const a = endPoint(it.from), b = endPoint(it.to);
        const pts: [number, number][] = [[a.x, a.y], ...it.via, [b.x, b.y]];
        layers.wires.push(
          <g key={it.id} opacity={o}>
            <Wire pts={pts} color={WIRE_COLORS[it.color]} p={p} glow={glow?.(it.id)} plugs={it.wire === 'speaker wire' ? [false, true] : [true, true]} />
          </g>,
        );
        break;
      }
      case 'ldr': g(<Ldr a={hp(it.legs.a)} b={hp(it.legs.b)} />, 'parts'); break;
      case 'resistor': g(<Resistor a={hp(it.legs.a)} b={hp(it.legs.b)} bands={BANDS[it.ohms]} lift={it.ohms === 1000 ? 0 : 0} />, 'parts'); break;
      case 'button': g(<Button tl={hp(it.legs.tl)} tr={hp(it.legs.tr)} bl={hp(it.legs.bl)} br={hp(it.legs.br)} cap={it.cap === 'green' ? '#2e9e4f' : '#e53935'} pressed={pressed.includes(it.id)} />, 'parts'); break;
      case 'capacitor': g(<CapacitorTop plus={hp(it.legs.plus)} minus={hp(it.legs.minus)} />, 'parts'); break;
      case 'pir': g(<Pir x={BENCH.pir.x} y={BENCH.pir.y} s={BENCH.pir.s} labels={false} />, 'modules'); break;
      case 'voice': g(<VoiceModule x={BENCH.voice.x} y={BENCH.voice.y} s={BENCH.voice.s} plugIn={state('grav') > 0} />, 'modules'); break;
      case 'speaker': g(<Speaker cx={SPEAKER.cx} cy={SPEAKER.cy} r={SPEAKER.r} t={t} talking={talking} />, 'modules'); break;
      case 'gravity':
        layers.modules.push(<g key={it.id} opacity={o}><GravityCable x={BENCH.voice.x} y={BENCH.voice.y} s={BENCH.voice.s} p={p} flags={flags} /></g>);
        break;
    }
  }
  return (
    <g>
      <Arduino x={BENCH.uno.x} y={BENCH.uno.y} k={BENCH.uno.k} power={power} face={face} />
      <UsbCable x={BENCH.uno.x} y={BENCH.uno.y} k={BENCH.uno.k} p={usb} />
      <Breadboard x={BENCH.bb.x} y={BENCH.bb.y} p={BENCH.bb.p} xray={xray} />
      <g>{layers.parts}</g>
      <g>{layers.modules}</g>
      <g>{layers.wires}</g>
      {children}
    </g>
  );
};

// Standard bench state for a scene: items of earlier steps are complete, items this scene adds animate in.
export const benchState = (upto: number, add: (id: string) => number, addedIn: (id: string) => boolean, extra: string[] = []) => (id: string) => {
  const it = ITEMS.find((i) => i.id === id)!;
  if (addedIn(id)) return add(id);
  if (it.step <= upto || extra.includes(id)) return 1;
  return 0;
};
