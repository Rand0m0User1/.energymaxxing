// Level 3: one fuel bundle (17 x 17 thin rods) and one rod, enlarged, opening to show its pellets.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Label, PAL } from './shared';

const N = 17;
const PITCH = 0.13;
const H = 7.2;
const Y0 = 0.5;
// Standard 17 x 17 guide tube spots (row, col), 0-based.
const GUIDE = new Set([
  '2,5', '2,8', '2,11', '3,3', '3,13', '5,2', '5,5', '5,8', '5,11', '5,14', '8,2', '8,5', '8,8', '8,11', '8,14',
  '11,2', '11,5', '11,8', '11,11', '11,14', '13,3', '13,13', '14,5', '14,8', '14,11',
]);
const OPEN_ROW = 16; // front row
const OPEN_COL = 8;

export default function AssemblyScene({ open }: { open: boolean }) {
  const rodsRef = useRef<THREE.InstancedMesh>(null);
  const guideRef = useRef<THREE.InstancedMesh>(null);
  const hinge = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const tOpen = useRef(0);
  const tmp = useMemo(() => new THREE.Object3D(), []);

  const { fuel, guide } = useMemo(() => {
    const fuel: [number, number][] = [];
    const guide: [number, number][] = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (r === OPEN_ROW && c === OPEN_COL) continue; // this rod is pulled out
      const x = (c - (N - 1) / 2) * PITCH, z = (r - (N - 1) / 2) * PITCH;
      (GUIDE.has(`${r},${c}`) ? guide : fuel).push([x, z]);
    }
    return { fuel, guide };
  }, []);

  useLayoutEffect(() => {
    const put = (m: THREE.InstancedMesh | null, list: [number, number][]) => {
      if (!m) return;
      list.forEach(([x, z], i) => {
        tmp.position.set(x, Y0 + H / 2, z);
        tmp.updateMatrix();
        m.setMatrixAt(i, tmp.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    };
    put(rodsRef.current, fuel);
    put(guideRef.current, guide);
  }, [fuel, guide, tmp]);

  const pellets = useMemo(() => {
    const out: number[] = [];
    const n = 22, ph = 0.2, gap = 0.012;
    for (let i = 0; i < n; i++) out.push(0.15 + i * (ph + gap) + ph / 2);
    return out;
  }, []);
  const pelletRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = pelletRef.current;
    if (!m) return;
    pellets.forEach((y, i) => {
      tmp.position.set(0, y, 0);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [pellets, tmp]);

  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    tOpen.current += (target - tOpen.current) * (1 - Math.exp(-Math.min(dt, 0.05) * 3));
    if (hinge.current) hinge.current.rotation.y = tOpen.current * 2.1;
    if (lift.current) lift.current.position.y = tOpen.current * 0.35;
  });

  const spacerYs = [0.9, 2.1, 3.3, 4.5, 5.7, 6.9];
  const W = N * PITCH + 0.04;
  const openX = (OPEN_COL - (N - 1) / 2) * PITCH, openZ = (OPEN_ROW - (N - 1) / 2) * PITCH;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.01, 0]}>
        <circleGeometry args={[10, 48]} />
        <meshStandardMaterial color={PAL.ground} roughness={1} metalness={0} />
      </mesh>
      {/* The bundle */}
      <instancedMesh ref={rodsRef} args={[undefined, undefined, fuel.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.048, 0.048, H, 8]} />
        <meshStandardMaterial color={PAL.steel} roughness={0.8} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={guideRef} args={[undefined, undefined, guide.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.058, 0.058, H + 0.2, 8]} />
        <meshStandardMaterial color="#e4e7ea" roughness={0.8} metalness={0.05} />
      </instancedMesh>
      {spacerYs.map((y) => (
        <group key={y} position={[0, y, 0]}>
          {[-1, 1].map((sgn) => (
            <mesh key={`x${sgn}`} position={[0, 0, (sgn * W) / 2]}>
              <boxGeometry args={[W, 0.14, 0.02]} />
              <meshStandardMaterial color={PAL.steelDark} roughness={0.85} metalness={0.1} />
            </mesh>
          ))}
          {[-1, 1].map((sgn) => (
            <mesh key={`z${sgn}`} position={[(sgn * W) / 2, 0, 0]}>
              <boxGeometry args={[0.02, 0.14, W]} />
              <meshStandardMaterial color={PAL.steelDark} roughness={0.85} metalness={0.1} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, Y0 - 0.15, 0]}>
        <boxGeometry args={[W + 0.1, 0.3, W + 0.1]} />
        <meshStandardMaterial color={PAL.steelDark} roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[0, Y0 + H + 0.2, 0]}>
        <boxGeometry args={[W + 0.1, 0.3, W + 0.1]} />
        <meshStandardMaterial color={PAL.steelDark} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* The gap where one rod was pulled out */}
      <mesh position={[openX, Y0 + H + 0.45, openZ]}>
        <coneGeometry args={[0.07, 0.18, 10]} />
        <meshStandardMaterial color={PAL.highlight} roughness={0.9} metalness={0} />
      </mesh>

      {/* One rod, enlarged, opening like a door */}
      <group position={[2.9, 0.4, 0.6]}>
        {/* back half of the metal tube */}
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 5, 32, 1, true, Math.PI / 2, Math.PI]} />
          <meshStandardMaterial color={PAL.steel} roughness={0.8} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
        {/* front half swings open on a hinge at x = +0.3 */}
        <group position={[0.3, 0, 0]}>
          <group ref={hinge}>
            <mesh position={[-0.3, 2.5, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 5, 32, 1, true, -Math.PI / 2, Math.PI]} />
              <meshStandardMaterial color={PAL.steel} roughness={0.8} metalness={0.1} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
        <group ref={lift}>
          <instancedMesh ref={pelletRef} args={[undefined, undefined, pellets.length]} frustumCulled={false}>
            <cylinderGeometry args={[0.27, 0.27, 0.2, 24]} />
            <meshStandardMaterial color={PAL.pellet} roughness={0.95} metalness={0} />
          </instancedMesh>
        </group>
        {/* end caps */}
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.31, 0.31, 0.1, 24]} />
          <meshStandardMaterial color={PAL.steelDark} roughness={0.85} metalness={0.1} />
        </mesh>
      </group>

      <Label position={[0, Y0 + H + 0.9, 0]}>Fuel bundle</Label>
      <Label position={[2.9, 5.9, 0.6]}>One fuel rod, enlarged</Label>
      <Label position={[3.9, 1.6, 1.0]}>Pellets</Label>
      <Label position={[-1.6, spacerYs[2], 0]}>Spacer grid</Label>
    </group>
  );
}
