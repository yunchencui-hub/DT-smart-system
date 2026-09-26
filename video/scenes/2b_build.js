/* Part 2b: assembly steps 5-8, the recap and troubleshooting. */
'use strict';

const TRACK_NAMES = ['hello', 'good_morning', 'medicine', 'water', 'hot_day', 'lunch', 'checkin_day', 'checkin_night', 'thanks', 'calling_help', 'repeat', 'good_night', 'maybe_later'];

defineScene({
  id: 'step5a', part: '3 · Build', step: 'Step 5 of 8', title: 'Voice, part A: speaker wires (soldering)',
  lines: [
    "Step five: Robin's voice. This has three parts: speaker wires, sound files, and wiring.",
    'Part A. The speaker needs wires, and this is the only soldering in the whole project: just two joints.',
    'Cut one female to female jumper wire in half. Strip about five millimetres of plastic off each cut end, and twist the thin copper strands together.',
    'Solder one half to each speaker tab. The red wire goes to the tab marked plus.',
    'The soldering iron tip is very hot, so never touch it, and hold the wires with tape or a clamp. Never soldered before? Ask at Pulsed. It takes five minutes to learn.',
    'And if your speaker already has wires, you can skip this part.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const parts = V.s('g'); svg.appendChild(parts);
    const panel = (x, title) => {
      const g = V.s('g');
      g.appendChild(V.s('rect', { x, y: 30, width: 290, height: 330, rx: 18, fill: '#fff', stroke: '#e3dccd', 'stroke-width': 2 }));
      g.appendChild(V.s('text', { x: x + 145, y: 340, 'font-size': 20, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1d2b3a' }, title));
      parts.appendChild(g);
      return g;
    };
    const p1 = panel(20, '1 · cut in half'), p2 = panel(330, '2 · strip 5 mm'), p3 = panel(640, '3 · twist'), p4 = panel(950, '4 · solder, red → +');
    // 1: wire + scissors
    const half = (x, y, dir) => { const g = V.s('g'); g.appendChild(V.s('rect', { x: dir < 0 ? x - 36 : x, y: y - 9, width: 36, height: 18, rx: 3, fill: '#222' })); g.appendChild(V.s('line', { x1: dir < 0 ? x : x + 36, y1: y, x2: dir < 0 ? x + 90 : x + 126, y2: y, stroke: '#1e63d6', 'stroke-width': 9, 'stroke-linecap': 'round' })); return g; };
    const hL = half(70, 180, -1), hR = half(154, 180, 1);
    p1.appendChild(hL); p1.appendChild(hR);
    const sc = V.emoji(165, 130, '✂️', 44); p1.appendChild(sc);
    // 2: stripped end
    p2.appendChild(V.s('line', { x1: 370, y1: 180, x2: 520, y2: 180, stroke: '#1e63d6', 'stroke-width': 14, 'stroke-linecap': 'round' }));
    const cu = V.s('line', { x1: 520, y1: 180, x2: 580, y2: 180, stroke: '#d4883b', 'stroke-width': 8 });
    p2.appendChild(cu);
    const dim = V.s('g', {}, V.s('line', { x1: 522, y1: 210, x2: 580, y2: 210, stroke: '#1d2b3a', 'stroke-width': 2 }), V.s('text', { x: 551, y: 236, 'font-size': 18, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1d2b3a' }, '5 mm'));
    p2.appendChild(dim);
    // 3: twisted strands
    p3.appendChild(V.s('line', { x1: 680, y1: 180, x2: 820, y2: 180, stroke: '#1e63d6', 'stroke-width': 14, 'stroke-linecap': 'round' }));
    const tw = V.s('path', { d: 'M820,180 q6,-8 12,0 t12,0 t12,0 t12,0 t12,0', fill: 'none', stroke: '#d4883b', 'stroke-width': 7 });
    p3.appendChild(tw);
    p3.appendChild(V.emoji(850, 120, '🤏', 40));
    // 4: speaker + wires + iron
    const spk = V.speaker(1095, 150, 60);
    p4.appendChild(spk.g);
    const wr = V.s('path', { d: `M${spk.tabPlus.x},${spk.tabPlus.y} C${spk.tabPlus.x - 10},290 1010,300 990,318`, fill: 'none', stroke: '#e53935', 'stroke-width': 7, 'stroke-linecap': 'round' });
    const wb = V.s('path', { d: `M${spk.tabMinus.x},${spk.tabMinus.y} C${spk.tabMinus.x + 10},290 1180,300 1200,318`, fill: 'none', stroke: '#212121', 'stroke-width': 7, 'stroke-linecap': 'round' });
    p4.appendChild(wr); p4.appendChild(wb);
    const iron = V.s('g', {}, V.s('rect', { x: 1150, y: 200, width: 90, height: 18, rx: 9, fill: '#1e63d6', transform: 'rotate(-30 1150 209)' }), V.s('line', { x1: 1150, y1: 209, x2: 1112, y2: 230, stroke: '#9e9e9e', 'stroke-width': 7, 'stroke-linecap': 'round' }));
    const smoke = V.s('g', {}, V.s('circle', { cx: 1108, cy: 214, r: 6, fill: '#bdbdbd', opacity: 0.6 }), V.s('circle', { cx: 1100, cy: 200, r: 8, fill: '#bdbdbd', opacity: 0.4 }));
    p4.appendChild(iron); p4.appendChild(smoke);
    const safety = V.card(root, { x: 20, y: 400, w: 760, icon: '🔥', title: 'The tip is very hot: never touch it', text: 'Hold the wires with tape or a clamp. First time? Ask at Pulsed: 5 minutes to learn.', color: '#e53935', size: 17 });
    const skip = V.card(root, { x: 800, y: 400, w: 460, icon: '⏭️', title: 'Speaker has wires already?', text: 'Skip part A.', color: '#2e9e4f', size: 17 });
    const intro = V.box({ left: '160px', top: '200px', display: 'flex', gap: '26px' });
    ['A · speaker wires', 'B · sound files', 'C · wiring'].forEach((s, i) => intro.appendChild(V.h('div', { style: { fontSize: '30px', fontWeight: 900, color: '#fff', background: ['#f57c00', '#7e57c2', '#0f8a8f'][i], borderRadius: '20px', padding: '22px 30px' } }, s)));
    root.appendChild(intro);
    return (t) => {
      V.fade(intro, V.win(t, 0.4, T.s(1) + 0.3));
      V.fade(p1, V.p(t, T.s(2), 0.4));
      const cut = V.pe(t, T.s(2) + 1.2, 0.8);
      hL.setAttribute('transform', `translate(${(-cut * 14).toFixed(1)} 0)`); hR.setAttribute('transform', `translate(${(cut * 14).toFixed(1)} 0)`);
      V.fade(sc, V.win(t, T.s(2) + 0.3, T.s(2) + 2.4));
      V.fade(p2, V.p(t, T.s(2) + 3, 0.4)); V.fade(dim, V.p(t, T.s(2) + 4, 0.4));
      V.fade(p3, V.p(t, T.s(2) + 6, 0.4));
      V.fade(p4, V.p(t, T.s(3), 0.4));
      V.drawPath(wr, V.p(t, T.s(3) + 1.5, 0.8)); V.drawPath(wb, V.p(t, T.s(3) + 2.4, 0.8));
      V.fade(iron, V.win(t, T.s(3) + 0.8, T.s(4) + 3));
      V.fade(smoke, t > T.s(3) + 1.5 && t < T.s(4) + 3 ? 0.4 + 0.5 * V.pulse(t, 1.4) : 0);
      V.rise(safety, V.p(t, T.s(4), 0.5));
      V.pop(skip, V.p(t, T.s(5), 0.5));
    };
  },
});

defineScene({
  id: 'step5b', part: '3 · Build', step: 'Step 5 of 8', title: 'Voice, part B: put the sound files on',
  lines: [
    'Part B: we give Robin its voice. The module has its own 8 megabytes of memory, so no memory card is needed.',
    'Take the module off the breadboard, and connect it to your laptop with a micro-USB data cable. It shows up as a small USB drive.',
    'Delete any demo files on it. Then copy the thirteen files, 01 dot mp3 to 13 dot mp3, from the folder audio slash en, into the root of the drive. Not inside a folder.',
    'Use audio slash nl instead, if Robin should speak Dutch. Then eject the drive safely.',
    'Robin itself only ever asks for a number, like track 3. The file with that number decides what it says.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const vm = V.voice(60, 160, 1.6);
    svg.appendChild(vm.g);
    const cable = V.s('path', { d: 'M165,150 C165,60 330,40 420,90', fill: 'none', stroke: '#3d3d3d', 'stroke-width': 8, 'stroke-linecap': 'round' });
    svg.appendChild(cable);
    const mem = V.card(root, { x: 30, y: 380, w: 380, icon: '💾', title: '8 MB on the module', text: 'No SD card needed (SD cards now cost more than the module).', color: '#1f3b70', size: 16 });
    const win = V.box({ left: '430px', top: '20px', width: '810px', height: '520px', background: '#fff', borderRadius: '14px', boxShadow: '0 10px 26px rgba(0,0,0,0.18)', overflow: 'hidden' });
    win.appendChild(V.h('div', { style: { background: '#e8eef3', padding: '10px 16px', fontSize: '17px', fontWeight: 900, color: '#1d2b3a' } }, '💽  USB drive (DFR0534)  ›  root'));
    const list = V.h('div', { style: { padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', fontSize: '17px', fontWeight: 700 } });
    win.appendChild(list);
    root.appendChild(win);
    const demo = ['demo files from the factory…'].map((n) => { const e = V.h('div', { style: { padding: '5px 0', color: '#7b8794', gridColumn: '1 / span 2' } }, '🗑️  ' + n); list.appendChild(e); return e; });
    const files = TRACK_NAMES.map((n, i) => { const e = V.h('div', { style: { padding: '4px 0', fontFamily: 'JetBrains Mono', fontSize: '15.5px' } }, V.h('span', { style: { color: '#0f8a8f', fontWeight: 700 } }, `🎵 ${String(i + 1).padStart(2, '0')}.mp3`), V.h('span', { style: { color: '#7b8794' } }, '  ' + n)); list.appendChild(e); return e; });
    const nl = V.box({ left: '450px', top: '470px', fontSize: '18px', fontWeight: 900, color: '#fff', background: '#f57c00', borderRadius: '20px', padding: '8px 18px' }, '🇳🇱 Dutch? use audio/nl');
    const ej = V.box({ left: '760px', top: '470px', fontSize: '18px', fontWeight: 900, color: '#fff', background: '#0f8a8f', borderRadius: '20px', padding: '8px 18px' }, '⏏️ Eject safely');
    root.appendChild(nl); root.appendChild(ej);
    const map = V.card(root, { x: 430, y: 380, w: 810, icon: '🔢', title: 'The robot asks for a number:  say 3  →  03.mp3', text: '“It\u2019s time for your medicine. Have you taken it? Press green for yes, or red for no.”', color: '#7e57c2', size: 17 });
    return (t) => {
      V.pop(mem, V.p(t, T.s(0) + 2, 0.5));
      V.fade(vm.g, V.p(t, 0.2, 0.4));
      V.drawPath(cable, V.pe(t, T.s(1) + 1.5, 1));
      V.fade(win, V.p(t, T.s(1) + 3, 0.5));
      demo.forEach((e) => { V.fade(e, V.p(t, T.s(1) + 3.2, 0.3) * (1 - V.p(t, T.s(2) + 1.5, 0.4))); e.style.textDecoration = t > T.s(2) + 0.8 ? 'line-through' : 'none'; });
      files.forEach((e, i) => V.fade(e, V.p(t, T.s(2) + 3 + i * 0.3, 0.25)));
      V.pop(nl, Math.min(V.p(t, T.s(3), 0.4), 1 - V.p(t, T.s(4), 0.3))); V.pop(ej, Math.min(V.p(t, T.s(3) + 3, 0.4), 1 - V.p(t, T.s(4), 0.3)));
      V.rise(map, V.p(t, T.s(4), 0.5));
    };
  },
});

defineScene({
  id: 'step5c', part: '3 · Build', step: 'Step 5 of 8', title: 'Voice, part C: wiring',
  lines: [
    'Part C: wiring. Put the module back. VCC goes to the red plus rail, and GND to the blue minus rail.',
    "Now the talking wires. The module's TX goes to Arduino pin D0.",
    "The module's RX goes into the breadboard at column 24. A one kilo-ohm resistor, brown, black, red, bridges from column 24 to column 28. And a wire goes from column 28 to pin D1.",
    'Finally, connect the speaker wires to SP plus and SP minus.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const b = bench(svg, { upto: 4 });
    const vm = b.it.voiceApi, ts = 11;
    const d0 = b.uno.pin('D0'), d1 = b.uno.pin('D1');
    const h24 = b.bb.hole(24, 'a'), h28 = b.bb.hole(28, 'a');
    const rs = [b.ring(d0.x, d0.y, '#1e63d6', 7), b.ring(h24.x, h24.y, '#00a3a3', 6), b.ring(h28.x, h28.y, '#ec407a', 6), b.ring(d1.x, d1.y, '#ec407a', 7)];
    const tD0 = b.tag(d0.x, d0.y, 'D0 (RX)', { dx: 30, dy: 44, size: ts, color: '#1e63d6' });
    const tD1 = b.tag(d1.x, d1.y, 'D1 (TX)', { dx: -40, dy: 44, size: ts, color: '#ec407a' });
    const tR = b.tag(b.bb.hole(26, 'c').x, b.bb.hole(26, 'c').y, '1 kΩ: brown · black · red', { dy: 60, size: ts, color: '#6d3b1f' });
    const tSp = b.tag(1180, 108, 'SP+ red · SP− black', { dy: 100, dx: -10, size: ts, color: '#1d2b3a' });
    const tV = b.tag(vm.pin('VCC').x, vm.pin('VCC').y, 'VCC → +   GND → −', { dx: -120, dy: -8, size: ts, color: '#e53935' });
    return (t) => {
      camera(svg, t, [[0, FULL], [1.4, BENCH_VIEWS[5]]]);
      b.set('voice', V.p(t, 0.8, 0.6));
      V.fade(tV, V.win(t, 2.2, T.s(1)));
      b.set('wVV', V.pe(t, T.s(0) + 3, 1.6)); b.set('wVG', V.pe(t, T.s(0) + 5, 1.6));
      b.set('wTX', V.pe(t, T.s(1) + 1.5, 1.8)); rs[0].set(t, t > T.s(1) + 3 && t < T.s(2)); V.fade(tD0, V.win(t, T.s(1) + 3, T.s(3)));
      b.set('wRX', V.pe(t, T.s(2) + 0.8, 1)); rs[1].set(t, t > T.s(2) + 1.5 && t < T.s(2) + 4);
      b.set('r1k', V.p(t, T.s(2) + 4, 0.6)); V.fade(tR, V.win(t, T.s(2) + 4.5, T.s(3) + 1));
      rs[2].set(t, t > T.s(2) + 8 && t < T.s(2) + 10); b.set('wD1', V.pe(t, T.s(2) + 9.5, 1.8));
      rs[3].set(t, t > T.s(2) + 11 && t < T.s(3)); V.fade(tD1, V.win(t, T.s(2) + 11, T.s(3) + 3));
      b.set('spk', V.p(t, T.s(3) + 0.2, 0.6)); b.set('wSPp', V.pe(t, T.s(3) + 1, 1.2)); b.set('wSPm', V.pe(t, T.s(3) + 1.8, 1.2));
      V.fade(tSp, V.p(t, T.s(3) + 2.2, 0.4));
    };
  },
});

defineScene({
  id: 'step5d', part: '3 · Build', step: 'Step 5 of 8', title: 'Why do TX and RX cross?',
  lines: [
    'Why does TX go to D0, and D1 to RX? TX means: I talk. RX means: I listen.',
    "One device's mouth has to go to the other device's ear. So the wires cross.",
    "Pin D1 is the Arduino's mouth, its TX. Pin D0 is its ear, its RX.",
    "The one kilo-ohm resistor protects the module's ear from the Arduino's strong five volt signal, by limiting the current. The module's documentation recommends it for five volt boards.",
  ],
  build(root, T) {
    const svg = V.svg(root);
    const head = (x, name, color) => {
      const g = V.s('g');
      g.appendChild(V.s('rect', { x, y: 110, width: 280, height: 300, rx: 40, fill: color }));
      g.appendChild(V.s('text', { x: x + 140, y: 160, 'font-size': 28, 'font-weight': 900, fill: '#fff', 'text-anchor': 'middle' }, name));
      svg.appendChild(g);
      return g;
    };
    const hA = head(90, 'Arduino', '#0f8a8f'), hM = head(910, 'Voice module', '#1f3b70');
    const lab = (x, y, emo, txt, anchor) => { const g = V.s('g'); g.appendChild(V.emoji(x, y, emo, 44)); g.appendChild(V.s('text', { x: anchor === 'end' ? x - 36 : x + 36, y: y + 8, 'font-size': 22, 'font-weight': 900, fill: '#fff', 'text-anchor': anchor }, txt)); svg.appendChild(g); return g; };
    const aMouth = lab(330, 230, '👄', 'D1 = TX', 'end'), aEar = lab(330, 340, '👂', 'D0 = RX', 'end');
    const mMouth = lab(950, 230, '👄', 'TX', 'start'), mEar = lab(950, 340, '👂', 'RX', 'start');
    const w1 = V.s('path', { d: 'M360,230 L500,230 C640,230 780,340 920,340', fill: 'none', stroke: '#ec407a', 'stroke-width': 8, 'stroke-linecap': 'round' });
    const w2 = V.s('path', { d: 'M920,230 C780,230 640,340 500,340 L360,340', fill: 'none', stroke: '#1e63d6', 'stroke-width': 8, 'stroke-linecap': 'round' });
    svg.appendChild(w1); svg.appendChild(w2);
    const res = V.s('g', {}, V.s('rect', { x: 390, y: 216, width: 80, height: 28, rx: 10, fill: '#e3cf9c', stroke: '#b59a5a', 'stroke-width': 2 }),
      ...[0, 1, 2].map((i) => V.s('rect', { x: 404 + i * 16, y: 216, width: 8, height: 28, fill: ['#6d3b1f', '#1b1b1b', '#d32f2f'][i] })),
      V.s('text', { x: 430, y: 206, 'font-size': 20, 'font-weight': 900, fill: '#6d3b1f', 'text-anchor': 'middle' }, '1 kΩ'));
    svg.appendChild(res);
    const cross = V.box({ left: '440px', top: '440px', fontSize: '26px', fontWeight: 900, color: '#1d2b3a', width: '400px', textAlign: 'center' }, 'mouth → ear, both ways');
    root.appendChild(cross);
    const protect = V.card(root, { x: 380, y: 20, w: 520, icon: '🛡️', title: '1 kΩ protects the module\u2019s ear', text: 'It limits the current from the 5 V signal (as the module\u2019s docs recommend for 5 V boards).', color: '#6d3b1f', size: 16 });
    return (t) => {
      V.fade(hA, V.p(t, 0.2, 0.4)); V.fade(hM, V.p(t, 0.2, 0.4));
      [aMouth, mMouth].forEach((g) => V.fade(g, V.p(t, T.s(0) + 3, 0.4)));
      [aEar, mEar].forEach((g) => V.fade(g, V.p(t, T.s(0) + 5, 0.4)));
      V.drawPath(w1, V.pe(t, T.s(1) + 0.5, 1)); V.drawPath(w2, V.pe(t, T.s(1) + 1.6, 1));
      V.fade(cross, V.p(t, T.s(1) + 2.6, 0.4));
      V.fade(res, V.p(t, T.s(3), 0.4));
      V.pop(protect, V.p(t, T.s(3) + 0.5, 0.5));
      aMouth.style.filter = t > T.s(2) && t < T.s(2) + 2.5 ? 'drop-shadow(0 0 8px #ffd54f)' : '';
      aEar.style.filter = t > T.s(2) + 2.5 && t < T.s(3) ? 'drop-shadow(0 0 8px #ffd54f)' : '';
    };
  },
});

defineScene({
  id: 'step5e', part: '3 · Build', step: 'Step 5 of 8', title: 'Voice: test',
  lines: [
    'Test time! Press the reset button on the Arduino. After about two seconds, you hear:',
    { robin: 1 },
    'That\u2019s track one. Robin plays it on every start, as a sound check.',
    'Now type: say 3.',
    { robin: 3 },
    'Type vol 15 to make it quieter. Volume goes from zero to thirty. For this small speaker, stay at 22 or below.',
    'No sound? Check that TX and RX cross, that the files are in the root of the drive, and try vol 20. If the board restarts while talking loudly, lower the volume, or use a stronger USB port.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const b = bench(svg, { upto: 5 });
    const view = camBox(760, 250, 1040);
    const mon = V.term(root, { x: 20, y: 14, w: 470, h: 176, kind: 'serial', size: 13 });
    const sayT = mon.type(T.s(3) + 1, 'say 3');
    mon.out(sayT, '[cmd] say 3');
    const volT = mon.type(T.s(5) + 0.8, 'vol 15');
    mon.out(volT, '[cmd] vol 15');
    const rst = V.tag(b.uno.x + 5 * 5.2, b.uno.y + 4 * 5.2, 'reset', { dx: 30, dy: -40, size: 13, color: '#e53935' });
    b.top.appendChild(rst);
    const fix = V.card(root, { x: 20, y: 400, w: 1240, icon: '🔧', title: 'No sound?', text: 'TX/RX crossed? Files in the root? Try <span class="k">vol 20</span>. Board restarts when loud → lower the volume or use a stronger USB port.', color: '#e53935', size: 16 });
    return (t) => {
      camera(svg, t, [[0, FULL], [1.2, view]]);
      V.fade(mon.el, V.p(t, 0.5, 0.4));
      mon.update(t);
      V.fade(rst, V.win(t, 0.8, T.s(1)));
      const on = t > T.s(0) + 2;
      b.uno.power(on);
      const talkA = t > T.s(1) && t < T.e(1), talkB = t > T.s(4) && t < T.e(4);
      b.it.spkApi.talk(t, talkA || talkB);
      let face = V.blinkFace(t);
      if (t > T.s(4) && t < T.s(4) + 3) face = 'talk';   // "say" without ms = 3 s talking face
      if (on) b.uno.matrix.set(face);
      V.rise(fix, V.p(t, T.s(6), 0.5));
    };
  },
});

defineScene({
  id: 'step6', part: '3 · Build', step: 'Step 6 of 8', title: 'Faces',
  lines: [
    'Step six: faces. No wiring needed. The LED grid is already on the board.',
    'Each face is a tiny picture of twelve by eight dots.',
    'Type face ask. Raised eyebrows: Robin is waiting for an answer.',
    'Type face concern. A worried frown.',
    'Type face sleep. That\u2019s night mode.',
    'And face happy. Every few seconds, it blinks, just like Tessa\u2019s eyes.',
    'There are also faces for talking, yes, no, and offline. Nine faces in total. You can even draw your own in the Arduino LED matrix editor.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    svg.appendChild(V.s('rect', { x: 60, y: 24, width: 520, height: 350, rx: 26, fill: '#0f8a8f' }));
    const m = V.matrix(98, 62, 40, 13);
    svg.appendChild(m.g);
    const grid = V.s('g', { opacity: 0 });
    for (let c = 0; c <= 12; c++) grid.appendChild(V.s('line', { x1: 78 + c * 40, y1: 42, x2: 78 + c * 40, y2: 362, stroke: '#ffffff', 'stroke-opacity': 0.35 }));
    for (let r = 0; r <= 8; r++) grid.appendChild(V.s('line', { x1: 78, y1: 42 + r * 40, x2: 558, y2: 42 + r * 40, stroke: '#ffffff', 'stroke-opacity': 0.35 }));
    svg.appendChild(grid);
    const dims = V.s('text', { x: 320, y: 400, 'font-size': 22, 'font-weight': 900, fill: '#1d2b3a', 'text-anchor': 'middle' }, '12 × 8 = 96 LEDs');
    svg.appendChild(dims);
    const mon = V.term(root, { x: 640, y: 24, w: 600, h: 350, kind: 'serial', size: 15 });
    const cmds = [[2, 'face ask', 'ask'], [3, 'face concern', 'concern'], [4, 'face sleep', 'sleep'], [5, 'face happy', 'happy']];
    const faceAt = [];
    cmds.forEach(([ln, cmd, mood]) => { const tt = mon.type(T.s(ln) + 0.3, cmd); mon.out(tt, '[cmd] ' + cmd); faceAt.push([tt, mood]); });
    const names = ['happy', 'blink', 'talk', 'ask', 'concern', 'sleep', 'yes', 'no', 'offline'];
    const small = names.map((n, i) => {
      const g = V.s('g');
      g.appendChild(V.s('rect', { x: 36 + i * 136, y: 420, width: 122, height: 90, rx: 10, fill: '#0f8a8f' }));
      const sm = V.matrix(44 + i * 136, 432, 9.6, 3.2);
      sm.set(n);
      g.appendChild(sm.g);
      g.appendChild(V.s('text', { x: 97 + i * 136, y: 532, 'font-size': 17, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1d2b3a' }, n));
      svg.appendChild(g);
      return g;
    });
    const editor = V.box({ left: '760px', top: '300px', fontSize: '16px', fontWeight: 900, color: '#fff', background: '#7e57c2', borderRadius: '16px', padding: '8px 16px' }, '✏️ ledmatrix-editor.arduino.cc');
    root.appendChild(editor);
    return (t) => {
      let face = V.blinkFace(t);
      for (const [tt, mood] of faceAt) if (t >= tt) face = mood === 'happy' ? V.blinkFace(t, 3) : mood;
      m.set(face);
      grid.setAttribute('opacity', V.win(t, T.s(1), T.s(2) + 0.3) * 1);
      V.fade(dims, V.win(t, T.s(1) + 0.5, T.s(2) + 0.3));
      V.fade(mon.el, V.p(t, T.s(2), 0.4));
      mon.update(t);
      small.forEach((g, i) => V.fade(g, V.p(t, T.s(6) + 0.5 + i * 0.35, 0.3)));
      V.pop(editor, V.p(t, T.s(6) + 6, 0.5));
    };
  },
});

defineScene({
  id: 'step7a', part: '3 · Build', step: 'Step 7 of 8', title: 'Go online: the hotspot',
  lines: [
    'Step seven: go online. Only now do we add the network.',
    "Robin only speaks 2.4 gigahertz WiFi. The easiest is your phone's hotspot.",
    'On an iPhone, turn on Maximise Compatibility. On Android, set the hotspot band to 2.4 gigahertz.',
    "Eduroam won't work. It needs a special enterprise login that the board can't do, and university networks often block devices from talking to each other.",
    'Connect your laptop to the same hotspot, and look up its IP address. On Windows, type ipconfig. On a Mac, type ipconfig getifaddr en0.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const ph = V.phone(60, 30, 1.6);
    svg.appendChild(ph.g);
    const row = (y, label, on, sub) => {
      const g = V.s('g');
      g.appendChild(V.s('rect', { x: 6, y, width: 122, height: 34, rx: 6, fill: '#fff' }));
      g.appendChild(V.s('text', { x: 10, y: y + 15, 'font-size': 7.4, 'font-weight': 800, fill: '#1d2b3a' }, label));
      if (sub) g.appendChild(V.s('text', { x: 12, y: y + 27, 'font-size': 7, 'font-weight': 700, fill: '#7b8794' }, sub));
      const tg = V.s('rect', { x: 98, y: y + 10, width: 24, height: 14, rx: 7, fill: on ? '#34c759' : '#ccc' });
      g.appendChild(tg); g.appendChild(V.s('circle', { cx: on ? 115 : 105, cy: y + 17, r: 6, fill: '#fff' }));
      ph.screen.appendChild(g);
      return g;
    };
    ph.screen.appendChild(V.s('text', { x: 67, y: 16, 'font-size': 11, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1d2b3a' }, 'Personal Hotspot'));
    row(30, 'Allow Others to Join', true);
    const mc = row(72, 'Maximise Compatibility', true, '= 2.4 GHz');
    const c1 = V.card(root, { x: 360, y: 24, w: 420, icon: '📶', title: 'Robin needs 2.4 GHz WiFi', text: 'Your phone\u2019s hotspot is the easiest.', color: '#0f8a8f', size: 17 });
    const c2 = V.card(root, { x: 360, y: 160, w: 420, icon: '🍏', title: 'iPhone', text: 'Settings → Personal Hotspot → <b>Maximise Compatibility ON</b>', color: '#1d2b3a', size: 16 });
    const c3 = V.card(root, { x: 360, y: 290, w: 420, icon: '🤖', title: 'Android', text: 'Hotspot → AP band → <b>2.4 GHz</b>', color: '#2e9e4f', size: 16 });
    const c4 = V.card(root, { x: 820, y: 24, w: 420, icon: '🚫', title: 'eduroam won\u2019t work', text: 'Enterprise login (the board can\u2019t) + devices often can\u2019t talk to each other.', color: '#e53935', size: 16 });
    const term = V.term(root, { x: 820, y: 200, w: 420, h: 330, kind: 'shell', title: 'Laptop terminal', size: 14, prompt: '> ' });
    const i1 = term.type(T.s(4) + 5, 'ipconfig');
    term.out(i1, ['Wireless LAN adapter Wi-Fi:', '   IPv4 Address. . . : 172.20.10.2'], 0.15);
    const i2 = term.type(i1 + 2.2, 'ipconfig getifaddr en0');
    term.out(i2, ['172.20.10.2'], 0.1);
    const ipTag = V.box({ left: '360px', top: '440px', fontSize: '22px', fontWeight: 900, color: '#fff', background: '#f57c00', borderRadius: '18px', padding: '10px 20px' }, '💻 laptop IP = 172.20.10.2');
    root.appendChild(ipTag);
    return (t) => {
      V.fade(ph.g, V.p(t, T.s(1), 0.5));
      mc.style.filter = t > T.s(2) && t < T.s(3) ? 'drop-shadow(0 0 5px #f57c00)' : '';
      V.pop(c1, V.p(t, T.s(1) + 0.5, 0.5)); V.pop(c2, V.p(t, T.s(2), 0.5)); V.pop(c3, V.p(t, T.s(2) + 3, 0.5));
      V.pop(c4, V.p(t, T.s(3), 0.5));
      V.fade(term.el, V.p(t, T.s(4) + 1, 0.4)); term.update(t);
      V.pop(ipTag, V.p(t, i2 + 0.8, 0.5));
    };
  },
});

defineScene({
  id: 'step7b', part: '3 · Build', step: 'Step 7 of 8', title: 'Go online: secrets file and the broker',
  lines: [
    'Open arduino_secrets.h again. Fill in the hotspot name, its password, and the laptop\u2019s IP address as the MQTT host. Keep the device ID robin-01.',
    'Upload the sketch again.',
    'On the laptop, start Mosquitto, our MQTT post office, with our config file from the broker folder.',
    'If Windows Firewall asks, allow it on private networks, and make sure the hotspot is set to private.',
  ],
  build(root, T) {
    const code = V.code(root, [
      '#define SECRET_WIFI_SSID  <b class="hl">"MyPhoneHotspot"</b>   <span style="color:#8ee6a0">// 2.4 GHz!</span>',
      '#define SECRET_WIFI_PASS  <b class="hl">"hotspot-password"</b>',
      '#define SECRET_MQTT_HOST  <b class="hl">"172.20.10.2"</b>      <span style="color:#8ee6a0">// laptop IP</span>',
      '#define SECRET_MQTT_PORT  1883',
      '#define SECRET_MQTT_USER  ""',
      '#define SECRET_MQTT_PASS  ""',
      '#define SECRET_DEVICE_ID  "robin-01"',
    ], { x: 40, y: 24, w: 760, size: 16.5, title: 'firmware/robin/arduino_secrets.h' });
    const up = V.box({ left: '820px', top: '60px', fontSize: '24px', fontWeight: 900, color: '#fff', background: '#0f8a8f', borderRadius: '30px', padding: '12px 28px' }, 'Upload →');
    root.appendChild(up);
    const sec = V.card(root, { x: 820, y: 130, w: 420, icon: '🔒', title: 'Stays on your laptop', text: '<span class="k">arduino_secrets.h</span> is in .gitignore: your password never goes to GitHub.', color: '#7b8794', size: 15 });
    const term = V.term(root, { x: 40, y: 300, w: 760, h: 240, kind: 'shell', title: 'Terminal (repo folder)', size: 14.5 });
    const tt = term.type(T.s(2) + 1, 'mosquitto -c broker/mosquitto.conf -v');
    term.out(tt, ['mosquitto version 2.x starting', 'Config loaded from broker/mosquitto.conf.', 'Opening ipv4 listen socket on port 1883.'], 0.25, '#9fb3c8');
    const winNote = V.box({ left: '48px', top: '505px', fontSize: '14px', fontWeight: 800, color: '#cfd8e3' }, 'Windows: "C:\\Program Files\\mosquitto\\mosquitto.exe" -c broker\\mosquitto.conf -v  (guide 05, C.2)');
    root.appendChild(winNote);
    const fw = V.box({ left: '840px', top: '300px', width: '400px', background: '#fff', borderRadius: '10px', boxShadow: '0 10px 26px rgba(0,0,0,0.25)', overflow: 'hidden', fontSize: '16px' });
    fw.appendChild(V.h('div', { style: { background: '#1e63d6', color: '#fff', fontWeight: 900, padding: '8px 14px' } }, '🛡️ Windows Firewall'));
    fw.appendChild(V.h('div', { style: { padding: '10px 14px', fontWeight: 700, color: '#1d2b3a', lineHeight: 1.5 } }, 'Allow mosquitto to communicate on:', V.h('div', {}, '☑  Private networks'), V.h('div', { style: { color: '#9aa3ab' } }, '☐  Public networks'),
      V.h('div', { style: { marginTop: '8px', textAlign: 'right' } }, V.h('span', { style: { background: '#1e63d6', color: '#fff', borderRadius: '6px', padding: '4px 14px', fontWeight: 900 } }, 'Allow access'))));
    root.appendChild(fw);
    return (t) => {
      V.fade(code.el, V.p(t, 0.3, 0.4));
      code.rows.forEach((r, i) => { r.style.background = (i === 0 && t > T.s(0) + 3) || (i === 1 && t > T.s(0) + 4.5) || (i === 2 && t > T.s(0) + 6) ? 'rgba(255,213,79,0.14)' : 'transparent'; });
      V.pop(up, V.p(t, T.s(1), 0.4));
      V.pop(sec, V.p(t, T.s(1) + 1.2, 0.4));
      V.fade(term.el, V.p(t, T.s(2), 0.4)); term.update(t);
      V.fade(winNote, V.p(t, T.s(2) + 4, 0.4));
      V.pop(fw, V.p(t, T.s(3) + 0.5, 0.5));
    };
  },
});

defineScene({
  id: 'step7c', part: '3 · Build', step: 'Step 7 of 8', title: 'Go online: test',
  lines: [
    'Test: the face changes from cross eyes to a happy face. And the broker log says: new client connected, as robin-01.',
    "Open a second terminal and type mosquitto_sub, with the topic robin slash hash. Now you see Robin's messages arrive, every two seconds.",
    'Still cross-eyed? The Serial Monitor tells you why. wifi failed means a wrong name, a wrong password, or a 5 gigahertz network.',
    "mqtt failed with error minus one, or minus two, means the laptop can't be reached. Check the IP address, the firewall, and that Mosquitto is running.",
    'One more tip: the IP address can change when the hotspot restarts. Check it before every demo.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    svg.appendChild(V.s('rect', { x: 40, y: 24, width: 330, height: 230, rx: 22, fill: '#0f8a8f' }));
    const m = V.matrix(66, 50, 25, 8.5);
    svg.appendChild(m.g);
    const broker = V.term(root, { x: 400, y: 24, w: 840, h: 130, kind: 'shell', title: 'Terminal 1: mosquitto -v', size: 14 });
    broker.out(T.s(0) + 2.5, 'New client connected from 172.20.10.4:54012 as robin-01', 0, '#8ee6a0');
    const sub = V.term(root, { x: 400, y: 170, w: 840, h: 370, kind: 'shell', title: 'Terminal 2', size: 13 });
    const st = sub.type(T.s(1) + 1, 'mosquitto_sub -h localhost -t "robin/#" -v');
    sub.out(st + 0.3, ['robin/robin-01/status online', 'robin/robin-01/event {"boot":48213,"eseq":1,…,"type":"boot","value":"1.0.0"}'], 0.3, '#ffd54f');
    for (let i = 0; i < 12; i++) sub.out(st + 1.2 + i * 2, `robin/robin-01/telemetry {"boot":48213,"seq":${17 + i},…,"n":20,"edges":${i % 3 === 0 ? 1 : 0},"light":${612 + (i % 4)},…}`);
    const tb = V.table(root, [['Serial Monitor says', 'Meaning / fix'],
      ['<span class="k">[wifi] failed, will retry</span>', 'wrong name or password, or 5 GHz → use 2.4 GHz'],
      ['<span class="k">[mqtt] failed, error -1</span> / <span class="k">-2</span>', 'laptop not reachable → IP, firewall, is Mosquitto running?']], { x: 20, y: 300, w: 360, size: 13.5 });
    const ip = V.card(root, { x: 20, y: 470, w: 360, icon: '🔁', title: 'IP can change', text: 'Check it before every demo.', color: '#f57c00', size: 15 });
    return (t) => {
      const online = t > T.s(0) + 2.3;
      m.set(online ? V.blinkFace(t) : 'offline');
      V.fade(broker.el, V.p(t, T.s(0) + 1.5, 0.4)); broker.update(t);
      V.fade(sub.el, V.p(t, T.s(1), 0.4)); sub.update(t);
      V.fade(tb.tbl, V.p(t, T.s(2), 0.4));
      tb.trs.forEach((tr, i) => { if (i) V.fade(tr, V.p(t, i === 1 ? T.s(2) + 1 : T.s(3) + 0.5, 0.4)); });
      V.pop(ip, V.p(t, T.s(4), 0.5));
    };
  },
});

defineScene({
  id: 'step8a', part: '3 · Build', step: 'Step 8 of 8', title: 'The body: front and side',
  lines: [
    "Step eight: the body. It's optional, but it turns a pile of wires into a robot someone wants on their table.",
    'We use the Kradex box, 176 by 126 by 57 millimetres, standing up, with the transparent lid as the face.',
    "Put the Arduino inside, with the LED grid right behind the clear lid. That's Robin's face.",
    'Drill a hole of 23 to 24 millimetres in the lid for the PIR dome, so it can look into the room.',
    'On one side, drill six to eight small holes of 4 millimetres, and glue the speaker behind them.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const S = 2.5, fx = 120, fy = 60;
    const front = V.s('g');
    front.appendChild(V.s('rect', { x: fx, y: fy, width: 126 * S * 0.72, height: 176 * S * 0.72, rx: 14, fill: '#dfeef3', stroke: '#5f666d', 'stroke-width': 4 }));
    svg.appendChild(front);
    const FW = 126 * S * 0.72, FH = 176 * S * 0.72;
    const dimF = V.s('g', {}, V.s('text', { x: fx + FW / 2, y: fy - 14, 'font-size': 18, 'font-weight': 900, 'text-anchor': 'middle', fill: '#5b6b7b' }, '126 mm'), V.s('text', { x: fx - 16, y: fy + FH / 2, 'font-size': 18, 'font-weight': 900, 'text-anchor': 'middle', fill: '#5b6b7b', transform: `rotate(-90 ${fx - 16} ${fy + FH / 2})` }, '176 mm'));
    svg.appendChild(dimF);
    const board = V.s('rect', { x: fx + 24, y: fy + 120, width: FW - 48, height: 150, rx: 10, fill: '#0f8a8f', opacity: 0.9 });
    svg.appendChild(board);
    const m = V.matrix(fx + FW / 2 - 5.5 * 13, fy + 170, 13, 4.5);
    svg.appendChild(m.g);
    const pirHole = V.s('g', {}, V.s('circle', { cx: fx + FW / 2, cy: fy + 70, r: 30, fill: '#fbfbf8', stroke: '#1d2b3a', 'stroke-width': 3, 'stroke-dasharray': '6 5' }));
    svg.appendChild(pirHole);
    const tPir = V.tag(fx + FW / 2, fy + 70, 'Ø 23–24 mm for the PIR dome', { dx: 250, dy: -10, size: 17, color: '#2f7d46' });
    svg.appendChild(tPir);
    // side view
    const sx = 620, sw = 57 * S * 0.72;
    const side = V.s('g', {}, V.s('rect', { x: sx, y: fy, width: sw, height: FH, rx: 10, fill: '#8f969d', stroke: '#5f666d', 'stroke-width': 4 }),
      V.s('text', { x: sx + sw / 2, y: fy - 14, 'font-size': 18, 'font-weight': 900, 'text-anchor': 'middle', fill: '#5b6b7b' }, '57 mm'));
    svg.appendChild(side);
    const holes = V.s('g');
    for (let i = 0; i < 8; i++) holes.appendChild(V.s('circle', { cx: sx + sw / 2 - 16 + (i % 2) * 32, cy: fy + 200 + Math.floor(i / 2) * 26, r: 6, fill: '#2d3136' }));
    svg.appendChild(holes);
    const spk = V.s('circle', { cx: sx + sw / 2, cy: fy + 240, r: 48, fill: 'none', stroke: '#1d2b3a', 'stroke-width': 3, 'stroke-dasharray': '7 6' });
    svg.appendChild(spk);
    const tHoles = V.tag(sx + sw, fy + 240, '6–8 holes, Ø 4 mm · speaker glued behind', { dx: 200, dy: 120, size: 16, color: '#1d2b3a' });
    svg.appendChild(tHoles);
    const c1 = V.card(root, { x: 820, y: 24, w: 420, icon: '📦', title: 'Kradex 176 × 126 × 57 mm', text: 'Standing up. The clear lid = the face.', color: '#5f666d', size: 16 });
    const c2 = V.card(root, { x: 820, y: 150, w: 420, icon: '🙂', title: 'LED grid right behind the lid', text: 'That\u2019s Robin\u2019s face.', color: '#0f8a8f', size: 16 });
    return (t) => {
      V.fade(front, V.p(t, T.s(1), 0.4)); V.fade(dimF, V.p(t, T.s(1) + 1.5, 0.4)); V.pop(c1, V.p(t, T.s(1) + 0.5, 0.5));
      V.fade(board, V.p(t, T.s(2), 0.5)); V.fade(m.g, V.p(t, T.s(2) + 0.5, 0.5)); m.set(V.blinkFace(t)); V.pop(c2, V.p(t, T.s(2) + 1, 0.5));
      V.fade(pirHole, V.p(t, T.s(3), 0.4)); V.fade(tPir, V.p(t, T.s(3) + 1, 0.4));
      V.fade(side, V.p(t, T.s(4), 0.4));
      holes.childNodes.forEach((h, i) => V.fade(h, V.p(t, T.s(4) + 1.5 + i * 0.2, 0.2)));
      V.fade(spk, V.p(t, T.s(4) + 4.5, 0.4)); V.fade(tHoles, V.p(t, T.s(4) + 3, 0.4));
    };
  },
});

defineScene({
  id: 'step8b', part: '3 · Build', step: 'Step 8 of 8', title: 'The body: top, back, and the Tessa touch',
  lines: [
    'Stick the breadboard on top, using its sticky back, with the two buttons and the LDR. Drill one 10 millimetre hole in the top, for their wires.',
    'Cut a notch at the back for the USB cable.',
    'Drill at Pulsed, with the box clamped down. A step drill makes clean round holes in plastic.',
    'For the Tessa touch: Tessa is made of felt and wood, to feel warm. Wrap a strip of felt around the grey sides, but never over the face, the PIR, or the speaker.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const tx = 70, ty = 70, TW = 330, TH = 150;
    const top = V.s('g', {}, V.s('rect', { x: tx, y: ty, width: TW, height: TH, rx: 12, fill: '#a7aeb5', stroke: '#5f666d', 'stroke-width': 4 }),
      V.s('text', { x: tx + TW / 2, y: ty - 12, 'font-size': 18, 'font-weight': 900, 'text-anchor': 'middle', fill: '#5b6b7b' }, 'top view'));
    svg.appendChild(top);
    const bbTop = V.s('g', {}, V.s('rect', { x: tx + 40, y: ty + 18, width: 214, height: 114, rx: 8, fill: '#f6f3ec', stroke: '#d8d1c3', 'stroke-width': 2 }),
      V.s('circle', { cx: tx + 100, cy: ty + 75, r: 18, fill: '#2e9e4f' }), V.s('circle', { cx: tx + 160, cy: ty + 75, r: 18, fill: '#e53935' }),
      V.s('ellipse', { cx: tx + 222, cy: ty + 75, rx: 11, ry: 9, fill: '#e2553f' }));
    svg.appendChild(bbTop);
    const hole10 = V.s('g', {}, V.s('circle', { cx: tx + 290, cy: ty + 75, r: 13, fill: '#2d3136' }));
    svg.appendChild(hole10);
    const tHole = V.tag(tx + 290, ty + 75, 'Ø 10 mm for the wires', { dx: 60, dy: 110, size: 16, color: '#1d2b3a' });
    svg.appendChild(tHole);
    const back = V.s('g', {}, V.s('rect', { x: tx + 60, y: 300, width: 190, height: 240, rx: 12, fill: '#8f969d', stroke: '#5f666d', 'stroke-width': 4 }),
      V.s('rect', { x: tx + 140, y: 516, width: 30, height: 24, fill: '#fbf7f0' }),
      V.s('text', { x: tx + 155, y: 290, 'font-size': 18, 'font-weight': 900, 'text-anchor': 'middle', fill: '#5b6b7b' }, 'back'));
    svg.appendChild(back);
    const tNotch = V.tag(tx + 155, 528, 'notch for the USB cable', { dx: 220, dy: -20, size: 16, color: '#1d2b3a' });
    svg.appendChild(tNotch);
    const bot = V.robot(1085, 300, 1.55, { felt: true });
    svg.appendChild(bot.g);
    const drill = V.card(root, { x: 520, y: 24, w: 400, icon: '🔩', title: 'Drill at Pulsed', text: 'Box clamped down. A step drill makes clean round holes.', color: '#f57c00', size: 16 });
    const felt = V.card(root, { x: 520, y: 150, w: 400, icon: '🧶', title: 'The Tessa touch: felt', text: 'Around the grey sides. Never over the face, PIR or speaker.', color: '#c9956a', size: 16 });
    return (t) => {
      V.fade(top, V.p(t, 0.2, 0.4)); V.fade(bbTop, V.p(t, 1.4, 0.5));
      V.fade(hole10, V.p(t, T.s(0) + 6, 0.4)); V.fade(tHole, V.p(t, T.s(0) + 6.5, 0.4));
      V.fade(back, V.p(t, T.s(1), 0.4)); V.fade(tNotch, V.p(t, T.s(1) + 0.8, 0.4));
      V.pop(drill, V.p(t, T.s(2), 0.5));
      V.fade(bot.g, V.p(t, T.s(3), 0.6));
      V.fade(bot.parts.felt, V.p(t, T.s(3) + 5, 0.6));
      V.pop(felt, V.p(t, T.s(3) + 4, 0.5));
      bot.matrix.set(V.blinkFace(t));
    };
  },
});

defineScene({
  id: 'recap', part: '3 · Build', title: 'Recap: the whole circuit',
  lines: [
    "Let's recap the whole circuit.",
    'Power: 5V to the plus rail, GND to the minus rail.',
    'Light: the LDR and the ten kilo-ohm resistor share column 5, which goes to A0. Motion: PIR OUT goes to A1.',
    'Answers: green to D2, red to D3. Both reach ground when pressed.',
    'Voice: module TX to D0. D1 through one kilo-ohm to RX. And the speaker on SP plus and SP minus.',
    "That's about fifteen jumper wires, two resistors, and a test after every step.",
  ],
  build(root, T) {
    const svg = V.svg(root);
    const b = bench(svg, { upto: 5 });
    const lbl = V.box({ left: '24px', top: '20px', fontSize: '26px', fontWeight: 900, color: '#fff', background: '#1d2b3a', borderRadius: '16px', padding: '8px 18px' }, '');
    root.appendChild(lbl);
    const txt = { 1: '⚡ power', 2: '💡 light + 👁️ motion', 3: '🟢 yes · 🔴 no', 4: '🗣️ voice', 5: '✅ all together' };
    return (t) => {
      let step = 0;
      for (let i = 1; i <= 5; i++) if (t >= T.s(i)) step = i;
      const map = { 0: null, 1: [1], 2: [2, 3], 3: [4], 4: [5], 5: null };
      b.focus(map[step]);
      lbl.textContent = txt[step] || '';
      V.fade(lbl, step ? 1 : 0);
      b.uno.power(true);
      b.uno.matrix.set(V.blinkFace(t));
    };
  },
});

defineScene({
  id: 'troubleshoot', part: '3 · Build', title: "If something doesn't work",
  lines: [
    "And if something doesn't work, don't panic. Here are the most common problems and their fixes. They're all in the troubleshooting table of the assembly guide.",
    'Most problems are one wire in the wrong hole. Unplug, compare with the map, and test again.',
  ],
  build(root, T) {
    const rows = [['Symptom', 'Likely cause', 'Fix'],
      ['Nothing in the Serial Monitor', 'wrong baud / port', '115200 baud, right COM port, press reset'],
      ['light_raw always ~0 or ~1023', 'LDR / resistor not in the same column', 're-check the divider'],
      ['pir_raw random HIGH / LOW', 'warm-up, or it sees you', 'wait 60 s, point it away, lower sensitivity'],
      ['PIR stays HIGH for minutes', 'time knob not at minimum', 'turn Tx fully counter-clockwise'],
      ['Button always "pressed"', 'two always-connected legs', 'use the diagonal legs'],
      ['No sound', 'TX/RX not crossed, missing files, volume 0', 'D0←TX, D1→1k→RX; vol 20; files in root'],
      ['Plays the wrong sentence', 'old demo files on the module', 'delete everything, copy again'],
      ['Board resets when talking loudly', 'USB can\u2019t deliver the peak current', 'vol 15, better USB port / charger'],
      ['✗ eyes forever', 'WiFi / MQTT problem', 'guide 05, part C troubleshooting'],
    ];
    const tb = V.table(root, rows, { x: 40, y: 14, w: 1200, size: 16, colW: ['30%', '34%', '36%'], headBg: '#e53935' });
    const tip = V.card(root, { x: 300, y: 450, w: 680, icon: '🔍', title: 'Most problems = one wire in the wrong hole', text: 'Unplug → compare with the map → test again.', color: '#2e9e4f', size: 17 });
    return (t) => {
      tb.trs.forEach((tr, i) => { if (i) V.fade(tr, V.p(t, 0.5 + i * 0.6, 0.3)); });
      V.pop(tip, V.p(t, T.s(1), 0.5));
    };
  },
});
