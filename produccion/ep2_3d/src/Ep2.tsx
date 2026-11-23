import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing, Audio, staticFile} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {Character, Letter3D, Glow, smooth, seg, mix} from './kit3d';
import {Hall, LetterRoom, HX} from './world';
import TLraw from './timeline.json';

const W = 1080;
const H = 1920;
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
type V3 = [number, number, number];
type Cue = {from: number; to: number; who?: string | null; text: string; kind: 'narr' | 'dial'};
const TL = TLraw as unknown as {total: number; f: Record<string, number>; cues: Cue[]; env: Record<string, number[]>};
export const TOTAL = TL.total;
const F = TL.f;

const mouthOf = (who: string, f: number) => TL.env[who][f] ?? 0;
const gestureOf = (who: string, f: number) => {
  let s = 0;
  for (let k = -8; k <= 8; k++) s += TL.env[who][f + k] ?? 0;
  return Math.min(1, (s / 17) * 1.3);
};

type Key = {f: number; pos: V3; look: V3; fov: number};
const track = (f: number, keys: Key[]): Key => {
  if (f <= keys[0].f) return {...keys[0], f};
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (f <= b.f) {
      const t = smooth(seg(f, a.f, b.f));
      const l = (x: V3, y: V3): V3 => [mix(x[0], y[0], t), mix(x[1], y[1], t), mix(x[2], y[2], t)];
      return {f, pos: l(a.pos, b.pos), look: l(a.look, b.look), fov: mix(a.fov, b.fov, t)};
    }
  }
  return {...keys[keys.length - 1], f};
};

const Rig: React.FC<{k: Key; shake?: [number, number]}> = ({k, shake = [0, 0]}) => {
  const {camera} = useThree();
  const c = camera as THREE.PerspectiveCamera;
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

/* posiciones clave (mundo) */
const DESK: V3 = [HX - 1.2, 0, -20.2];
const SEAT: V3 = [HX - 1.2, 0.1, -20.78];
const DOOR: V3 = [HX + 0.1, 0, -14.4];

const cameraFor = (f: number): Key => {
  if (f < 150)
    return track(f, [
      {f: 0, pos: [HX + 0.9, 1.8, -14.6], look: [HX - 1.2, 0.9, -20.5], fov: 42},
      {f: 150, pos: [HX + 0.5, 1.6, -16.4], look: [HX - 1.2, 1.0, -20.6], fov: 40},
    ]);
  if (f < F.s1_end)
    return track(f, [
      {f: 150, pos: [HX - 0.5, 1.48, -18.6], look: [HX - 1.2, 1.1, -20.75], fov: 33},
      {f: F.s1_end, pos: [HX - 0.6, 1.45, -18.9], look: [HX - 1.2, 1.1, -20.75], fov: 31},
    ]);
  if (f < F.s2a_end)
    return track(f, [
      {f: F.s1_end, pos: [HX + 0.4, 1.5, -18.2], look: [HX - 1.2, 0.95, -20.6], fov: 36},
      {f: F.s2a_end, pos: [HX + 0.1, 1.42, -18.7], look: [HX - 1.2, 0.98, -20.6], fov: 33},
    ]);
  if (f < F.s2b_end)
    return track(f, [
      {f: F.s2a_end, pos: [HX - 0.72, 1.46, -19.1], look: [HX - 1.2, 1.3, -20.78], fov: 30},
      {f: F.s2b_end, pos: [HX - 0.78, 1.45, -19.3], look: [HX - 1.2, 1.3, -20.78], fov: 28},
    ]);
  if (f < F.s2_end)
    return track(f, [
      {f: F.s2b_end, pos: [HX - 0.4, 1.38, -18.8], look: [HX - 1.25, 1.18, -20.7], fov: 33},
      {f: F.s2_end, pos: [HX - 0.5, 1.36, -19.0], look: [HX - 1.25, 1.2, -20.7], fov: 31},
    ]);
  if (f < F.steps)
    return track(f, [
      {f: F.s2_end, pos: [HX - 0.85, 1.44, -19.1], look: [HX - 1.2, 1.34, -20.75], fov: 29},
      {f: F.steps, pos: [HX - 0.9, 1.43, -19.3], look: [HX - 1.2, 1.34, -20.75], fov: 26},
    ]);
  if (f < F.s3_end)
    return track(f, [
      {f: F.steps, pos: [HX - 2.3, 1.95, -22.6], look: [HX - 0.1, 1.25, -14.2], fov: 40},
      {f: F.s3_end, pos: [HX - 2.2, 1.92, -22.5], look: [HX, 1.3, -14.2], fov: 38},
    ]);
  if (f < F.s4a_end)
    return track(f, [
      {f: F.s3_end, pos: [HX - 1.95, 1.85, -22.75], look: [HX - 0.3, 1.25, -15.2], fov: 38},
      {f: F.s4a_end, pos: [HX - 1.9, 1.82, -22.6], look: [HX - 0.3, 1.25, -15.3], fov: 36},
    ]);
  if (f < F.s4b_end)
    return track(f, [
      {f: F.s4a_end, pos: [HX - 0.55, 1.6, -18.2], look: [HX - 1.2, 1.5, -20.75], fov: 30},
      {f: F.s4b_end, pos: [HX - 0.65, 1.58, -18.6], look: [HX - 1.2, 1.5, -20.75], fov: 27},
    ]);
  if (f < F.insert)
    return track(f, [
      {f: F.s4b_end, pos: [HX - 0.35, 1.5, -17.6], look: [HX, 1.58, -15.7], fov: 30},
      {f: F.insert, pos: [HX - 0.3, 1.5, -17.2], look: [HX, 1.58, -15.7], fov: 27},
    ]);
  return track(f, [
    {f: F.insert, pos: [HX - 1.6, 1.3, -21.6], look: [HX - 1.2, 0.95, -20.6], fov: 34},
    {f: F.black, pos: [HX - 1.5, 1.25, -21.4], look: [HX - 1.2, 0.95, -20.6], fov: 30},
  ]);
};

/* linterna: luz y cono visible */
const Flashlight: React.FC<{from: V3; to: V3; on: number}> = ({from, to, on}) => {
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(...to);
  target.updateMatrixWorld();
  const g = useMemo(() => new THREE.Object3D(), []);
  g.position.set(...from);
  g.lookAt(...to);
  const L = 5.5;
  if (on <= 0) return null;
  return (
    <>
      <primitive object={target} />
      <spotLight position={from} target={target} color="#fff2d8" intensity={60 * on} angle={0.28} penumbra={0.5} distance={14} decay={1.6} castShadow />
      <group position={from} quaternion={g.quaternion}>
        <mesh position={[0, 0, L / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[1.0, L, 32, 1, true]} />
          <meshBasicMaterial color="#fff2d0" transparent opacity={0.06 * on} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <Glow position={[0, 0, 0.05]} size={0.5 * on} color="#fff6e0" opacity={0.9} />
      </group>
    </>
  );
};

const Scene: React.FC<{f: number}> = ({f}) => {
  const flashback = f >= F.s1_end && f < F.s2_end;
  const flashL = interpolate(f, [F.flash, F.flash + 2, F.flash + 6, F.flash + 10, F.flash + 18], [0, 1, 0.1, 0.7, 0], clamp);
  const candle = flashback ? 1 - smooth(seg(f, F.blow, F.blow + 12)) : 0;
  const reading = f < F.stand;
  const standP = smooth(seg(f, F.stand, F.stand + 22));
  const sit = 1 - standP;
  const tearP = seg(f, F.mar1 + 10, F.mar1 + 80);
  // Tomás
  const tomOn = f >= F.steps;
  const tomWalk = smooth(seg(f, F.s4a_end, F.s4b_end - 10));
  const tomPos: V3 = [DOOR[0] - 0.05 * tomWalk, 0, mix(DOOR[2], -15.6, tomWalk)];
  const tomPhase = tomWalk > 0 && tomWalk < 1 ? (tomWalk * 1.2 / 0.6) * Math.PI : 0;
  const folderUp = smooth(seg(f, F.tom2 + 20, F.tom2 + 45));
  const beamTo: V3 = f < F.s3_end
    ? [mix(HX + 1.8, HX - 1.2, smooth(seg(f, F.beam, F.s3_end))), mix(0.6, 1.35, smooth(seg(f, F.beam, F.s3_end))), -20.6]
    : [HX - 1.2, 1.25, -20.7];
  const beamOn = f >= F.beam ? smooth(seg(f, F.beam, F.beam + 4)) * (f > F.s4b_end ? 1 - smooth(seg(f, F.s4b_end, F.s4b_end + 15)) : 1) : 0;
  const glint = interpolate(f, [F.glint - 8, F.glint, F.glint + 14], [0, 1, 0], clamp);

  // Marisol: lectura -> esconder la carta detrás de la espalda
  const hide = standP;
  const armL: [number, number] = reading ? [-0.95, -0.2] : [mix(-0.95, 0.6, hide), mix(-0.2, 0.25, hide)];
  const elbowL = reading ? 0.75 : mix(0.75, 1.1, hide);
  return (
    <>
      <color attach="background" args={['#0b060c']} />
      <fogExp2 attach="fog" args={['#140a14', 0.028]} />
      <ambientLight color={flashback ? '#5a4030' : '#3a3050'} intensity={flashback ? 0.55 : 0.75} />
      <hemisphereLight args={[flashback ? '#8a6a48' : '#6a6088', '#1a0f14', flashback ? 0.45 : 0.65]} />
      <Hall f={f} open={1} seam={0} />
      <LetterRoom f={f} rise={1} floating={false} night candle={candle} lamp={flashback ? 0 : 1} flash={flashL} />
      {/* luz de relleno sobre los rostros */}
      {!flashback && <pointLight position={[HX - 0.6, 1.7, -19.4]} color="#ffd0a0" intensity={1.6} distance={3.5} decay={2} />}
      {flashback && <pointLight position={[HX - 0.8, 1.6, -19.6]} color="#ffb070" intensity={1.1 * Math.max(candle, 0.15)} distance={3} decay={2} />}
      {flashback ? (
        <Character who="elvira" scale={0.86} f={f} sit={1} position={SEAT} rotY={0} seed={4}
          mouth={mouthOf('ELVIRA', f) * 0.45} mood={f >= F.s2b_end ? 'worried' : 'neutral'}
          headPitch={f < F.s2b_end ? 0.3 : mix(0.3, -0.15, smooth(seg(f, F.s2b_end, F.s2b_end + 30)))}
          headYaw={f >= F.s2b_end ? mix(0, 0.25, smooth(seg(f, F.s2b_end, F.s2b_end + 30))) : 0}
          armR={[-0.95 + Math.sin(f / 3.1) * 0.03 * candle, 0.25 + Math.sin(f / 4.3) * 0.04 * candle]} elbowR={0.65}
          armL={[-0.9, -0.25]} elbowL={0.7}>
          <mesh position={[0, -0.02, 0.06]} rotation={[0.4, 0, 0]}><coneGeometry args={[0.012, 0.22, 8]} /><meshStandardMaterial color="#efe8da" /></mesh>
        </Character>
      ) : (
        <Character who="marisol" scale={0.88} f={f} sit={sit} position={[SEAT[0], SEAT[1] * sit, SEAT[2] + 0.1 * standP]} rotY={0} seed={1}
          mouth={mouthOf('MARISOL', f)} gesture={reading ? 0 : gestureOf('MARISOL', f) * 0.3}
          mood={f >= F.steps ? (f >= F.tom1 ? 'shock' : 'worried') : 'worried'} tear={f >= F.mar1 ? tearP : 0}
          headPitch={reading ? (f >= F.steps ? -0.05 : 0.3) : 0} headYaw={0}
          armR={reading ? [-1.0, 0.28] : [0.05, 0.12]} elbowR={reading ? 0.9 : 0.15}
          armL={armL} elbowL={elbowL}
          leftProp={<group rotation={[reading ? -0.6 : 0.4, 0, 0]}><Letter3D position={[0, -0.05, 0.02]} rot={[0, 0, Math.PI / 2]} s={0.75} tone={0.2} /></group>}>
          {reading && <Letter3D position={[0, -0.06, 0.04]} rot={[-0.9, 0, Math.PI / 2]} s={0.6} tone={0.35} />}
        </Character>
      )}
      {tomOn && !flashback && (
        <>
          <Character who="tomas" scale={0.95} f={f} position={tomPos} rotY={Math.PI} walk={tomPhase} seed={3}
            mouth={mouthOf('TOMAS', f)} gesture={0} mood={f >= F.tom2 ? 'neutral' : 'worried'}
            armR={[-1.05, 0.15]} elbowR={0.25} armL={[-0.4 - folderUp * 0.8, -0.2]} elbowL={0.9 + folderUp * 0.3}
            leftProp={<mesh position={[0.05, -0.05, 0.05]} rotation={[0.2, 0.3, 0]}><boxGeometry args={[0.24, 0.32, 0.03]} /><meshStandardMaterial color="#c9b48a" roughness={0.8} /></mesh>}>
            <mesh position={[0, -0.02, 0.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.03, 0.18, 12]} /><meshStandardMaterial color="#1a1a1e" metalness={0.6} roughness={0.3} /></mesh>
          </Character>
          <Flashlight from={[tomPos[0] - 0.3, 1.18, tomPos[2] - 0.45]} to={beamTo} on={beamOn} />
          {glint > 0 && <Glow position={[tomPos[0] + 0.25, 1.25, tomPos[2] - 0.35]} size={0.35 * glint} color="#ffe9a0" opacity={1} />}
        </>
      )}
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
          <div style={{display: 'inline-block', marginBottom: 18, padding: '8px 26px', borderRadius: 40, fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: 4, background: ({MARISOL: '#e0a42c', AURELIO: '#7fa88a', 'TOMÁS': '#5b8fd0', ELVIRA: '#c0394b'} as Record<string, string>)[cue.who] ?? '#ccc', color: '#160d10'}}>{cue.who}</div>
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


const Insert: React.FC<{f: number}> = ({f}) => {
  if (f < F.insert - 2 || f > F.black + 8) return null;
  const inP = interpolate(f, [F.insert, F.insert + 16], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const hit = f >= F.hit;
  const stamp = interpolate(f, [F.hit, F.hit + 8], [2.2, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const zoom = interpolate(f, [F.insert, F.black], [1, 1.12], clamp);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: inP}}>
      <div style={{position: 'relative', width: 860, height: 760, transform: `scale(${zoom}) rotate(-6deg)`}}>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(150deg,#f1dfb6,#d9bf86 60%,#c9a96c)', borderRadius: 14, boxShadow: '0 40px 100px rgba(0,0,0,.8), inset 0 0 120px rgba(90,50,10,.45)',
          clipPath: 'polygon(2% 6%, 18% 0%, 40% 4%, 63% 0%, 84% 5%, 100% 2%, 97% 28%, 100% 52%, 95% 76%, 99% 100%, 72% 95%, 50% 100%, 26% 94%, 4% 100%, 0% 74%, 4% 50%, 0% 26%)'}} />
        {[0.22, 0.48, 0.7].map((y, i) => <div key={i} style={{position: 'absolute', left: 0, right: 0, top: `${y * 100}%`, height: 3, background: 'rgba(60,30,10,.25)', transform: `rotate(${(i - 1) * 3}deg)`}} />)}
        <div style={{position: 'absolute', left: 70, top: 70, fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 48, color: '#4a3020', opacity: 0.8}}>…ya no puedo protegerte.</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', transform: `scale(${hit ? stamp : 1}) rotate(-2deg)`, opacity: hit ? 1 : 0.0}}>
          <div style={{fontFamily: 'DejaVu Serif, serif', fontWeight: 700, fontSize: 120, lineHeight: 1.05, color: '#a3101f'}}>NO CONFÍES<br />EN TOMÁS</div>
        </div>
        {!hit && <div style={{position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center', fontFamily: 'DejaVu Serif, serif', fontWeight: 700, fontSize: 120, lineHeight: 1.05, color: 'rgba(163,16,31,.18)'}}>NO CONFÍES<br />EN TOMÁS</div>}
        {/* dedos que aprietan la carta */}
        {[0, 1, 2, 3].map((i) => <div key={i} style={{position: 'absolute', left: 640 + i * 46, top: 520 + i * 18, width: 70, height: 170, borderRadius: 40, background: 'radial-gradient(circle at 40% 30%, #f0c09a, #c98c66)', boxShadow: '0 8px 20px rgba(0,0,0,.4)', transform: `rotate(${-20 + i * 6}deg)`}} />)}
      </div>
    </div>
  );
};

export const Ep2: React.FC = () => {
  const f = useCurrentFrame();
  const flashback = f >= F.s1_end && f < F.s2_end;
  const hit = f >= F.hit;
  const shakeAmt = interpolate(f, [F.hit, F.hit + 22], [0.07, 0], clamp);
  const shake: [number, number] = hit ? [Math.sin(f * 7.3) * shakeAmt, Math.cos(f * 6.1) * shakeAmt * 0.7] : [0, 0];
  const cam = cameraFor(f);
  const memDip = Math.max(0, ...[F.s1_end, F.s2_end].map((c) => 1 - Math.min(1, Math.abs(f - c) / 10)));
  const cutDip = Math.max(0, ...[150, F.s4a_end, F.s4b_end].map((c) => 1 - Math.min(1, Math.abs(f - c) / 3)));
  const redFlash = interpolate(f, [F.hit, F.hit + 4, F.hit + 30], [0, 0.5, 0], clamp);
  const redTint = hit ? interpolate(f, [F.hit + 4, F.hit + 50], [0, 0.22], clamp) : 0;
  const blackO = interpolate(f, [F.black, F.black + 10], [0, 1], clamp);
  const endO = interpolate(f, [F.end_in, F.end_in + 22], [0, 1], clamp);
  const blur = interpolate(f, [F.insert - 2, F.insert + 14], [0, 10], clamp);
  const titleO = interpolate(f, [F.title_in, F.title_in + 20, F.s1_end - 24, F.s1_end - 6], [0, 1, 1, 0], clamp);
  const titleY = interpolate(f, [F.title_in, F.title_in + 38], [28, 0], {...clamp, easing: Easing.bezier(0.22, 0.61, 0.36, 1)});
  const tagO = interpolate(f, [F.s1_end - 10, F.s1_end + 8], [0, 0.9], clamp) * (f > F.black ? 0 : 1);
  const memTag = interpolate(f, [F.s1_end + 8, F.s1_end + 22, F.s1_end + 90, F.s1_end + 110], [0, 1, 1, 0], clamp);
  const grain = (f * 7919) % 97;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile('ep2_mix.wav')} />
      <AbsoluteFill style={{filter: `${flashback ? 'sepia(.62) saturate(.85) contrast(1.05) brightness(1.05)' : ''} blur(${blur}px) brightness(${1 - blur * 0.035})`}}>
        <ThreeCanvas width={W} height={H} shadows camera={{fov: 40, position: [0, 1.5, 5], near: 0.05, far: 200}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2}} style={{width: W, height: H}}>
          <Rig k={cam} shake={shake} />
          <Scene f={f} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Vignette amt={flashback ? 0.85 : 0.72} />
      {flashback && <div style={{position: 'absolute', inset: 0, opacity: 0.1, background: `repeating-linear-gradient(${grain}deg, rgba(255,240,200,.5) 0 1px, transparent 1px 3px)`, mixBlendMode: 'overlay'}} />}
      <div style={{position: 'absolute', inset: 0, background: '#fff0d0', opacity: memDip * 0.9}} />
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: cutDip * 0.6}} />
      <Insert f={f} />
      <div style={{position: 'absolute', inset: 0, background: '#ff2a3c', opacity: redFlash, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', inset: 0, background: '#7a0414', opacity: redTint, mixBlendMode: 'multiply'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: titleO, transform: `translateY(${titleY}px)`}}>
        <div style={{fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: 14, color: '#e0a42c', textShadow: '0 2px 10px #000'}}>LO QUE CALLÓ LA CASA · EP 2</div>
        <div style={{fontFamily: 'Liberation Serif, serif', fontWeight: 700, fontSize: 128, lineHeight: 1.0, color: '#fff3d8', marginTop: 26, textShadow: '0 6px 40px rgba(224,164,44,.55), 0 4px 0 #1a0f14'}}>CARTAS<br />SIN<br />ENVIAR</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', opacity: memTag, fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 64, color: '#fff0d0', textShadow: '0 3px 16px #000'}}>Hace veinte años…</div>
      <div style={{position: 'absolute', left: 54, top: 70, opacity: tagO, fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: 6, color: '#fff3d8', textShadow: '0 2px 8px #000'}}><span style={{color: '#e0a42c'}}>●</span> EP 2 / 8</div>
      {f < F.insert && <Subtitles f={f} />}
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: blackO}} />
      {f >= F.end_in && (
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: endO, textAlign: 'center'}}>
          <div style={{fontFamily: 'DejaVu Sans, sans-serif', fontWeight: 700, fontSize: 36, letterSpacing: 14, color: '#e0a42c'}}>LO QUE CALLÓ LA CASA</div>
          <div style={{fontFamily: 'Liberation Serif, serif', fontWeight: 700, fontSize: 150, color: '#fff3d8', marginTop: 24}}>EPISODIO 3</div>
          <div style={{fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 62, color: '#d8c9a8', marginTop: 30}}>La mujer del pasillo</div>
          <div style={{fontFamily: 'Liberation Serif, serif', fontStyle: 'italic', fontSize: 50, color: '#a89a80', marginTop: 40, lineHeight: 1.3}}>Mañana, a esta hora.</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
