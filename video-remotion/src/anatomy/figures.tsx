// The explainer figures next to the bench (anatomy skill: the object is the explanation):
//   - the breadboard with its plastic lifted off, so the metal clips that join the holes show;
//   - the PIR seen from the front, with its dome pulled off so the pin labels show;
//   - a render of a part we received (video-assets/parts/), always badged as a render.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { box, glowRect } from './draw';
import * as k from './kit/iso-kit';
import { Row } from '../data/geom';
import { PIR_PINS } from '../data/modules';
import { AZIMUTH, FIG, GLOW } from './Bench';
import { breadboardSvg, clipsSvg, COL, domeSvg } from './parts';
import { BB, colX, PIR, PIR_PIN_Z, pirPinX, rowY, rowYu, V3 } from './world';
import { C, EMOJI, FONT } from '../theme';

const Raw: React.FC<{ svg: string; transform?: string; opacity?: number }> = ({ svg, transform, opacity }) =>
  <g transform={transform} opacity={opacity} dangerouslySetInnerHTML={{ __html: svg }} />;
const css = `${k.ISO_CSS}\n.anat{--anatomy-weight:.9px}\n.anat .iso-solid path{vector-effect:non-scaling-stroke}`;
const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox={`0 0 ${FIG.w} ${FIG.h}`} width={FIG.w} height={FIG.h} style={{ display: 'block' }}>
    <style>{css}</style>
    <g className="iso anat" data-theme="light">{children}</g>
  </svg>
);

// ---------- breadboard x-ray
const LIFT = 78;
const XP = k.fitProjection([[BB.x, BB.y, 0], [BB.x + BB.w, BB.y + BB.d, 0], [BB.x, BB.y, LIFT + BB.h], [BB.x + BB.w, BB.y + BB.d, LIFT + BB.h]], FIG.w, FIG.h, { pad: 36, azimuth: AZIMUTH, elevation: 46 });
let xrayCache: { clips: string; shell: string } | null = null;
// One metal clip, coloured: a rail ('rail:+b') or a half-column ('col:5:bottom').
function clipOf(spec: string): string {
  const [kind, a, b] = spec.split(':');
  if (kind === 'rail') {
    const u = ({ '+t': 0, '-t': 1, '-b': 16, '+b': 17 } as Record<string, number>)[a];
    return box(XP, colX(1) - 1, rowYu(u) - 0.7, 2.2, colX(30) - colX(1) + 2, 1.4, 1.6, a.startsWith('+') ? GLOW.red : GLOW.blue, 0);
  }
  if (kind === 'col') {
    const c = Number(a), [u0, u1] = b === 'top' ? [3, 7] : [10, 14];
    return box(XP, colX(c) - 0.7, rowYu(u0) - 0.9, 2.2, 1.4, rowYu(u1) - rowYu(u0) + 1.8, 1.6, GLOW.teal, 0);
  }
  return '';
}
function surfaceGlow(spec: string, o: number): string {
  const [kind, a, b] = spec.split(':');
  if (kind === 'rail') return glowRect(XP, colX(1) - 1.7, rowY(a as Row) - 1.15, colX(30) - colX(1) + 3.4, 2.3, BB.h + 0.05, a.startsWith('+') ? GLOW.red : GLOW.blue, o);
  if (kind === 'col') {
    const top = b === 'top', y0 = rowY(top ? 'a' : 'f') - 1.2, y1 = rowY(top ? 'e' : 'j') + 1.2;
    return glowRect(XP, colX(Number(a)) - 1.15, y0, 2.3, y1 - y0, BB.h + 0.05, GLOW.teal, o);
  }
  return '';
}
export const BreadboardXray: React.FC<{ lift: number; glow: { spec: string; o: number }[] }> = ({ lift, glow }) => {
  xrayCache ??= { clips: `<path class="iso-halo" d="${k.haloOf({ x: BB.x, y: BB.y, w: BB.w, d: BB.d, r: 1.2 }, 0, 1, XP)}"/>` + clipsSvg(XP), shell: breadboardSvg(XP, { lift: 0 }) };
  const up = k.translateAlong(XP, [0, 0, lift * LIFT]);
  return (
    <Svg>
      <Raw svg={xrayCache.clips} />
      {glow.map((g) => <Raw key={g.spec} svg={clipOf(g.spec)} opacity={g.o} />)}
      <Raw svg={xrayCache.shell} transform={up} />
      <Raw svg={glow.map((g) => surfaceGlow(g.spec, g.o)).join('')} transform={up} />
    </Svg>
  );
};

// ---------- the PIR from the front, dome pulled off
const FP = k.fitProjection([[PIR.x - 2, PIR.y - 26, 0], [PIR.x + PIR.w + 2, PIR.y + 2, 0], [PIR.x - 2, PIR.y - 26, PIR.h + 8], [PIR.x + PIR.w + 2, PIR.y + 2, PIR.h + 2]], FIG.w, FIG.h, { pad: 44, azimuth: 252, elevation: 20 });
const frontText = (x: number, z: number, text: string, size: number, fill: string) => {
  const o = k.iso([x, PIR.y - 0.02, z], FP), u = k.axisVector(FP, [-1, 0, 0]), v = k.axisVector(FP, [0, 0, -1]);
  const m = [u[0], u[1], v[0], v[1], o[0], o[1]].map((q) => q.toFixed(3)).join(' ');
  return `<text transform="matrix(${m})" font-size="${size}" font-family="JetBrains Mono, monospace" font-weight="800" fill="${fill}" text-anchor="middle" dominant-baseline="central">${text}</text>`;
};
let pirFrontCache: { body: string; labels: string } | null = null;
export const PirFront: React.FC<{ lift: number; t: number }> = ({ lift, t }) => {
  if (!pirFrontCache) {
    const s: string[] = [];
    s.push(`<path class="iso-halo" d="${k.haloOf({ x: PIR.x, y: PIR.y - 8, w: PIR.w, d: 12, r: 4 }, 0, 1, FP)}"/>`);
    s.push(box(FP, pirPinX('VCC') - 3.9, PIR.y + PIR.t, PIR_PIN_Z - 1.25, 7.8, 2.5, 2.5, COL.header, 0.1)); // pin header, behind
    s.push(box(FP, PIR.x, PIR.y, PIR.z, PIR.w, PIR.t, PIR.h, COL.pirPcb, 0.6));
    for (const [x, z] of [[PIR.x + 2.2, PIR.z + 2.2], [PIR.x + PIR.w - 2.2, PIR.z + 2.2], [PIR.x + 2.2, PIR.z + PIR.h - 2.2], [PIR.x + PIR.w - 2.2, PIR.z + PIR.h - 2.2]]) {
      const c = k.iso([x, PIR.y - 0.02, z], FP);
      s.push(`<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(0.9 * FP.scale).toFixed(1)}" fill="#0f3d27" stroke="${COL.gold}" stroke-width="1.2"/>`);
    }
    const labels = PIR_PINS.map((n) => frontText(pirPinX(n), PIR.z + 5.6, n, 1.05, '#ffffff')).join('')
      + frontText(PIR.x + PIR.w / 2, PIR.z + 18.5, 'HC-SR501', 1.3, '#bfe3cf');
    pirFrontCache = { body: s.join(''), labels };
  }
  // the dome sits on a square frame in the middle of the board; pulled off, it comes towards you, up and aside
  const dome = (): string => {
    const cx = PIR.x + PIR.w / 2, cz = PIR.z + PIR.h / 2;
    const frame = box(FP, cx - 11.8, PIR.y - 1.6, cz - 11.8, 23.6, 1.6, 23.6, '#f1eee6', 0.8);
    return frame + domeSvg(FP, [cx, PIR.y - 1.6, cz] as V3, 11.4);
  };
  const off = k.translateAlong(FP, [20 * lift, -8 * lift, 10 * lift]);
  const glow = lift > 0.5 ? (lift - 0.5) * 2 : 0;
  const ring = PIR_PINS.map((n) => {
    const c = k.iso([pirPinX(n), PIR.y - 0.05, PIR.z + 5.6], FP);
    return `<ellipse cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" rx="${(1.2 * FP.scale).toFixed(1)}" ry="${(1.0 * FP.scale).toFixed(1)}" fill="${GLOW.orange}" fill-opacity="${(0.22 * glow).toFixed(2)}" stroke="${GLOW.orange}" stroke-opacity="${(0.9 * glow * (0.75 + 0.25 * Math.sin(t * 5))).toFixed(2)}" stroke-width="1.6"/>`;
  }).join('');
  return (
    <Svg>
      <Raw svg={pirFrontCache.body} />
      <Raw svg={pirFrontCache.labels + ring} />
      <Raw svg={dome()} transform={off} />
    </Svg>
  );
};

// ---------- a render of a part we received (video-assets/parts/), with the badge that says what it is.
// The renders are 1200 x 900 with their caption in the bottom 14 %: show only the picture above it, as large as fits.
export const RenderCard: React.FC<{ name: string; o?: number; w?: number; h?: number }> = ({ name, o = 1, w = FIG.w, h = FIG.h }) => {
  const iw = Math.min(w - 40, (h - 60) / 0.645), ih = iw * 0.645;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', left: (w - iw) / 2, top: (h - ih) / 2 + 6, width: iw, height: ih, overflow: 'hidden', borderRadius: 10 }}>
        <Img src={staticFile(`parts/${name}.png`)} style={{ width: iw, height: iw * 0.75, display: 'block' }} />
      </div>
      <RenderBadge style={{ position: 'absolute', left: 4, top: 32 }} />
    </div>
  );
};
export const RenderBadge: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.purple, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 12, letterSpacing: 1, borderRadius: 9, padding: '4px 10px', ...style }}>
    <span style={{ fontFamily: EMOJI }}>✏️</span>RENDER · the parts we received
  </div>
);
