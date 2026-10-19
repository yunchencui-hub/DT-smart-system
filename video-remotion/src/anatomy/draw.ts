// Drawing primitives for the isometric figures, on top of the anatomy kit (kit/iso-kit.ts).
// Everything returns SVG markup as a string (fast to build once, cheap to re-render every frame).
// Colour: the kit shades every solid in four tones by facing, plus a lighter top. Its CSS reads those tones from
// custom properties, so a "material" is just a set of those properties derived from one base colour (the colour
// of the real part, as in the renders in video-assets/parts/).
import * as k from './kit/iso-kit';
import type { V3 } from './world';

export type P = k.Projection;

// ---------- colour
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hexOf = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hexOf(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (hex: string) => { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

const matCache = new Map<string, string>();
export function matVars(base: string): string {
  const hit = matCache.get(base);
  if (hit) return hit;
  const dark = lum(base) < 0.28;
  const d = (t: number) => mix(base, '#000000', t), l = (t: number) => mix(base, '#ffffff', t);
  const v: Record<string, string> = {
    paper: base, face: base, top: l(dark ? 0.1 : 0.16),
    'shade-0': d(0.3), 'shade-1': d(0.2), 'shade-2': d(0.11), 'shade-3': d(0.03),
    'lit-top': l(0.24), 'lit-shade': l(0.08),
    hi: dark ? l(0.42) : d(0.62), mid: dark ? l(0.3) : d(0.45), lo: dark ? l(0.22) : d(0.32), faint: dark ? l(0.14) : d(0.16),
  };
  const s = Object.entries(v).map(([n, c]) => `--anatomy-${n}:${c}`).join(';');
  matCache.set(base, s);
  return s;
}

// ---------- solids (kit shading, coloured)
export const solid = (paths: k.SolidPaths, base: string, o: { halo?: boolean; flat?: boolean; crease?: k.Tone | 'none' } = {}) =>
  `<g style="${matVars(base)}">${k.solidSvg(paths, { tone: 'hi', crease: o.crease ?? 'faint', halo: o.halo, flat: o.flat })}</g>`;
export const box = (p: P, x: number, y: number, z: number, w: number, d: number, h: number, base: string, r = 0.25, o: { halo?: boolean; bevel?: number } = {}) =>
  solid(k.slabOf({ x, y, w, d, r }, z, h, p, r > 0 ? 3 : 0, o.bevel ?? 0), base, { halo: o.halo });
export const cyl = (p: P, cx: number, cy: number, r: number, z: number, h: number, base: string, steps = 28, o: { halo?: boolean } = {}) =>
  solid(k.cylinder(cx, cy, r, z, h, p, steps), base, { halo: o.halo });
export const prism = (p: P, ring: k.Plane[], z: number, h: number, base: string, o: { halo?: boolean } = {}) =>
  solid(k.extrude(ring, z, h, p, { convex: false }), base, { halo: o.halo });

// A flat polygon on a horizontal plane (an inlay, a groove, a printed line).
export const flatPoly = (p: P, ring: k.Plane[], z: number, fill: string, opacity = 1) =>
  `<path d="${k.onTop(ring, z, p, true)}" fill="${fill}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}/>`;
export const flatRect = (p: P, x: number, y: number, w: number, d: number, z: number, fill: string, opacity = 1) =>
  flatPoly(p, [[x, y], [x + w, y], [x + w, y + d], [x, y + d]], z, fill, opacity);
export const line3 = (p: P, pts: V3[], stroke: string, width: number, o: { opacity?: number; cap?: string; dash?: string } = {}) =>
  `<path d="${k.pathOf(pts.map((q) => k.iso(q, p)))}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="${o.cap ?? 'round'}" stroke-linejoin="round"${o.opacity !== undefined ? ` stroke-opacity="${o.opacity}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;

// Text printed on a horizontal face (silkscreen on a board, numbers on the breadboard). Size in mm.
export const topText = (p: P, x: number, y: number, z: number, text: string, size: number, fill: string, anchor: 'start' | 'middle' | 'end' = 'middle', weight = 700) =>
  `<text transform="${k.topMatrix([x, y], z, p)}" font-size="${size}" font-family="JetBrains Mono, monospace" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="central">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;

// ---------- a round rod on any axis (resistor bodies, LDR heads, leads): the convex hull of its two end circles,
// shaded across its width, with optional coloured bands.
let gid = 0;
const hull = (pts: k.Flat[]): k.Flat[] => {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: k.Flat, a: k.Flat, b: k.Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: k.Flat[] = [], up: k.Flat[] = [];
  for (const q of s) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = s.length - 1; i >= 0; i--) { const q = s[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
};
const frame = (a: V3, b: V3) => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(u[0], u[1], u[2]) || 1;
  const n = u.map((x) => x / L);
  let v = [n[1], -n[0], 0];
  if (Math.hypot(v[0], v[1]) < 1e-6) v = [1, 0, 0];
  const vl = Math.hypot(v[0], v[1], v[2]);
  v = v.map((x) => x / vl);
  const w = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]];
  return { n, v, w, L };
};
const ringAt = (a: V3, b: V3, s: number, r: number, steps = 18): V3[] => {
  const { n, v, w, L } = frame(a, b);
  const c = [a[0] + n[0] * s * L, a[1] + n[1] * s * L, a[2] + n[2] * s * L];
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2, cs = Math.cos(t) * r, sn = Math.sin(t) * r;
    return [c[0] + v[0] * cs + w[0] * sn, c[1] + v[1] * cs + w[1] * sn, c[2] + v[2] * cs + w[2] * sn] as V3;
  });
};
export function rod(p: P, a: V3, b: V3, r: number, base: string, bands: { s: number; w: number; color: string }[] = [], o: { edge?: string } = {}) {
  const proj = (q: V3) => k.iso(q, p);
  const body = hull([...ringAt(a, b, 0, r), ...ringAt(a, b, 1, r)].map(proj));
  const pa = proj(a), pb = proj(b);
  let nx = -(pb[1] - pa[1]), ny = pb[0] - pa[0];
  const nl = Math.hypot(nx, ny) || 1;
  nx /= nl; ny /= nl;
  if (ny > 0) { nx = -nx; ny = -ny; } // n points up the screen: the lit side
  const rs = r * p.scale * Math.sqrt(1.6);
  const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
  const id = `rod${gid++}`;
  const grad = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${(mx + nx * rs).toFixed(1)}" y1="${(my + ny * rs).toFixed(1)}" x2="${(mx - nx * rs).toFixed(1)}" y2="${(my - ny * rs).toFixed(1)}"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>`;
  const d = k.pathOf(body, true);
  const bandSvg = bands.map((bd) => `<path d="${k.pathOf(hull([...ringAt(a, b, bd.s - bd.w / 2, r * 1.01), ...ringAt(a, b, bd.s + bd.w / 2, r * 1.01)].map(proj)), true)}" fill="${bd.color}"/>`).join('');
  return `<g><defs>${grad}</defs><path d="${d}" fill="${base}"/>${bandSvg}<path d="${d}" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${o.edge ?? mix(base, '#000000', 0.55)}" stroke-width=".8" stroke-linejoin="round"/></g>`;
}

// ---------- a wire or cable: a tube along a 3D polyline (dark rim, colour, a highlight along the lit side)
export function tube(p: P, pts: V3[], color: string, diameter: number, o: { upto?: number; glow?: string } = {}) {
  const n = Math.max(2, Math.round((o.upto ?? 1) * (pts.length - 1)) + 1);
  const used = pts.slice(0, n);
  if (used.length < 2) return '';
  const d = k.pathOf(used.map((q) => k.iso(q, p)));
  const w = diameter * p.scale * Math.sqrt(1.6);
  const rim = mix(color, '#000000', color === '#212121' ? 0.6 : 0.45);
  const hi = color === '#212121' ? '#7a7a7a' : mix(color, '#ffffff', 0.55);
  const glow = o.glow ? `<path d="${d}" fill="none" stroke="${o.glow}" stroke-opacity=".35" stroke-width="${w * 3.2}" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  return `<g>${glow}<path d="${d}" fill="none" stroke="${rim}" stroke-width="${w + 1}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${hi}" stroke-opacity=".7" stroke-width="${w * 0.28}" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 ${(-w * 0.2).toFixed(2)})"/></g>`;
}

// ---------- a soft glow on a horizontal face (what the narrator is talking about: a rail, a column, a pin)
export const glowRect = (p: P, x: number, y: number, w: number, d: number, z: number, color: string, opacity: number) =>
  opacity <= 0.01 ? '' : `<path d="${k.planOutline({ x, y, w, d, r: Math.min(w, d) / 2 }, z, p)}" fill="${color}" fill-opacity="${(0.28 * opacity).toFixed(3)}" stroke="${color}" stroke-opacity="${(0.95 * opacity).toFixed(3)}" stroke-width="1.6"/>`;

