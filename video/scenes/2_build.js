/* Part 2a: get ready (parts, tools, software, rules, breadboard) and assembly steps 1-4. */
'use strict';

// Dots that flow along an SVG path (current, messages).
function flowDots(layer, n, color, r = 4) {
  const dots = [];
  for (let i = 0; i < n; i++) { const c = V.s('circle', { r, fill: color, stroke: '#fff', 'stroke-width': 1.2 }); layer.appendChild(c); dots.push(c); }
  return {
    set(path, t, on, speed = 0.35, reverse = false) {
      if (!path._len) path._len = path.getTotalLength();
      dots.forEach((c, i) => {
        if (!on) { V.fade(c, 0); return; }
        let f = (t * speed + i / n) % 1;
        if (reverse) f = 1 - f;
        const pt = path.getPointAtLength(f * path._len);
        c.setAttribute('cx', pt.x.toFixed(1)); c.setAttribute('cy', pt.y.toFixed(1));
        V.fade(c, 1);
      });
    },
  };
}

// USB-C cable that plugs into the Arduino port (for the "plug in to test" moments).
function usbCable(layer, uno) {
  const k = uno.k, px = uno.x - 2.2 * k, py = uno.y + 10.5 * k;
  const g = V.s('g');
  g.appendChild(V.s('path', { d: `M${px - 38},${py} C${px - 120},${py} ${px - 140},${py + 120} ${px - 260},${py + 160}`, fill: 'none', stroke: '#3d3d3d', 'stroke-width': 9, 'stroke-linecap': 'round' }));
  g.appendChild(V.s('rect', { x: px - 44, y: py - 11, width: 40, height: 22, rx: 5, fill: '#e0e0e0', stroke: '#9e9e9e', 'stroke-width': 1.5 }));
  g.appendChild(V.s('rect', { x: px - 6, y: py - 5, width: 10, height: 10, rx: 2, fill: '#b0b0b0' }));
  layer.appendChild(g);
  return { set(p) { V.fade(g, p > 0 ? 1 : 0); g.setAttribute('transform', `translate(${(-(1 - V.out(p)) * 90).toFixed(1)} 0)`); } };
}

// Standard serial-monitor strings from the firmware.
const RAW = (pir, light, yes = '-', no = '-') => `pir_raw=${pir} (HIGH if > 400)  light_raw=${light}  yes=${yes}  no=${no}`;
const TXF = (seq, light = 455) => `[tx-failed] {"boot":48213,"seq":${seq},"ms":${2000 * (seq + 1)},"n":20,…"light":${light},…}`;
const jit = (base, amp, i) => base + Math.round(Math.sin(i * 2.7 + base) * amp);

// ---------------------------------------------------------------------------------------------
defineScene({
  id: 'shopping', part: '2 · Get ready', title: 'Shopping list: €39.00 in total',
  lines: [
    'Time to go shopping. Everything comes from one approved shop, Tinytronics. One order means one shipping cost, and one invoice for the lecturer.',
    'The most important part is the voice module, the DFR0534, for 9 euros 50. Plus a small speaker, for 1 euro.',
    'The PIR motion sensor costs 3 euros 50. Then two light sensors, three push buttons with coloured caps, and a breadboard.',
    'Jumper wires in three kinds, ten kilo-ohm and one kilo-ohm resistors, and a box with a clear lid, for 10 euros.',
    'With 6 euros 95 for shipping, that makes 39 euros in total. From our 50 euro budget, 11 euros stay as a repair buffer.',
    'Tip: ask Pulsed first. If they lend you the common parts, like the breadboard, wires and resistors, you pay only about 31 euros.',
  ],
  build(root, T) {
    const items = [
      [1, '🗣️', 'DFR0534 voice module', 9.5], [1, '🔊', 'Speaker 8 Ω, 1 W', 1.0], [2, '👁️', 'HC-SR501 PIR sensor', 3.5],
      [2, '💡', '2 × LDR light sensor', 0.6], [2, '🔘', '3 × push button', 0.75], [2, '🎨', '3 × button caps', 0.45],
      [2, '🧱', 'Breadboard 400 points', 2.25], [3, '〰️', '2 × jumper wires M-M', 1.5], [3, '〰️', 'Jumper wires M-F', 0.75],
      [3, '〰️', 'Jumper wires F-F', 0.75], [3, '⚡', 'Resistors 10 kΩ + 1 kΩ', 1.0], [3, '📦', 'Kradex box, clear lid', 10.0],
      [4, '🚚', 'Shipping (parcel)', 6.95],
    ];
    const tiles = items.map(([ln, ic, name, price], i) => {
      const el = V.box({ left: 30 + (i % 4) * 306 + 'px', top: 14 + Math.floor(i / 4) * 92 + 'px', width: '292px', height: '78px', background: '#fff', borderRadius: '14px',
        boxShadow: '0 4px 12px rgba(29,43,58,0.10)', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 14px', boxSizing: 'border-box', borderLeft: '6px solid #0f8a8f' },
      V.h('div', { style: { fontSize: '32px', fontFamily: 'Noto Color Emoji' } }, ic),
      V.h('div', { style: { flex: 1, fontSize: '17px', fontWeight: 800, lineHeight: 1.15 } }, name),
      V.h('div', { style: { fontSize: '19px', fontWeight: 900, color: '#0f8a8f' } }, '€' + price.toFixed(2)));
      root.appendChild(el);
      return { el, ln, price, i };
    });
    const total = V.box({ left: '30px', top: '398px', width: '740px', height: '64px', background: '#1d2b3a', color: '#fff', borderRadius: '14px', display: 'flex', alignItems: 'center', padding: '0 22px', boxSizing: 'border-box', gap: '18px' });
    const totalTxt = V.h('div', { style: { fontSize: '30px', fontWeight: 900, minWidth: '190px' } }, '€0.00');
    const barWrap = V.h('div', { style: { flex: 1, height: '22px', background: '#3a4b5d', borderRadius: '11px', position: 'relative', overflow: 'hidden' } });
    const bar = V.h('div', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, background: '#f57c00', width: '0%' } });
    barWrap.appendChild(bar);
    const budget = V.h('div', { style: { fontSize: '17px', fontWeight: 800, color: '#cfd8e3' } }, 'of €50');
    total.appendChild(totalTxt); total.appendChild(barWrap); total.appendChild(budget);
    root.appendChild(total);
    const left = V.card(root, { x: 790, y: 398, w: 200, icon: '🧰', title: '€11 buffer', color: '#2e9e4f', size: 16 });
    const pulsed = V.card(root, { x: 30, y: 474, w: 960, icon: '💡', title: 'Pulsed lends breadboard, wires, resistors, LDRs, buttons?  →  about €31 (€30.95)', color: '#7e57c2', size: 17 });
    return (t) => {
      let sum = 0;
      const starts = { 1: T.s(1) + 1, 2: T.s(2) + 0.5, 3: T.s(3) + 0.3, 4: T.s(4) + 0.3 };
      const cnt = { 1: 0, 2: 0, 3: 0, 4: 0 };
      tiles.forEach((tl) => {
        const t0 = starts[tl.ln] + cnt[tl.ln]++ * (tl.ln === 1 ? 2.2 : 1.1);
        const p = V.p(t, t0, 0.4);
        V.pop(tl.el, p);
        if (p > 0.5) sum += tl.price;
        tl.el.style.borderLeftColor = t > t0 && t < t0 + 1.4 ? '#f57c00' : '#0f8a8f';
      });
      V.fade(total, V.p(t, T.s(1), 0.5));
      totalTxt.textContent = '€' + sum.toFixed(2);
      bar.style.width = ((sum / 50) * 100).toFixed(1) + '%';
      V.pop(left, V.p(t, T.s(4) + 4, 0.5));
      V.rise(pulsed, V.p(t, T.s(5) + 1, 0.5));
    };
  },
});

defineScene({
  id: 'extras', part: '2 · Get ready', title: 'Also needed (not in the order)',
  lines: [
    'A few things are not in the order.',
    'The Arduino UNO R4 WiFi comes from school. Check that it has a USB-C port, and a grid of little LEDs on the board.',
    'You need a USB-C data cable, and a micro-USB data cable for the voice module. Careful: some cheap cables can only charge. They carry no data, and then nothing works.',
    "Plus a phone charger to power Robin at home, your laptop, and your phone. At Pulsed, you'll borrow a soldering iron and a drill.",
  ],
  build(root, T) {
    const cards = [
      [1, '🎓', 'Arduino UNO R4 WiFi', 'From school. Check: <b>USB-C port</b> + <b>12 × 8 LED grid</b>.', '#0f8a8f'],
      [2, '🔌', 'USB-C data cable', 'Uploads the code and powers Robin.', '#1e63d6'],
      [2.5, '🔌', 'micro-USB data cable', 'Copies the voice files onto the DFR0534.', '#1e63d6'],
      [2.8, '⚠️', 'Charge-only cables!', 'They carry no data. If the laptop sees nothing, try another cable.', '#e53935'],
      [3, '🔋', 'Phone charger (5 V)', 'Powers Robin at home for a week.', '#2e9e4f'],
      [3.3, '💻', 'Laptop + 📱 phone', 'Laptop runs the software; phone = hotspot + alerts.', '#7e57c2'],
      [3.6, '🛠️', 'At Pulsed', 'Soldering iron (2 joints) and a drill for the box.', '#f57c00'],
    ].map(([k, ic, ti, tx, c], i) => ({ k, el: V.card(root, { x: 40 + (i % 4) * 302, y: 40 + Math.floor(i / 4) * 250, w: 285, h: 225, icon: ic, title: ti, text: tx, color: c, size: 18 }) }));
    const svg = V.svg(root);
    const uno = V.arduino(962, 322, 3.7);
    uno.power(true); uno.matrix.set('happy');
    const ug = V.s('g', {}, uno.g); svg.appendChild(ug);
    return (t) => {
      const st = { 1: T.s(1), 2: T.s(2), 2.5: T.s(2) + 2.4, 2.8: T.s(2) + 5.8, 3: T.s(3), 3.3: T.s(3) + 3.2, 3.6: T.s(3) + 5.8 };
      cards.forEach(({ k, el }) => V.pop(el, V.p(t, st[k], 0.45)));
      V.fade(ug, V.p(t, T.s(1) + 0.3, 0.45));
      uno.matrix.set(V.blinkFace(t));
    };
  },
});

defineScene({
  id: 'wires', part: '2 · Get ready', title: 'Jumper wires: male and female ends',
  lines: [
    'A quick word about jumper wires. A male end has a pin sticking out. A female end has a little hole.',
    'Male to male wires go from the Arduino to the breadboard.',
    'Male to female wires plug onto the pins of a module, like the motion sensor.',
    "And one female to female wire, we'll cut in half for the speaker.",
  ],
  build(root, T) {
    const svg = V.svg(root);
    const end = (x, y, male, dir) => {
      const g = V.s('g');
      g.appendChild(V.s('rect', { x: dir > 0 ? x : x - 46, y: y - 11, width: 46, height: 22, rx: 3, fill: '#222' }));
      if (male) g.appendChild(V.s('rect', { x: dir > 0 ? x + 46 : x - 70, y: y - 3, width: 24, height: 6, fill: '#c9a227' }));
      else g.appendChild(V.s('rect', { x: dir > 0 ? x + 40 : x - 46, y: y - 4, width: 6, height: 8, fill: '#555' }));
      return g;
    };
    const rows = [
      ['M – M', true, true, '#e53935', 'Arduino → breadboard'],
      ['M – F', true, false, '#f57c00', 'module pins (PIR, voice)'],
      ['F – F', false, false, '#1e63d6', 'cut in half → speaker wires'],
    ].map(([name, m1, m2, color, use], i) => {
      const y = 150 + i * 150, g = V.s('g');
      g.appendChild(V.s('path', { d: `M284,${y} C500,${y - 60} 720,${y + 60} 936,${y}`, fill: 'none', stroke: color, 'stroke-width': 10, 'stroke-linecap': 'round' }));
      g.appendChild(end(284, y, m1, -1)); g.appendChild(end(936, y, m2, 1));
      g.appendChild(V.s('text', { x: 120, y: y + 10, 'font-size': 34, 'font-weight': 900, fill: '#1d2b3a', 'text-anchor': 'middle' }, name));
      g.appendChild(V.s('text', { x: 1130, y: y + 7, 'font-size': 19, 'font-weight': 800, fill: '#44546a', 'text-anchor': 'middle' }, use));
      svg.appendChild(g);
      return g;
    });
    const mTag = V.tag(214, 150, 'male = pin', { dy: -46, dx: 0, color: '#c9a227', size: 17 });
    const fTag = V.tag(1000, 450, 'female = hole', { dy: 50, dx: -10, color: '#555', size: 17 });
    svg.appendChild(mTag); svg.appendChild(fTag);
    return (t) => {
      V.fade(rows[0], V.p(t, 0.2, 0.5));
      V.fade(mTag, V.p(t, 1.6, 0.4));
      V.fade(rows[1], V.p(t, T.s(2), 0.5));
      V.fade(rows[2], V.p(t, T.s(3), 0.5));
      V.fade(fTag, V.p(t, T.s(3) + 0.6, 0.4));
    };
  },
});

defineScene({
  id: 'software', part: '2 · Get ready', title: 'Before wiring: prepare the software',
  lines: [
    'Before we touch a single wire, we prepare the software.',
    'Install Arduino IDE 2. In the Boards Manager, install Arduino UNO R4 Boards. In the Library Manager, install ArduinoMqttClient.',
    'In the folder firmware slash robin, copy arduino_secrets.example.h to a new file, called arduino_secrets.h.',
    "For now, leave the WiFi name empty. Empty means offline test mode, so we don't need a network yet.",
    'Open robin.ino, choose the board UNO R4 WiFi and its port, and click Upload.',
    'Then open the Serial Monitor. Set it to 115200 baud, and the line ending to Newline.',
    'Type help, and press Enter. Robin lists the commands it understands.',
    "You'll also see a tx-failed line every two seconds. Don't worry: in offline test mode there's no network, so sending must fail. That's expected.",
  ],
  build(root, T) {
    const steps = V.list(root, [
      { icon: '①', text: 'Install <b>Arduino IDE 2</b>' },
      { icon: '②', text: 'Boards Manager → <span class="k">Arduino UNO R4 Boards</span>' },
      { icon: '③', text: 'Library Manager → <span class="k">ArduinoMqttClient</span>' },
      { icon: '④', text: 'Copy <span class="k">arduino_secrets.example.h</span> → <span class="k">arduino_secrets.h</span>' },
      { icon: '⑤', text: 'WiFi name <span class="k">""</span> = offline test mode' },
      { icon: '⑥', text: 'Open <span class="k">robin.ino</span> → board + port → <b>Upload →</b>' },
      { icon: '⑦', text: 'Serial Monitor: <b>115200 baud</b>, <b>Newline</b>' },
      { icon: '⑧', text: 'Type <span class="k">help</span> + Enter' },
    ], { x: 40, y: 22, w: 560, size: 19, gap: 11 });
    const code = V.code(root, [
      '<span style="color:#7f8c98">// firmware/robin/arduino_secrets.h</span>',
      '#define SECRET_WIFI_SSID  <b class="hl">""</b>   <span style="color:#8ee6a0">// empty = offline test mode</span>',
      '#define SECRET_WIFI_PASS  ""',
      '#define SECRET_MQTT_HOST  "192.168.1.23"',
      '#define SECRET_MQTT_PORT  1883',
      '#define SECRET_DEVICE_ID  "robin-01"',
    ], { x: 630, y: 30, w: 620, size: 15, title: 'arduino_secrets.h' });
    const up = V.box({ left: '860px', top: '300px', fontSize: '24px', fontWeight: 900, color: '#fff', background: '#0f8a8f', borderRadius: '30px', padding: '12px 28px' }, 'Upload →  Done uploading.');
    root.appendChild(up);
    const mon = V.term(root, { x: 630, y: 22, w: 620, h: 520, kind: 'serial', size: 14 });
    const b = T.s(5) + 0.6;
    mon.out(b, ['', 'Robin firmware 1.0.0', '[queue] events waiting: 1', "Offline test mode: type 'help' in the Serial Monitor."], 0.25);
    const ht = mon.type(T.s(6) + 0.3, 'help');
    mon.out(ht, ['[cmd] help', 'Commands: say <n> [ms] | ask <n> [ms] | face <mood> |', '          vol <0-30> | stop | raw',
      'Moods: happy blink talk ask concern sleep yes no offline'], 0.08);
    for (let i = 0; i < 12; i++) {
      const tt = b + 1.2 + i * 2;
      if (Math.abs(tt - ht) > 0.6) mon.out(tt, TXF(i), 0, '#8391a0');
    }
    const note = V.card(root, { x: 40, y: 430, w: 560, icon: '😌', title: '[tx-failed] every 2 s = normal offline', text: 'No network yet, so sending fails. That’s expected.', color: '#7e57c2', size: 16 });
    return (t) => {
      const st = [T.s(1), T.s(1) + 2.6, T.s(1) + 5.6, T.s(2), T.s(3), T.s(4), T.s(5), T.s(6)];
      steps.forEach((s, i) => V.rise(s, V.p(t, st[i], 0.4)));
      V.fade(code.el, V.win(t, T.s(2) + 0.5, T.s(4) + 1.8));
      code.rows[1].style.background = t > T.s(3) ? 'rgba(255,213,79,0.18)' : 'transparent';
      V.pop(up, V.win(t, T.s(4) + 2.5, T.s(5) + 0.2));
      V.fade(mon.el, V.p(t, T.s(5), 0.4));
      mon.update(t);
      V.rise(note, V.p(t, T.s(7) + 0.5, 0.5));
    };
  },
});

defineScene({
  id: 'rules', part: '2 · Get ready', title: 'The golden rule, and a little safety',
  lines: [
    'Now the golden rule of building: wire with the USB cable unplugged. Plug in only to test.',
    'After every step, there is a test. Don’t continue until it passes. Finding one new mistake is easy. Finding six at once is misery.',
    'And a little safety talk. Five volts can’t hurt you, but it can destroy a module.',
    'Never connect five volts straight to ground. That’s called a short circuit.',
    'Check every wire twice before you plug in. And if something gets warm, or smells, unplug immediately.',
  ],
  build(root, T) {
    const c1 = V.card(root, { x: 40, y: 30, w: 580, icon: '🔌', title: 'Golden rule: wire with the USB unplugged', text: 'Plug in <b>only to test</b>. Unplug again before the next step.', color: '#f57c00', size: 19 });
    const c2 = V.card(root, { x: 660, y: 30, w: 580, icon: '✅', title: 'A test after every step', text: '1 new mistake = easy to find.<br>6 new mistakes at once = misery.', color: '#2e9e4f', size: 19 });
    const c3 = V.card(root, { x: 40, y: 230, w: 580, icon: '🛡️', title: '5 V can’t hurt you…', text: '…but it can destroy a module.', color: '#1e63d6', size: 19 });
    const c4 = V.card(root, { x: 40, y: 390, w: 580, icon: '👀', title: 'Check every wire twice', text: 'Warm? Smells? <b>Unplug immediately.</b>', color: '#7e57c2', size: 19 });
    const svg = V.svg(root);
    const sc = V.s('g');
    sc.appendChild(V.s('rect', { x: 700, y: 250, width: 520, height: 150, rx: 14, fill: '#f6f3ec', stroke: '#d8d1c3', 'stroke-width': 2 }));
    sc.appendChild(V.s('line', { x1: 730, y1: 290, x2: 1190, y2: 290, stroke: '#e53935', 'stroke-width': 4 }));
    sc.appendChild(V.s('line', { x1: 730, y1: 360, x2: 1190, y2: 360, stroke: '#1e63d6', 'stroke-width': 4 }));
    sc.appendChild(V.s('text', { x: 716, y: 297, 'font-size': 22, 'font-weight': 900, fill: '#e53935' }, '+'));
    sc.appendChild(V.s('text', { x: 716, y: 367, 'font-size': 22, 'font-weight': 900, fill: '#1e63d6' }, '−'));
    const bad = V.wire([[900, 290], [960, 250], [1000, 325], [960, 360]], V.WIRE.red, { w: 7 });
    sc.appendChild(bad.g);
    const spark = V.emoji(1040, 320, '⚡', 60);
    const cross = V.s('text', { x: 1150, y: 345, 'font-size': 90, 'font-weight': 900, fill: '#e53935', 'text-anchor': 'middle' }, '✗');
    sc.appendChild(spark); sc.appendChild(cross);
    sc.appendChild(V.s('text', { x: 960, y: 450, 'font-size': 24, 'font-weight': 900, fill: '#e53935', 'text-anchor': 'middle' }, 'Short circuit: + straight to −'));
    svg.appendChild(sc);
    return (t) => {
      V.pop(c1, V.p(t, 0.3, 0.5)); V.pop(c2, V.p(t, T.s(1), 0.5));
      V.pop(c3, V.p(t, T.s(2), 0.5));
      V.fade(sc, V.p(t, T.s(3), 0.4)); bad.set(V.p(t, T.s(3) + 0.3, 0.8));
      const on = t > T.s(3) + 1.1;
      V.fade(spark, on ? 0.4 + 0.6 * V.pulse(t, 4) : 0); V.fade(cross, on ? 1 : 0);
      V.pop(c4, V.p(t, T.s(4), 0.5));
    };
  },
});

defineScene({
  id: 'breadboard', part: '2 · Get ready', title: 'How a breadboard works',
  lines: [
    'Meet the breadboard. It looks like a field of holes, but underneath, metal strips connect the holes in groups.',
    'The long lines along the edges are the power rails. All holes along the red plus line are connected. All holes along the blue minus line are connected too.',
    "There's a pair of rails on each long edge, and the two pairs are separate. We'll use the pair nearest to the Arduino's power pins.",
    'In the middle, each numbered column of five holes is one group. Think of it as a little house: everyone inside the house can talk to each other.',
    'The gap in the middle is a wall. So a to e is one house, and f to j, below the gap, is another house.',
    'The rule is simple: two legs in the same group are connected. Two legs in different groups are not.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const bb = V.breadboard(268, 64, 24);
    svg.appendChild(bb.g);
    const railT = [bb.rail('+t'), bb.rail('-t')], railB = [bb.rail('-b'), bb.rail('+b')];
    const gTop = bb.group(6, 'top', '#ffcc80'), gBot = bb.group(6, 'bottom', '#b39ddb');
    const top = V.s('g'); svg.appendChild(top);
    const house = V.emoji(bb.hole(6, 'a').x, bb.hole(6, 'a').y - 36, '🏠', 34);
    const house2 = V.emoji(bb.hole(6, 'j').x, bb.hole(6, 'j').y + 36, '🏠', 34);
    const wall = V.s('line', { x1: bb.hole(3, 'e').x, y1: (bb.hole(6, 'e').y + bb.hole(6, 'f').y) / 2, x2: bb.hole(9, 'e').x, y2: (bb.hole(6, 'e').y + bb.hole(6, 'f').y) / 2, stroke: '#e53935', 'stroke-width': 6, 'stroke-linecap': 'round' });
    top.appendChild(house); top.appendChild(house2); top.appendChild(wall);
    const tUse = V.tag(bb.hole(22, '+b').x, bb.hole(22, '+b').y, 'we use these (near the Arduino)', { dy: 50, color: '#0f8a8f', size: 16 });
    top.appendChild(tUse);
    // example legs: same group (col 18, rows a + c) vs different groups (col 24 + col 25)
    const leg = (c, r, color) => { const h = bb.hole(c, r); return V.s('circle', { cx: h.x, cy: h.y, r: 7, fill: color, stroke: '#fff', 'stroke-width': 2 }); };
    const ok = V.s('g', {}, leg(18, 'a', '#2e9e4f'), leg(18, 'c', '#2e9e4f'), V.s('text', { x: bb.hole(18, 'b').x + 26, y: bb.hole(18, 'b').y + 10, 'font-size': 30, 'font-weight': 900, fill: '#2e9e4f' }, '✓'));
    const no = V.s('g', {}, leg(24, 'b', '#e53935'), leg(25, 'b', '#e53935'), V.s('text', { x: bb.hole(26, 'b').x + 8, y: bb.hole(26, 'b').y + 10, 'font-size': 30, 'font-weight': 900, fill: '#e53935' }, '✗'));
    top.appendChild(ok); top.appendChild(no);
    const g2 = bb.group(18, 'top', '#a5d6a7');
    return (t) => {
      bb.xray.setAttribute('opacity', (V.win(t, 1.8, T.s(1) + 1.5, 0.6) * 0.95).toFixed(3));
      const pr = V.p(t, T.s(1) + 0.5, 0.5);
      railT.forEach((r) => r.setAttribute('opacity', (V.win(t, T.s(1) + 0.5, T.s(2) + 2.5) * 0.75).toFixed(3)));
      railB.forEach((r) => r.setAttribute('opacity', ((t < T.s(2) + 2.5 ? pr : 1) * V.win(t, T.s(1) + 0.5, T.s(3)) * 0.75).toFixed(3)));
      V.fade(tUse, V.win(t, T.s(2) + 3, T.s(3)));
      gTop.setAttribute('opacity', (V.p(t, T.s(3) + 0.5, 0.4) * 0.85).toFixed(3));
      V.fade(house, V.p(t, T.s(3) + 4, 0.4));
      gBot.setAttribute('opacity', (V.p(t, T.s(4) + 1.5, 0.4) * 0.85).toFixed(3));
      V.fade(house2, V.p(t, T.s(4) + 1.5, 0.4));
      V.fade(wall, V.p(t, T.s(4) + 0.2, 0.4));
      V.fade(ok, V.p(t, T.s(5) + 1, 0.4)); g2.setAttribute('opacity', (V.p(t, T.s(5) + 1, 0.4) * 0.8).toFixed(3));
      V.fade(no, V.p(t, T.s(5) + 3.2, 0.4));
    };
  },
});

defineScene({
  id: 'pinmap', part: '2 · Get ready', title: "The whole map (don't memorise it!)",
  lines: [
    "Here's the map of everything we'll connect. Don't try to remember it now. We'll do it one small piece at a time.",
    "Keep this table open next to you while you wire. You'll find it in the assembly guide, file 04.",
  ],
  build(root, T) {
    const rows = [['From', 'To', 'Wire'],
      ['Arduino <b>5V</b>', 'breadboard <b style="color:#e53935">+ rail</b>', 'M-M (red)'],
      ['Arduino <b>GND</b>', 'breadboard <b style="color:#1e63d6">− rail</b>', 'M-M (black)'],
      ['LDR leg 1', '+ rail', 'the leg itself'],
      ['LDR leg 2 <b>and</b> 10 kΩ leg 1', 'the same column (e.g. column 5)', '–'],
      ['10 kΩ leg 2', '− rail', '–'],
      ['column 5', 'Arduino <b>A0</b>', 'M-M'],
      ['PIR <b>VCC</b> / <b>GND</b>', '+ rail / − rail', '2 × F-M'],
      ['PIR <b>OUT</b>', 'Arduino <b>A1</b>', 'F-M'],
      ['Green button, diagonal legs', '− rail and <b>D2</b>', '2 × M-M'],
      ['Red button, diagonal legs', '− rail and <b>D3</b>', '2 × M-M'],
      ['DFR0534 <b>VCC</b> / <b>GND</b>', '+ rail / − rail', '2 × F-M'],
      ['DFR0534 <b>TX</b>', 'Arduino <b>D0</b> (RX)', 'F-M'],
      ['DFR0534 <b>RX</b>', '1 kΩ → Arduino <b>D1</b> (TX)', 'F-M + resistor + M-M'],
      ['DFR0534 <b>SP+</b> / <b>SP−</b>', 'speaker + / −', 'F-F halves, soldered'],
    ];
    const tb = V.table(root, rows, { x: 90, y: 14, w: 1100, size: 16.5, colW: ['36%', '38%', '26%'] });
    const note = V.box({ left: '930px', top: '480px', fontSize: '19px', fontWeight: 900, color: '#fff', background: '#f57c00', borderRadius: '24px', padding: '9px 20px' }, '📄 docs/04_assembly.md');
    root.appendChild(note);
    return (t) => {
      tb.trs.forEach((tr, i) => { if (i) V.fade(tr, V.p(t, 0.4 + i * 0.35, 0.3)); });
      V.pop(note, V.p(t, T.s(1) + 1, 0.5));
    };
  },
});

// ---------------------------------------------------------------------------------------------
// Step 1
defineScene({
  id: 'step1', part: '3 · Build', step: 'Step 1 of 8', title: 'Power rails',
  lines: [
    'Step one: the power rails. This takes two minutes.',
    'Take a male to male wire, red if you have one. Connect the pin labelled 5V on the Arduino to the red plus rail.',
    'Take a black wire, and connect a pin labelled GND, which means ground, to the blue minus rail.',
    'Think of it like water. 5V is the push, and ground is the way home. Electricity flows from the push, through a part, and back home.',
    'Test: plug in the USB cable. The power LED turns on, and the LED grid shows a happy face.',
    'In offline test mode Robin is happy, not cross-eyed. Unplug again before the next step.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const b = bench(svg, { upto: 0 });
    const ts = 7.8;
    const p5 = b.uno.pin('5V'), pg = b.uno.pin('GND'), hp = b.bb.hole(2, '+b'), hm = b.bb.hole(1, '-b');
    const r = [b.ring(p5.x, p5.y, '#e53935', 6), b.ring(hp.x, hp.y, '#e53935', 6), b.ring(pg.x, pg.y, '#1d2b3a', 6), b.ring(hm.x, hm.y, '#1e63d6', 6)];
    const t5 = b.tag(p5.x, p5.y, '5V', { dy: -26, dx: -14, size: ts, color: '#e53935' });
    const tg = b.tag(pg.x, pg.y, 'GND', { dy: -26, dx: 14, size: ts, color: '#1d2b3a' });
    const tp = b.tag(hp.x, hp.y, 'red + rail', { dy: 30, dx: 40, size: ts, color: '#e53935' });
    const tm = b.tag(hm.x, hm.y, 'blue − rail', { dy: -34, dx: 40, size: ts, color: '#1e63d6' });
    const flowA = flowDots(b.top, 5, '#ffd54f', 2.6), flowB = flowDots(b.top, 5, '#ffd54f', 2.6);
    const water = V.card(root, { x: 30, y: 24, w: 390, icon: '💧', title: '5V = the push · GND = the way home', text: 'Electricity flows from the push, through a part, back home.', color: '#1e63d6', size: 16 });
    const usb = usbCable(b.top, b.uno);
    const VB = camBox(330, 320, 760);
    return (t) => {
      camera(svg, t, [[0, FULL], [1.4, BENCH_VIEWS[1]], [T.s(4), BENCH_VIEWS[1]], [T.s(4) + 1.2, VB]]);
      r[0].set(t, t > T.s(1) + 3 && t < T.s(2)); V.fade(t5, V.win(t, T.s(1) + 3, T.s(3)));
      b.set('w5v', V.pe(t, T.s(1) + 4.5, 1.6));
      r[1].set(t, t > T.s(1) + 5.2 && t < T.s(2) + 0.5); V.fade(tp, V.win(t, T.s(1) + 5.2, T.s(3)));
      r[2].set(t, t > T.s(2) + 1.8 && t < T.s(3)); V.fade(tg, V.win(t, T.s(2) + 1.8, T.s(3)));
      b.set('wgnd', V.pe(t, T.s(2) + 3, 1.6));
      r[3].set(t, t > T.s(2) + 4 && t < T.s(3) + 0.5); V.fade(tm, V.win(t, T.s(2) + 4, T.s(3)));
      const flowing = t > T.s(3) + 1 && t < T.s(4);
      flowA.set(b.it.w5v.path, t, flowing, 0.3); flowB.set(b.it.wgnd.path, t, flowing, 0.3, true);
      V.rise(water, V.win(t, T.s(3), T.s(4) + 0.5));
      const plugged = t > T.s(4) + 1.4 && t < T.s(5) + 3.2;
      usb.set(plugged ? V.p(t, T.s(4) + 1.4, 0.6) : (t >= T.s(5) + 3.2 ? 1 - V.p(t, T.s(5) + 3.2, 0.6) : 0));
      const on = t > T.s(4) + 2 && t < T.s(5) + 3.3;
      b.uno.power(on);
      if (on) b.uno.matrix.set(V.blinkFace(t));
    };
  },
});

// Step 2 --------------------------------------------------------------------------------------
defineScene({
  id: 'step2a', part: '3 · Build', step: 'Step 2 of 8', title: 'Light sensor: why a voltage divider?',
  lines: [
    'Step two: the light sensor. This part is an LDR: a light dependent resistor.',
    "Its resistance drops when light shines on it. In the dark, it's about one million ohms. In a normal room, about ten to twenty thousand ohms.",
    "But here's the problem: the Arduino can't measure resistance. It can only measure voltage.",
    'So we use a trick called a voltage divider. We put the LDR and a fixed ten kilo-ohm resistor in a row, between five volts and ground.',
    'Think of two doors in a row that the electricity must squeeze through. When light opens the LDR door wider, more of the push is left at the middle point.',
    'That middle point goes to pin A0. The Arduino turns zero to five volts into a number from zero to 1023.',
    "In the dark, the middle is about 0.05 volts, which reads around 10. In room light, it's about two volts, which reads around 340 to 510.",
  ],
  build(root, T) {
    const svg = V.svg(root);
    const X = 300, g = V.s('g');
    const txt = (x, y, s, size = 22, color = '#1d2b3a', anchor = 'middle') => V.s('text', { x, y, 'font-size': size, 'font-weight': 900, fill: color, 'text-anchor': anchor }, s);
    g.appendChild(txt(X, 42, '5 V', 26, '#e53935'));
    g.appendChild(V.s('line', { x1: X, y1: 52, x2: X, y2: 96, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('rect', { x: X - 22, y: 96, width: 44, height: 104, rx: 4, fill: '#fff5e6', stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(txt(X - 40, 154, 'LDR', 20, '#e2553f', 'end'));
    const arrows = V.s('g');
    [0, 1].forEach((i) => arrows.appendChild(V.s('path', { d: `M${X + 78},${104 + i * 30} L${X + 30},${128 + i * 30} M${X + 30},${128 + i * 30} l12,-1 M${X + 30},${128 + i * 30} l6,-10`, stroke: '#f2b705', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' })));
    g.appendChild(arrows);
    g.appendChild(V.s('line', { x1: X, y1: 200, x2: X, y2: 290, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('circle', { cx: X, cy: 245, r: 8, fill: '#1d2b3a' }));
    g.appendChild(V.s('rect', { x: X - 22, y: 290, width: 44, height: 104, rx: 4, fill: '#f3ead3', stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(txt(X - 40, 350, '10 kΩ', 20, '#6d3b1f', 'end'));
    g.appendChild(V.s('line', { x1: X, y1: 394, x2: X, y2: 440, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('line', { x1: X - 26, y1: 440, x2: X + 26, y2: 440, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('line', { x1: X - 16, y1: 450, x2: X + 16, y2: 450, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('line', { x1: X - 7, y1: 460, x2: X + 7, y2: 460, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(txt(X, 492, 'GND', 22, '#1e63d6'));
    svg.appendChild(g);
    const a0 = V.s('g');
    a0.appendChild(V.s('line', { x1: X, y1: 245, x2: X + 170, y2: 245, stroke: '#f2b705', 'stroke-width': 5 }));
    a0.appendChild(V.s('path', { d: `M${X + 170},233 L${X + 190},245 L${X + 170},257 Z`, fill: '#f2b705' }));
    a0.appendChild(txt(X + 230, 253, 'A0', 26, '#9a7400'));
    svg.appendChild(a0);
    // no-ohmmeter card
    const noR = V.card(root, { x: 620, y: 30, w: 600, icon: '🤷', title: 'The Arduino measures volts, not ohms', text: 'So we turn “resistance” into “voltage” with a divider.', color: '#e53935', size: 17 });
    const doors = V.card(root, { x: 620, y: 150, w: 600, icon: '🚪', title: 'Two doors in a row', text: 'Light opens the LDR door wider → more push is left at the middle point.', color: '#f57c00', size: 17 });
    // meter
    const meter = V.box({ left: '620px', top: '290px', width: '600px', height: '250px', background: '#1d2b3a', borderRadius: '16px', color: '#fff', padding: '16px 22px', boxSizing: 'border-box' });
    const mRow = (label) => { const v = V.h('span', { style: { fontFamily: 'JetBrains Mono', fontSize: '26px', fontWeight: 700, color: '#ffd54f' } }, ''); meter.appendChild(V.h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '21px', fontWeight: 800, margin: '4px 0' } }, V.h('span', {}, label), v)); return v; };
    const light = mRow('light'), rv = mRow('R of the LDR'), vv = mRow('voltage at A0'), av = mRow('Arduino reads (0–1023)');
    const formula = V.h('div', { style: { fontFamily: 'JetBrains Mono', fontSize: '15px', color: '#9fb3c8', marginTop: '10px' } }, 'V(A0) = 5 V × 10k / (10k + R_LDR)');
    meter.appendChild(formula);
    root.appendChild(meter);
    const sunG = V.emoji(X + 110, 90, '☀️', 44);
    svg.appendChild(sunG);
    return (t) => {
      V.fade(g, V.p(t, 0.2, 0.5));
      V.fade(arrows, V.p(t, T.s(1), 0.4));
      V.pop(noR, V.p(t, T.s(2), 0.5));
      V.pop(doors, V.p(t, T.s(4), 0.5));
      V.fade(a0, V.p(t, T.s(5), 0.5));
      V.fade(meter, V.p(t, T.s(1) + 0.5, 0.5));
      // light level: follows the narration (dark -> room)
      let lvl = 0.55;
      if (t > T.s(1) && t < T.s(2)) lvl = 0.5 + 0.5 * Math.sin((t - T.s(1)) * 1.3);
      if (t >= T.s(6)) lvl = V.lerp(0, 0.55, V.pe(t, T.s(6) + 3, 1.2));
      const R = Math.round(1000000 * Math.pow(15000 / 1000000, V.clamp(lvl / 0.55)) * (lvl > 0.55 ? Math.pow(0.4, (lvl - 0.55) / 0.45) : 1));
      const Vout = 5 * 10000 / (10000 + R), adc = Math.round(Vout / 5 * 1023);
      light.textContent = lvl < 0.1 ? 'dark 🌑' : lvl < 0.75 ? 'room 💡' : 'bright ☀️';
      rv.textContent = R >= 100000 ? (R / 1000000).toFixed(2) + ' MΩ' : (R / 1000).toFixed(1) + ' kΩ';
      vv.textContent = t > T.s(3) ? Vout.toFixed(2) + ' V' : '?';
      av.textContent = t > T.s(5) ? String(adc) : '?';
      V.fade(sunG, V.clamp(lvl * 1.4));
    };
  },
});

defineScene({
  id: 'step2b', part: '3 · Build', step: 'Step 2 of 8', title: 'Light sensor: wiring',
  lines: [
    "Now let's wire it. Put one leg of the LDR into the red plus rail.",
    'Put its other leg into column 5, in the lower half of the board.',
    'Take the ten kilo-ohm resistor. Its colour bands are brown, black, orange. Put one leg in the same column 5, and the other leg in the blue minus rail.',
    'Finally, a wire from column 5 to pin A0 on the Arduino.',
    'LDRs and resistors have no plus or minus side. You can turn them around, and they work the same.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const b = bench(svg, { upto: 1 });
    const ts = 8;
    const h1 = b.bb.hole(3, '+b'), h2 = b.bb.hole(5, 'i'), h3 = b.bb.hole(5, 'g'), h4 = b.bb.hole(9, '-b'), h5 = b.bb.hole(5, 'f'), a0 = b.uno.pin('A0');
    const rs = [[h1, '#e53935'], [h2, '#f57c00'], [h3, '#f57c00'], [h4, '#1e63d6'], [h5, '#f2b705'], [a0, '#f2b705']].map(([h, c]) => b.ring(h.x, h.y, c, 5));
    const col5 = b.bb.group(5, 'bottom', '#ffcc80');
    const tCol = b.tag(h2.x, h2.y, 'column 5 = one group', { dx: 70, dy: -70, size: ts, color: '#f57c00' });
    const tBands = b.tag((h3.x + h4.x) / 2, (h3.y + h4.y) / 2, 'brown · black · orange = 10 kΩ', { dx: 90, dy: 40, size: ts, color: '#6d3b1f' });
    const tA0 = b.tag(a0.x, a0.y, 'A0', { dy: -26, size: ts, color: '#9a7400' });
    const tPol = V.card(root, { x: 24, y: 20, w: 430, icon: '🔄', title: 'No plus or minus side', text: 'LDRs and resistors work either way round.', color: '#2e9e4f', size: 17 });
    return (t) => {
      camera(svg, t, [[0, FULL], [1.4, BENCH_VIEWS[2]]]);
      b.set('ldr', V.p(t, T.s(0) + 2.2, 0.6));
      rs[0].set(t, t > T.s(0) + 2 && t < T.s(1));
      rs[1].set(t, t > T.s(1) + 0.5 && t < T.s(2));
      col5.setAttribute('opacity', (V.win(t, T.s(1) + 1, T.s(3) + 1) * 0.8).toFixed(3));
      V.fade(tCol, V.win(t, T.s(1) + 1.5, T.s(2) + 1));
      b.set('r10k', V.p(t, T.s(2) + 3.5, 0.6));
      rs[2].set(t, t > T.s(2) + 4 && t < T.s(2) + 7); rs[3].set(t, t > T.s(2) + 6 && t < T.s(3));
      V.fade(tBands, V.win(t, T.s(2) + 1.5, T.s(3) + 0.5));
      rs[4].set(t, t > T.s(3) + 0.3 && t < T.s(3) + 2); b.set('wA0', V.pe(t, T.s(3) + 0.8, 1.6));
      rs[5].set(t, t > T.s(3) + 2 && t < T.s(4)); V.fade(tA0, V.win(t, T.s(3) + 2, T.s(4) + 1));
      V.pop(tPol, V.p(t, T.s(4), 0.5));
    };
  },
});

defineScene({
  id: 'step2c', part: '3 · Build', step: 'Step 2 of 8', title: 'Light sensor: test',
  lines: [
    'Before we test, a quick question. When you cover the LDR with your finger, will the number go up, or down?',
    { pause: 4, cap: 'Pause and guess: up or down?' },
    'Let’s see. Plug in, open the Serial Monitor, type raw, and press Enter. For two seconds, Robin prints its raw sensor values.',
    'Cover the LDR with your finger: light_raw drops a lot. Now shine your phone torch on it: it rises. Did you guess right?',
    'If the number is stuck near zero, or near 1023, the LDR and the resistor are probably not in the same column.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const b = bench(svg, { upto: 2 });
    const view = camBox(690, 360, 600);
    const ldr = b.it.ldr;
    const lh = b.bb.hole(4, 'j');
    const finger = V.s('g', {}, V.s('ellipse', { cx: lh.x, cy: lh.y - 6, rx: 22, ry: 15, fill: '#f1c9a5', stroke: '#c48f6a', 'stroke-width': 2 }),
      V.s('ellipse', { cx: lh.x + 4, cy: lh.y - 12, rx: 8, ry: 5, fill: '#fbe3d0' }));
    const torch = V.s('g', {}, V.s('polygon', { points: `${lh.x - 8},${lh.y - 8} ${lh.x + 90},${lh.y - 120} ${lh.x + 140},${lh.y - 70}`, fill: '#fff59d', opacity: 0.75 }),
      V.emoji(lh.x + 128, lh.y - 108, '🔦', 34));
    b.top.appendChild(finger); b.top.appendChild(torch);
    const mon = V.term(root, { x: 650, y: 20, w: 600, h: 520, kind: 'serial', size: 13.5 });
    const note = V.card(root, { x: 30, y: 440, w: 580, icon: 'ℹ️', title: 'pir_raw: the PIR isn’t connected yet, ignore it', color: '#7b8794', size: 15 });
    const q = V.box({ left: '120px', top: '120px', fontSize: '64px', fontWeight: 900, color: '#f57c00', textAlign: 'center', width: '420px', lineHeight: 1.1 }, 'up ⬆️ or down ⬇️ ?');
    root.appendChild(q);
    const burst = (t0, light) => {
      const tt = mon.type(t0, 'raw');
      mon.out(tt, '[cmd] raw');
      for (let i = 0; i < 8; i++) mon.out(tt + 0.1 + i * 0.1, RAW(jit(305, 25, i), jit(light, light > 700 ? 12 : 5, i)));
    };
    burst(T.s(2) + 4, 455);
    burst(T.s(3) + 1.2, 62);
    const torchT = T.s(3) + 4.2;
    burst(torchT + 0.4, 893);
    return (t) => {
      camera(svg, t, [[0, FULL], [1.2, view]]);
      V.fade(q, V.win(t, T.s(0) + 2, T.s(2) + 0.5));
      V.fade(mon.el, V.p(t, T.s(2) + 1, 0.4));
      V.fade(note, V.p(t, T.s(2) + 5, 0.4));
      mon.update(t);
      V.fade(finger, V.win(t, T.s(3) + 0.6, torchT - 0.1, 0.25));
      V.fade(torch, V.win(t, torchT, T.s(4), 0.25));
      b.uno.power(t > T.s(2) + 1);
      if (t > T.s(2) + 1) b.uno.matrix.set(V.blinkFace(t));
    };
  },
});

// Step 3 --------------------------------------------------------------------------------------
defineScene({
  id: 'step3a', part: '3 · Build', step: 'Step 3 of 8', title: 'Motion sensor (PIR)',
  lines: [
    'Step three: the motion sensor, called a PIR. It notices warm bodies that move, like a person walking past.',
    "It doesn't see a picture, only a change in warmth. That's great for privacy: Robin knows that someone moved, but not who, or what they did.",
    'Gently pull off the white dome. Underneath, you can read the three pin labels: VCC, OUT, and GND. Then put the dome back.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const S = 2.2, px = 640 - 64 * S, py = 150;
    const pir = V.pir(px, py, S);
    svg.appendChild(pir.g);
    const walker = V.s('g');
    walker.appendChild(V.s('circle', { cx: 0, cy: 30, r: 46, fill: '#ff7043', opacity: 0.28 }));
    walker.appendChild(V.person(0, 0, 1.1, { shirt: '#7e57c2' }));
    svg.appendChild(walker);
    const out = V.box({ left: '1000px', top: '60px', fontSize: '26px', fontWeight: 900, color: '#fff', background: '#9e9e9e', borderRadius: '14px', padding: '10px 18px', fontFamily: 'JetBrains Mono' }, 'OUT: LOW');
    root.appendChild(out);
    const priv = V.card(root, { x: 30, y: 30, w: 360, icon: '🌡️', title: 'Sees warmth that moves', text: 'No picture: Robin knows <b>that</b> someone moved, not who or what they did.', color: '#2f7d46', size: 17 });
    const tags = ['VCC', 'OUT', 'GND'].map((n, i) => { const p = pir.pin(n); const g = V.tag(p.x, py + 84 * S, n, { dy: 100, dx: (i - 1) * 60, size: 20, color: ['#e53935', '#f57c00', '#1d2b3a'][i] }); svg.appendChild(g); return g; });
    return (t) => {
      // person walks across in front of the sensor
      const w = V.p(t, 1.5, 7);
      const x = V.lerp(-80, 1360, w);
      walker.setAttribute('transform', `translate(${x.toFixed(1)} 440)`);
      const seen = w > 0.2 && w < 0.85 && t < T.s(2);
      out.textContent = seen ? 'OUT: HIGH' : 'OUT: LOW';
      out.style.background = seen ? '#2e9e4f' : '#9e9e9e';
      V.fade(out, V.win(t, 1, T.s(2) + 0.5));
      V.pop(priv, V.p(t, T.s(1) + 1, 0.5));
      const lift = V.win(t, T.s(2) + 1, T.e(2) + 0.3, 0.8);
      pir.dome.setAttribute('transform', `translate(${(95 * lift).toFixed(1)} ${(-40 * lift).toFixed(1)})`);
      V.fade(pir.dome, 1 - 0.15 * lift);
      V.fade(pir.labels, lift);
      tags.forEach((g, i) => V.fade(g, V.win(t, T.s(2) + 2.8 + i * 0.5, T.e(2) + 0.3)));
    };
  },
});

defineScene({
  id: 'step3b', part: '3 · Build', step: 'Step 3 of 8', title: 'PIR: set the two knobs and the jumper',
  lines: [
    "Next, turn the PIR over. You'll see two orange knobs. Use a small screwdriver.",
    "The time delay knob: turn it fully counter-clockwise. That's the shortest setting, about three seconds.",
    'The sensitivity knob: start with it in the middle.',
    'If your board has a jumper, put it on H. H means repeat trigger: the output stays high as long as you keep moving.',
    "Not sure which knob is which? Look for the tiny print next to them. And later, the test will tell you: the time knob changes how long the output stays high.",
  ],
  build(root, T) {
    const svg = V.svg(root);
    const S = 3.3, bx = 70, by = 60;
    const pb = V.pirBack(bx, by, S);
    svg.appendChild(pb.g);
    const arc = V.s('path', { d: `M${bx + 30 * S + 40},${by + 69 * S - 20} A45,45 0 1 0 ${bx + 30 * S - 40},${by + 69 * S - 20}`, fill: 'none', stroke: '#1e63d6', 'stroke-width': 6, 'stroke-linecap': 'round' });
    svg.appendChild(arc);
    const c1 = V.card(root, { x: 600, y: 30, w: 630, icon: '⏱️', title: 'Time delay (Tx): fully counter-clockwise', text: 'Shortest setting, about 3 seconds.', color: '#1e63d6', size: 18 });
    const c2 = V.card(root, { x: 600, y: 160, w: 630, icon: '🎚️', title: 'Sensitivity (Sx): middle', text: 'A good start. You can fine-tune it later.', color: '#f57c00', size: 18 });
    const c3 = V.card(root, { x: 600, y: 290, w: 630, icon: '🔁', title: 'Jumper on H = repeat trigger', text: 'Output stays HIGH while you keep moving.', color: '#2f7d46', size: 18 });
    const c4 = V.card(root, { x: 600, y: 420, w: 630, icon: '🔍', title: 'Which knob is which?', text: 'Read the tiny print. The test also tells you: the time knob changes how long OUT stays HIGH.', color: '#7b8794', size: 16 });
    const drv = V.emoji(bx + 30 * S + 50, by + 69 * S + 70, '🪛', 54);
    svg.appendChild(drv);
    return (t) => {
      const turn = V.pe(t, T.s(1) + 1, 1.8);
      pb.tx.turn(-150 * turn);
      pb.sx.turn(0);
      V.fade(arc, V.win(t, T.s(1) + 0.8, T.s(2) + 0.5));
      V.fade(drv, V.win(t, T.s(0) + 2, T.s(2) + 0.5));
      V.pop(c1, V.p(t, T.s(1), 0.5)); V.pop(c2, V.p(t, T.s(2), 0.5)); V.pop(c3, V.p(t, T.s(3), 0.5)); V.pop(c4, V.p(t, T.s(4), 0.5));
      pb.setJumper(t > T.s(3) + 2 ? 'H' : 'L');
    };
  },
});

defineScene({
  id: 'step3c', part: '3 · Build', step: 'Step 3 of 8', title: 'PIR: wiring',
  lines: [
    "Now wire it with three male to female wires. The female end goes onto the sensor's pin. The male end goes into the breadboard, or straight into the Arduino.",
    'VCC goes to the red plus rail.',
    'GND goes to the blue minus rail.',
    'And OUT goes straight to pin A1 on the Arduino.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const b = bench(svg, { upto: 2 });
    const pir = b.it.pirApi, ts = 11;
    const pv = pir.pin('VCC'), po = pir.pin('OUT'), pg = pir.pin('GND'), hp = b.bb.hole(28, '+b'), hm = b.bb.hole(30, '-b'), a1 = b.uno.pin('A1');
    const tags = [b.tag(pv.x, pv.y, 'VCC', { dx: -40, dy: 20, size: ts, color: '#e53935' }), b.tag(po.x, po.y, 'OUT', { dx: 0, dy: 40, size: ts, color: '#f57c00' }), b.tag(pg.x, pg.y, 'GND', { dx: 44, dy: 20, size: ts, color: '#1d2b3a' })];
    const rs = [b.ring(hp.x, hp.y, '#e53935', 6), b.ring(hm.x, hm.y, '#1e63d6', 6), b.ring(a1.x, a1.y, '#f57c00', 7)];
    const ta1 = b.tag(a1.x, a1.y, 'A1', { dy: -30, size: ts, color: '#f57c00' });
    const fm = V.card(root, { x: 30, y: 24, w: 470, icon: '〰️', title: 'F-M wires', text: 'Female end → sensor pin · male end → breadboard / Arduino', color: '#f57c00', size: 16 });
    return (t) => {
      camera(svg, t, [[0, FULL], [1.4, BENCH_VIEWS[3]]]);
      b.set('pir', V.p(t, 0.8, 0.6));
      V.rise(fm, V.win(t, 1.5, T.s(1) + 0.5));
      tags.forEach((g, i) => V.fade(g, V.p(t, T.s(0) + 4 + i * 0.4, 0.4)));
      b.set('wPV', V.pe(t, T.s(1) + 0.3, 1.4)); rs[0].set(t, t > T.s(1) + 1.2 && t < T.s(2) + 0.5);
      b.set('wPG', V.pe(t, T.s(2) + 0.3, 1.4)); rs[1].set(t, t > T.s(2) + 1.2 && t < T.s(3) + 0.5);
      b.set('wPO', V.pe(t, T.s(3) + 0.3, 2)); rs[2].set(t, t > T.s(3) + 1.6); V.fade(ta1, V.p(t, T.s(3) + 1.6, 0.4));
    };
  },
});

defineScene({
  id: 'step3d', part: '3 · Build', step: 'Step 3 of 8', title: 'Why an analog pin? (logic levels)',
  lines: [
    'Wait. Why do we use an analog pin for the PIR, and not a digital one? This is a great story for your oral exam.',
    'When the PIR sees movement, it says yes with 3.3 volts. But the UNO R4 runs on five volts, and a digital pin only reliably hears a high signal above about 3.5 volts.',
    "It's like whispering to someone who only reacts to shouting. Sometimes they hear it. Sometimes they don't.",
    "An analog pin doesn't just listen for yes or no. It measures how loud the whisper is. 3.3 volts reads about 675 out of 1023.",
    'Our firmware says: above 400 means movement. So the answer is rock solid. This topic is called logic levels.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const y0 = 500, y5 = 60, vy = (v) => y0 - (v / 5) * (y0 - y5);
    const ax = V.s('g');
    ax.appendChild(V.s('line', { x1: 150, y1: y0, x2: 150, y2: y5 - 10, stroke: '#1d2b3a', 'stroke-width': 3 }));
    [0, 1, 2, 3, 4, 5].forEach((v) => { ax.appendChild(V.s('line', { x1: 142, y1: vy(v), x2: 150, y2: vy(v), stroke: '#1d2b3a', 'stroke-width': 3 })); ax.appendChild(V.s('text', { x: 132, y: vy(v) + 7, 'font-size': 20, 'font-weight': 800, 'text-anchor': 'end', fill: '#1d2b3a' }, v + ' V')); });
    svg.appendChild(ax);
    const zoneHi = V.s('g', {}, V.s('rect', { x: 152, y: vy(5), width: 380, height: vy(3.5) - vy(5), fill: '#c8e6c9' }), V.s('text', { x: 342, y: vy(4.3), 'font-size': 20, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1b5e20' }, 'digital pin hears HIGH for sure'), V.s('text', { x: 342, y: vy(4.3) + 26, 'font-size': 16, 'font-weight': 800, 'text-anchor': 'middle', fill: '#1b5e20' }, '(above about 3.5–4 V)'));
    const zoneMid = V.s('g', {}, V.s('rect', { x: 152, y: vy(3.5), width: 380, height: vy(1.5) - vy(3.5), fill: '#eeeeee' }), V.s('text', { x: 342, y: vy(2.2), 'font-size': 20, 'font-weight': 900, 'text-anchor': 'middle', fill: '#616161' }, 'grey zone: maybe, maybe not'));
    const pirLine = V.s('g', {}, V.s('line', { x1: 152, y1: vy(3.3), x2: 532, y2: vy(3.3), stroke: '#f57c00', 'stroke-width': 5, 'stroke-dasharray': '12 6' }), V.s('text', { x: 540, y: vy(3.3) + 8, 'font-size': 24, 'font-weight': 900, fill: '#f57c00' }, 'PIR "yes" = 3.3 V ?'));
    svg.appendChild(zoneHi); svg.appendChild(zoneMid); svg.appendChild(pirLine);
    const whisper = V.card(root, { x: 780, y: 20, w: 460, icon: '🤫', title: 'Whispering to someone who only hears shouting', text: 'Sometimes they hear it. Sometimes they don’t.', color: '#7b8794', size: 17 });
    // ADC bar
    const adc = V.s('g');
    const ax0 = 790, ax1 = 1230, ay = 330, ap = (n) => ax0 + (n / 1023) * (ax1 - ax0);
    adc.appendChild(V.s('text', { x: ax0, y: ay - 70, 'font-size': 22, 'font-weight': 900, fill: '#1d2b3a' }, 'Analog pin A1 measures (0–1023):'));
    adc.appendChild(V.s('rect', { x: ax0, y: ay - 20, width: ax1 - ax0, height: 40, rx: 8, fill: '#e3e9ee' }));
    const fill = V.s('rect', { x: ax0, y: ay - 20, width: 0, height: 40, rx: 8, fill: '#f57c00' });
    adc.appendChild(fill);
    adc.appendChild(V.s('text', { x: ax0, y: ay + 48, 'font-size': 16, 'font-weight': 800, fill: '#5b6b7b' }, '0'));
    adc.appendChild(V.s('text', { x: ax1, y: ay + 48, 'font-size': 16, 'font-weight': 800, fill: '#5b6b7b', 'text-anchor': 'end' }, '1023'));
    const val = V.s('text', { x: ap(675), y: ay - 30, 'font-size': 26, 'font-weight': 900, fill: '#f57c00', 'text-anchor': 'middle' }, '675');
    adc.appendChild(val);
    const thr = V.s('g', {}, V.s('line', { x1: ap(400), y1: ay - 34, x2: ap(400), y2: ay + 34, stroke: '#1e63d6', 'stroke-width': 5 }), V.s('text', { x: ap(400), y: ay + 60, 'font-size': 18, 'font-weight': 900, fill: '#1e63d6', 'text-anchor': 'middle' }, 'threshold 400'));
    adc.appendChild(thr);
    svg.appendChild(adc);
    const verdict = V.card(root, { x: 780, y: 430, w: 460, icon: '✅', title: '675 > 400 → movement!', text: 'Rock solid. This topic = <b>logic levels</b>.', color: '#2e9e4f', size: 18 });
    return (t) => {
      V.fade(ax, V.p(t, 0.3, 0.5));
      V.fade(zoneHi, V.p(t, T.s(1) + 4.5, 0.5)); V.fade(zoneMid, V.p(t, T.s(1) + 6, 0.5));
      V.fade(pirLine, V.p(t, T.s(1) + 1.2, 0.5));
      V.pop(whisper, V.p(t, T.s(2), 0.5));
      V.fade(adc, V.p(t, T.s(3), 0.5));
      fill.setAttribute('width', (V.pe(t, T.s(3) + 3, 1.5) * (ap(675) - ax0)).toFixed(1));
      V.fade(val, V.p(t, T.s(3) + 4.5, 0.4));
      V.fade(thr, V.p(t, T.s(4) + 0.5, 0.4));
      V.pop(verdict, V.p(t, T.s(4) + 2, 0.5));
    };
  },
});

defineScene({
  id: 'step3e', part: '3 · Build', step: 'Step 3 of 8', title: 'PIR: test',
  lines: [
    'Test time. Plug in, and then wait sixty seconds. A PIR needs to warm up, and gives random output at first.',
    'Now type raw. Sit very still: pir_raw stays around zero. Wave your hand: it jumps to about 650 to 700.',
    'If it stays high for minutes, the time delay knob is not at minimum. If it flickers randomly, wait a bit longer, point it away from you, or turn the sensitivity down.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const b = bench(svg, { upto: 3 });
    const view = camBox(900, 330, 560);
    const pc = { x: 1064, y: 290 };
    const hand = V.emoji(pc.x - 130, pc.y - 10, '👋', 52);
    b.top.appendChild(hand);
    const warm = V.box({ left: '40px', top: '40px', width: '520px', background: '#1d2b3a', color: '#fff', borderRadius: '16px', padding: '16px 22px', boxSizing: 'border-box' });
    const wTxt = V.h('div', { style: { fontSize: '26px', fontWeight: 900 } }, '');
    const wBar = V.h('div', { style: { height: '14px', background: '#f57c00', borderRadius: '7px', marginTop: '10px', width: '0%' } });
    warm.appendChild(wTxt); warm.appendChild(wBar);
    root.appendChild(warm);
    const mon = V.term(root, { x: 40, y: 170, w: 600, h: 370, kind: 'serial', size: 13.5 });
    const t1 = mon.type(T.s(1) + 0.8, 'raw');
    mon.out(t1, '[cmd] raw');
    for (let i = 0; i < 6; i++) mon.out(t1 + 0.1 + i * 0.1, RAW(jit(1, 1, i), jit(455, 4, i)));
    const t2 = mon.type(T.s(1) + 4.2, 'raw');
    mon.out(t2, '[cmd] raw');
    for (let i = 0; i < 8; i++) mon.out(t2 + 0.1 + i * 0.1, RAW(jit(684, 16, i), jit(452, 4, i)));
    const tips = V.card(root, { x: 660, y: 350, w: 580, icon: '🔧', title: 'Troubleshooting', text: 'HIGH for minutes → time knob not at minimum.<br>Random flicker → wait longer, point it away, lower the sensitivity.', color: '#e53935', size: 16 });
    return (t) => {
      camera(svg, t, [[0, FULL], [1.2, view]]);
      const warmP = V.p(t, T.s(0) + 2, 4.5);
      wTxt.textContent = warmP < 1 ? `PIR warming up… ${Math.ceil(60 * (1 - warmP))} s` : 'Ready ✓';
      wBar.style.width = (warmP * 100).toFixed(1) + '%';
      V.fade(warm, V.p(t, T.s(0) + 1.5, 0.4));
      V.fade(mon.el, V.p(t, T.s(1), 0.4));
      mon.update(t);
      const waving = t > T.s(1) + 4 && t < T.s(2);
      V.fade(hand, waving ? 1 : 0);
      hand.setAttribute('transform', `rotate(${(Math.sin(t * 9) * 18).toFixed(1)} ${pc.x - 130} ${pc.y - 10})`);
      V.pop(tips, V.p(t, T.s(2), 0.5));
      b.uno.power(t > T.s(0) + 1.5);
      if (t > T.s(0) + 1.5) b.uno.matrix.set(V.blinkFace(t));
    };
  },
});

// Step 4 --------------------------------------------------------------------------------------
defineScene({
  id: 'step4a', part: '3 · Build', step: 'Step 4 of 8', title: 'Buttons: pull-up and bounce',
  lines: [
    'Step four: the yes and no buttons.',
    'We use a trick called a pull-up. Inside the Arduino, a resistor gently holds the pin at five volts, like a spring holding a gate open.',
    'So when nobody presses, the pin reads HIGH. Pressing the button connects the pin to ground, and it reads LOW.',
    'Pressed means LOW. It looks backwards, but it saves us a resistor.',
    'Buttons also bounce. For a few milliseconds, the metal contacts chatter on and off. The firmware waits forty milliseconds until they settle down. That’s called debouncing.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const X = 220, g = V.s('g');
    g.appendChild(V.s('rect', { x: 70, y: 30, width: 300, height: 290, rx: 16, fill: '#e0f2f1', stroke: '#0f8a8f', 'stroke-width': 3, 'stroke-dasharray': '10 7' }));
    g.appendChild(V.s('text', { x: 90, y: 60, 'font-size': 18, 'font-weight': 900, fill: '#0f8a8f' }, 'inside the Arduino'));
    g.appendChild(V.s('text', { x: X, y: 96, 'font-size': 22, 'font-weight': 900, fill: '#e53935', 'text-anchor': 'middle' }, '5 V'));
    g.appendChild(V.s('line', { x1: X, y1: 104, x2: X, y2: 130, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('rect', { x: X - 18, y: 130, width: 36, height: 90, rx: 4, fill: '#fff', stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('text', { x: X + 30, y: 182, 'font-size': 17, 'font-weight': 800, fill: '#44546a' }, 'pull-up'));
    g.appendChild(V.s('line', { x1: X, y1: 220, x2: X, y2: 300, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('circle', { cx: X, cy: 270, r: 7, fill: '#1d2b3a' }));
    g.appendChild(V.s('line', { x1: X, y1: 270, x2: 120, y2: 270, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('text', { x: 110, y: 262, 'font-size': 22, 'font-weight': 900, fill: '#2e9e4f', 'text-anchor': 'end' }, 'D2'));
    g.appendChild(V.s('line', { x1: X, y1: 300, x2: X, y2: 380, stroke: '#1d2b3a', 'stroke-width': 4 }));
    // switch
    g.appendChild(V.s('circle', { cx: X, cy: 380, r: 5, fill: '#1d2b3a' }));
    g.appendChild(V.s('circle', { cx: X, cy: 440, r: 5, fill: '#1d2b3a' }));
    const lever = V.s('line', { x1: X, y1: 380, x2: X + 44, y2: 432, stroke: '#2e9e4f', 'stroke-width': 5, 'stroke-linecap': 'round' });
    g.appendChild(lever);
    g.appendChild(V.s('text', { x: X + 56, y: 418, 'font-size': 18, 'font-weight': 900, fill: '#2e9e4f' }, 'button'));
    g.appendChild(V.s('line', { x1: X, y1: 440, x2: X, y2: 470, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('line', { x1: X - 24, y1: 470, x2: X + 24, y2: 470, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('line', { x1: X - 14, y1: 480, x2: X + 14, y2: 480, stroke: '#1d2b3a', 'stroke-width': 4 }));
    g.appendChild(V.s('text', { x: X, y: 510, 'font-size': 20, 'font-weight': 900, fill: '#1e63d6', 'text-anchor': 'middle' }, 'GND'));
    svg.appendChild(g);
    const state = V.box({ left: '40px', top: '400px', fontSize: '28px', fontWeight: 900, color: '#fff', borderRadius: '14px', padding: '8px 16px', fontFamily: 'JetBrains Mono' }, '');
    root.appendChild(state);
    const spring = V.card(root, { x: 470, y: 24, w: 380, icon: '🌀', title: 'A spring holds the gate open', text: 'Nobody presses → pin = <b>HIGH</b>.<br>Press → pin to ground = <b>LOW</b>.', color: '#0f8a8f', size: 17 });
    const back = V.card(root, { x: 870, y: 24, w: 370, icon: '🙃', title: 'Pressed = LOW', text: 'Looks backwards, but saves a resistor.', color: '#f57c00', size: 17 });
    // bounce plot
    const plot = V.s('g');
    const px0 = 480, px1 = 1230, pyH = 300, pyL = 430;
    plot.appendChild(V.s('text', { x: px0, y: 236, 'font-size': 20, 'font-weight': 900, fill: '#1d2b3a' }, 'Voltage on D2 when you press (zoomed in):'));
    const d = `M${px0},${pyH} L620,${pyH} L624,${pyL} L630,${pyH} L636,${pyL} L641,${pyH + 30} L648,${pyL} L653,${pyH + 60} L660,${pyL} L${px1},${pyL}`;
    const wave = V.s('path', { d, fill: 'none', stroke: '#2e9e4f', 'stroke-width': 4, 'stroke-linejoin': 'round' });
    plot.appendChild(wave);
    plot.appendChild(V.s('text', { x: px0 - 8, y: pyH + 6, 'font-size': 15, 'font-weight': 800, fill: '#5b6b7b', 'text-anchor': 'end' }, 'HIGH'));
    plot.appendChild(V.s('text', { x: px0 - 8, y: pyL + 6, 'font-size': 15, 'font-weight': 800, fill: '#5b6b7b', 'text-anchor': 'end' }, 'LOW'));
    const wait = V.s('g', {}, V.s('rect', { x: 620, y: 280, width: 240, height: 170, fill: '#ffcc80', opacity: 0.35 }), V.s('text', { x: 740, y: 478, 'font-size': 18, 'font-weight': 900, fill: '#e65100', 'text-anchor': 'middle' }, 'wait 40 ms = debounce'), V.s('text', { x: 668, y: 300, 'font-size': 16, 'font-weight': 800, fill: '#e65100' }, 'chatter!'));
    plot.appendChild(wait);
    svg.appendChild(plot);
    return (t) => {
      V.fade(g, V.p(t, T.s(1), 0.5));
      V.pop(spring, V.p(t, T.s(1) + 3, 0.5));
      const pressed = t > T.s(2) + 3 && (Math.floor((t - T.s(2) - 3) / 1.6) % 2 === 0) && t < T.s(4);
      lever.setAttribute('x2', pressed ? X + 2 : X + 44); lever.setAttribute('y2', pressed ? 440 : 432);
      state.textContent = pressed ? 'D2 reads LOW' : 'D2 reads HIGH';
      state.style.background = pressed ? '#1e63d6' : '#e53935';
      V.fade(state, V.win(t, T.s(2), T.s(4) + 0.4));
      V.pop(back, V.p(t, T.s(3), 0.5));
      V.fade(plot, V.p(t, T.s(4), 0.5));
      V.drawPath(wave, V.p(t, T.s(4) + 0.5, 3));
      V.fade(wait, V.p(t, T.s(4) + 4.5, 0.5));
    };
  },
});

defineScene({
  id: 'step4b', part: '3 · Build', step: 'Step 4 of 8', title: 'Buttons: the four-leg puzzle',
  lines: [
    "A push button has four legs, and here's the tricky part. The legs come in two pairs that are always connected, pressed or not.",
    'If you pick two legs from the same pair, the button looks pressed all the time.',
    'The trick that always works: put the button across the middle gap, and use two diagonally opposite legs.',
    'Diagonal legs are only connected when you press. And that works whichever way round you placed the button.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const btn = (cx, cy, rot) => {
      const g = V.s('g', { transform: `translate(${cx} ${cy}) rotate(${rot})` });
      [[-70, -95], [70, -95], [-70, 95], [70, 95]].forEach(([x, y]) => g.appendChild(V.s('rect', { x: x - 9, y: y < 0 ? y : y - 30, width: 18, height: 30, fill: '#b9c1c7' })));
      g.appendChild(V.s('rect', { x: -95, y: -75, width: 190, height: 150, rx: 12, fill: '#2d2d2d' }));
      g.appendChild(V.s('circle', { cx: 0, cy: 0, r: 52, fill: '#3b3b3b', stroke: '#555', 'stroke-width': 3 }));
      const pairA = V.s('line', { x1: -70, y1: -90, x2: -70, y2: 90, stroke: '#ff9800', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0 });
      const pairB = V.s('line', { x1: 70, y1: -90, x2: 70, y2: 90, stroke: '#ff9800', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0 });
      const link = V.s('line', { x1: -70, y1: 0, x2: 70, y2: 0, stroke: '#2e9e4f', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0 });
      const diag = V.s('g', { opacity: 0 }, V.s('circle', { cx: -70, cy: -100, r: 16, fill: 'none', stroke: '#2e9e4f', 'stroke-width': 5 }), V.s('circle', { cx: 70, cy: 100, r: 16, fill: 'none', stroke: '#2e9e4f', 'stroke-width': 5 }));
      const same = V.s('g', { opacity: 0 }, V.s('circle', { cx: -70, cy: -100, r: 16, fill: 'none', stroke: '#e53935', 'stroke-width': 5 }), V.s('circle', { cx: -70, cy: 100, r: 16, fill: 'none', stroke: '#e53935', 'stroke-width': 5 }));
      g.appendChild(pairA); g.appendChild(pairB); g.appendChild(link); g.appendChild(diag); g.appendChild(same);
      svg.appendChild(g);
      return { g, pairA, pairB, link, diag, same };
    };
    const b1 = btn(330, 290, 0), b2 = btn(900, 290, 90);
    const l1 = V.s('text', { x: 330, y: 540, 'font-size': 22, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1d2b3a' }, 'orange = always connected');
    const l2 = V.s('text', { x: 900, y: 540, 'font-size': 22, 'font-weight': 900, 'text-anchor': 'middle', fill: '#1d2b3a' }, 'turned 90°: diagonal still works');
    svg.appendChild(l1); svg.appendChild(l2);
    const bad = V.box({ left: '470px', top: '24px', fontSize: '22px', fontWeight: 900, color: '#fff', background: '#e53935', borderRadius: '14px', padding: '8px 16px' }, '✗ same pair = "always pressed"');
    const good = V.box({ left: '470px', top: '24px', fontSize: '22px', fontWeight: 900, color: '#fff', background: '#2e9e4f', borderRadius: '14px', padding: '8px 16px' }, '✓ diagonal legs = only when pressed');
    root.appendChild(bad); root.appendChild(good);
    return (t) => {
      V.fade(b1.g, V.p(t, 0.2, 0.5));
      [b1, b2].forEach((b) => { b.pairA.setAttribute('opacity', V.p(t, T.s(0) + 3, 0.5)); b.pairB.setAttribute('opacity', V.p(t, T.s(0) + 3, 0.5)); });
      V.fade(l1, V.p(t, T.s(0) + 3.5, 0.4));
      b1.same.setAttribute('opacity', V.win(t, T.s(1), T.s(2)));
      V.fade(bad, V.win(t, T.s(1) + 0.5, T.s(2)));
      b1.diag.setAttribute('opacity', V.p(t, T.s(2) + 2, 0.4));
      V.fade(good, V.p(t, T.s(2) + 2.5, 0.4));
      const press = t > T.s(3) && Math.floor((t - T.s(3)) / 1.2) % 2 === 0;
      b1.link.setAttribute('opacity', press ? 1 : 0); b2.link.setAttribute('opacity', press ? 1 : 0);
      V.fade(b2.g, V.p(t, T.s(3) + 2, 0.5)); b2.diag.setAttribute('opacity', V.p(t, T.s(3) + 2.5, 0.4));
      V.fade(l2, V.p(t, T.s(3) + 2.5, 0.4));
    };
  },
});

defineScene({
  id: 'step4c', part: '3 · Build', step: 'Step 4 of 8', title: 'Buttons: wiring',
  lines: [
    'Place the green button across the gap, near column 12.',
    "Connect the column of its top-left leg to pin D2 on the Arduino.",
    'And connect the column of the diagonal leg, at the bottom right, to the blue minus rail.',
    'Do the same with the red button, near column 18: top-left column to pin D3, and bottom-right column to the minus rail.',
    'Then press the coloured caps on: green for yes, red for no.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const b = bench(svg, { upto: 3 });
    const ts = 9;
    const d2 = b.uno.pin('D2'), d3 = b.uno.pin('D3');
    const tl = b.bb.hole(11, 'e'), br = b.bb.hole(13, 'f'), tl2 = b.bb.hole(17, 'e'), br2 = b.bb.hole(19, 'f');
    const rs = [b.ring(tl.x, tl.y, '#2e9e4f', 5), b.ring(d2.x, d2.y, '#2e9e4f', 6), b.ring(br.x, br.y, '#2e9e4f', 5), b.ring(tl2.x, tl2.y, '#8e44ad', 5), b.ring(d3.x, d3.y, '#8e44ad', 6), b.ring(br2.x, br2.y, '#8e44ad', 5)];
    const gap = b.tag(640, 278, 'across the gap', { dx: -40, dy: -84, size: ts, color: '#f57c00' });
    const tD2 = b.tag(d2.x, d2.y, 'D2', { dy: 30, dx: 8, size: ts, color: '#2e9e4f' });
    const tD3 = b.tag(d3.x, d3.y, 'D3', { dy: 30, dx: -8, size: ts, color: '#8e44ad' });
    const tYes = b.tag(b.it.btnGApi.cx, b.it.btnGApi.cy, 'YES', { dy: 0, dx: 0, size: ts, color: '#2e9e4f', line: false });
    const tNo = b.tag(b.it.btnRApi.cx, b.it.btnRApi.cy, 'NO', { dy: 0, dx: 0, size: ts, color: '#e53935', line: false });
    return (t) => {
      camera(svg, t, [[0, FULL], [1.4, BENCH_VIEWS[4]]]);
      b.set('btnG', V.p(t, T.s(0) + 1.2, 0.6)); V.fade(gap, V.win(t, T.s(0) + 1.6, T.s(1) + 0.5));
      rs[0].set(t, t > T.s(1) + 0.3 && t < T.s(1) + 2.5); b.set('wD2', V.pe(t, T.s(1) + 1, 1.6));
      rs[1].set(t, t > T.s(1) + 2.6 && t < T.s(2) + 0.5); V.fade(tD2, V.p(t, T.s(1) + 2.6, 0.4));
      rs[2].set(t, t > T.s(2) + 0.5 && t < T.s(3)); b.set('wGG', V.pe(t, T.s(2) + 2, 0.8));
      b.set('btnR', V.p(t, T.s(3) + 0.5, 0.6));
      rs[3].set(t, t > T.s(3) + 2 && t < T.s(3) + 4); b.set('wD3', V.pe(t, T.s(3) + 2.4, 1.6));
      rs[4].set(t, t > T.s(3) + 3.8 && t < T.s(4)); V.fade(tD3, V.p(t, T.s(3) + 3.8, 0.4));
      rs[5].set(t, t > T.s(3) + 5 && t < T.s(4)); b.set('wGR', V.pe(t, T.s(3) + 5.5, 0.8));
      V.fade(tYes, V.p(t, T.s(4) + 1, 0.4)); V.fade(tNo, V.p(t, T.s(4) + 1.8, 0.4));
    };
  },
});

defineScene({
  id: 'step4d', part: '3 · Build', step: 'Step 4 of 8', title: 'Buttons: test',
  lines: [
    'Quick prediction: while you hold the green button, what should the raw output show for yes?',
    { pause: 4, cap: 'Pause and predict' },
    'Type raw, and hold green. It shows: yes equals pressed.',
    'Even better: the face shows a check mark for green, and a cross for red. And the Serial Monitor prints: button, yes.',
    'If a button looks pressed all the time, you used two always-connected legs. Move a wire to the diagonal leg.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    svg.appendChild(V.s('rect', { x: 60, y: 40, width: 480, height: 330, rx: 26, fill: '#0f8a8f' }));
    const m = V.matrix(118, 88, 33, 11);
    svg.appendChild(m.g);
    const bG = V.s('g', {}, V.s('rect', { x: 120, y: 400, width: 120, height: 120, rx: 14, fill: '#2d2d2d' }), V.s('circle', { cx: 180, cy: 460, r: 44, fill: '#2e9e4f' }));
    const bR = V.s('g', {}, V.s('rect', { x: 360, y: 400, width: 120, height: 120, rx: 14, fill: '#2d2d2d' }), V.s('circle', { cx: 420, cy: 460, r: 44, fill: '#e53935' }));
    const pG = V.s('circle', { cx: 180, cy: 460, r: 44, fill: '#000', opacity: 0 }), pR = V.s('circle', { cx: 420, cy: 460, r: 44, fill: '#000', opacity: 0 });
    svg.appendChild(bG); svg.appendChild(bR); svg.appendChild(pG); svg.appendChild(pR);
    const mon = V.term(root, { x: 600, y: 20, w: 640, h: 390, kind: 'serial', size: 13.5 });
    const tr = mon.type(T.s(2) + 0.4, 'raw');
    mon.out(tr, '[cmd] raw');
    for (let i = 0; i < 8; i++) mon.out(tr + 0.1 + i * 0.12, RAW(jit(1, 1, i), jit(455, 4, i), i >= 2 ? 'pressed' : '-'));
    const yesT = T.s(3) + 3.5, noT = T.s(3) + 6.2;
    mon.out(yesT, ['[button] yes', '[queue] events waiting: 2'], 0.05);
    mon.out(noT, ['[button] no', '[queue] events waiting: 3'], 0.05);
    const q = V.box({ left: '640px', top: '150px', fontSize: '44px', fontWeight: 900, color: '#f57c00', width: '560px', textAlign: 'center' }, 'yes = ???');
    root.appendChild(q);
    const fix = V.card(root, { x: 600, y: 430, w: 640, icon: '🔧', title: 'Always "pressed"?', text: 'You used two always-connected legs. Move a wire to the diagonal leg.', color: '#e53935', size: 16 });
    const qNote = V.card(root, { x: 600, y: 430, w: 640, icon: '📨', title: '[queue] = saved for later', text: 'Offline test mode: presses wait in a queue of 8 until Robin is online.', color: '#7b8794', size: 16 });
    return (t) => {
      const holdG = (t > T.s(2) + 0.6 && t < T.s(3)) || (t > yesT - 0.2 && t < yesT + 0.4);
      const holdR = t > noT - 0.2 && t < noT + 0.4;
      pG.setAttribute('opacity', holdG ? 0.3 : 0); pR.setAttribute('opacity', holdR ? 0.3 : 0);
      let face = V.blinkFace(t);
      if (t > yesT && t < yesT + 1.5) face = 'yes';
      if (t > noT && t < noT + 1.5) face = 'no';
      m.set(face);
      V.fade(q, V.win(t, T.s(0) + 1, T.s(2)));
      V.fade(mon.el, V.p(t, 0.3, 0.4));
      mon.update(t);
      V.fade(qNote, V.win(t, yesT + 0.5, T.s(4)));
      V.pop(fix, V.p(t, T.s(4), 0.5));
    };
  },
});
