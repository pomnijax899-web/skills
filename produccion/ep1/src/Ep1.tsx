import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, Easing} from 'remotion';
import {Person, Rain, House, Walker, Letter, FilmOverlay} from './art';

const W = 1080;
const H = 1920;
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ease = Easing.bezier(0.22, 0.61, 0.36, 1);

/* ---------- Guion: subtítulos ---------- */
type Cue = {from: number; to: number; who?: 'MARISOL' | 'AURELIO'; text: string; kind: 'narr' | 'dial'};
const CUES: Cue[] = [
  {from: 22, to: 100, kind: 'narr', text: 'Heredé una casa.'},
  {from: 104, to: 190, kind: 'narr', text: 'Y una pregunta.'},
  {from: 205, to: 292, kind: 'dial', who: 'MARISOL', text: '¿Don Aurelio? ¿Usted aquí?'},
  {from: 304, to: 408, kind: 'dial', who: 'AURELIO', text: 'Tu abuela me pidió que esperara a que volvieras.'},
  {from: 418, to: 478, kind: 'dial', who: 'AURELIO', text: 'Esta llave es solo tuya.'},
  {from: 492, to: 570, kind: 'narr', text: 'Venía a venderla. Nada más.'},
  {from: 585, to: 668, kind: 'dial', who: 'MARISOL', text: 'Esa puerta… nunca la había visto.'},
  {from: 776, to: 852, kind: 'narr', text: 'Mi abuela me escribió… cada semana.'},
];
const TALK: Record<string, [number, number][]> = {
  MARISOL: [[210, 288], [590, 664]],
  AURELIO: [[310, 404], [422, 474]],
};
const isTalking = (who: string, f: number) => TALK[who].some(([a, b]) => f >= a && f <= b);

/* ---------- Utilidades de cámara y escena ---------- */
const Cam: React.FC<{sc: number; tx?: number; ty?: number; ox?: number; oy?: number; rot?: number; children: React.ReactNode}> = ({sc, tx = 0, ty = 0, ox = W / 2, oy = H / 2, rot = 0, children}) => (
  <div style={{position: 'absolute', inset: 0, transformOrigin: `${ox}px ${oy}px`, transform: `translate(${tx}px, ${ty}px) scale(${sc}) rotate(${rot}deg)`}}>{children}</div>
);

const Scene: React.FC<{f: number; from: number; to: number; fadeIn?: boolean; children: React.ReactNode}> = ({f, from, to, fadeIn = true, children}) => {
  const pad = 8;
  if (f < from - pad || f > to + pad) return null;
  const op = interpolate(f, [from - pad, from, to, to + pad], [fadeIn ? 0 : 1, 1, 1, 0], clamp);
  return <AbsoluteFill style={{opacity: op}}>{children}</AbsoluteFill>;
};

const Sky: React.FC<{f: number; flash?: number}> = ({f, flash = 0}) => (
  <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#070a1c" />
        <stop offset="55%" stopColor="#1a2250" />
        <stop offset="100%" stopColor="#3a3460" />
      </linearGradient>
      <radialGradient id="moon" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fff6dc" /><stop offset="60%" stopColor="#fff6dc" stopOpacity=".25" /><stop offset="100%" stopColor="#fff6dc" stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#sky)" />
    {Array.from({length: 45}).map((_, i) => (
      <circle key={i} cx={random(`sx${i}`) * W} cy={random(`sy${i}`) * 760} r={1.5 + random(`sr${i}`) * 2.5} fill="#fff" opacity={0.3 + 0.5 * Math.abs(Math.sin(f / 18 + i))} />
    ))}
    <circle cx="930" cy="170" r="200" fill="url(#moon)" />
    <circle cx="930" cy="170" r="80" fill="#fff3d0" />
    <circle cx="905" cy="152" r="12" fill="#e8d6aa" />
    <circle cx="950" cy="196" r="17" fill="#e8d6aa" />
    {[0, 1, 2].map((i) => {
      const x = ((i * 520 + f * (0.6 + i * 0.25)) % (W + 700)) - 400;
      return <ellipse key={i} cx={x} cy={300 + i * 150} rx={360} ry={70} fill="#0b0f26" opacity={0.7} />;
    })}
    {/* colinas */}
    <path d={`M 0 1000 Q 240 880 520 960 Q 800 1030 1080 900 L 1080 1500 L 0 1500 Z`} fill="#0d1230" />
    <path d={`M 0 1120 Q 300 1020 600 1100 Q 860 1160 1080 1060 L 1080 1500 L 0 1500 Z`} fill="#121838" />
    {/* suelo */}
    <rect x="0" y="1700" width={W} height="220" fill="#0a0d20" />
    <ellipse cx="540" cy="1790" rx="700" ry="40" fill="#2a3a7a" opacity=".35" />
    {flash > 0 && <rect width={W} height={H} fill="#dfe8ff" opacity={flash} />}
  </svg>
);

/* ---------- Subtítulos ---------- */
const Subtitles: React.FC<{f: number}> = ({f}) => {
  const cue = CUES.find((c) => f >= c.from && f <= c.to);
  if (!cue) return null;
  const words = cue.text.split(' ');
  const t = f - cue.from;
  const total = cue.to - cue.from;
  const dur = Math.min(total * 0.7, words.length * 7);
  const inO = interpolate(f, [cue.from, cue.from + 6, cue.to - 6, cue.to], [0, 1, 1, 0], clamp);
  const isN = cue.kind === 'narr';
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 560, background: 'linear-gradient(to top, rgba(4,4,12,.9), rgba(4,4,12,0))', opacity: inO}}>
      <div style={{position: 'absolute', left: 70, right: 70, bottom: 210, textAlign: 'center'}}>
        {cue.who && (
          <div style={{display: 'inline-block', marginBottom: 18, padding: '8px 26px', borderRadius: 40, fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: 4,
            background: cue.who === 'MARISOL' ? '#e0a42c' : '#7fa88a', color: '#160d10'}}>
            {cue.who}
          </div>
        )}
        <div style={{fontFamily: isN ? 'Liberation Serif, serif' : 'DejaVu Sans, sans-serif', fontStyle: isN ? 'italic' : 'normal', fontWeight: isN ? 400 : 700, fontSize: isN ? 74 : 60, lineHeight: 1.25,
          color: '#fff8ea', textShadow: '0 4px 18px rgba(0,0,0,.9), 0 0 4px rgba(0,0,0,.9)'}}>
          {words.map((w, i) => {
            const a = interpolate(t, [i * (dur / words.length), i * (dur / words.length) + 8], [0, 1], clamp);
            return (
              <span key={i} style={{opacity: a, display: 'inline-block', transform: `translateY(${(1 - a) * 16}px)`, marginRight: 16}}>{w}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------- Llave ---------- */
const Key: React.FC<{x: number; y: number; rot: number; s?: number; glint?: number}> = ({x, y, rot, s = 1, glint = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <circle cx="-70" cy="0" r="34" fill="none" stroke="#6b4a12" strokeWidth="24" />
    <circle cx="-70" cy="0" r="34" fill="none" stroke="#e8b84a" strokeWidth="14" />
    <rect x="-40" y="-9" width="130" height="18" rx="6" fill="#e8b84a" stroke="#6b4a12" strokeWidth="5" />
    <rect x="62" y="6" width="14" height="36" fill="#e8b84a" stroke="#6b4a12" strokeWidth="5" />
    <rect x="86" y="6" width="14" height="26" fill="#e8b84a" stroke="#6b4a12" strokeWidth="5" />
    {glint > 0 && (
      <g transform="translate(-72 -28)" opacity={glint}>
        <path d="M 0 -34 L 6 -6 L 34 0 L 6 6 L 0 34 L -6 6 L -34 0 L -6 -6 Z" fill="#fffbe0" transform={`scale(${glint * 1.3})`} />
      </g>
    )}
  </g>
);

/* ---------- ESCENA 1: la casa ---------- */
const S1: React.FC<{f: number}> = ({f}) => {
  const flash = interpolate(f, [86, 88, 92, 96, 100, 104, 112], [0, 0.85, 0.1, 0.7, 0.05, 0.4, 0], clamp);
  const sc = interpolate(f, [0, 200], [1, 1.16], clamp);
  const wx = interpolate(f, [8, 175], [-120, 500], {...clamp, easing: Easing.inOut(Easing.sin)});
  const titleO = interpolate(f, [112, 132, 176, 196], [0, 1, 1, 0], clamp);
  const titleY = interpolate(f, [112, 150], [28, 0], {...clamp, easing: ease});
  return (
    <AbsoluteFill>
      <Cam sc={sc} ox={540} oy={1350} ty={interpolate(f, [0, 200], [60, -30], clamp)}>
        <Sky f={f} flash={flash} />
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <House frame={f} />
          <Walker frame={f} x={wx} y={1540} scale={1.15} />
          <Rain frame={f} w={W} h={H} count={170} opacity={0.4} />
        </svg>
      </Cam>
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: titleO, transform: `translateY(${titleY}px)`}}>
        <div style={{fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: 14, color: '#e0a42c'}}>SERIE ANIMADA · EP 1</div>
        <div style={{fontFamily: 'Liberation Serif, serif', fontWeight: 700, fontSize: 132, lineHeight: 1.0, color: '#fff3d8', marginTop: 26, textShadow: '0 6px 40px rgba(224,164,44,.55), 0 4px 0 #1a0f14'}}>
          LO QUE<br />CALLÓ<br />LA CASA
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- ESCENA 2: el porche ---------- */
const PorchBg: React.FC<{f: number}> = ({f}) => {
  const flick = 0.85 + Math.sin(f / 3.3) * 0.08 + Math.sin(f / 8) * 0.07;
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="pw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#233042" /><stop offset="100%" stopColor="#141a2a" /></linearGradient>
        <radialGradient id="lamp" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#ffd37a" stopOpacity=".95" /><stop offset="100%" stopColor="#ffb040" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#pw)" />
      {/* tablones */}
      {Array.from({length: 11}).map((_, i) => (
        <rect key={i} x={i * 100 - 20} y="0" width="100" height={H} fill={i % 2 ? '#1c2638' : '#202c40'} stroke="#0e1320" strokeWidth="4" />
      ))}
      {/* marco de puerta */}
      <rect x="150" y="240" width="780" height="1500" rx="10" fill="#2a1a10" stroke={'#120a06'} strokeWidth="10" />
      <rect x="205" y="300" width="670" height="1440" fill="#3d2616" stroke="#120a06" strokeWidth="8" />
      <rect x="260" y="360" width="560" height="560" fill="none" stroke="#1d110b" strokeWidth="8" />
      <rect x="260" y="990" width="560" height="620" fill="none" stroke="#1d110b" strokeWidth="8" />
      {/* farol */}
      <circle cx="170" cy="430" r={420} fill="url(#lamp)" opacity={0.55 * flick} />
      <rect x="140" y="360" width="60" height="110" rx="8" fill="#ffd37a" opacity={flick} stroke="#120a06" strokeWidth="6" />
      <path d="M 130 360 L 210 360 L 170 320 Z" fill="#120a06" />
      <rect x="0" y="1700" width={W} height="220" fill="#0e131f" />
    </svg>
  );
};

const KeyShot: React.FC<{f: number}> = ({f}) => {
  // f absoluto 418..480 : la llave viaja de Aurelio a Marisol
  const p = interpolate(f, [432, 462], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const x = interpolate(p, [0, 1], [760, 360]);
  const y = 1180 - Math.sin(p * Math.PI) * 120;
  const rot = interpolate(p, [0, 1], [-20, 14]);
  const g = interpolate(f, [440, 452, 464], [0, 1, 0], clamp);
  return <Key x={x} y={y} rot={rot} s={1.5} glint={g} />;
};

const S2: React.FC<{f: number}> = ({f}) => {
  const lastShot = f >= 418;
  const secondShot = f >= 300 && f < 418;
  const mTalk = isTalking('MARISOL', f);
  const aTalk = isTalking('AURELIO', f);

  let cam: React.ReactNode;
  if (f < 300) {
    const sc = interpolate(f, [195, 300], [1.0, 1.1], clamp);
    cam = (
      <Cam sc={sc} ox={540} oy={900}>
        <PorchBg f={f} />
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <Person who="marisol" frame={f} talk={mTalk} x={560} y={880} scale={2.0} facing={1} mood="worried" seed={1} />
          <Rain frame={f} w={W} h={H} count={90} opacity={0.35} />
        </svg>
      </Cam>
    );
  } else if (secondShot) {
    const sc = interpolate(f, [300, 418], [1.0, 1.1], clamp);
    cam = (
      <Cam sc={sc} ox={540} oy={900}>
        <PorchBg f={f} />
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <Person who="aurelio" frame={f} talk={aTalk} x={520} y={900} scale={2.0} facing={-1} mood="neutral" seed={2} />
          <Rain frame={f} w={W} h={H} count={90} opacity={0.35} />
        </svg>
      </Cam>
    );
  } else {
    const sc = interpolate(f, [418, 480], [1.0, 1.06], clamp);
    cam = (
      <Cam sc={sc} ox={540} oy={900}>
        <PorchBg f={f} />
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <Person who="marisol" frame={f} talk={false} x={250} y={960} scale={1.15} facing={1} mood="worried" seed={1} />
          <Person who="aurelio" frame={f} talk={aTalk} x={830} y={980} scale={1.15} facing={-1} mood="neutral" seed={2} />
          <KeyShot f={f} />
          <Rain frame={f} w={W} h={H} count={90} opacity={0.35} />
        </svg>
      </Cam>
    );
  }
  void lastShot;
  return <AbsoluteFill>{cam}</AbsoluteFill>;
};

/* ---------- ESCENA 3: el pasillo ---------- */
const Corridor: React.FC<{f: number; open: number}> = ({f, open}) => {
  const vx = 540, vy = 860;
  const flick = (k: number) => 0.8 + Math.sin(f / 3 + k) * 0.1 + Math.sin(f / 9 + k * 2) * 0.1;
  const doorW = 300 * (1 - open * 0.92);
  const glow = 0.25 + Math.sin(f / 14) * 0.1;
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a1018" /><stop offset="100%" stopColor="#3a2418" /></linearGradient>
        <radialGradient id="sc" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#ffb85a" stopOpacity=".9" /><stop offset="100%" stopColor="#ff9a3c" stopOpacity="0" /></radialGradient>
        <linearGradient id="room" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ffe3a0" /><stop offset="100%" stopColor="#ffb85a" /></linearGradient>
      </defs>
      <rect width={W} height={H} fill="#140c14" />
      {/* techo */}
      <path d={`M 0 0 L ${W} 0 L ${vx + 190} ${vy - 160} L ${vx - 190} ${vy - 160} Z`} fill="#1c1220" />
      {/* piso */}
      <path d={`M 0 ${H} L ${W} ${H} L ${vx + 190} ${vy + 190} L ${vx - 190} ${vy + 190} Z`} fill="url(#fl)" />
      {Array.from({length: 9}).map((_, i) => {
        const t = i / 9;
        const y = vy + 190 + (H - vy - 190) * t * t;
        return <path key={i} d={`M ${vx - 190 + (-540 - -190) * t * t} ${y} H ${vx + 190 + (540 - 190) * t * t}`} stroke="#0d0709" strokeWidth={2 + t * 8} />;
      })}
      {/* paredes con papel tapiz */}
      <path d={`M 0 0 L ${vx - 190} ${vy - 160} L ${vx - 190} ${vy + 190} L 0 ${H} Z`} fill="#3d2a3a" />
      <path d={`M ${W} 0 L ${vx + 190} ${vy - 160} L ${vx + 190} ${vy + 190} L ${W} ${H} Z`} fill="#3d2a3a" />
      {Array.from({length: 7}).map((_, i) => {
        const t = (i + 1) / 8;
        const xl = (vx - 190) * (1 - t) + 0 * t;
        const xr = (vx + 190) * (1 - t) + W * t;
        const ytop = (vy - 160) * (1 - t);
        const ybot = (vy + 190) * (1 - t) + H * t;
        return (
          <g key={i} opacity=".55">
            <path d={`M ${xl} ${ytop} L ${xl} ${ybot}`} stroke="#241624" strokeWidth={3 + t * 10} />
            <path d={`M ${xr} ${ytop} L ${xr} ${ybot}`} stroke="#241624" strokeWidth={3 + t * 10} />
          </g>
        );
      })}
      {/* zócalo */}
      <path d={`M 0 ${H - 90} L ${vx - 190} ${vy + 120} L ${vx - 190} ${vy + 190} L 0 ${H} Z`} fill="#2a1a20" />
      <path d={`M ${W} ${H - 90} L ${vx + 190} ${vy + 120} L ${vx + 190} ${vy + 190} L ${W} ${H} Z`} fill="#2a1a20" />
      {/* muro del fondo */}
      <rect x={vx - 190} y={vy - 160} width="380" height="350" fill="#3d2a3a" />
      {/* cuadros */}
      <rect x="120" y="760" width="120" height="170" fill="#1a1015" stroke="#c9a05a" strokeWidth="8" transform="skewY(-8)" />
      <rect x="840" y="610" width="120" height="170" fill="#1a1015" stroke="#c9a05a" strokeWidth="8" transform="skewY(8)" />
      {/* velas / apliques */}
      {[[250, 640, 0.5], [830, 640, 0.5]].map(([x, y, s], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={190 * (s as number) * 1.4} fill="url(#sc)" opacity={flick(i) * 0.55} />
          <rect x={(x as number) - 12} y={y} width="24" height="50" rx="4" fill="#c9a05a" />
          <ellipse cx={x} cy={(y as number) - 6} rx="10" ry={18 * flick(i)} fill="#ffd37a" />
        </g>
      ))}
      {/* puerta secreta */}
      <g>
        <rect x={vx - 150} y={vy - 90} width="300" height="280" fill="#0b0508" opacity={open > 0 ? 1 : 0} />
        {open > 0 && (
          <g>
            <rect x={vx - 150} y={vy - 90} width="300" height="280" fill="url(#room)" opacity={Math.min(1, open * 1.5)} />
            {/* cartas dentro */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x={vx - 130 + i * 44} y={vy + 40 + (i % 2) * 36} width="36" height="24" fill="#fff0cc" stroke="#6b4a12" strokeWidth="2" transform={`rotate(${(i - 3) * 6} ${vx - 112 + i * 44} ${vy + 52})`} />
            ))}
          </g>
        )}
        <rect x={vx - 150} y={vy - 90} width={doorW} height="280" fill="#3d2a3a" stroke={`rgba(255,200,110,${glow + open * 0.3})`} strokeWidth="6" />
        {open === 0 && <rect x={vx - 150} y={vy - 90} width="300" height="280" fill="none" stroke="#ffd37a" strokeWidth="4" opacity={glow} />}
        {/* ranura de luz alrededor */}
        {open > 0 && <rect x={vx - 150} y={vy - 90} width="300" height="280" fill="none" stroke="#fff3c0" strokeWidth="3" opacity=".7" />}
      </g>
      {/* haz de luz hacia el pasillo */}
      {open > 0 && (
        <path d={`M ${vx - 150} ${vy + 190} L ${vx + 150} ${vy + 190} L ${vx + 520} ${H} L ${vx - 520} ${H} Z`} fill="#ffd37a" opacity={open * 0.16} />
      )}
    </svg>
  );
};

const BackFigure: React.FC<{f: number; x: number; y: number; s: number}> = ({f, x, y, s}) => {
  const sway = Math.sin(f / 9) * 5;
  return (
    <g transform={`translate(${x + sway} ${y}) scale(${s})`}>
      <path d="M -190 560 L -170 262 Q -150 200 -70 188 L 70 188 Q 150 200 170 262 L 190 560 Z" fill="#c78d22" stroke="#120a06" strokeWidth="6" strokeLinejoin="round" />
      <path d="M -42 130 L -46 210 Q 0 250 46 210 L 42 130 Z" fill="#c98c66" stroke="#120a06" strokeWidth="5" />
      <ellipse cx="0" cy="0" rx="112" ry="132" fill="#14101a" stroke="#120a06" strokeWidth="6" />
      <path d="M 0 -40 Q 8 120 0 520" stroke="#14101a" strokeWidth="60" fill="none" strokeLinecap="round" />
      <path d="M 0 -40 Q 8 120 0 520" stroke="#3a2c4a" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="26 24" />
      <circle cx="0" cy="528" r="15" fill="#c0392b" />
    </g>
  );
};

const S3: React.FC<{f: number}> = ({f}) => {
  const open = interpolate(f, [706, 760], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const sc = interpolate(f, [480, 700, 765], [1.0, 1.35, 1.7], {...clamp, easing: Easing.inOut(Easing.quad)});
  const clickFlash = interpolate(f, [696, 698, 706], [0, 0.35, 0], clamp);
  const shake = f > 696 && f < 712 ? Math.sin(f * 6) * 6 : 0;
  const walkY = interpolate(f, [480, 640], [1500, 1380], {...clamp, easing: Easing.out(Easing.sin)});
  const keyP = interpolate(f, [650, 690], [0, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill>
      <Cam sc={sc} ox={540} oy={860} tx={shake}>
        <Corridor f={f} open={open} />
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <BackFigure f={f} x={540} y={walkY} s={0.78 - interpolate(f, [480, 640], [0, 0.1], clamp)} />
          {/* llave y brillo cerca de la cerradura */}
          {f >= 650 && f < 712 && <Key x={540 + 150 - keyP * 20} y={900} rot={-90} s={0.36 + keyP * 0.12} glint={interpolate(f, [680, 696, 706], [0, 1, 0], clamp)} />}
        </svg>
      </Cam>
      <div style={{position: 'absolute', inset: 0, background: '#ffe8b0', opacity: clickFlash}} />
      <div style={{position: 'absolute', inset: 0, background: '#ffcf70', mixBlendMode: 'screen', opacity: open * 0.28}} />
    </AbsoluteFill>
  );
};

/* ---------- ESCENA 4: las cartas ---------- */
const S4: React.FC<{f: number}> = ({f}) => {
  const e = f - 765;
  // Fase A: reveal de la habitación (765-858)  Fase B: carta (858-1008)  Fase C: cartel final (1015+)
  const roomO = interpolate(f, [858, 884], [1, 0.18], clamp);
  const paperIn = interpolate(f, [858, 892], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
  const line1 = interpolate(f, [894, 928], [0, 1], clamp);
  const hit = f >= 940;
  const shakeAmt = interpolate(f, [940, 962], [26, 0], clamp);
  const sx = hit ? Math.sin(f * 7.3) * shakeAmt : 0;
  const sy = hit ? Math.cos(f * 6.1) * shakeAmt * 0.7 : 0;
  const stamp = interpolate(f, [940, 948], [2.6, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const stampO = interpolate(f, [940, 944], [0, 1], clamp);
  const underline = interpolate(f, [950, 982], [0, 1], clamp);
  const redFlash = interpolate(f, [940, 944, 970], [0, 0.55, 0.0], clamp);
  const redTint = hit ? interpolate(f, [944, 990], [0.0, 0.22], clamp) : 0;
  const blackO = interpolate(f, [1004, 1014], [0, 1], clamp);
  const endO = interpolate(f, [1022, 1044, 1070, 1080], [0, 1, 1, 1], clamp);
  const sc = interpolate(f, [765, 858], [1.15, 1.0], {...clamp, easing: ease});
  return (
    <AbsoluteFill>
      <Cam sc={1} tx={sx} ty={sy}>
        {/* habitación */}
        <div style={{position: 'absolute', inset: 0, opacity: roomO}}>
          <Cam sc={sc} ox={540} oy={900}>
            <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
              <defs>
                <radialGradient id="warm" cx="50%" cy="45%" r="70%"><stop offset="0%" stopColor="#7a4a22" /><stop offset="100%" stopColor="#1c1016" /></radialGradient>
                <radialGradient id="beam" cx="50%" cy="0%" r="90%"><stop offset="0%" stopColor="#ffe3a0" stopOpacity=".8" /><stop offset="100%" stopColor="#ffe3a0" stopOpacity="0" /></radialGradient>
              </defs>
              <rect width={W} height={H} fill="url(#warm)" />
              {/* estantes */}
              {[0, 1].map((side) => (
                <g key={side}>
                  {[0, 1, 2, 3].map((r) => (
                    <g key={r}>
                      <rect x={side ? 800 : 0} y={330 + r * 330} width="280" height="18" fill="#2c1a10" stroke="#120a06" strokeWidth="4" />
                      {Array.from({length: 6}).map((_, k) => (
                        <rect key={k} x={(side ? 810 : 14) + k * 44} y={330 + r * 330 - 92 + (k % 3) * 5} width="36" height={88 - (k % 3) * 5} fill={k % 2 ? '#e8d2a0' : '#f4e4bd'} stroke="#6b4a12" strokeWidth="3" />
                      ))}
                    </g>
                  ))}
                </g>
              ))}
              <path d="M 340 0 L 740 0 L 980 1700 L 100 1700 Z" fill="url(#beam)" opacity=".5" />
              {/* cartas flotando */}
              {Array.from({length: 26}).map((_, i) => {
                const px = 90 + random(`lx${i}`) * 900;
                const py = 260 + random(`ly${i}`) * 1100;
                const bob = Math.sin((f + i * 17) / 24) * 20;
                const drift = Math.cos((f + i * 11) / 40) * 12;
                const rise = interpolate(e, [0, 70], [160, 0], {...clamp, easing: ease}) * (0.4 + random(`lr${i}`));
                return <Letter key={i} x={px + drift} y={py + bob + rise} rot={(random(`lt${i}`) - 0.5) * 50 + Math.sin((f + i) / 30) * 6} s={0.6 + random(`ls${i}`) * 0.6} shade={random(`lc${i}`)} />;
              })}
              {/* polvo */}
              {Array.from({length: 40}).map((_, i) => (
                <circle key={i} cx={(random(`dx${i}`) * W + f * 0.4 * (0.5 + random(`dv${i}`))) % W} cy={(random(`dy${i}`) * H - f * (0.3 + random(`dw${i}`) * 0.7) + H * 2) % H} r={2 + random(`dr${i}`) * 4} fill="#ffe9b0" opacity={0.25 + random(`do${i}`) * 0.4} />
              ))}
              <Person who="marisol" frame={f} talk={false} x={540} y={1180} scale={1.55} facing={1} mood="shock" seed={1} />
            </svg>
          </Cam>
        </div>

        {/* carta */}
        {f >= 856 && (
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{width: 800, height: 1040, transform: `translateY(${(1 - paperIn) * 400}px) rotate(${-2 + (1 - paperIn) * 8}deg) scale(${0.8 + paperIn * 0.2})`, opacity: paperIn,
              background: 'linear-gradient(160deg,#f6e7c3,#e4cd98)', borderRadius: 10, boxShadow: '0 30px 90px rgba(0,0,0,.7), inset 0 0 80px rgba(120,70,20,.35)', position: 'relative', overflow: 'hidden', border: '4px solid #2a1810'}}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} style={{position: 'absolute', left: 60, right: 60, top: 200 + i * 80, height: 2, background: 'rgba(60,35,15,.25)'}} />
              ))}
              <div style={{position: 'absolute', left: 70, top: 90, fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 76, color: '#2a1810', overflow: 'hidden', whiteSpace: 'nowrap', width: line1 * 700}}>
                Mi querida Marisol,
              </div>
              <div style={{position: 'absolute', left: 70, top: 300, fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 50, color: '#4a3020', opacity: interpolate(f, [920, 936], [0, 0.9], clamp)}}>
                antes de que sigas leyendo…
              </div>
              {/* sello */}
              <div style={{position: 'absolute', right: 70, bottom: 70, width: 110, height: 110, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #d4374e, #7e0f22)', boxShadow: '0 6px 14px rgba(0,0,0,.5)', border: '4px solid #4a0914'}} />
              {/* línea fuerte */}
              <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', opacity: stampO, transform: `scale(${stamp}) rotate(-3deg)`}}>
                <div style={{fontFamily: 'DejaVu Serif, serif', fontWeight: 700, fontSize: 110, lineHeight: 1.05, color: '#a3101f', textShadow: '0 3px 0 rgba(0,0,0,.25)'}}>
                  NO CONFÍES<br />EN TOMÁS
                </div>
                <div style={{margin: '10px auto 0', height: 10, width: 560 * underline, background: '#a3101f', borderRadius: 6}} />
              </div>
            </div>
          </div>
        )}
      </Cam>
      <div style={{position: 'absolute', inset: 0, background: '#ff2a3c', opacity: redFlash, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', inset: 0, background: '#7a0414', opacity: redTint, mixBlendMode: 'multiply'}} />
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: blackO}} />
      {f >= 1014 && (
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: endO, textAlign: 'center'}}>
          <div style={{fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 36, letterSpacing: 14, color: '#e0a42c'}}>LO QUE CALLÓ LA CASA</div>
          <div style={{fontFamily: 'Liberation Serif, serif', fontWeight: 700, fontSize: 150, color: '#fff3d8', marginTop: 24}}>EPISODIO 2</div>
          <div style={{fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 58, color: '#d8c9a8', marginTop: 40, lineHeight: 1.3}}>Mañana, a esta hora.<br />Sígueme para no perdértelo.</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ---------- Episodio ---------- */
export const Ep1: React.FC = () => {
  const f = useCurrentFrame();
  const tagO = interpolate(f, [196, 214], [0, 0.9], clamp) * (f > 1004 ? 0 : 1);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Scene f={f} from={0} to={195} fadeIn={false}><S1 f={f} /></Scene>
      <Scene f={f} from={195} to={480}><S2 f={f} /></Scene>
      <Scene f={f} from={480} to={765}><S3 f={f} /></Scene>
      <Scene f={f} from={765} to={1080}><S4 f={f} /></Scene>
      <FilmOverlay frame={f} vignette={0.8} tint={f >= 195 && f < 480 ? 'rgba(20,40,90,.12)' : f >= 480 ? 'rgba(80,40,0,.08)' : undefined} />
      {/* rótulo de serie */}
      <div style={{position: 'absolute', left: 54, top: 70, opacity: tagO, fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: 6, color: '#fff3d8', textShadow: '0 2px 8px #000'}}>
        <span style={{color: '#e0a42c'}}>●</span> EP 1 / 8
      </div>
      {f < 1004 && <Subtitles f={f} />}
    </AbsoluteFill>
  );
};
