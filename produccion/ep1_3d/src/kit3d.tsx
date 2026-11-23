import React, {useMemo} from 'react';
import * as THREE from 'three';
import {random} from 'remotion';

/* ---------- Utilidades ---------- */
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const seg = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const tex = (draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, w = 512, h = 512, rx = 1, ry = 1) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/* ---------- Materiales ---------- */
export const std = (color: string, rough = 0.7, metal = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal, ...extra});

/* ---------- Personaje 3D ---------- */
export type CharProps = {
  who: 'marisol' | 'aurelio';
  f: number;
  talk?: boolean;
  mood?: 'neutral' | 'worried' | 'shock';
  position?: [number, number, number];
  rotY?: number;
  walk?: number; // fase del ciclo de caminata (0 = quieto)
  headYaw?: number;
  headPitch?: number;
  armR?: [number, number]; // [rotación x, rotación z] del brazo derecho
  armL?: [number, number];
  elbowR?: number;
  umbrella?: boolean;
  children?: React.ReactNode; // se cuelga de la mano derecha
  seed?: number;
  scale?: number;
};

const MAT: Record<string, THREE.MeshStandardMaterial> = {};
const m = (key: string, color: string, rough = 0.7, metal = 0) => (MAT[key] ||= std(color, rough, metal));

export const Character: React.FC<CharProps> = ({
  who, f, talk = false, mood = 'neutral', position = [0, 0, 0], rotY = 0, walk = 0, headYaw = 0, headPitch = 0,
  armR = [0.05, 0.12], armL = [0.05, -0.12], elbowR = 0.1, umbrella = false, children, seed = 0, scale = 1,
}) => {
  const M = who === 'marisol';
  const skin = m(`skin${who}`, M ? '#e9b48f' : '#b98259', 0.55);
  const skinDark = m(`skind${who}`, M ? '#cf8f6c' : '#8f5f3d', 0.6);
  const hairC = m('hairM', '#15101c', 0.45);
  const top = m(`top${who}`, M ? '#e2a62e' : '#f2e8d4', 0.85);
  const vest = m('vest', '#6b4a30', 0.8);
  const pants = m(`pants${who}`, M ? '#2f2a45' : '#3d3226', 0.85);
  const shoe = m('shoe', '#1d1410', 0.5);
  const white = m('eyew', '#fffaf2', 0.25);
  const iris = m(`iris${who}`, M ? '#4a2c1a' : '#3a2a1c', 0.2);
  const pupil = m('pupil', '#07040a', 0.1);
  const gray = m('gray', '#d9d6ce', 0.8);
  const lip = m('lip', M ? '#b84a5a' : '#8f3f3f', 0.5);
  const mouthIn = m('mouthin', '#3a0d16', 0.5);
  const cheek = new THREE.MeshStandardMaterial({color: '#e8707a', roughness: 0.9, transparent: true, opacity: 0.38});

  const t = f + seed * 13;
  const breathe = Math.sin(t / 22) * 0.008;
  const blink = (f + seed * 29) % 100 < 4 ? 0.08 : 1;
  const open = talk ? 0.35 + Math.abs(Math.sin(f * 0.85 + seed)) * 0.65 : 0;
  const swing = Math.sin(walk) * 0.55;
  const bob = walk ? Math.abs(Math.cos(walk)) * 0.035 : 0;
  const browLift = mood === 'worried' ? 0.016 : mood === 'shock' ? 0.03 : 0;
  const browTilt = mood === 'worried' ? 0.28 : mood === 'shock' ? 0.0 : -0.05;
  const eyeS = mood === 'shock' ? 1.18 : 1;
  const stoop = M ? 0 : 0.1;

  const eye = (sx: number) => (
    <group position={[sx * 0.068, 0.025, 0.145]} scale={[eyeS, eyeS * blink, eyeS]}>
      <mesh material={white} scale={[1, 1.18, 0.55]}><sphereGeometry args={[0.046, 24, 20]} /></mesh>
      <mesh material={iris} position={[sx * 0.004 + headYaw * 0.01, 0, 0.018]} scale={[1, 1, 0.5]}><sphereGeometry args={[0.03, 20, 16]} /></mesh>
      <mesh material={pupil} position={[sx * 0.004 + headYaw * 0.01, 0, 0.026]} scale={[1, 1, 0.5]}><sphereGeometry args={[0.016, 16, 12]} /></mesh>
      <mesh position={[-0.01 + headYaw * 0.01, 0.014, 0.034]}><sphereGeometry args={[0.008, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
      {M && <mesh position={[0, 0.045, 0.012]} rotation={[0, 0, Math.PI / 2]} material={m('lash', '#0b0710', 0.5)}><capsuleGeometry args={[0.004, 0.07, 4, 8]} /></mesh>}
    </group>
  );

  const brow = (sx: number) => (
    <mesh position={[sx * 0.068, 0.088 + browLift, 0.158]} rotation={[0, 0, sx * browTilt + Math.PI / 2]} material={M ? hairC : gray} scale={M ? [1, 1, 0.8] : [1.5, 1.3, 1]}>
      <capsuleGeometry args={[0.008, 0.055, 4, 8]} />
    </mesh>
  );

  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={[0, rotY, 0]} scale={scale}>
      {/* piernas */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.09, 0.74, 0]} rotation={[s * swing, 0, 0]}>
          <mesh material={pants} position={[0, -0.3, 0]} castShadow><capsuleGeometry args={[0.075, 0.52, 6, 14]} /></mesh>
          <mesh material={shoe} position={[0, -0.7, 0.05]} scale={[1, 0.55, 1.6]} castShadow><sphereGeometry args={[0.08, 14, 12]} /></mesh>
        </group>
      ))}
      {/* tronco */}
      <group position={[0, 1.02, 0]} rotation={[stoop, 0, 0]} scale={[1 + breathe, 1 + breathe * 1.5, 1 + breathe]}>
        <mesh material={top} castShadow><capsuleGeometry args={[0.175, 0.36, 8, 20]} /></mesh>
        {M ? (
          <>
            <mesh material={m('topdk', '#c58a1c', 0.85)} position={[0, 0.3, 0.02]} scale={[1.05, 0.35, 1]}><torusGeometry args={[0.15, 0.04, 10, 24]} /></mesh>
            <mesh material={m('stain', '#b86a4a', 0.9)} position={[-0.07, -0.05, 0.172]} scale={[1, 0.6, 0.12]}><sphereGeometry args={[0.04, 12, 10]} /></mesh>
          </>
        ) : (
          <>
            <mesh material={vest} scale={[1.06, 0.97, 1.05]} position={[0, -0.02, 0.0]}><capsuleGeometry args={[0.176, 0.3, 8, 20]} /></mesh>
            <mesh material={top} position={[0, 0.08, 0.17]} scale={[0.4, 1, 0.1]}><boxGeometry args={[0.3, 0.42, 0.1]} /></mesh>
            {[0, 1, 2].map((i) => <mesh key={i} material={m('btn', '#d9b370', 0.4, 0.6)} position={[0.0, 0.14 - i * 0.12, 0.185]}><sphereGeometry args={[0.012, 8, 8]} /></mesh>)}
          </>
        )}

        {/* cabeza */}
        <group position={[0, 0.46, 0]}>
          <mesh material={skinDark} position={[0, -0.02, 0]} scale={[1, 1.1, 1]}><cylinderGeometry args={[0.06, 0.07, 0.14, 14]} /></mesh>
          <group position={[0, 0.18, 0.01]} rotation={[headPitch + Math.sin(t / 53) * 0.025, headYaw + Math.sin(t / 71) * 0.04, Math.sin(t / 41) * 0.03]}>
            <mesh material={skin} scale={[1, 1.1, 1.03]} castShadow><sphereGeometry args={[0.165, 40, 32]} /></mesh>
            {/* orejas */}
            {[-1, 1].map((s) => <mesh key={s} material={skin} position={[s * 0.16, -0.005, -0.005]} scale={[0.4, 1, 0.8]}><sphereGeometry args={[0.04, 12, 10]} /></mesh>)}
            {eye(-1)}{eye(1)}
            {brow(-1)}{brow(1)}
            {/* nariz */}
            <mesh material={skinDark} position={[0, -0.025, 0.168]} scale={M ? [1, 1.2, 0.9] : [1.25, 1.5, 1.1]}><sphereGeometry args={[0.024, 14, 12]} /></mesh>
            {/* mejillas */}
            {[-1, 1].map((s) => <mesh key={s} material={cheek} position={[s * 0.1, -0.05, 0.12]} scale={[1, 0.7, 0.3]}><sphereGeometry args={[0.04, 12, 10]} /></mesh>)}
            {/* boca */}
            <group position={[0, -0.085, 0.145]}>
              {open > 0.01 ? (
                <>
                  <mesh material={mouthIn} scale={[1, 0.25 + open * 0.8, 0.35]}><sphereGeometry args={[0.032, 18, 14]} /></mesh>
                  <mesh material={lip} position={[0, -0.01 - open * 0.012, 0.008]} scale={[1.1, 0.35, 0.5]}><sphereGeometry args={[0.03, 12, 10]} /></mesh>
                </>
              ) : mood === 'worried' ? (
                <mesh material={lip} rotation={[0, 0, 0]} position={[0, -0.008, 0.012]}><torusGeometry args={[0.028, 0.006, 8, 16, Math.PI]} /></mesh>
              ) : (
                <mesh material={lip} rotation={[0, 0, Math.PI]} position={[0, 0.012, 0.012]}><torusGeometry args={[0.03, 0.006, 8, 16, Math.PI]} /></mesh>
              )}
            </group>

            {M ? (
              <>
                {/* pelo */}
                <mesh material={hairC} rotation={[-0.42, 0, 0]} scale={[1.05, 1.1, 1.08]} castShadow><sphereGeometry args={[0.172, 40, 28, 0, Math.PI * 2, 0, 1.82]} /></mesh>
                <mesh material={hairC} position={[0, -0.03, -0.06]} scale={[1.02, 1.22, 0.9]}><sphereGeometry args={[0.17, 28, 22]} /></mesh>
                <mesh material={hairC} position={[0.05, 0.12, 0.1]} rotation={[0.3, 0, -0.5]} scale={[1.3, 0.55, 0.75]}><sphereGeometry args={[0.085, 18, 14]} /></mesh>
                <mesh material={hairC} position={[-0.075, 0.02, 0.1]} rotation={[0, 0, 0.5]} scale={[0.55, 1.1, 0.6]}><sphereGeometry args={[0.06, 14, 12]} /></mesh>
                {/* trenza */}
                {Array.from({length: 9}).map((_, i) => {
                  const sway = Math.sin(t / 18 - i * 0.5) * 0.02 * (i / 4) + (walk ? Math.sin(walk - i * 0.4) * 0.03 : 0);
                  return (
                    <mesh key={i} material={hairC} position={[0.035 + sway, -0.14 - i * 0.075, -0.15 - i * 0.012]} castShadow>
                      <sphereGeometry args={[0.052 - i * 0.003, 12, 10]} />
                    </mesh>
                  );
                })}
                <mesh material={m('tie', '#c0392b', 0.5)} position={[0.035, -0.84, -0.26]}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
              </>
            ) : (
              <>
                {/* pelo gris y bigote */}
                <mesh material={gray} position={[0, -0.03, -0.04]} scale={[1.03, 0.95, 0.95]}><sphereGeometry args={[0.166, 24, 18, 0, Math.PI * 2, 1.0, 1.0]} /></mesh>
                {[-1, 1].map((s) => (
                  <mesh key={s} material={gray} position={[s * 0.032, -0.068, 0.162]} rotation={[0, 0, s * 0.55 + Math.PI / 2]} scale={[1, 1, 1.1]}>
                    <capsuleGeometry args={[0.014, 0.065, 6, 10]} />
                  </mesh>
                ))}
                {/* sombrero */}
                <group position={[0, 0.115, 0]} rotation={[-0.04, 0, 0]}>
                  <mesh material={m('hat', '#dcb86e', 0.9)} castShadow><cylinderGeometry args={[0.34, 0.36, 0.022, 48]} /></mesh>
                  <mesh material={m('hat2', '#e8cb86', 0.9)} position={[0, 0.07, 0]} scale={[1, 0.8, 1]} castShadow><sphereGeometry args={[0.19, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
                  <mesh material={m('band', '#7a3b2a', 0.7)} position={[0, 0.032, 0]}><cylinderGeometry args={[0.192, 0.196, 0.04, 36]} /></mesh>
                </group>
              </>
            )}
          </group>
        </group>

        {/* brazos */}
        <group position={[-0.215, 0.27, 0]} rotation={[-swing * 0.9 + armL[0], 0, armL[1]]}>
          <mesh material={top} position={[0, -0.16, 0]} castShadow><capsuleGeometry args={[0.052, 0.26, 6, 12]} /></mesh>
          <group position={[0, -0.34, 0]} rotation={[-0.15, 0, 0]}>
            <mesh material={top} position={[0, -0.15, 0]}><capsuleGeometry args={[0.046, 0.24, 6, 12]} /></mesh>
            <mesh material={skin} position={[0, -0.32, 0]}><sphereGeometry args={[0.052, 14, 12]} /></mesh>
          </group>
        </group>
        <group position={[0.215, 0.27, 0]} rotation={[swing * 0.9 + armR[0], 0, armR[1]]}>
          <mesh material={top} position={[0, -0.16, 0]} castShadow><capsuleGeometry args={[0.052, 0.26, 6, 12]} /></mesh>
          <group position={[0, -0.34, 0]} rotation={[-elbowR, 0, 0]}>
            <mesh material={top} position={[0, -0.15, 0]}><capsuleGeometry args={[0.046, 0.24, 6, 12]} /></mesh>
            <mesh material={skin} position={[0, -0.32, 0]}><sphereGeometry args={[0.052, 14, 12]} /></mesh>
            <group position={[0, -0.34, 0.02]}>{children}</group>
          </group>
        </group>
      </group>

      {umbrella && (
        <group position={[0.2, 1.88, 0.05]} rotation={[0.05, 0, -0.05]}>
          <mesh material={m('umbH', '#2a1a12', 0.5)} position={[0, -0.5, 0]}><cylinderGeometry args={[0.01, 0.01, 1.0, 8]} /></mesh>
          <mesh material={m('umb', '#8a1f3a', 0.7)} position={[0, 0.02, 0]} scale={[1, 0.42, 1]} castShadow><sphereGeometry args={[0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh material={m('umbT', '#2a1a12', 0.5)} position={[0, 0.28, 0]}><sphereGeometry args={[0.02, 8, 8]} /></mesh>
        </group>
      )}
    </group>
  );
};

/* ---------- Llave ---------- */
export const Key3D: React.FC<{glint?: number; scale?: number}> = ({glint = 0, scale = 1}) => {
  const gold = useMemo(() => std('#e8b84a', 0.3, 0.75, {emissive: '#5a3a08', emissiveIntensity: 0.55}), []);
  const star = useMemo(
    () => tex((c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.2, 'rgba(255,240,170,.6)'); g.addColorStop(1, 'rgba(255,220,120,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,240,.95)';
      c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2 + 10, h / 2 - 10); c.lineTo(w, h / 2); c.lineTo(w / 2 + 10, h / 2 + 10); c.lineTo(w / 2, h);
      c.lineTo(w / 2 - 10, h / 2 + 10); c.lineTo(0, h / 2); c.lineTo(w / 2 - 10, h / 2 - 10); c.closePath(); c.fill();
    }, 128, 128),
    [],
  );
  return (
    <group scale={scale}>
      <mesh material={gold} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} castShadow><torusGeometry args={[0.032, 0.011, 12, 24]} /></mesh>
      <mesh material={gold} position={[0, -0.03, 0]} castShadow><cylinderGeometry args={[0.009, 0.009, 0.13, 10]} /></mesh>
      <mesh material={gold} position={[0.022, -0.075, 0]}><boxGeometry args={[0.04, 0.014, 0.012]} /></mesh>
      <mesh material={gold} position={[0.022, -0.1, 0]}><boxGeometry args={[0.03, 0.014, 0.012]} /></mesh>
      {glint > 0 && (
        <sprite position={[0, 0.07, 0.06]} scale={[0.12 * glint, 0.12 * glint, 1]}>
          <spriteMaterial map={star} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
    </group>
  );
};

/* ---------- Lluvia ---------- */
export const RainFx: React.FC<{f: number; center: [number, number, number]; count?: number; opacity?: number}> = ({f, center, count = 1100, opacity = 0.4}) => {
  const arr = useMemo(() => {
    const a = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const bx = (random(`rx${i}`) - 0.5) * 16;
      const bz = (random(`rz${i}`) - 0.5) * 16;
      const sp = 0.55 + random(`rs${i}`) * 0.35;
      const y = 8 - ((random(`ry${i}`) * 10 + f * sp * 0.55) % 10) + 0;
      const len = 0.35 + random(`rl${i}`) * 0.3;
      const x = center[0] + bx - (8 - y) * 0.06;
      const z = center[2] + bz;
      a.set([x, y, z, x - len * 0.12, y - len, z], i * 6);
    }
    return a;
  }, [f, center[0], center[2], count]);
  return (
    <lineSegments key={f}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[arr, 3]} /></bufferGeometry>
      <lineBasicMaterial color="#b4c8ff" transparent opacity={opacity} />
    </lineSegments>
  );
};

/* ---------- Polvo / partículas flotantes ---------- */
export const Dust: React.FC<{f: number; center: [number, number, number]; size: [number, number, number]; count?: number; color?: string}> = ({f, center, size, count = 120, color = '#ffe6a8'}) => {
  const arr = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = center[0] + (random(`dx${i}`) - 0.5) * size[0] + Math.sin(f / 60 + i) * 0.15;
      a[i * 3 + 1] = center[1] + ((random(`dy${i}`) * size[1] + f * 0.004 * (1 + random(`dv${i}`))) % size[1]);
      a[i * 3 + 2] = center[2] + (random(`dz${i}`) - 0.5) * size[2] + Math.cos(f / 70 + i) * 0.15;
    }
    return a;
  }, [f]);
  return (
    <points key={f}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[arr, 3]} /></bufferGeometry>
      <pointsMaterial color={color} size={0.03} transparent opacity={0.7} depthWrite={false} sizeAttenuation />
    </points>
  );
};

/* ---------- Carta 3D ---------- */
export const Letter3D: React.FC<{position: [number, number, number]; rot: [number, number, number]; s?: number; tone?: number}> = ({position, rot, s = 1, tone = 0}) => (
  <group position={position} rotation={rot} scale={s}>
    <mesh castShadow><boxGeometry args={[0.34, 0.22, 0.012]} /><meshStandardMaterial color={`hsl(40,${55 - tone * 20}%,${86 - tone * 16}%)`} roughness={0.9} /></mesh>
    <mesh position={[0, 0, 0.008]}><cylinderGeometry args={[0.028, 0.03, 0.01, 14]} /><meshStandardMaterial color="#a3182d" roughness={0.4} /></mesh>
    <mesh position={[0, 0.03, 0.007]} rotation={[0, 0, 0]}><boxGeometry args={[0.3, 0.003, 0.002]} /><meshStandardMaterial color="#6b4a12" /></mesh>
  </group>
);
