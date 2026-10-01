import React from 'react';
import { camBox, clamp, H, lerp, P, prog, win } from '../data/geom';
import { pirPin } from '../data/modules';
import { Abs, Card, Emoji, fadeStyle, popStyle, Ring, Stage, Tag, Term, TermEvent } from '../kit/basics';
import { Button, Pir, PirBack } from '../kit/hardware';
import { C } from '../theme';
import { BenchScene, SceneFC, VIEWS } from './util';

const RAW = (pir: number, light: number, yes = '-', no = '-') => `pir_raw=${pir} (HIGH if > 400)  light_raw=${light}  yes=${yes}  no=${no}`;
const jit = (base: number, amp: number, i: number) => base + Math.round(Math.sin(i * 2.7 + base) * amp);
const burst = (t0: number, n: number, f: (i: number) => string): TermEvent[] => [
  { t: t0, type: 'type', text: 'raw' }, { t: t0 + 0.3, text: '[cmd] raw' },
  ...Array.from({ length: n }, (_, i) => ({ t: t0 + 0.4 + i * 0.1, text: f(i) })),
];
const UNPLUG: React.FC<{ o: number }> = ({ o }) => (
  <Abs x={930} y={488} style={{ ...popStyle(o), background: C.green, color: '#fff', borderRadius: 18, padding: '8px 16px', fontSize: 20, fontWeight: 900 }}>🔌 Unplug before the next step</Abs>
);

// ---------------------------------------------------------------------------------------------
export const Step1: SceneFC = ({ t, T, ui }) => {
  const v = P('5V'), g = P('GND'), hp = H(2, '+b'), hm = H(1, '-b');
  return (
    <BenchScene t={t} T={T} upto={0} view={VIEWS[1]}>
      <Ring x={v.x} y={v.y} t={t} on={t > T.s(1) && t < T.s(1) + 3} color="#e53935" r={7} />
      <Ring x={hp.x} y={hp.y} t={t} on={t > T.s(1) + 2 && t < T.s(2)} color="#e53935" r={7} />
      <Ring x={g.x} y={g.y} t={t} on={t > T.s(2) && t < T.s(2) + 3} color="#212121" r={7} />
      <Ring x={hm.x} y={hm.y} t={t} on={t > T.s(2) + 2 && t < T.s(3)} color="#1e63d6" r={7} />
      <Tag x={v.x} y={v.y} text={ui.t5v} o={win(t, T.s(1), T.s(4))} dx={-20} dy={36} size={12} color="#e53935" />
      <Tag x={g.x} y={g.y} text={ui.tgnd} o={win(t, T.s(2), T.s(4))} dx={24} dy={40} size={12} color={C.ink} />
      <Tag x={hp.x + 60} y={hp.y} text={ui.tplus} o={win(t, T.s(1) + 1.5, T.s(4))} dx={60} dy={28} size={12} color="#e53935" />
      <Tag x={hm.x + 60} y={hm.y} text={ui.tminus} o={win(t, T.s(2) + 1.5, T.s(4))} dx={70} dy={-30} size={12} color="#1e63d6" />
    </BenchScene>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step2a: SceneFC = ({ t, T, ui }) => {
  // live divider: slider from dark (1 MOhm) to bright (5 kOhm)
  const light = 0.5 + 0.5 * Math.sin((t - T.s(3)) * 0.9);
  const on = t > T.s(3);
  const R = on ? Math.exp(lerp(Math.log(1e6), Math.log(5e3), light)) : 15e3;
  const Va = (5 * 10e3) / (10e3 + R), adc = Math.round((Va / 5) * 1023);
  const fmt = (r: number) => (r >= 1e6 ? `${(r / 1e6).toFixed(1)} MΩ` : `${(r / 1e3).toFixed(0)} kΩ`);
  return (
    <>
      <Stage>
        <g opacity={clamp(prog(t, T.s(2), 0.5))} transform="translate(120 40)">
          <text x={0} y={30} fontSize={26} fontWeight={900} fill="#e53935">5 V</text>
          <line x1={80} y1={22} x2={80} y2={70} stroke={C.ink} strokeWidth={4} />
          <rect x={60} y={70} width={40} height={100} rx={8} fill="#e2553f" /><text x={120} y={128} fontSize={22} fontWeight={900}>LDR</text>
          <line x1={80} y1={170} x2={80} y2={230} stroke={C.ink} strokeWidth={4} />
          <circle cx={80} cy={200} r={7} fill={C.orange} /><line x1={80} y1={200} x2={260} y2={200} stroke={C.orange} strokeWidth={4} />
          <text x={272} y={208} fontSize={24} fontWeight={900} fill={C.orange}>A0</text>
          <rect x={60} y={230} width={40} height={100} rx={8} fill="#e3cf9c" stroke="#b59a5a" strokeWidth={2} /><text x={120} y={288} fontSize={22} fontWeight={900}>10 kΩ</text>
          <line x1={80} y1={330} x2={80} y2={380} stroke={C.ink} strokeWidth={4} />
          <text x={50} y={410} fontSize={26} fontWeight={900} fill="#1e63d6">GND</text>
        </g>
        <Emoji x={100} y={120} ch={on ? (light > 0.5 ? '☀️' : '🌙') : '💡'} size={54} o={clamp(prog(t, T.s(0), 0.5))} />
      </Stage>
      <Abs x={620} y={40} w={600} style={{ ...fadeStyle(prog(t, T.s(3), 0.5)), background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 6px 18px rgba(29,43,58,0.12)' }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>R_LDR = {fmt(R)}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.orange }}>V(A0) = {Va.toFixed(2)} V</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.teal }}>analogRead = {adc}</div>
        <div style={{ marginTop: 10, height: 18, background: '#eee', borderRadius: 9 }}><div style={{ width: `${(adc / 1023) * 100}%`, height: 18, background: C.orange, borderRadius: 9 }} /></div>
      </Abs>
      <Card x={620} y={260} w={600} icon="🧮" title={ui.formula} color={C.orange} size={20} anim={popStyle(prog(t, T.s(3) + 1, 0.5))} />
      <Card x={620} y={380} w={290} icon="🌙" title={ui.dark} color="#1d2b3a" size={20} anim={popStyle(prog(t, T.s(4), 0.5))} />
      <Card x={930} y={380} w={290} icon="🏠" title={ui.room} color={C.green} size={20} anim={popStyle(prog(t, T.s(4) + 1.5, 0.5))} />
    </>
  );
};

export const Step2b: SceneFC = ({ t, T, ui }) => {
  const c5 = H(5, 'h');
  return (
    <BenchScene t={t} T={T} upto={1} view={VIEWS[2]} bench={{ xray: 0 }}
      html={<>
        <Card x={30} y={20} w={560} icon="🎨" title={ui.bands} text={ui.bag} color="#6d3b1f" size={17} anim={popStyle(win(t, T.s(1), T.s(3) + 1, 0.4))} />
        <Card x={30} y={440} w={560} icon="↔️" title="No + or − on the LDR and the resistor" color={C.green} size={17} anim={popStyle(prog(t, T.s(4), 0.4))} />
      </>}>
      <Tag x={c5.x} y={c5.y} text={ui.col5} o={win(t, T.s(0) + 2, T.s(3))} dx={120} dy={-75} size={12} color="#b26a00" />
    </BenchScene>
  );
};

export const Step2c: SceneFC = ({ t, T, ui }) => {
  const lh = H(4, 'j');
  const t1 = T.s(0) + 3, t2 = T.s(1) + 1, t3 = T.s(1) + 4.5;
  const events = [...burst(t1, 6, (i) => RAW(jit(305, 25, i), jit(455, 5, i))), ...burst(t2, 6, (i) => RAW(jit(305, 25, i), jit(62, 5, i))), ...burst(t3, 6, (i) => RAW(jit(305, 25, i), jit(893, 12, i)))];
  return (
    <BenchScene t={t} T={T} upto={2} view={camBox(690, 360, 600)}
      html={<>
        <Term x={650} y={20} w={610} h={400} t={t} events={events} anim={fadeStyle(prog(t, T.s(0) + 1.5, 0.4))} />
        <Card x={30} y={440} w={600} icon="ℹ️" title={ui.note} color="#7b8794" size={15} anim={popStyle(prog(t, t1 + 1, 0.4))} />
        <Card x={650} y={440} w={610} icon="🔧" title={ui.fix} color={C.red} size={15} anim={popStyle(prog(t, T.s(3), 0.4))} />
        <UNPLUG o={prog(t, T.s(2), 0.4)} />
      </>}>
      <g opacity={win(t, t2, t3, 0.25)}>
        <ellipse cx={lh.x} cy={lh.y - 30} rx={22} ry={15} fill="#f1c9a5" stroke="#c48f6a" strokeWidth={2} />
      </g>
      <g opacity={win(t, t3, T.s(2), 0.25)}>
        <polygon points={`${lh.x - 8},${lh.y - 38} ${lh.x + 90},${lh.y - 150} ${lh.x + 140},${lh.y - 100}`} fill="#fff59d" opacity={0.75} />
        <Emoji x={lh.x + 128} y={lh.y - 138} ch="🔦" size={34} />
      </g>
    </BenchScene>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step3a: SceneFC = ({ t, T, ui }) => {
  const dome = 1 - prog(t, T.s(1) + 0.8, 1.0) + prog(t, T.s(2) + 2.5, 1.0);
  return (
    <>
      <Stage>
        <g transform="translate(380 40) scale(3.2)"><Pir x={0} y={0} dome={clamp(dome)} /></g>
      </Stage>
      <Card x={30} y={30} w={330} icon="🔥" title="Sees warm bodies move" text="Not faces, not identity." color={C.green} size={18} anim={popStyle(prog(t, T.s(0) + 1, 0.5))} />
      <Card x={880} y={140} w={370} icon="🏷️" title={ui.labels} color={C.purple} size={18} anim={popStyle(prog(t, T.s(1) + 2, 0.5))} />
      <Card x={880} y={300} w={370} icon="👉" title={ui.yours} color={C.orange} size={18} anim={popStyle(prog(t, T.s(2), 0.5))} />
    </>
  );
};

export const Step3b: SceneFC = ({ t, T, ui }) => (
  <>
    <Stage>
      <g transform="translate(360 30) scale(3.4)">
        <PirBack x={0} y={0} txDeg={-150 * clamp(prog(t, T.s(1) + 1, 1.5))} sxDeg={0} jumper={t > T.s(3) + 1 ? 'H' : 'L'} />
      </g>
      <Emoji x={300} y={420} ch="🪛" size={60} o={win(t, T.s(0) + 1, T.s(2) + 2)} />
    </Stage>
    <Card x={30} y={30} w={320} icon="⏱️" title={ui.tx} color={C.orange} size={17} anim={popStyle(prog(t, T.s(1), 0.5))} />
    <Card x={930} y={30} w={320} icon="🎚️" title={ui.sx} color={C.teal} size={17} anim={popStyle(prog(t, T.s(2), 0.5))} />
    <Card x={930} y={200} w={320} icon="🔁" title={ui.jumper} color={C.purple} size={17} anim={popStyle(prog(t, T.s(3), 0.5))} />
  </>
);

export const Step3c: SceneFC = ({ t, T, ui }) => {
  const [v, o, g] = ['VCC', 'OUT', 'GND'].map((n) => pirPin(n));
  return (
    <BenchScene t={t} T={T} upto={2} view={VIEWS[3]}>
      <Tag x={v.x} y={v.y} text={ui.vcc} o={win(t, T.s(1), T.s(3) + 3)} dx={-60} dy={30} size={12} color="#e53935" />
      <Tag x={g.x} y={g.y} text={ui.gnd} o={win(t, T.s(2), T.s(3) + 3)} dx={70} dy={20} size={12} color={C.ink} />
      <Tag x={o.x} y={o.y} text={ui.out} o={win(t, T.s(3), T.dur)} dx={20} dy={70} size={12} color={C.orange} />
      <Tag x={pirPin('OUT').x} y={pirPin('OUT').y - 110} text="labels: go by YOUR sensor" o={win(t, T.s(0) + 2, T.s(1) + 2)} dy={-20} size={12} color={C.purple} />
    </BenchScene>
  );
};

export const Step3d: SceneFC = ({ t, T, ui }) => {
  const barX = 140, barW = 1000, v2x = (v: number) => barX + (v / 5) * barW;
  return (
    <>
      <Stage>
        <g opacity={clamp(prog(t, T.s(0), 0.5))}>
          <rect x={barX} y={150} width={barW} height={40} rx={10} fill="#eef2f5" stroke="#c9d3db" />
          <rect x={v2x(3.5)} y={150} width={v2x(5) - v2x(3.5)} height={40} fill="#c8e6c9" opacity={clamp(prog(t, T.s(1), 0.5))} />
          {[0, 1, 2, 3, 4, 5].map((v) => <text key={v} x={v2x(v)} y={220} fontSize={18} fontWeight={800} textAnchor="middle" fill={C.muted}>{v} V</text>)}
          <line x1={v2x(3.3)} y1={130} x2={v2x(3.3)} y2={210} stroke={C.orange} strokeWidth={5} />
          <text x={v2x(3.3)} y={118} fontSize={20} fontWeight={900} fill={C.orange} textAnchor="middle">{ui.pir}</text>
          <text x={v2x(4.25)} y={176} fontSize={17} fontWeight={900} fill="#2e7d32" textAnchor="middle" opacity={clamp(prog(t, T.s(1), 0.5))}>{ui.dig}</text>
        </g>
        <g opacity={clamp(prog(t, T.s(2), 0.5))}>
          <rect x={barX} y={300} width={barW} height={40} rx={10} fill="#eef2f5" stroke="#c9d3db" />
          <rect x={barX} y={300} width={(675 / 1023) * barW} height={40} rx={10} fill={C.teal} opacity={0.8} />
          <line x1={barX + (400 / 1023) * barW} y1={286} x2={barX + (400 / 1023) * barW} y2={354} stroke="#e53935" strokeWidth={4} strokeDasharray="0" />
          <text x={barX + (400 / 1023) * barW} y={378} fontSize={16} fontWeight={900} fill="#e53935" textAnchor="middle">400</text>
          <text x={barX + (675 / 1023) * barW + 10} y={328} fontSize={20} fontWeight={900} fill={C.teal}>675</text>
          <text x={barX} y={420} fontSize={20} fontWeight={900} fill={C.ink}>{ui.ana}</text>
        </g>
      </Stage>
    </>
  );
};

export const Step3e: SceneFC = ({ t, T, ui }) => {
  const warmP = prog(t, T.s(0) + 2, 4.5);
  const t1 = T.s(1) + 0.8, t2 = T.s(1) + 4.2;
  const events = [...burst(t1, 6, (i) => RAW(jit(1, 1, i), jit(455, 4, i))), ...burst(t2, 8, (i) => RAW(jit(684, 16, i), jit(452, 4, i)))];
  const pc = pirPin('OUT');
  return (
    <BenchScene t={t} T={T} upto={3} view={camBox(900, 330, 560)}
      html={<>
        <Abs x={40} y={30} w={520} style={{ ...fadeStyle(prog(t, T.s(0) + 1.5, 0.4)), background: C.ink, color: '#fff', borderRadius: 16, padding: '16px 22px' }}>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{warmP < 1 ? `${ui.warm} ${Math.ceil(60 * (1 - warmP))} s` : ui.ready}</div>
          <div style={{ height: 14, background: C.orange, borderRadius: 7, marginTop: 10, width: `${warmP * 100}%` }} />
        </Abs>
        <Term x={40} y={160} w={600} h={300} t={t} events={events} anim={fadeStyle(prog(t, T.s(1), 0.4))} />
        <Card x={660} y={330} w={590} icon="🔧" title={ui.fix} color={C.red} size={15} anim={popStyle(prog(t, T.s(3), 0.4))} />
        <UNPLUG o={prog(t, T.s(2), 0.4)} />
      </>}>
      <Emoji x={pc.x - 130} y={pc.y - 110} ch="👋" size={52} o={t > t2 - 0.3 && t < T.s(1) + 8 && t < T.s(2) ? 1 : 0} rotate={Math.sin(t * 9) * 18} />
    </BenchScene>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step4a: SceneFC = ({ t, T, ui }) => {
  const pressed = t > T.s(2) + 1 && ((t - T.s(2)) % 3) < 1.5;
  const bounce = t > T.s(3);
  return (
    <>
      <Stage>
        <g opacity={clamp(prog(t, T.s(1), 0.5))}>
          <rect x={70} y={30} width={300} height={290} rx={16} fill="#e0f2f1" stroke={C.teal} strokeWidth={3} strokeDasharray="10 7" />
          <text x={90} y={60} fontSize={18} fontWeight={900} fill={C.teal}>{ui.inside}</text>
          <text x={120} y={100} fontSize={20} fontWeight={900} fill="#e53935">5 V</text>
          <rect x={200} y={110} width={30} height={80} rx={6} fill="#e3cf9c" stroke="#b59a5a" /><text x={240} y={158} fontSize={16} fontWeight={800}>{ui.pullup}</text>
          <line x1={215} y1={80} x2={215} y2={110} stroke={C.ink} strokeWidth={3} />
          <line x1={215} y1={190} x2={215} y2={250} stroke={C.ink} strokeWidth={3} />
          <circle cx={215} cy={250} r={8} fill={pressed ? '#1e63d6' : '#e53935'} /><text x={235} y={258} fontSize={20} fontWeight={900}>D2</text>
          <line x1={215} y1={250} x2={520} y2={250} stroke={C.ink} strokeWidth={3} />
          <line x1={520} y1={250} x2={pressed ? 600 : 590} y2={pressed ? 250 : 215} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
          <line x1={600} y1={250} x2={700} y2={250} stroke={C.ink} strokeWidth={3} />
          <text x={710} y={258} fontSize={20} fontWeight={900} fill="#1e63d6">GND</text>
          <text x={430} y={330} fontSize={26} fontWeight={900} fill={pressed ? '#1e63d6' : '#e53935'}>{pressed ? ui.low : ui.high}</text>
        </g>
        <g opacity={clamp(prog(t, T.s(3), 0.5))} transform="translate(800 320)">
          <text x={0} y={0} fontSize={20} fontWeight={900} fill={C.ink}>{ui.debounce}</text>
          <polyline points={bounce ? '0,70 60,70 62,20 66,70 70,20 75,70 80,20 86,20 400,20' : '0,70 400,70'} fill="none" stroke={C.purple} strokeWidth={4} />
          <rect x={60} y={10} width={80} height={80} fill={C.orange} opacity={0.15} />
        </g>
      </Stage>
    </>
  );
};

export const Step4b: SceneFC = ({ t, T, ui }) => {
  // big close-up of one 12x12 button across the gap: legs in rows d and g, two columns apart
  const p = 40, x0 = 360, rows = 'abcdefghij', rowYc = (r: string) => { const i = rows.indexOf(r); return 70 + (i < 5 ? i : i + 2) * p; };
  const cols = [8, 9, 10, 11, 12, 13, 14, 15, 16];
  const cx = (c: number) => x0 + (c - 8) * p;
  const tl = { x: cx(11), y: rowYc('d') }, tr = { x: cx(13), y: rowYc('d') }, bl = { x: cx(11), y: rowYc('g') }, br = { x: cx(13), y: rowYc('g') };
  const diag = t > T.s(1) + 1;
  return (
    <>
      <Stage>
        <rect x={x0 - 30} y={40} width={cols.length * p + 20} height={11 * p + 10} rx={12} fill="#f6f3ec" stroke="#d8d1c3" strokeWidth={2} />
        <rect x={x0 - 24} y={rowYc('e') + p * 0.6} width={cols.length * p + 8} height={p * 0.8} rx={4} fill="#e3ddd0" />
        {cols.map((c) => rows.split('').map((r) => <rect key={`${c}${r}`} x={cx(c) - 4} y={rowYc(r) - 4} width={8} height={8} rx={1.5} fill="#3b3b3b" />))}
        {cols.map((c) => <text key={c} x={cx(c)} y={34} fontSize={14} fontWeight={800} textAnchor="middle" fill="#8a8272">{c}</text>)}
        {rows.split('').map((r) => <text key={r} x={x0 - 44} y={rowYc(r) + 5} fontSize={14} fontWeight={800} textAnchor="middle" fill="#8a8272">{r}</text>)}
        <Button tl={tl} tr={tr} bl={bl} br={br} cap="#2e9e4f" showLegs={t > T.s(0) + 1} />
        <g opacity={win(t, T.s(0) + 2, T.s(1) + 1)}>
          <line x1={tl.x} y1={tl.y} x2={bl.x} y2={bl.y} stroke={C.orange} strokeWidth={6} strokeLinecap="round" />
          <line x1={tr.x} y1={tr.y} x2={br.x} y2={br.y} stroke={C.orange} strokeWidth={6} strokeLinecap="round" />
        </g>
        {diag && <line x1={tl.x} y1={tl.y} x2={br.x} y2={br.y} stroke={C.green} strokeWidth={6} strokeDasharray="10 8" strokeLinecap="round" />}
      </Stage>
      <Card x={30} y={30} w={290} icon="🔗" title={ui.always} text="(orange pairs, inside the button)" color={C.orange} size={17} anim={popStyle(win(t, T.s(0) + 2, T.s(1) + 1, 0.4))} />
      <Card x={30} y={180} w={290} icon="↘️" title={ui.diag} color={C.green} size={18} anim={popStyle(prog(t, T.s(1) + 1, 0.4))} />
      <Card x={950} y={60} w={300} icon="📏" title={ui.big} color={C.teal} size={17} anim={popStyle(prog(t, T.s(2), 0.4))} />
      <Card x={950} y={260} w={300} icon="⛔" title={ui.never} text="only − rail and a D pin" color={C.red} size={18} anim={popStyle(prog(t, T.s(3), 0.4))} />
    </>
  );
};

export const Step4c: SceneFC = ({ t, T, ui }) => (
  <BenchScene t={t} T={T} upto={3} view={VIEWS[4]}
    html={<>
      {/* one card at a time, left of the breadboard, so no hole of the button wiring is hidden */}
      <Card x={30} y={440} w={420} icon="🟢" title={ui.g} color={C.green} size={16} anim={popStyle(win(t, T.s(1), T.s(3) - 0.2, 0.4))} />
      <Card x={30} y={440} w={420} icon="🔴" title={ui.r} color={C.red} size={16} anim={popStyle(prog(t, T.s(3), 0.4))} />
    </>}>
    <Ring x={H(11, 'b').x} y={H(11, 'b').y} t={t} on={t > T.s(1) && t < T.s(2)} color="#2e9e4f" r={6} />
    <Ring x={H(13, 'i').x} y={H(13, 'i').y} t={t} on={t > T.s(2) && t < T.s(3)} color="#212121" r={6} />
  </BenchScene>
);

export const Step4d: SceneFC = ({ t, T, ui }) => {
  const t1 = T.s(0) + 3;
  const holdG = t > t1 + 0.8 && t < T.s(2);
  const events = [...burst(t1, 8, (i) => RAW(jit(2, 1, i), jit(455, 4, i), i >= 2 ? 'pressed' : '-')), { t: T.s(1) + 1, text: '[button] yes', color: '#8ee6a0' }];
  return (
    <BenchScene t={t} T={T} upto={4} view={camBox(640, 240, 640)} face={holdG && t > T.s(1) ? 'yes' : undefined} bench={{ pressed: holdG ? ['btnG'] : [] }}
      html={<>
        <Term x={650} y={20} w={610} h={390} t={t} events={events} anim={fadeStyle(prog(t, T.s(0) + 2, 0.4))} />
        <Card x={30} y={440} w={600} icon="🔧" title={ui.fix} color={C.red} size={16} anim={popStyle(prog(t, T.s(3), 0.4))} />
        <UNPLUG o={prog(t, T.s(2), 0.4)} />
      </>}>
      <Emoji x={H(12, 'e').x + 10} y={H(12, 'e').y - 30} ch="👆" size={40} o={holdG ? 1 : 0} />
    </BenchScene>
  );
};
