// The city: block buildings in five tinted districts, windows that light up at night,
// dimming and flicker when a district is short of power, and blackout grey. Clicking it selects the city.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useApp } from '../store';
import { DISTRICT_TINTS } from '../data/colors';
import { CITY_RADIUS } from './layout';
import { BUILDINGS, CITY_DISTRICTS, type Building, type CityDistrict } from './cityLayout';
import { worldFrame } from './worldFrame';
import { districtServed } from './districtState';
import { selectStationClick } from './Stations';
import { setCursor } from './cursor';

const BLACKOUT = new THREE.Color('#55595E');
const OFF_GREY = new THREE.Color('#A7A9AB');
const GLASS = new THREE.Color('#6C7987');
const WARM = new THREE.Color('#F6D29A');

interface WindowSpot { x: number; y: number; z: number; ry: number; lit: number }

function windowsFor(b: Building, seedBase: number): WindowSpot[] {
  const out: WindowSpot[] = [];
  const floorH = 2.6;
  const floors = Math.max(1, Math.floor((b.h - 0.8) / floorH));
  const cos = Math.cos(b.rot);
  const sin = Math.sin(b.rot);
  let seed = seedBase;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const sparse = b.d === 'datacenter' || b.d === 'transport';
  // faces in local frame: normal direction, along-axis length, offset to face
  const faces: { nx: number; nz: number; len: number; off: number; ry: number }[] = [
    { nx: 1, nz: 0, len: b.w, off: b.dp / 2, ry: Math.PI / 2 },
    { nx: -1, nz: 0, len: b.w, off: b.dp / 2, ry: -Math.PI / 2 },
    { nx: 0, nz: 1, len: b.dp, off: b.w / 2, ry: 0 },
    { nx: 0, nz: -1, len: b.dp, off: b.w / 2, ry: Math.PI },
  ];
  for (const f of faces) {
    let cols = Math.max(1, Math.floor((f.len - 0.6) / 1.5));
    if (sparse) cols = Math.max(1, Math.floor(cols / 2));
    for (let fl = 0; fl < floors; fl++) {
      const y = 1.5 + fl * floorH;
      if (y > b.h - 0.6) break;
      for (let c = 0; c < cols; c++) {
        const along = (c - (cols - 1) / 2) * ((f.len - 0.6) / cols);
        // local position (x radial, z tangent)
        const lx = f.nx !== 0 ? f.nx * (f.off + 0.04) : along;
        const lz = f.nz !== 0 ? f.nz * (f.off + 0.04) : along;
        // rotate by b.rot about y: x' = x cos + z sin, z' = -x sin + z cos
        const wx = b.x + lx * cos + lz * sin;
        const wz = b.z - lx * sin + lz * cos;
        out.push({ x: wx, y, z: wz, ry: b.rot + f.ry, lit: rnd() < 0.72 ? 1 : 0.3 });
      }
    }
  }
  return out;
}

export default function City() {
  const selected = useApp((s) => s.selectedStation === 'city');
  return (
    <group>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.25}>
          <ringGeometry args={[CITY_RADIUS + 1.2, CITY_RADIUS + 1.9, 96]} />
          <meshStandardMaterial color="#1f5f8b" roughness={0.9} metalness={0} />
        </mesh>
      )}
      {CITY_DISTRICTS.map((d, k) => (
        <District key={d} d={d} index={k} />
      ))}
    </group>
  );
}

function District({ d, index }: { d: CityDistrict; index: number }) {
  const buildings = useMemo(() => BUILDINGS.filter((b) => b.d === d), [d]);
  const windows = useMemo(() => buildings.flatMap((b, i) => windowsFor(b, 1000 + index * 977 + i * 31)), [buildings, index]);
  const bRef = useRef<THREE.InstancedMesh>(null);
  const wRef = useRef<THREE.InstancedMesh>(null);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const winGeo = useMemo(() => new THREE.PlaneGeometry(0.85, 1.1), []);
  const tint = useMemo(() => new THREE.Color(DISTRICT_TINTS[d]), [d]);
  const bMat = useMemo(() => new THREE.MeshStandardMaterial({ color: DISTRICT_TINTS[d], roughness: 0.9, metalness: 0 }), [d]);
  const wMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#6C7987' }), []);
  const state = useRef({ black: 0, level: 1 });

  useLayoutEffect(() => {
    const m = bRef.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    buildings.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z);
      dummy.rotation.set(0, b.rot, 0);
      dummy.scale.set(b.dp, b.h, b.w);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.count = buildings.length;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [buildings, boxGeo, bMat]);

  useLayoutEffect(() => {
    const m = wRef.current;
    if (!m || windows.length === 0) return;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    windows.forEach((w, i) => {
      dummy.position.set(w.x, w.y, w.z);
      dummy.rotation.set(0, w.ry, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, c.setScalar(w.lit));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [windows, winGeo, wMat]);

  useFrame((_, dt) => {
    const s = useApp.getState();
    // The title screen shows a calm, lit city.
    const { on, frac } = s.screen === 'title' ? { on: true, frac: 1 } : districtServed(s, d, worldFrame.step);
    const blackout = on && frac <= 0.02;
    const st = state.current;
    const k = Math.min(1, dt * 4);
    st.black += ((blackout ? 1 : 0) - st.black) * k;
    // building colour
    bMat.color.copy(tint);
    if (!on) bMat.color.lerp(OFF_GREY, 0.35);
    bMat.color.lerp(BLACKOUT, st.black * 0.85);
    // window light
    let level = on ? frac : 0;
    if (on && frac > 0.02 && frac < 0.995) {
      const t = worldFrame.t;
      const flick = 0.82 + 0.18 * Math.sin(t * 9 + index * 1.7) * Math.sin(t * 23 + index);
      level = Math.max(0, frac * 0.75 * flick);
    }
    st.level += (level - st.level) * k;
    const lightAmt = worldFrame.night * st.level;
    const dayScale = 0.3 + 0.7 * worldFrame.daylight;
    wMat.color.copy(GLASS).multiplyScalar(dayScale * (1 - st.black * 0.6)).lerp(WARM, lightAmt);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => selectStationClick(e, 'city');

  return (
    <group>
      <instancedMesh
        ref={bRef}
        args={[boxGeo, bMat, Math.max(1, buildings.length)]}
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setCursor(true); }}
        onPointerOut={() => setCursor(false)}
      />
      {windows.length > 0 && <instancedMesh ref={wRef} args={[winGeo, wMat, windows.length]} raycast={() => null} />}
    </group>
  );
}
