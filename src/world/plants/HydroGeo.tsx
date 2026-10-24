// Hydro dam and geothermal (SPEC §5.1, §8.7): a small reservoir behind a dam whose level drops as
// hydro is used across the year, and a geothermal well-head with a pipe loop that warms to rust when on.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../store';
import { PLACES } from '../../data/places';
import { SOURCE_COLORS } from '../../data/colors';
import { GEO, NEUTRAL, Block, Cyl, Puffs, accent, approach, genFrac, greyed, mat, ownMat, safe, simNow, usePlantOn } from './shared';
import { RESERVOIR_DROP } from './plantFacts';

// Reservoir bounds (x0..x1, z0..z1) and levels.
const RES = { x0: -13, x1: 3, z0: -14, z1: -2.2 };
const FULL = 2.2;
const BANK_H = 2.7;
const DAM_H = 3.0;

const loopCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(9.5, 1.0, 3.5),
    new THREE.Vector3(14, 1.1, 2.8),
    new THREE.Vector3(17.4, 1.1, 5),
    new THREE.Vector3(17.4, 1.1, 8.6),
    new THREE.Vector3(14, 1.1, 10.4),
    new THREE.Vector3(10.2, 1.1, 8.2),
  ],
  true,
  'catmullrom',
  0.5,
);
const loopGeo = new THREE.TubeGeometry(loopCurve, 80, 0.22, 8, true);

const PIPE_COLD = new THREE.Color(NEUTRAL.steel);
const PIPE_HOT = new THREE.Color(SOURCE_COLORS.geothermal);

function geoVapour(): number {
  return genFrac('geothermal', 1) > 0.001 ? 0.6 : 0;
}

export default function HydroGeo() {
  const hydroOn = usePlantOn('hydro');
  const geoOn = usePlantOn('geothermal');
  const result = useApp((s) => s.result);
  const bank = useApp((s) => PLACES[s.input.place].groundAccent);

  /** Running share of the year's hydro energy used up to each step (0..1). */
  const usedShare = useMemo(() => {
    const h = result?.supply?.hydro;
    if (!h || h.length === 0) return null;
    const cum = new Float32Array(h.length);
    let acc = 0;
    for (let k = 0; k < h.length; k++) { acc += safe(h[k]); cum[k] = acc; }
    if (acc <= 0) return null;
    for (let k = 0; k < h.length; k++) cum[k] /= acc;
    return cum;
  }, [result]);

  const waterRef = useRef<THREE.Mesh>(null);
  const pipeMat = useMemo(() => ownMat(NEUTRAL.steel, { rough: 0.85 }), []);
  const st = useRef({ level: FULL, warm: 0 });
  const geoOnRef = useRef(geoOn);
  geoOnRef.current = geoOn;
  const usedRef = useRef(usedShare);
  usedRef.current = usedShare;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { i } = simNow();
    const used = usedRef.current ? safe(usedRef.current[i]) : 0;
    const t = st.current;
    t.level = approach(t.level, FULL - RESERVOIR_DROP * used, 3, dt);
    const w = waterRef.current;
    if (w) {
      const h = Math.max(0.2, t.level);
      w.scale.y = h;
      w.position.y = h / 2;
    }
    t.warm = approach(t.warm, geoOnRef.current ? 1 : 0, 1.5, dt);
    pipeMat.color.copy(PIPE_COLD).lerp(PIPE_HOT, t.warm);
  });

  const waterColor = useMemo(() => {
    const c = new THREE.Color(SOURCE_COLORS.hydro).lerp(new THREE.Color('#ffffff'), 0.35);
    const hex = '#' + c.getHexString();
    return hydroOn ? hex : greyed(hex, 0.35);
  }, [hydroOn]);
  const resW = RES.x1 - RES.x0;
  const resD = RES.z1 - RES.z0;
  const cx = (RES.x0 + RES.x1) / 2;
  const cz = (RES.z0 + RES.z1) / 2;

  return (
    <group>
      {/* Reservoir: banks on three sides, water inside, dam on the south side */}
      <Block p={[cx, 0, RES.z0 - 1]} s={[resW + 4, BANK_H, 2]} color={bank} />
      <Block p={[RES.x0 - 1, 0, cz]} s={[2, BANK_H, resD]} color={bank} />
      <Block p={[RES.x1 + 1, 0, cz]} s={[2, BANK_H, resD]} color={bank} />
      <mesh ref={waterRef} geometry={GEO.box} material={mat(waterColor, { rough: 0.8 })} position={[cx, FULL / 2, cz]} scale={[resW, FULL, resD]} receiveShadow />
      <Block p={[cx, 0, RES.z1 + 0.7]} s={[resW + 4, DAM_H, 1.4]} color={NEUTRAL.concrete} />
      <Block p={[cx, DAM_H, RES.z1 + 0.7]} s={[resW + 4, 0.2, 1.6]} color={NEUTRAL.concreteDark} />

      {/* Powerhouse below the dam with a hydro-coloured roof, and the outflow */}
      <Block p={[-5, 0, 1.9]} s={[4.4, 2.2, 2.6]} color={NEUTRAL.offWhite} />
      <Block p={[-5, 2.2, 1.9]} s={[4.6, 0.25, 2.8]} color={accent(SOURCE_COLORS.hydro, hydroOn)} />
      <Block p={[-5, 0, 6.2]} s={[2.2, 0.08, 6]} color={waterColor} shadow={false} />

      {/* Geothermal: well-head, small plant, warm pipe loop */}
      <Block p={[9.5, 0, 3.5]} s={[2.2, 0.15, 2.2]} color={NEUTRAL.concrete} shadow={false} />
      <Cyl p={[9.5, 0.15, 3.5]} r={0.34} h={1.7} color={NEUTRAL.steel} />
      <Block p={[9.5, 1.85, 3.5]} s={[0.9, 0.35, 0.9]} color={accent(SOURCE_COLORS.geothermal, geoOn)} />
      <Block p={[14, 0, 6.5]} s={[4, 2.6, 3.4]} color={NEUTRAL.offWhite} />
      <Block p={[14, 2.6, 6.5]} s={[4.2, 0.22, 3.6]} color={NEUTRAL.roof} />
      <mesh geometry={loopGeo} material={pipeMat} castShadow receiveShadow />
      <Puffs origin={[15, 3.2, 6.5]} rate={geoVapour} color="#ffffff" opacity={0.4} max={8} perSecond={0.9} rise={6} size={0.8} />
    </group>
  );
}
