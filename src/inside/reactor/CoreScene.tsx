// Level 2: the core. Fuel bundles standing in water, control rods above that slide in and out.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { coreK, Label, PAL, type CoreState } from './shared';

const PITCH = 0.62;
const CORE_R = 4.5;
const ASSY_H = 3.6;
const ASSY_Y0 = 0.4; // bottom of the fuel

function useLayout() {
  return useMemo(() => {
    const assy: [number, number][] = [];
    const rods: [number, number][] = [];
    const n = 15;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i - (n - 1) / 2) * PITCH, z = (j - (n - 1) / 2) * PITCH;
      if (Math.hypot(x, z) > CORE_R) continue;
      assy.push([x, z]);
      if (i % 2 === 1 && j % 2 === 1) rods.push([x, z]);
    }
    return { assy, rods };
  }, []);
}

export default function CoreScene({ core }: { core: CoreState }) {
  const { assy, rods } = useLayout();
  const assyRef = useRef<THREE.InstancedMesh>(null);
  const rodRef = useRef<THREE.InstancedMesh>(null);
  const shaftRef = useRef<THREE.InstancedMesh>(null);
  const fuelMat = useRef<THREE.MeshStandardMaterial>(null);
  const waterMat = useRef<THREE.MeshStandardMaterial>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const cool = useMemo(() => new THREE.Color(PAL.fuel), []);
  const warm = useMemo(() => new THREE.Color('#d9a27a'), []);
  const waterCool = useMemo(() => new THREE.Color(PAL.water), []);
  const waterWarm = useMemo(() => new THREE.Color('#e7c3a4'), []);

  useLayoutEffect(() => {
    const m = assyRef.current;
    if (!m) return;
    assy.forEach(([x, z], i) => {
      tmp.position.set(x, ASSY_Y0 + ASSY_H / 2, z);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [assy, tmp]);

  useFrame((_, dtIn) => {
    const dt = Math.min(dtIn, 0.05);
    // Rods glide toward the slider position.
    core.shown += (core.target - core.shown) * (1 - Math.exp(-dt * 3));
    const k = coreK(core.shown);
    core.power = Math.max(0.02, Math.min(1, core.power * Math.exp(((k - 1) / 0.9) * dt)));
    const bottom = ASSY_Y0 + ASSY_H * (1 - core.shown);
    const r = rodRef.current, s = shaftRef.current;
    if (r && s) {
      rods.forEach(([x, z], i) => {
        tmp.position.set(x, bottom + ASSY_H / 2, z);
        tmp.scale.set(1, 1, 1);
        tmp.updateMatrix();
        r.setMatrixAt(i, tmp.matrix);
        const top = 8.2;
        const len = Math.max(0.01, top - (bottom + ASSY_H));
        tmp.position.set(x, bottom + ASSY_H + len / 2, z);
        tmp.scale.set(1, len, 1);
        tmp.updateMatrix();
        s.setMatrixAt(i, tmp.matrix);
      });
      r.instanceMatrix.needsUpdate = true;
      s.instanceMatrix.needsUpdate = true;
    }
    const heat = Math.max(0, Math.min(1, (core.power - 0.3) / 0.7));
    if (fuelMat.current) fuelMat.current.color.copy(cool).lerp(warm, heat * 0.6);
    if (waterMat.current) waterMat.current.color.copy(waterCool).lerp(waterWarm, heat * 0.5);
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[14, 48]} />
        <meshStandardMaterial color={PAL.ground} roughness={1} metalness={0} />
      </mesh>
      {/* Steel pot, cut open toward the viewer */}
      <mesh position={[0, 3.0, 0]}>
        <cylinderGeometry args={[5.2, 5.2, 6, 64, 1, true, Math.PI / 4, Math.PI * 1.5]} />
        <meshStandardMaterial color={PAL.steel} roughness={0.85} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[5.2, 5.2, 0.2, 64]} />
        <meshStandardMaterial color={PAL.steelDark} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Water */}
      <mesh position={[0, 2.85, 0]}>
        <cylinderGeometry args={[5.1, 5.1, 5.5, 64, 1, false, Math.PI / 4, Math.PI * 1.5]} />
        <meshStandardMaterial ref={waterMat} color={PAL.water} roughness={1} metalness={0} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <instancedMesh ref={assyRef} args={[undefined, undefined, assy.length]} frustumCulled={false}>
        <boxGeometry args={[PITCH * 0.86, ASSY_H, PITCH * 0.86]} />
        <meshStandardMaterial ref={fuelMat} color={PAL.fuel} roughness={0.9} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={rodRef} args={[undefined, undefined, rods.length]} frustumCulled={false}>
        <boxGeometry args={[0.22, ASSY_H, 0.22]} />
        <meshStandardMaterial color={PAL.rod} roughness={0.85} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={shaftRef} args={[undefined, undefined, rods.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshStandardMaterial color={PAL.steelDark} roughness={0.9} metalness={0.1} />
      </instancedMesh>
      {/* Lid frame that holds the rod drives */}
      <mesh position={[0, 8.3, 0]}>
        <torusGeometry args={[4.6, 0.08, 8, 64]} />
        <meshStandardMaterial color={PAL.steelDark} roughness={0.9} metalness={0.1} />
      </mesh>
      <Label position={[0, 9.0, 0]}>Control rod drives</Label>
      <Label position={[5.6, 4.6, 2.2]}>Water</Label>
      <Label position={[1.2, 0.0, 4.9]}>Fuel bundles</Label>
    </group>
  );
}
