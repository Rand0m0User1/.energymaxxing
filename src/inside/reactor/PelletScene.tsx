// Level 4: inside a pellet. Uranium dioxide crystal: uranium atoms (grey U-238, green U-235) and small oxygen atoms.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useApp } from '../../store';
import { Label, PAL } from './shared';

const CELLS = 4; // unit cells per side
const STEP = 0.42; // half a unit cell

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function useLattice() {
  return useMemo(() => {
    const u: [number, number, number][] = [];
    const o: [number, number, number][] = [];
    const m = CELLS * 2;
    const c = (m * STEP) / 2;
    for (let i = 0; i <= m; i++) for (let j = 0; j <= m; j++) for (let k = 0; k <= m; k++) {
      if ((i + j + k) % 2 === 0) u.push([i * STEP - c, j * STEP - c, k * STEP - c]);
    }
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) for (let k = 0; k < m; k++) {
      o.push([(i + 0.5) * STEP - c, (j + 0.5) * STEP - c, (k + 0.5) * STEP - c]);
    }
    // Fixed shuffled order: the first N in this order are U-235, so raising the share adds green atoms.
    const order = u.map((_, i) => i);
    const r = mulberry(11);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const rank = new Int32Array(u.length);
    order.forEach((idx, pos) => { rank[idx] = pos; });
    return { u, o, rank };
  }, []);
}

export const URANIUM_ATOMS = (() => {
  const m = CELLS * 2;
  return Math.floor(((m + 1) ** 3 + 1) / 2);
})();

export default function PelletScene({ share }: { share: number }) {
  const { u, o, rank } = useLattice();
  const uRef = useRef<THREE.InstancedMesh>(null);
  const oRef = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const reduced = useApp((s) => s.reducedMotion);
  const tmp = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const put = (mesh: THREE.InstancedMesh | null, list: [number, number, number][]) => {
      if (!mesh) return;
      list.forEach((p, i) => { tmp.position.set(p[0], p[1], p[2]); tmp.updateMatrix(); mesh.setMatrixAt(i, tmp.matrix); });
      mesh.instanceMatrix.needsUpdate = true;
    };
    put(uRef.current, u);
    put(oRef.current, o);
  }, [u, o, tmp]);

  useLayoutEffect(() => {
    const mesh = uRef.current;
    if (!mesh) return;
    const nGreen = Math.round(u.length * share);
    const green = new THREE.Color(PAL.u235), grey = new THREE.Color(PAL.u238);
    for (let i = 0; i < u.length; i++) mesh.setColorAt(i, rank[i] < nGreen ? green : grey);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [share, u, rank]);

  useFrame((_, dt) => {
    if (group.current && !reduced) group.current.rotation.y += Math.min(dt, 0.05) * 0.12;
  });

  return (
    <group>
      <group ref={group} rotation={[0.35, 0.6, 0]}>
        <instancedMesh ref={uRef} args={[undefined, undefined, u.length]} frustumCulled={false}>
          <sphereGeometry args={[0.15, 18, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.85} metalness={0} />
        </instancedMesh>
        <instancedMesh ref={oRef} args={[undefined, undefined, o.length]} frustumCulled={false}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshStandardMaterial color={PAL.oxygen} roughness={0.9} metalness={0} />
        </instancedMesh>
      </group>
      {/* a single pellet, for scale */}
      <group position={[-3.6, -1.2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.45, 0.45, 0.7, 32]} />
          <meshStandardMaterial color={PAL.pellet} roughness={0.95} metalness={0} />
        </mesh>
        <Label position={[0, -0.85, 0]}>One pellet</Label>
      </group>
      <Label position={[0, 2.6, 0]}>Atoms inside the pellet, hugely enlarged</Label>
    </group>
  );
}
