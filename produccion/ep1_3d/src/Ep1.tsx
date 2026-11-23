import React from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing, Audio, staticFile} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {Character, Key3D, RainFx, smooth, seg, mix} from './kit3d';
import {HouseExterior, Hall, LetterRoom, HX} from './world';
import TLraw from './timeline.json';

const W = 1080;
const H = 1920;
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
type V3 = [number, number, number];
type Cue = {from: number; to: number; who?: string | null; text: string; kind: 'narr' | 'dial'};
const TL = TLraw as unknown as {total: number; f: Record<string, number>; cues: Cue[]; env: Record<string, number[]>};
export const TOTAL = TL.total;
const F = TL.f;

/* voz -> boca y gestos */
const mouthOf = (who: string, f: number) => TL.env[who][f] ?? 0;
const gestureOf = (who: string, f: number) => {
  let s = 0;
  for (let k = -8; k <= 8; k++) s += TL.env[who][f + k] ?? 0;
  return Math.min(1, (s / 17) * 1.3);
};

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
  // cámara en mano muy sutil
  const hx = Math.sin(k.f / 13.7) * 0.006 + Math.sin(k.f / 5.3) * 0.002;
  const hy = Math.sin(k.f / 17.1) * 0.005 + Math.cos(k.f / 6.1) * 0.0015;
  c.position.set(k.pos[0] + shake[0] + hx, k.pos[1] + shake[1] + hy, k.pos[2]);
  c.up.set(0, 1, 0);
  c.lookAt(k.look[0] + shake[0] + hx * 0.5, k.look[1] + shake[1] + hy * 0.5, k.look[2]);
  c.fov = k.fov;
  c.near = 0.05;
  c.far = 200;
  c.updateProjectionMatrix();
  return null;
};

const keyOn = (f: number) => F.key_b + 12;

const cameraFor = (f: number): Key => {
  if (f < F.s1_end)
    return track(f, [
      {f: 0, pos: [-1.2, 2.6, 25], look: [0, 2.4, 1], fov: 46},
      {f: F.title_in, pos: [0.2, 2.0, 18], look: [0, 2.6, 1.5], fov: 46},
      {f: F.s1_end, pos: [1.8, 1.6, 12.0], look: [0.1, 1.9, 2.6], fov: 46},
    ]);
  if (f < F.s2a_end)
    return track(f, [
      {f: F.s1_end, pos: [1.05, 1.72, 5.7], look: [-0.62, 1.62, 3.1], fov: 30},
      {f: F.s2a_end, pos: [0.85, 1.7, 5.25], look: [-0.62, 1.62, 3.1], fov: 27},
    ]);
  if (f < F.s2b_end)
    return track(f, [
      {f: F.s2a_end, pos: [-1.05, 1.74, 5.7], look: [0.62, 1.64, 3.1], fov: 30},
      {f: F.s2b_end, pos: [-0.85, 1.72, 5.25], look: [0.62, 1.64, 3.1], fov: 27},
    ]);
  if (f < keyOn(f))
    return track(f, [
      {f: F.s2b_end, pos: [0.15, 1.5, 9.4], look: [0, 1.25, 3.1], fov: 36},
      {f: keyOn(f), pos: [0.1, 1.42, 8.0], look: [0, 1.2, 3.1], fov: 34},
    ]);
  if (f < F.s2_end)
    return track(f, [
      {f: keyOn(f), pos: [-0.55, 1.25, 4.9], look: [0.62, 1.72, 3.1], fov: 30},
      {f: F.s2_end, pos: [-0.4, 1.3, 4.5], look: [0.62, 1.72, 3.1], fov: 26},
    ]);
  if (f < F.walk_b)
    return track(f, [
      {f: F.s2_end, pos: [HX + 0.1, 1.6, 3.0], look: [HX, 1.25, -3.2], fov: 40},
      {f: F.walk_b, pos: [HX + 0.1, 1.6, -10.3], look: [HX, 1.3, -15.2], fov: 38},
    ]);
  if (f < F.insert)
    return track(f, [
      {f: F.walk_b, pos: [HX + 0.1, 1.6, -10.3], look: [HX, 1.3, -15.2], fov: 38},
      {f: F.arm_a, pos: [HX + 0.75, 1.62, -10.7], look: [HX - 0.25, 1.4, -13.6], fov: 34},
      {f: F.insert, pos: [HX - 0.75, 1.5, -11.0], look: [HX - 0.3, 1.25, -13.9], fov: 32},
    ]);
  if (f < F.open_a)
    return track(f, [
      {f: F.insert, pos: [HX - 0.8, 1.42, -11.7], look: [HX - 0.4, 1.28, -13.95], fov: 28},
      {f: F.open_a, pos: [HX - 0.78, 1.42, -11.8], look: [HX - 0.4, 1.28, -13.95], fov: 25},
    ]);
  if (f < F.s3_end)
    return track(f, [
      {f: F.open_a, pos: [HX - 0.7, 1.55, -10.4], look: [HX, 1.4, -15], fov: 44},
      {f: F.s3_end, pos: [HX, 1.5, -10.6], look: [HX, 1.5, -17], fov: 48},
    ]);
  if (f < F.s4_close)
    return track(f, [
      {f: F.s3_end, pos: [HX, 1.5, -10.6], look: [HX, 1.5, -17], fov: 48},
      {f: F.s4_close, pos: [HX, 1.55, -13.0], look: [HX, 1.75, -21], fov: 54},
    ]);
  return track(f, [
    {f: F.s4_close, pos: [HX + 0.35, 1.52, -14.9], look: [HX, 1.52, -17.2], fov: 32},
    {f: F.paper_in, pos: [HX + 0.28, 1.52, -15.4], look: [HX, 1.52, -17.2], fov: 30},
    {f: F.black, pos: [HX + 0.2, 1.5, -15.7], look: [HX, 1.5, -17.2], fov: 28},
  ]);
};

/* ---------- Escenas 3D ---------- */
const Exterior: React.FC<{f: number; lightning: number}> = ({f, lightning}) => {
  const m1 = f < F.s1_end;
  const p = smooth(seg(f, 6, F.s1_end - 8));
  const mPos: V3 = [mix(-1.3, 0.1, p), 0, mix(10, 4.7, p)];
  const phase = (p * 5.6 / 0.62) * Math.PI;
  const keyP = smooth(seg(f, F.key_a, F.key_b));
  const aurLift = smooth(seg(f, F.s2b_end, F.key_a + 6)) * (1 - smooth(seg(f, F.key_b, F.key_b + 14)));
  const marLift = smooth(seg(f, F.key_a + 10, F.key_b)) * (1 - smooth(seg(f, F.key_b + 30, F.key_b + 50)));
  const keyPos: V3 = [mix(0.28, -0.3, keyP), 1.18 - Math.sin(keyP * Math.PI) * 0.08, mix(3.45, 3.4, keyP)];
  const glint = f >= F.key_a && f < F.key_b + 10 ? 0.9 + Math.sin(f * 0.7) * 0.1 : 0;
  const aurClose = f >= keyOn(f);
  return (
    <>
      <color attach="background" args={[lightning > 0.2 ? '#2a3868' : '#0a1030']} />
      <fogExp2 attach="fog" args={['#0e1634', 0.022]} />
      <ambientLight color="#4a5a9a" intensity={0.5} />
      <directionalLight color="#9ab4ff" intensity={1.1} position={[-8, 16, -30]} />
      <directionalLight color="#7088d8" intensity={1.0} position={[-5, 9, 14]} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-bias={-0.0004} />
      {!m1 && <spotLight position={[-1.8, 2.6, 4.6]} target-position={[0, 1.4, 3]} color="#ffb070" intensity={40} angle={0.8} penumbra={0.7} distance={10} decay={2} castShadow />}
      {!m1 && <pointLight position={[2.2, 1.8, 6.5]} color="#6a80d8" intensity={5} distance={10} decay={2} />}
      {!m1 && <pointLight position={[1.2, 2.2, 1.6]} color="#8aa6ff" intensity={3} distance={4} decay={2} />}
      <mesh position={[-9, 15, -34]}><sphereGeometry args={[2.6, 32, 24]} /><meshBasicMaterial color="#fff3d0" fog={false} /></mesh>
      <mesh position={[-9, 15, -33]}><sphereGeometry args={[5.2, 32, 24]} /><meshBasicMaterial color="#fff3d0" transparent opacity={0.16} fog={false} /></mesh>
      <HouseExterior f={f} lightning={lightning} />
      <RainFx f={f} center={[m1 ? 0.3 : 0, 0, m1 ? 7 : 3.5]} count={m1 ? 1500 : 900} opacity={m1 ? 0.4 : 0.45} />
      {m1 ? (
        <Character who="marisol" scale={0.88} f={f} position={mPos} rotY={2.88} walk={phase} umbrella armR={[-0.15, 0.2]} />
      ) : (
        <>
          <Character who="marisol" scale={0.88} f={f} mouth={mouthOf('MARISOL', f)} gesture={gestureOf('MARISOL', f) * 0.8} mood={aurClose ? 'shock' : 'worried'} position={[-0.65, 0.2, 3.1]} rotY={1.15} seed={1} armL={[-1.0 * marLift, 0.05]} elbowR={0.1} headYaw={-0.12} />
          <Character who="aurelio" scale={0.92} f={f} mouth={mouthOf('AURELIO', f)} gesture={gestureOf('AURELIO', f) * (aurClose ? 1 : 0.6)} position={[0.65, 0.2, 3.1]} rotY={-1.15} seed={2} armR={[-1.05 * aurLift + 0.05, 0.12]} elbowR={0.1 + 0.25 * aurLift} headYaw={0.1} headPitch={aurClose ? 0.12 : 0} />
          {f >= F.s2b_end && f < F.s2_end && (
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
  const open = smooth(seg(f, F.open_a, F.open_b));
  const rise = seg(f, F.open_a, F.s4_close);
  const walking = f < F.walk_b;
  const enter0 = F.open_a + 40;
  let mPos: V3;
  let rotY = Math.PI;
  let phase = 0;
  if (f < F.walk_b) {
    const p = smooth(seg(f, F.walk_a + 4, F.walk_b - 4));
    mPos = [HX - 0.2 * p, 0, mix(-0.4, -13.1, p)];
    phase = (p * 12.7 / 0.62) * Math.PI;
  } else if (f < enter0) {
    mPos = [HX - 0.2, 0, -13.1];
  } else if (f < F.s4_close) {
    const p = smooth(seg(f, enter0, F.s4_close));
    mPos = [HX - 0.2 + 0.2 * p, 0, mix(-13.1, -16.8, p)];
    phase = (p * 3.7 / 0.62) * Math.PI;
  } else {
    mPos = [HX, 0, -17.2];
    rotY = 0;
  }
  const arm = smooth(seg(f, F.arm_a, F.insert)) * (1 - smooth(seg(f, enter0 - 10, enter0 + 10)));
  const unlock = f >= F.arm_a && f < enter0 + 10;
  const glint = interpolate(f, [F.click - 16, F.click, F.click + 16], [0, 1, 0], clamp);
  const close = f >= F.s4_close;
  const chest = smooth(seg(f, F.s4_close + 8, F.s4_close + 30));
  const look = walking ? Math.sin(f / 23) * 0.35 : 0;
  return (
    <>
      <color attach="background" args={['#0b060c']} />
      <fogExp2 attach="fog" args={['#140a14', 0.028]} />
      <ambientLight color="#4a3550" intensity={0.9} />
      <hemisphereLight args={['#8a6a88', '#2a1a20', 0.8]} />
      <pointLight position={[cam.pos[0] - 0.2, cam.pos[1] + 0.35, cam.pos[2] + 0.4]} color="#ffc890" intensity={close ? 5 : 4.5} distance={6} decay={1.6} />
      <Hall f={f} open={open} seam={1} />
      <LetterRoom f={f} rise={rise} />
      {close && <pointLight position={[HX + 0.6, 1.9, -15.2]} color="#ffe0b0" intensity={7} distance={5} decay={2} />}
      {close && <pointLight position={[HX - 0.6, 1.8, -18.0]} color="#ffb060" intensity={6} distance={4} decay={2} />}
      <Character who="marisol" scale={0.88} f={f} mouth={mouthOf('MARISOL', f)} mood={close ? 'shock' : f >= F.walk_b ? 'worried' : 'neutral'} position={mPos} rotY={rotY} walk={phase}
        armR={walking ? [0.05, 0.12] : [-1.6 * arm + 0.05, 0.14]} elbowR={walking ? 0.1 : 0.1 + 0.3 * arm} seed={1} headYaw={look} headPitch={close ? -0.05 : 0} handToChest={close ? chest : 0}>
        {unlock && (
          <group position={[0, -0.04, 0.0]}>
            <Key3D glint={glint} scale={1.25} />
          </group>
        )}
      </Character>
    </>
  );
};

/* ---------- Subtítulos y superposiciones ---------- */
const Subtitles: React.FC<{f: number}> = ({f}) => {
  // eslint-disable-next-line

  const cue = TL.cues.find((c) => f >= c.from && f <= c.to);
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

const Typed: React.FC<{text: string; p: number; style: React.CSSProperties}> = ({text, p, style}) => {
  const n = Math.floor(text.length * p);
  return (
    <div style={style}>
      {text.split('').map((ch, i) => (
        <span key={i} style={{opacity: i < n ? 1 : i === n ? (text.length * p) % 1 : 0}}>{ch}</span>
      ))}
    </div>
  );
};

const LetterOverlay: React.FC<{f: number}> = ({f}) => {
  const paperIn = interpolate(f, [F.paper_in, F.paper_in + 34], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
  const line1 = interpolate(f, [F.elv1, F.line2 - 4], [0, 1], clamp);
  const line2 = interpolate(f, [F.line2, F.elv2 - 22], [0, 1], clamp);
  const stamp = interpolate(f, [F.hit, F.hit + 8], [2.6, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const stampO = interpolate(f, [F.hit, F.hit + 4], [0, 1], clamp);
  const underline = interpolate(f, [F.hit + 10, F.hit + 42], [0, 1], clamp);
  if (f < F.paper_in - 2 || f > F.black + 8) return null;
  const hand: React.CSSProperties = {fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', color: '#2a1810'};
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: 820, height: 1060, transform: `translateY(${(1 - paperIn) * 420}px) rotate(${-2 + (1 - paperIn) * 8}deg) scale(${0.8 + paperIn * 0.2})`, opacity: paperIn,
        background: 'linear-gradient(160deg,#f6e7c3,#e4cd98)', borderRadius: 10, boxShadow: '0 30px 90px rgba(0,0,0,.7), inset 0 0 80px rgba(120,70,20,.35)', position: 'relative', overflow: 'hidden', border: '4px solid #2a1810'}}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <div key={i} style={{position: 'absolute', left: 60, right: 60, top: 196 + i * 78, height: 2, background: 'rgba(60,35,15,.22)'}} />)}
        <div style={{position: 'absolute', right: 60, top: 40, ...hand, fontSize: 34, color: '#6a4a30'}}>12 de marzo</div>
        <Typed text="Mi querida Marisol," p={line1} style={{position: 'absolute', left: 70, top: 110, ...hand, fontSize: 74}} />
        <Typed text="si estás leyendo esto," p={Math.min(1, line2 * 2)} style={{position: 'absolute', left: 70, top: 250, ...hand, fontSize: 56, color: '#3a2414'}} />
        <Typed text="ya no puedo protegerte." p={Math.max(0, line2 * 2 - 1)} style={{position: 'absolute', left: 70, top: 328, ...hand, fontSize: 56, color: '#3a2414'}} />
        <div style={{position: 'absolute', right: 70, bottom: 70, width: 110, height: 110, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #d4374e, #7e0f22)', boxShadow: '0 6px 14px rgba(0,0,0,.5)', border: '4px solid #4a0914'}} />
        <div style={{position: 'absolute', left: 70, bottom: 90, ...hand, fontSize: 46, color: '#4a3020', opacity: line2 > 0.95 ? 0.9 : 0}}>— E.</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', opacity: stampO, transform: `scale(${stamp}) rotate(-3deg)`}}>
          <div style={{fontFamily: 'DejaVu Serif, serif', fontWeight: 700, fontSize: 112, lineHeight: 1.05, color: '#a3101f', textShadow: '0 3px 0 rgba(0,0,0,.25)'}}>NO CONFÍES<br />EN TOMÁS</div>
          <div style={{margin: '10px auto 0', height: 10, width: 560 * underline, background: '#a3101f', borderRadius: 6}} />
        </div>
      </div>
    </div>
  );
};

/* ---------- Episodio ---------- */
export const Ep1: React.FC = () => {
  const f = useCurrentFrame();
  const L0 = F.lightning;
  const lightning = interpolate(f, [L0, L0 + 2, L0 + 6, L0 + 10, L0 + 14, L0 + 18, L0 + 26], [0, 0.85, 0.1, 0.7, 0.05, 0.4, 0], clamp);
  const hit = f >= F.hit;
  const shakeAmt = interpolate(f, [F.hit, F.hit + 22], [0.07, 0], clamp);
  const shake: [number, number] = hit ? [Math.sin(f * 7.3) * shakeAmt, Math.cos(f * 6.1) * shakeAmt * 0.7] : [0, 0];
  const cam = cameraFor(f);
  const dip = Math.max(0, ...[F.s1_end, F.s2_end].map((c) => 1 - Math.min(1, Math.abs(f - c) / 6)));
  const clickFlash = interpolate(f, [F.click, F.click + 2, F.click + 10], [0, 0.4, 0], clamp);
  const redFlash = interpolate(f, [F.hit, F.hit + 4, F.hit + 30], [0, 0.55, 0], clamp);
  const redTint = hit ? interpolate(f, [F.hit + 4, F.hit + 50], [0, 0.22], clamp) : 0;
  const blackO = interpolate(f, [F.black, F.black + 10], [0, 1], clamp);
  const endO = interpolate(f, [F.end_in, F.end_in + 22], [0, 1], clamp);
  const blur = interpolate(f, [F.paper_in - 2, F.paper_in + 26], [0, 12], clamp);
  const titleO = interpolate(f, [F.title_in, F.title_in + 20, F.s1_end - 24, F.s1_end - 4], [0, 1, 1, 0], clamp);
  const titleY = interpolate(f, [F.title_in, F.title_in + 38], [28, 0], {...clamp, easing: Easing.bezier(0.22, 0.61, 0.36, 1)});
  const tagO = interpolate(f, [F.s1_end, F.s1_end + 18], [0, 0.9], clamp) * (f > F.black ? 0 : 1);
  const interior = f >= F.s2_end;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile('ep1_mix.wav')} />
      <AbsoluteFill style={{filter: `blur(${blur}px) brightness(${1 - blur * 0.03})`}}>
        <ThreeCanvas width={W} height={H} shadows camera={{fov: 40, position: [0, 1.5, 5], near: 0.05, far: 200}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: interior ? 1.15 : 1.25}} style={{width: W, height: H}}>
          <Rig k={cam} shake={shake} />
          {interior ? <Interior f={f} cam={cam} /> : <Exterior f={f} lightning={lightning} />}
        </ThreeCanvas>
      </AbsoluteFill>
      <Vignette amt={0.72} />
      <div style={{position: 'absolute', inset: 0, background: '#dfe8ff', opacity: f < F.s1_end ? lightning * 0.35 : 0}} />
      <div style={{position: 'absolute', inset: 0, background: '#ffe8b0', opacity: clickFlash}} />
      <LetterOverlay f={f} />
      <div style={{position: 'absolute', inset: 0, background: '#ff2a3c', opacity: redFlash, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', inset: 0, background: '#7a0414', opacity: redTint, mixBlendMode: 'multiply'}} />
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: dip * 0.85}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: titleO, transform: `translateY(${titleY}px)`}}>
        <div style={{fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: 14, color: '#e0a42c', textShadow: '0 2px 10px #000'}}>SERIE ANIMADA · EP 1</div>
        <div style={{fontFamily: 'Liberation Serif, serif', fontWeight: 700, fontSize: 132, lineHeight: 1.0, color: '#fff3d8', marginTop: 26, textShadow: '0 6px 40px rgba(224,164,44,.55), 0 4px 0 #1a0f14'}}>LO QUE<br />CALLÓ<br />LA CASA</div>
      </div>
      <div style={{position: 'absolute', left: 54, top: 70, opacity: tagO, fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: 6, color: '#fff3d8', textShadow: '0 2px 8px #000'}}><span style={{color: '#e0a42c'}}>●</span> EP 1 / 8</div>
      {f < F.paper_in && <Subtitles f={f} />}
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: blackO}} />
      {f >= F.end_in && (
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: endO, textAlign: 'center'}}>
          <div style={{fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 36, letterSpacing: 14, color: '#e0a42c'}}>LO QUE CALLÓ LA CASA</div>
          <div style={{fontFamily: 'Liberation Serif, serif', fontWeight: 700, fontSize: 150, color: '#fff3d8', marginTop: 24}}>EPISODIO 2</div>
          <div style={{fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 58, color: '#d8c9a8', marginTop: 40, lineHeight: 1.3}}>Mañana, a esta hora.<br />Sígueme para no perdértelo.</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
