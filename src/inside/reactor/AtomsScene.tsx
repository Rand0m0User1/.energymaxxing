// Level 5: the chain reaction. Draws the ChainSim state with instanced meshes; one useFrame steps and draws everything.
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  ChainSim, DOT_CAP, DOT_LIFE, FRAG_CAP, FRAG_LIFE, HALF, K_PU239, K_U235, NEUTRON_CAP, NUC_RADIUS, PEANUT_T, PENDING_CAP,
  REFILL_T, ROD_RADIUS, ROD_XZ, SPEED, S_EMPTY, S_PEANUT, S_REFILL, S_WOBBLE, TRAIL_LEN, WATER_MAX, WOBBLE_T,
} from './chainSim';
import { PAL } from './shared';

export interface Bridge { fireNdc?: (x: number, y: number) => void }

const LOBE_CAP = 60;
const STRETCH = [3.2, 1.9, 1.0];
const NEUTRON_R = 0.075;

function waterGeometry() {
  const o = new THREE.SphereGeometry(0.085, 10, 8);
  const h1 = new THREE.SphereGeometry(0.05, 8, 6);
  const h2 = new THREE.SphereGeometry(0.05, 8, 6);
  h1.translate(0.09, 0.06, 0);
  h2.translate(-0.09, 0.06, 0);
  const g = mergeGeometries([o, h1, h2]);
  o.dispose(); h1.dispose(); h2.dispose();
  return g ?? new THREE.SphereGeometry(0.085, 10, 8);
}

export default function AtomsScene({ sim, bridge }: { sim: ChainSim; bridge: MutableRefObject<Bridge> }) {
  const camera = useThree((s) => s.camera);
  const nucRef = useRef<THREE.InstancedMesh>(null);
  const lobeRef = useRef<THREE.InstancedMesh>(null);
  const neuRef = useRef<THREE.InstancedMesh>(null);
  const trailRef = useRef<THREE.InstancedMesh>(null);
  const fragRef = useRef<THREE.InstancedMesh>(null);
  const dotRef = useRef<THREE.InstancedMesh>(null);
  const pendRef = useRef<THREE.InstancedMesh>(null);
  const waterRef = useRef<THREE.InstancedMesh>(null);
  const rodRef = useRef<THREE.InstancedMesh>(null);
  const waterGeom = useMemo(waterGeometry, []);
  const edges = useMemo(() => {
    const box = new THREE.BoxGeometry(HALF * 2, HALF * 2, HALF * 2);
    const g = new THREE.EdgesGeometry(box);
    box.dispose();
    return g;
  }, []);
  // Geometries passed as props are not freed by react-three-fiber on unmount.
  useEffect(() => () => { waterGeom.dispose(); edges.dispose(); }, [waterGeom, edges]);

  const scratch = useMemo(() => ({
    m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(),
    v: new THREE.Vector3(), x: new THREE.Vector3(1, 0, 0), e: new THREE.Euler(), c: new THREE.Color(),
    cU235: new THREE.Color(PAL.u235), cU238: new THREE.Color(PAL.u238), cU236: new THREE.Color(PAL.u236), cPu: new THREE.Color(PAL.pu239),
    cBa: new THREE.Color(PAL.barium), cKr: new THREE.Color(PAL.krypton), cWater: new THREE.Color(PAL.water), cWarm: new THREE.Color(PAL.waterWarm),
    white: new THREE.Color('#ffffff'), lp: new THREE.Vector3(), ls: new THREE.Vector3(), ray: new THREE.Raycaster(), ndc: new THREE.Vector2(), waterWasWarm: true,
  }), []);

  // Click-to-fire uses the camera to cast a ray into the cube.
  useEffect(() => {
    bridge.current.fireNdc = (x, y) => {
      scratch.ndc.set(x, y);
      scratch.ray.setFromCamera(scratch.ndc, camera);
      const o = scratch.ray.ray.origin, d = scratch.ray.ray.direction;
      sim.fireRay(o.x, o.y, o.z, d.x, d.y, d.z);
    };
    return () => { bridge.current.fireNdc = undefined; };
  }, [camera, sim, bridge, scratch]);

  // Make sure instance colour buffers exist before the first draw.
  useLayoutEffect(() => {
    const init = (mesh: THREE.InstancedMesh | null, n: number, col: THREE.Color) => {
      if (!mesh) return;
      for (let i = 0; i < n; i++) mesh.setColorAt(i, col);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.count = 0;
    };
    init(nucRef.current, 512, scratch.cU238);
    init(lobeRef.current, LOBE_CAP, scratch.cU236);
    init(fragRef.current, FRAG_CAP, scratch.cBa);
    init(waterRef.current, WATER_MAX, scratch.cWater);
    if (neuRef.current) neuRef.current.count = 0;
    if (trailRef.current) trailRef.current.count = 0;
    if (dotRef.current) dotRef.current.count = 0;
    if (pendRef.current) pendRef.current.count = 0;
    scratch.waterWasWarm = true;
  }, [scratch]);

  useFrame((state, dt) => {
    sim.step(dt);
    const S = scratch;
    const { m, p, q, s, v, x, c } = S;
    const time = state.clock.elapsedTime;

    // Nuclei (+ peanut lobes)
    const nuc = nucRef.current, lobes = lobeRef.current;
    if (nuc && lobes) {
      let ni = 0, li = 0;
      for (let n = 0; n < sim.nCount; n++) {
        const st = sim.state[n];
        if (st === S_EMPTY) continue;
        p.set(sim.nx[n], sim.ny[n], sim.nz[n]);
        q.identity();
        let r = NUC_RADIUS;
        const kind = sim.kind[n];
        c.copy(kind === K_U235 ? S.cU235 : kind === K_PU239 ? S.cPu : S.cU238);
        if (sim.transmute[n] > 0) c.copy(S.cU238).lerp(S.cPu, sim.transmute[n]);
        if (sim.hitFlash[n] > 0) c.lerp(S.white, sim.hitFlash[n] * 0.5);
        if (st === S_WOBBLE) {
          const u = sim.timer[n] / WOBBLE_T;
          r = NUC_RADIUS * (1.12 + 0.07 * Math.sin(u * 38));
          c.copy(S.cU236);
          s.set(r * (1 + 0.06 * Math.sin(u * 31)), r * (1 - 0.05 * Math.sin(u * 31)), r);
        } else if (st === S_PEANUT) {
          const u = Math.min(1, sim.timer[n] / PEANUT_T);
          c.copy(S.cU236);
          v.set(sim.axis[n * 3], sim.axis[n * 3 + 1], sim.axis[n * 3 + 2]).normalize();
          q.setFromUnitVectors(x, v);
          s.set(NUC_RADIUS * (1.15 + 0.5 * u), NUC_RADIUS * (1.1 - 0.5 * u), NUC_RADIUS * (1.1 - 0.5 * u));
          // two lobes moving apart make the peanut shape
          for (let side = -1; side <= 1; side += 2) {
            if (li >= LOBE_CAP) break;
            const off = side * NUC_RADIUS * (0.25 + 0.75 * u);
            const lr = NUC_RADIUS * (side < 0 ? 0.92 : 0.8);
            S.lp.copy(p).addScaledVector(v, off);
            S.ls.set(lr, lr, lr);
            m.compose(S.lp, q, S.ls);
            lobes.setMatrixAt(li, m);
            lobes.setColorAt(li, c);
            li++;
          }
        } else if (st === S_REFILL) {
          const u = Math.min(1, sim.timer[n] / REFILL_T);
          r = NUC_RADIUS * (u * u * (3 - 2 * u));
          s.set(r, r, r);
        } else {
          s.set(r, r, r);
        }
        m.compose(p, q, s);
        nuc.setMatrixAt(ni, m);
        nuc.setColorAt(ni, c);
        ni++;
      }
      nuc.count = ni;
      nuc.instanceMatrix.needsUpdate = true;
      if (nuc.instanceColor) nuc.instanceColor.needsUpdate = true;
      lobes.count = li;
      lobes.instanceMatrix.needsUpdate = true;
      if (lobes.instanceColor) lobes.instanceColor.needsUpdate = true;
    }

    // Neutrons and trails
    const neu = neuRef.current, trail = trailRef.current;
    if (neu && trail) {
      let a = 0, t = 0;
      for (let i = 0; i < NEUTRON_CAP; i++) {
        if (!sim.alive[i]) continue;
        p.set(sim.px[i], sim.py[i], sim.pz[i]);
        v.set(sim.dx[i], sim.dy[i], sim.dz[i]);
        q.setFromUnitVectors(x, v);
        const lv = sim.level[i];
        s.set(NEUTRON_R * STRETCH[lv], NEUTRON_R, NEUTRON_R);
        m.compose(p, q, s);
        neu.setMatrixAt(a++, m);
        const head = sim.trailHead[i];
        const base = i * TRAIL_LEN;
        const trailScale = SPEED[lv] / SPEED[0];
        for (let k = 1; k < TRAIL_LEN; k++) {
          const idx = (base + ((head - k + TRAIL_LEN) % TRAIL_LEN)) * 3;
          p.set(sim.trail[idx], sim.trail[idx + 1], sim.trail[idx + 2]);
          const sc = NEUTRON_R * (0.85 - k * 0.16) * (0.6 + 0.4 * trailScale);
          s.set(sc, sc, sc);
          q.identity();
          m.compose(p, q, s);
          trail.setMatrixAt(t++, m);
        }
      }
      neu.count = a;
      trail.count = t;
      neu.instanceMatrix.needsUpdate = true;
      trail.instanceMatrix.needsUpdate = true;
    }

    // Fragments
    const frag = fragRef.current;
    if (frag) {
      let f = 0;
      for (let i = 0; i < FRAG_CAP; i++) {
        if (!sim.fAlive[i]) continue;
        const age = sim.fAge[i];
        const fade = age < FRAG_LIFE * 0.45 ? 1 : Math.max(0, 1 - (age - FRAG_LIFE * 0.45) / (FRAG_LIFE * 0.55));
        const r = (sim.fKind[i] === 0 ? 0.19 : 0.145) * fade;
        p.set(sim.fx[i], sim.fy[i], sim.fz[i]);
        q.identity();
        s.set(r, r, r);
        m.compose(p, q, s);
        frag.setMatrixAt(f, m);
        frag.setColorAt(f, sim.fKind[i] === 0 ? S.cBa : S.cKr);
        f++;
      }
      frag.count = f;
      frag.instanceMatrix.needsUpdate = true;
      if (frag.instanceColor) frag.instanceColor.needsUpdate = true;
    }

    // Absorption dots
    const dot = dotRef.current;
    if (dot) {
      let d = 0;
      for (let i = 0; i < DOT_CAP; i++) {
        if (!sim.dAlive[i]) continue;
        const r = 0.06 * (1 - sim.dAge[i] / DOT_LIFE);
        p.set(sim.dX[i], sim.dY[i], sim.dZ[i]);
        q.identity();
        s.set(r, r, r);
        m.compose(p, q, s);
        dot.setMatrixAt(d++, m);
      }
      dot.count = d;
      dot.instanceMatrix.needsUpdate = true;
    }

    // Delayed neutrons waiting to come out
    const pend = pendRef.current;
    if (pend) {
      const n = Math.min(sim.pendCount, PENDING_CAP);
      for (let i = 0; i < n; i++) {
        const r = 0.05 + 0.015 * Math.sin(time * 6 + i);
        p.set(sim.pendX[i] + 0.12, sim.pendY[i] + 0.12, sim.pendZ[i]);
        q.identity();
        s.set(r, r, r);
        m.compose(p, q, s);
        pend.setMatrixAt(i, m);
      }
      pend.count = n;
      pend.instanceMatrix.needsUpdate = true;
    }

    // Water molecules
    const water = waterRef.current;
    if (water) {
      water.visible = sim.params.water;
      if (water.visible) {
        for (let w = 0; w < sim.wCount; w++) {
          const ph = sim.wPhase[w];
          S.e.set(ph, ph * 1.3 + time * sim.wSpin[w], ph * 0.7);
          q.setFromEuler(S.e);
          p.set(sim.wx[w], sim.wy[w] + 0.03 * Math.sin(time * 1.3 + ph), sim.wz[w]);
          s.set(1, 1, 1);
          m.compose(p, q, s);
          water.setMatrixAt(w, m);
        }
        water.count = sim.wCount;
        water.instanceMatrix.needsUpdate = true;
        if (sim.anyHeat || S.waterWasWarm) {
          for (let w = 0; w < sim.wCount; w++) {
            c.copy(S.cWater).lerp(S.cWarm, Math.min(1, sim.heat[w]));
            water.setColorAt(w, c);
          }
          if (water.instanceColor) water.instanceColor.needsUpdate = true;
          S.waterWasWarm = sim.anyHeat;
        }
      }
    }

    // Control rods
    const rods = rodRef.current;
    if (rods) {
      const bottom = sim.rodBottom;
      const len = HALF * 2;
      for (let k = 0; k < ROD_XZ.length; k++) {
        p.set(ROD_XZ[k][0], bottom + len / 2, ROD_XZ[k][1]);
        q.identity();
        s.set(1, 1, 1);
        m.compose(p, q, s);
        rods.setMatrixAt(k, m);
      }
      rods.count = ROD_XZ.length;
      rods.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#6b7783" transparent opacity={0.55} />
      </lineSegments>
      <instancedMesh ref={nucRef} args={[undefined, undefined, 512]} frustumCulled={false}>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={lobeRef} args={[undefined, undefined, LOBE_CAP]} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={neuRef} args={[undefined, undefined, NEUTRON_CAP]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color={PAL.neutron} roughness={0.85} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={trailRef} args={[undefined, undefined, NEUTRON_CAP * (TRAIL_LEN - 1)]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={PAL.neutron} roughness={1} metalness={0} transparent opacity={0.35} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={fragRef} args={[undefined, undefined, FRAG_CAP]} frustumCulled={false}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.85} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={dotRef} args={[undefined, undefined, DOT_CAP]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={PAL.dot} roughness={1} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={pendRef} args={[undefined, undefined, PENDING_CAP]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#c3cad1" roughness={1} metalness={0} transparent opacity={0.7} />
      </instancedMesh>
      <instancedMesh ref={waterRef} args={[waterGeom, undefined, WATER_MAX]} frustumCulled={false}>
        <meshStandardMaterial color="#ffffff" roughness={0.95} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={rodRef} args={[undefined, undefined, ROD_XZ.length]} frustumCulled={false}>
        <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, HALF * 2, 20]} />
        <meshStandardMaterial color={PAL.rodDark} roughness={0.9} metalness={0.1} />
      </instancedMesh>
    </group>
  );
}
