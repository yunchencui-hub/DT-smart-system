import React from 'react';
import { camBox, clamp, H, P, prog, pulse, win } from '../data/geom';
import { gravityEnd, HOLE_BOTTOM_Y, holeX, SPEAKER, voicePin } from '../data/modules';
import { Abs, Card, Emoji, fadeStyle, Pill, popStyle, riseStyle, Ring, Stage, Tag, Term } from '../kit/basics';
import { CapacitorSide, Speaker, VoiceModule } from '../kit/hardware';
import { C, EMOJI, MONO } from '../theme';
import { BenchScene, SceneFC, VIEWS } from './util';

const STEP5_EARLY = ['voice', 'spk', 'wSPp', 'wSPm']; // soldered in 5c, before the bench view of 5e

// ---------------------------------------------------------------------------------------------
export const Step5a: SceneFC = ({ t, T, ui }) => {
  const hl = t > T.s(4) ? null : t > T.s(3) ? 'spk' : t > T.s(2) ? 'holes' : t > T.s(1) ? 'socket' : null;
  return (
    <>
      <Stage>
        <g opacity={clamp(prog(t, 0.3, 0.5))}><VoiceModule x={455} y={110} s={2.4} highlight={hl} /></g>
      </Stage>
      <Abs x={30} y={20} w={1220} style={{ ...riseStyle(prog(t, T.s(0) + 2, 0.5)), fontSize: 20, fontWeight: 900, color: '#fff', background: C.teal, borderRadius: 16, padding: '8px 16px', textAlign: 'center' }}>{ui.parts}</Abs>
      <Card x={20} y={150} w={340} icon="🔌" title={ui.plug} text={ui.plugX} color={C.orange} size={16} anim={popStyle(prog(t, T.s(1) + 1, 0.4))} />
      <Card x={20} y={330} w={340} icon="🔊" title={ui.header} text={ui.headerX} color={C.purple} size={16} anim={popStyle(prog(t, T.s(2) + 1, 0.4))} />
      <Card x={930} y={150} w={330} icon="⛔" title={ui.spk} text={ui.spkX} color={C.red} size={16} anim={popStyle(prog(t, T.s(3) + 1, 0.4))} />
      <Card x={930} y={330} w={330} icon="🏷️" title={ui.yours} text={ui.usb} color={C.blue} size={16} anim={popStyle(prog(t, T.s(4), 0.4))} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------
const Panel: React.FC<{ x: number; title: string; o: number; children?: React.ReactNode }> = ({ x, title, o, children }) => (
  <g opacity={clamp(o)}>
    <rect x={x} y={20} width={295} height={360} rx={18} fill="#fff" stroke="#e3dccd" strokeWidth={2} />
    <text x={x + 147} y={360} fontSize={17} fontWeight={900} textAnchor="middle" fill={C.ink}>{title}</text>
    {children}
  </g>
);
export const Step5b: SceneFC = ({ t, T, ui }) => {
  const cut = prog(t, T.s(1) + 1, 0.6);
  return (
    <>
      <Stage>
        {/* 1: the set: two speakers, 4 wires, one plug; scissors cut behind the plug */}
        <Panel x={15} title={ui.cut} o={prog(t, 0.3, 0.4)}>
          <Speaker cx={90} cy={90} r={34} /><Speaker cx={230} cy={90} r={34} />
          {[[80, '#e53935'], [100, '#212121'], [220, '#e53935'], [240, '#212121']].map(([x, c], i) => (
            <path key={i} d={`M${x},122 C${x},210 ${150 + i * 6 - 9},220 ${150 + i * 6 - 9},${280 - cut * 6}`} fill="none" stroke={c as string} strokeWidth={3.5} />
          ))}
          <rect x={132} y={278 + cut * 22} width={36} height={24} rx={3} fill="#f4f4f4" stroke="#9e9e9e" />
          <Emoji x={195} y={270} ch="✂️" size={36} o={win(t, T.s(1) + 0.2, T.s(2))} />
        </Panel>
        {/* 2: one speaker's pair */}
        <Panel x={325} title={ui.follow} o={prog(t, T.s(2), 0.4)}>
          <Speaker cx={400} cy={90} r={34} /><Speaker cx={540} cy={90} r={34} />
          <path d="M390,122 C390,200 420,240 430,300" fill="none" stroke="#e53935" strokeWidth={4} />
          <path d="M410,122 C410,200 445,240 455,300" fill="none" stroke="#212121" strokeWidth={4} />
          <path d="M530,122 C530,200 510,240 505,300" fill="none" stroke="#e53935" strokeWidth={3} opacity={0.35} />
          <path d="M550,122 C550,200 530,240 530,300" fill="none" stroke="#212121" strokeWidth={3} opacity={0.35} />
          <circle cx={400} cy={90} r={44} fill="none" stroke={C.green} strokeWidth={4} opacity={win(t, T.s(2) + 1.5, T.dur, 0.3)} />
          <text x={400} y={165} fontSize={14} fontWeight={900} fill={C.green} textAnchor="middle" opacity={win(t, T.s(2) + 1.5, T.dur, 0.3)}>use this one</text>
          <text x={540} y={165} fontSize={14} fontWeight={900} fill={C.muted} textAnchor="middle" opacity={win(t, T.s(2) + 1.5, T.dur, 0.3)}>spare</text>
        </Panel>
        {/* 3: tape the spare's ends separately */}
        <Panel x={635} title={ui.tape} o={prog(t, T.s(3), 0.4)}>
          <Speaker cx={782} cy={90} r={34} />
          <path d="M772,122 C772,190 740,230 730,280" fill="none" stroke="#e53935" strokeWidth={4} />
          <path d="M792,122 C792,190 830,230 840,280" fill="none" stroke="#212121" strokeWidth={4} />
          <rect x={716} y={276} width={28} height={30} rx={4} fill="#1e63d6" opacity={clamp(prog(t, T.s(3) + 1.5, 0.4))} />
          <rect x={826} y={276} width={28} height={30} rx={4} fill="#1e63d6" opacity={clamp(prog(t, T.s(3) + 2.5, 0.4))} />
        </Panel>
        {/* 4: strip 5 mm and twist */}
        <Panel x={945} title={ui.strip} o={prog(t, T.s(4), 0.4)}>
          <line x1={975} y1={170} x2={1120} y2={170} stroke="#e53935" strokeWidth={12} strokeLinecap="round" />
          <path d="M1120,170 q6,-8 12,0 t12,0 t12,0 t12,0" fill="none" stroke="#d4883b" strokeWidth={7} />
          <line x1={1122} y1={200} x2={1170} y2={200} stroke={C.ink} strokeWidth={2} />
          <text x={1146} y={226} fontSize={18} fontWeight={900} textAnchor="middle">5 mm</text>
        </Panel>
      </Stage>
      <Card x={15} y={400} w={600} icon="🥽" title={ui.glasses} color={C.teal} size={19} anim={popStyle(prog(t, T.s(1), 0.4))} />
      <Card x={645} y={400} w={600} icon="🚫" title={ui.plugT} text={ui.plugX} color={C.red} size={17} anim={popStyle(win(t, T.s(1) + 3, T.s(2) + 4, 0.4))} />
      <Card x={645} y={400} w={600} icon="⛔" title={ui.never} text="Together 4 Ω: too heavy for the module's amplifier." color={C.red} size={19} anim={popStyle(prog(t, T.s(2) + 4, 0.4))} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step5c: SceneFC = ({ t, T, ui }) => {
  const smoke = t > T.s(2) && t < T.s(6) + 1;
  return (
    <>
      <Stage>
        <g opacity={clamp(prog(t, 0.3, 0.5))}><VoiceModule x={470} y={36} s={2.0} highlight="sp" /></g>
        <g opacity={smoke ? 0.4 + 0.5 * pulse(t, 1.4) : 0}>
          <circle cx={470 + 116 * 2} cy={36 + 92 * 2 + 30} r={8} fill="#bdbdbd" /><circle cx={470 + 112 * 2} cy={36 + 92 * 2 + 14} r={10} fill="#bdbdbd" opacity={0.6} />
        </g>
      </Stage>
      <Card x={30} y={290} w={590} icon="⭕" title={ui.holesT} text={ui.holesX} color={C.purple} size={17} anim={popStyle(prog(t, T.s(2), 0.4))} />
      <Card x={660} y={290} w={590} icon="📌" title={ui.pinsT} text={ui.pinsX} color={C.orange} size={17} anim={popStyle(prog(t, T.s(3), 0.4))} />
      <Pill x={900} y={40} text={ui.red} bg={C.red} anim={popStyle(prog(t, T.s(4), 0.4))} />
      <Card x={30} y={420} w={1220} icon="🥽" title={ui.safeT} text={ui.safeX} color={C.red} size={17} anim={popStyle(win(t, 0.3, T.s(2), 0.4))} />
      <Card x={30} y={420} w={1220} icon="🩹" title={ui.tapeT} text={ui.tapeX} color={C.teal} size={18} anim={popStyle(win(t, T.s(5), T.s(6), 0.4))} />
      <Card x={30} y={420} w={1220} icon="🔌" title={ui.offT} color={C.green} size={18} anim={popStyle(prog(t, T.s(6), 0.4))} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step5d: SceneFC = ({ t, T, ui }) => {
  const files = Array.from({ length: 13 }, (_, i) => `${String(i + 1).padStart(2, '0')}.mp3`);
  const names = ['hello', 'good_morning', 'medicine', 'water', 'hot_day', 'lunch', 'checkin_day', 'checkin_night', 'thanks', 'calling_help', 'repeat', 'good_night', 'maybe_later'];
  const mx = 70, my = 200, ms = 1.4;
  const cable = clamp(prog(t, T.s(2) + 0.5, 1)) * (1 - prog(t, T.s(5) + 0.8, 0.5));
  const usbX = mx + 159 * ms, usbY = my + 77 * ms;
  const sp = (i: number) => ({ x: mx + holeX(i) * ms, y: my + HOLE_BOTTOM_Y * ms });
  return (
    <>
      <Stage>
        <g opacity={clamp(prog(t, 0.2, 0.4))}>
          {/* the module, with the speaker already soldered to SP- / SP+ (step 5a); the Gravity socket stays empty */}
          <path d={`M${sp(3).x},${sp(3).y} C${sp(3).x},${sp(3).y + 60} ${170},${440} ${168},${470}`} fill="none" stroke="#212121" strokeWidth={3.5} />
          <path d={`M${sp(4).x},${sp(4).y} C${sp(4).x},${sp(4).y + 60} ${200},${440} ${192},${470}`} fill="none" stroke="#e53935" strokeWidth={3.5} />
          <Speaker cx={180} cy={500} r={30} />
          <VoiceModule x={mx} y={my} s={ms} />
          {/* micro-USB cable to the laptop */}
          <path d={`M${usbX},${usbY} C${usbX + 60},${usbY} ${430},${220} ${450},${130}`} fill="none" stroke="#3d3d3d" strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - cable} opacity={cable > 0 ? 1 : 0} />
        </g>
      </Stage>
      <Card x={20} y={20} w={400} icon="🔌" title={ui.unplug} color={C.red} size={16} anim={popStyle(prog(t, T.s(1), 0.4))} />
      <Abs x={470} y={20} w={790} h={400} style={{ ...fadeStyle(prog(t, T.s(2) + 2, 0.5) * (1 - prog(t, T.s(5) + 0.5, 0.5))), background: '#fff', borderRadius: 14, boxShadow: '0 10px 26px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
        <div style={{ background: '#e8eef3', padding: '10px 16px', fontSize: 17, fontWeight: 900 }}>{ui.drive}</div>
        <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, fontSize: 16, fontWeight: 700 }}>
          <div style={{ gridColumn: '1 / span 2', color: '#7b8794', opacity: 1 - prog(t, T.s(3) + 1.5, 0.4), textDecoration: t > T.s(3) + 0.8 ? 'line-through' : 'none' }}>🗑️ {ui.demo}</div>
          {files.map((f, i) => (
            <div key={f} style={{ fontFamily: MONO, fontSize: 15, padding: '3px 0', opacity: clamp(prog(t, T.s(3) + 3 + i * 0.25, 0.25)) }}>
              <span style={{ color: C.teal, fontWeight: 700 }}>🎵 {f}</span><span style={{ color: '#7b8794' }}>  {names[i]}</span>
            </div>
          ))}
        </div>
      </Abs>
      <Pill x={470} y={440} text={ui.nl} bg={C.orange} anim={popStyle(prog(t, T.s(4), 0.4))} />
      <Pill x={760} y={440} text={ui.eject} bg={C.teal} anim={popStyle(prog(t, T.s(4) + 2, 0.4))} />
      <Pill x={980} y={440} text={ui.unplugMicro} bg={C.green} anim={popStyle(prog(t, T.s(5), 0.4))} />
      <div style={{ fontFamily: EMOJI, position: 'absolute', left: 420, top: 70, fontSize: 60, ...fadeStyle(prog(t, T.s(2) + 1.2, 0.4) * (1 - prog(t, T.s(5) + 0.8, 0.5))) }}>💻</div>
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step5e: SceneFC = ({ t, T, ui }) => {
  const flags = prog(t, T.s(2) + 2, 0.6);
  const e = (n: string) => gravityEnd(n);
  const d0 = P('D0'), d1 = P('D1'), c22 = H(22, 'b'), c26 = H(26, 'b');
  return (
    <BenchScene t={t} T={T} upto={4} extra={STEP5_EARLY} view={VIEWS[5]} bench={{ flags }}
      html={<>
        <Card x={20} y={500} w={640} icon="🏷️" title={ui.flags} color={C.purple} size={15} anim={popStyle(win(t, T.s(2), T.s(3), 0.4))} />
        <Card x={20} y={500} w={760} icon="🔎" title={ui.meter} color={C.purple} size={15} anim={popStyle(win(t, T.s(3), T.s(6), 0.4))} />
        <Card x={20} y={500} w={640} icon="🎨" title={ui.band} color="#6d3b1f" size={14} anim={popStyle(win(t, T.s(6) + 1, T.s(8), 0.4))} />
        <Card x={680} y={500} w={580} icon="📌" title={ui.flat} color={C.teal} size={15} anim={popStyle(prog(t, T.s(8), 0.4))} />
      </>}>
      <Tag x={e('+').x} y={e('+').y} text={ui.plus} o={win(t, T.s(4), T.s(6))} dx={-70} dy={40} size={12} color="#e53935" />
      <Tag x={e('−').x} y={e('−').y} text={ui.minus} o={win(t, T.s(4) + 1.5, T.s(6))} dx={-80} dy={10} size={12} color={C.ink} />
      <Tag x={d0.x} y={d0.y} text={ui.t} o={win(t, T.s(5), T.s(7) + 2)} dx={40} dy={-40} size={12} color="#1e63d6" />
      <Tag x={c22.x} y={c22.y} text={ui.r} o={win(t, T.s(6), T.s(8))} dx={-40} dy={-50} size={12} color="#00a3a3" />
      <Tag x={d1.x} y={d1.y} text={ui.d1} o={win(t, T.s(7), T.dur)} dx={-10} dy={-60} size={12} color="#ec407a" />
      <Ring x={c22.x} y={c22.y} t={t} on={t > T.s(6) && t < T.s(6) + 3} color="#00a3a3" r={6} />
      <Ring x={c26.x} y={c26.y} t={t} on={t > T.s(7) && t < T.s(8)} color="#ec407a" r={6} />
    </BenchScene>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step5f: SceneFC = ({ t, T, ui }) => {
  const Head: React.FC<{ x: number; name: string; color: string }> = ({ x, name, color }) => (
    <g><rect x={x} y={110} width={280} height={300} rx={40} fill={color} /><text x={x + 140} y={160} fontSize={28} fontWeight={900} fill="#fff" textAnchor="middle">{name}</text></g>
  );
  const Lab: React.FC<{ x: number; y: number; emo: string; txt: string; anchor: 'end' | 'start'; o: number; glow?: boolean }> = ({ x, y, emo, txt, anchor, o, glow }) => (
    <g opacity={clamp(o)} style={{ filter: glow ? 'drop-shadow(0 0 8px #ffd54f)' : undefined }}>
      <text x={x} y={y} fontSize={44} textAnchor="middle" dominantBaseline="central" fontFamily={EMOJI}>{emo}</text>
      <text x={anchor === 'end' ? x - 36 : x + 36} y={y + 8} fontSize={22} fontWeight={900} fill="#fff" textAnchor={anchor}>{txt}</text>
    </g>
  );
  return (
    <>
      <Stage>
        <g opacity={clamp(prog(t, 0.2, 0.4))}><Head x={90} name={ui.ard} color={C.teal} /><Head x={910} name={ui.mod} color="#1f3b70" /></g>
        <Lab x={330} y={230} emo="👄" txt={ui.aMouth} anchor="end" o={prog(t, T.s(0) + 3, 0.4)} glow={t > T.s(1) + 4 && t < T.s(2)} />
        <Lab x={330} y={340} emo="👂" txt={ui.aEar} anchor="end" o={prog(t, T.s(0) + 5, 0.4)} glow={t > T.s(1) + 2 && t < T.s(1) + 4} />
        <Lab x={950} y={230} emo="👄" txt={ui.mMouth} anchor="start" o={prog(t, T.s(0) + 3, 0.4)} />
        <Lab x={950} y={340} emo="👂" txt={ui.mEar} anchor="start" o={prog(t, T.s(0) + 5, 0.4)} />
        <path d="M360,230 L500,230 C640,230 780,340 920,340" fill="none" stroke="#ec407a" strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp(prog(t, T.s(1) + 0.5, 1))} />
        <path d="M920,230 C780,230 640,340 500,340 L360,340" fill="none" stroke="#1e63d6" strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp(prog(t, T.s(1) + 1.6, 1))} />
        <g opacity={clamp(prog(t, T.s(2), 0.4))}>
          <rect x={390} y={216} width={80} height={28} rx={10} fill="#e3cf9c" stroke="#b59a5a" strokeWidth={2} />
          {[0, 1, 2].map((i) => <rect key={i} x={404 + i * 16} y={216} width={8} height={28} fill={['#6d3b1f', '#1b1b1b', '#d32f2f'][i]} />)}
          <text x={430} y={206} fontSize={20} fontWeight={900} fill="#6d3b1f" textAnchor="middle">1 kΩ</text>
        </g>
      </Stage>
      <Abs x={440} y={440} w={400} style={{ ...fadeStyle(prog(t, T.s(1) + 2.6, 0.4)), fontSize: 26, fontWeight: 900, textAlign: 'center' }}>{ui.cross}</Abs>
      <Card x={380} y={20} w={520} icon="🛡️" title={ui.res} color="#6d3b1f" size={17} anim={popStyle(prog(t, T.s(2) + 0.5, 0.5))} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step5g: SceneFC = ({ t, T, ui }) => {
  const benchOn = t > T.s(3) - 0.2;
  const tank = win(t, T.s(0) + 1, T.s(2), 0.4);
  return (
    <>
      {benchOn ? (
        <BenchScene t={t} T={T} upto={4} extra={[...STEP5_EARLY, 'grav', 'wVp', 'wVm', 'wT', 'wR', 'r1k', 'wD1']} view={[[T.s(3) - 0.2, VIEWS[5]], [T.s(3) + 1.2, camBox(784, 360, 330)]]}>
          <Tag x={H(24, '-b').x} y={H(24, '-b').y} text="stripe (−) → − rail" o={win(t, T.s(3) + 3, T.dur)} dx={78} dy={-62} size={10} color="#1e63d6" />
          <Tag x={H(22, '+b').x} y={H(22, '+b').y} text="long leg (+) → + rail" o={win(t, T.s(3) + 3, T.dur)} dx={-82} dy={22} size={10} color="#e53935" />
        </BenchScene>
      ) : (
        <>
          <Stage>
            <g opacity={clamp(prog(t, T.s(2) - 0.5, 0.5))}>
              <CapacitorSide x={640} y={210} s={1.25} />
              <text x={640 + 44 * 1.25} y={420} fontSize={18} fontWeight={900} fill="#1e63d6" textAnchor="middle">− short leg</text>
              <text x={640 - 36 * 1.25} y={440} fontSize={18} fontWeight={900} fill="#e53935" textAnchor="middle">+ long leg</text>
            </g>
            <g opacity={tank}>
              <rect x={230} y={170} width={140} height={200} rx={20} fill="#bbdefb" stroke={C.blue} strokeWidth={4} />
              <rect x={234} y={170 + 200 - 200 * (0.55 + 0.35 * pulse(t, 0.7))} width={132} height={200 * (0.55 + 0.35 * pulse(t, 0.7)) - 4} rx={16} fill={C.blue} opacity={0.5} />
              <text x={300} y={400} fontSize={18} fontWeight={900} fill={C.blue} textAnchor="middle">{ui.tank}</text>
            </g>
          </Stage>
          <Card x={880} y={80} w={370} icon="➖" title={ui.stripe} color={C.blue} size={18} anim={popStyle(prog(t, T.s(2) + 1, 0.4))} />
          <Card x={880} y={250} w={370} icon="➕" title={ui.long} color={C.red} size={18} anim={popStyle(prog(t, T.s(2) + 3, 0.4))} />
        </>
      )}
      <Abs x={30} y={20} w={560} style={{ ...popStyle(win(t, T.s(3) + 1.5, T.s(4), 0.4)), background: '#fff', borderRadius: 16, borderTop: `6px solid ${C.green}`, padding: '12px 16px', fontSize: 19, fontWeight: 900, boxShadow: '0 6px 18px rgba(29,43,58,0.12)' }}>✅ {ui.place}</Abs>
      <Card x={30} y={400} w={1220} icon="⚠️" title={ui.warnT} text={ui.warnX} color={C.red} size={19} anim={popStyle(prog(t, T.s(4), 0.4))} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------
export const Step5h: SceneFC = ({ t, T, ui }) => {
  const checks = [ui.c1, ui.c2, ui.c3, ui.c4, ui.c5];
  const checkAt = [T.s(0) + 0.5, T.s(0) + 4, T.s(1) + 0.3, T.s(2) + 0.3, T.s(2) + 4];
  const PLUG = 4;
  const say3 = T.s(7) + 1;
  const vol = T.s(9) + 0.8;
  const events = [{ t: say3, type: 'type' as const, text: 'say 3' }, { t: say3 + 0.5, text: '[cmd] say 3' }, { t: vol, type: 'type' as const, text: 'vol 15' }, { t: vol + 0.6, text: '[cmd] vol 15' }];
  const talking = T.robinOn(t);
  const plugged = t > T.s(PLUG) && t < T.s(10);
  const sp = voicePin('SP+'), vcc = voicePin('VCC'), gnd = voicePin('GND');
  return (
    <BenchScene t={t} T={T} upto={5} view={VIEWS[5]} face={plugged && t > T.s(PLUG) + 1.4 ? (talking ? 'talk' : 'happy') : undefined} bench={{ talking }}
      html={<>
        <Abs x={16} y={492} w={1248} style={{ ...fadeStyle(win(t, 0.3, T.s(PLUG) + 0.5, 0.4)), display: 'flex', gap: 6, alignItems: 'stretch' }}>
          <div style={{ background: C.orange, color: '#fff', borderRadius: 12, padding: '8px 10px', fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center' }}>🔍 {ui.checkT}</div>
          {checks.map((c, i) => (
            <div key={i} style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '6px 9px', fontSize: 13.5, fontWeight: 800, lineHeight: 1.2, boxShadow: '0 4px 12px rgba(29,43,58,0.12)', opacity: clamp(prog(t, checkAt[i], 0.3)) }}>
              <span style={{ color: C.green }}>☑</span> {c}
            </div>
          ))}
        </Abs>
        <Pill x={16} y={440} text={`🔎 ${ui.meter}`} bg={C.purple} size={16} anim={popStyle(win(t, T.s(3), T.s(PLUG) + 0.5, 0.4))} />
        <Pill x={940} y={440} text={`😶 ${ui.face}`} bg={C.orange} size={16} anim={popStyle(win(t, T.s(PLUG), T.s(PLUG) + 5, 0.4))} />
        <Term x={430} y={6} w={420} h={150} t={t} events={events} anim={fadeStyle(prog(t, T.s(7), 0.4))} size={12.5} />
        <Abs x={1100} y={430} style={{ ...popStyle(prog(t, T.s(10), 0.4)), background: C.green, color: '#fff', borderRadius: 18, padding: '8px 16px', fontSize: 20, fontWeight: 900 }}>🔌 Unplug</Abs>
        <Card x={16} y={500} w={1248} icon="🔧" title={ui.fix} color={C.red} size={13.5} anim={popStyle(prog(t, T.s(11), 0.4))} />
      </>}>
      <Ring x={H(24, '-b').x} y={H(24, '-b').y} t={t} on={t > checkAt[0] && t < checkAt[1]} color="#1e63d6" r={8} />
      <Ring x={sp.x} y={sp.y} t={t} on={t > checkAt[3] && t < checkAt[4]} color={C.orange} r={12} />
      <Ring x={SPEAKER.cx} y={SPEAKER.cy} t={t} on={t > checkAt[3] && t < checkAt[4]} color={C.orange} r={38} />
      <Ring x={vcc.x} y={vcc.y} t={t} on={t > T.s(3) + 2 && t < T.s(PLUG)} color={C.purple} r={8} />
      <Ring x={gnd.x} y={gnd.y} t={t} on={t > T.s(3) + 4 && t < T.s(PLUG)} color={C.purple} r={8} />
    </BenchScene>
  );
};
