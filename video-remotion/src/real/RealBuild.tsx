// The real-footage video: our own photos and clips from video-assets/, chapter by chapter in docs/04 order, then
// the tests. Every picture says what it is (REAL PHOTO, REAL CLIP, DRAWING), so a drawing can never pass for proof.
// Steps nobody filmed yet get a "still to shoot" card (left out when the manifest is made with --final).
import React from 'react';
import { AbsoluteFill, Freeze, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import '../fonts';
import { LedMatrix, blinkFace } from '../kit/hardware';
import { C, EMOJI, FONT, MONO } from '../theme';
import { Chapter } from './plan';
import { FADE, filmed, FPS, M, planned, Seg, SEGS, segAt, TOTAL } from './timeline';

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const STAGE = { top: 60, h: 564 };
const count = (n: number, what: string) => `${n} ${what}${n === 1 ? '' : 's'}`;
const counts = (photos: number, clips: number) => [photos && count(photos, 'photo'), clips && count(clips, 'clip')].filter(Boolean).join(' · ');

const BADGE = {
  photo: { icon: '📷', title: 'REAL PHOTO', sub: 'taken by us', bg: C.green },
  clip: { icon: '🎬', title: 'REAL CLIP', sub: 'filmed by us', bg: C.blue },
  drawing: { icon: '✏️', title: 'DRAWING', sub: 'anatomy skill, not filmed', bg: C.purple },
  todo: { icon: '📋', title: 'TO SHOOT', sub: 'not filmed yet', bg: C.muted },
};
const badgeOf = (s: Seg) => {
  if (s.kind === 'todo') return BADGE.todo;
  if (s.kind !== 'photo' && s.kind !== 'clip') return null;
  return s.chapter.drawing ? BADGE.drawing : BADGE[s.kind];
};
const where = (c: Chapter) => (c.id === 'tc' ? 'tc01-01-…' : `${c.id}-01-…`);

// A dark viewer that fits any photo or clip (landscape or portrait) without cropping it.
const Viewer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'absolute', left: 16, top: 10, width: 1248, height: STAGE.h - 20, borderRadius: 18, background: '#16212c', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.18)' }}>
    {children}
  </div>
);
const fit: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' };

const Photo: React.FC<{ file: string; len: number }> = ({ file, len }) => {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [0, len], [1, 1.035], { extrapolateRight: 'clamp' });
  return (
    <Viewer>
      <Img src={staticFile(`real/${file}`)} style={{ ...fit, transform: `scale(${zoom})` }} />
    </Viewer>
  );
};

// Holds its last frame (silently) while the next segment fades in over it.
const Clip: React.FC<{ file: string; len: number }> = ({ file, len }) => (
  <Viewer>
    <Freeze frame={len - 1} active={(f) => f >= len}>
      <OffthreadVideo src={staticFile(`real/${file}`)} style={fit} volume={(f) => (f >= len ? 0 : 1)} />
    </Freeze>
  </Viewer>
);

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>{children}</div>
);
const Chip: React.FC<{ text: string; bg: string; size?: number }> = ({ text, bg, size = 16 }) => (
  <div style={{ fontSize: size, fontWeight: 900, color: '#fff', background: bg, borderRadius: size, padding: `${size * 0.3}px ${size * 0.9}px` }}>{text}</div>
);
const Legend: React.FC<{ b: (typeof BADGE)[keyof typeof BADGE]; text: string }> = ({ b, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 19, fontWeight: 700, color: C.ink }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: b.bg, color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: 1, borderRadius: 10, padding: '5px 10px' }}>
      <span style={{ fontFamily: EMOJI }}>{b.icon}</span>{b.title}
    </div>
    {text}
  </div>
);

const Intro: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <Center>
      <svg width={130} height={130}>
        <rect x={5} y={5} width={120} height={120} rx={26} fill={C.teal} />
        <LedMatrix x0={20} y0={31} pitch={8.2} r={3} face={blinkFace(t, 1)} />
      </svg>
      <div style={{ fontSize: 60, fontWeight: 900, color: C.ink, lineHeight: 1 }}>Robin</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.muted }}>The real build and the tests, step by step</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 8 }}>
        <Legend b={BADGE.photo} text="a photo we took of the real parts" />
        <Legend b={BADGE.clip} text="a clip we filmed of the real parts" />
        <Legend b={BADGE.drawing} text="a drawing: it explains, it doesn't prove" />
        {!M.final && <Legend b={BADGE.todo} text="a step not filmed yet (only in drafts)" />}
      </div>
    </Center>
  );
};

const Title: React.FC<{ s: Extract<Seg, { kind: 'title' }> }> = ({ s }) => {
  const n = counts(s.photos, s.clips);
  return (
    <Center>
      <Chip text={s.chapter.chip} bg={s.chapter.chip === 'Tests' ? C.purple : C.orange} size={26} />
      <div style={{ fontSize: 54, fontWeight: 900, color: C.ink }}>{s.chapter.title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.muted }}>{s.chapter.ref}{n ? `  ·  ${n}` : ''}</div>
    </Center>
  );
};

const Todo: React.FC<{ chapter: Chapter }> = ({ chapter }) => (
  <div style={{ position: 'absolute', left: 140, top: 34, width: 1000, height: STAGE.h - 68, border: `4px dashed ${C.muted}`, borderRadius: 22, boxSizing: 'border-box', padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ fontSize: 30, fontWeight: 900, color: C.ink }}><span style={{ fontFamily: EMOJI }}>📋</span> Still to shoot for this step</div>
    {chapter.plan.map((p, i) => (
      <div key={i} style={{ display: 'flex', gap: 14, fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>
        <span style={{ fontFamily: EMOJI }}>{p.kind === 'clip' ? '🎬' : '📷'}</span>
        <span>{p.what}</span>
      </div>
    ))}
    <div style={{ marginTop: 'auto', fontFamily: MONO, fontSize: 17, color: C.muted }}>
      {where(chapter)}.jpg → video-assets/images/  ·  {where(chapter)}.mp4 → video-assets/clips/
    </div>
  </div>
);

const End: React.FC = () => (
  <Center>
    <div style={{ fontSize: 56, fontWeight: 900, color: C.ink }}>That's Robin.</div>
    {filmed.length > 0 && (
      <div style={{ fontSize: 24, fontWeight: 700, color: C.muted }}>
        {counts(filmed.filter((i) => i.kind === 'photo').length, filmed.filter((i) => i.kind === 'clip').length)} of the real build and tests
      </div>
    )}
    {!M.final && <Chip text={`Draft: ${count(filmed.length, 'file')} for ${planned} planned shots`} bg={C.muted} size={18} />}
  </Center>
);

const Body: React.FC<{ s: Seg }> = ({ s }) => {
  switch (s.kind) {
    case 'intro': return <Intro />;
    case 'end': return <End />;
    case 'title': return <Title s={s} />;
    case 'todo': return <Todo chapter={s.chapter} />;
    case 'photo': return <Photo file={s.item.file} len={s.len} />;
    case 'clip': return <Clip file={s.item.file} len={s.len} />;
  }
};

const SegHost: React.FC<{ s: Seg; first: boolean }> = ({ s, first }) => {
  const f = useCurrentFrame();
  const o = first ? 1 : interpolate(f, [0, FADE], [0, 1], { extrapolateRight: 'clamp', easing: easeInOut });
  return (
    <div style={{ position: 'absolute', left: 0, top: STAGE.top, width: 1280, height: STAGE.h, background: C.bg, opacity: o, overflow: 'hidden', fontFamily: FONT, color: C.ink }}>
      <Body s={s} />
    </div>
  );
};

const caption = (s: Seg) => {
  switch (s.kind) {
    case 'photo': case 'clip': return s.item.caption;
    case 'title': return s.photos + s.clips > 0 || M.final ? '' : 'Nothing filmed for this step yet';
    case 'todo': return 'This card disappears as soon as the files are in video-assets';
    default: return '';
  }
};

const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = segAt(frame);
  const chapter = 'chapter' in s ? s.chapter : null;
  const badge = badgeOf(s);
  const cap = caption(s);
  const file = !M.final && (s.kind === 'photo' || s.kind === 'clip') ? s.item.file : '';
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1280, height: 60, background: C.bar, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: FONT, zIndex: 10 }}>
        <svg width={60} height={60} style={{ position: 'absolute', left: 10, top: 0 }}>
          <rect x={8} y={8} width={44} height={44} rx={10} fill={C.teal} />
          <LedMatrix x0={13.5} y0={16} pitch={3.0} r={1.1} face={blinkFace(t, 1)} />
        </svg>
        <div style={{ position: 'absolute', left: 72, top: 8, fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: C.teal }}>ROBIN · REAL BUILD + TESTS · follows docs/04{M.final ? '' : ' · DRAFT'}</div>
        <div style={{ position: 'absolute', left: 72, top: 25, fontSize: 22, fontWeight: 900, color: C.ink, whiteSpace: 'nowrap' }}>{chapter ? chapter.title : 'Robin'}</div>
        {chapter && (
          <div style={{ position: 'absolute', right: badge ? 300 : 20, top: 14 }}><Chip text={chapter.chip} bg={chapter.chip === 'Tests' ? C.purple : C.orange} /></div>
        )}
        {badge && (
          <div style={{ position: 'absolute', right: 14, top: 7, width: 270, height: 46, borderRadius: 12, background: badge.bg, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', boxSizing: 'border-box' }}>
            <div style={{ fontFamily: EMOJI, fontSize: 24 }}>{badge.icon}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.1 }}>{badge.title}</div>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.95 }}>{badge.sub}</div>
            </div>
          </div>
        )}
        <div style={{ position: 'absolute', left: 0, top: 57, height: 3, width: (frame / TOTAL) * 1280, background: C.teal }} />
      </div>
      {(cap || file) && (
        <div style={{ position: 'absolute', left: 0, top: 624, width: 1280, height: 96, background: C.bar, boxShadow: '0 -2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 60px', boxSizing: 'border-box', fontFamily: FONT, zIndex: 10 }}>
          <div style={{ fontSize: 25, fontWeight: 700, lineHeight: 1.28, textAlign: 'center', color: C.ink, maxWidth: 1080 }}>{cap}</div>
          {file && <div style={{ position: 'absolute', right: 16, bottom: 8, fontFamily: MONO, fontSize: 12, color: C.muted }}>{file}</div>}
        </div>
      )}
    </>
  );
};

export const RealBuild: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
    {SEGS.map((s, i) => (
      <Sequence key={i} from={s.from} durationInFrames={s.len + (i === SEGS.length - 1 ? 0 : FADE)} name={`${s.kind} ${'item' in s ? s.item.file : 'chapter' in s ? s.chapter.id : ''}`} layout="none">
        <SegHost s={s} first={i === 0} />
      </Sequence>
    ))}
    <Overlay />
  </AbsoluteFill>
);
