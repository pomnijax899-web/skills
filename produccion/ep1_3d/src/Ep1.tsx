import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {Character, Key3D, RainFx, smooth, seg, mix} from './kit3d';
import {HouseExterior, Hall, LetterRoom, HX} from './world';

const W = 1080;
const H = 1920;
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
type V3 = [number, number, number];

/* ---------- Guion ---------- */
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
const TALK: Record<string, [number, number][]> = {MARISOL: [[210, 288], [590, 664]], AURELIO: [[310, 404], [422, 474]]};
const talking = (who: string, f: number) => TALK[who].some(([a, b]) => f >= a && f <= b);

/* ---------- Cámara ---------- */
type Key = {f: number; pos: V3; look: V3; fov: number};
const track = (f: number, keys: Key[]): Key => {
  if (f <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (f <= b.f) {
      const t = smooth(seg(f, a.f, b.f));
      const l = (x: V3, y: V3): V3 => [mix(x[0], y[0], t), mix(x[1], y[1], t), mix(x[2], y[2], t)];
      return {f, pos: l(a.pos, b.pos), look: l(a.look, b.look), fov: mix(a.fov, b.fov, t)};
    }
  }
  return keys[keys.length - 1];
};

const Rig: React.FC<{k: Key; shake?: [number, number]}> = ({k, shake = [0, 0]}) => {
  const {camera} = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(k.pos[0] + shake[0], k.pos[1] + shake[1], k.pos[2]);
  c.up.set(0, 1, 0);
  c.lookAt(k.look[0] + shake[0], k.look[1] + shake[1], k.look[2]);
  c.fov = k.fov;
  c.near = 0.05;
  c.far = 200;
  c.updateProjectionMatrix();
  return null;
};

const cameraFor = (f: number): Key => {
  if (f < 195)
    return track(f, [
      {f: 0, pos: [-1.2, 2.4, 25], look: [0, 2.4, 1], fov: 46},
      {f: 195, pos: [1.8, 1.6, 12.5], look: [0.1, 1.9, 2.6], fov: 46},
    ]);
  if (f < 300)
    return track(f, [
      {f: 195, pos: [1.0, 1.72, 5.6], look: [-0.62, 1.62, 3.1], fov: 30},
      {f: 300, pos: [0.85, 1.7, 5.3], look: [-0.62, 1.62, 3.1], fov: 28},
    ]);
  if (f < 418)
    return track(f, [
      {f: 300, pos: [-1.0, 1.74, 5.6], look: [0.62, 1.64, 3.1], fov: 30},
      {f: 418, pos: [-0.85, 1.72, 5.3], look: [0.62, 1.64, 3.1], fov: 28},
    ]);
  if (f < 480)
    return track(f, [
      {f: 418, pos: [0.15, 1.5, 9.4], look: [0, 1.25, 3.1], fov: 36},
      {f: 480, pos: [0.1, 1.45, 8.6], look: [0, 1.25, 3.1], fov: 36},
    ]);
  if (f < 640)
    return track(f, [
      {f: 480, pos: [HX + 0.1, 1.6, 3.0], look: [HX, 1.25, -3.2], fov: 40},
      {f: 640, pos: [HX + 0.1, 1.6, -10.3], look: [HX, 1.3, -15.2], fov: 38},
    ]);
  if (f < 690)
    return track(f, [
      {f: 640, pos: [HX + 0.1, 1.6, -10.3], look: [HX, 1.3, -15.2], fov: 38},
      {f: 690, pos: [HX - 0.75, 1.5, -11.0], look: [HX - 0.3, 1.25, -13.9], fov: 32},
    ]);
  if (f < 706)
    return track(f, [
      {f: 690, pos: [HX - 0.8, 1.42, -11.7], look: [HX - 0.4, 1.28, -13.95], fov: 28},
      {f: 706, pos: [HX - 0.78, 1.42, -11.8], look: [HX - 0.4, 1.28, -13.95], fov: 25},
    ]);
  if (f < 765)
    return track(f, [
      {f: 706, pos: [HX - 0.7, 1.5, -10.4], look: [HX, 1.4, -15], fov: 44},
      {f: 765, pos: [HX, 1.5, -10.6], look: [HX, 1.5, -17], fov: 48},
    ]);
  if (f < 858)
    return track(f, [
      {f: 765, pos: [HX, 1.5, -10.6], look: [HX, 1.5, -17], fov: 48},
      {f: 858, pos: [HX, 1.5, -13.0], look: [HX, 1.6, -21], fov: 54},
    ]);
  return track(f, [
    {f: 858, pos: [HX + 0.35, 1.52, -14.9], look: [HX, 1.5, -17.2], fov: 32},
    {f: 1010, pos: [HX + 0.25, 1.5, -15.5], look: [HX, 1.5, -17.2], fov: 30},
  ]);
};

/* ---------- Escenas 3D ---------- */
const Exterior: React.FC<{f: number; lightning: number}> = ({f, lightning}) => {
  // Marisol camina hacia la casa
  const p = smooth(seg(f, 6, 192));
  const mPos: V3 = f < 195 ? [mix(-1.3, 0.1, p), p > 0.8 ? 0.0 : 0, mix(10, 4.7, p)] : [-0.65, 0.2, 3.1];
  const dist = p * 5.6;
  const phase = f < 195 ? (dist / 0.62) * Math.PI : 0;
  const m1 = f < 195;
  const keyP = smooth(seg(f, 430, 462));
  const aurLift = smooth(seg(f, 418, 436)) * (1 - smooth(seg(f, 462, 476)));
  const marLift = smooth(seg(f, 440, 458)) * (1 - smooth(seg(f, 468, 480)));
  const keyPos: V3 = [mix(0.28, -0.3, keyP), 1.18 - Math.sin(keyP * Math.PI) * 0.08, mix(3.45, 3.4, keyP)];
  const glint = f >= 432 && f < 470 ? 0.9 + Math.sin(f * 0.7) * 0.1 : 0;
  return (
    <>
      <color attach="background" args={[lightning > 0 ? '#2a3868' : '#0a1030']} />
      <fogExp2 attach="fog" args={['#0e1634', 0.022]} />
      <ambientLight color="#4a5a9a" intensity={0.5} />
      <directionalLight color="#9ab4ff" intensity={1.1} position={[-8, 16, -30]} />
      <directionalLight color="#7088d8" intensity={1.0} position={[-5, 9, 14]} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-bias={-0.0004} />
      {f >= 195 && <pointLight position={[-1.6, 2.2, 4.4]} color="#ffb070" intensity={22} distance={9} decay={2} castShadow />}
      {f >= 195 && <pointLight position={[2.2, 1.8, 6.5]} color="#6a80d8" intensity={5} distance={10} decay={2} />}
      {/* luna */}
      <mesh position={[-9, 15, -34]}><sphereGeometry args={[2.6, 32, 24]} /><meshBasicMaterial color="#fff3d0" fog={false} /></mesh>
      <mesh position={[-9, 15, -33]}><sphereGeometry args={[5.2, 32, 24]} /><meshBasicMaterial color="#fff3d0" transparent opacity={0.16} fog={false} /></mesh>
      <HouseExterior f={f} lightning={lightning} />
      <RainFx f={f} center={[f < 195 ? 0.3 : 0, 0, f < 195 ? 7 : 3.5]} count={f < 195 ? 1500 : 900} opacity={f < 195 ? 0.4 : 0.45} />
      {m1 ? (
        <Character who="marisol" scale={0.88} f={f} position={mPos} rotY={2.88} walk={phase} umbrella armR={[-0.15, 0.2]} />
      ) : (
        <>
          <Character who="marisol" scale={0.88} f={f} talk={talking('MARISOL', f)} mood="worried" position={[-0.65, 0.2, 3.1]} rotY={1.15} seed={1} armL={[-1.0 * marLift, 0.05]} elbowR={0.1} headYaw={-0.12} />
          <Character who="aurelio" scale={0.92} f={f} talk={talking('AURELIO', f)} position={[0.65, 0.2, 3.1]} rotY={-1.15} seed={2} armR={[-1.05 * aurLift + 0.05, 0.12]} elbowR={0.1 + 0.25 * aurLift} headYaw={0.1} />
          {f >= 418 && (
            <group position={keyPos} rotation={[0.3, 0.6, 1.2]}>
              <Key3D glint={glint} scale={1.4} />
            </group>
          )}
        </>
      )}
    </>
  );
};

const Interior: React.FC<{f: number; cam: Key}> = ({f, cam}) => {
  const open = smooth(seg(f, 706, 762));
  const rise = seg(f, 705, 880);
  const walkIn = f >= 480 && f < 640;
  let mPos: V3 = [HX, 0, -11.2];
  let rotY = Math.PI;
  let phase = 0;
  if (f < 640) {
    const p = smooth(seg(f, 484, 636));
    mPos = [HX - 0.2 * p, 0, mix(-0.4, -13.1, p)];
    phase = (p * 12.7 / 0.62) * Math.PI;
  } else if (f < 748) {
    mPos = [HX - 0.2, 0, -13.1];
  } else if (f < 858) {
    const p = smooth(seg(f, 748, 858));
    mPos = [HX - 0.2 + 0.2 * p, 0, mix(-13.1, -16.8, p)];
    phase = (p * 3.7 / 0.62) * Math.PI;
  } else {
    mPos = [HX, 0, -17.2];
    rotY = 0;
    phase = 0;
  }
  const arm = smooth(seg(f, 650, 686));
  const unlock = f >= 650 && f < 748;
  const glint = interpolate(f, [680, 696, 712], [0, 1, 0], clamp);
  const ss = f >= 858;
  const room = f >= 480;
  return (
    <>
      <color attach="background" args={['#0b060c']} />
      <fogExp2 attach="fog" args={['#140a14', 0.028]} />
      <ambientLight color="#4a3550" intensity={0.9} />
      <hemisphereLight args={['#8a6a88', '#2a1a20', 0.8]} />
      <pointLight position={[cam.pos[0] - 0.2, cam.pos[1] + 0.35, cam.pos[2] + 0.4]} color="#ffc890" intensity={f >= 858 ? 5 : 4.5} distance={6} decay={1.6} />
      <Hall f={f} open={open} seam={1} />
      <LetterRoom f={f} rise={rise} />
      {ss && <pointLight position={[HX + 0.6, 1.9, -15.2]} color="#ffe0b0" intensity={7} distance={5} decay={2} />}
      {room && (
        <Character who="marisol" scale={0.88} f={f} talk={talking('MARISOL', f)} mood={ss ? 'shock' : 'neutral'} position={mPos} rotY={rotY} walk={phase}
          armR={walkIn ? [0.05, 0.12] : [-1.6 * arm + 0.05, 0.14]} elbowR={walkIn ? 0.1 : 0.1 + 0.3 * arm} seed={1} headPitch={ss ? -0.05 : 0}>
          {unlock && (
            <group rotation={[0, 0, 0]} position={[0, -0.04, 0.0]}>
              <Key3D glint={glint} scale={1.25} />
            </group>
          )}
        </Character>
      )}
    </>
  );
};

/* ---------- Subtítulos y superposiciones ---------- */
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
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 560, background: 'linear-gradient(to top, rgba(4,4,12,.88), rgba(4,4,12,0))', opacity: inO}}>
      <div style={{position: 'absolute', left: 70, right: 70, bottom: 210, textAlign: 'center'}}>
        {cue.who && (
          <div style={{display: 'inline-block', marginBottom: 18, padding: '8px 26px', borderRadius: 40, fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: 4, background: cue.who === 'MARISOL' ? '#e0a42c' : '#7fa88a', color: '#160d10'}}>{cue.who}</div>
        )}
        <div style={{fontFamily: isN ? 'Liberation Serif, serif' : 'DejaVu Sans, sans-serif', fontStyle: isN ? 'italic' : 'normal', fontWeight: isN ? 400 : 700, fontSize: isN ? 74 : 60, lineHeight: 1.25, color: '#fff8ea', textShadow: '0 4px 18px rgba(0,0,0,.9), 0 0 4px rgba(0,0,0,.9)'}}>
          {words.map((w, i) => {
            const a = interpolate(t, [i * (dur / words.length), i * (dur / words.length) + 8], [0, 1], clamp);
            return <span key={i} style={{opacity: a, display: 'inline-block', transform: `translateY(${(1 - a) * 16}px)`, marginRight: 16}}>{w}</span>;
          })}
        </div>
      </div>
    </div>
  );
};

const Vignette: React.FC<{amt: number}> = ({amt}) => (
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 52%, rgba(0,0,0,${amt}) 100%)`, pointerEvents: 'none'}} />
);

const LetterOverlay: React.FC<{f: number}> = ({f}) => {
  const paperIn = interpolate(f, [858, 892], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
  const line1 = interpolate(f, [894, 928], [0, 1], clamp);
  const stamp = interpolate(f, [940, 948], [2.6, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const stampO = interpolate(f, [940, 944], [0, 1], clamp);
  const underline = interpolate(f, [950, 982], [0, 1], clamp);
  if (f < 856 || f > 1012) return null;
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: 800, height: 1040, transform: `translateY(${(1 - paperIn) * 400}px) rotate(${-2 + (1 - paperIn) * 8}deg) scale(${0.8 + paperIn * 0.2})`, opacity: paperIn,
        background: 'linear-gradient(160deg,#f6e7c3,#e4cd98)', borderRadius: 10, boxShadow: '0 30px 90px rgba(0,0,0,.7), inset 0 0 80px rgba(120,70,20,.35)', position: 'relative', overflow: 'hidden', border: '4px solid #2a1810'}}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} style={{position: 'absolute', left: 60, right: 60, top: 200 + i * 80, height: 2, background: 'rgba(60,35,15,.25)'}} />)}
        <div style={{position: 'absolute', left: 70, top: 90, fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 76, color: '#2a1810', overflow: 'hidden', whiteSpace: 'nowrap', width: line1 * 700}}>Mi querida Marisol,</div>
        <div style={{position: 'absolute', left: 70, top: 300, fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 50, color: '#4a3020', opacity: interpolate(f, [920, 936], [0, 0.9], clamp)}}>antes de que sigas leyendo…</div>
        <div style={{position: 'absolute', right: 70, bottom: 70, width: 110, height: 110, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #d4374e, #7e0f22)', boxShadow: '0 6px 14px rgba(0,0,0,.5)', border: '4px solid #4a0914'}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', opacity: stampO, transform: `scale(${stamp}) rotate(-3deg)`}}>
          <div style={{fontFamily: 'DejaVu Serif, serif', fontWeight: 700, fontSize: 110, lineHeight: 1.05, color: '#a3101f', textShadow: '0 3px 0 rgba(0,0,0,.25)'}}>NO CONFÍES<br />EN TOMÁS</div>
          <div style={{margin: '10px auto 0', height: 10, width: 560 * underline, background: '#a3101f', borderRadius: 6}} />
        </div>
      </div>
    </div>
  );
};

/* ---------- Episodio ---------- */
export const Ep1: React.FC = () => {
  const f = useCurrentFrame();
  const lightning = interpolate(f, [86, 88, 92, 96, 100, 104, 112], [0, 0.85, 0.1, 0.7, 0.05, 0.4, 0], clamp);
  const hit = f >= 940;
  const shakeAmt = interpolate(f, [940, 962], [0.07, 0], clamp);
  const shake: [number, number] = hit ? [Math.sin(f * 7.3) * shakeAmt, Math.cos(f * 6.1) * shakeAmt * 0.7] : [0, 0];
  const cam = cameraFor(f);
  // fundidos a negro en los cortes entre escenas
  const cuts = [195, 480, 765];
  const dip = Math.max(0, ...cuts.map((c) => 1 - Math.min(1, Math.abs(f - c) / 6)));
  const clickFlash = interpolate(f, [696, 698, 706], [0, 0.4, 0], clamp);
  const redFlash = interpolate(f, [940, 944, 970], [0, 0.55, 0], clamp);
  const redTint = hit ? interpolate(f, [944, 990], [0, 0.22], clamp) : 0;
  const blackO = interpolate(f, [1004, 1014], [0, 1], clamp);
  const endO = interpolate(f, [1022, 1044, 1070, 1080], [0, 1, 1, 1], clamp);
  const blur = interpolate(f, [856, 884], [0, 12], clamp);
  const titleO = interpolate(f, [112, 132, 176, 196], [0, 1, 1, 0], clamp);
  const titleY = interpolate(f, [112, 150], [28, 0], {...clamp, easing: Easing.bezier(0.22, 0.61, 0.36, 1)});
  const tagO = interpolate(f, [196, 214], [0, 0.9], clamp) * (f > 1004 ? 0 : 1);
  const interior = f >= 480;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `blur(${f >= 858 ? blur : 0}px) brightness(${f >= 858 ? 1 - blur * 0.03 : 1})`}}>
        <ThreeCanvas width={W} height={H} shadows camera={{fov: 40, position: [0, 1.5, 5], near: 0.05, far: 200}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: interior ? 1.15 : 1.25}} style={{width: W, height: H}}>
          <Rig k={cam} shake={shake} />
          {interior ? <Interior f={f} cam={cam} /> : <Exterior f={f} lightning={lightning} />}
        </ThreeCanvas>
      </AbsoluteFill>
      <Vignette amt={0.72} />
      <div style={{position: 'absolute', inset: 0, background: '#dfe8ff', opacity: f < 120 ? lightning * 0.35 : 0}} />
      <div style={{position: 'absolute', inset: 0, background: '#ffe8b0', opacity: clickFlash}} />
      <LetterOverlay f={f} />
      <div style={{position: 'absolute', inset: 0, background: '#ff2a3c', opacity: redFlash, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', inset: 0, background: '#7a0414', opacity: redTint, mixBlendMode: 'multiply'}} />
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: dip * 0.85}} />
      {/* título */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: titleO, transform: `translateY(${titleY}px)`}}>
        <div style={{fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: 14, color: '#e0a42c', textShadow: '0 2px 10px #000'}}>SERIE ANIMADA 3D · EP 1</div>
        <div style={{fontFamily: 'Liberation Serif, serif', fontWeight: 700, fontSize: 132, lineHeight: 1.0, color: '#fff3d8', marginTop: 26, textShadow: '0 6px 40px rgba(224,164,44,.55), 0 4px 0 #1a0f14'}}>LO QUE<br />CALLÓ<br />LA CASA</div>
      </div>
      <div style={{position: 'absolute', left: 54, top: 70, opacity: tagO, fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: 6, color: '#fff3d8', textShadow: '0 2px 8px #000'}}><span style={{color: '#e0a42c'}}>●</span> EP 1 / 8</div>
      {f < 1004 && <Subtitles f={f} />}
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
