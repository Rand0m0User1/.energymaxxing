// Level 1: plant cutaway. Dome, turbine hall, cooling tower, and three loops with moving dots.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useApp } from '../../store';
import { Label, PAL } from './shared';

type V3 = [number, number, number];

function Loop({ points, color, dotColor, dots, speed, radius = 0.07, dotSize = 0.13, tubeOpacity = 0.7, closed = true }: {
  points: V3[]; color: string; dotColor: string; dots: number; speed: number; radius?: number; dotSize?: number; tubeOpacity?: number; closed?: boolean;
}) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal'), [points, closed]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 220, radius, 8, closed), [curve, radius, closed]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const t = useRef(0);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(dotSize, dotSize, dotSize), [dotSize]);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    t.current = (t.current + Math.min(dt, 0.05) * speed) % 1;
    for (let i = 0; i < dots; i++) {
      let u = t.current + i / dots;
      u -= Math.floor(u);
      curve.getPointAt(u, p);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh geometry={tube}>
        <meshStandardMaterial color={color} roughness={0.9} metalness={0} transparent opacity={tubeOpacity} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, dots]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color={dotColor} roughness={0.85} metalness={0} />
      </instancedMesh>
    </group>
  );
}

const HOT: V3[] = [[-8.2, 3.0, 0.95], [-7.6, 3.95, 0.95], [-6.4, 3.95, 0.95], [-5.55, 3.6, 0.95], [-5.3, 2.4, 0.95], [-5.55, 1.2, 0.95], [-6.4, 0.65, 0.95], [-7.6, 0.65, 0.95], [-8.35, 1.4, 0.95], [-8.45, 2.3, 0.95]];
const STEAM: V3[] = [[-5.6, 5.05, -0.2], [-4.4, 5.6, -0.1], [-1.2, 5.2, 0.4], [0.3, 3.6, 1.0], [1.0, 2.6, 1.35], [2.6, 2.7, 1.45], [4.4, 2.5, 1.45], [4.9, 1.4, 1.35], [3.8, 0.75, 1.35], [1.6, 0.6, 1.3], [-1.6, 0.45, 1.2], [-3.8, 0.55, 1.1], [-4.6, 1.3, 0.6], [-4.95, 3.2, 0.2], [-5.2, 4.6, -0.1]];
const COOL: V3[] = [[2.2, 0.35, -0.75], [5.0, 0.3, -1.6], [8.6, 0.3, -3.0], [11.2, 0.6, -4.2], [12.2, 2.4, -5.0], [12.9, 0.6, -4.1], [10.0, 0.25, -2.4], [6.0, 0.25, -0.9], [3.6, 0.35, -0.6]];
const POWER: V3[] = [[6.7, 2.0, 0.6], [8.2, 3.2, 0.7], [9.6, 4.0, 0.8], [12.0, 4.0, 1.2], [15.0, 4.0, 1.6]];

/** An open cylinder with a quarter cut out facing the camera, with a darker inside face. */
function CutCylinder({ r, h, y, x, z }: { r: number; h: number; y: number; x: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh>
        <cylinderGeometry args={[r, r, h, 56, 1, true, Math.PI / 4, Math.PI * 1.5]} />
        <meshStandardMaterial color={PAL.concrete} roughness={0.95} metalness={0} side={THREE.FrontSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[r - 0.02, r - 0.02, h, 56, 1, true, Math.PI / 4, Math.PI * 1.5]} />
        <meshStandardMaterial color={PAL.concreteIn} roughness={1} metalness={0} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <sphereGeometry args={[r, 56, 20, (3 * Math.PI) / 4, Math.PI * 1.5, 0, Math.PI / 2]} />
        <meshStandardMaterial color={PAL.concrete} roughness={0.95} metalness={0} side={THREE.FrontSide} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <sphereGeometry args={[r - 0.02, 56, 20, (3 * Math.PI) / 4, Math.PI * 1.5, 0, Math.PI / 2]} />
        <meshStandardMaterial color={PAL.concreteIn} roughness={1} metalness={0} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function CoolingTower() {
  const geom = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const y = (i / 24) * 6;
      const w = 1.45 + 0.7 * Math.pow((y - 4.1) / 4.1, 2) * (y < 4.1 ? 1 : 0.35);
      pts.push(new THREE.Vector2(w, y));
    }
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  return (
    <mesh geometry={geom} position={[12.5, 0, -5]}>
      <meshStandardMaterial color={PAL.concrete} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Turbine() {
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (spin.current) spin.current.rotation.x += Math.min(dt, 0.05) * 2.2; });
  return (
    <group position={[0, 2.0, 0]}>
      <group ref={spin}>
        <mesh position={[1.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.55, 0.75, 1.2, 28]} />
          <meshStandardMaterial color={PAL.steel} roughness={0.8} metalness={0.1} />
        </mesh>
        <mesh position={[3.25, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.85, 1.05, 2.1, 28]} />
          <meshStandardMaterial color={PAL.steel} roughness={0.8} metalness={0.1} />
        </mesh>
      </group>
      <mesh position={[3.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 6.4, 10]} />
        <meshStandardMaterial color={PAL.steelDark} roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[5.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.78, 0.78, 1.8, 28]} />
        <meshStandardMaterial color={PAL.steelDark} roughness={0.85} metalness={0.1} />
      </mesh>
    </group>
  );
}

export default function PlantScene() {
  const reduced = useApp((s) => s.reducedMotion);
  const k = reduced ? 0.5 : 1;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, -0.01, -1]}>
        <planeGeometry args={[44, 26]} />
        <meshStandardMaterial color={PAL.ground} roughness={1} metalness={0} />
      </mesh>

      {/* Containment building, cut open */}
      <CutCylinder x={-7} y={2.5} z={-0.3} r={3.6} h={5} />
      <mesh position={[-7, 0.05, -0.3]}>
        <cylinderGeometry args={[3.6, 3.6, 0.1, 56]} />
        <meshStandardMaterial color={PAL.floor} roughness={1} metalness={0} />
      </mesh>
      {/* Reactor vessel */}
      <mesh position={[-8.2, 1.9, -0.3]}>
        <cylinderGeometry args={[0.9, 0.9, 3.2, 32]} />
        <meshStandardMaterial color={PAL.vessel} roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[-8.2, 3.5, -0.3]}>
        <sphereGeometry args={[0.9, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={PAL.vessel} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Steam generator */}
      <mesh position={[-5.6, 2.6, -0.3]}>
        <cylinderGeometry args={[0.65, 0.65, 3.6, 28]} />
        <meshStandardMaterial color={PAL.steel} roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[-5.6, 4.4, -0.3]}>
        <sphereGeometry args={[0.65, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={PAL.steel} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Turbine hall, cut open: floor, back wall, half end walls */}
      <mesh position={[3.6, 0.1, 0]}>
        <boxGeometry args={[9.8, 0.2, 5.4]} />
        <meshStandardMaterial color={PAL.floor} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[3.6, 2.2, -2.7]}>
        <boxGeometry args={[9.8, 4.4, 0.2]} />
        <meshStandardMaterial color={PAL.concrete} roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[-1.3, 1.6, -1.35]}>
        <boxGeometry args={[0.2, 3.2, 2.7]} />
        <meshStandardMaterial color={PAL.concrete} roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[8.5, 1.6, -1.35]}>
        <boxGeometry args={[0.2, 3.2, 2.7]} />
        <meshStandardMaterial color={PAL.concrete} roughness={0.95} metalness={0} />
      </mesh>
      <Turbine />
      {/* Condenser */}
      <mesh position={[3.0, 0.62, 0.2]}>
        <boxGeometry args={[3.2, 0.85, 1.9]} />
        <meshStandardMaterial color="#c7d3dc" roughness={0.9} metalness={0.05} />
      </mesh>
      <CoolingTower />
      {/* Power line pylon */}
      <mesh position={[9.6, 2.0, 0.8]}>
        <boxGeometry args={[0.18, 4.0, 0.18]} />
        <meshStandardMaterial color={PAL.steelDark} roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[9.6, 4.0, 0.8]}>
        <boxGeometry args={[1.4, 0.12, 0.12]} />
        <meshStandardMaterial color={PAL.steelDark} roughness={0.9} metalness={0.1} />
      </mesh>

      <Loop points={HOT} color={PAL.hotWater} dotColor={PAL.hotWater} dots={Math.round(22 * k)} speed={0.09} tubeOpacity={0.35} dotSize={0.14} />
      <Loop points={STEAM} color={PAL.steamTube} dotColor={PAL.steamDot} dots={Math.round(34 * k)} speed={0.06} tubeOpacity={0.55} dotSize={0.14} />
      <Loop points={COOL} color={PAL.cooling} dotColor={PAL.cooling} dots={Math.round(30 * k)} speed={0.05} tubeOpacity={0.3} dotSize={0.14} />
      <Loop points={POWER} color={PAL.steelDark} dotColor={PAL.power} dots={Math.round(10 * k)} speed={0.25} radius={0.025} tubeOpacity={0.6} dotSize={0.11} closed={false} />

      <Label position={[-8.2, 4.9, -0.3]}>Reactor</Label>
      <Label position={[-5.0, 6.2, -0.3]}>Steam generator</Label>
      <Label position={[2.4, 3.6, 0]}>Turbine</Label>
      <Label position={[5.8, 3.3, 0]}>Generator</Label>
      <Label position={[3.0, 0.2, 2.3]}>Condenser</Label>
      <Label position={[12.5, 6.8, -5]}>Cooling tower</Label>
      <Label position={[13.6, 4.7, 1.4]}>To the city</Label>
    </group>
  );
}
