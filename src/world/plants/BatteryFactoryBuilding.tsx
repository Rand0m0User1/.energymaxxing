// Battery Factory (SPEC §12.1): a factory shed, a conveyor carrying battery packs out to a price board.
// The board shows the pack price after the number of production doublings set in the Battery Factory tool.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../store';
import { SOURCE_COLORS } from '../../data/colors';
import { fv } from '../../data/facts';
import { priceAfterDoublings } from '../../engine/learning';
import { AssumptionTag, Fact } from '../../ui/Fact';
import { GEO, NEUTRAL, Block, Instanced, Sign, mat, type InstanceItem } from './shared';
import { CONVEYOR_SECONDS } from './plantFacts';

const BELT = { x0: 3.2, x1: 11.8, z: -0.6, y: 1.0 };
const PACKS = 8;

const LEGS: InstanceItem[] = Array.from({ length: 5 }, (_, k) => {
  const x = BELT.x0 + 0.4 + (k * (BELT.x1 - BELT.x0 - 0.8)) / 4;
  return [-0.5, 0.5].map((dz) => ({ p: [x, BELT.y / 2, BELT.z + dz] as [number, number, number], s: [0.14, BELT.y, 0.14] as [number, number, number] }));
}).flat();

const MONITORS: InstanceItem[] = [-7, -3.5, 0].map((x) => ({ p: [x, 5.6, -2], s: [1.4, 1.0, 7.4] }));

const tmp = new THREE.Object3D();

function PriceBoard() {
  const doublings = useApp((s) => s.tools.batteryDoublings);
  const price = priceAfterDoublings(fv('batteryPackPrice2025'), fv('batteryLearningRate'), doublings);
  const label = `$${Math.round(price)}/kWh`;
  return (
    <Sign position={[8.6, 4.4, 5.7]} width={150} interactive>
      <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>Battery pack price</div>
      <div style={{ fontSize: 22, fontWeight: 600, margin: '2px 0' }}>
        {doublings === 0 ? <Fact k="batteryPackPrice2025" format={(v) => `$${Math.round(v)}/kWh`} /> : <span className="num">{label}</span>}
      </div>
      {doublings > 0 && (
        <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>
          after {doublings} doubling{doublings === 1 ? '' : 's'} <AssumptionTag />
        </div>
      )}
    </Sign>
  );
}

export default function BatteryFactoryBuilding() {
  const packRef = useRef<THREE.InstancedMesh>(null);
  const st = useRef({ t: 0 });
  const packMat = useMemo(() => mat(SOURCE_COLORS.battery, { rough: 0.85 }), []);

  useFrame((_, delta) => {
    const m = packRef.current;
    if (!m) return;
    const s = useApp.getState();
    const dt = Math.min(delta, 0.1);
    // More doublings = a busier line (a visual hint only).
    const speed = (1 + Math.min(10, s.tools.batteryDoublings) * 0.12) / CONVEYOR_SECONDS;
    if (!s.reducedMotion) st.current.t += dt * speed;
    const len = BELT.x1 - BELT.x0;
    for (let k = 0; k < PACKS; k++) {
      const u = (st.current.t + k / PACKS) % 1;
      const edge = Math.min(1, u / 0.06, (1 - u) / 0.06);
      tmp.position.set(BELT.x0 + u * len, BELT.y + 0.15 + 0.25, BELT.z);
      tmp.scale.set(0.9 * edge, 0.5 * edge, 0.8 * edge);
      tmp.updateMatrix();
      m.setMatrixAt(k, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <Block p={[0.6, 0, 0]} s={[25, 0.12, 16]} color={NEUTRAL.concrete} shadow={false} />

      {/* Factory shed with roof lights and a battery-green band */}
      <Block p={[-3.5, 0, -2]} s={[13, 5, 8]} color={NEUTRAL.offWhite} />
      <Block p={[-3.5, 5, -2]} s={[13.2, 0.25, 8.2]} color={NEUTRAL.roof} />
      <Instanced items={MONITORS} material={mat(NEUTRAL.glass, { rough: 0.8 })} />
      <Block p={[-3.5, 4.1, 2.03]} s={[13.02, 0.35, 0.05]} color={SOURCE_COLORS.battery} shadow={false} />
      <Block p={[-3.5, 1.4, 2.03]} s={[9, 1.2, 0.05]} color={NEUTRAL.window} shadow={false} />
      <Block p={[3.02, 0, -0.6]} s={[0.05, 2.4, 2.2]} color={NEUTRAL.dark} shadow={false} />

      {/* Conveyor on legs, packs riding it, and a crate at the end */}
      <Instanced items={LEGS} material={mat(NEUTRAL.steel, { rough: 0.8 })} />
      <mesh
        geometry={GEO.box}
        material={mat(NEUTRAL.dark, { rough: 0.95 })}
        position={[(BELT.x0 + BELT.x1) / 2, BELT.y + 0.075, BELT.z]}
        scale={[BELT.x1 - BELT.x0, 0.15, 1.3]}
        castShadow
        receiveShadow
      />
      <instancedMesh ref={packRef} args={[GEO.box, packMat, PACKS]} castShadow />
      <Block p={[12.7, 0, BELT.z]} s={[1.6, 1.4, 1.8]} color={NEUTRAL.concreteDark} />

      {/* Price board on two posts */}
      <Block p={[7.2, 0, 5.5]} s={[0.2, 3.2, 0.2]} color={NEUTRAL.steel} />
      <Block p={[10, 0, 5.5]} s={[0.2, 3.2, 0.2]} color={NEUTRAL.steel} />
      <Block p={[8.6, 3.0, 5.5]} s={[3.8, 2.4, 0.2]} color={NEUTRAL.white} />
      <PriceBoard />
    </group>
  );
}
