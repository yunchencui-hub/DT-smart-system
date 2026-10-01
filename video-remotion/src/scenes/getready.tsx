import React from 'react';
import { BB_MARGIN, clamp, pulse, prog, rowY, win } from '../data/geom';
import { PINMAP_ROWS } from '../data/wiring';
import { Abs, Card, Emoji, fadeStyle, Pill, popStyle, riseStyle, Stage, Table, Tag, Term, Wire } from '../kit/basics';
import { Arduino, blinkFace, Breadboard, GravityCable, VoiceModule } from '../kit/hardware';
import { ORDER } from '../script/order';
import { C, EMOJI, MONO } from '../theme';
import { SceneFC } from './util';

// ---------------------------------------------------------------------------------------------
export const Title: SceneFC = ({ t, T, ui }) => (
  <>
    <Stage>
      <g transform="translate(700 70)" opacity={clamp(prog(t, 0.2, 0.6))}>
        <Arduino x={0} y={0} k={7.4} power face={blinkFace(t)} labels={false} />
      </g>
    </Stage>
    <Abs x={70} y={70} w={600} style={riseStyle(prog(t, 0.1, 0.6))}>
      <div style={{ fontSize: 72, fontWeight: 900, color: C.ink, lineHeight: 1 }}>{ui.title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.teal, marginTop: 14 }}>{ui.sub}</div>
    </Abs>
    {[ui.chip1, ui.chip2, ui.chip3].map((c, i) => (
      <Pill key={i} x={70} y={260 + i * 70} text={c} bg={[C.orange, C.teal, C.purple][i]} size={24} anim={popStyle(prog(t, T.s(1) + 0.4 + i * 0.5, 0.5))} />
    ))}
  </>
);

// ---------------------------------------------------------------------------------------------
export const Delivery: SceneFC = ({ t, T, ui }) => {
  // tick the lines off in the order the narrator names them (lines 1..5 of the scene)
  const groups = [[1, 2, 3, 4], [5, 6, 7, 8, 9, 10], [11, 12, 13], [14, 15, 16]];
  const tickAt = (n: number) => {
    const g = groups.findIndex((gr) => gr.includes(n));
    const k = groups[g].indexOf(n);
    return T.s(g + 1) + 0.6 + k * Math.min(1.1, (T.e(g + 1) - T.s(g + 1) - 0.6) / groups[g].length);
  };
  return (
    <>
      {ORDER.map((l, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const on = t >= tickAt(l.n);
        const isNew = !!l.isNew && t >= T.s(5);
        return (
          <Abs key={l.n} x={24 + col * 311} y={14 + row * 104} w={300} h={94} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 12px rgba(29,43,58,0.10)', borderLeft: `6px solid ${on ? C.green : '#c9c3b5'}`, padding: '8px 12px', ...fadeStyle(prog(t, 0.3 + i * 0.08, 0.3)), outline: isNew ? `3px solid ${C.orange}` : 'none' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontFamily: EMOJI, fontSize: 30 }}>{l.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16.5, fontWeight: 900, lineHeight: 1.15 }}>{l.qty} × {l.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted, marginTop: 3 }}>#{l.n} · SKU {l.sku}</div>
              </div>
              <div style={{ fontSize: 30, color: C.green, opacity: on ? 1 : 0 }}>✔</div>
            </div>
            {isNew && <div style={{ position: 'absolute', right: 8, bottom: 6, fontSize: 12, fontWeight: 900, color: '#fff', background: C.orange, borderRadius: 10, padding: '2px 8px' }}>{ui.new}: {l.isNew}</div>}
          </Abs>
        );
      })}
      <Abs x={24} y={438} w={1232} style={{ ...riseStyle(prog(t, T.s(5) + 3, 0.5)), background: C.ink, color: '#fff', borderRadius: 14, padding: '10px 18px', fontSize: 21, fontWeight: 900 }}>🧾 {ui.total}</Abs>
      <Abs x={24} y={500} w={1232} style={{ ...riseStyle(prog(t, T.s(6), 0.5)), background: '#fff3e0', color: '#8a4b00', borderRadius: 14, padding: '8px 18px', fontSize: 19, fontWeight: 800 }}>📦 {ui.tip}</Abs>
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const Extras: SceneFC = ({ t, T, ui }) => {
  const cards: [number, string, string, string, string][] = [
    [T.s(1), '🎓', ui.unoT, ui.unoX, C.teal], [T.s(2), '🔌', ui.usbT, ui.usbX, C.blue], [T.s(2) + 2.5, '🔌', ui.microT, ui.microX, C.blue],
    [T.s(2) + 5.5, '⚠️', ui.chargeT, ui.chargeX, C.red], [T.s(3), '🛠️', ui.toolsT, ui.toolsX, C.orange], [T.s(4), '🔋', ui.phoneT, ui.phoneX, C.green],
  ];
  return (
    <>
      {cards.map(([ts, ic, ti, tx, c], i) => (
        <Card key={i} x={40 + (i % 3) * 405} y={30 + Math.floor(i / 3) * 260} w={385} h={235} icon={ic} title={ti} text={tx} color={c} size={21} anim={popStyle(prog(t, ts, 0.45))} />
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------------------------
const DupontEnd: React.FC<{ x: number; y: number; male: boolean; dir: 1 | -1 }> = ({ x, y, male, dir }) => (
  <g>
    <rect x={dir > 0 ? x : x - 46} y={y - 11} width={46} height={22} rx={3} fill="#222" />
    {male ? <rect x={dir > 0 ? x + 46 : x - 70} y={y - 3} width={24} height={6} fill="#c9a227" /> : <rect x={dir > 0 ? x + 40 : x - 46} y={y - 4} width={6} height={8} fill="#555" />}
  </g>
);
export const Wires: SceneFC = ({ t, T, ui }) => {
  const rows: [string, boolean, boolean, string, string, number][] = [
    [ui.mm, true, true, '#e53935', ui.mmUse, T.s(1)],
    [ui.fm, true, false, '#f57c00', ui.fmUse, T.s(2)],
    [ui.ff, false, false, '#1e63d6', ui.ffUse, T.s(4)],
  ];
  return (
    <Stage>
      {rows.map(([name, m1, m2, color, use, ts], i) => {
        const y = 80 + i * (i === 2 ? 200 : 110);
        return (
          <g key={name} opacity={clamp(prog(t, i === 0 ? 0.2 : ts, 0.5))}>
            <path d={`M284,${y} C500,${y - 40} 720,${y + 40} 936,${y}`} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
            <DupontEnd x={284} y={y} male={m1} dir={-1} />
            <DupontEnd x={936} y={y} male={m2} dir={1} />
            <text x={120} y={y + 10} fontSize={34} fontWeight={900} fill={C.ink} textAnchor="middle">{name}</text>
            <text x={1130} y={y + 7} fontSize={19} fontWeight={800} fill="#44546a" textAnchor="middle">{use}</text>
          </g>
        );
      })}
      <Tag x={214} y={80} text={ui.male} o={prog(t, 1.6, 0.4)} dy={-40} color="#8a6d00" size={17} />
      <Tag x={990} y={190} text={ui.female} o={prog(t, T.s(2) + 0.6, 0.4)} dy={40} color="#555" size={17} />
      {/* the Gravity cable of the voice module */}
      <g opacity={clamp(prog(t, T.s(3), 0.5))}>
        <VoiceModule x={880} y={290} s={0.8} highlight="plug" />
        <GravityCable x={880} y={290} s={0.8} p={clamp(prog(t, T.s(3) + 0.5, 1.2))} />
        {[0, 1, 2, 3].map((i) => (
          <Wire key={i} pts={[[758 - 30, 314.8 + i * 11.2], [640, 300 + i * 26], [470, 290 + i * 34], [360, 300 + i * 30]]} color={['#1e63d6', '#00a3a3', '#212121', '#e53935'][i]} p={prog(t, T.s(3) + 3 + i * 0.4, 0.8)} w={3.4} />
        ))}
        <text x={120} y={345} fontSize={30} fontWeight={900} fill={C.ink} textAnchor="middle">{ui.grav}</text>
        <text x={120} y={375} fontSize={17} fontWeight={800} fill="#44546a" textAnchor="middle">{ui.gravUse}</text>
      </g>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------
export const Software: SceneFC = ({ t, T, ui }) => {
  const steps = [ui.s1, ui.s2, ui.s3, ui.s4, ui.s5, ui.s6];
  const at = [T.s(1), T.s(1) + 2.5, T.s(1) + 5, T.s(2), T.s(3), T.s(3) + 3];
  const tUp = T.s(3) + 3.2;
  return (
    <>
      {steps.map((s, i) => (
        <Abs key={i} x={40} y={30 + i * 70} w={560} style={{ ...riseStyle(prog(t, at[i], 0.4)), background: '#fff', borderRadius: 12, padding: '12px 16px', fontSize: 18, fontWeight: 800, boxShadow: '0 4px 12px rgba(29,43,58,0.08)', display: 'flex', gap: 12 }}>
          <span style={{ color: '#fff', background: C.teal, borderRadius: 12, padding: '0 9px', fontWeight: 900 }}>{i + 1}</span>
          <span style={{ fontFamily: i === 3 ? MONO : undefined, fontSize: i === 3 ? 15 : 18 }}>{s}</span>
        </Abs>
      ))}
      <Pill x={40} y={470} text={`📄 ${ui.guide}`} bg={C.purple} anim={popStyle(prog(t, T.s(0) + 2, 0.5))} />
      <Term x={640} y={30} w={600} h={330} t={t} anim={fadeStyle(prog(t, tUp - 0.4, 0.4))} events={[
        { t: tUp, text: 'Robin firmware 1.0.0' },
        { t: tUp + 0.3, text: "Offline test mode: type 'help' in the Serial Monitor." },
        { t: tUp + 2.5, type: 'type', text: 'help' },
        { t: tUp + 3.1, text: 'Commands: say <n> [ms] | ask <n> [ms] | face <mood> | vol <0-30> | stop | raw', color: '#ffd54f' },
      ]} />
      <Card x={640} y={390} w={600} icon="🔌" title="Upload done → unplug the USB cable" text="From now on: wire with the cable unplugged." color={C.green} size={19} anim={popStyle(prog(t, T.s(4), 0.5))} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const Rules: SceneFC = ({ t, T, ui }) => {
  const cards: [number, string, string, string, string][] = [
    [T.s(0), '🔌', ui.goldenT, ui.goldenX, C.orange], [T.s(3), '🏷️', ui.labelT, ui.labelX, C.purple], [T.s(4), '±', ui.polT, ui.polX, C.red],
    [T.s(5), '👀', ui.warmT, ui.warmX, C.blue], [T.s(6), '🥽', ui.glassesT, ui.glassesX, C.teal],
  ];
  const on = t > T.s(2) + 1.2;
  return (
    <>
      {cards.map(([ts, ic, ti, tx, c], i) => (
        <Card key={i} x={30 + (i % 2) * 330} y={20 + Math.floor(i / 2) * 180} w={315} h={165} icon={ic} title={ti} text={tx} color={c} size={18.5} anim={popStyle(prog(t, ts, 0.45))} />
      ))}
      <Abs x={700} y={20} w={550} style={{ ...popStyle(prog(t, T.s(1), 0.45)) }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {[['🔌', 'USB OUT', 'wiring is allowed', C.green], ['⚡', 'USB IN', 'testing: hands off the wires', C.orange]].map(([ic, a, b, c]) => (
            <div key={a} style={{ flex: 1, background: c, color: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }}>
              <div style={{ fontFamily: EMOJI, fontSize: 30 }}>{ic}</div>
              <div><div style={{ fontSize: 20, fontWeight: 900 }}>{a}</div><div style={{ fontSize: 14, fontWeight: 700 }}>{b}</div></div>
            </div>
          ))}
        </div>
      </Abs>
      <Stage>
        <g opacity={clamp(prog(t, T.s(2), 0.4))}>
          <rect x={700} y={140} width={550} height={170} rx={14} fill="#f6f3ec" stroke="#d8d1c3" strokeWidth={2} />
          <line x1={730} y1={180} x2={1220} y2={180} stroke="#e53935" strokeWidth={4} />
          <line x1={730} y1={250} x2={1220} y2={250} stroke="#1e63d6" strokeWidth={4} />
          <text x={716} y={187} fontSize={22} fontWeight={900} fill="#e53935">+</text>
          <text x={716} y={257} fontSize={22} fontWeight={900} fill="#1e63d6">−</text>
          <Wire pts={[[900, 180], [960, 140], [1000, 215], [960, 250]]} color="#e53935" p={prog(t, T.s(2) + 0.3, 0.8)} w={7} />
          <Emoji x={1060} y={215} ch="⚡" size={56} o={on ? 0.4 + 0.6 * pulse(t, 4) : 0} />
          <text x={1160} y={240} fontSize={90} fontWeight={900} fill="#e53935" textAnchor="middle" opacity={on ? 1 : 0}>✗</text>
          <text x={975} y={295} fontSize={22} fontWeight={900} fill="#e53935" textAnchor="middle">{ui.short}</text>
        </g>
      </Stage>
      <Card x={700} y={330} w={550} icon="⛔" title={ui.shortT} text={ui.shortX} color={C.red} size={20} anim={popStyle(prog(t, T.s(2) + 2, 0.45))} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const BreadboardScene: SceneFC = ({ t, T, ui }) => {
  const p = 24, x = 268, y = 40;
  const hx = (c: number) => x + BB_MARGIN + (c - 1) * p;
  const hy = (r: Parameters<typeof rowY>[0]) => y + rowY(r, p);
  const xray = win(t, 1.8, T.s(1) + 1.5, 0.6) * 0.95;
  const railsO = clamp(prog(t, T.s(1) + 0.5, 0.5)) * (1 - prog(t, T.s(2), 0.4));
  const showFlip = win(t, T.s(2) + 0.3, T.s(3), 0.4);
  const useO = win(t, T.s(3) + 0.5, T.s(4), 0.4);
  const gO = clamp(prog(t, T.s(4) + 0.5, 0.4)) * 0.85;
  return (
    <>
      <Stage>
        <g opacity={1 - showFlip}>
          <Breadboard x={x} y={y} p={p} xray={xray} rails={{ '+t': railsO * 0.75, '-t': railsO * 0.75, '-b': railsO * 0.75 + useO * 0.6, '+b': railsO * 0.75 + useO * 0.6 }}
            groups={[{ c: 6, half: 'top', color: '#ffcc80', o: gO }, { c: 6, half: 'bottom', color: '#b39ddb', o: clamp(prog(t, T.s(4) + 2.5, 0.4)) * 0.85 }, { c: 18, half: 'top', color: '#a5d6a7', o: clamp(prog(t, T.s(5) + 1, 0.4)) * 0.8 }]} />
          <line x1={hx(3)} y1={(hy('e') + hy('f')) / 2} x2={hx(9)} y2={(hy('e') + hy('f')) / 2} stroke="#e53935" strokeWidth={6} strokeLinecap="round" opacity={clamp(prog(t, T.s(4) + 2, 0.4))} />
          <Tag x={hx(22)} y={hy('+b')} text={ui.use} o={useO} dy={40} color={C.teal} size={16} />
          <Tag x={hx(6)} y={hy('a')} text={ui.group} o={gO} dy={-26} color="#b26a00" size={14} />
          <g opacity={clamp(prog(t, T.s(5) + 1, 0.4))}>
            <circle cx={hx(18)} cy={hy('a')} r={7} fill="#2e9e4f" stroke="#fff" strokeWidth={2} /><circle cx={hx(18)} cy={hy('c')} r={7} fill="#2e9e4f" stroke="#fff" strokeWidth={2} />
            <text x={hx(18) + 18} y={hy('b') + 10} fontSize={30} fontWeight={900} fill="#2e9e4f">✓</text>
          </g>
          <g opacity={clamp(prog(t, T.s(5) + 3, 0.4))}>
            <circle cx={hx(24)} cy={hy('b')} r={7} fill="#e53935" stroke="#fff" strokeWidth={2} /><circle cx={hx(25)} cy={hy('b')} r={7} fill="#e53935" stroke="#fff" strokeWidth={2} />
            <text x={hx(26) + 8} y={hy('b') + 10} fontSize={30} fontWeight={900} fill="#e53935">✗</text>
          </g>
        </g>
        {/* two real boards with the rails the other way round */}
        <g opacity={showFlip}>
          <text x={320} y={40} fontSize={22} fontWeight={900} fill={C.ink}>{ui.boardA}</text>
          <Breadboard x={150} y={60} p={11} />
          <text x={900} y={40} fontSize={22} fontWeight={900} fill={C.ink}>{ui.boardB}</text>
          <Breadboard x={690} y={60} p={11} flip />
        </g>
      </Stage>
      <Abs x={140} y={470} w={1000} style={{ ...riseStyle(prog(t, T.s(2) + 1.5, 0.5)), background: '#fff3e0', border: `3px solid ${C.orange}`, borderRadius: 16, padding: '10px 18px', fontSize: 23, fontWeight: 900, color: '#8a4b00', textAlign: 'center' }}>
        {ui.follow}
      </Abs>
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const PinMap: SceneFC = ({ t, T, ui }) => (
  <>
    <Table x={40} y={8} w={1200} head={[ui.head1, ui.head2, ui.head3]} colW={['33%', '48%', '19%']} size={13.2} rows={PINMAP_ROWS.map((r) => [...r])} rowO={(i) => prog(t, 0.4 + i * 0.3, 0.3)} />
    <Pill x={1000} y={515} text={ui.doc} bg={C.orange} anim={popStyle(prog(t, T.s(1) + 1, 0.5))} />
  </>
);
