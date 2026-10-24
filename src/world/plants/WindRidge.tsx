// Wind ridge (SPEC §5.1, §8.5): five turbines on a low hill. Rotors turn with the modelled wind
// when wind is on, and stand still when it is off.
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../store';
import { PLACES } from '../../data/places';
import { SOURCE_COLORS } from '../../data/colors';
import { GEO, NEUTRAL, Instanced, accent, approach, clamp01, mat, safe, simNow, usePlantOn, type InstanceItem } from './shared';
import { ROTOR_MAX_RAD_S } from './plantFacts';

const HILL = { rx: 22, rz: 15, h: 4.5 };
const TOWER_H = 13;
const BLADE_L = 5.2;

/** Height of the hill surface at (x, z). */
function hillY(x: number, z: number): number {
  const q = 1 - (x / HILL.rx) ** 2 - (z / HILL.rz) ** 2;
  return q > 0 ? HILL.h * Math.sqrt(q) : 0;
}

const SPOTS: [number, number][] = [[-15, 3], [-7.5, -1.5], [0, 1], [7.5, -1.5], [15, 3]];
const BASES = SPOTS.map(([x, z]) => [x, hillY(x, z) - 0.3, z] as [number, number, number]);

const TOWERS: InstanceItem[] = BASES.map(([x, y, z]) => ({ p: [x, y + TOWER_H / 2, z], s: [1, TOWER_H, 1] }));
const NACELLES: InstanceItem[] = BASES.map(([x, y, z]) => ({ p: [x, y + TOWER_H + 0.35, z - 0.35], s: [0.9, 0.8, 2.2] }));
const BANDS: InstanceItem[] = BASES.map(([x, y, z]) => ({ p: [x, y + 1.3, z], s: [1.14, 0.5, 1.14] }));

const towerGeo = new THREE.CylinderGeometry(0.32, 0.55, 1, 12);
const bladeGeo = new THREE.BoxGeometry(0.42, BLADE_L, 0.12);
bladeGeo.translate(0, BLADE_L / 2 + 0.25, 0);

export default function WindRidge() {
  const on = usePlantOn('wind');
  const ground = useApp((s) => PLACES[s.input.place].groundAccent);
  const onRef = useRef(on);
  onRef.current = on;
  const rotors = useRef<(THREE.Group | null)[]>([]);
  const st = useRef({ speed: 0 });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { r, i, live, s } = simNow();
    let target = 0;
    if (onRef.current) target = live ? clamp01(safe(r.wind?.[i])) : 0.5;
    if (s.reducedMotion) target *= 0.4;
    st.current.speed = approach(st.current.speed, target * ROTOR_MAX_RAD_S, 0.8, dt);
    const sp = st.current.speed;
    rotors.current.forEach((g, k) => {
      if (g) g.rotation.z -= sp * dt * (1 + k * 0.03);
    });
  });

  const white = mat(on ? NEUTRAL.white : '#dededa', { rough: 0.85 });

  return (
    <group>
      {/* Low hill */}
      <mesh geometry={GEO.hemi} material={mat(ground, { rough: 1 })} scale={[HILL.rx, HILL.h, HILL.rz]} receiveShadow />

      <Instanced items={TOWERS} geometry={towerGeo} material={white} />
      <Instanced items={NACELLES} material={white} />
      <Instanced items={BANDS} geometry={GEO.cylLow} material={mat(accent(SOURCE_COLORS.wind, on))} shadow={false} />

      {BASES.map(([x, y, z], k) => (
        <group
          key={k}
          ref={(g) => { rotors.current[k] = g; }}
          position={[x, y + TOWER_H + 0.35, z + 0.85]}
          rotation={[0, 0, k * 0.7]}
        >
          <mesh geometry={GEO.sphere} material={white} scale={[0.38, 0.38, 0.5]} castShadow />
          {[0, 1, 2].map((b) => (
            <mesh key={b} geometry={bladeGeo} material={white} rotation={[0, 0, (b * Math.PI * 2) / 3]} castShadow />
          ))}
        </group>
      ))}
    </group>
  );
}
