// PhET-style "energy chunks": small matte spheres that travel along the power lines.
// Constant speed; the number alive is proportional to the power flowing now. One InstancedMesh, updated via refs.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../store';
import { SOURCE_COLORS } from '../data/colors';
import { SOURCE_STATION } from './layout';
import { GEN_IDS, type SourceId } from '../types';
import { BRANCHES, CHARGE_ROUTE, CITY_DISTRICTS, TRUNKS, sampleRoute, type Route } from './cityLayout';
import { worldFrame, at } from './worldFrame';
import { districtServed } from './districtState';

const MAX = 700;
const SPEED = 14; // world units per second
/** Visual tuning: particles spawned per second for each GW flowing. Not a physical number. */
const RATE_PER_GW = 34;
const RADIUS = 0.65;

interface Stream { source: SourceId; color: THREE.Color; trunk: Route; branches: boolean }

function buildStreams(): Stream[] {
  const out: Stream[] = [];
  for (const g of GEN_IDS) {
    const trunk = TRUNKS[SOURCE_STATION[g]];
    if (trunk) out.push({ source: g, color: new THREE.Color(SOURCE_COLORS[g]), trunk, branches: true });
  }
  const bt = TRUNKS[SOURCE_STATION.battery];
  if (bt) out.push({ source: 'battery', color: new THREE.Color(SOURCE_COLORS.battery), trunk: bt, branches: true });
  // charging: solar energy flowing into the battery yard
  out.push({ source: 'solar', color: new THREE.Color(SOURCE_COLORS.solar), trunk: CHARGE_ROUTE, branches: false });
  return out;
}

export default function EnergyParticles() {
  const streams = useMemo(buildStreams, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.SphereGeometry(RADIUS, 10, 8), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }), []);
  const sim = useMemo(() => ({
    active: new Uint8Array(MAX),
    stream: new Int16Array(MAX),
    branch: new Int8Array(MAX),
    s: new Float32Array(MAX),
    len: new Float32Array(MAX),
    lift: new Float32Array(MAX),
    free: Array.from({ length: MAX }, (_, i) => MAX - 1 - i),
    acc: new Float32Array(16),
    weights: new Float32Array(CITY_DISTRICTS.length),
    tmp: new THREE.Vector3(),
  }), []);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const white = new THREE.Color('#ffffff');
    for (let i = 0; i < MAX; i++) {
      m.setMatrixAt(i, zero);
      m.setColorAt(i, white);
    }
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [geo, mat]);

  useFrame((_, rawDt) => {
    const m = ref.current;
    if (!m) return;
    const s = useApp.getState();
    if (s.inside) return;
    const dt = Math.min(rawDt, 0.1);
    const reduced = s.reducedMotion;
    const budget = reduced ? Math.floor(MAX / 4) : MAX;
    const speed = reduced ? SPEED * 0.5 : SPEED;
    const rateScale = reduced ? 0.25 : 1;
    const r = s.result;
    const i = worldFrame.step;
    const charge = Math.max(0, at(r.batteryCharge, i));

    // where city power goes: weight branches by served MW
    let wsum = 0;
    CITY_DISTRICTS.forEach((d, k) => {
      const w = districtServed(s, d, i).mw;
      sim.weights[k] = w;
      wsum += w;
    });
    if (wsum <= 0) {
      CITY_DISTRICTS.forEach((d, k) => {
        sim.weights[k] = s.input.districts[d]?.on ? 1 : 0;
        wsum += sim.weights[k];
      });
    }

    // spawn
    let alive = MAX - sim.free.length;
    const colorArr = m.instanceColor?.array as Float32Array | undefined;
    let colorsDirty = false;
    for (let k = 0; k < streams.length; k++) {
      const st = streams[k];
      let gw = 0;
      if (!st.branches) gw = charge;
      else if (st.source === 'battery') gw = at(r.batteryDischarge, i);
      else if (st.source === 'solar') gw = Math.max(0, at(r.supply?.solar, i) - charge);
      else gw = at(r.supply?.[st.source as Exclude<SourceId, 'battery'>], i);
      if (!(gw > 0.001)) {
        sim.acc[k] = 0;
        continue;
      }
      sim.acc[k] += gw * RATE_PER_GW * rateScale * dt;
      let guard = 0;
      while (sim.acc[k] >= 1 && guard++ < 8) {
        sim.acc[k] -= 1;
        if (alive >= budget || sim.free.length === 0) continue;
        const slot = sim.free.pop()!;
        alive++;
        sim.active[slot] = 1;
        sim.stream[slot] = k;
        sim.s[slot] = 0;
        sim.lift[slot] = (Math.random() - 0.5) * 0.5;
        let b = -1;
        let len = st.trunk.len;
        if (st.branches && wsum > 0) {
          let pick = Math.random() * wsum;
          b = 0;
          for (let q = 0; q < sim.weights.length; q++) {
            pick -= sim.weights[q];
            if (pick <= 0) { b = q; break; }
          }
          len += BRANCHES[CITY_DISTRICTS[b]].len;
        }
        sim.branch[slot] = b;
        sim.len[slot] = len;
        if (colorArr) {
          colorArr[slot * 3] = st.color.r;
          colorArr[slot * 3 + 1] = st.color.g;
          colorArr[slot * 3 + 2] = st.color.b;
          colorsDirty = true;
        }
      }
      if (sim.acc[k] > 4) sim.acc[k] = 4;
    }

    // move and write matrices
    const arr = m.instanceMatrix.array as Float32Array;
    const hl = s.highlightSource;
    const p = sim.tmp;
    for (let n = 0; n < MAX; n++) {
      const o = n * 16;
      if (!sim.active[n]) {
        if (arr[o] !== 0) { arr[o] = 0; arr[o + 5] = 0; arr[o + 10] = 0; }
        continue;
      }
      sim.s[n] += speed * dt;
      if (sim.s[n] >= sim.len[n]) {
        sim.active[n] = 0;
        sim.free.push(n);
        arr[o] = 0; arr[o + 5] = 0; arr[o + 10] = 0;
        continue;
      }
      const st = streams[sim.stream[n]];
      const dist = sim.s[n];
      if (dist <= st.trunk.len || sim.branch[n] < 0) sampleRoute(st.trunk, dist, p);
      else sampleRoute(BRANCHES[CITY_DISTRICTS[sim.branch[n]]], dist - st.trunk.len, p);
      let sc = 1;
      if (hl && hl !== st.source) sc = 0.5;
      // shrink in/out at the ends so particles do not pop
      const edge = Math.min(dist, sim.len[n] - dist);
      if (edge < 1.5) sc *= Math.max(0.15, edge / 1.5);
      arr[o] = sc; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0;
      arr[o + 4] = 0; arr[o + 5] = sc; arr[o + 6] = 0; arr[o + 7] = 0;
      arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = sc; arr[o + 11] = 0;
      arr[o + 12] = p.x; arr[o + 13] = p.y + sim.lift[n]; arr[o + 14] = p.z; arr[o + 15] = 1;
    }
    m.instanceMatrix.needsUpdate = true;
    if (colorsDirty && m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, MAX]} frustumCulled={false} />;
}
