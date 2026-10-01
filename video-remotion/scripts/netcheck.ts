// Automatic electrical check of the wiring the video shows (src/data/wiring.ts).
// It builds the circuit as nets (groups of things that are electrically connected) and asserts that
// nothing is shorted or reversed, for every button state and for both ways a 4-leg button can be wired
// inside. It also checks that the wiring, the on-screen tables and the order match docs/04, docs/03 and
// the firmware.   Usage: npx tsx scripts/netcheck.ts   (exit code 1 on any failure)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { End, ITEMS, Item, PINMAP_ROWS, WIRES_IN_ORDER, endName } from '../src/data/wiring';
import { Hole } from '../src/data/geom';
import { ORDER, ORDER_TOTAL } from '../src/script/order';
import { TROUBLE_ROWS } from '../src/script/scenes';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const results: { ok: boolean; msg: string }[] = [];
const check = (ok: boolean, msg: string) => results.push({ ok, msg });

// ---------- nodes
const holeNode = (h: Hole) => (h.r.length === 2 ? `RAIL${h.r}` : `${'abcde'.includes(h.r) ? 'T' : 'B'}${h.c}`);
const endNode = (e: End): string => {
  switch (e.kind) {
    case 'hole': return holeNode({ c: e.c, r: e.r });
    case 'uno': return `U:${e.pin}`;
    case 'pir': return `PIR:${e.pin}`;
    case 'grav': return `DFR:${e.pin}`; // the cable connects each socket to the same-named pin of the plug
    case 'voice': return `DFR:${e.pin}`;
    case 'spk': return `SPK:${e.pin}`;
  }
};

class Nets {
  parent = new Map<string, string>();
  find(a: string): string { if (!this.parent.has(a)) this.parent.set(a, a); const p = this.parent.get(a)!; if (p === a) return a; const r = this.find(p); this.parent.set(a, r); return r; }
  join(a: string, b: string) { this.parent.set(this.find(a), this.find(b)); }
  same(a: string, b: string) { return this.find(a) === this.find(b); }
}

type ButtonModel = 'columns' | 'rows'; // which leg pairs are always connected inside the button
type Edge = { id: string; a: string; b: string };

function build(model: ButtonModel, pressed: Set<string>) {
  const n = new Nets();
  // Arduino: all GND pins are one net. DFR0534: Gravity + / − are the same as header VCC / GND.
  n.join('U:GND', 'U:GND2'); n.join('U:GND', 'U:GNDT');
  n.join('DFR:+', 'DFR:VCC'); n.join('DFR:−', 'DFR:GND');
  const resistors: Edge[] = [];
  for (const it of ITEMS) {
    if (it.kind === 'wire') n.join(endNode(it.from), endNode(it.to));
    if (it.kind === 'ldr' || it.kind === 'resistor') resistors.push({ id: it.id, a: holeNode(it.legs.a), b: holeNode(it.legs.b) });
    if (it.kind === 'button') {
      const { tl, tr, bl, br } = it.legs;
      const [p1, p2] = model === 'columns' ? [[tl, bl], [tr, br]] : [[tl, tr], [bl, br]];
      n.join(holeNode(p1[0]), holeNode(p1[1]));
      n.join(holeNode(p2[0]), holeNode(p2[1]));
      if (pressed.has(it.id)) n.join(holeNode(p1[0]), holeNode(p2[0]));
    }
  }
  return { n, resistors };
}

const byId = <K extends Item['kind']>(id: string, kind: K) => {
  const it = ITEMS.find((i) => i.id === id);
  if (!it || it.kind !== kind) throw new Error(`missing ${kind} ${id}`);
  return it as Extract<Item, { kind: K }>;
};

// ---------- 1. electrical checks, for both button models and all 4 button states
const SIGNAL_PINS = ['A0', 'A1', 'D0', 'D1', 'D2', 'D3'];
for (const model of ['columns', 'rows'] as ButtonModel[]) {
  for (const pressedList of [[], ['btnG'], ['btnR'], ['btnG', 'btnR']]) {
    const pressed = new Set(pressedList);
    const { n, resistors } = build(model, pressed);
    const tag = `[buttons ${model}, pressed: ${pressedList.join('+') || 'none'}]`;
    const V5 = 'U:5V', G = 'U:GND';
    check(!n.same(V5, G), `${tag} 5V and GND are never connected (no short circuit)`);
    check(n.same(V5, 'RAIL+b') && n.same(G, 'RAIL-b'), `${tag} + rail = 5V, − rail = GND`);
    check(!n.same(V5, 'RAIL+t') && !n.same(G, 'RAIL-t') && !n.same(V5, 'RAIL-t') && !n.same(G, 'RAIL+t'), `${tag} the other rail pair stays unused`);
    // no two Arduino signal pins share a net, and none touches 5V directly
    for (const a of SIGNAL_PINS) {
      check(!n.same(`U:${a}`, V5), `${tag} ${a} is never tied straight to 5V`);
      // two pressed buttons both reach GND; that is the only allowed way two signal pins meet
      for (const b of SIGNAL_PINS) if (a < b) check(!n.same(`U:${a}`, `U:${b}`) || n.same(`U:${a}`, G), `${tag} ${a} and ${b} are separate (except both on GND when both buttons are pressed)`);
    }
    // buttons: pressed = pin to GND, open = floating (pulled up inside the Arduino)
    check(n.same('U:D2', G) === pressed.has('btnG'), `${tag} D2 reaches GND exactly when green is pressed`);
    check(n.same('U:D3', G) === pressed.has('btnR'), `${tag} D3 reaches GND exactly when red is pressed`);
    // LDR divider
    const ldr = resistors.find((r) => r.id === 'ldr')!, r10k = resistors.find((r) => r.id === 'r10k')!;
    const on = (a: string, b: string) => n.same(a, b);
    check((on(ldr.a, V5) && on(ldr.b, 'U:A0')) || (on(ldr.b, V5) && on(ldr.a, 'U:A0')), `${tag} LDR between 5V and A0`);
    check((on(r10k.a, 'U:A0') && on(r10k.b, G)) || (on(r10k.b, 'U:A0') && on(r10k.a, G)), `${tag} 10 kΩ between A0 and GND`);
    // PIR
    check(on('PIR:VCC', V5) && on('PIR:GND', G) && on('PIR:OUT', 'U:A1'), `${tag} PIR VCC→5V, GND→GND, OUT→A1`);
    // voice module
    check(on('DFR:+', V5) && on('DFR:−', G), `${tag} DFR0534 + → 5V and − → GND (not reversed)`);
    check(on('DFR:T', 'U:D0'), `${tag} DFR0534 T (talks) → D0 (RX)`);
    const r1k = resistors.find((r) => r.id === 'r1k')!;
    check(!on('DFR:R', 'U:D1') && ((on(r1k.a, 'DFR:R') && on(r1k.b, 'U:D1')) || (on(r1k.b, 'DFR:R') && on(r1k.a, 'U:D1'))), `${tag} D1 (TX) reaches DFR0534 R only through the 1 kΩ`);
    // capacitor polarity
    const cap = byId('cap', 'capacitor');
    check(on(holeNode(cap.legs.plus), V5) && on(holeNode(cap.legs.minus), G), `${tag} capacitor + leg on 5V, striped − leg on GND`);
    // speaker: on SP+/SP− only, never on the supply
    check(on('SPK:+', 'DFR:SP+') && on('SPK:−', 'DFR:SP−') && !on('DFR:SP+', 'DFR:SP−'), `${tag} one speaker on SP+ / SP−`);
    check(![V5, G].some((x) => on('DFR:SP+', x) || on('DFR:SP−', x)), `${tag} speaker outputs never touch 5V or GND`);
  }
}

// ---------- 2. every breadboard hole holds at most one leg or wire end
const used = new Map<string, string>();
const useHole = (h: Hole, who: string) => {
  const k = `${h.c}${h.r}`;
  check(!used.has(k), `hole ${k} used once (${who}${used.has(k) ? ' AND ' + used.get(k) : ''})`);
  used.set(k, who);
};
for (const it of ITEMS) {
  if (it.kind === 'wire') for (const e of [it.from, it.to]) if (e.kind === 'hole') useHole({ c: e.c, r: e.r }, it.id);
  if ('legs' in it) for (const h of Object.values(it.legs)) useHole(h as Hole, it.id);
}

// ---------- 3. wires used vs wires ordered
const count = (w: string) => ITEMS.filter((i) => i.kind === 'wire' && i.wire === w).length;
check(count('M-M') === 12 && count('M-M') <= WIRES_IN_ORDER['M-M'], `12 male-male wires used (ordered ${WIRES_IN_ORDER['M-M']}); got ${count('M-M')}`);
check(count('F-M') === 3 && count('F-M') <= WIRES_IN_ORDER['F-M'], `3 female-male wires used (ordered ${WIRES_IN_ORDER['F-M']}); got ${count('F-M')}`);

// ---------- 4. the firmware uses the same pins
const ino = fs.readFileSync(path.join(REPO, 'firmware/robin/robin.ino'), 'utf8');
const pinOf = (name: string) => (ino.match(new RegExp(`${name}\\s*=\\s*(\\w+);`)) || [])[1];
const wireTo = (pin: string) => ITEMS.find((i) => i.kind === 'wire' && [i.from, i.to].some((e) => e.kind === 'uno' && e.pin === pin));
check(pinOf('PIN_LIGHT') === 'A0' && !!wireTo('A0'), 'firmware PIN_LIGHT = A0, and the light wire goes to A0');
check(pinOf('PIN_PIR') === 'A1' && !!wireTo('A1'), 'firmware PIN_PIR = A1, and PIR OUT goes to A1');
check(pinOf('PIN_BTN_YES') === '2' && !!wireTo('D2'), 'firmware PIN_BTN_YES = 2, and the green button goes to D2');
check(pinOf('PIN_BTN_NO') === '3' && !!wireTo('D3'), 'firmware PIN_BTN_NO = 3, and the red button goes to D3');
check(/INPUT_PULLUP/.test(ino), 'firmware uses INPUT_PULLUP for the buttons (so they go to GND, never to 5V)');
check(/Voice voice\(Serial1\)/.test(ino) && !!wireTo('D0') && !!wireTo('D1'), 'firmware talks to the voice module on Serial1 = D0/D1');

// ---------- 5. on-screen tables = docs/04, order = docs/03
const plain = (s: string) => s.replace(/\*/g, '').replace(/`/g, '').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const mdTable = (md: string, header: string) => {
  const start = md.indexOf(header);
  const rows: string[][] = [];
  for (const line of md.slice(start).split('\n').slice(2)) {
    if (!line.startsWith('|')) break;
    rows.push(line.split('|').slice(1, -1).map(plain));
  }
  return rows;
};
const doc04 = fs.readFileSync(path.join(REPO, 'docs/04_assembly.md'), 'utf8');
const pinDoc = mdTable(doc04, '| From | To | Wire |');
check(pinDoc.length === PINMAP_ROWS.length, `pin map: ${PINMAP_ROWS.length} rows on screen, ${pinDoc.length} in docs/04`);
PINMAP_ROWS.forEach((r, i) => check(JSON.stringify(r.map(plain)) === JSON.stringify(pinDoc[i] ?? []), `pin map row ${i + 1} matches docs/04: ${r[0]}`));
const trDoc = mdTable(doc04, '| Symptom | Likely cause | Fix |');
check(trDoc.length === TROUBLE_ROWS.length, `troubleshooting: ${TROUBLE_ROWS.length} rows on screen, ${trDoc.length} in docs/04`);
TROUBLE_ROWS.forEach((r, i) => check(JSON.stringify(r.map(plain)) === JSON.stringify(trDoc[i] ?? []), `troubleshooting row ${i + 1} matches docs/04: ${r[0]}`));
const doc03 = fs.readFileSync(path.join(REPO, 'docs/03_shopping_list.md'), 'utf8');
check(Math.abs(ORDER_TOTAL - 35.95) < 0.001, `order total is €35.95 (got €${ORDER_TOTAL.toFixed(2)})`);
check(ORDER.length === 16, `the order has 16 lines (got ${ORDER.length})`);
for (const l of ORDER) check(doc03.includes(l.sku), `SKU ${l.sku} (${l.name}) is in docs/03`);
check(/\*\*35\.95\*\*/.test(doc03) && /€42\.90/.test(doc03), 'docs/03 shows €35.95 parts and €42.90 total');

// ---------- report
const bad = results.filter((r) => !r.ok);
const uniq = [...new Set(results.map((r) => r.msg.replace(/^\[[^\]]*\] /, '')))];
if (process.argv.includes('--md')) {
  console.log(`**Netcheck: ${results.length - bad.length}/${results.length} checks passed.**\n`);
  for (const m of uniq) console.log(`- ${bad.some((b) => b.msg.endsWith(m)) ? '❌' : '✅'} ${m}`);
  console.log('\nWire ends: ' + ITEMS.filter((i) => i.kind === 'wire').map((i) => (i.kind === 'wire' ? `${i.id} ${endName(i.from)} → ${endName(i.to)}` : '')).join('; '));
} else {
  for (const b of bad) console.log('FAIL', b.msg);
  console.log(`netcheck: ${results.length - bad.length}/${results.length} checks passed (${uniq.length} distinct)`);
}
process.exit(bad.length ? 1 : 0);
