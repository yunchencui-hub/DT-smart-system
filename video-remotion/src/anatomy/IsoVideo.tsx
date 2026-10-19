// An anatomy + ELI5 video (the build, or the debugging guide): an isometric figure of the bench (anatomy skill) that
// changes exactly as the narration says, in a card with Fig n / title / hint / live readout, next to a side panel with
// the renders of the parts we received, a one-line "ELI5" picture and a checklist. Scenes sit at their absolute place
// in the timeline. Which video it is comes from the Video (src/anatomy/video.ts) passed to <IsoVideo>.
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Html5Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import '../fonts';
import { ease } from '../data/geom';
import { blinkFace, LedMatrix } from '../kit/hardware';
import { C, EMOJI, FONT, MONO } from '../theme';
import { Bench, FIG, FULL_VIEW, lerpView, viewOf, ViewBox } from './Bench';
import { BreadboardXray, PirFront, RenderBadge, RenderCard } from './figures';
import { ButtonXray, DOC_STEPS, DriveFig, LoopScreen, NetworkFig } from './debug/figures';
import { ITEMS } from '../data/wiring';
import { FAULT_ITEMS } from './faults';
import type { AScene, AView, Doc } from './types';
import { FADE_S, FigState, TScene, Video } from './video';

const VCtx = createContext<Video | null>(null);
const useV = () => useContext(VCtx)!;
const ITEM_IDS = new Set(ITEMS.map((i) => i.id));
const finished = (id: string) => (ITEM_IDS.has(id) ? 1 : 0); // the finished bench (no fault parts)
const FADE_FRAMES = (v: Video) => Math.round(FADE_S * v.FPS);
const smooth = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export const VIEWS: Record<AView, ViewBox> = {
  full: FULL_VIEW,
  rails: viewOf([[106, 34, 0], [146, 58, 0], [106, 58, 0], [146, 34, 26]], 18),
  reset: viewOf([[-4, -2, 0], [34, 20, 8]], 18),
  desk: viewOf([[-14, -2, 0], [168, 56, 0], [168, -2, 0], [-14, 56, 14]], 10),
  power: viewOf([[22, 42, 0], [22, 56, 27], [98, 40, 0], [98, 56, 24]], 26),
  uno: viewOf([[-14, -2, 0], [72, 56, 14]]),
  ldr: viewOf([[44, 30, 0], [52, 56, 28], [86, 22, 0], [116, 58, 22]], 22),
  pir: viewOf([[44, 40, 0], [170, 40, 0], [222, 20, 0], [222, 70, 26], [50, 70, 0]]),
  pirBack: viewOf([[182, 18, 0], [222, 46, 27]], 26),
  buttons: viewOf([[50, -2, 26], [58, 4, 0], [112, 4, 0], [142, 58, 22], [100, 58, 0]], 20),
  voice: viewOf([[170, -58, 0], [266, -24, 16]]),
  voiceWires: viewOf([[50, -28, 32], [214, -50, 0], [170, 58, 20], [60, 12, 0]]),
  cap: viewOf([[118, 28, 0], [166, 58, 34], [118, 58, 0]], 18),
  matrix: viewOf([[22, 24, 3], [58, 52, 3]], 22),
};

export const PART_NAME: Record<string, string> = {
  arduino_uno_r4_wifi: 'Arduino UNO R4 WiFi', hc_sr501_pir: 'PIR HC-SR501', ldr_gl5528: 'LDR GL5528', resistor_10k_quarter_watt: '10 kΩ resistor',
  resistor_1k_quarter_watt: '1 kΩ resistor', dupont_mm_200mm: 'M-M jumper wire', dupont_mf_200mm: 'M-F jumper wire', tactile_switch_with_green_cap: 'button + green cap',
  tactile_switch_with_red_cap: 'button + red cap', dfrobot_dfr0534: 'DFR0534 voice module', speaker_set_with_cable: 'speaker set 8 Ω 2 W',
  speaker_8ohm_2w_single: 'speaker 8 Ω 2 W', dfrobot_gravity_cable: 'Gravity cable', aishi_680uf_25v: '680 µF capacitor', kradex_z74_base: 'box: grey base',
  kradex_z74_gasket: 'box: rubber seal', kradex_z74_lid: 'box: clear lid', kradex_z74_cover_screw: 'box: 6 screws', kradex_z74_closed: 'Kradex Z74 box',
  breadboard_400: 'breadboard 400', dupont_mm_10wire_ribbon: 'jumper wires',
};

// A part render, with the caption band of the render cut off (the renders are 1200 x 900, words in the bottom 13 %).
const Thumb: React.FC<{ name: string; w: number; dim?: boolean; label?: boolean }> = ({ name, w, dim = false, label = true }) => (
  <div style={{ width: w, opacity: dim ? 0.28 : 1 }}>
    <div style={{ width: w, height: w * 0.75 * 0.86, overflow: 'hidden', borderRadius: 8, background: '#eef2f6' }}>
      <Img src={staticFile(`parts/${name}.png`)} style={{ width: w, height: w * 0.75, display: 'block' }} />
    </div>
    {label && <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginTop: 3, lineHeight: 1.15 }}>{PART_NAME[name] ?? name}</div>}
  </div>
);

// ---------- the anatomy plate: Fig n top left, title top right, hint bottom left, live readout bottom right
const USB_HINT = { out: 'USB OUT · wiring allowed', in: 'USB IN · test only, hands off the wires', micro: 'Arduino unplugged · module on micro-USB' };
const Plate: React.FC<{ n: number; title: string; hint: string; readout: string; children: React.ReactNode }> = ({ n, title, hint, readout, children }) => (
  <div style={{ position: 'absolute', left: 16, top: 8, width: 868, height: 548, background: '#fbfbfa', boxShadow: '0 0 0 1px #c9c9c4, 0 8px 22px rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 10, top: 10 }}>{children}</div>
    {[['fig', `Fig ${n}`], ['title', title.toUpperCase()], ['hint', hint.toUpperCase()], ['readout', readout]].filter(([, v]) => v).map(([k, v]) => (
      <div key={k} style={{
        position: 'absolute', fontFamily: MONO, fontSize: 12.5, letterSpacing: k === 'fig' || k === 'readout' ? 0.4 : 1.4, color: k === 'fig' || k === 'readout' ? '#45454a' : '#8c8c90',
        background: 'rgba(251,251,250,0.88)', padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap', maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis',
        ...(k === 'fig' ? { left: 12, top: 10 } : k === 'title' ? { right: 12, top: 10 } : k === 'hint' ? { left: 12, bottom: 10 } : { right: 12, bottom: 10 }),
      }}>{v}</div>
    ))}
  </div>
);

const Serial: React.FC<{ lines: string[]; h: number }> = ({ lines, h }) => (
  <div style={{ height: h, background: '#16202c', borderRadius: 10, overflow: 'hidden', fontFamily: MONO, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
    <div style={{ background: '#243242', color: '#cfe0ea', fontFamily: FONT, fontWeight: 800, fontSize: 13, padding: '6px 12px' }}>Serial Monitor · 115200 baud · example values</div>
    <div style={{ padding: '6px 10px', fontSize: 9.9, lineHeight: 1.6, color: '#d7e3ee', whiteSpace: 'pre', letterSpacing: -0.15 }}>
      {lines.slice(-Math.floor((h - 40) / 15.9)).map((l, i) => <div key={i} style={{ color: l.startsWith('>') || l.startsWith('$') ? '#8ee6a0' : '#d7e3ee' }}>{l}</div>)}
    </div>
  </div>
);

const thumbW = (n: number) => (n === 1 ? 150 : n <= 3 ? 106 : 78);
const short = (desc: string) => desc.replace(/\s*\([^)]*\)/g, '').replace(/^(.)/, (c) => c.toUpperCase());
// What this scene wires, from the same data as netcheck: waiting, going in now, or done.
const Connect: React.FC<{ sc: TScene; t: number }> = ({ sc, t }) => {
  const v = useV();
  const ids = sc.lines.flatMap((l) => l.adds);
  if (!ids.length) return null;
  const pr = v.progressAt(t), lit = v.litAt(t);
  return (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 0 0 1px #e3ddd2', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: C.muted }}>CONNECT</div>
      {ids.map((id) => {
        const it = [...ITEMS, ...FAULT_ITEMS].find((i) => i.id === id)!, p = pr(id), now = lit.includes(id) && p < 1;
        const mark = p >= 1 ? '✓' : now || p > 0 ? '●' : '○';
        return (
          <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: p > 0 ? C.ink : '#9aa3ab', background: now ? '#e7f6f6' : 'transparent', borderRadius: 6, padding: '2px 4px' }}>
            <span style={{ width: 14, flex: 'none', fontWeight: 900, color: p >= 1 ? C.green : now ? C.teal : '#b9c0c6' }}>{mark}</span>
            <span>{short(it.desc)}</span>
          </div>
        );
      })}
    </div>
  );
};
const Notes: React.FC<{ def: AScene; sc: TScene; t: number }> = ({ def, sc, t }) => {
  if (!def.notes) return null;
  const i = sc.lines.filter((l) => l.start <= t + 0.02).length - 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {def.notes.map((n, k) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 10, boxShadow: '0 0 0 1px #e3ddd2', padding: '10px 12px', fontSize: 17, fontWeight: 800, color: C.ink, opacity: i >= n.from ? 1 : 0.18 }}>
          <span style={{ fontFamily: EMOJI, fontSize: 22 }}>{n.icon}</span>{n.text}
        </div>
      ))}
    </div>
  );
};
const FaceCard: React.FC<{ face: string | null }> = ({ face }) => (
  <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 0 0 1px #e3ddd2', padding: '10px 12px' }}>
    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>THE FACE, SEEN FROM ABOVE</div>
    <svg width={340} height={150}><rect x={60} y={2} width={220} height={146} rx={10} fill="#123a3c" /><LedMatrix x0={76} y0={18} pitch={17.2} r={6} face={face} power={!!face} /></svg>
    <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted, textAlign: 'center' }}>{face ? `face ${face.replace('blink', 'happy')}` : 'no power'}</div>
  </div>
);
// The doctor's five steps (debugging guide): the one this line is about is lit, the ones done are ticked.
// soft = this case never unplugs (a software fix): its Unplug step reads "not needed" once the case is past it
const DoctorCard: React.FC<{ doc?: Doc; seen: Set<Doc>; soft: boolean }> = ({ doc, seen, soft }) => {
  const at = DOC_STEPS.findIndex((d) => d.id === doc);
  return (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 0 0 1px #e3ddd2', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: C.muted }}>THE DOCTOR'S STEPS</div>
      {DOC_STEPS.map((d, i) => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, borderRadius: 7, padding: '3px 6px', color: seen.has(d.id) ? C.ink : '#a7afb6', background: i === at ? '#e7f6f6' : 'transparent', boxShadow: i === at ? `inset 0 0 0 2px ${C.teal}` : 'none' }}>
          <span style={{ fontFamily: EMOJI, fontSize: 17, width: 22 }}>{d.icon}</span>
          <span style={{ flex: 1 }}>{d.id === 'unplug' && soft && !seen.has('unplug') && at > i ? 'Unplug: not needed, no wiring' : d.text}</span>
          {seen.has(d.id) && i !== at && <span style={{ color: C.green, fontWeight: 900 }}>✓</span>}
        </div>
      ))}
    </div>
  );
};
// the doctor's steps this case has gone through so far (up to the line being spoken)
const docsSeen = (def: AScene, sc: TScene, t: number) => new Set(def.lines.filter((l, i) => typeof l !== 'string' && l.doc && sc.lines[i] && sc.lines[i].start <= t + 0.02).map((l) => (l as { doc: Doc }).doc));
const SidePanel: React.FC<{ def: AScene; sc: TScene; t: number }> = ({ def, sc, t }) => {
  const v = useV();
  const serial = v.serialAt(sc, t);
  const st = v.stateAt(sc, t).now.s;
  const face = v.usbOutAt(t) < 0.05 ? faceAt(v, t, st) : null;
  return (
    <div style={{ position: 'absolute', left: 900, top: 8, width: 364, height: 548, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FONT }}>
      {st.faceCard ? <FaceCard face={face} /> : serial !== null ? (
        <Serial lines={serial} h={def.faceCard ? 150 : def.fault !== undefined || st.doc ? 180 : 206} />
      ) : def.need?.length ? (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 0 0 1px #e3ddd2', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: C.muted }}>YOU NEED</div>
            <RenderBadge style={{ fontSize: 10, padding: '3px 8px' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{def.need.map((n) => <Thumb key={n} name={n} w={thumbW(def.need!.length)} />)}</div>
        </div>
      ) : null}
      {def.eli5 && (
        <div style={{ background: '#e7f6f6', border: `2px solid ${C.teal}`, borderRadius: 12, padding: '9px 14px' }}>
          <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: '#fff', background: C.teal, borderRadius: 8, padding: '3px 8px' }}>ELI5</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.tealDark, lineHeight: 1.25, marginTop: 5 }}>{def.eli5}</div>
        </div>
      )}
      {def.faceCard && !st.faceCard && <FaceCard face={face} />}
      {def.fault !== undefined || st.doc ? <DoctorCard doc={st.doc} seen={docsSeen(def, sc, t)} soft={!def.lines.some((l) => typeof l !== 'string' && l.doc === 'unplug')} /> : null}
      <Notes def={def} sc={sc} t={t} />
      <Connect sc={sc} t={t} />
    </div>
  );
};

// ---------- one figure scene
type St = ReturnType<Video['stateAt']>;
const glowsOf = (st: St) => {
  const fadeIn = ease(Math.min(1, st.since / 0.4)), fadeOut = 1 - fadeIn;
  const now = st.now.s.glow.map((spec) => ({ spec, o: fadeIn }));
  const old = (st.before?.s.glow ?? []).filter((g) => !st.now.s.glow.includes(g)).map((spec) => ({ spec, o: fadeOut }));
  return [...old, ...now].filter((g) => g.o > 0.01);
};
const viewNow = (st: St) => {
  const to = VIEWS[st.now.s.view], from = st.before ? VIEWS[st.before.s.view] : to;
  return lerpView(from, to, smooth(Math.min(1, st.since / 1.2)));
};
export const faceAt = (v: Video, t: number, st: FigState) => {
  if (v.sincePlugIn(t) < 1.6) return 'offline'; // the firmware's boot face, on every plug-in
  return st.face === 'happy' ? blinkFace(t, 1) : st.face;
};

const FigureScene: React.FC<{ sc: TScene; def: AScene; t: number }> = ({ sc, def, t }) => {
  const v = useV();
  const st = v.stateAt(sc, t);
  const s = st.now.s, b = st.before?.s;
  const figFade = b && b.fig !== s.fig ? smooth(Math.min(1, st.since / 0.5)) : 1;
  const renderFade = b && s.fig === 'render' && b.render !== s.render ? smooth(Math.min(1, st.since / 0.5)) : 1;
  const usb = v.usbStateAt(t);
  const adding = v.addingAt(t);
  const readout = adding ? adding.desc : s.readout ?? def.fig?.readout ?? (usb === 'in' ? 'testing' : '');
  const liftOf = (x: FigState) => x.lift;
  const lift = b ? liftOf(b) + (liftOf(s) - liftOf(b)) * smooth(Math.min(1, st.since / 1.3)) : liftOf(s);
  const figure = (f: FigState['fig'], render?: string) => {
    switch (f) {
      case 'bench': return <Bench view={viewNow(st)} progress={v.progressAt(t)} lit={v.litAt(t)} bad={v.badAt(t)} glows={glowsOf(st)} usbOut={v.usbOutAt(t)} face={faceAt(v, t, s)} talking={v.robinTalkingAt(t) ? 0.6 + 0.4 * Math.sin(t * 14) : 0} />;
      case 'xray': return <BreadboardXray lift={lift} glow={glowsOf(st)} />;
      case 'pirFront': return <PirFront lift={lift} t={t} />;
      case 'render': return <div style={{ position: 'relative', width: FIG.w, height: FIG.h }}><RenderCard name={render!} o={renderFade} /></div>;
      case 'buttonXray': {
        const press = b ? b.press + (s.press - b.press) * smooth(Math.min(1, st.since / 0.6)) : s.press;
        return <ButtonXray press={press} gndLeg={v.progressAt(t)('f-wGG11') > 0.5 ? 'same' : 'diagonal'} lift={lift} t={t} />;
      }
      case 'network': return <NetworkFig net={s.net ?? 'ok'} t={t} face={faceAt(v, t, s)} />;
      case 'drive': return <DriveFig drive={s.drive ?? 'old'} since={st.since} />;
    }
  };
  return (
    <>
      <Plate n={def.fig?.n ?? 0} title={def.fig?.title ?? def.title} hint={def.fig?.hint ?? USB_HINT[usb]} readout={readout}>
        <div style={{ position: 'relative', width: FIG.w, height: FIG.h }}>
          {b && b.fig !== s.fig && figFade < 1 && <div style={{ position: 'absolute', inset: 0, opacity: 1 - figFade }}>{figure(b.fig, b.render)}</div>}
          {b && s.fig === 'render' && b.fig === 'render' && b.render !== s.render && renderFade < 1 && <div style={{ position: 'absolute', inset: 0 }}><RenderCard name={b.render!} o={1 - renderFade} /></div>}
          <div style={{ position: 'absolute', inset: 0, opacity: figFade }}>{figure(s.fig, s.render)}</div>
        </div>
      </Plate>
      <SidePanel def={def} sc={sc} t={t} />
    </>
  );
};

// ---------- the other screens
const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, ...style }}>{children}</div>
);
const Legend: React.FC<{ icon: string; bg: string; title: string; text: string }> = ({ icon, bg, title, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700, color: C.ink }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: bg, color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1, borderRadius: 9, padding: '5px 10px', whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: EMOJI }}>{icon}</span>{title}
    </div>
    {text}
  </div>
);
const MiniBench: React.FC<{ t: number; scale: number; left: number; top: number }> = ({ t, scale, left, top }) => (
  <div style={{ position: 'absolute', left, top, width: FIG.w, height: FIG.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
    <Bench view={FULL_VIEW} progress={finished} usbOut={0} face={blinkFace(t, 1)} />
  </div>
);

const TitleScreen: React.FC<{ t: number; def: AScene }> = ({ t, def }) => (
  <>
    <MiniBench t={t} scale={0.84} left={548} top={52} />
    <Center style={{ left: 50, top: 0, width: 470, height: 564 }}>
      <svg width={96} height={96}><rect x={4} y={4} width={88} height={88} rx={20} fill={C.teal} /><LedMatrix x0={15} y0={23} pitch={6.1} r={2.2} face={blinkFace(t, 1)} /></svg>
      <div style={{ fontSize: 58, fontWeight: 900, color: C.ink, lineHeight: 1 }}>{def.ui?.title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.muted, lineHeight: 1.3 }}>{def.ui?.sub}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 10 }}>
        <Legend icon="✏️" bg={C.purple} title="DRAWING" text="every part where it really goes" />
        <Legend icon="🔌" bg={C.green} title="USB OUT" text="the only time you wire" />
        <Legend icon="⚡" bg={C.orange} title="USB IN" text="testing: hands off" />
        <Legend icon="🤔" bg={C.blue} title="PREDICT" text="guess first, then the test shows it" />
        {def.ui?.doctor && <Legend icon="🩺" bg={C.red} title="DOCTOR" text={def.ui.doctor} />}
      </div>
    </Center>
  </>
);

const GROUPS: { id: string; label: string; parts: string[]; line: string }[] = [
  { id: 'brain', label: 'Brain + face', parts: ['arduino_uno_r4_wifi'], line: 'brain' },
  { id: 'eyes', label: 'Eyes', parts: ['hc_sr501_pir', 'ldr_gl5528'], line: 'senses' },
  { id: 'ears', label: 'Ears', parts: ['tactile_switch_with_green_cap', 'tactile_switch_with_red_cap'], line: 'senses' },
  { id: 'mouth', label: 'Mouth', parts: ['dfrobot_dfr0534', 'speaker_8ohm_2w_single'], line: 'mouth' },
  { id: 'nerves', label: 'Nerves', parts: ['breadboard_400', 'dupont_mm_10wire_ribbon'], line: 'mouth' },
  { id: 'tank', label: 'Water tank', parts: ['aishi_680uf_25v'], line: 'tank' },
  { id: 'skin', label: 'Skin', parts: ['kradex_z74_closed'], line: 'tank' },
];
const KitScreen: React.FC<{ sc: TScene; t: number }> = ({ sc, t }) => {
  const g = useV().stateAt(sc, t).now.s.group ?? 'all';
  const big = g === 'spares' ? 'inventory_full_quantities' : 'all_materials_overview';
  return (
    <>
      <div style={{ position: 'absolute', left: 16, top: 8, width: 640, height: 548, background: '#eef2f6', borderRadius: 6, boxShadow: '0 0 0 1px #d6dbe0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 640, height: 480 * 0.87, overflow: 'hidden' }}>
          <Img src={staticFile(`parts/${big}.png`)} style={{ width: 640, height: 480, display: 'block' }} />
        </div>
        <div style={{ position: 'absolute', left: 20, bottom: 16, right: 20, fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>
          {g === 'spares' ? 'Everything, with the full quantities: the spares too.' : 'Everything we ordered (16 lines) plus the UNO R4 WiFi from school.'}
        </div>
        <RenderBadge style={{ position: 'absolute', left: 16, top: 14 }} />
      </div>
      <div style={{ position: 'absolute', left: 672, top: 8, width: 592, height: 548, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: FONT }}>
        {GROUPS.map((gr) => {
          const on = g === 'all' || g === 'spares' || gr.line === g;
          return (
            <div key={gr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 72, background: on ? '#fff' : 'transparent', borderRadius: 10, boxShadow: on ? '0 0 0 1px #e3ddd2' : 'none', padding: '0 10px', opacity: on ? 1 : 0.35 }}>
              <div style={{ width: 120, fontSize: 18, fontWeight: 900, color: on ? C.tealDark : C.muted }}>{gr.label}</div>
              {gr.parts.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, width: 222 }}>
                  <Thumb name={p} w={84} label={false} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, lineHeight: 1.15 }}>{PART_NAME[p]}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
};

const FilesScreen: React.FC<{ sc: TScene; def: AScene; t: number }> = ({ sc, def, t }) => {
  const copy = sc.lines[3], ui = def.ui ?? {};
  const n = copy ? Math.max(0, Math.min(13, Math.floor(((t - copy.start) / Math.max(1, copy.end - copy.start)) * 15))) : 0;
  const micro = useV().usbStateAt(t) === 'micro';
  return (
    <>
      <div style={{ position: 'absolute', left: 16, top: 8, width: 520, height: 548, background: '#fbfbfa', boxShadow: '0 0 0 1px #c9c9c4', borderRadius: 4, overflow: 'hidden' }}>
        <RenderCard name="dfrobot_dfr0534" w={520} h={548} />
        <div style={{ position: 'absolute', right: 16, top: 16, display: 'flex', alignItems: 'center', gap: 8, background: micro ? C.purple : '#9e9e9e', color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 15, borderRadius: 10, padding: '6px 12px' }}>
          <span style={{ fontFamily: EMOJI }}>💽</span>{micro ? 'micro-USB → laptop' : 'micro-USB not connected'}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 552, top: 8, width: 712, height: 380, background: '#fff', borderRadius: 10, boxShadow: '0 8px 22px rgba(0,0,0,0.12), 0 0 0 1px #ddd', overflow: 'hidden', fontFamily: FONT, opacity: micro || n > 0 ? 1 : 0.4 }}>
        <div style={{ background: '#eceff3', padding: '9px 14px', fontWeight: 900, fontSize: 16, color: C.ink }}><span style={{ fontFamily: EMOJI }}>💾</span> {ui.drive}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 10px', padding: 16 }}>
          {Array.from({ length: 13 }, (_, i) => (
            <div key={i} style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.ink, background: '#f3f6f9', borderRadius: 6, padding: '8px 10px', opacity: i < n ? 1 : 0.12 }}>
              <span style={{ fontFamily: EMOJI }}>🎵</span> {String(i + 1).padStart(2, '0')}.mp3
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 16, bottom: 12, fontSize: 15, fontWeight: 700, color: C.muted }}>{ui.files}</div>
      </div>
      <div style={{ position: 'absolute', left: 552, top: 404, width: 712, height: 152, background: '#fff4e5', border: `3px solid ${C.orange}`, borderRadius: 12, boxSizing: 'border-box', padding: '14px 18px', fontFamily: FONT }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#8a4b00' }}><span style={{ fontFamily: EMOJI }}>⚠️</span> {ui.warn}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginTop: 8, lineHeight: 1.35 }}>Otherwise the laptop's USB and the Arduino's 5 V are joined. The Arduino stays unplugged too.</div>
      </div>
    </>
  );
};

const EndScreen: React.FC<{ t: number; def: AScene }> = ({ t, def }) => (
  <>
    <MiniBench t={t} scale={0.72} left={640} top={60} />
    <Center style={{ left: 50, top: 0, width: 600, height: 564 }}>
      <div style={{ fontSize: 54, fontWeight: 900, color: C.ink }}>{def.ui?.head ?? "That's Robin."}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.muted, lineHeight: 1.4 }}>{def.ui?.recap}</div>
      <div style={{ alignSelf: 'flex-start', fontSize: 20, fontWeight: 900, color: '#fff', background: C.teal, borderRadius: 14, padding: '8px 16px' }}>{def.ui?.rule}</div>
      <div style={{ marginTop: 8 }}><Legend icon="✏️" bg={C.purple} title="DRAWINGS" text={def.ui?.drawings ?? 'they explain; your own photos prove the build'} /></div>
    </Center>
  </>
);

// ---------- scenes in the timeline, overlay, narration
const SceneHost: React.FC<{ sc: TScene; len: number; first: boolean }> = ({ sc, len, first }) => {
  const v = useV();
  const f = useCurrentFrame();
  const t = sc.start + Math.min(f, len - 1) / v.FPS; // global seconds; hold the last frame while the next fades in
  const o = first ? 1 : interpolate(f, [0, FADE_FRAMES(v)], [0, 1], { extrapolateRight: 'clamp', easing: smooth });
  const def = v.defOf(sc.id);
  return (
    <div style={{ position: 'absolute', left: 0, top: 60, width: 1280, height: 564, background: C.bg, opacity: o, overflow: 'hidden', fontFamily: FONT, color: C.ink }}>
      {def.kind === 'title' ? <TitleScreen t={t} def={def} />
        : def.kind === 'kit' ? <KitScreen sc={sc} t={t} />
        : def.kind === 'files' ? <FilesScreen sc={sc} def={def} t={t} />
        : def.kind === 'end' ? <EndScreen t={t} def={def} />
        : def.kind === 'loop' ? <LoopScreen sc={sc} def={def} t={t} />
        : <FigureScene sc={sc} def={def} t={t} />}
    </div>
  );
};

const USB_TEXT = {
  out: { icon: '🔌', title: 'USB OUT', sub: 'wiring is allowed', bg: '#2e9e4f' },
  in: { icon: '⚡', title: 'USB IN', sub: 'testing: hands off the wires', bg: '#f57c00' },
  micro: { icon: '💽', title: 'Arduino USB OUT', sub: 'module alone on micro-USB', bg: '#7e57c2' },
};
const Overlay: React.FC = () => {
  const v = useV();
  const t = useCurrentFrame() / v.FPS;
  const sc = v.sceneAt(t);
  const cap = v.captionAt(t);
  const usb = USB_TEXT[v.usbStateAt(t)];
  const showBadge = sc.part !== 'Welcome';
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1280, height: 60, background: C.bar, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: FONT, zIndex: 10 }}>
        <svg width={60} height={60} style={{ position: 'absolute', left: 10, top: 0 }}>
          <rect x={8} y={8} width={44} height={44} rx={10} fill={C.teal} />
          <LedMatrix x0={13.5} y0={16} pitch={3.0} r={1.1} face={blinkFace(t, 1)} />
        </svg>
        <div style={{ position: 'absolute', left: 72, top: 8, fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: C.teal }}>{v.cfg.label}</div>
        <div style={{ position: 'absolute', left: 72, top: 25, fontSize: 22, fontWeight: 900, color: C.ink, whiteSpace: 'nowrap' }}>{sc.title}</div>
        <div style={{ position: 'absolute', right: showBadge ? 300 : 20, top: 14, fontSize: 16, fontWeight: 900, color: '#fff', background: sc.step ? C.orange : C.purple, borderRadius: 16, padding: '5px 14px' }}>{sc.step ?? sc.part}</div>
        {showBadge && (
          <div style={{ position: 'absolute', right: 14, top: 7, width: 270, height: 46, borderRadius: 12, background: usb.bg, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', boxSizing: 'border-box' }}>
            <div style={{ fontFamily: EMOJI, fontSize: 24 }}>{usb.icon}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.1 }}>{usb.title}</div>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.95 }}>{usb.sub}</div>
            </div>
          </div>
        )}
        <div style={{ position: 'absolute', left: 0, top: 57, height: 3, width: (t / v.TL.total) * 1280, background: C.teal }} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 624, width: 1280, height: 96, background: C.bar, boxShadow: '0 -2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 60px', boxSizing: 'border-box', fontFamily: FONT, zIndex: 10 }}>
        {cap && cap.kind === 'robin' && <div style={{ background: C.teal, color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: 1.5, borderRadius: 14, padding: '5px 12px' }}>ROBIN</div>}
        {cap && cap.kind === 'pause' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.blue, color: '#fff', fontWeight: 900, fontSize: 22, borderRadius: 26, padding: '10px 26px' }}><span style={{ fontFamily: EMOJI }}>🤔</span> {cap.cap}  ·  {Math.ceil(cap.end - t)}</div>
        ) : cap ? (
          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.28, textAlign: 'center', color: cap.kind === 'robin' ? C.tealDark : C.ink, fontStyle: cap.kind === 'robin' ? 'italic' : 'normal', maxWidth: 1120 }}>
            {cap.kind === 'robin' ? `“${cap.cap}”` : cap.cap}
          </div>
        ) : null}
      </div>
    </>
  );
};

export const IsoVideo: React.FC<{ v: Video }> = ({ v }) => (
  <VCtx.Provider value={v}>
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      {v.TL.scenes.map((sc, i) => {
        const f0 = Math.round(sc.start * v.FPS);
        const f1 = i + 1 < v.TL.scenes.length ? Math.round(v.TL.scenes[i + 1].start * v.FPS) : v.TOTAL_FRAMES;
        const last = i === v.TL.scenes.length - 1;
        return (
          <Sequence key={sc.id} from={f0} durationInFrames={f1 - f0 + (last ? 0 : FADE_FRAMES(v))} name={sc.id} layout="none">
            <SceneHost sc={sc} len={f1 - f0} first={i === 0} />
          </Sequence>
        );
      })}
      <Overlay />
      {!v.TL.draft && <Html5Audio src={staticFile(v.cfg.audio)} />}
    </AbsoluteFill>
  </VCtx.Provider>
);
