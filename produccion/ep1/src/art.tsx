import React from 'react';
import {random} from 'remotion';

/* ---------- Personaje ilustrado (SVG, busto) ---------- */
export type Look = 'marisol' | 'aurelio';

type PersonProps = {
  who: Look;
  frame: number;
  talk: boolean;
  facing?: 1 | -1; // 1 = mira a la derecha
  mood?: 'neutral' | 'worried' | 'shock';
  x: number;
  y: number;
  scale?: number;
  seed?: number;
};

const OUT = '#1a0f14';

export const Person: React.FC<PersonProps> = ({who, frame, talk, facing = 1, mood = 'neutral', x, y, scale = 1, seed = 0}) => {
  const isM = who === 'marisol';
  const skin = isM ? '#e6b08a' : '#b7835a';
  const skinSh = isM ? '#c98c66' : '#946445';
  const breathe = Math.sin((frame + seed * 13) / 22) * 5;
  const tilt = Math.sin((frame + seed * 7) / 41) * 1.6;
  const blinkPhase = (frame + seed * 29) % 100;
  const blink = blinkPhase < 4 ? 0.1 : 1;
  const mouthOpen = talk ? 0.35 + Math.abs(Math.sin(frame * 0.85 + seed)) * 0.65 : 0;
  const look = 8 * facing;
  const browLift = mood === 'worried' ? -10 : mood === 'shock' ? -22 : 0;
  const eyeScale = mood === 'shock' ? 1.25 : 1;

  const mouth = () => {
    if (mouthOpen > 0.01) {
      const h = 6 + mouthOpen * 26;
      return (
        <g>
          <path d={`M -26 ${96} Q 0 ${96 + h * 1.1} 26 ${96} Q 0 ${96 - 6} -26 ${96} Z`} fill="#5a1620" stroke={OUT} strokeWidth="4" strokeLinejoin="round" />
          <path d={`M -16 ${96 + h * 0.75} Q 0 ${96 + h * 0.95} 16 ${96 + h * 0.75} Q 0 ${96 + h * 0.55} -16 ${96 + h * 0.75}Z`} fill="#c9525f" />
        </g>
      );
    }
    if (mood === 'worried') return <path d="M -20 100 Q 0 88 20 100" stroke={OUT} strokeWidth="5" fill="none" strokeLinecap="round" />;
    return <path d="M -20 96 Q 0 106 20 96" stroke={OUT} strokeWidth="5" fill="none" strokeLinecap="round" />;
  };

  const eye = (cx: number) => (
    <g transform={`translate(${cx + look * 0.5} 8)`}>
      <g transform={`scale(${eyeScale} ${blink * eyeScale})`}>
        <ellipse cx="0" cy="0" rx="25" ry="30" fill="#fffaf2" stroke={OUT} strokeWidth="4" />
        <ellipse cx={look * 0.9} cy="2" rx="15" ry="19" fill={isM ? '#3b2417' : '#2b2018'} />
        <ellipse cx={look * 0.9} cy="2" rx="8" ry="11" fill="#0b0608" />
        <circle cx={look * 0.9 - 5} cy="-6" r="5.5" fill="#fff" />
        <circle cx={look * 0.9 + 6} cy="8" r="2.5" fill="#fff" opacity=".8" />
      </g>
      {isM && <path d="M -26 -10 Q 0 -34 26 -10" stroke={OUT} strokeWidth="6" fill="none" strokeLinecap="round" />}
    </g>
  );

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`}>
      <g transform={`translate(0 ${breathe})`}>
        {/* pelo detrás */}
        {isM ? (
          <g>
            <ellipse cx="0" cy="-6" rx="128" ry="148" fill="#14101a" stroke={OUT} strokeWidth="5" />
            {/* trenza */}
            <g>
              <path d="M -70 120 Q -150 220 -120 400 Q -112 460 -92 500" stroke="#14101a" strokeWidth="64" fill="none" strokeLinecap="round" />
              <path d="M -70 120 Q -150 220 -120 400 Q -112 460 -92 500" stroke="#2a2030" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray="28 26" />
              <circle cx="-92" cy="508" r="16" fill="#c0392b" stroke={OUT} strokeWidth="4" />
            </g>
          </g>
        ) : null}

        {/* torso */}
        <g>
          <path d="M -190 560 L -170 262 Q -150 200 -70 188 L 70 188 Q 150 200 170 262 L 190 560 Z"
            fill={isM ? '#e0a42c' : '#f0e6d2'} stroke={OUT} strokeWidth="6" strokeLinejoin="round" />
          {isM ? (
            <g>
              <path d="M -110 220 Q 0 300 110 220" stroke="#b9801a" strokeWidth="14" fill="none" />
              {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} d={`M -170 ${330 + i * 48} Q 0 ${350 + i * 48} 170 ${330 + i * 48}`} stroke="#c88c1c" strokeWidth="6" fill="none" opacity=".5" />
              ))}
              <ellipse cx="-62" cy="440" rx="26" ry="15" fill="#b86a4a" opacity=".85" />
              <ellipse cx="70" cy="490" rx="20" ry="12" fill="#b86a4a" opacity=".7" />
            </g>
          ) : (
            <g>
              <path d="M -170 262 L -190 560 L -60 560 L -50 250 Z" fill="#6a4a30" stroke={OUT} strokeWidth="6" strokeLinejoin="round" />
              <path d="M 170 262 L 190 560 L 60 560 L 50 250 Z" fill="#6a4a30" stroke={OUT} strokeWidth="6" strokeLinejoin="round" />
              <path d="M -40 195 L 0 300 L 40 195" fill="#fff8ea" stroke={OUT} strokeWidth="5" />
              {[0, 1, 2].map((i) => (
                <circle key={i} cx={-55} cy={350 + i * 60} r="7" fill="#d9b370" stroke={OUT} strokeWidth="3" />
              ))}
            </g>
          )}
        </g>

        {/* cuello */}
        <path d="M -42 130 L -46 210 Q 0 250 46 210 L 42 130 Z" fill={skinSh} stroke={OUT} strokeWidth="5" strokeLinejoin="round" />

        <g transform={`rotate(${tilt})`}>
          {/* orejas */}
          <ellipse cx="-104" cy="28" rx="18" ry="26" fill={skin} stroke={OUT} strokeWidth="5" />
          <ellipse cx="104" cy="28" rx="18" ry="26" fill={skin} stroke={OUT} strokeWidth="5" />
          {/* cabeza */}
          <ellipse cx="0" cy="0" rx="104" ry="128" fill={skin} stroke={OUT} strokeWidth="6" />
          <ellipse cx="0" cy="104" rx="76" ry="34" fill={skinSh} opacity=".35" />
          <ellipse cx="74" cy="20" rx="28" ry="60" fill="#fff" opacity=".07" />

          {/* mejillas */}
          <ellipse cx="-62" cy="64" rx="24" ry="13" fill="#e2706a" opacity=".5" />
          <ellipse cx="62" cy="64" rx="24" ry="13" fill="#e2706a" opacity=".5" />

          {/* ojos y cejas */}
          {eye(-44)}
          {eye(44)}
          <path d={`M -72 ${-34 + browLift} Q -44 ${-52 + browLift} -16 ${-34 + browLift}`} stroke={isM ? '#14101a' : '#d8d4cc'} strokeWidth={isM ? 8 : 13} fill="none" strokeLinecap="round" />
          <path d={`M 16 ${-34 + browLift} Q 44 ${-52 + browLift} 72 ${-34 + browLift}`} stroke={isM ? '#14101a' : '#d8d4cc'} strokeWidth={isM ? 8 : 13} fill="none" strokeLinecap="round" />

          {/* nariz */}
          <path d={`M ${look * 0.4} 36 Q ${look * 0.4 + 12} 62 ${look * 0.4 - 4} 68`} stroke={OUT} strokeWidth="5" fill="none" strokeLinecap="round" />

          {/* boca */}
          <g transform={`translate(${look * 0.4} 0)`}>
            {!isM && (
              <path d="M -52 84 Q -26 70 0 84 Q 26 70 52 84 Q 28 106 0 94 Q -28 106 -52 84 Z" fill="#d8d4cc" stroke={OUT} strokeWidth="4" />
            )}
            {mouth()}
          </g>

          {/* arrugas */}
          {!isM && (
            <g stroke={OUT} strokeWidth="3" opacity=".5" fill="none" strokeLinecap="round">
              <path d="M -88 -6 Q -72 6 -84 22" />
              <path d="M 88 -6 Q 72 6 84 22" />
              <path d="M -30 -66 Q 0 -74 30 -66" />
            </g>
          )}

          {/* pelo frontal */}
          {isM ? (
            <g>
              <path d="M -112 -10 Q -118 -150 0 -150 Q 118 -150 112 -10 Q 100 -90 30 -96 Q -10 -40 -60 -64 Q -96 -62 -112 -10 Z" fill="#14101a" stroke={OUT} strokeWidth="5" strokeLinejoin="round" />
              <path d="M -60 -120 Q -10 -140 40 -118" stroke="#3d3050" strokeWidth="8" fill="none" strokeLinecap="round" opacity=".8" />
            </g>
          ) : (
            <g>
              {/* sombrero de paja */}
              <ellipse cx="0" cy="-84" rx="200" ry="34" fill="#d8b46a" stroke={OUT} strokeWidth="6" />
              <path d="M -100 -88 Q -104 -190 0 -192 Q 104 -190 100 -88 Q 0 -66 -100 -88 Z" fill="#e6c67e" stroke={OUT} strokeWidth="6" strokeLinejoin="round" />
              <path d="M -100 -100 Q 0 -80 100 -100 L 100 -118 Q 0 -98 -100 -118 Z" fill="#7a3b2a" stroke={OUT} strokeWidth="4" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path key={i} d={`M ${-170 + i * 60} -84 Q ${-150 + i * 60} -70 ${-130 + i * 60} -84`} stroke="#b08a44" strokeWidth="3" fill="none" />
              ))}
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

/* ---------- Lluvia ---------- */
export const Rain: React.FC<{frame: number; w: number; h: number; count?: number; opacity?: number; speed?: number}> = ({frame, w, h, count = 140, opacity = 0.35, speed = 1}) => (
  <g stroke="#bcd0ff" strokeWidth="3" strokeLinecap="round" opacity={opacity}>
    {Array.from({length: count}).map((_, i) => {
      const sx = random(`rx${i}`) * (w + 400) - 200;
      const sp = (28 + random(`rs${i}`) * 26) * speed;
      const len = 40 + random(`rl${i}`) * 60;
      const y = ((random(`ry${i}`) * h + frame * sp) % (h + 160)) - 80;
      const x = sx - (y / h) * 120;
      return <line key={i} x1={x} y1={y} x2={x - len * 0.22} y2={y + len} />;
    })}
  </g>
);

/* ---------- Casa en la noche ---------- */
export const House: React.FC<{frame: number}> = ({frame}) => {
  const flick = 0.82 + Math.sin(frame / 3.1) * 0.08 + Math.sin(frame / 7.7) * 0.1;
  const win = (x: number, y: number, lit: boolean, k = 1) => (
    <g>
      <rect x={x} y={y} width="110" height="150" rx="6" fill={lit ? '#ffcf70' : '#1a2540'} opacity={lit ? flick * k : 1} stroke={OUT} strokeWidth="6" />
      {lit && <rect x={x} y={y} width="110" height="150" fill="url(#glow)" opacity={0.6} />}
      <path d={`M ${x + 55} ${y} V ${y + 150} M ${x} ${y + 75} H ${x + 110}`} stroke={OUT} strokeWidth="6" />
      <rect x={x - 18} y={y - 6} width="18" height="162" rx="4" fill="#2c6a58" stroke={OUT} strokeWidth="4" />
      <rect x={x + 110} y={y - 6} width="18" height="162" rx="4" fill="#2c6a58" stroke={OUT} strokeWidth="4" />
    </g>
  );
  return (
    <g>
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#fff2c0" /><stop offset="100%" stopColor="#ff9a3c" stopOpacity="0" /></radialGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8a5a4e" /><stop offset="100%" stopColor="#5e3b3c" /></linearGradient>
      </defs>
      {/* piso superior */}
      <rect x="170" y="1010" width="740" height="320" fill="url(#wall)" stroke={OUT} strokeWidth="8" />
      {/* techo */}
      <path d="M 120 1020 L 540 820 L 960 1020 Z" fill="#7a2f2f" stroke={OUT} strokeWidth="8" strokeLinejoin="round" />
      {Array.from({length: 7}).map((_, i) => (
        <path key={i} d={`M ${180 + i * 100} ${1000 - i * 0} Q ${230 + i * 100} 990 ${280 + i * 100} 1000`} stroke="#4f1c20" strokeWidth="4" fill="none" opacity=".0" />
      ))}
      <rect x="470" y="880" width="140" height="110" rx="8" fill="#5a2020" stroke={OUT} strokeWidth="6" />
      {/* piso inferior */}
      <rect x="130" y="1330" width="820" height="360" fill="url(#wall)" stroke={OUT} strokeWidth="8" />
      <rect x="110" y="1320" width="860" height="26" fill="#d9c9a8" stroke={OUT} strokeWidth="6" />
      {win(230, 1100, false)}
      {win(738, 1100, true)}
      {win(200, 1420, false)}
      {win(770, 1420, false)}
      {/* puerta */}
      <rect x="440" y="1420" width="200" height="270" rx="8" fill="#3a2418" stroke={OUT} strokeWidth="8" />
      <rect x="465" y="1445" width="150" height="100" rx="4" fill="none" stroke="#1d110b" strokeWidth="5" />
      <rect x="465" y="1565" width="150" height="100" rx="4" fill="none" stroke="#1d110b" strokeWidth="5" />
      <circle cx="610" cy="1570" r="9" fill="#e0b050" />
      {/* farol */}
      <rect x="372" y="1470" width="22" height="46" fill="#ffcf70" opacity={flick} stroke={OUT} strokeWidth="4" />
      <circle cx="383" cy="1493" r="90" fill="url(#glow)" opacity={0.45 * flick} />
      {/* porche */}
      <rect x="90" y="1690" width="900" height="40" fill="#4a3228" stroke={OUT} strokeWidth="6" />
      {/* plantas */}
      <g transform="translate(60 1690)">
        {[-50, -25, 0, 25, 50].map((a, i) => (
          <path key={i} d={`M 0 0 Q ${a * 1.4} ${-150 - i * 8} ${a * 2.4} ${-210 + Math.abs(a)}`} stroke="#2f7a4c" strokeWidth="26" fill="none" strokeLinecap="round" />
        ))}
      </g>
      <g transform="translate(1030 1690) scale(-1 1)">
        {[-50, -25, 0, 25, 50].map((a, i) => (
          <path key={i} d={`M 0 0 Q ${a * 1.4} ${-170 - i * 6} ${a * 2.4} ${-240 + Math.abs(a)}`} stroke="#2f7a4c" strokeWidth="26" fill="none" strokeLinecap="round" />
        ))}
      </g>
    </g>
  );
};

/* ---------- Figura pequeña caminando (plano general) ---------- */
export const Walker: React.FC<{frame: number; x: number; y: number; scale?: number}> = ({frame, x, y, scale = 1}) => {
  const s = Math.sin(frame / 3.2);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="170" rx="70" ry="10" fill="#000" opacity=".35" />
      <g transform={`translate(0 ${Math.abs(s) * -5})`}>
        <path d={`M -10 90 L ${-18 + s * 22} 168`} stroke={OUT} strokeWidth="14" strokeLinecap="round" />
        <path d={`M 10 90 L ${18 - s * 22} 168`} stroke={OUT} strokeWidth="14" strokeLinecap="round" />
        <path d="M -30 20 Q -36 100 -34 100 L 34 100 Q 36 40 30 20 Q 0 0 -30 20 Z" fill="#e0a42c" stroke={OUT} strokeWidth="6" />
        <circle cx="0" cy="-8" r="26" fill="#e6b08a" stroke={OUT} strokeWidth="6" />
        <path d="M -26 -10 Q -30 -42 0 -42 Q 30 -42 26 -10 Q 10 -26 -26 -10Z" fill="#14101a" stroke={OUT} strokeWidth="4" />
        <path d="M -24 0 Q -40 60 -30 100" stroke="#14101a" strokeWidth="14" fill="none" strokeLinecap="round" />
        {/* paraguas */}
        <path d="M 10 28 L 10 -70" stroke={OUT} strokeWidth="6" />
        <path d="M -90 -60 Q 10 -150 110 -60 Q 80 -76 60 -62 Q 40 -78 10 -64 Q -20 -78 -40 -62 Q -62 -76 -90 -60 Z" fill="#8a1f3a" stroke={OUT} strokeWidth="6" strokeLinejoin="round" />
      </g>
    </g>
  );
};

/* ---------- Cartas flotando ---------- */
export const Letter: React.FC<{x: number; y: number; rot: number; s?: number; shade?: number}> = ({x, y, rot, s = 1, shade = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x="-70" y="-48" width="140" height="96" rx="4" fill={`hsl(40 ${50 - shade * 20}% ${86 - shade * 18}%)`} stroke={OUT} strokeWidth="4" />
    <path d="M -70 -48 L 0 6 L 70 -48" fill="none" stroke={OUT} strokeWidth="4" />
    <path d="M -70 48 L -18 4 M 70 48 L 18 4" stroke={OUT} strokeWidth="3" opacity=".6" />
    <circle cx="0" cy="6" r="10" fill="#9b1b2e" stroke={OUT} strokeWidth="3" />
  </g>
);

/* ---------- Ruido de película + viñeta ---------- */
export const FilmOverlay: React.FC<{frame: number; vignette?: number; tint?: string}> = ({frame, vignette = 0.75, tint}) => (
  <>
    <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <defs>
        <radialGradient id="vig" cx="50%" cy="48%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity={vignette} />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#vig)" />
      {tint && <rect width="1080" height="1920" fill={tint} />}
    </svg>
    <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.18}}>
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(frame / 2) % 40} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="1080" height="1920" filter="url(#n)" />
    </svg>
  </>
);
