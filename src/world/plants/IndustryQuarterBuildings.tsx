// Industry Quarter (SPEC §13): four buildings that grow and light up when the price of power on the
// Industry Quarter dial falls below their break-even. The tools module shows the economics.
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../store';
import { HYDROGEN_POS, STATIONS } from '../layout';
import { GEO, NEUTRAL, Block, Cyl, Instanced, Puffs, approach, ownMat, mat, type InstanceItem } from './shared';

// Break-even electricity prices, $/MWh. MODEL ASSUMPTIONS (visual thresholds only, not shown as numbers here;
// the Industry Quarter tool shows the economics). Data center has no price threshold: it cares about connection.
export const SMELTER_BREAKEVEN = 40;
export const HYDROGEN_BREAKEVEN = 20;
export const DESAL_DAC_BREAKEVEN = 10;

const IDLE_SCALE = 0.84;
const LIT = new THREE.Color(NEUTRAL.lit);
const UNLIT = new THREE.Color('#b4b8bb');

type V3 = [number, number, number];

const H2_REL: V3 = [HYDROGEN_POS[0] - STATIONS.industry.pos[0], 0, HYDROGEN_POS[1] - STATIONS.industry.pos[1]];

/** Wraps a building: scales up and lights its roof strip when active. */
function Growable({ active, position, children, litItems }: {
  active: boolean; position: V3; children: ReactNode; litItems: InstanceItem[];
}) {
  const ref = useRef<THREE.Group>(null);
  const litMat = useMemo(() => ownMat('#b4b8bb', { rough: 0.9 }), []);
  const st = useRef({ k: active ? 1 : 0 });
  const activeRef = useRef(active);
  activeRef.current = active;
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const reduced = useApp.getState().reducedMotion;
    const target = activeRef.current ? 1 : 0;
    const k = (st.current.k = reduced ? target : approach(st.current.k, target, 2.5, Math.min(delta, 0.1)));
    const sc = IDLE_SCALE + (1 - IDLE_SCALE) * k;
    g.scale.set(sc, sc, sc);
    litMat.color.copy(UNLIT).lerp(LIT, k);
  });
  return (
    <group ref={ref} position={position}>
      {children}
      <Instanced items={litItems} material={litMat} shadow={false} />
    </group>
  );
}

/** Small fans (two crossed blades each) that spin at `speed()` radians per second. */
function Fans({ centers, axis, radius, speed }: { centers: V3[]; axis: 'y' | 'z'; radius: number; speed: () => number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const angle = useRef(0);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    const sp = useApp.getState().reducedMotion ? speed() * 0.3 : speed();
    angle.current += sp * Math.min(delta, 0.1);
    let n = 0;
    for (const c of centers) {
      for (let b = 0; b < 2; b++) {
        const a = angle.current + (b * Math.PI) / 2;
        tmp.position.set(c[0], c[1], c[2]);
        if (axis === 'y') tmp.rotation.set(0, a, 0);
        else tmp.rotation.set(0, 0, a);
        if (axis === 'y') tmp.scale.set(radius * 2, 0.06, radius * 0.32);
        else tmp.scale.set(radius * 2, radius * 0.32, 0.06);
        tmp.updateMatrix();
        m.setMatrixAt(n++, tmp.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[GEO.box, mat(NEUTRAL.dark, { rough: 0.9 }), centers.length * 2]} frustumCulled={false} />;
}

// ---------- the four buildings ----------

function Smelter() {
  const active = useApp((s) => s.tools.industryPrice <= SMELTER_BREAKEVEN);
  const activeRef = useRef(active);
  activeRef.current = active;
  const lit: InstanceItem[] = useMemo(() => [-4.5, -1.5, 1.5, 4.5].map((x) => ({ p: [x, 3.75, 0], s: [2.2, 0.12, 3.2] })), []);
  return (
    <Growable active={active} position={[-9, 0, -6]} litItems={lit}>
      {/* Long potline hall with two small stacks */}
      <Block p={[0, 0, 0]} s={[13, 3.6, 4.6]} color={NEUTRAL.offWhite} />
      <Block p={[0, 3.6, 0]} s={[13.2, 0.08, 4.8]} color={NEUTRAL.roof} />
      <Block p={[-4.5, 0, -3.6]} s={[3, 2.2, 2.4]} color={NEUTRAL.concrete} />
      <Cyl p={[4.8, 0, -3.4]} r={0.45} h={7} color={NEUTRAL.concrete} />
      <Cyl p={[3.2, 0, -3.4]} r={0.45} h={7} color={NEUTRAL.concrete} />
      <Puffs origin={[4.8, 7.4, -3.4]} rate={() => (activeRef.current ? 0.7 : 0)} color="#d6d3cf" opacity={0.35} max={8} perSecond={1} rise={6} size={0.7} />
    </Growable>
  );
}

function DataCenter() {
  // Always running. It cares about getting connected, not the price of power, so it barely changes.
  const fans: V3[] = useMemo(() => [-3, 0, 3].flatMap((x) => [-1.6, 1.6].map((z) => [x, 4.95, z] as V3)), []);
  const housings: InstanceItem[] = useMemo(() => fans.map(([x, , z]) => ({ p: [x, 4.7, z], s: [2.2, 0.4, 2.2] })), [fans]);
  const lit: InstanceItem[] = useMemo(() => [{ p: [0, 2.2, 3.53], s: [7.6, 0.5, 0.05] }], []);
  return (
    <Growable active position={[-9, 0, 9]} litItems={lit}>
      <Block p={[0, 0, 0]} s={[9, 4.5, 7]} color={NEUTRAL.white} />
      <Block p={[0, 0, 0]} s={[9.1, 0.6, 7.1]} color={NEUTRAL.concrete} />
      <Instanced items={housings} material={mat(NEUTRAL.steel, { rough: 0.85 })} />
      <Fans centers={fans} axis="y" radius={0.85} speed={() => 2.2} />
      <Block p={[5.6, 0, 1]} s={[2, 2, 3]} color={NEUTRAL.concreteDark} />
    </Growable>
  );
}

function HydrogenPlant() {
  const active = useApp((s) => s.tools.industryPrice <= HYDROGEN_BREAKEVEN);
  const activeRef = useRef(active);
  activeRef.current = active;
  const lit: InstanceItem[] = useMemo(() => [{ p: [-1.5, 3.07, 0], s: [5.4, 0.12, 0.8] }], []);
  return (
    <Growable active={active} position={H2_REL} litItems={lit}>
      {/* Electrolyser shed, two hydrogen spheres, an ammonia tank */}
      <Block p={[-1.5, 0, 0]} s={[6, 3, 4]} color={NEUTRAL.offWhite} />
      <Block p={[-1.5, 3, 0]} s={[6.2, 0.06, 4.2]} color={NEUTRAL.roof} />
      <mesh geometry={GEO.sphere} material={mat(NEUTRAL.white)} position={[3.6, 2.4, -1.6]} scale={1.5} castShadow receiveShadow />
      <mesh geometry={GEO.sphere} material={mat(NEUTRAL.white)} position={[3.6, 2.4, 1.8]} scale={1.5} castShadow receiveShadow />
      <Cyl p={[3.6, 0, -1.6]} r={0.5} h={1.2} color={NEUTRAL.steel} />
      <Cyl p={[3.6, 0, 1.8]} r={0.5} h={1.2} color={NEUTRAL.steel} />
      <Cyl p={[-2.5, 0, -4.2]} r={1.4} h={3.2} color={NEUTRAL.offWhite} />
      <Puffs origin={[-3.5, 3.4, 0.5]} rate={() => (activeRef.current ? 0.6 : 0)} color="#ffffff" opacity={0.4} max={8} perSecond={0.9} rise={5} size={0.6} />
    </Growable>
  );
}

function DesalDac() {
  const active = useApp((s) => s.tools.industryPrice <= DESAL_DAC_BREAKEVEN);
  const activeRef = useRef(active);
  activeRef.current = active;
  const fans: V3[] = useMemo(() => [-2.7, 0, 2.7].flatMap((x) => [1.2, 2.7].map((y) => [x, y, 0.82] as V3)), []);
  const lit: InstanceItem[] = useMemo(() => [{ p: [0, 3.62, 0], s: [8, 0.12, 1.2] }], []);
  return (
    <Growable active={active} position={[9, 0, -8]} litItems={lit}>
      {/* Direct air capture fan wall and two water tanks */}
      <Block p={[0, 0, 0]} s={[8.4, 3.5, 1.5]} color={NEUTRAL.offWhite} />
      <Fans centers={fans} axis="z" radius={0.6} speed={() => (activeRef.current ? 3 : 0)} />
      <Cyl p={[-2.4, 0, -3.6]} r={1.3} h={2.4} color={NEUTRAL.white} />
      <Cyl p={[1.0, 0, -3.6]} r={1.3} h={2.4} color={NEUTRAL.white} />
      <Block p={[3.9, 0, -3.6]} s={[2.2, 1.8, 2.2]} color={NEUTRAL.concrete} />
    </Growable>
  );
}

export default function IndustryQuarterBuildings() {
  return (
    <group>
      <Block p={[0, 0, 0]} s={[32, 0.1, 26]} color={NEUTRAL.concrete} shadow={false} />
      <Smelter />
      <DataCenter />
      <HydrogenPlant />
      <DesalDac />
    </group>
  );
}
