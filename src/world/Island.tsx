// The round island: grassy island in the sea (Earth) or a grey regolith plain (Moon), footpaths and the city ground.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useApp } from '../store';
import { PLACES } from '../data/places';
import { DISTRICT_TINTS } from '../data/colors';
import { CITY_RADIUS, DISTRICT_WEDGES, ISLAND_RADIUS, STATIONS, WORLD_STATIONS, stationsFor } from './layout';
import { CITY_DISTRICTS } from './cityLayout';

const R = ISLAND_RADIUS;

function mix(a: string, b: string, t: number) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

function luminance(hex: string) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

export default function Island() {
  const placeId = useApp((s) => s.input.place);
  const env = useApp((s) => s.env);
  const place = PLACES[placeId];
  const body = place.body;
  const ground = place.ground;
  const accent = place.groundAccent;

  const sideMat = useMemo(() => new THREE.MeshStandardMaterial({ color: mix(ground, '#E6DAC0', body === 'earth' ? 0.35 : 0), roughness: 1, metalness: 0 }), [ground, body]);
  const topMat = useMemo(() => new THREE.MeshStandardMaterial({ color: ground, roughness: 1, metalness: 0 }), [ground, body]);
  const seaColor = useMemo(() => mix('#8FB2C6', place.skyDay, 0.25), [place.skyDay]);

  return (
    <group>
      {body === 'earth' && (
        <>
          <mesh receiveShadow position={[0, -2, 0]} material={[sideMat, topMat, sideMat]}>
            <cylinderGeometry args={[R, R + 5, 4, 128]} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={-1.4}>
            <circleGeometry args={[1700, 72]} />
            <meshStandardMaterial color={seaColor} roughness={0.95} metalness={0} />
          </mesh>
        </>
      )}
      {body !== 'earth' && (
        <mesh rotation-x={-Math.PI / 2} receiveShadow material={topMat}>
          <circleGeometry args={[2400, 96]} />
        </mesh>
      )}

      <Patches color={accent} spread={body !== 'earth' ? 900 : R - 8} count={body !== 'earth' ? 70 : 34} crater={body !== 'earth'} />
      <CityGround ground={ground} />
      <Paths ground={ground} env={env} />
    </group>
  );
}

function Patches({ color, spread, count, crater }: { color: string; spread: number; count: number; crater: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => (crater ? new THREE.RingGeometry(0.75, 1, 40) : new THREE.CircleGeometry(1, 32)), [crater]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, transparent: true, opacity: 0.75, depthWrite: false,
  }), [color]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    let seed = 99;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const dummy = new THREE.Object3D();
    let placed = 0;
    for (let tries = 0; tries < count * 6 && placed < count; tries++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * spread;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x, z) < CITY_RADIUS + 6) continue;
      // keep station footprints clean
      if (WORLD_STATIONS.some((id) => Math.hypot(x - STATIONS[id].pos[0], z - STATIONS[id].pos[1]) < STATIONS[id].radius + 4)) continue;
      const s = (crater ? 3 : 4) + rnd() * (crater ? 10 : 9);
      if (!crater && r + s > R - 2 && spread <= R) continue;
      dummy.position.set(x, 0.03, z);
      dummy.rotation.set(-Math.PI / 2, 0, rnd() * Math.PI);
      dummy.scale.set(s, s * (0.6 + rnd() * 0.4), 1);
      dummy.updateMatrix();
      m.setMatrixAt(placed++, dummy.matrix);
    }
    m.count = placed;
    m.instanceMatrix.needsUpdate = true;
  }, [count, spread, crater, geo, mat]);
  return <instancedMesh ref={ref} args={[geo, mat, count]} receiveShadow frustumCulled={false} />;
}

function CityGround({ ground }: { ground: string }) {
  const paved = useMemo(() => mix(ground, '#D8D7D1', 0.75), [ground]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.04} receiveShadow>
        <circleGeometry args={[CITY_RADIUS + 1.5, 72]} />
        <meshStandardMaterial color={paved} roughness={1} metalness={0} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-6} />
      </mesh>
      {CITY_DISTRICTS.map((d) => {
        const w = DISTRICT_WEDGES[d];
        const pad = 0.05;
        return (
          <mesh key={d} rotation-x={-Math.PI / 2} position-y={0.06} receiveShadow>
            <ringGeometry args={[7.2, CITY_RADIUS - 0.6, 24, 1, -(w.to - pad), w.to - w.from - pad * 2]} />
            <meshStandardMaterial color={mix(DISTRICT_TINTS[d], ground, 0.15)} roughness={1} metalness={0} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-8} />
          </mesh>
        );
      })}
    </group>
  );
}

function Paths({ ground, env }: { ground: string; env: 'earth' | 'moon' }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => (luminance(ground) > 0.8 ? '#B6BBBE' : mix(ground, '#D4D4CF', 0.7)), [ground]);
  const segs = useMemo(() => {
    const out: [number, number, number, number][] = [];
    const ringR = CITY_RADIUS + 5;
    for (const id of stationsFor(env)) {
      if (id === 'city') continue;
      const st = STATIONS[id];
      const [px, pz] = st.pos;
      const d = Math.hypot(px, pz) || 1;
      const ux = px / d;
      const uz = pz / d;
      out.push([ux * ringR, uz * ringR, px - ux * (st.radius + 2), pz - uz * (st.radius + 2)]);
    }
    // ring around the city, as short straight pieces
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      out.push([Math.cos(a0) * ringR, Math.sin(a0) * ringR, Math.cos(a1) * ringR, Math.sin(a1) * ringR]);
    }
    return out;
  }, [env]);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 0.08, 1), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }), [color]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    segs.forEach(([ax, az, bx, bz], i) => {
      const len = Math.hypot(bx - ax, bz - az);
      dummy.position.set((ax + bx) / 2, 0.04, (az + bz) / 2);
      dummy.rotation.set(0, -Math.atan2(bz - az, bx - ax), 0);
      dummy.scale.set(len + 2.4, 1, 2.4);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [segs, geo, mat]);
  return <instancedMesh ref={ref} args={[geo, mat, segs.length]} receiveShadow frustumCulled={false} />;
}
