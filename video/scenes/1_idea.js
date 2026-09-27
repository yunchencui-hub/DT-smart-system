/* Part 1: welcome + the idea (who Robin is for, what it adds to Tessa, the big picture). */
'use strict';

defineScene({
  id: 'title', part: 'Welcome', title: 'Robin: a routine-aware care robot',
  lines: [
    'Hi partner! In this video we build Robin, our little care robot, from a box of parts to a working helper.',
    "First, a short tour of the idea. Then we build Robin step by step, with a test after every step. At the end, you'll see the finished robot at work.",
    "I'll explain everything like you're five, so no experience is needed. Let's go!",
  ],
  build(root, T) {
    const svg = V.svg(root);
    const bot = V.robot(330, 300, 1.75);
    svg.appendChild(bot.g);
    const h1 = V.box({ left: '610px', top: '60px', fontSize: '104px', fontWeight: 900, color: '#0f8a8f', letterSpacing: '-2px' }, 'Robin');
    const h2 = V.box({ left: '616px', top: '182px', fontSize: '34px', fontWeight: 800, color: '#1d2b3a' }, 'a routine-aware care robot');
    const h3 = V.box({ left: '616px', top: '230px', fontSize: '22px', fontWeight: 700, color: '#5b6b7b' }, "Build guide · explained like you're five");
    root.appendChild(h1); root.appendChild(h2); root.appendChild(h3);
    const chips = [['1', 'The idea', '#0f8a8f'], ['2', 'Build it, step by step', '#f57c00'], ['3', 'Robin at work', '#7e57c2']].map(([n, txt, c], i) => {
      const el = V.box({ left: '616px', top: 300 + i * 66 + 'px', fontSize: '25px', fontWeight: 900, color: '#fff', background: c, borderRadius: '32px', padding: '10px 26px 10px 12px', display: 'flex', alignItems: 'center', gap: '14px' },
        V.h('span', { style: { background: '#fff', color: c, borderRadius: '50%', width: '34px', height: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, n), txt);
      root.appendChild(el);
      return el;
    });
    const tag = V.box({ left: '616px', top: '512px', fontSize: '16px', fontWeight: 700, color: '#7b8794' }, 'Digital Designs and Applications · inspired by Tinybots’ Tessa');
    root.appendChild(tag);
    return (t) => {
      bot.matrix.set(t > T.s(2) && t < T.e(2) ? 'talk' : V.blinkFace(t));
      V.rise(h1, V.p(t, 0.2, 0.7)); V.rise(h2, V.p(t, 0.6, 0.6)); V.rise(h3, V.p(t, 0.9, 0.6));
      chips.forEach((c, i) => V.rise(c, V.p(t, T.s(1) + 0.3 + i * 1.3, 0.5)));
      V.fade(tag, V.p(t, 1.4, 0.8));
    };
  },
});

defineScene({
  id: 'persona', part: '1 · The idea', title: 'Who is Robin for?',
  lines: [
    'Meet Mrs. Jansen. She is 82, lives alone in Eindhoven, and has early-stage dementia.',
    'Her daughter lives 40 kilometres away, and visits twice a week.',
    'She worries about a few things: forgotten medicine, not drinking enough on hot days, and wandering around at night.',
    'And the biggest worry of all: what if Mum falls, and nobody knows until Saturday?',
  ],
  build(root, T) {
    const svg = V.svg(root);
    const house = V.s('g');
    house.appendChild(V.s('polygon', { points: '60,210 230,90 400,210', fill: '#c0655b' }));
    house.appendChild(V.s('rect', { x: 80, y: 205, width: 300, height: 270, fill: '#fff3e0', stroke: '#d7b99a', 'stroke-width': 3 }));
    house.appendChild(V.s('rect', { x: 290, y: 250, width: 64, height: 60, fill: '#bfe3f5', stroke: '#8d7a63', 'stroke-width': 4 }));
    house.appendChild(V.person(205, 300, 2.0, { shirt: '#7e57c2' }));
    svg.appendChild(house);
    const name = V.tag(230, 520, 'Mrs. Jansen, 82 · lives alone', { dy: 0, line: false, color: '#7e57c2', size: 18 });
    svg.appendChild(name);
    const daughter = V.s('g', {}, V.person(1150, 200, 1.9, { hair: '#6d4c41', shirt: '#0f8a8f', bun: false }));
    svg.appendChild(daughter);
    const dline = V.s('path', { d: 'M400,150 Q760,40 1100,170', fill: 'none', stroke: '#0f8a8f', 'stroke-width': 4, 'stroke-dasharray': '10 8' });
    svg.appendChild(dline);
    const km = V.tag(760, 90, '40 km · visits twice a week', { dy: 0, line: false, color: '#0f8a8f', size: 18 });
    svg.appendChild(km);
    const worries = [
      ['💊', 'Forgotten medicine', 470, 190], ['💧', 'Not drinking on hot days', 470, 290], ['🌙', 'Wandering at night', 470, 390],
    ].map(([ic, txt, x, y]) => V.card(root, { x, y, w: 380, icon: ic, title: txt, color: '#f57c00' }));
    const fall = V.card(root, { x: 880, y: 330, w: 360, icon: '🆘', title: 'A fall… and nobody knows until Saturday?', color: '#e53935', size: 20 });
    return (t) => {
      V.fade(house, V.p(t, 0, 0.6));
      V.fade(name, V.p(t, 0.6, 0.5));
      V.fade(daughter, V.p(t, T.s(1), 0.5));
      V.fade(dline, V.p(t, T.s(1) + 0.2, 0.8));
      V.fade(km, V.p(t, T.s(1) + 1, 0.5));
      worries.forEach((c, i) => V.rise(c, V.p(t, T.s(2) + 2.2 + i * 1.5, 0.5)));
      V.pop(fall, V.p(t, T.s(3) + 0.8, 0.6));
    };
  },
});

defineScene({
  id: 'tessa', part: '1 · The idea', title: 'Tessa, and what Robin adds',
  lines: [
    'Tessa, a real robot made by Tinybots, already helps people like her.',
    'It speaks reminders that the family types in an app, and it asks simple yes or no questions.',
    'But Tessa speaks at a fixed time, even to an empty room. And it has no idea whether today is a normal day.',
    "Robin keeps Tessa's kindness, and adds two senses and a memory. That gives it four superpowers.",
    'One: Robin only speaks when someone is actually in the room.',
    'Two: it learns the normal daily rhythm, from its own sensors.',
    'Three: when something looks unusual, it first asks: are you alright? Only a no, or silence, alerts the family.',
    'Four: it checks the weather, and suggests extra water on hot days.',
  ],
  build(root, T) {
    const svg = V.svg(root);
    // a simple, generic tabletop-robot silhouette standing in for Tessa
    const tessa = V.s('g', { transform: 'translate(150 150)' });
    tessa.appendChild(V.s('path', { d: 'M-60,150 Q-70,20 0,0 Q70,20 60,150 Z', fill: '#e7dccb', stroke: '#b9a88e', 'stroke-width': 3 }));
    tessa.appendChild(V.s('rect', { x: -44, y: 44, width: 88, height: 46, rx: 18, fill: '#2b2b2b' }));
    tessa.appendChild(V.s('circle', { cx: -16, cy: 67, r: 8, fill: '#9be7ff' }));
    tessa.appendChild(V.s('circle', { cx: 16, cy: 67, r: 8, fill: '#9be7ff' }));
    svg.appendChild(tessa);
    const tname = V.box({ left: '70px', top: '330px', fontSize: '24px', fontWeight: 900 }, 'Tessa', V.h('div', { style: { fontSize: '15px', color: '#7b8794', fontWeight: 700 } }, 'by Tinybots'));
    root.appendChild(tname);
    const tl = V.list(root, [
      { icon: '✅', text: 'Speaks reminders from the family’s app' },
      { icon: '✅', text: 'Asks yes / no questions' },
      { icon: '❌', text: 'Fixed time, even to an empty room' },
      { icon: '❌', text: 'Doesn’t know what a normal day is' },
    ], { x: 250, y: 150, w: 360, size: 20, gap: 16 });
    const rh = V.heading(root, 'Robin = Tessa + 2 senses + a memory', { x: 660, y: 28, size: 28, color: '#0f8a8f' });
    const cards = [
      ['👀', 'Speaks only when someone is there', 'The PIR sees that someone is in the room.'],
      ['📈', 'Learns the normal day', 'From its own motion and light data.'],
      ['🙋', 'Asks first, alerts second', '“Are you alright?” A no, or silence, alerts the family.'],
      ['☀️', 'Knows the weather', 'Extra water on hot days.'],
    ].map(([ic, ti, tx], i) => V.card(root, { x: 660 + (i % 2) * 300, y: 100 + Math.floor(i / 2) * 200, w: 280, h: 180, icon: ic, title: ti, text: tx, color: ['#0f8a8f', '#7e57c2', '#f57c00', '#f2b705'][i] }));
    return (t) => {
      V.fade(tessa, V.p(t, 0, 0.5)); V.fade(tname, V.p(t, 0.2, 0.5));
      V.rise(tl[0], V.p(t, T.s(1), 0.4)); V.rise(tl[1], V.p(t, T.s(1) + 2.2, 0.4));
      V.rise(tl[2], V.p(t, T.s(2), 0.4)); V.rise(tl[3], V.p(t, T.s(2) + 3.2, 0.4));
      V.rise(rh, V.p(t, T.s(3), 0.5));
      cards.forEach((c, i) => V.pop(c, V.p(t, T.s(4 + i), 0.5)));
    };
  },
});

defineScene({
  id: 'bodyparts', part: '1 · The idea', title: "Robin's body",
  lines: [
    "Let's look at Robin as if it had a body.",
    'The Arduino is the brain stem and the face. It reads the senses, and shows expressions on its tiny grid of LEDs.',
    'The motion sensor, called a PIR, is the eye for movement. The light sensor, called an LDR, is the eye for brightness.',
    'Two buttons are the ears for answers: green means yes, red means no.',
    'The voice module and the speaker are the mouth. The breadboard and wires are the nerves. And the box is the skin.',
    "The real thinking happens on your laptop. That's Robin's big brain.",
  ],
  build(root, T) {
    const svg = V.svg(root);
    const cx = 560, cy = 300, s = 1.9;
    const bot = V.robot(cx, cy, s);
    svg.appendChild(bot.g);
    const at = (px, py) => [cx + s * (px - 73), cy + s * (py - 88)];
    const mk = (pt, text, dx, dy, color) => { const g = V.tag(pt[0], pt[1], text, { dx, dy, color, size: 17 }); svg.appendChild(g); return g; };
    const tags = [
      [1, mk(at(63, 99), 'Arduino = brain stem + face', -330, 30, '#0f8a8f')],
      [2, mk(at(63, 34), 'PIR = eye for movement', -300, -40, '#2f7d46')],
      [2.5, mk(at(98, -8), 'LDR = eye for light', 250, -60, '#e2553f')],
      [3, mk(at(52, -7.5), 'buttons = ears for answers', -330, -40, '#2e9e4f')],
      [4, mk(at(136, 125), 'speaker = mouth', 230, 40, '#1f3b70')],
      [4.4, mk(at(70, -10), 'breadboard + wires = nerves', 170, -84, '#8a8272')],
      [4.8, mk(at(140, 60), 'box = skin', 200, -10, '#5f666d')],
    ];
    const lap = V.laptop(1040, 330, 1.05);
    svg.appendChild(lap.g);
    lap.screen.appendChild(V.emoji(82, 50, '🧠', 50));
    const lapTag = V.tag(1145, 480, 'laptop = the big brain', { dy: 0, line: false, color: '#7e57c2', size: 17 });
    svg.appendChild(lapTag);
    const link = V.s('path', { d: 'M780,300 Q900,250 1040,360', fill: 'none', stroke: '#7e57c2', 'stroke-width': 3, 'stroke-dasharray': '8 7' });
    svg.appendChild(link);
    return (t) => {
      bot.matrix.set(V.blinkFace(t));
      const starts = { 1: T.s(1) + 0.4, 2: T.s(2) + 0.4, 2.5: T.s(2) + 4.2, 3: T.s(3) + 0.4, 4: T.s(4) + 0.3, 4.4: T.s(4) + 3.4, 4.8: T.s(4) + 6.4 };
      tags.forEach(([k, g]) => V.fade(g, V.p(t, starts[k], 0.4)));
      V.fade(lap.g, V.p(t, T.s(5), 0.5)); V.fade(lapTag, V.p(t, T.s(5) + 0.4, 0.5));
      V.fade(link, V.p(t, T.s(5) + 0.3, 0.6));
    };
  },
});

defineScene({
  id: 'bigpicture', part: '1 · The idea', title: 'The big picture',
  lines: [
    'Here is the big picture.',
    'Ten times per second, Robin measures. Every two seconds, it sends a short summary over WiFi.',
    'The messages arrive at a post office program on the laptop, called an MQTT broker.',
    'The laptop saves everything in a small database, learns what a normal day looks like, and decides what to do.',
    "Then it sends commands back to Robin: say this sentence, show this face. And when help is needed, it pushes an alert to the family's phone.",
    "So Robin's own job is simple: measure, report, and obey. That keeps the robot cheap, and we can change its behaviour without reprogramming it.",
  ],
  build(root, T) {
    const svg = V.svg(root);
    const bot = V.robot(120, 250, 0.95);
    svg.appendChild(bot.g);
    const lapBox = V.s('rect', { x: 290, y: 70, width: 700, height: 390, rx: 24, fill: '#eef6f6', stroke: '#0f8a8f', 'stroke-width': 3, 'stroke-dasharray': '12 8' });
    svg.appendChild(lapBox);
    const lapLbl = V.s('text', { x: 312, y: 104, 'font-size': 20, 'font-weight': 900, fill: '#0f8a8f' }, '💻 Laptop = edge server');
    svg.appendChild(lapLbl);
    const node = (x, y, icon, title, sub, color) => {
      const g = V.s('g');
      g.appendChild(V.s('rect', { x, y, width: 190, height: 84, rx: 16, fill: '#fff', stroke: color, 'stroke-width': 3 }));
      g.appendChild(V.s('text', { x: x + 28, y: y + 42, 'font-size': 30, 'text-anchor': 'middle', 'dominant-baseline': 'central', style: { fontFamily: 'Noto Color Emoji' } }, icon));
      g.appendChild(V.s('text', { x: x + 54, y: y + 36, 'font-size': 20, 'font-weight': 900, fill: '#1d2b3a' }, title));
      g.appendChild(V.s('text', { x: x + 54, y: y + 60, 'font-size': 14.5, 'font-weight': 700, fill: '#5b6b7b' }, sub));
      svg.appendChild(g);
      return g;
    };
    const nBroker = node(320, 130, '📮', 'Mosquitto', 'MQTT post office', '#0f8a8f');
    const nIngest = node(545, 130, '📥', 'Ingest', 'checks + stores', '#0f8a8f');
    const nDb = node(770, 130, '🗄️', 'SQLite', 'the memory', '#0f8a8f');
    const nModel = node(770, 330, '🌲', 'Model', 'learns normal', '#7e57c2');
    const nBrain = node(545, 330, '🧠', 'Brain', 'decides + acts', '#7e57c2');
    const nWeather = node(1060, 130, '☀️', 'Weather', 'Open-Meteo API', '#f2b705');
    const nPhone = node(1060, 400, '📱', 'Family', 'push alert', '#e53935');
    const arrow = (d, color = '#1d2b3a') => {
      const p = V.s('path', { d, fill: 'none', stroke: color, 'stroke-width': 4, 'stroke-linecap': 'round' });
      svg.appendChild(p);
      return p;
    };
    const aTele = arrow('M200,230 C250,210 270,180 320,172', '#0f8a8f');
    const aBI = arrow('M510,172 L545,172');
    const aID = arrow('M735,172 L770,172');
    const aWD = arrow('M1060,172 L960,172', '#f2b705');
    const aDM = arrow('M865,214 L865,330');
    const aMB = arrow('M770,372 L735,372');
    const aCmd = arrow('M545,392 C420,470 300,470 190,370', '#f57c00');
    const aPhone = arrow('M735,400 C850,470 960,470 1060,442', '#e53935');
    const lbl = (x, y, text, color) => { const e = V.s('text', { x, y, 'font-size': 16, 'font-weight': 900, fill: color, 'text-anchor': 'middle' }, text); svg.appendChild(e); return e; };
    const lTele = lbl(245, 172, 'every 2 s', '#0f8a8f');
    const lCmd = lbl(370, 492, 'say · ask · face', '#f57c00');
    const lPh = lbl(900, 492, 'alert', '#e53935');
    const dots = [aTele, aCmd, aPhone].map((p, i) => { const c = V.s('circle', { r: 7, fill: ['#0f8a8f', '#f57c00', '#e53935'][i] }); svg.appendChild(c); return c; });
    const job = V.card(root, { x: 36, y: 424, w: 250, icon: '🤖', title: 'Robin: measure, report, obey', color: '#0f8a8f', size: 16 });
    return (t) => {
      bot.matrix.set(V.blinkFace(t));
      V.fade(lapBox, V.p(t, T.s(2), 0.5)); V.fade(lapLbl, V.p(t, T.s(2), 0.5));
      V.drawPath(aTele, V.pe(t, T.s(1) + 1, 0.8)); V.fade(lTele, V.p(t, T.s(1) + 2, 0.4));
      V.fade(nBroker, V.p(t, T.s(2) + 0.3, 0.5));
      V.fade(nIngest, V.p(t, T.s(3), 0.4)); V.drawPath(aBI, V.p(t, T.s(3), 0.4));
      V.fade(nDb, V.p(t, T.s(3) + 0.6, 0.4)); V.drawPath(aID, V.p(t, T.s(3) + 0.6, 0.4));
      V.fade(nWeather, V.p(t, T.s(3) + 1.4, 0.4)); V.drawPath(aWD, V.p(t, T.s(3) + 1.4, 0.4));
      V.fade(nModel, V.p(t, T.s(3) + 3, 0.4)); V.drawPath(aDM, V.p(t, T.s(3) + 3, 0.5));
      V.fade(nBrain, V.p(t, T.s(3) + 5, 0.4)); V.drawPath(aMB, V.p(t, T.s(3) + 5, 0.4));
      V.drawPath(aCmd, V.pe(t, T.s(4) + 0.5, 1)); V.fade(lCmd, V.p(t, T.s(4) + 1.2, 0.4));
      V.fade(nPhone, V.p(t, T.s(4) + 4.5, 0.4)); V.drawPath(aPhone, V.pe(t, T.s(4) + 4.5, 1)); V.fade(lPh, V.p(t, T.s(4) + 5.2, 0.4));
      V.rise(job, V.p(t, T.s(5) + 0.5, 0.5));
      // travelling message dots
      [[aTele, T.s(1) + 2, 2], [aCmd, T.s(4) + 1.6, 2.4], [aPhone, T.s(4) + 5.6, 2.4]].forEach(([p, t0, per], i) => {
        if (t < t0) { V.fade(dots[i], 0); return; }
        if (!p._len) p._len = p.getTotalLength();
        const f = ((t - t0) % per) / per;
        const pt = p.getPointAtLength(f * p._len);
        dots[i].setAttribute('cx', pt.x.toFixed(1)); dots[i].setAttribute('cy', pt.y.toFixed(1));
        V.fade(dots[i], Math.min(1, f * 6, (1 - f) * 6));
      });
    };
  },
});
