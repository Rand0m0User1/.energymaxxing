// Pylons and thin wires from each station to the central substation, distribution lines to the districts,
// and the solar-to-battery line. Static geometry, rebuilt when switching between Earth and the Moon.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useApp, type Env } from '../store';
import { STATIONS, DISTRICT_WEDGES, cityEntry, stationsFor } from './layout';
import { ARM_Y, CHARGE_FROM, CHARGE_TO, CITY_DISTRICTS, DIST_POLE_H, SUB_Y, TRUNK_H } from './cityLayout';

interface Pole { x: number; z: number; h: number; angle: number; arm: number }

const SPAN = 24;
const ARM_HALF = 1.3;
const POLE_COLOR = '#A2A7AC';
const WIRE_COLOR = '#4B5157';

function spanPoles(a: [number, number], b: [number, number], h: number, arm: number, out: Pole[], includeEnd = true) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const n = Math.max(1, Math.round(len / SPAN));
  const angle = Math.atan2(dz, dx);
  for (let i = 0; i <= n; i++) {
    if (i === n && !includeEnd) break;
    const t = i / n;
    out.push({ x: a[0] + dx * t, z: a[1] + dz * t, h, angle, arm });
  }
}

function addWire(pos: number[], a: THREE.Vector3, b: THREE.Vector3, sag: number) {
  const N = 8;
  let px = a.x;
  let py = a.y;
  let pz = a.z;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t);
    const z = a.z + (b.z - a.z) * t;
    pos.push(px, py, pz, x, y, z);
    px = x;
    py = y;
    pz = z;
  }
}

function buildNetwork(env: Env) {
  const poles: Pole[] = [];
  const wire: number[] = [];
  const perp = (angle: number, d: number) => [-Math.sin(angle) * d, Math.cos(angle) * d] as const;

  const transmission = (a: [number, number], b: [number, number]) => {
    const start = poles.length;
    spanPoles(a, b, TRUNK_H, ARM_HALF, poles);
    for (let i = start + 1; i < poles.length; i++) {
      const p0 = poles[i - 1];
      const p1 = poles[i];
      for (const side of [-1, 1]) {
        const [ox, oz] = perp(p0.angle, ARM_HALF * side);
        addWire(wire, new THREE.Vector3(p0.x + ox, ARM_Y, p0.z + oz), new THREE.Vector3(p1.x + ox, ARM_Y, p1.z + oz), 0.7);
      }
    }
    return poles[poles.length - 1];
  };

  for (const id of stationsFor(env)) {
    const lf = STATIONS[id].lineFrom;
    if (!lf) continue;
    const e = cityEntry(lf);
    const last = transmission(lf, e);
    // from the city edge down to the substation gantry
    for (const side of [-1, 1]) {
      const [ox, oz] = perp(last.angle, ARM_HALF * side);
      const [sx, sz] = perp(last.angle, 0.7 * side);
      addWire(wire, new THREE.Vector3(last.x + ox, ARM_Y, last.z + oz), new THREE.Vector3(sx, SUB_Y + 0.4, sz), 0.6);
    }
  }
  // solar farm -> battery yard
  transmission(CHARGE_FROM, CHARGE_TO);

  // distribution: substation -> district centres
  for (const d of CITY_DISTRICTS) {
    const c = DISTRICT_WEDGES[d].centroid;
    const len = Math.hypot(c[0], c[1]);
    const ux = c[0] / len;
    const uz = c[1] / len;
    const startPt: [number, number] = [ux * 4.5, uz * 4.5];
    const start = poles.length;
    spanPoles(startPt, c, DIST_POLE_H, 0.5, poles);
    poles[start].h = 0; // the first point sits on the substation gantry; no pole there
    let prev = new THREE.Vector3(ux * 3.2, SUB_Y + 0.2, uz * 3.2);
    for (let i = start + 1; i < poles.length; i++) {
      const p = poles[i];
      const cur = new THREE.Vector3(p.x, DIST_POLE_H - 0.2, p.z);
      addWire(wire, prev, cur, 0.3);
      prev = cur;
    }
  }
  return { poles: poles.filter((p) => p.h > 0), wire: new Float32Array(wire) };
}

export default function PowerLines() {
  const env = useApp((s) => s.env);
  const { poles, wire } = useMemo(() => buildNetwork(env), [env]);
  const poleRef = useRef<THREE.InstancedMesh>(null);
  const armRef = useRef<THREE.InstancedMesh>(null);
  const poleGeo = useMemo(() => new THREE.CylinderGeometry(0.16, 0.42, 1, 6).translate(0, 0.5, 0), []);
  const armGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: POLE_COLOR, roughness: 0.85, metalness: 0.1 }), []);
  const wireGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(wire, 3));
    return g;
  }, [wire]);

  useLayoutEffect(() => {
    const pm = poleRef.current;
    const am = armRef.current;
    if (!pm || !am) return;
    const dummy = new THREE.Object3D();
    poles.forEach((p, i) => {
      const thin = p.h < TRUNK_H;
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(thin ? 0.55 : 1, p.h, thin ? 0.55 : 1);
      dummy.updateMatrix();
      pm.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p.x, p.h - 0.25, p.z);
      dummy.rotation.set(0, -p.angle, 0);
      dummy.scale.set(0.22, 0.22, p.arm * 2 + 0.4);
      dummy.updateMatrix();
      am.setMatrixAt(i, dummy.matrix);
    });
    pm.instanceMatrix.needsUpdate = true;
    am.instanceMatrix.needsUpdate = true;
    pm.computeBoundingSphere();
    am.computeBoundingSphere();
  }, [poles, poleGeo, armGeo, poleMat]);

  return (
    <group>
      <instancedMesh ref={poleRef} args={[poleGeo, poleMat, poles.length]} castShadow />
      <instancedMesh ref={armRef} args={[armGeo, poleMat, poles.length]} castShadow />
      <lineSegments geometry={wireGeo} frustumCulled={false}>
        <lineBasicMaterial color={WIRE_COLOR} transparent opacity={0.7} />
      </lineSegments>
      <Substation />
    </group>
  );
}

function Substation() {
  const concrete = '#CFCFCA';
  const metal = '#9AA2A8';
  const gantryH = SUB_Y + 0.6;
  return (
    <group>
      <mesh receiveShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[10, 0.3, 10]} />
        <meshStandardMaterial color={concrete} roughness={1} metalness={0} />
      </mesh>
      {[
        [-2.3, -2.3],
        [2.3, -2.3],
        [-2.3, 2.3],
        [2.3, 2.3],
      ].map(([x, z], i) => (
        <mesh key={i} castShadow receiveShadow position={[x, 1.3, z]}>
          <boxGeometry args={[1.8, 2.2, 1.4]} />
          <meshStandardMaterial color={metal} roughness={0.85} metalness={0.1} />
        </mesh>
      ))}
      {[
        [-3.8, -3.8],
        [3.8, -3.8],
        [-3.8, 3.8],
        [3.8, 3.8],
      ].map(([x, z], i) => (
        <mesh key={`p${i}`} castShadow position={[x, gantryH / 2, z]}>
          <boxGeometry args={[0.28, gantryH, 0.28]} />
          <meshStandardMaterial color={POLE_COLOR} roughness={0.85} metalness={0.1} />
        </mesh>
      ))}
      <mesh castShadow position={[0, gantryH, -3.8]}>
        <boxGeometry args={[7.9, 0.25, 0.25]} />
        <meshStandardMaterial color={POLE_COLOR} roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[0, gantryH, 3.8]}>
        <boxGeometry args={[7.9, 0.25, 0.25]} />
        <meshStandardMaterial color={POLE_COLOR} roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[0, SUB_Y, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 1.0, 12]} />
        <meshStandardMaterial color="#B9BEC2" roughness={0.85} metalness={0.1} />
      </mesh>
    </group>
  );
}
