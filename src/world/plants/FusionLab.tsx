// Fusion lab (SPEC §5.1, §8.4): low building with a glass roof and three small machines inside —
// a tokamak with a faint pink-violet ring, a long pulsed tube (Helion style) and a laser target (NIF).
// Animates only when fusion is switched on.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../store';
import { SOURCE_COLORS } from '../../data/colors';
import { GEO, NEUTRAL, Block, Cyl, Instanced, Sign, accent, approach, mat, ownMat, usePlantOn, type InstanceItem } from './shared';

const W = 16;
const D = 10;
const H = 3;

/** Vessel with a cut-away quarter so the plasma ring shows from the front. */
const GAP_FROM = 1.55 * Math.PI;
const torusVessel = new THREE.TorusGeometry(1.5, 0.6, 14, 36, GAP_FROM);
/** Turns the cut-away toward +z (the default camera side). */
const VESSEL_RY = 1.275 * Math.PI;
const torusPlasma = new THREE.TorusGeometry(1.5, 0.2, 10, 48);
const coilGeo = new THREE.TorusGeometry(0.78, 0.1, 8, 20);
const ringGeo = new THREE.TorusGeometry(0.62, 0.09, 8, 24);
const frameGeo = new THREE.TorusGeometry(1.4, 0.06, 6, 32);

const COILS: InstanceItem[] = Array.from({ length: 12 }, (_, k) => (k / 12) * Math.PI * 2)
  .filter((th) => th > 0.12 && th < GAP_FROM - 0.12)
  .map((th) => ({ p: [Math.cos(th) * 1.5, 0, Math.sin(th) * 1.5], s: [1, 1, 1], ry: -th }));

/** Beam lines converging on the NIF target from above and the sides. */
const BEAMS: InstanceItem[] = (() => {
  const out: InstanceItem[] = [];
  const len = 2.2;
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < 12; k++) {
    const az = (k / 12) * Math.PI * 2;
    const el = k % 2 === 0 ? 0.35 : 0.85;
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    q.setFromUnitVectors(up, dir);
    e.setFromQuaternion(q);
    const mid = dir.clone().multiplyScalar(len / 2 + 0.2);
    out.push({ p: [mid.x, mid.y, mid.z], s: [0.035, len, 0.035], rx: e.x, ry: e.y, rz: e.z });
  }
  return out;
})();

export default function FusionLab() {
  const on = usePlantOn('fusion');
  const onRef = useRef(on);
  onRef.current = on;

  const plasmaMat = useMemo(() => ownMat(SOURCE_COLORS.fusion, { opacity: 0.0, rough: 1 }), []);
  const beamMat = useMemo(() => ownMat('#f3d7e6', { opacity: 0.0, rough: 1 }), []);
  const glass = useMemo(() => mat(NEUTRAL.glass, { opacity: 0.22, rough: 0.8 }), []);
  const blobRef = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const targetRef = useRef<THREE.Mesh>(null);
  const st = useRef({ t: 0, level: 0 });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const s = st.current;
    const reduced = useApp.getState().reducedMotion;
    s.level = approach(s.level, onRef.current ? 1 : 0, 2, dt);
    if (onRef.current && !reduced) s.t += dt;
    const t = s.t;

    // Tokamak: faint ring that breathes a little, with a small bright spot running around it.
    plasmaMat.opacity = s.level * (0.45 + 0.12 * Math.sin(t * 2.2));
    plasmaMat.visible = s.level > 0.01;
    if (blobRef.current) {
      const a = t * 2.6;
      blobRef.current.position.set(Math.cos(a) * 1.5, 0, -Math.sin(a) * 1.5);
      blobRef.current.visible = s.level > 0.05;
    }

    // Helion-style tube: two rings move in from the ends and meet in the middle, then reset.
    const cyc = (t % 2.6) / 2.6;
    const x = 2.7 * (1 - Math.min(1, cyc / 0.8));
    if (ringA.current) { ringA.current.position.x = -x; ringA.current.visible = s.level > 0.05; }
    if (ringB.current) { ringB.current.position.x = x; ringB.current.visible = s.level > 0.05; }

    // Laser target: beams flash briefly every few seconds.
    const shot = (t % 3.5) / 3.5;
    const flash = shot < 0.12 ? Math.sin((shot / 0.12) * Math.PI) : 0;
    beamMat.opacity = s.level * (0.12 + 0.6 * flash);
    beamMat.visible = s.level > 0.01;
    if (targetRef.current) {
      const sc = 0.16 * (1 + 0.6 * flash * s.level);
      targetRef.current.scale.setScalar(sc);
    }
  });

  const fusionAccent = accent(SOURCE_COLORS.fusion, on);
  const steel = mat(NEUTRAL.steel, { rough: 0.8, metal: 0.1 });
  const wallMat = mat(NEUTRAL.offWhite);

  const walls: InstanceItem[] = useMemo(() => [
    { p: [0, H / 2, -D / 2], s: [W, H, 0.3] },
    { p: [-W / 2, H / 2, 0], s: [0.3, H, D] },
    { p: [W / 2, H / 2, 0], s: [0.3, H, D] },
    { p: [-4.6, H / 2, D / 2], s: [W / 2 - 1.2, H, 0.3] },
    { p: [4.6, H / 2, D / 2], s: [W / 2 - 1.2, H, 0.3] },
    { p: [0, H - 0.4, D / 2], s: [2.6, 0.8, 0.3] },
  ], []);
  const beams: InstanceItem[] = useMemo(() => Array.from({ length: 7 }, (_, k) => ({
    p: [(k - 3) * (W / 7), H + 0.12, 0] as [number, number, number], s: [0.14, 0.16, D] as [number, number, number],
  })), []);

  return (
    <group>
      {/* Floor, walls, a fusion-coloured strip along the front, glass roof on light beams */}
      <Block p={[0, 0, 0]} s={[W + 1, 0.12, D + 1]} color={NEUTRAL.concrete} shadow={false} />
      <Instanced items={walls} material={wallMat} />
      <Block p={[0, H - 0.25, D / 2 + 0.16]} s={[W, 0.25, 0.05]} color={fusionAccent} shadow={false} />
      <Instanced items={beams} material={mat(NEUTRAL.roof)} />
      <mesh geometry={GEO.box} material={glass} position={[0, H + 0.24, 0]} scale={[W, 0.06, D]} />

      {/* Tokamak */}
      <group position={[-4.3, 0.12, 0.2]}>
        <Block p={[0, 0, 0]} s={[4.6, 0.5, 4.6]} color={NEUTRAL.concreteDark} />
        <group position={[0, 1.3, 0]} rotation={[0, VESSEL_RY, 0]}>
          <mesh geometry={torusVessel} material={mat('#b9bdc2', { rough: 0.85, metal: 0.1, side: THREE.DoubleSide })} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow />
          <Instanced items={COILS} geometry={coilGeo} material={steel} />
          <mesh geometry={torusPlasma} material={plasmaMat} rotation={[Math.PI / 2, 0, 0]} />
          <mesh ref={blobRef} geometry={GEO.sphere} material={mat('#f1c6dc', { rough: 1 })} position={[1.5, 0, 0]} scale={0.22} />
        </group>
      </group>

      {/* Pulsed tube (Helion style) */}
      <group position={[2.6, 0.12, -2.3]}>
        <Block p={[-2.2, 0, 0]} s={[0.5, 0.9, 0.9]} color={NEUTRAL.concreteDark} />
        <Block p={[2.2, 0, 0]} s={[0.5, 0.9, 0.9]} color={NEUTRAL.concreteDark} />
        <mesh geometry={GEO.cyl} material={mat('#c3c7cb', { rough: 0.85, metal: 0.1 })} position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.9, 6.2, 0.9]} castShadow receiveShadow />
        <mesh geometry={GEO.cyl} material={mat(fusionAccent)} position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.1, 0.5, 1.1]} castShadow />
        <mesh ref={ringA} geometry={ringGeo} material={mat('#e9b3cd', { rough: 1 })} position={[-2.7, 1.3, 0]} rotation={[0, Math.PI / 2, 0]} />
        <mesh ref={ringB} geometry={ringGeo} material={mat('#e9b3cd', { rough: 1 })} position={[2.7, 1.3, 0]} rotation={[0, Math.PI / 2, 0]} />
      </group>

      {/* Laser target (NIF style) */}
      <group position={[4.2, 0.12, 2.2]}>
        <Cyl p={[0, 0, 0]} r={0.9} h={0.3} color={NEUTRAL.concreteDark} />
        <Cyl p={[0, 0.3, 0]} r={0.05} h={1.2} color={NEUTRAL.steel} shadow={false} />
        <group position={[0, 1.55, 0]}>
          <mesh ref={targetRef} geometry={GEO.sphere} material={mat('#e8d6a8', { rough: 0.9 })} scale={0.16} />
          <mesh geometry={frameGeo} material={steel} rotation={[Math.PI / 2, 0, 0]} castShadow />
          <Instanced items={BEAMS} geometry={GEO.cylLow} material={beamMat} shadow={false} />
        </group>
      </group>

      <Sign position={[0, H + 2.2, D / 2 + 0.6]} width={210}>
        Experimental: no fusion plant has put electricity on a grid yet.
      </Sign>
    </group>
  );
}
