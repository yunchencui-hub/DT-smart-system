/* Part 3: the finished robot at work, plus the wrap-up. */
'use strict';

defineScene({
  id: 'run', part: '4 · Robin at work', title: 'Starting the whole system',
  lines: [
    "Robin is built! Now let's watch it work.",
    'On the laptop, Mosquitto is running. In the backend folder, with the virtual environment active, one command starts everything: python -m robin run.',
    'It starts two helpers. The ingest listens to Robin, and stores every message. The brain looks at the data every second, and decides what Robin should do.',
    "Tip: before the first real run, try everything with the simulator, a virtual Robin on your laptop. Guide 05 shows how, and you can do it today, before the parts arrive.",
  ],
  build(root, T) {
    const svg = V.svg(root);
    const bot = V.robot(160, 290, 1.25);
    svg.appendChild(bot.g);
    const term = V.term(root, { x: 360, y: 24, w: 880, h: 250, kind: 'shell', title: 'Terminal (backend/, venv active)', size: 15 });
    const tt = term.type(T.s(1) + 5, 'python -m robin run');
    term.out(tt + 0.3, ['ingest running, database data/robin.db', 'ingest connected (Success), subscribing to robin/+/#', 'model loaded: {device: robin-01, synthetic: false, …}'], 0.5, '#9fb3c8');
    const c1 = V.card(root, { x: 360, y: 300, w: 420, icon: '📥', title: 'Ingest', text: 'Listens to Robin and stores every message.', color: '#0f8a8f', size: 17 });
    const c2 = V.card(root, { x: 820, y: 300, w: 420, icon: '🧠', title: 'Brain', text: 'Looks at the data every second and decides what Robin does.', color: '#7e57c2', size: 17 });
    const sim = V.card(root, { x: 360, y: 440, w: 880, icon: '🎮', title: 'Try it today: the simulator', text: 'A virtual Robin on your laptop · guide 05, part B · no parts needed.', color: '#f57c00', size: 17 });
    return (t) => {
      bot.matrix.set(V.blinkFace(t));
      V.fade(term.el, V.p(t, T.s(1), 0.4)); term.update(t);
      V.pop(c1, V.p(t, T.s(2) + 1, 0.5)); V.pop(c2, V.p(t, T.s(2) + 4.5, 0.5));
      V.rise(sim, V.p(t, T.s(3) + 0.5, 0.5));
    };
  },
});

defineScene({
  id: 'sense', part: '4 · Robin at work', title: 'Measure, summarise, send (MQTT)',
  lines: [
    'Ten times per second, Robin reads its sensors. Every two seconds, it packs a summary into one small message.',
    'The message says: how many samples, how many new movements, how long the PIR was high, and the average light.',
    'It publishes this on the topic: robin, slash robin-01, slash telemetry.',
    'MQTT works like a newspaper. Robin publishes on a topic, and anyone who subscribed to that topic gets a copy.',
    "Telemetry uses QoS zero, which is like a postcard. If one gets lost, no problem: the next one comes two seconds later.",
    "But a button press uses QoS one, like a registered letter. It's delivered at least once, because a lost 'no, I'm not OK' would be a real problem. Duplicates are simply ignored by the database.",
  ],
  build(root, T) {
    const svg = V.svg(root);
    // 10 Hz ticks -> envelope every 2 s
    const tl = V.s('g');
    tl.appendChild(V.s('line', { x1: 60, y1: 110, x2: 660, y2: 110, stroke: '#1d2b3a', 'stroke-width': 3 }));
    const ticks = [];
    for (let i = 0; i < 20; i++) { const c = V.s('circle', { cx: 80 + i * 28, cy: 110, r: 7, fill: '#0f8a8f' }); tl.appendChild(c); ticks.push(c); }
    tl.appendChild(V.s('text', { x: 60, y: 80, 'font-size': 18, 'font-weight': 900, fill: '#0f8a8f' }, '10 samples per second…'));
    tl.appendChild(V.s('text', { x: 660, y: 80, 'font-size': 18, 'font-weight': 900, fill: '#f57c00', 'text-anchor': 'end' }, '…1 message every 2 s'));
    svg.appendChild(tl);
    const env = V.emoji(700, 110, '✉️', 50);
    svg.appendChild(env);
    const json = V.code(root, [
      '<span style="color:#7f8c98">topic:</span> <b class="hl">robin/robin-01/telemetry</b>',
      '{"boot":48213, "seq":17, "ms":36004,',
      ' <b class="ok">"n":20</b>,        <span style="color:#7f8c98">// samples</span>',
      ' <b class="ok">"edges":1</b>,     <span style="color:#7f8c98">// new movements</span>',
      ' <b class="ok">"high_ms":1300</b>, <span style="color:#7f8c98">// PIR HIGH time</span>',
      ' <b class="ok">"light":612</b>,   <span style="color:#7f8c98">// average 0–1023</span>',
      ' "pir":1, "rssi":-58}',
    ], { x: 40, y: 170, w: 620, size: 16, title: 'one telemetry message' });
    // newspaper diagram
    const np = V.s('g');
    const box = (x, y, w, txt, color) => { np.appendChild(V.s('rect', { x, y, width: w, height: 56, rx: 14, fill: '#fff', stroke: color, 'stroke-width': 3 })); np.appendChild(V.s('text', { x: x + w / 2, y: y + 35, 'font-size': 18, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1d2b3a' }, txt)); };
    box(720, 170, 170, '🤖 Robin', '#0f8a8f'); box(940, 170, 170, '📮 broker', '#0f8a8f');
    box(1110, 90, 150, '📥 ingest', '#7e57c2'); box(1110, 250, 150, '🔎 Explorer', '#7e57c2');
    np.appendChild(V.s('path', { d: 'M890,198 L940,198', stroke: '#1d2b3a', 'stroke-width': 4 }));
    np.appendChild(V.s('path', { d: 'M1110,198 C1090,198 1080,120 1110,118 M1110,198 C1090,198 1080,276 1110,278', fill: 'none', stroke: '#1d2b3a', 'stroke-width': 4 }));
    np.appendChild(V.s('text', { x: 990, y: 350, 'font-size': 17, 'font-weight': 800, 'text-anchor': 'middle', fill: '#5b6b7b' }, 'publish → topic → every subscriber gets a copy'));
    svg.appendChild(np);
    const q0 = V.card(root, { x: 700, y: 380, w: 270, icon: '📮', title: 'QoS 0 = postcard', text: 'Telemetry. Lost? The next one comes in 2 s.', color: '#0f8a8f', size: 15 });
    const q1 = V.card(root, { x: 990, y: 380, w: 270, icon: '📨', title: 'QoS 1 = registered', text: 'Button presses. Delivered at least once; duplicates ignored.', color: '#e53935', size: 15 });
    return (t) => {
      V.fade(tl, V.p(t, 0.2, 0.4));
      const k = Math.floor(((t * 10) % 20));
      ticks.forEach((c, i) => c.setAttribute('fill', i <= k ? '#0f8a8f' : '#cfd8dc'));
      const envP = ((t % 2) / 2);
      V.fade(env, envP > 0.9 ? 1 : 0.25);
      V.fade(json.el, V.p(t, T.s(1), 0.4));
      json.rows.forEach((r, i) => { r.style.background = (i >= 2 && i <= 5 && t > T.s(1) + 1 + (i - 2) * 1.2 && t < T.s(2)) || (i === 0 && t > T.s(2) && t < T.s(3)) ? 'rgba(255,213,79,0.16)' : 'transparent'; });
      V.fade(np, V.p(t, T.s(3), 0.5));
      V.pop(q0, V.p(t, T.s(4), 0.5)); V.pop(q1, V.p(t, T.s(5), 0.5));
    };
  },
});

defineScene({
  id: 'lastwill', part: '4 · Robin at work', title: 'The Last Will: failing loudly',
  lines: [
    'When Robin connects, it leaves a Last Will with the broker: if I suddenly disappear, tell everyone I’m offline.',
    'So if the plug gets pulled, the broker announces offline, all by itself.',
    'If Robin stays silent for five minutes, the family gets an alert on their phone. Robin fails loudly, not silently.',
    'And if only the WiFi drops, Robin keeps button presses in a small queue of eight, and sends them when it’s back online.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const bot = V.robot(170, 300, 1.2);
    svg.appendChild(bot.g);
    const letter = V.card(root, { x: 380, y: 40, w: 420, icon: '📜', title: 'Last Will', text: '“If I disappear, tell everyone: <b>offline</b>.”', color: '#7e57c2', size: 18 });
    const status = V.box({ left: '420px', top: '220px', fontFamily: 'JetBrains Mono', fontSize: '22px', fontWeight: 700, color: '#fff', background: '#2e9e4f', borderRadius: '12px', padding: '10px 16px' }, '');
    root.appendChild(status);
    const plug = V.emoji(330, 470, '🔌', 56);
    svg.appendChild(plug);
    const ph = V.phone(1010, 60, 1.35);
    svg.appendChild(ph.g);
    const n = V.notif(root, { x: 860, y: 150, w: 400, title: 'Robin is offline', text: 'No data from Robin for 5 minutes. Check power and WiFi.' });
    const timer = V.box({ left: '420px', top: '300px', fontSize: '22px', fontWeight: 900, color: '#e53935' }, '');
    root.appendChild(timer);
    const q = V.card(root, { x: 380, y: 400, w: 440, icon: '📦', title: 'WiFi gone? Presses wait in a queue (8)', text: 'Sent later, with their age, so the time is still right.', color: '#0f8a8f', size: 16 });
    return (t) => {
      const pulled = t > T.s(1) + 0.8;
      bot.matrix.set(pulled ? null : V.blinkFace(t));
      bot.matrix.power(!pulled);
      V.pop(letter, V.p(t, T.s(0) + 1, 0.5));
      status.textContent = pulled ? 'robin/robin-01/status  offline' : 'robin/robin-01/status  online';
      status.style.background = pulled ? '#e53935' : '#2e9e4f';
      V.fade(status, V.p(t, T.s(0) + 3, 0.4));
      V.fade(plug, V.win(t, T.s(1), T.s(2) + 2));
      plug.setAttribute('transform', `translate(${(-V.pe(t, T.s(1) + 0.3, 0.6) * 60).toFixed(1)} 0)`);
      const mins = Math.min(5, Math.floor(V.p(t, T.s(2), 3) * 5));
      timer.textContent = t > T.s(2) ? `silent for ${mins} min…` : '';
      V.fade(ph.g, V.p(t, T.s(2), 0.4));
      V.pop(n, V.p(t, T.s(2) + 3.2, 0.5));
      V.rise(q, V.p(t, T.s(3), 0.5));
    };
  },
});

defineScene({
  id: 'store', part: '4 · Robin at work', title: 'Check, store, clean, cut into windows',
  lines: [
    'On the laptop, the ingest checks every message. Duplicates are ignored. Garbage goes into a rejects table, and the system keeps running.',
    'Everything lands in SQLite: one small database file on your laptop. Every thirty minutes, the weather from Open-Meteo is saved there too.',
    'Then the data is cleaned. For example, the first sixty seconds after a restart are thrown away, because the PIR is still warming up.',
    'Next, time is cut into windows of ten minutes. For each window, we compute a few simple numbers: how much of the time there was movement, how often, how bright it was, and what time of day it is.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const chk = V.list(root, [
      { icon: '✅', text: 'valid message → <b>stored</b>' },
      { icon: '♻️', text: 'duplicate → <b>ignored</b>' },
      { icon: '🗑️', text: 'garbage → <b>rejects</b> table, keeps running' },
    ], { x: 40, y: 24, w: 520, size: 20, gap: 10 });
    const db = V.s('g');
    db.appendChild(V.s('ellipse', { cx: 760, cy: 60, rx: 110, ry: 26, fill: '#b2dfdb', stroke: '#0f8a8f', 'stroke-width': 3 }));
    db.appendChild(V.s('path', { d: 'M650,60 L650,200 A110,26 0 0 0 870,200 L870,60', fill: '#e0f2f1', stroke: '#0f8a8f', 'stroke-width': 3 }));
    db.appendChild(V.s('text', { x: 760, y: 130, 'font-size': 24, 'font-weight': 900, 'text-anchor': 'middle', fill: '#0a5e62' }, 'robin.db'));
    db.appendChild(V.s('text', { x: 760, y: 160, 'font-size': 15, 'font-weight': 800, 'text-anchor': 'middle', fill: '#44546a' }, 'telemetry · events · rejects'));
    db.appendChild(V.s('text', { x: 760, y: 180, 'font-size': 15, 'font-weight': 800, 'text-anchor': 'middle', fill: '#44546a' }, 'weather · actions · scores'));
    svg.appendChild(db);
    const wx = V.card(root, { x: 930, y: 40, w: 310, icon: '☀️', title: 'Open-Meteo', text: 'Weather every 30 min, no API key.', color: '#f2b705', size: 16 });
    const clean = V.card(root, { x: 40, y: 200, w: 520, icon: '🧹', title: 'Cleaning', text: 'Drop the first 60 s after a restart (PIR warm-up), duplicates, impossible values.', color: '#7e57c2', size: 16 });
    // windows
    const win = V.s('g');
    win.appendChild(V.s('line', { x1: 60, y1: 390, x2: 1220, y2: 390, stroke: '#1d2b3a', 'stroke-width': 3 }));
    const cols = ['#b2dfdb', '#ffe0b2', '#d1c4e9', '#c8e6c9', '#ffcdd2', '#b3e5fc'];
    const blocks = [];
    for (let i = 0; i < 6; i++) {
      const g = V.s('g');
      g.appendChild(V.s('rect', { x: 60 + i * 193, y: 340, width: 188, height: 100, rx: 10, fill: cols[i] }));
      g.appendChild(V.s('text', { x: 154 + i * 193, y: 364, 'font-size': 15, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1d2b3a' }, `${hhmm(8 * 60 + i * 10)}–${hhmm(8 * 60 + (i + 1) * 10)}`));
      const bars = [[0.3, '#0f8a8f'], [0.55, '#7e57c2'], [0.8, '#f2b705']];
      bars.forEach(([hgt, c], j) => { const hh = 40 * (0.3 + Math.abs(Math.sin(i * 1.7 + j)) * 0.7); g.appendChild(V.s('rect', { x: 100 + i * 193 + j * 36, y: 430 - hh, width: 24, height: hh, rx: 3, fill: c })); });
      win.appendChild(g); blocks.push(g);
    }
    win.appendChild(V.s('text', { x: 60, y: 320, 'font-size': 20, 'font-weight': 900, fill: '#1d2b3a' }, 'Windows of 10 minutes → a few numbers each:'));
    const legend = V.s('text', { x: 60, y: 474, 'font-size': 17, 'font-weight': 800, fill: '#44546a' }, '▮ movement share  ▮ movements per minute  ▮ light %  + time of day (hour as a circle: 23:00 is next to 00:00)');
    win.appendChild(legend);
    svg.appendChild(win);
    return (t) => {
      chk.forEach((r, i) => V.rise(r, V.p(t, 0.5 + i * 2.2, 0.4)));
      V.fade(db, V.p(t, T.s(1), 0.5)); V.pop(wx, V.p(t, T.s(1) + 4, 0.5));
      V.rise(clean, V.win(t, T.s(2), T.s(3) + 0.3, 0.45));
      V.fade(win, V.p(t, T.s(3), 0.4));
      blocks.forEach((g, i) => V.fade(g, V.p(t, T.s(3) + 1 + i * 0.5, 0.3)));
      V.fade(legend, V.p(t, T.s(3) + 5, 0.4));
    };
  },
});

defineScene({
  id: 'learn', part: '4 · Robin at work', title: 'How Robin learns what "normal" is',
  lines: [
    "Robin learns from at least seven days of your own data. We don't have to label anything. We just show it what normal looks like.",
    'The model is called an Isolation Forest. Imagine a game of twenty questions, with random yes or no questions.',
    'A normal moment hides in a big crowd of similar moments, so it takes many questions to isolate it.',
    "A strange moment stands all alone. It's isolated after just a few questions. Few questions means: unusual!",
    "Robin also learns what's normal for each hour. Lights on at eight in the morning is normal. Lights on at three at night is not.",
    'And a second, simple rule watches for silence: no movement for much longer than ever seen at this hour of the day.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const X0 = 60, Y0 = 40, W = 560, H = 440;
    const plot = V.s('g');
    plot.appendChild(V.s('rect', { x: X0, y: Y0, width: W, height: H, rx: 12, fill: '#fff', stroke: '#e3dccd', 'stroke-width': 2 }));
    plot.appendChild(V.s('text', { x: X0 + W / 2, y: Y0 + H + 34, 'font-size': 17, 'font-weight': 800, 'text-anchor': 'middle', fill: '#5b6b7b' }, 'movement →'));
    plot.appendChild(V.s('text', { x: X0 - 12, y: Y0 + H / 2, 'font-size': 17, 'font-weight': 800, 'text-anchor': 'middle', fill: '#5b6b7b', transform: `rotate(-90 ${X0 - 12} ${Y0 + H / 2})` }, 'light →'));
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pts = [];
    for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 90; pts.push([X0 + 190 + Math.cos(a) * r * 1.2, Y0 + 280 + Math.sin(a) * r]); }
    pts.forEach(([x, y]) => plot.appendChild(V.s('circle', { cx: x, cy: y, r: 6, fill: '#0f8a8f', opacity: 0.75 })));
    const odd = V.s('circle', { cx: X0 + 470, cy: Y0 + 80, r: 10, fill: '#e53935' });
    plot.appendChild(odd);
    const norm = V.s('circle', { cx: pts[3][0], cy: pts[3][1], r: 10, fill: 'none', stroke: '#f57c00', 'stroke-width': 4 });
    plot.appendChild(norm);
    svg.appendChild(plot);
    // splits: two isolate the odd point, many around the normal one
    const splits = [['v', X0 + 400], ['h', Y0 + 150], ['v', X0 + 200], ['h', Y0 + 300], ['v', X0 + 150], ['h', Y0 + 250], ['v', X0 + 175], ['h', Y0 + 275]];
    const lines = splits.map(([o, v], i) => {
      const l = o === 'v' ? V.s('line', { x1: v, y1: Y0, x2: v, y2: Y0 + H, stroke: i < 2 ? '#e53935' : '#f57c00', 'stroke-width': 3, 'stroke-dasharray': '8 6' }) : V.s('line', { x1: X0, y1: v, x2: X0 + W, y2: v, stroke: i < 2 ? '#e53935' : '#f57c00', 'stroke-width': 3, 'stroke-dasharray': '8 6' });
      svg.appendChild(l); return l;
    });
    const cnt = V.box({ left: '660px', top: '40px', fontSize: '22px', fontWeight: 900, color: '#1d2b3a', width: '580px' }, '');
    root.appendChild(cnt);
    const q20 = V.card(root, { x: 660, y: 100, w: 580, icon: '❓', title: '20 questions with random questions', text: 'Few questions to isolate = <b>unusual</b>. Many = normal.', color: '#7e57c2', size: 17 });
    const label = V.card(root, { x: 660, y: 100, w: 580, icon: '🏷️', title: 'No labels needed', text: 'We only show it at least 7 days of normal life.', color: '#0f8a8f', size: 17 });
    // hourly chart
    const hc = V.s('g');
    const cx0 = 680, cy0 = 520, cw = 540, chh = 150, hx = (h) => cx0 + (h / 24) * cw;
    hc.appendChild(V.s('text', { x: cx0, y: cy0 - chh - 18, 'font-size': 18, 'font-weight': 900, fill: '#1d2b3a' }, 'Normal light per hour (your own data)'));
    let d = '', dUp = '', dLo = '';
    for (let h = 0; h <= 24; h++) {
      const v = h < 7 || h > 22 ? 0.05 : 0.45 + 0.35 * Math.sin(((h - 7) / 16) * Math.PI);
      d += `${h ? 'L' : 'M'}${hx(h)},${cy0 - v * chh} `;
      dUp += `${h ? 'L' : 'M'}${hx(h)},${cy0 - Math.min(1, v + 0.12) * chh} `;
      dLo += `L${hx(24 - h)},${cy0 - Math.max(0, (h > 1 && h < 17 ? 0.45 + 0.35 * Math.sin(((17 - h) / 16) * Math.PI) : 0.05) - 0.12) * chh} `;
    }
    hc.appendChild(V.s('path', { d: dUp + dLo + 'Z', fill: '#b2dfdb', opacity: 0.7 }));
    hc.appendChild(V.s('path', { d, fill: 'none', stroke: '#0f8a8f', 'stroke-width': 4 }));
    hc.appendChild(V.s('line', { x1: cx0, y1: cy0, x2: cx0 + cw, y2: cy0, stroke: '#1d2b3a', 'stroke-width': 2 }));
    [0, 3, 8, 12, 18, 24].forEach((h) => hc.appendChild(V.s('text', { x: hx(h), y: cy0 + 22, 'font-size': 14, 'font-weight': 800, 'text-anchor': 'middle', fill: '#5b6b7b' }, `${h}h`)));
    const ok8 = V.s('g', {}, V.s('circle', { cx: hx(8), cy: cy0 - 0.5 * chh, r: 9, fill: '#2e9e4f' }), V.s('text', { x: hx(8), y: cy0 - 0.5 * chh - 16, 'font-size': 16, 'font-weight': 900, 'text-anchor': 'middle', fill: '#2e9e4f' }, '08:00 ✓'));
    const bad3 = V.s('g', {}, V.s('circle', { cx: hx(3), cy: cy0 - 0.62 * chh, r: 9, fill: '#e53935' }), V.s('text', { x: hx(3) + 6, y: cy0 - 0.62 * chh - 16, 'font-size': 16, 'font-weight': 900, fill: '#e53935' }, '03:00 ✗'));
    hc.appendChild(ok8); hc.appendChild(bad3);
    svg.appendChild(hc);
    const quiet = V.card(root, { x: 60, y: 440, w: 560, icon: '🤫', title: 'Rule 2: too quiet?', text: 'Longer without movement than ever seen at this hour.', color: '#f57c00', size: 16 });
    return (t) => {
      V.fade(plot, V.p(t, 0.3, 0.5));
      V.pop(label, V.win(t, 1, T.s(1)));
      V.pop(q20, V.p(t, T.s(1) + 0.5, 0.5));
      lines.forEach((l, i) => {
        const t0 = i < 2 ? T.s(3) + 0.8 + i * 1 : T.s(2) + 0.8 + (i - 2) * 0.9;
        V.fade(l, V.p(t, t0, 0.3) * (t > T.s(4) ? 1 - V.p(t, T.s(4), 0.4) : 1));
      });
      const nNormal = Math.max(0, Math.min(6, Math.floor((t - T.s(2) - 0.8) / 0.9) + 1));
      const nOdd = Math.max(0, Math.min(2, Math.floor((t - T.s(3) - 0.8) / 1) + 1));
      cnt.innerHTML = t < T.s(2) ? '' : `<span style="color:#f57c00">normal point: ${nNormal}${nNormal >= 6 ? '+' : ''} questions</span>` + (t > T.s(3) ? ` · <span style="color:#e53935">odd point: ${nOdd}</span>` : '');
      V.fade(norm, V.p(t, T.s(2), 0.3));
      odd.setAttribute('r', t > T.s(3) + 2.8 ? (10 + V.pulse(t, 2) * 4).toFixed(1) : 10);
      V.fade(hc, V.p(t, T.s(4), 0.5)); V.fade(ok8, V.p(t, T.s(4) + 3, 0.4)); V.fade(bad3, V.p(t, T.s(4) + 5.5, 0.4));
      V.fade(plot, t > T.s(4) ? 1 - 0.7 * V.p(t, T.s(4), 0.5) : V.p(t, 0.3, 0.5));
      V.rise(quiet, V.p(t, T.s(5), 0.5));
    };
  },
});

// A day with Robin -----------------------------------------------------------------------------
function dayScene(root, T, script, { dark = false } = {}) {
  const svg = V.svg(root);
  const rm = room(svg, { dark });
  const clk = clock(root, { x: 24, y: 18, dark });
  const bubble = V.bubble(root, { x: 700, y: 60, w: 520 });
  const ph = V.phone(1110, 250, 0.9);
  svg.appendChild(ph.g);
  const sun = V.box({ left: '214px', top: '26px', fontSize: '22px', fontWeight: 900, color: dark ? '#e6edf3' : '#1d2b3a',
    background: dark ? '#243242' : '#ffffff', borderRadius: '14px', padding: '6px 14px', boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }, '');
  sun.style.opacity = 0;
  root.appendChild(sun);
  return { svg, rm, clk, bubble, ph, sun };
}

defineScene({
  id: 'day', part: '4 · Robin at work', title: 'A day with Robin: the morning',
  lines: [
    "Let's follow one day with Mrs. Jansen.",
    "Eight o'clock: time to say good morning. But the room is empty, so Robin waits. It only speaks when the PIR sees someone.",
    'Four minutes later, she walks in.',
    { robin: 2 },
    'Half past eight: medicine time. Nobody is there, so Robin waits again, for up to an hour.',
    'At 8 47, she walks past.',
    { robin: 3 },
    'She presses green. The face shows a check mark right away, even before any network message arrives.',
    { robin: 9 },
    "If she doesn't answer within a minute, Robin asks once more. If she presses red, or never answers, the family gets a message.",
  ],
  build(root, T) {
    const d = dayScene(root, T);
    const wait = V.box({ left: '470px', top: '150px', fontSize: '22px', fontWeight: 900, color: '#fff', background: '#7b8794', borderRadius: '16px', padding: '8px 16px' }, '⏳ waiting for someone…');
    root.appendChild(wait);
    const green = V.box({ left: '470px', top: '150px', fontSize: '26px', fontWeight: 900, color: '#fff', background: '#2e9e4f', borderRadius: '16px', padding: '8px 16px' }, '🟢 YES');
    root.appendChild(green);
    const rule = V.card(root, { x: 700, y: 60, w: 520, icon: '🔁', title: 'No answer in 60 s → ask once more', text: 'Red, or still no answer → message to the family.', color: '#e53935', size: 16 });
    return (t) => {
      const segs = [[0, 7 * 60 + 58], [T.s(1), 8 * 60], [T.s(2), 8 * 60 + 4], [T.s(4), 8 * 60 + 30], [T.s(5), 8 * 60 + 47], [T.s(9), 8 * 60 + 48]];
      let m = segs[0][1];
      segs.forEach(([ts, mm]) => { if (t >= ts) m = mm; });
      d.clk.set(hhmm(m));
      // person
      let px = null;
      if (t > T.s(2) + 0.3 && t < T.s(4) + 1.5) px = V.lerp(1100, 860, V.pe(t, T.s(2) + 0.3, 2)) + (t > T.s(4) ? V.pe(t, T.s(4), 1.5) * 260 : 0);
      if (t > T.s(5) + 0.3) px = V.lerp(1100, 860, V.pe(t, T.s(5) + 0.3, 2));
      d.rm.walk(px);
      const waiting = (t > T.s(1) + 1 && t < T.s(2) + 1) || (t > T.s(4) + 1.5 && t < T.s(5) + 1);
      V.fade(wait, waiting ? 1 : 0);
      // speech + faces
      let face = V.blinkFace(t);
      let say = null;
      const clip = (i, ask) => { if (t >= T.s(i) && t < T.e(i) + 0.8) say = T.cap(i); const f = faceFor(t, T.s(i), T.e(i), { ask }); return f; };
      const f2 = clip(3, false); if (f2 && t < T.e(3) + 0.3) face = f2;
      const f3 = clip(6, true); if (f3 && t < T.s(7) + 1) face = f3;
      const pressT = T.s(7) + 0.8;
      if (t > pressT && t < pressT + 1.5) face = 'yes';
      const f9 = clip(8, false); if (f9 && t < T.e(8) + 0.3) face = f9;
      d.rm.robot.matrix.set(face);
      d.bubble.setText(say || '');
      V.fade(d.bubble.el, say ? 1 : 0);
      V.fade(green, V.win(t, pressT, pressT + 2.5, 0.2));
      V.pop(rule, V.p(t, T.s(9) + 0.5, 0.5));
      V.fade(d.ph.g, 0);
    };
  },
});

defineScene({
  id: 'day2', part: '4 · Robin at work', title: 'A day with Robin: afternoon and evening',
  lines: [
    "Two o'clock. The weather service says it will be 27 degrees today. That's a hot day.",
    { robin: 5 },
    "Three o'clock: water time.",
    { robin: 4 },
    "She presses red. Water isn't urgent, so Robin doesn't alarm anyone. It just says:",
    { robin: 13 },
    'Half past nine in the evening:',
    { robin: 12 },
    'And through the night, Robin shows its sleepy face.',
  ],
  build(root, T) {
    const d = dayScene(root, T);
    const red = V.box({ left: '470px', top: '150px', fontSize: '26px', fontWeight: 900, color: '#fff', background: '#e53935', borderRadius: '16px', padding: '8px 16px' }, '🔴 NO');
    root.appendChild(red);
    return (t) => {
      const segs = [[0, 14 * 60], [T.s(2), 15 * 60], [T.s(6), 21 * 60 + 30], [T.s(8), 23 * 60 + 30]];
      let m = segs[0][1];
      segs.forEach(([ts, mm]) => { if (t >= ts) m = mm; });
      d.clk.set(hhmm(m));
      d.sun.textContent = t < T.s(6) ? '☀️ 27 °C today' : '';
      V.fade(d.sun, t < T.s(6) ? 1 : 0);
      const evening = V.p(t, T.s(6), 1), night = V.p(t, T.s(8), 1.2);
      d.rm.darken((evening * 0.25 + night * 0.35).toFixed(3));
      d.rm.night(t > T.s(6));
      d.rm.walk(t < T.s(8) ? 860 : null);
      let face = V.blinkFace(t), say = null;
      [[1, false], [3, true], [5, false], [7, false]].forEach(([i, ask]) => {
        if (t >= T.s(i) && t < T.e(i) + 0.8) say = T.cap(i);
        const f = faceFor(t, T.s(i), T.e(i), { ask });
        if (f && t < T.s(i + 1)) face = f;
      });
      const pressT = T.s(4) + 0.5;
      if (t > pressT && t < pressT + 1.5) face = 'no';
      if (t > T.s(8) + 0.1) face = 'sleep';
      d.rm.robot.matrix.set(face);
      d.bubble.setText(say || '');
      V.fade(d.bubble.el, say ? 1 : 0);
      V.fade(red, V.win(t, pressT, pressT + 2.5, 0.2));
      V.fade(d.ph.g, 0);
    };
  },
});

defineScene({
  id: 'night', part: '4 · Robin at work', title: 'Three o’clock at night', dark: true,
  lines: [
    "Three o'clock at night. Suddenly the light goes on, and there's a lot of movement. That's very unusual for this hour.",
    "The model gives this window a score below zero: unusual. But Robin doesn't panic. It asks first.",
    { robin: 8 },
    'She presses red.',
    { robin: 10 },
    "Within a few seconds, her daughter's phone buzzes.",
    "And the message explains why: movement 49 percent of the time, while at three o'clock it's usually about one percent.",
    'To avoid nagging, Robin asks at most once per hour. Asking first and alerting second keeps false alarms low, so the family keeps trusting it.',
  ],
  build(root, T) {
    const d = dayScene(root, T, null, { dark: true });
    const gauge = V.box({ left: '24px', top: '150px', width: '330px', background: '#243242', borderRadius: '14px', padding: '12px 16px', boxSizing: 'border-box', color: '#e6edf3' });
    const gv = V.h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: '24px', fontWeight: 700 } }, '');
    gauge.appendChild(V.h('div', { style: { fontSize: '15px', fontWeight: 900, color: '#9fb3c8' } }, 'model score (below 0 = unusual)'));
    gauge.appendChild(gv);
    root.appendChild(gauge);
    const red = V.box({ left: '470px', top: '150px', fontSize: '26px', fontWeight: 900, color: '#fff', background: '#e53935', borderRadius: '16px', padding: '8px 16px' }, '🔴 NO');
    root.appendChild(red);
    const n = V.notif(root, { x: 790, y: 92, w: 470, title: 'Robin: night check-in - no',
      text: "'night check-in': answered NO. movement 49% of the time (usual at 03h: 1% +- 2%), light 62% (usual 3% +- 4%)" });
    const buzz = V.emoji(1180, 270, '📳', 40);
    d.svg.appendChild(buzz);
    const calm = V.card(root, { x: 24, y: 400, w: 560, icon: '🕐', title: 'Max. 1 check-in per hour', text: 'Ask first, alert second → few false alarms, trust stays.', color: '#0f8a8f', size: 16 });
    return (t) => {
      d.clk.set(hhmm(3 * 60 + 5 + Math.floor(t / 20)));
      d.rm.night(true);
      const lamp = t > 1.5;
      d.rm.lampLight.setAttribute('opacity', lamp ? 0.55 : 0);
      d.rm.darken(lamp ? 0.15 : 0.45);
      d.rm.walk(t > 2 ? 860 + Math.sin(t * 1.3) * 120 : null);
      const score = t < T.s(1) + 1 ? 0.12 : V.lerp(0.12, -0.08, V.pe(t, T.s(1) + 1, 1.5));
      gv.textContent = (score >= 0 ? '+' : '') + score.toFixed(3);
      gv.style.color = score < 0 ? '#ff8a80' : '#8ee6a0';
      V.fade(gauge, V.p(t, T.s(1), 0.4));
      let face = 'sleep', say = null;
      if (t > T.s(1) + 3) face = 'concern';
      [[2, true], [4, false]].forEach(([i, ask]) => {
        if (t >= T.s(i) && t < T.e(i) + 0.8) say = T.cap(i);
        const f = faceFor(t, T.s(i), T.e(i), { ask, after: 'concern' });
        if (f && t < T.s(i + 1)) face = f;
      });
      const pressT = T.s(3) + 0.3;
      if (t > pressT && t < pressT + 1.5) face = 'no';
      d.rm.robot.matrix.set(face);
      d.bubble.setText(say || ''); V.fade(d.bubble.el, say ? 1 : 0);
      V.fade(red, V.win(t, pressT, pressT + 2.2, 0.2));
      V.fade(d.ph.g, V.p(t, T.s(5), 0.4));
      V.fade(buzz, t > T.s(5) + 0.5 && t < T.s(6) + 2 ? 0.5 + 0.5 * V.pulse(t, 5) : 0);
      V.pop(n, V.p(t, T.s(5) + 1.2, 0.5));
      n.style.boxShadow = t > T.s(6) && t < T.s(7) ? '0 0 0 4px #ffd54f, 0 10px 26px rgba(0,0,0,0.25)' : '0 10px 26px rgba(0,0,0,0.25)';
      V.rise(calm, V.p(t, T.s(7) + 0.5, 0.5));
    };
  },
});

defineScene({
  id: 'quiet', part: '4 · Robin at work', title: "When it's too quiet",
  lines: [
    'The opposite can be worrying too: silence.',
    "Say it's eleven in the morning, and there's been no movement for three hours. The longest quiet time Robin ever saw at this hour was about seventy minutes.",
    "That's unusual, so Robin asks:",
    { robin: 7 },
    'No answer, even after asking again? Then the family is told, with the reason: no movement for 185 minutes, while the limit here is 70.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const bot = V.robot(200, 300, 1.3);
    svg.appendChild(bot.g);
    const clk = clock(root, { x: 24, y: 18 });
    const bx0 = 430, bw = 780, by = 150, mx = 200, bx = (m) => bx0 + (m / mx) * bw;
    const g = V.s('g');
    g.appendChild(V.s('text', { x: bx0, y: by - 20, 'font-size': 20, 'font-weight': 900, fill: '#1d2b3a' }, 'minutes without movement'));
    g.appendChild(V.s('rect', { x: bx0, y: by, width: bw, height: 44, rx: 10, fill: '#e3e9ee' }));
    const fill = V.s('rect', { x: bx0, y: by, width: 0, height: 44, rx: 10, fill: '#f57c00' });
    g.appendChild(fill);
    const lim = V.s('g', {}, V.s('line', { x1: bx(70), y1: by - 12, x2: bx(70), y2: by + 56, stroke: '#1e63d6', 'stroke-width': 5 }), V.s('text', { x: bx(70), y: by + 82, 'font-size': 17, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1e63d6' }, 'learned limit at 11h: 70 min'));
    g.appendChild(lim);
    const val = V.s('text', { x: bx0 + 10, y: by + 30, 'font-size': 22, 'font-weight': 900, fill: '#fff' }, '');
    g.appendChild(val);
    svg.appendChild(g);
    const bubble = V.bubble(root, { x: 430, y: 280, w: 560 });
    const n = V.notif(root, { x: 430, y: 280, w: 560, title: 'Robin: check-in - no answer', text: "No answer to 'check-in'. … no movement for 185 min (limit 70)" });
    const how = V.box({ left: '430px', top: '250px', fontSize: '15px', fontWeight: 800, color: '#7b8794' }, 'limit = the longest quiet time seen at this hour (99th percentile) × 1.2');
    root.appendChild(how);
    return (t) => {
      clk.set(hhmm(11 * 60 + Math.floor(t / 10)));
      const q = V.lerp(0, 185, V.pe(t, T.s(1) + 1, 5));
      fill.setAttribute('width', ((q / mx) * bw).toFixed(1));
      val.textContent = t > T.s(1) ? `${Math.round(q)} min` : '';
      V.fade(g, V.p(t, T.s(1), 0.4)); V.fade(lim, V.p(t, T.s(1) + 5, 0.4)); V.fade(how, V.p(t, T.s(1) + 6, 0.4));
      let face = V.blinkFace(t);
      if (t > T.s(2)) face = 'concern';
      const f = faceFor(t, T.s(3), T.e(3), { ask: true });
      if (f) face = f;
      bot.matrix.set(face);
      const say = t >= T.s(3) && t < T.e(3) + 0.8 ? T.cap(3) : '';
      bubble.setText(say); V.fade(bubble.el, say ? 1 : 0);
      V.pop(n, V.p(t, T.s(4) + 2, 0.5));
    };
  },
});

defineScene({
  id: 'kind', part: '4 · Robin at work', title: 'Kind by design',
  lines: [
    'Two design rules make Robin kind.',
    "One: it never gives orders. It asks and suggests, and the person decides. That's the Tessa principle.",
    'Two: privacy. No camera, and no microphone. Robin stores activity levels, not what someone is doing.',
    'And the data stays in the house, on the laptop. Only the alert message leaves it.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const c1 = V.card(root, { x: 40, y: 30, w: 560, icon: '🙋', title: 'Asks, never orders', text: '“Shall we drink a glass of water?” — the person decides.', color: '#0f8a8f', size: 18 });
    const c2 = V.card(root, { x: 40, y: 200, w: 560, icon: '📵', title: 'No camera, no microphone', text: 'Activity levels only, not what someone does.', color: '#7e57c2', size: 18 });
    const house = V.s('g');
    house.appendChild(V.s('polygon', { points: '700,200 930,70 1160,200', fill: '#c0655b' }));
    house.appendChild(V.s('rect', { x: 720, y: 195, width: 420, height: 300, fill: '#fff3e0', stroke: '#d7b99a', 'stroke-width': 3 }));
    house.appendChild(V.emoji(800, 330, '🤖', 64)); house.appendChild(V.emoji(930, 330, '💻', 64)); house.appendChild(V.emoji(1060, 330, '🗄️', 56));
    house.appendChild(V.s('text', { x: 930, y: 440, 'font-size': 20, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1d2b3a' }, 'data stays in the house'));
    svg.appendChild(house);
    const out = V.s('g', {}, V.s('path', { d: 'M1140,300 C1200,300 1220,260 1250,230', fill: 'none', stroke: '#e53935', 'stroke-width': 5 }), V.emoji(1240, 205, '📱', 40));
    const outL = V.s('text', { x: 1180, y: 350, 'font-size': 16, 'font-weight': 900, fill: '#e53935', 'text-anchor': 'middle' }, 'only the alert');
    svg.appendChild(out); svg.appendChild(outL);
    return (t) => {
      V.pop(c1, V.p(t, T.s(1), 0.5)); V.pop(c2, V.p(t, T.s(2), 0.5));
      V.fade(house, V.p(t, T.s(3), 0.5)); V.fade(out, V.p(t, T.s(3) + 3, 0.4)); V.fade(outL, V.p(t, T.s(3) + 3.2, 0.4));
    };
  },
});

defineScene({
  id: 'seven', part: '4 · Robin at work', title: 'The 7 minimum requirements, covered',
  lines: [
    "And that's how Robin covers the seven minimum requirements of the course.",
    'One: real sensors, streaming live. Two: a real-time protocol, MQTT. Three: ingestion from two sources, the robot, and the weather service.',
    'Four: storage in SQLite. Five: processing into clean windows and features.',
    'Six: a smart algorithm, trained on data from your own sensor. Seven: autonomous actions: speaking, asking, faces, and alerts.',
  ],
  build(root, T) {
    const items = [
      ['1', 'Sensors, live stream', 'PIR + LDR + buttons, 10 Hz'], ['2', 'Real-time protocol', 'MQTT: QoS, Last Will'], ['3', 'Ingestion, 2 sources', 'robot + Open-Meteo'],
      ['4', 'Storage', 'SQLite, dedup, rejects'], ['5', 'Processing', 'clean, 10-min windows, features'], ['6', 'Smart algorithm', 'Isolation Forest on YOUR data'],
      ['7', 'Autonomous actions', 'speak, ask, faces, alerts'],
    ];
    const els = items.map(([n, ti, tx], i) => V.card(root, { x: 40 + (i % 4) * 305, y: 70 + Math.floor(i / 4) * 220, w: 290, h: 180, icon: '✅', title: `${n} · ${ti}`, text: tx, color: ['#0f8a8f', '#0f8a8f', '#0f8a8f', '#0f8a8f', '#7e57c2', '#7e57c2', '#f57c00'][i], size: 18 }));
    const svg = V.svg(root);
    const bot = V.robot(1100, 382, 0.72);
    const botWrap = V.s('g', {}, bot.g); // spop sets the transform, so pop a wrapper, not the robot itself
    svg.appendChild(botWrap);
    return (t) => {
      const st = [T.c(1, 0), T.c(1, 1), T.c(1, 2), T.c(2, 0), T.c(2, 1), T.c(3, 0), T.c(3, 1)];
      els.forEach((e, i) => V.pop(e, V.p(t, st[i], 0.45)));
      V.spop(botWrap, V.p(t, st[6] + 0.8, 0.5), 1100, 382);
      bot.matrix.set(t > st[6] + 1.5 && t < st[6] + 3 ? 'yes' : V.blinkFace(t));
    };
  },
});

defineScene({
  id: 'quiz', part: '5 · Wrap-up', title: 'Check yourself',
  lines: [
    'Before we finish, three quick questions. Pause after each one, and answer out loud.',
    'Question one: why is the PIR read on an analog pin?',
    { pause: 5, cap: 'Answer out loud' },
    'Because it outputs only 3.3 volts. An analog read turns that into about 675, far above our threshold of 400.',
    'Question two: why do the TX and RX wires cross?',
    { pause: 5, cap: 'Answer out loud' },
    "Because one device's mouth must reach the other device's ear.",
    "Question three: why doesn't a lost telemetry message matter, but a lost button press does?",
    { pause: 5, cap: 'Answer out loud' },
    "Telemetry comes again in two seconds. A lost 'no' could mean nobody comes to help. That's why events use QoS one.",
  ],
  build(root, T) {
    const q = (i, y, qt, at) => {
      const card = V.box({ left: '60px', top: y + 'px', width: '1160px', background: '#fff', borderRadius: '16px', boxShadow: '0 6px 18px rgba(29,43,58,0.12)', padding: '14px 20px', boxSizing: 'border-box', borderLeft: '8px solid #f57c00' });
      card.appendChild(V.h('div', { style: { fontSize: '23px', fontWeight: 900 } }, `Q${i}. ${qt}`));
      const ans = V.h('div', { style: { fontSize: '19px', fontWeight: 700, color: '#2e7d32', marginTop: '6px' } }, '→ ' + at);
      card.appendChild(ans);
      root.appendChild(card);
      V.fade(card, 0);
      return { card, ans };
    };
    const q1 = q(1, 40, 'Why is the PIR read on an analog pin?', '3.3 V is in the grey zone for a 5 V digital pin; analog reads ≈ 675 > 400.');
    const q2 = q(2, 200, 'Why do TX and RX cross?', 'One device’s mouth (TX) must reach the other’s ear (RX).');
    const q3 = q(3, 360, 'Why can telemetry get lost, but not a button press?', 'Telemetry comes again in 2 s (QoS 0). A lost "no" could mean nobody helps (QoS 1).');
    return (t) => {
      [[q1, 1, 3], [q2, 4, 6], [q3, 7, 9]].forEach(([qq, a, b]) => { V.rise(qq.card, V.p(t, T.s(a), 0.4)); V.fade(qq.ans, V.p(t, T.s(b), 0.4)); });
    };
  },
});

defineScene({
  id: 'next', part: '5 · Wrap-up', title: 'Your next steps',
  lines: [
    'Your next steps: register concept number twelve with the lecturer, and confirm that the board is an UNO R4 WiFi.',
    'Ask Pulsed which common parts they have, and then send the purchase request.',
    'And today already: install Python and Mosquitto, and run the simulator.',
    'Build one step at a time, test every step, and take photos along the way for your proof package. Happy building, partner!',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const bot = V.robot(1040, 300, 1.7);
    svg.appendChild(bot.g);
    const items = V.list(root, [
      { icon: '📝', text: 'Register concept <b>#12</b> with the lecturer' },
      { icon: '🔍', text: 'Confirm the board = <b>UNO R4 WiFi</b>' },
      { icon: '🧰', text: 'Ask Pulsed for common parts → send the purchase request (guide 03)' },
      { icon: '🎮', text: 'Today: install Python + Mosquitto, run the <b>simulator</b> (guide 05, B)' },
      { icon: '📸', text: 'Build step by step, test, take photos for the proof package' },
    ], { x: 50, y: 40, w: 760, size: 23, gap: 20 });
    const end = V.box({ left: '50px', top: '470px', fontSize: '20px', fontWeight: 800, color: '#5b6b7b' }, 'Start here: docs/00_START_HERE.md · questions? Ask me in a new session.');
    root.appendChild(end);
    return (t) => {
      const st = [T.s(0) + 0.5, T.s(0) + 4, T.s(1), T.s(2), T.s(3)];
      items.forEach((e, i) => V.rise(e, V.p(t, st[i], 0.4)));
      V.fade(end, V.p(t, T.s(3) + 3, 0.5));
      bot.matrix.set(t > T.e(3) - 2 ? 'yes' : V.blinkFace(t));
    };
  },
});
