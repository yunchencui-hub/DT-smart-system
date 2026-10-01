// Header (title, step, progress), caption bar, and the USB badge: drawn over every scene from the timeline.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { LedMatrix, blinkFace } from './kit/hardware';
import { captionAt, sceneAt, TL, usbAt } from './timeline';
import { C, EMOJI, FONT } from './theme';

const USB_TEXT = {
  out: { icon: '🔌', title: 'USB OUT', sub: 'wiring is allowed', bg: '#2e9e4f' },
  in: { icon: '⚡', title: 'USB IN', sub: 'testing: hands off the wires', bg: '#f57c00' },
  micro: { icon: '💽', title: 'Arduino USB OUT', sub: 'module alone on micro-USB', bg: '#7e57c2' },
};

export const Overlay: React.FC = () => {
  const t = useCurrentFrame() / TL.fps;
  const sc = sceneAt(t);
  const cap = captionAt(t);
  const usb = USB_TEXT[usbAt(t)];
  const showBadge = sc.part !== 'Welcome';
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1280, height: 60, background: C.bar, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: FONT, zIndex: 10 }}>
        <svg width={60} height={60} style={{ position: 'absolute', left: 10, top: 0 }}>
          <rect x={8} y={8} width={44} height={44} rx={10} fill={C.teal} />
          <LedMatrix x0={13.5} y0={16} pitch={3.0} r={1.1} face={blinkFace(t, 1)} />
        </svg>
        <div style={{ position: 'absolute', left: 72, top: 8, fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: C.teal }}>ROBIN · BUILD GUIDE · follows docs/04</div>
        <div style={{ position: 'absolute', left: 72, top: 25, fontSize: 22, fontWeight: 900, color: C.ink, whiteSpace: 'nowrap' }}>{sc.title}</div>
        <div style={{ position: 'absolute', right: showBadge ? 300 : 20, top: 14, fontSize: 16, fontWeight: 900, color: '#fff', background: sc.step ? C.orange : C.purple, borderRadius: 16, padding: '5px 14px' }}>{sc.step ?? sc.part}</div>
        {showBadge && (
          <div style={{ position: 'absolute', right: 14, top: 7, width: 270, height: 46, borderRadius: 12, background: usb.bg, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', boxSizing: 'border-box' }}>
            <div style={{ fontFamily: EMOJI, fontSize: 24 }}>{usb.icon}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.1 }}>{usb.title}</div>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.95 }}>{usb.sub}</div>
            </div>
          </div>
        )}
        <div style={{ position: 'absolute', left: 0, top: 57, height: 3, width: (t / TL.total) * 1280, background: C.teal }} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 624, width: 1280, height: 96, background: C.bar, boxShadow: '0 -2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 60px', boxSizing: 'border-box', fontFamily: FONT, zIndex: 10 }}>
        {cap && cap.kind === 'robin' && <div style={{ background: C.teal, color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: 1.5, borderRadius: 14, padding: '5px 12px' }}>ROBIN</div>}
        {cap && cap.kind === 'pause' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.orange, color: '#fff', fontWeight: 900, fontSize: 22, borderRadius: 26, padding: '10px 26px' }}>⏸  {cap.cap}  ·  {Math.ceil(cap.end - t)}</div>
        ) : cap ? (
          <div style={{ fontSize: 25, fontWeight: 700, lineHeight: 1.28, textAlign: 'center', color: cap.kind === 'robin' ? C.tealDark : C.ink, fontStyle: cap.kind === 'robin' ? 'italic' : 'normal', maxWidth: 1080 }}>
            {cap.kind === 'robin' ? `“${cap.cap}”` : cap.cap}
          </div>
        ) : null}
      </div>
    </>
  );
};
