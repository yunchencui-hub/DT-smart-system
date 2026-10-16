import { camBox, clamp, prog } from '../data/geom';
import { ITEMS } from '../data/wiring';
import { Abs, Card, fadeStyle, Pill, popStyle, riseStyle, Stage, Table, Term } from '../kit/basics';
import { blinkFace, LedMatrix, Robot } from '../kit/hardware';
import { TROUBLE_ROWS } from '../script/scenes';
import { C, EMOJI } from '../theme';
import { BenchScene, SceneFC, VIEWS } from './util';

// ---------------------------------------------------------------------------------------------
export const Step6: SceneFC = ({ t, T, ui }) => {
  const seq: [number, string][] = [[T.s(1) + 1.5, 'ask'], [T.s(1) + 3.5, 'concern'], [T.s(1) + 5.5, 'sleep'], [T.s(1) + 7.5, 'happy']];
  let face: string = blinkFace(t);
  for (const [ts, f] of seq) if (t >= ts) face = f === 'happy' ? blinkFace(t) : f;
  const events = seq.flatMap(([ts, f]) => [{ t: ts - 1, type: 'type' as const, text: `face ${f}` }, { t: ts, text: `[cmd] face ${f}` }]);
  const names = ['happy', 'blink', 'talk', 'ask', 'concern', 'sleep', 'yes', 'no', 'offline'];
  return (
    <BenchScene t={t} T={T} upto={5} view={camBox(385, 314, 460)} face={t > T.s(1) + 0.6 ? face : undefined}
      html={<>
        <Term x={640} y={20} w={620} h={250} t={t} events={events} anim={fadeStyle(prog(t, T.s(1), 0.4))} />
        <Abs x={640} y={290} w={620} style={{ ...fadeStyle(prog(t, T.s(2), 0.5)), background: '#fff', borderRadius: 14, padding: 12, boxShadow: '0 6px 18px rgba(29,43,58,0.12)' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.muted, marginBottom: 6 }}>{ui.src}</div>
          <svg width={596} height={150}>
            {names.map((n, i) => (
              <g key={n} transform={`translate(${(i % 5) * 119} ${Math.floor(i / 5) * 76})`}>
                <rect x={0} y={0} width={110} height={58} rx={6} fill="#0b6d71" />
                <LedMatrix x0={8} y0={7} pitch={8.6} r={3} face={n} />
                <text x={55} y={72} fontSize={12} fontWeight={800} textAnchor="middle" fill={C.ink}>{n}</text>
              </g>
            ))}
          </svg>
        </Abs>
        <Abs x={640} y={500} style={{ ...popStyle(prog(t, T.s(3), 0.4)), background: C.green, color: '#fff', borderRadius: 18, padding: '8px 16px', fontSize: 20, fontWeight: 900 }}>🔌 Unplug</Abs>
      </>} />
  );
};

// ---------------------------------------------------------------------------------------------
export const Step7: SceneFC = ({ t, T, ui }) => {
  const online = t > T.s(3) + 1;
  const events = [
    { t: T.s(3) + 0.5, type: 'type' as const, text: 'mosquitto_sub -t "robin/#" -v' },
    { t: T.s(3) + 3, text: 'robin/robin-01/status {"online":true,…}', color: '#8ee6a0' },
    { t: T.s(3) + 3.8, text: 'robin/robin-01/telemetry {"seq":1,"pir":0,"light":455,…}' },
    { t: T.s(3) + 5.8, text: 'robin/robin-01/telemetry {"seq":2,"pir":1,"light":452,…}' },
  ];
  return (
    <>
      <Card x={30} y={20} w={560} icon="📱" title={ui.hot} text="Laptop on the same hotspot. Find its IP address." color={C.purple} size={18} anim={popStyle(prog(t, T.s(1), 0.4))} />
      <Card x={30} y={170} w={560} icon="🔑" title={ui.sec} color={C.orange} size={18} anim={popStyle(prog(t, T.s(2), 0.4))} />
      <Card x={30} y={300} w={560} icon="📮" title={ui.broker} color={C.teal} size={18} anim={popStyle(prog(t, T.s(2) + 4, 0.4))} />
      <Term x={640} y={260} w={620} h={220} t={t} kind="shell" events={events} anim={fadeStyle(prog(t, T.s(3), 0.4))} size={13} />
      <Stage>
        <g transform="translate(860 30)" opacity={clamp(prog(t, T.s(2) + 1, 0.5))}>
          <rect x={0} y={0} width={180} height={124} rx={12} fill="#0b6d71" />
          <LedMatrix x0={14} y0={18} pitch={13.8} r={4.8} face={online ? blinkFace(t) : 'offline'} />
        </g>
      </Stage>
      <Abs x={640} y={500} style={{ ...popStyle(prog(t, T.s(4), 0.4)), background: C.green, color: '#fff', borderRadius: 18, padding: '8px 16px', fontSize: 20, fontWeight: 900 }}>🔌 Unplug before step 8</Abs>
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step8a: SceneFC = ({ t, T, ui }) => {
  const S = 1.8, fx = 110, fy = 50, FW = 126 * S, FH = 176 * S, sx = 470, SW = 57 * S;
  return (
    <>
      <Stage>
        <g opacity={clamp(prog(t, T.s(0) + 1, 0.4))}>
          <rect x={fx} y={fy} width={FW} height={FH} rx={14} fill="#dfeef3" stroke="#5f666d" strokeWidth={4} />
          <text x={fx + FW / 2} y={fy - 12} fontSize={16} fontWeight={900} textAnchor="middle" fill={C.muted}>lid (front) · 126 × 176 mm</text>
          <circle cx={fx + FW / 2} cy={fy + 60} r={24} fill="#fbfbf8" stroke={C.ink} strokeWidth={3} opacity={clamp(prog(t, T.s(3), 0.4))} />
          <text x={fx + FW / 2} y={fy + FH + 22} fontSize={15} fontWeight={900} textAnchor="middle" fill="#2f7d46" opacity={clamp(prog(t, T.s(3) + 1, 0.4))}>{ui.pir}</text>
          <rect x={sx} y={fy} width={SW} height={FH} rx={10} fill="#8f969d" stroke="#5f666d" strokeWidth={4} />
          <text x={sx + SW / 2} y={fy - 12} fontSize={16} fontWeight={900} textAnchor="middle" fill={C.muted}>side · 57 mm</text>
          {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={sx + SW / 2 - 14 + (i % 2) * 28} cy={fy + 170 + Math.floor(i / 2) * 22} r={5} fill="#2d3136" opacity={clamp(prog(t, T.s(3) + 2 + i * 0.15, 0.2))} />)}
          <text x={sx + SW / 2} y={fy + FH + 22} fontSize={15} fontWeight={900} textAnchor="middle" fill={C.ink} opacity={clamp(prog(t, T.s(3) + 3, 0.4))}>{ui.spk}</text>
        </g>
      </Stage>
      <Abs x={640} y={20} w={610} style={{ ...popStyle(prog(t, T.s(1), 0.4)), background: C.red, color: '#fff', borderRadius: 16, padding: '12px 18px', fontSize: 24, fontWeight: 900 }}>📦 {ui.empty}</Abs>
      <Card x={640} y={100} w={610} icon="🥽" title={ui.clamp} color={C.orange} size={18} anim={popStyle(prog(t, T.s(2), 0.4))} />
      <Card x={640} y={230} w={610} icon="⬆️" title={`${ui.top} · ${ui.usb}`} color={C.teal} size={18} anim={popStyle(prog(t, T.s(4), 0.4))} />
      <Card x={640} y={360} w={610} icon="🤖" title={ui.box} color="#5f666d" size={17} anim={popStyle(prog(t, T.s(0) + 2, 0.4))} />
    </>
  );
};

export const Step8b: SceneFC = ({ t, T, ui }) => (
  <>
    <Stage>
      <g opacity={clamp(prog(t, 0.3, 0.5))}><Robot cx={260} cy={290} s={1.9} face={blinkFace(t)} felt={t > T.s(5) + 1} /></g>
    </Stage>
    <Card x={560} y={12} w={700} icon="🔊" title={ui.glue} color={C.orange} size={16} anim={popStyle(prog(t, T.s(1), 0.4))} />
    <Card x={560} y={102} w={700} icon="📌" title={ui.tape} color={C.teal} size={16} anim={popStyle(prog(t, T.s(2), 0.4))} />
    <Card x={560} y={192} w={700} icon="🔁" title={ui.recheck} color={C.red} size={16} anim={popStyle(prog(t, T.s(3), 0.4))} />
    <Card x={560} y={282} w={700} icon="🔗" title={ui.tie} color={C.purple} size={16} anim={popStyle(prog(t, T.s(4), 0.4))} />
    <Card x={560} y={372} w={700} icon="🧶" title={ui.felt} color="#c9956a" size={16} anim={popStyle(prog(t, T.s(5), 0.4))} />
    <Card x={560} y={462} w={700} icon="🏠" title={ui.home} color={C.green} size={15} anim={popStyle(prog(t, T.s(6), 0.4))} />
  </>
);

// ---------------------------------------------------------------------------------------------
export const Recap: SceneFC = ({ t, T, ui }) => {
  let st = 0;
  for (let i = 1; i <= 5; i++) if (t >= T.s(i)) st = i;
  const focus: Record<number, number[] | null> = { 0: null, 1: [1], 2: [2, 3], 3: [4], 4: [5], 5: null };
  const f = focus[st];
  const label = [null, ui.power, ui.sense, ui.buttons, ui.voice, ui.all][st];
  return (
    <BenchScene t={t} T={T} upto={5} view={[[0, VIEWS.full]]} face={blinkFace(t)} bench={{ dim: (id) => !!f && !f.includes(ITEMS.find((i) => i.id === id)!.step), power: true }}
      html={label ? <Abs x={24} y={20} style={{ background: C.ink, color: '#fff', borderRadius: 16, padding: '8px 18px', fontSize: 26, fontWeight: 900 }}>{label}</Abs> : null} />
  );
};

export const Troubleshoot: SceneFC = ({ t, T, ui }) => (
  <>
    <Table x={30} y={8} w={1220} head={['Symptom', 'Likely cause', 'Fix']} colW={['30%', '30%', '40%']} size={13.2} headBg={C.red} rows={TROUBLE_ROWS.map((r) => [...r])} rowO={(i) => prog(t, 0.5 + i * 0.5, 0.3)} />
    <Abs x={200} y={490} w={880} style={{ ...riseStyle(prog(t, T.s(1), 0.5)), background: '#e8f5e9', border: `3px solid ${C.green}`, borderRadius: 16, padding: '8px 16px', fontSize: 19, fontWeight: 900, color: '#1b5e20', textAlign: 'center' }}>🔍 {ui.tip}</Abs>
  </>
);

export const Next: SceneFC = ({ t, T, ui }) => (
  <>
    <Stage>
      <g opacity={clamp(prog(t, 0.2, 0.5))}><Robot cx={1060} cy={280} s={1.6} face={blinkFace(t)} /></g>
    </Stage>
    {[ui.n1, ui.n2, ui.n3].map((n, i) => (
      <Pill key={i} x={60} y={60 + i * 90} text={`${i + 1}. ${n}`} bg={[C.teal, C.purple, C.orange][i]} size={24} anim={popStyle(prog(t, T.s(1) + i * 1.5, 0.5))} />
    ))}
    <Abs x={60} y={360} w={760} style={{ ...riseStyle(prog(t, T.s(2), 0.5)), background: C.green, color: '#fff', borderRadius: 18, padding: '16px 22px', fontSize: 26, fontWeight: 900 }}>
      <span style={{ fontFamily: EMOJI }}>🔌</span> {ui.rule}
    </Abs>
  </>
);
