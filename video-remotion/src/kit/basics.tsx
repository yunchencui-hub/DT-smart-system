// Small SVG + HTML building blocks. Everything is a pure function of its props (and so of time).
import React from 'react';
import { back, clamp, easeOut, lerp, pulse, smooth, Box } from '../data/geom';
import { C, EMOJI, FONT, MONO } from '../theme';

// ---------- animation helpers (progress p is 0..1)
export const popStyle = (p: number): React.CSSProperties => {
  p = clamp(p);
  return { opacity: Math.min(1, p * 2.5), transform: `scale(${p <= 0 ? 0.6 : lerp(0.6, 1, back(p))})`, visibility: p <= 0.001 ? 'hidden' : 'visible' };
};
export const riseStyle = (p: number, dy = 18): React.CSSProperties => {
  p = clamp(p);
  return { opacity: p, transform: `translateY(${(1 - easeOut(p)) * dy}px)`, visibility: p <= 0.001 ? 'hidden' : 'visible' };
};
export const fadeStyle = (o: number): React.CSSProperties => ({ opacity: clamp(o), visibility: o <= 0.001 ? 'hidden' : 'visible' });
// SVG pop around a centre
export const spop = (p: number, cx: number, cy: number) => {
  p = clamp(p);
  const sc = p <= 0 ? 0.6 : lerp(0.6, 1, back(p));
  return { transform: `translate(${cx} ${cy}) scale(${sc}) translate(${-cx} ${-cy})`, opacity: Math.min(1, p * 2.5), visibility: (p <= 0.001 ? 'hidden' : 'visible') as 'hidden' | 'visible' };
};

// ---------- the stage SVG (1280 x 564) with an optional camera view box
export const Stage: React.FC<{ view?: Box; children: React.ReactNode }> = ({ view, children }) => (
  <svg width={1280} height={564} viewBox={(view ?? [0, 0, 1280, 564]).map((v) => v.toFixed(1)).join(' ')} style={{ position: 'absolute', left: 0, top: 0, fontFamily: FONT }}>
    {children}
  </svg>
);

// ---------- text width (canvas), so label boxes fit their text
let ctx: CanvasRenderingContext2D | null = null;
export const textW = (text: string, size = 14, weight = 700, family = 'Nunito') => {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * size * 0.55;
  ctx.font = `${weight} ${size}px ${family}`;
  return ctx.measureText(text).width;
};

// ---------- jumper wire
const DARKER: Record<string, string> = {
  '#e53935': '#8e1c1a', '#212121': '#000', '#1e63d6': '#0d3b85', '#f2b705': '#9a7400', '#2e9e4f': '#17602d', '#f57c00': '#9a4d00',
  '#8e44ad': '#5b2371', '#ffffff': '#9aa3ab', '#00a3a3': '#006666', '#795548': '#4a332b', '#9e9e9e': '#5f5f5f', '#ec407a': '#a0204d',
};
export const Wire: React.FC<{ pts: [number, number][]; color: string; p?: number; w?: number; plugs?: [boolean, boolean]; glow?: boolean }> = ({ pts, color, p = 1, w = 4.2, plugs = [true, true], glow = false }) => {
  if (p <= 0) return null;
  const d = smooth(pts);
  const dash = { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - clamp(p) } as const;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const ww = glow ? w + 2 : w;
  return (
    <g>
      <path d={d} fill="none" stroke={DARKER[color] || '#333'} strokeWidth={ww + 2.4} strokeLinecap="round" strokeLinejoin="round" {...dash} />
      <path d={d} fill="none" stroke={color} strokeWidth={ww} strokeLinecap="round" strokeLinejoin="round" {...dash} />
      <path d={d} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={ww * 0.28} strokeLinecap="round" transform={`translate(${-ww * 0.18} ${-ww * 0.18})`} {...dash} />
      {plugs[0] && <rect x={a[0] - 4} y={a[1] - 4} width={8} height={8} rx={1.5} fill="#2b2b2b" stroke="#000" strokeWidth={0.8} />}
      {plugs[1] && p >= 0.98 && <rect x={b[0] - 4} y={b[1] - 4} width={8} height={8} rx={1.5} fill="#2b2b2b" stroke="#000" strokeWidth={0.8} />}
    </g>
  );
};

// ---------- pulsing ring to point at a hole or pin
export const Ring: React.FC<{ x: number; y: number; t: number; on: boolean; color?: string; r?: number }> = ({ x, y, t, on, color = '#ff9800', r = 11 }) => {
  if (!on) return null;
  const k = pulse(t, 1.6);
  return <circle cx={x} cy={y} r={r + k * 5} fill="none" stroke={color} strokeWidth={3} opacity={0.95 - k * 0.5} />;
};

// ---------- label with a dashed leader line (dashes fade in, never "drawn": see CLAUDE.md)
export const Tag: React.FC<{ x: number; y: number; text: string; o: number; dx?: number; dy?: number; color?: string; bg?: string; size?: number; weight?: number; anchor?: 'middle' | 'start' | 'end' }> = ({ x, y, text, o, dx = 0, dy = -34, color = C.ink, bg = '#ffffff', size = 15, weight = 800, anchor = 'middle' }) => {
  if (o <= 0.001) return null;
  const pad = 7, tw = textW(text, size, weight);
  const bx = x + dx, by = y + dy;
  const left = anchor === 'middle' ? bx - tw / 2 - pad : anchor === 'start' ? bx - pad : bx - tw - pad;
  return (
    <g opacity={clamp(o)}>
      {(dx || dy) ? <line x1={x} y1={y} x2={bx} y2={by} stroke={color} strokeWidth={2} strokeDasharray="4 3" /> : null}
      <rect x={left} y={by - size * 0.8 - pad * 0.6} width={tw + pad * 2} height={size * 1.25 + pad * 1.2} rx={8} fill={bg} stroke={color} strokeWidth={2} />
      <text x={left + pad + tw / 2} y={by + size * 0.28} textAnchor="middle" fontSize={size} fontWeight={weight} fill={color}>{text}</text>
    </g>
  );
};

export const Emoji: React.FC<{ x: number; y: number; ch: string; size?: number; o?: number; rotate?: number }> = ({ x, y, ch, size = 40, o = 1, rotate = 0 }) =>
  o <= 0.001 ? null : (
    <text x={x} y={y} fontSize={size} textAnchor="middle" dominantBaseline="central" fontFamily={EMOJI} opacity={o} transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}>{ch}</text>
  );

// ---------- HTML widgets on the stage
export const Abs: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', ...style }}>{children}</div>
);

export const Card: React.FC<{ x: number; y: number; w?: number; h?: number; icon?: string; title: string; text?: string; color?: string; size?: number; anim: React.CSSProperties }> = ({ x, y, w = 260, h, icon, title, text, color = C.teal, size = 18, anim }) => (
  <Abs x={x} y={y} w={w} h={h} style={{ background: '#fff', borderRadius: 16, borderTop: `6px solid ${color}`, boxShadow: '0 6px 18px rgba(29,43,58,0.12)', padding: '12px 16px', ...anim }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {icon && <div style={{ fontFamily: EMOJI, fontSize: size * 1.7, lineHeight: 1 }}>{icon}</div>}
      <div>
        <div style={{ fontSize: size, fontWeight: 900, color: C.ink, lineHeight: 1.2 }}>{title}</div>
        {text && <div style={{ fontSize: size * 0.85, fontWeight: 700, color: C.muted, marginTop: 4, lineHeight: 1.3 }}>{text}</div>}
      </div>
    </div>
  </Abs>
);

export const Pill: React.FC<{ x: number; y: number; text: string; bg?: string; size?: number; anim: React.CSSProperties }> = ({ x, y, text, bg = C.orange, size = 19, anim }) => (
  <Abs x={x} y={y} style={{ fontSize: size, fontWeight: 900, color: '#fff', background: bg, borderRadius: 24, padding: '8px 18px', whiteSpace: 'nowrap', ...anim }}>{text}</Abs>
);

// ---------- terminal / Serial Monitor: a script of typed commands and printed lines, a pure function of t
export type TermEvent = { t: number; type?: 'type' | 'out'; text: string; color?: string };
export const Term: React.FC<{ x: number; y: number; w: number; h: number; t: number; events: TermEvent[]; kind?: 'serial' | 'shell'; title?: string; size?: number; anim: React.CSSProperties }> = ({ x, y, w, h, t, events, kind = 'serial', title, size = 14, anim }) => {
  const lines: { text: string; color?: string; cmd?: boolean }[] = [];
  let typing = '';
  for (const e of events) {
    if (t < e.t) break;
    if (e.type === 'type') {
      const n = Math.floor((t - e.t) * 13);
      if (n < e.text.length) { typing = e.text.slice(0, n); continue; }
      typing = '';
      if (kind === 'shell') lines.push({ text: `$ ${e.text}`, cmd: true });
    } else lines.push({ text: e.text, color: e.color });
  }
  const maxLines = Math.floor((h - (kind === 'serial' ? 96 : 50)) / (size * 1.45));
  const shown = lines.slice(-maxLines);
  const cursor = Math.floor(t * 2) % 2 === 0;
  return (
    <Abs x={x} y={y} w={w} h={h} style={{ background: '#16202c', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 26px rgba(0,0,0,0.25)', fontFamily: MONO, ...anim }}>
      <div style={{ background: '#243242', color: '#cfe0ea', fontFamily: FONT, fontWeight: 800, fontSize: 14, padding: '7px 14px' }}>{title ?? (kind === 'serial' ? 'Serial Monitor  ·  COM (UNO R4 WiFi)' : 'Terminal')}</div>
      {kind === 'serial' && (
        <div style={{ margin: '8px 12px', background: '#0f1720', border: '1px solid #3a4b5c', borderRadius: 6, padding: '5px 10px', color: '#e6edf3', fontSize: size }}>
          {typing}<span style={{ opacity: cursor ? 1 : 0 }}>▌</span>
        </div>
      )}
      <div style={{ padding: '4px 14px', fontSize: size, lineHeight: 1.45, color: '#d7e3ee', whiteSpace: 'pre' }}>
        {shown.map((l, i) => <div key={i} style={{ color: l.color ?? (l.cmd ? '#8ee6a0' : '#d7e3ee') }}>{l.text}</div>)}
        {kind === 'shell' && <div>$ {typing}<span style={{ opacity: cursor ? 1 : 0 }}>▌</span></div>}
      </div>
      {kind === 'serial' && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#243242', color: '#9fb3c4', fontSize: 12, fontFamily: FONT, fontWeight: 700, padding: '5px 14px' }}>115200 baud · Newline</div>}
    </Abs>
  );
};

// ---------- simple table (rows fade in)
export const Table: React.FC<{ x: number; y: number; w: number; rows: string[][]; head: string[]; colW: string[]; size?: number; headBg?: string; rowO: (i: number) => number }> = ({ x, y, w, rows, head, colW, size = 16, headBg = C.teal, rowO }) => (
  <Abs x={x} y={y} w={w} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 6px 18px rgba(29,43,58,0.12)' }}>
    <div style={{ display: 'flex', background: headBg, color: '#fff', fontWeight: 900, fontSize: size }}>
      {head.map((c, j) => <div key={j} style={{ width: colW[j], padding: '7px 12px' }}>{c}</div>)}
    </div>
    {rows.map((r, i) => (
      <div key={i} style={{ display: 'flex', fontSize: size, fontWeight: 700, color: C.ink, borderTop: '1px solid #eee6d8', background: i % 2 ? '#fbf8f2' : '#fff', opacity: clamp(rowO(i)) }}>
        {r.map((c, j) => <div key={j} style={{ width: colW[j], padding: '4px 12px', lineHeight: 1.25 }}>{c}</div>)}
      </div>
    ))}
  </Abs>
);
