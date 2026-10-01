// The 16 lines of the Fontys order form (FOR 05-03, updated 30 Sep 2026) = docs/03_shopping_list.md.
// scripts/netcheck.ts checks that the total is still EUR 35.95 and that every SKU appears in docs/03.
export type OrderLine = { n: number; sku: string; qty: number; name: string; unit: number; icon: string; isNew?: string };

export const ORDER: OrderLine[] = [
  { n: 1, sku: '004047', qty: 1, name: 'DFR0534 voice module (8 MB)', unit: 9.5, icon: '🗣️' },
  { n: 2, sku: '003415', qty: 1, name: 'Speaker set 8 Ω 2 W (2 speakers)', unit: 3.0, icon: '🔊', isNew: 'replaces the 1 W speaker' },
  { n: 3, sku: '000090', qty: 1, name: 'HC-SR501 PIR motion sensor', unit: 3.5, icon: '👁️' },
  { n: 4, sku: '003260', qty: 1, name: 'Kradex box, clear lid', unit: 10.0, icon: '📦' },
  { n: 5, sku: '000759', qty: 2, name: 'GL5528 LDR light sensor', unit: 0.3, icon: '💡' },
  { n: 6, sku: '001204', qty: 3, name: 'Push button 12 × 12 mm', unit: 0.25, icon: '🔘' },
  { n: 7, sku: '003060', qty: 1, name: 'Button cap, green', unit: 0.15, icon: '🟢' },
  { n: 8, sku: '003062', qty: 1, name: 'Button cap, red', unit: 0.15, icon: '🔴' },
  { n: 9, sku: '003058', qty: 1, name: 'Button cap, white (spare)', unit: 0.15, icon: '⚪' },
  { n: 10, sku: '000070', qty: 1, name: 'Breadboard, 400 points', unit: 2.25, icon: '🧱' },
  { n: 11, sku: '000164', qty: 3, name: 'Jumper wires M-M, 10 per pack', unit: 0.75, icon: '〰️', isNew: '2 → 3 packs' },
  { n: 12, sku: '000088', qty: 2, name: 'Jumper wires M-F, 10 per pack', unit: 0.75, icon: '〰️', isNew: '1 → 2 packs' },
  { n: 13, sku: '000089', qty: 1, name: 'Jumper wires F-F, 10 per pack', unit: 0.75, icon: '〰️' },
  { n: 14, sku: '007625', qty: 1, name: 'Resistors 10 kΩ, 10 per bag', unit: 0.5, icon: '⚡' },
  { n: 15, sku: '007621', qty: 1, name: 'Resistors 1 kΩ, 10 per bag', unit: 0.5, icon: '⚡' },
  { n: 16, sku: '006948', qty: 2, name: 'Capacitor 680 µF 25 V', unit: 0.2, icon: '🛢️', isNew: 'new' },
];
export const ORDER_TOTAL = Math.round(ORDER.reduce((s, l) => s + l.qty * l.unit, 0) * 100) / 100;
