// Reactor Row (SPEC §10.2): a line of empty concrete pads. The first `tools.reactorsBuilt` pads raise a
// small reactor (dome + turbine box) with a short rise animation, one after another.
// Children use absolute world coordinates from layout.ts. If the world mounts this inside a group that is
// already moved (for example to REACTOR_ROW.start), the x/z offset of that parent is cancelled each frame.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../store';
import { REACTOR_ROW } from '../layout';
import { SOURCE_COLORS } from '../../data/colors';
import { GEO, NEUTRAL, Instanced, mat, type InstanceItem } from './shared';

const N = REACTOR_ROW.count;
const PAD = 7;
const padPos = (k: number): [number, number] => [
  REACTOR_ROW.start[0] + REACTOR_ROW.step[0] * k,
  REACTOR_ROW.start[1] + REACTOR_ROW.step[1] * k,
];
const PADS: InstanceItem[] = Array.from({ length: N }, (_, k) => {
  const [x, z] = padPos(k);
  return { p: [x, 0.08, z], s: [PAD, 0.16, PAD] };
});

/** Reactor parts relative to the pad centre: [geometry key, centre, scale]. */
const PARTS = {
  base: { off: [-0.9, 1.16, 0] as const, s: [3.6, 2, 3.6] as const },
  dome: { off: [-0.9, 2.16, 0] as const, s: [1.8, 1.6, 1.8] as const },
  band: { off: [-0.9, 1.95, 0] as const, s: [3.68, 0.3, 3.68] as const },
  hall: { off: [1.9, 1.06, 0] as const, s: [2.2, 1.8, 3.2] as const },
};
type PartKey = keyof typeof PARTS;
const RISE_DEPTH = 3.6;
const RISE_SECONDS = 0.9;

const tmp = new THREE.Object3D();
const parentPos = new THREE.Vector3();

export default function ReactorRow3D() {
  const groupRef = useRef<THREE.Group>(null);
  const refs = {
    base: useRef<THREE.InstancedMesh>(null),
    dome: useRef<THREE.InstancedMesh>(null),
    band: useRef<THREE.InstancedMesh>(null),
    hall: useRef<THREE.InstancedMesh>(null),
  };
  const progress = useMemo(() => new Float32Array(N), []);
  const drawn = useMemo(() => new Float32Array(N).fill(-1), []);

  useFrame((_, delta) => {
    // Cancel any x/z offset the parent applies, so pads sit at their absolute layout positions.
    const g = groupRef.current;
    if (g?.parent) {
      g.parent.updateWorldMatrix(true, false);
      g.parent.getWorldPosition(parentPos);
      if (Math.abs(g.position.x + parentPos.x) > 1e-3 || Math.abs(g.position.z + parentPos.z) > 1e-3) {
        g.position.set(-parentPos.x, 0, -parentPos.z);
      }
    }

    const s = useApp.getState();
    const built = Math.max(0, Math.min(N, Math.round(s.tools.reactorsBuilt)));
    const step = s.reducedMotion ? 1 : Math.min(delta, 0.1) / RISE_SECONDS;
    let changed = false;
    for (let k = 0; k < N; k++) {
      const target = k < built ? 1 : 0;
      const p = progress[k];
      if (target === 1 && p < 1) {
        // One after another: wait until the previous reactor is partly up.
        if (k === 0 || progress[k - 1] > 0.45) progress[k] = Math.min(1, p + step);
      } else if (target === 0 && p > 0) {
        progress[k] = Math.max(0, p - step * 1.5);
      }
      if (progress[k] !== drawn[k]) changed = true;
    }
    if (!changed) return;

    (Object.keys(PARTS) as PartKey[]).forEach((key) => {
      const m = refs[key].current;
      if (!m) return;
      const part = PARTS[key];
      for (let k = 0; k < N; k++) {
        const p = progress[k];
        const e = 1 - (1 - p) * (1 - p); // ease out
        const [x, z] = padPos(k);
        tmp.position.set(x + part.off[0], part.off[1] - RISE_DEPTH * (1 - e), z + part.off[2]);
        const sc = p <= 0 ? 0 : 1;
        tmp.scale.set(part.s[0] * sc, part.s[1] * sc, part.s[2] * sc);
        tmp.updateMatrix();
        m.setMatrixAt(k, tmp.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    });
    drawn.set(progress);
  });

  const white = mat(NEUTRAL.white);

  return (
    <group ref={groupRef}>
      <Instanced items={PADS} material={mat(NEUTRAL.concrete, { rough: 1 })} shadow={false} />
      <instancedMesh ref={refs.base} args={[GEO.cyl, white, N]} castShadow receiveShadow />
      <instancedMesh ref={refs.dome} args={[GEO.hemi, white, N]} castShadow receiveShadow />
      <instancedMesh ref={refs.band} args={[GEO.cylLow, mat(SOURCE_COLORS.fission), N]} />
      <instancedMesh ref={refs.hall} args={[GEO.box, mat(NEUTRAL.offWhite), N]} castShadow receiveShadow />
    </group>
  );
}
