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
  who: 'marisol' | 'aurelio' | 'tomas' | 'elvira';
  sit?: number;
  tear?: number;
  elbowL?: number;
  leftProp?: React.ReactNode;
  f: number;
  talk?: boolean;
  mouth?: number; // 0..1.2 envolvente de la voz
  gesture?: number; // 0..1 gesto de mano al hablar
  handToChest?: number;
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
  who, f, talk = false, mouth = 0, gesture = 0, handToChest = 0, mood = 'neutral', position = [0, 0, 0], rotY = 0, walk = 0, headYaw = 0, headPitch = 0,
  armR = [0.05, 0.12], armL = [0.05, -0.12], elbowR = 0.1, umbrella = false, children, seed = 0, scale = 1,
  sit = 0, tear = 0, elbowL = 0.15, leftProp,
}) => {
  const M = who === 'marisol';
  const A = who === 'aurelio';
  const T = who === 'tomas';
  const E = who === 'elvira';
  const P = <X,>(o: Record<string, X>) => o[who];
  const skin = m(`skin${who}`, P({marisol: '#e9b48f', aurelio: '#b98259', tomas: '#d9a27c', elvira: '#dcaa86'}), 0.55);
  const skinDark = m(`skind${who}`, P({marisol: '#cf8f6c', aurelio: '#8f5f3d', tomas: '#bb8460', elvira: '#c08a68'}), 0.6);
  const hairC = m('hairM', '#15101c', 0.45);
  const top = (MAT[`top${who}`] ||= (() => {
    const mat = std(P({marisol: '#e2a62e', aurelio: '#f2e8d4', tomas: '#3a6ea8', elvira: '#2f4a3a'}), T ? 0.6 : 0.9);
    if (M) {
      const k = tex((c, w, h) => {
        c.fillStyle = '#808080'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
          c.fillStyle = '#d0d0d0'; c.beginPath(); c.ellipse(x + 4, y + 8, 3.5, 7, 0.5, 0, 7); c.fill();
          c.beginPath(); c.ellipse(x + 12, y + 8, 3.5, 7, -0.5, 0, 7); c.fill();
        }
      }, 128, 128, 10, 10);
      mat.bumpMap = k; mat.bumpScale = 1.6;
    }
    return mat;
  })());
  const vest = m('vest', '#6b4a30', 0.8);
  const pants = m(`pants${who}`, P({marisol: '#2f2a45', aurelio: '#3d3226', tomas: '#4a4a55', elvira: '#2f4a3a'}), 0.85);
  const shin = E ? m('stock', '#5a3e36', 0.6) : pants;
  const shoe = m('shoe', '#1d1410', 0.5);
  const white = m('eyew', '#fffaf2', 0.25);
  const iris = m(`iris${who}`, P({marisol: '#4a2c1a', aurelio: '#3a2a1c', tomas: '#2a3a22', elvira: '#5a3a1c'}), 0.2);
  const pupil = m('pupil', '#07040a', 0.1);
  const gray = m('gray', '#d9d6ce', 0.8);
  const lip = m(`lip${who}`, P({marisol: '#b84a5a', aurelio: '#8f3f3f', tomas: '#9a5a50', elvira: '#a0404e'}), 0.5);
  const hairT = m('hairT', '#2a1a12', 0.5);
  const hairE = m('hairE', '#2e2629', 0.5);
  const shawl = m('shawl', '#a3182d', 0.85);
  const mouthIn = m('mouthin', '#3a0d16', 0.5);
  const cheek = new THREE.MeshStandardMaterial({color: '#e8707a', roughness: 0.9, transparent: true, opacity: 0.38});

  const t = f + seed * 13;
  const breathe = Math.sin(t / 22) * 0.008;
  const blink = (f + seed * 29) % 100 < 4 ? 0.08 : 1;
  const open0 = mouth > 0.02 ? Math.min(1, mouth) : talk ? 0.35 + Math.abs(Math.sin(f * 0.85 + seed)) * 0.65 : 0;
  const open = mood === 'shock' ? Math.max(open0, 0.3) : open0;
  const sac = Math.floor((f + seed * 17) / 37);
  const dart = [(random(`sx${who}${sac}`) - 0.5) * 0.006, (random(`sy${who}${sac}`) - 0.5) * 0.004];
  const lid = mood === 'shock' ? 0.0 : mood === 'worried' ? 0.32 : 0.18;
  const swing = Math.sin(walk) * 0.55;
  const bob = walk ? Math.abs(Math.cos(walk)) * 0.035 : 0;
  const browLift = mood === 'worried' ? 0.016 : mood === 'shock' ? 0.03 : 0;
  const browTilt = mood === 'worried' ? 0.28 : mood === 'shock' ? 0.0 : -0.05;
  const eyeS = mood === 'shock' ? 1.18 : 1;
  const stoop = A ? 0.1 : E ? 0.04 : 0;

  const eye = (sx: number) => (
    <group position={[sx * 0.068, 0.025, 0.145]} scale={[eyeS, eyeS, eyeS]}>
      <mesh material={white} scale={[1, 1.18, 0.55]}><sphereGeometry args={[0.046, 24, 20]} /></mesh>
      <group position={[dart[0], dart[1], 0]}>
        <mesh material={iris} position={[sx * 0.004 + headYaw * 0.01, 0, 0.018]} scale={[1, 1, 0.5]}><sphereGeometry args={[0.03, 20, 16]} /></mesh>
        <mesh material={pupil} position={[sx * 0.004 + headYaw * 0.01, 0, 0.026]} scale={[1, 1, 0.5]}><sphereGeometry args={[0.016, 16, 12]} /></mesh>
        <mesh position={[-0.01 + headYaw * 0.01, 0.014, 0.034]}><sphereGeometry args={[0.008, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <mesh position={[0.008, -0.01, 0.033]}><sphereGeometry args={[0.004, 6, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
      {/* párpado superior */}
      <mesh material={skin} rotation={[-0.55 + lid * 1.1 + (1 - blink) * 2.2, 0, sx * (mood === 'worried' ? -0.25 : 0)]} scale={[1.08, 1.22, 0.62]}>
        <sphereGeometry args={[0.048, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {(M || E) && <mesh position={[0, 0.045, 0.012]} rotation={[0, 0, Math.PI / 2]} material={m('lash', '#0b0710', 0.5)}><capsuleGeometry args={[0.004, 0.07, 4, 8]} /></mesh>}
    </group>
  );

  const brow = (sx: number) => (
    <mesh position={[sx * 0.068, 0.088 + browLift, 0.158]} rotation={[0, 0, sx * browTilt + Math.PI / 2]} material={M ? hairC : T ? hairT : E ? hairE : gray} scale={A ? [1.5, 1.3, 1] : T ? [1.25, 1.2, 1] : [1, 1, 0.8]}>
      <capsuleGeometry args={[0.008, 0.055, 4, 8]} />
    </mesh>
  );

  return (
    <group position={[position[0], position[1] + bob - sit * 0.29 * scale, position[2]]} rotation={[0, rotY, 0]} scale={scale}>
      {/* piernas (cadera -> rodilla) */}
      {[-1, 1].map((s2) => (
        <group key={s2} position={[s2 * 0.09, 0.74, 0]} rotation={[s2 * swing - sit * 1.5, 0, 0]}>
          <mesh material={pants} position={[0, -0.18, 0]} castShadow><capsuleGeometry args={[E ? 0.1 : 0.078, 0.24, 6, 14]} /></mesh>
          <group position={[0, -0.37, 0]} rotation={[Math.max(0, -s2 * swing) * 0.6 + sit * 1.5, 0, 0]}>
            <mesh material={shin} position={[0, -0.16, 0]} castShadow><capsuleGeometry args={[E ? 0.055 : 0.07, 0.24, 6, 14]} /></mesh>
            <mesh material={shoe} position={[0, -0.34, 0.05]} scale={[1, 0.55, 1.6]} castShadow><sphereGeometry args={[0.08, 14, 12]} /></mesh>
          </group>
        </group>
      ))}
      {E && (
        <mesh material={pants} position={[0, 0.66 - sit * 0.1, sit * 0.12]} rotation={[-sit * 0.9, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.27, 0.34, 24, 1, true]} />
        </mesh>
      )}
      {/* tronco */}
      <group position={[0, 1.02, 0]} rotation={[stoop, 0, 0]} scale={[1 + breathe, 1 + breathe * 1.5, 1 + breathe]}>
        <mesh material={top} castShadow><capsuleGeometry args={[0.175, 0.36, 8, 20]} /></mesh>
        {M ? (
          <>
            <mesh material={m('topdk', '#c58a1c', 0.85)} position={[0, 0.3, 0.02]} scale={[1.05, 0.35, 1]}><torusGeometry args={[0.15, 0.04, 10, 24]} /></mesh>
            <mesh material={m('stain', '#b86a4a', 0.9)} position={[-0.07, -0.05, 0.172]} scale={[1, 0.6, 0.12]}><sphereGeometry args={[0.04, 12, 10]} /></mesh>
          </>
        ) : T ? (
          <>
            {[-1, 1].map((k) => <mesh key={k} material={m('collar', '#2c5a8c', 0.6)} position={[k * 0.06, 0.3, 0.12]} rotation={[0.5, 0, k * 0.6]}><boxGeometry args={[0.09, 0.04, 0.012]} /></mesh>)}
            <mesh material={m('placket', '#2c5a8c', 0.6)} position={[0, 0.02, 0.176]}><boxGeometry args={[0.025, 0.42, 0.006]} /></mesh>
            {[0, 1, 2, 3].map((i) => <mesh key={i} material={m('btnw', '#e8e8f0', 0.3)} position={[0, 0.2 - i * 0.1, 0.18]}><sphereGeometry args={[0.008, 8, 8]} /></mesh>)}
            <mesh material={m('belt', '#2a1a12', 0.5)} position={[0, -0.27, 0]}><cylinderGeometry args={[0.177, 0.177, 0.04, 24]} /></mesh>
            <mesh material={m('buckle', '#c9a05a', 0.3, 0.8)} position={[0, -0.27, 0.178]}><boxGeometry args={[0.04, 0.03, 0.01]} /></mesh>
          </>
        ) : E ? (
          <>
            <mesh material={shawl} position={[0, 0.24, 0]} scale={[1.15, 0.6, 1.05]} castShadow><torusGeometry args={[0.17, 0.065, 14, 28]} /></mesh>
            {[-1, 1].map((k) => <mesh key={k} material={shawl} position={[k * 0.07, 0.06, 0.15]} rotation={[0.15, 0, k * 0.25]} castShadow><boxGeometry args={[0.11, 0.36, 0.03]} /></mesh>)}
            <mesh position={[0, 0.2, 0.2]}><sphereGeometry args={[0.022, 16, 12]} /><meshStandardMaterial color="#f4f0ea" roughness={0.15} emissive="#3a3530" /></mesh>
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
            {tear > 0 && tear < 1 && (
              <mesh position={[-0.085, -0.01 - tear * 0.11, 0.152 - tear * 0.01]} scale={[1, 1.3, 0.6]}><sphereGeometry args={[0.011, 12, 10]} /><meshStandardMaterial color="#cfe6ff" roughness={0.05} transparent opacity={0.85} emissive="#5a7aa0" /></mesh>
            )}
            {brow(-1)}{brow(1)}
            {/* nariz */}
            <mesh material={skinDark} position={[0, -0.025, 0.168]} scale={A ? [1.25, 1.5, 1.1] : E ? [0.95, 1.15, 0.9] : [1, 1.2, 0.9]}><sphereGeometry args={[0.024, 14, 12]} /></mesh>
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
            ) : T ? (
              <>
                <mesh material={hairT} rotation={[-0.5, 0, 0]} scale={[1.04, 1.08, 1.07]} castShadow><sphereGeometry args={[0.171, 36, 24, 0, Math.PI * 2, 0, 1.45]} /></mesh>
                <mesh material={hairT} position={[0.03, 0.15, 0.06]} rotation={[0.4, 0, -0.3]} scale={[1.4, 0.5, 1]}><sphereGeometry args={[0.07, 14, 10]} /></mesh>
                <mesh position={[0, -0.02, 0.012]} scale={[1.03, 1.12, 1.05]}>
                  <sphereGeometry args={[0.166, 32, 20, Math.PI * 0.15, Math.PI * 1.7, 2.2, 0.9]} />
                  <meshStandardMaterial color="#4a3020" roughness={0.95} transparent opacity={0.55} />
                </mesh>
              </>
            ) : E ? (
              <>
                <mesh material={hairE} rotation={[-0.38, 0, 0]} scale={[1.05, 1.1, 1.08]} castShadow><sphereGeometry args={[0.172, 36, 24, 0, Math.PI * 2, 0, 1.7]} /></mesh>
                <mesh material={hairE} position={[0, 0.1, -0.16]} castShadow><sphereGeometry args={[0.085, 20, 16]} /></mesh>
                <mesh material={m('streak', '#c8c2c6', 0.5)} position={[0.06, 0.13, 0.1]} rotation={[0.3, 0, -0.4]} scale={[1.2, 0.4, 0.6]}><sphereGeometry args={[0.06, 12, 10]} /></mesh>
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
        <group position={[-0.215, 0.27, 0]} rotation={[-swing * 0.9 + armL[0] - gesture * (0.55 + Math.sin(f / 7 + seed) * 0.2) - handToChest * 1.2, 0, armL[1] - handToChest * 0.6]}>
          <mesh material={top} position={[0, -0.16, 0]} castShadow><capsuleGeometry args={[0.052, 0.26, 6, 12]} /></mesh>
          <group position={[0, -0.34, 0]} rotation={[-elbowL - gesture * (0.7 + Math.sin(f / 5 + seed) * 0.25) - handToChest * 1.5, 0, 0]}>
            <mesh material={top} position={[0, -0.15, 0]}><capsuleGeometry args={[0.046, 0.24, 6, 12]} /></mesh>
            <group position={[0, -0.33, 0]}><mesh material={skin} scale={[0.85, 1.15, 0.7]}><sphereGeometry args={[0.055, 16, 12]} /></mesh><mesh material={skin} position={[0.035, 0.01, 0.025]} rotation={[0.4, 0, -0.6]}><capsuleGeometry args={[0.016, 0.035, 4, 8]} /></mesh></group>
            {T && <mesh position={[0, -0.27, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.05, 0.012, 10, 24]} /><meshStandardMaterial color="#e8b84a" metalness={0.85} roughness={0.25} emissive="#4a3008" /></mesh>}
            {leftProp && <group position={[0, -0.34, 0.02]}>{leftProp}</group>}
          </group>
        </group>
        <group position={[0.215, 0.27, 0]} rotation={[swing * 0.9 + armR[0], 0, armR[1]]}>
          <mesh material={top} position={[0, -0.16, 0]} castShadow><capsuleGeometry args={[0.052, 0.26, 6, 12]} /></mesh>
          <group position={[0, -0.34, 0]} rotation={[-elbowR, 0, 0]}>
            <mesh material={top} position={[0, -0.15, 0]}><capsuleGeometry args={[0.046, 0.24, 6, 12]} /></mesh>
            <group position={[0, -0.33, 0]}><mesh material={skin} scale={[0.85, 1.15, 0.7]}><sphereGeometry args={[0.055, 16, 12]} /></mesh><mesh material={skin} position={[0.035, 0.01, 0.025]} rotation={[0.4, 0, -0.6]}><capsuleGeometry args={[0.016, 0.035, 4, 8]} /></mesh></group>
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

/* ---------- Halo luminoso (bloom barato) ---------- */
let GLOW_TEX: THREE.Texture | null = null;
export const Glow: React.FC<{position: [number, number, number]; size: number; color?: string; opacity?: number}> = ({position, size, color = '#ffc070', opacity = 0.6}) => {
  GLOW_TEX ||= tex((c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,255,.55)'); g.addColorStop(0.45, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }, 128, 128);
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={GLOW_TEX} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
    </sprite>
  );
};
