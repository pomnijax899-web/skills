import React, {useMemo} from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {std, tex, Letter3D, Dust, smooth, seg, Glow} from './kit3d';

export const HX = 100; // la casa por dentro vive en x=100

/* ---------------- Exterior de la casa ---------------- */
export const HouseExterior: React.FC<{f: number; lightning?: number}> = ({f, lightning = 0}) => {
  const flick = 0.85 + Math.sin(f / 3.1) * 0.08 + Math.sin(f / 7.7) * 0.07;
  const M = useMemo(() => {
    const wallT = tex((c, w, h) => {
      c.fillStyle = '#c28c7a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${60 + Math.random() * 40},${30 + Math.random() * 30},${30},${Math.random() * 0.08})`; c.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 18, 3 + Math.random() * 18); }
      for (let i = 0; i < 24; i++) { c.fillStyle = 'rgba(40,20,20,.12)'; c.fillRect(Math.random() * w, 0, 3 + Math.random() * 10, h); }
    }, 512, 512, 2, 2);
    const roofT = tex((c, w, h) => {
      c.fillStyle = '#8a3a30'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < w; x += 32) {
        c.fillStyle = `hsl(8 ${45 + Math.random() * 15}% ${26 + Math.random() * 10}%)`; c.beginPath(); c.arc(x + 16, y + 6, 17, 0, Math.PI); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.stroke();
      }
    }, 512, 512, 4, 2);
    const groundT = tex((c, w, h) => {
      c.fillStyle = '#10182a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(${20 + Math.random() * 30},${40 + Math.random() * 50},${50},${Math.random() * 0.25})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 6 + Math.random() * 10); }
    }, 512, 512, 12, 12);
    return {
      wall: new THREE.MeshStandardMaterial({map: wallT, roughness: 0.9}),
      roof: new THREE.MeshStandardMaterial({map: roofT, roughness: 0.75}),
      ground: new THREE.MeshStandardMaterial({map: groundT, roughness: 0.35, metalness: 0.15}),
      wood: std('#3a2418', 0.7), woodDk: std('#1f120b', 0.7), cream: std('#d9c9a8', 0.8), green: std('#2a6a52', 0.8), plant: std('#2f7a4c', 0.8),
      glassOff: std('#1a2540', 0.15, 0.3, {emissive: '#0a1228', emissiveIntensity: 0.6}),
      glassOn: std('#ffcf70', 0.4, 0, {emissive: '#ffb84a', emissiveIntensity: 1.4}),
      stone: std('#5a5a66', 0.6), dark: std('#0c1020', 0.9),
    };
  }, []);

  const win = (x: number, y: number, lit: boolean) => (
    <group position={[x, y, 2.01]}>
      <mesh material={M.woodDk}><boxGeometry args={[1.15, 1.45, 0.1]} /></mesh>
      <mesh material={lit ? M.glassOn : M.glassOff} position={[0, 0, 0.06]}>
        <planeGeometry args={[0.98, 1.28]} />
      </mesh>
      <mesh material={M.woodDk} position={[0, 0, 0.07]}><boxGeometry args={[0.06, 1.28, 0.04]} /></mesh>
      <mesh material={M.woodDk} position={[0, 0, 0.07]}><boxGeometry args={[0.98, 0.06, 0.04]} /></mesh>
      <mesh material={M.green} position={[-0.8, 0, 0.05]} castShadow><boxGeometry args={[0.5, 1.45, 0.06]} /></mesh>
      <mesh material={M.green} position={[0.8, 0, 0.05]} castShadow><boxGeometry args={[0.5, 1.45, 0.06]} /></mesh>
      <mesh material={M.cream} position={[0, -0.78, 0.12]}><boxGeometry args={[1.4, 0.08, 0.28]} /></mesh>
    </group>
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={M.ground}><planeGeometry args={[120, 120]} /></mesh>
      {/* cuerpo */}
      <mesh position={[0, 2.6, 0]} material={M.wall} castShadow receiveShadow><boxGeometry args={[6.2, 5.2, 4]} /></mesh>
      <mesh position={[0, 2.62, 2.0]} material={M.cream}><boxGeometry args={[6.4, 0.14, 0.18]} /></mesh>
      <mesh position={[0, 0.12, 2.0]} material={M.stone}><boxGeometry args={[6.4, 0.24, 0.2]} /></mesh>
      {/* techo */}
      <mesh position={[0, 6.15, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.72]} material={M.roof} castShadow><coneGeometry args={[4.7, 2.2, 4]} /></mesh>
      <mesh position={[1.6, 6.8, -0.5]} material={M.wall} castShadow><boxGeometry args={[0.6, 1.4, 0.6]} /></mesh>
      {/* ventanas */}
      {win(-2.0, 1.75, false)}{win(2.0, 1.75, false)}{win(-2.0, 3.9, false)}
      {win(2.0, 3.9, true)}
      <Glow position={[2, 3.9, 2.2]} size={2.2 * flick} opacity={0.35} />
      <pointLight position={[2, 3.9, 1.2]} color="#ffb84a" intensity={9 * flick} distance={7} decay={2} />
      <pointLight position={[2, 3.9, 2.9]} color="#ffb84a" intensity={4 * flick} distance={5} decay={2} />
      {/* puerta */}
      <group position={[0, 1.2, 2.02]}>
        <mesh material={M.woodDk}><boxGeometry args={[1.7, 2.4, 0.12]} /></mesh>
        <mesh material={M.wood} position={[0, 0, 0.05]} castShadow><boxGeometry args={[1.45, 2.25, 0.1]} /></mesh>
        {[[-0.35, 0.55], [0.35, 0.55], [-0.35, -0.55], [0.35, -0.55]].map(([x, y], i) => (
          <mesh key={i} material={M.woodDk} position={[x, y, 0.11]}><boxGeometry args={[0.55, 0.85, 0.04]} /></mesh>
        ))}
        <mesh position={[0.55, -0.1, 0.16]}><sphereGeometry args={[0.05, 12, 10]} /><meshStandardMaterial color="#e0b050" metalness={0.8} roughness={0.3} /></mesh>
      </group>
      {/* porche */}
      <mesh position={[0, 0.1, 2.95]} material={M.stone} receiveShadow castShadow><boxGeometry args={[5.2, 0.2, 1.9]} /></mesh>
      <mesh position={[0, 0.06, 4.1]} material={M.stone} receiveShadow><boxGeometry args={[2.4, 0.12, 0.5]} /></mesh>
      <mesh position={[0, 3.05, 3.0]} material={M.roof} castShadow><boxGeometry args={[5.4, 0.16, 2.1]} /></mesh>
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, 1.55, 3.7]} material={M.cream} castShadow><cylinderGeometry args={[0.1, 0.12, 2.9, 12]} /></mesh>
      ))}
      {/* farol */}
      <group position={[-1.25, 2.2, 2.15]}>
        <mesh><boxGeometry args={[0.16, 0.28, 0.16]} /><meshStandardMaterial color="#ffcf70" emissive="#ffb040" emissiveIntensity={2.2 * flick} /></mesh>
        <mesh position={[0, 0.2, 0]}><coneGeometry args={[0.14, 0.12, 4]} /><meshStandardMaterial color="#1a0f0a" /></mesh>
        <pointLight color="#ffb347" intensity={10 * flick} distance={8} decay={2} position={[0, 0, 0.3]} />
        <Glow position={[0, 0, 0.12]} size={1.1 * flick} opacity={0.75} />
      </group>
      {/* camino */}
      {Array.from({length: 9}).map((_, i) => (
        <mesh key={i} position={[Math.sin(i * 1.3) * 0.15, 0.015, 4.7 + i * 0.9]} rotation={[-Math.PI / 2, 0, 0.1 * i]} material={M.stone} receiveShadow>
          <circleGeometry args={[0.45, 7]} />
        </mesh>
      ))}
      {/* plantas */}
      {[[-3.5, 3.4], [3.6, 3.2], [-3.2, 2.5], [3.3, 2.4]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} material={M.plant} position={[Math.sin(k * 1.9) * 0.25, 0.7, Math.cos(k * 1.9) * 0.25]} rotation={[Math.cos(k * 1.9) * 0.5, 0, -Math.sin(k * 1.9) * 0.5]} castShadow>
              <coneGeometry args={[0.1, 1.4, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* árboles y colinas al fondo */}
      {[[-14, -8], [-10, -14], [12, -10], [16, -16], [-20, -4], [22, -2], [-8, 14], [10, 16]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh material={std('#1a1410')} position={[0, 1.2, 0]}><cylinderGeometry args={[0.2, 0.3, 2.4, 8]} /></mesh>
          <mesh material={std('#12302a', 0.9)} position={[0, 3.6, 0]} castShadow><coneGeometry args={[1.8, 4.5, 8]} /></mesh>
          <mesh material={std('#12302a', 0.9)} position={[0, 5.2, 0]}><coneGeometry args={[1.3, 3.4, 8]} /></mesh>
        </group>
      ))}
      {[[-30, -40, 14], [10, -50, 18], [45, -35, 12]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, -r * 0.55, z]} material={M.dark}><sphereGeometry args={[r * 1.6, 24, 16]} /></mesh>
      ))}
      {/* luz de relámpago */}
      {lightning > 0 && <ambientLight color="#c8d8ff" intensity={lightning * 3} />}
    </group>
  );
};

/* ---------------- Pasillo ---------------- */
export const Hall: React.FC<{f: number; open: number; seam: number}> = ({f, open, seam}) => {
  const M = useMemo(() => {
    const paper = tex((c, w, h) => {
      c.fillStyle = '#4b2f45'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) { c.fillStyle = 'rgba(30,14,30,.5)'; c.fillRect(x, 0, 10, h); c.fillStyle = 'rgba(190,150,110,.14)'; c.fillRect(x + 12, 0, 3, h); }
      for (let y = 40; y < h; y += 100) for (let x = 32; x < w; x += 64) {
        c.fillStyle = 'rgba(200,160,110,.2)'; c.beginPath(); c.ellipse(x, y, 11, 22, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x, y, 4, 40, 0, 0, 7); c.fill();
      }
      for (let i = 0; i < 1200; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; c.fillRect(Math.random() * w, Math.random() * h, 8, 8); }
    }, 512, 512, 8, 1);
    const floorT = tex((c, w, h) => {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = `hsl(24 ${40 + Math.random() * 10}% ${16 + Math.random() * 8}%)`; c.fillRect(i * (w / 8), 0, w / 8, h);
        c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(i * (w / 8), 0, 3, h);
        for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(i * (w / 8) + Math.random() * 50, Math.random() * h, 1, 30 + Math.random() * 100); }
      }
    }, 512, 512, 1, 12);
    const rugT = tex((c, w, h) => {
      c.fillStyle = '#7a1c2c'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d8b46a'; c.lineWidth = 10; c.strokeRect(14, 0, w - 28, h);
      c.strokeStyle = '#2a1018'; c.lineWidth = 5; c.strokeRect(34, 0, w - 68, h);
      for (let y = 40; y < h; y += 80) { c.fillStyle = '#d8b46a'; c.beginPath(); c.moveTo(w / 2, y - 22); c.lineTo(w / 2 + 22, y); c.lineTo(w / 2, y + 22); c.lineTo(w / 2 - 22, y); c.fill(); }
    }, 256, 512, 1, 6);
    const art = (hue: number) => tex((c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${hue} 30% 22%)`); g.addColorStop(1, `hsl(${hue + 30} 25% 9%)`);
      c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(240,210,160,.35)'; c.beginPath(); c.arc(w / 2, h * 0.38, w * 0.17, 0, 7); c.fill(); c.fillRect(w * 0.3, h * 0.55, w * 0.4, h * 0.4);
    }, 128, 160);
    return {
      paper: new THREE.MeshStandardMaterial({map: paper, roughness: 0.9}),
      floor: new THREE.MeshStandardMaterial({map: floorT, roughness: 0.4, metalness: 0.05}),
      rug: new THREE.MeshStandardMaterial({map: rugT, roughness: 0.95}),
      ceil: std('#17101a', 0.95), wood: std('#2a1a14', 0.6), gold: std('#c9a05a', 0.4, 0.6),
      a1: new THREE.MeshStandardMaterial({map: art(20), roughness: 0.7}), a2: new THREE.MeshStandardMaterial({map: art(200), roughness: 0.7}), a3: new THREE.MeshStandardMaterial({map: art(340), roughness: 0.7}),
    };
  }, []);
  const L = 15; // largo: z de +1 a -14
  const cz = -6.5;
  const sconces = [-1.5, -5.5, -9.5, -12.4];
  return (
    <group position={[HX, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, cz]} material={M.floor} receiveShadow><planeGeometry args={[2.6, L]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, cz]} material={M.rug} receiveShadow><planeGeometry args={[1.05, L - 1]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.1, cz]} material={M.ceil}><planeGeometry args={[2.6, L]} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-1.3, 1.55, cz]} material={M.paper} receiveShadow><planeGeometry args={[L, 3.1]} /></mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[1.3, 1.55, cz]} material={M.paper} receiveShadow><planeGeometry args={[L, 3.1]} /></mesh>
      {/* zócalo y friso */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.28, 0.55, cz]} material={M.wood} receiveShadow><boxGeometry args={[0.05, 1.1, L]} /></mesh>
          <mesh position={[s * 1.27, 1.12, cz]} material={M.gold}><boxGeometry args={[0.08, 0.04, L]} /></mesh>
          <mesh position={[s * 1.27, 3.04, cz]} material={M.wood}><boxGeometry args={[0.1, 0.1, L]} /></mesh>
        </group>
      ))}
      {/* cuadros */}
      {[[-3.5, -1, 'a1'], [-7.5, 1, 'a2'], [-11, -1, 'a3'], [-4, 1, 'a3'], [-8.5, -1, 'a1']].map(([z, s, k], i) => (
        <group key={i} position={[(s as number) * 1.24, 1.95, z as number]} rotation={[0, (s as number) * -Math.PI / 2, 0]}>
          <mesh material={M.gold}><boxGeometry args={[0.52, 0.66, 0.05]} /></mesh>
          <mesh material={(M as any)[k as string]} position={[0, 0, 0.03]}><planeGeometry args={[0.42, 0.56]} /></mesh>
        </group>
      ))}
      {/* apliques con llama */}
      {sconces.map((z, i) => {
        const fl = 0.8 + Math.sin(f / 3 + i * 2) * 0.12 + Math.sin(f / 9 + i) * 0.08;
        return [-1, 1].map((s) => (
          <group key={`${i}${s}`} position={[s * 1.22, 2.1, z]} rotation={[0, -s * Math.PI / 2, 0]}>
            <mesh material={M.gold}><boxGeometry args={[0.1, 0.16, 0.08]} /></mesh>
            <mesh position={[0, 0.14, 0.04]}><cylinderGeometry args={[0.025, 0.03, 0.16, 8]} /><meshStandardMaterial color="#efe4c8" /></mesh>
            <mesh position={[0, 0.27, 0.04]} scale={[1, 1.6 * fl, 1]}><sphereGeometry args={[0.03, 10, 8]} /><meshBasicMaterial color="#ffd37a" /></mesh>
            <Glow position={[0, 0.28, 0.06]} size={0.45 * fl} opacity={0.8} />
            {s === 1 && <pointLight position={[0, 0.3, 0.3]} color="#ffb85a" intensity={5.5 * fl} distance={5} decay={2} />}
          </group>
        ));
      })}
      {/* puertas decorativas */}
      {[[-3.2, -1], [-7.2, 1], [-10.4, -1]].map(([z, s], i) => (
        <mesh key={i} position={[(s as number) * 1.25, 1.1, z as number]} material={M.wood}><boxGeometry args={[0.04, 2.2, 0.95]} /></mesh>
      ))}
      {/* pared del fondo con hueco de puerta */}
      <mesh position={[-0.95, 1.55, -14]} material={M.paper}><boxGeometry args={[0.7, 3.1, 0.1]} /></mesh>
      <mesh position={[0.95, 1.55, -14]} material={M.paper}><boxGeometry args={[0.7, 3.1, 0.1]} /></mesh>
      <mesh position={[0, 2.7, -14]} material={M.paper}><boxGeometry args={[1.2, 0.8, 0.1]} /></mesh>
      {/* contorno de luz que delata la puerta antes de abrir */}
      {open < 0.02 && (() => {
        const e = seg(f, 560, 700) * 0.9 + 0.15 + Math.sin(f / 10) * 0.06;
        const mat = <meshStandardMaterial color="#1b0f18" emissive="#ffc766" emissiveIntensity={e * 3} />;
        return (
          <group position={[0, 0, -13.915]}>
            <mesh position={[0, 2.31, 0]}><boxGeometry args={[1.24, 0.025, 0.01]} />{mat}</mesh>
            <mesh position={[-0.61, 1.15, 0]}><boxGeometry args={[0.025, 2.32, 0.01]} />{mat}</mesh>
            <mesh position={[0.61, 1.15, 0]}><boxGeometry args={[0.025, 2.32, 0.01]} />{mat}</mesh>
            <pointLight position={[0, 1.2, -13.0 + 13.915 - 0.4]} color="#ffc766" intensity={e * 1.5} distance={4} decay={2} />
          </group>
        );
      })()}
      {/* hoja de la puerta (bisagra a la derecha, cerradura a la izquierda) */}
      <group position={[0.6, 0, -13.96]} rotation={[0, -open * 1.9, 0]}>
        <mesh position={[-0.6, 1.15, 0]} material={M.paper} castShadow><boxGeometry args={[1.17, 2.28, 0.08]} /></mesh>
        <mesh position={[-0.6, 1.15, 0.045]} material={M.wood}><boxGeometry args={[1.0, 0.03, 0.01]} /></mesh>
        <mesh position={[-1.0, 1.25, 0.05]} material={M.gold}><boxGeometry args={[0.07, 0.18, 0.02]} /></mesh>
        <mesh position={[-1.0, 1.28, 0.065]}><boxGeometry args={[0.014, 0.04, 0.01]} /><meshBasicMaterial color="#000" /></mesh>
      </group>
      {open > 0 && <pointLight position={[0, 1.6, -15.5]} color="#ffd9a0" intensity={30 * open} distance={14} decay={2} />}
      {open > 0.02 && (
        <mesh position={[0, 0.011, -12.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 3.6]} />
          <meshBasicMaterial color="#ffd9a0" transparent opacity={0.22 * open} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      <Dust f={f} center={[0, 0.2, -6]} size={[1.8, 2.8, 12]} count={90} />
    </group>
  );
};

/* ---------------- Sala de las cartas ---------------- */
export const LetterRoom: React.FC<{f: number; rise: number}> = ({f, rise}) => {
  const M = useMemo(() => {
    const floorT = tex((c, w, h) => {
      for (let i = 0; i < 10; i++) { c.fillStyle = `hsl(28 ${38 + Math.random() * 12}% ${20 + Math.random() * 8}%)`; c.fillRect(i * (w / 10), 0, w / 10, h); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(i * (w / 10), 0, 3, h); }
    }, 512, 512, 3, 4);
    const panelT = tex((c, w, h) => {
      c.fillStyle = '#4a3020'; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 6; k++) { c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(k * 85 + 4, 12, 74, h - 24); }
    }, 512, 512, 4, 1);
    return {
      floor: new THREE.MeshStandardMaterial({map: floorT, roughness: 0.45}),
      panel: new THREE.MeshStandardMaterial({map: panelT, roughness: 0.8}),
      wood: std('#2c1a10', 0.6), cream: std('#efe0b8', 0.9), cream2: std('#d9c28f', 0.9), ceil: std('#1c1218', 0.95),
    };
  }, []);
  const W = 6, Hh = 3.6, D = 9;
  const spotTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(HX, 0.5, -16); o.updateMatrixWorld(); return o; }, []);
  const letters = useMemo(() => Array.from({length: 38}).map((_, i) => ({
    x: (random(`lx${i}`) - 0.5) * 4.4, y: 0.7 + random(`ly${i}`) * 2.3, z: -1.2 - random(`lz${i}`) * 6.4,
    r: [(random(`la${i}`) - 0.5) * 1.2, (random(`lb${i}`) - 0.5) * 1.6, (random(`lc${i}`) - 0.5) * 1.2] as [number, number, number],
    s: 0.8 + random(`ls${i}`) * 0.6, t: random(`lt${i}`), ph: random(`lp${i}`) * 6,
  })), []);
  const beam = (x: number, w: number, o: number) => (
    <mesh position={[x, 1.8, -D + 2.2]} rotation={[0, 0, 0]}>
      <cylinderGeometry args={[w, w * 0.4, 7.2, 24, 1, true]} />
      <meshBasicMaterial color="#ffe0a0" transparent opacity={o} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
  return (
    <group position={[HX, 0, -14]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -D / 2]} material={M.floor} receiveShadow><planeGeometry args={[W, D]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, Hh, -D / 2]} material={M.ceil}><planeGeometry args={[W, D]} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-W / 2, Hh / 2, -D / 2]} material={M.panel}><planeGeometry args={[D, Hh]} /></mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[W / 2, Hh / 2, -D / 2]} material={M.panel}><planeGeometry args={[D, Hh]} /></mesh>
      <mesh position={[0, Hh / 2, -D]} material={M.panel}><planeGeometry args={[W, Hh]} /></mesh>
      {/* estantes llenos de cartas */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 2 - 0.25), 0, 0]}>
          <mesh position={[0, Hh / 2, -D / 2 - 0.3]} material={M.wood}><boxGeometry args={[0.5, Hh, D - 1.2]} /></mesh>
          {[0.45, 1.15, 1.85, 2.55].map((y, ri) => (
            <group key={ri}>
              {Array.from({length: 11}).map((_, k) => (
                <mesh key={k} position={[-s * 0.2, y + 0.11, -1.2 - k * 0.65]} rotation={[0, 0, (k % 3 - 1) * 0.12]} material={k % 2 ? M.cream : M.cream2} castShadow>
                  <boxGeometry args={[0.22, 0.26, 0.42]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
      {/* escritorio con lámpara */}
      <group position={[-1.2, 0, -6.2]}>
        <mesh position={[0, 0.75, 0]} material={M.wood} castShadow><boxGeometry args={[1.6, 0.08, 0.8]} /></mesh>
        {[[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]].map(([x, z], i) => <mesh key={i} position={[x, 0.37, z]} material={M.wood}><boxGeometry args={[0.07, 0.74, 0.07]} /></mesh>)}
        <mesh position={[0.4, 0.95, 0]}><cylinderGeometry args={[0.1, 0.14, 0.3, 12, 1, true]} /><meshStandardMaterial color="#e8b04a" emissive="#ffb347" emissiveIntensity={1.2} side={THREE.DoubleSide} /></mesh>
        <Glow position={[0.4, 0.95, 0.15]} size={0.9} opacity={0.6} />
        <pointLight position={[0.4, 1.0, 0.1]} color="#ffb347" intensity={6 + Math.sin(f / 5) * 0.6} distance={6} decay={2} />
      </group>
      {/* ventana trasera con luz */}
      <mesh position={[0, 1.9, -D + 0.02]}><planeGeometry args={[1.9, 2.8]} /><meshBasicMaterial color="#ffe3a8" /></mesh>
      <mesh position={[0, 3.3, -D + 0.03]}><circleGeometry args={[0.95, 32, 0, Math.PI]} /><meshBasicMaterial color="#ffe3a8" /></mesh>
      <Glow position={[0, 2.1, -D + 0.3]} size={4.5} color="#ffe0a0" opacity={0.5} />
      {beam(0, 1.1, 0.07)}{beam(-0.5, 0.6, 0.05)}
      <spotLight position={[0, 3.2, -D + 0.5]} target={spotTarget} color="#ffd9a0" intensity={90} angle={0.9} penumbra={0.8} distance={16} decay={1.6} />
      <pointLight position={[0, 2.8, -3]} color="#ffcc88" intensity={10} distance={12} decay={2} />
      <pointLight position={[0, 1.6, -0.6]} color="#ffdcae" intensity={8} distance={7} decay={2} />
      {/* cartas flotando */}
      {letters.map((l, i) => {
        const r = smooth(seg(rise, l.t * 0.5, l.t * 0.5 + 0.5));
        const y = l.y - (1 - r) * 1.2 + Math.sin(f / 26 + l.ph) * 0.07;
        return (
          <Letter3D key={i} position={[l.x + Math.cos(f / 44 + l.ph) * 0.06, y, l.z]} rot={[l.r[0] + Math.sin(f / 31 + l.ph) * 0.15, l.r[1] + f * 0.006 * (i % 2 ? 1 : -1), l.r[2] + Math.sin(f / 37 + l.ph) * 0.1]} s={l.s * r} tone={l.t} />
        );
      })}
      <Dust f={f} center={[0, 0, -D / 2]} size={[5, 3.4, D]} count={160} />
    </group>
  );
};
