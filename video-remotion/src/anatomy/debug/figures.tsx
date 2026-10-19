// Figures of the debugging guide (src/anatomy/debug/script.ts):
//   - ButtonXray: a 12 x 12 push button with its body lifted off (anatomy skill): two metal strips join its legs in
//     pairs for good, and the dome bridges the strips only while pressed. Shows why "always pressed" happens.
//   - NetworkFig: Robin, the phone's hotspot (the road) and Mosquitto on the laptop (the mailbox); where a message stops.
//   - DriveFig: what is on the voice module's drive (old demo files, empty, or exactly 01-13.mp3).
//   - LoopScreen: the doctor's five steps, with the one being explained lit.
import React from 'react';
import { box, cyl, flatPoly, solid } from '../draw';
import * as k from '../kit/iso-kit';
import { FIG, GLOW } from '../Bench';
import { COL } from '../parts';
import type { AScene, Doc, Extra } from '../types';
import type { TScene } from '../video';
import { LedMatrix } from '../../kit/hardware';
import { C, EMOJI, FONT, MONO } from '../../theme';

export const DOC_STEPS: { id: Doc; icon: string; text: string; long: string }[] = [
  { id: 'symptom', icon: '🩺', text: 'Symptom: what do you see?', long: 'What do you see or hear, and what did you expect?' },
  { id: 'unplug', icon: '🔌', text: 'Unplug before you touch', long: 'Never change wiring with the USB cable in.' },
  { id: 'look', icon: '🔍', text: 'Look and measure', long: 'Pin map, labels, and the Serial Monitor.' },
  { id: 'fix', icon: '🔧', text: 'Change one thing', long: 'Only one, so you know what cured it.' },
  { id: 'test', icon: '✅', text: 'Test again, then unplug', long: 'Is the symptom gone? Then unplug.' },
];

const css = `${k.ISO_CSS}\n.anat{--anatomy-weight:.9px}\n.anat .iso-solid path{vector-effect:non-scaling-stroke}`;
const Raw: React.FC<{ svg: string; transform?: string; opacity?: number }> = ({ svg, transform, opacity }) =>
  <g transform={transform} opacity={opacity} dangerouslySetInnerHTML={{ __html: svg }} />;

// ---------- the push button, lifted open
// World: mm, the button's centre at the origin, its legs at x = ±2.54 (columns 11 and 13) and y = ±6.35 (rows d and g),
// standing on a piece of breadboard (top at z = 0). In this button the strips run along y: each joins the two legs of
// one column. (Other buttons are turned 90°; that is why the guide uses diagonal legs, which never share a strip.)
const LEGS: [number, number][] = [[-2.54, -6.35], [2.54, -6.35], [-2.54, 6.35], [2.54, 6.35]]; // tl (D2), tr, bl, br
const BP = k.fitProjection([[-13, -13, -4], [13, 13, -4], [-13, -13, 24], [13, 13, 24]], FIG.w, FIG.h, { pad: 24, azimuth: 56, elevation: 40 });
let btnCache: { base: string; legs: string; body: string; cap: string } | null = null;
const stripSvg = (x: number, color: string) => box(BP, x - 0.9, -7.2, 1.2, 1.8, 14.4, 0.5, color, 0);
export const ButtonXray: React.FC<{ press: number; gndLeg: 'same' | 'diagonal'; lift?: number; t: number }> = ({ press, gndLeg, lift = 1, t }) => {
  if (!btnCache) {
    const base: string[] = [`<path class="iso-halo" d="${k.haloOf({ x: -13, y: -13, w: 26, d: 26, r: 2 }, -4, 1, BP)}"/>`];
    base.push(box(BP, -13, -13, -4, 26, 26, 4, COL.bb, 1, { bevel: 0.5 })); // a piece of breadboard
    base.push(flatPoly(BP, [[-13, -1.5], [13, -1.5], [13, 1.5], [-13, 1.5]], 0.01, COL.bbGroove)); // the middle gap
    const holes: string[] = [];
    for (let c = -2; c <= 2; c++) for (const y of [-11.43, -8.89, -6.35, -3.81, 3.81, 6.35, 8.89, 11.43]) {
      const x = c * 2.54;
      holes.push(k.onTop([[x - 0.55, y - 0.55], [x + 0.55, y - 0.55], [x + 0.55, y + 0.55], [x - 0.55, y + 0.55]], 0.02, BP, true));
    }
    base.push(`<path d="${holes.join('')}" fill="${COL.bbHole}"/>`);
    const legs = LEGS.map(([x, y]) => box(BP, x - 0.4, y - 0.2, 0, 0.8, 0.4, 1.6, COL.metal, 0)
      + box(BP, x - 0.4, Math.min(y, Math.sign(y) * 4.4), 1.2, 0.8, Math.abs(y) - 4.4 + 0.2, 0.3, COL.metal, 0)).join('');
    const body = box(BP, -6, -6, 1.8, 12, 12, 3.2, COL.btn, 0.4) + box(BP, -6, -6, 5, 12, 12, 0.35, COL.metal, 0.3);
    const cap = cyl(BP, 0, 0, 6.4, 5.35, 1.3, COL.capGreen, 36) + cyl(BP, 0, 0, 5.9, 6.65, 6.2, COL.capGreen, 36);
    btnCache = { base: base.join(''), legs, body, cap };
  }
  const same = gndLeg === 'same';
  const gnd = same ? LEGS[2] : LEGS[3];
  const pulse = 0.75 + 0.25 * Math.sin(t * 5);
  // the strips: red when D2 and ground share one (always joined); teal when the pressed dome bridges them
  const bridged = press > 0.85 && !same;
  const left = same ? GLOW.red : bridged ? GLOW.teal : COL.metal;
  const right = bridged ? GLOW.teal : COL.metal;
  // where the D2 wire (green) and the ground wire (black) end: a ring round the leg, and the wire leaving low over the
  // board towards the nearest corner (never through the lifted body)
  const ring = ([x, y]: [number, number], color: string) => {
    // the back legs' wire goes left (behind is "up" on screen, where the lifted body is), the front legs' wires go forward
    const [ex, ey] = y < 0 ? [-10, 1] : x < 0 ? [-3, 7] : [4, 7];
    const c = k.iso([x, y, 0.05], BP), mid = k.iso([x + ex / 2, y + ey / 2, 5], BP), end = k.iso([x + ex, y + ey, 2.5], BP);
    const w = 1.5 * BP.scale * 1.26, d = `M${c[0].toFixed(1)} ${c[1].toFixed(1)} Q${mid[0].toFixed(1)} ${mid[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
    return `<ellipse cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" rx="${(2.1 * BP.scale * 1.26).toFixed(1)}" ry="${(1.1 * BP.scale * 1.26).toFixed(1)}" fill="none" stroke="${color}" stroke-width="3.2" stroke-opacity="${pulse.toFixed(2)}"/>`
      + `<path d="${d}" fill="none" stroke="#111" stroke-width="${(w + 1.2).toFixed(1)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/>`;
  };
  const up = (z: number) => k.translateAlong(BP, [0, 0, z]);
  const domeZ = 2.2 - 0.6 * press;
  return (
    <svg viewBox={`0 0 ${FIG.w} ${FIG.h}`} width={FIG.w} height={FIG.h} style={{ display: 'block' }}>
      <style>{css}</style>
      <g className="iso anat" data-theme="light">
        <Raw svg={btnCache.base} />
        <Raw svg={btnCache.legs} />
        <Raw svg={stripSvg(-2.54, left) + stripSvg(2.54, right)} />
        <Raw svg={solid(k.cylinder(0, 0, 3.4, domeZ, 0.35, BP, 32), bridged ? GLOW.teal : '#d9dde2')} />
        <Raw svg={btnCache.body} transform={up(lift * 11)} opacity={lift > 0.05 ? 0.96 : 1} />
        <Raw svg={btnCache.cap} transform={up(lift * 11 - press * 1.6)} />
        <Raw svg={ring(LEGS[0], C.green) + ring(gnd, '#3a3a3a')} />
      </g>
    </svg>
  );
};

// ---------- where Robin's messages get stuck (ELI5: the road and the mailbox)
const Station: React.FC<{ x: number; icon: React.ReactNode; title: string; sub: string; bad?: boolean }> = ({ x, icon, title, sub, bad }) => (
  <div style={{ position: 'absolute', left: x, top: 150, width: 210, height: 230, background: '#fff', borderRadius: 16, boxShadow: `0 0 0 ${bad ? 3 : 1}px ${bad ? GLOW.red : '#d9d3c7'}, 0 8px 20px rgba(0,0,0,0.08)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: FONT }}>
    {icon}
    <div style={{ fontSize: 22, fontWeight: 900, color: C.ink }}>{title}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: C.muted, textAlign: 'center', padding: '0 12px', lineHeight: 1.25 }}>{sub}</div>
  </div>
);
const Link: React.FC<{ x: number; w: number; label: string; state: 'ok' | 'bad' | 'flaky' | 'idle'; t: number }> = ({ x, w, label, state, t }) => {
  const color = state === 'bad' ? GLOW.red : state === 'idle' ? '#b9c0c6' : GLOW.teal;
  const o = state === 'flaky' ? (Math.floor(t * 2.2) % 3 === 0 ? 0.15 : 1) : 1;
  const env = state === 'ok' ? ((t * 0.6) % 1) : -1;
  return (
    <div style={{ position: 'absolute', left: x, top: 230, width: w, height: 70, fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 30, height: 8, borderRadius: 4, background: color, opacity: o }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', fontSize: 15, fontWeight: 900, color: state === 'bad' ? GLOW.red : C.muted }}>{label}</div>
      {state === 'bad' && <div style={{ position: 'absolute', left: w / 2 - 18, top: 14, fontSize: 34, fontWeight: 900, color: GLOW.red, fontFamily: FONT }}>✗</div>}
      {env >= 0 && <div style={{ position: 'absolute', left: env * (w - 26), top: 40, fontFamily: EMOJI, fontSize: 24 }}>✉️</div>}
    </div>
  );
};
export const NetworkFig: React.FC<{ net: NonNullable<Extra['net']>; t: number; face: string | null }> = ({ net, t, face }) => (
  <div style={{ position: 'relative', width: FIG.w, height: FIG.h }}>
    <Station x={30} title="Robin" sub="writes a letter every 2 s" icon={<svg width={110} height={80}><rect x={4} y={4} width={102} height={72} rx={12} fill="#123a3c" /><LedMatrix x0={14} y0={13} pitch={7.7} r={2.7} face={face} /></svg>} bad={net === 'wifi'} />
    <Link x={240} w={110} label="WiFi: the road" state={net === 'wifi' ? 'bad' : net === 'drop' ? 'flaky' : 'ok'} t={t} />
    <Station x={350} title="Phone" sub="hotspot, 2.4 GHz" icon={<div style={{ fontFamily: EMOJI, fontSize: 64 }}>📱</div>} bad={false} />
    <Link x={560} w={70} label="network" state={net === 'wifi' ? 'idle' : net === 'mqtt' ? 'bad' : net === 'drop' ? 'flaky' : 'ok'} t={t} />
    <Station x={630} title="Laptop" sub={net === 'auth' ? 'Mosquitto: wants a password' : 'Mosquitto: the mailbox'} icon={<div style={{ fontFamily: EMOJI, fontSize: 64 }}>{net === 'auth' ? '🔒' : '📮'}</div>} bad={net === 'mqtt' || net === 'auth'} />
    <div style={{ position: 'absolute', left: 30, right: 30, top: 420, textAlign: 'center', fontFamily: FONT, fontSize: 22, fontWeight: 900, color: net === 'ok' ? C.green : GLOW.red }}>
      {net === 'ok' ? 'Letters arrive: the face turns happy' : net === 'wifi' ? 'Stuck on the road: WiFi' : net === 'mqtt' ? 'The road works, the mailbox does not answer' : net === 'auth' ? 'The mailbox is locked: password' : 'Connected, then lost every ~20 s'}
    </div>
  </div>
);

// ---------- the voice module's drive (example file names: the real demo files differ per batch)
const OUR = Array.from({ length: 13 }, (_, i) => `${String(i + 1).padStart(2, '0')}.mp3`);
const OLD = ['03 demo.mp3', 'music.mp3', '0001 intro.mp3'];
export const DriveFig: React.FC<{ drive: NonNullable<Extra['drive']>; since: number }> = ({ drive, since }) => {
  const files = drive === 'old' ? [OLD[0], ...OUR.slice(0, 6), OLD[1], ...OUR.slice(6), OLD[2]] : drive === 'empty' ? [] : OUR;
  const shown = drive === 'new' ? Math.min(files.length, Math.floor(since * 6)) : files.length;
  const match = (f: string) => f.startsWith('03');
  return (
    <div style={{ position: 'relative', width: FIG.w, height: FIG.h, fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: 40, top: 40, width: 768, height: 400, background: '#fff', borderRadius: 12, boxShadow: '0 8px 22px rgba(0,0,0,0.12), 0 0 0 1px #ddd', overflow: 'hidden' }}>
        <div style={{ background: '#eceff3', padding: '10px 16px', fontWeight: 900, fontSize: 17, color: C.ink }}><span style={{ fontFamily: EMOJI }}>💾</span> DFR0534 (USB drive) · example names</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 10px', padding: 16 }}>
          {files.slice(0, shown).map((f) => {
            const hit = match(f), old = OLD.includes(f);
            return (
              <div key={f} style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: old ? '#8a4b00' : C.ink, background: hit ? (drive === 'old' ? '#fde8e7' : '#e7f6f6') : old ? '#fff4e5' : '#f3f6f9', boxShadow: hit ? `inset 0 0 0 2px ${drive === 'old' ? GLOW.red : C.teal}` : 'none', borderRadius: 6, padding: '8px 10px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span style={{ fontFamily: EMOJI }}>🎵</span> {f}
              </div>
            );
          })}
          {drive === 'empty' && <div style={{ gridColumn: '1 / 5', fontSize: 20, fontWeight: 800, color: C.muted, padding: 20 }}>Empty: everything deleted.</div>}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 40, top: 448, width: 768, fontSize: 19, fontWeight: 800, color: drive === 'old' ? GLOW.red : C.tealDark, fontFamily: MONO }}>
        say 3 → the module plays the first file whose name starts with “03”{drive === 'old' ? ': two candidates!' : drive === 'new' ? ': only 03.mp3' : ''}
      </div>
    </div>
  );
};

// ---------- the doctor's five steps
export const LoopScreen: React.FC<{ sc: TScene; def: AScene; t: number }> = ({ sc, def, t }) => {
  const i = sc.lines.filter((l) => l.start <= t + 0.02).length - 1;
  const line = i >= 0 ? def.lines[i] : undefined;
  const doc = line && typeof line !== 'string' ? line.doc : undefined;
  const at = DOC_STEPS.findIndex((d) => d.id === doc);
  const seen = Math.max(at, ...def.lines.slice(0, i + 1).map((l) => (typeof l !== 'string' && l.doc ? DOC_STEPS.findIndex((d) => d.id === l.doc) : -1)));
  const back = def.ui?.back && i === def.lines.length - 1;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {DOC_STEPS.map((d, k) => {
        const on = k === at, done = k <= seen;
        return (
          <div key={d.id} style={{ position: 'absolute', left: 34 + k * 246, top: 96, width: 218, height: 250, background: on ? '#e7f6f6' : '#fff', borderRadius: 18, boxShadow: on ? `0 0 0 4px ${C.teal}, 0 10px 24px rgba(0,0,0,0.1)` : '0 0 0 1px #e3ddd2', opacity: done ? 1 : 0.3, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 14px', boxSizing: 'border-box', gap: 10, transform: `scale(${on ? 1.04 : 1})` }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.muted, letterSpacing: 1.5 }}>STEP {k + 1}</div>
            <div style={{ fontFamily: EMOJI, fontSize: 56 }}>{d.icon}</div>
            <div style={{ fontSize: 21, fontWeight: 900, color: C.ink, textAlign: 'center', lineHeight: 1.15 }}>{d.text}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.muted, textAlign: 'center', lineHeight: 1.25 }}>{d.long}</div>
          </div>
        );
      })}
      {[0, 1, 2, 3].map((k) => <div key={k} style={{ position: 'absolute', left: 254 + k * 246, top: 200, fontSize: 30, fontWeight: 900, color: k < seen ? C.teal : '#c9ced3' }}>→</div>)}
      <div style={{ position: 'absolute', left: 34, top: 380, width: 1212, height: 64, borderRadius: 32, border: `3px dashed ${seen >= 4 ? C.teal : '#c9ced3'}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: seen >= 4 ? C.tealDark : '#a7afb6' }}>
        ↺ still not fixed? Back to step 3, with the next suspect
      </div>
      {back && (
        <div style={{ position: 'absolute', left: 240, top: 466, width: 800, background: '#fff4e5', border: `3px solid ${C.orange}`, borderRadius: 14, padding: '12px 18px', boxSizing: 'border-box', fontSize: 20, fontWeight: 900, color: '#8a4b00', textAlign: 'center' }}>
          <span style={{ fontFamily: EMOJI }}>🧭</span> {def.ui!.back}
        </div>
      )}
    </div>
  );
};
