// Reactor hall: containment dome, turbine hall, cooling tower with slow steady steam
// when fission runs (same day and night), and a microreactor on a truck trailer beside it.
import { useMemo } from 'react';
import * as THREE from 'three';
import { SOURCE_COLORS } from '../../data/colors';
import { GEO, NEUTRAL, Block, Cyl, Instanced, Puffs, accent, mat, safe, simNow, usePlantOn, type InstanceItem } from './shared';

const TOWER_H = 12;
const towerGeo = new THREE.LatheGeometry(
  [
    new THREE.Vector2(4.2, 0),
    new THREE.Vector2(3.7, 2.5),
    new THREE.Vector2(3.1, 5.5),
    new THREE.Vector2(2.7, 8.4),
    new THREE.Vector2(2.75, 10.2),
    new THREE.Vector2(3.0, TOWER_H),
  ],
  32,
);

/** Fission is making power now (steady when on; pauses only for refuelling in the model). */
function fissionRunning(): number {
  const { s, r, i, live } = simNow();
  const p = s.input.plants.fission;
  if (!p.on || p.gw <= 0) return 0;
  if (!live) return 1;
  return safe(r.supply.fission?.[i]) > 0.001 ? 1 : 0;
}

const WHEELS: InstanceItem[] = [5.2, 6.3, 10.2, 11.3, 13.4].flatMap((x) =>
  [-1.0, 1.0].map((z) => ({ p: [x, 0.45, -8 + z] as [number, number, number], s: [0.9, 0.35, 0.9] as [number, number, number], rx: Math.PI / 2 })),
);

export default function ReactorHall() {
  const on = usePlantOn('fission');
  const band = accent(SOURCE_COLORS.fission, on);
  const towerMat = useMemo(() => mat(NEUTRAL.offWhite, { rough: 1, side: THREE.DoubleSide }), []);

  return (
    <group>
      {/* Site pad */}
      <Block p={[0, 0, 0]} s={[26, 0.12, 24]} color={NEUTRAL.concrete} shadow={false} />

      {/* Containment building: cylinder with a dome, and a violet band */}
      <Cyl p={[-3, 0, 3]} r={4.5} h={5} color={NEUTRAL.white} />
      <mesh geometry={GEO.hemi} material={mat(NEUTRAL.white)} position={[-3, 5, 3]} scale={[4.5, 4.2, 4.5]} castShadow receiveShadow />
      <Cyl p={[-3, 4.1, 3]} r={4.56} h={0.45} color={band} shadow={false} />

      {/* Link building and turbine hall */}
      <Block p={[2.2, 0, 3]} s={[2.4, 3, 3]} color={NEUTRAL.offWhite} />
      <Block p={[7, 0, 3]} s={[8, 5, 6.5]} color={NEUTRAL.offWhite} />
      <Block p={[7, 5, 3]} s={[8.2, 0.3, 6.7]} color={NEUTRAL.roof} />
      <Block p={[7, 2.6, 6.27]} s={[6.6, 0.9, 0.05]} color={NEUTRAL.window} shadow={false} />

      {/* Cooling tower with steady steam */}
      <mesh geometry={towerGeo} material={towerMat} position={[-6, 0, -7.5]} castShadow receiveShadow />
      <Puffs origin={[-6, TOWER_H + 0.6, -7.5]} rate={fissionRunning} color="#ffffff" opacity={0.5} max={14} perSecond={1.1} rise={9} size={1.9} />

      {/* Microreactor on a truck trailer */}
      <Block p={[8.2, 0.8, -8]} s={[7.4, 0.3, 2.4]} color={NEUTRAL.dark} />
      <Block p={[13.4, 0.6, -8]} s={[2.2, 2.4, 2.3]} color={NEUTRAL.offWhite} />
      <Block p={[14.2, 2.0, -8]} s={[0.6, 0.7, 2.0]} color={NEUTRAL.window} shadow={false} />
      <mesh geometry={GEO.cyl} material={mat(NEUTRAL.white)} position={[7.6, 2.0, -8]} rotation={[0, 0, Math.PI / 2]} scale={[1.7, 3.6, 1.7]} castShadow receiveShadow />
      <mesh geometry={GEO.cyl} material={mat(band)} position={[9.45, 2.0, -8]} rotation={[0, 0, Math.PI / 2]} scale={[1.76, 0.18, 1.76]} castShadow />
      <Block p={[10.9, 1.1, -8]} s={[1.0, 1.4, 1.9]} color={NEUTRAL.steel} />
      <Instanced items={WHEELS} geometry={GEO.cylLow} material={mat('#2f3337', { rough: 1 })} />
    </group>
  );
}
