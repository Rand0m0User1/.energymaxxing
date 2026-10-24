// Battery yard (SPEC §5.1, §8.2): rows of white containers. A soft bar on each container's side
// fills with the battery's state of charge. Container count scales with GWh (up to 24 shown).
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../store';
import { SOURCE_COLORS } from '../../data/colors';
import { GEO, NEUTRAL, Block, Instanced, approach, clamp01, greyed, mat, ownMat, safe, simNow, type InstanceItem } from './shared';
import { BATTERY_FULL_GWH, BATTERY_MAX_CONTAINERS } from './plantFacts';

const COLS = 4;
const C = { l: 4.8, h: 2.1, w: 2.0 };
const DX = 5.6;
const DZ = 3.4;
const BAR = { l: 3.8, h: 0.34, y: 1.05 };

/** Container slots, front rows (south, +z, toward the default camera) first. */
const SLOTS: [number, number][] = (() => {
  const out: [number, number][] = [];
  const rows = Math.ceil(BATTERY_MAX_CONTAINERS / COLS);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) out.push([(c - (COLS - 1) / 2) * DX, (r - (rows - 1) / 2) * DZ]);
  }
  return out;
})();

const tmp = new THREE.Object3D();

export default function BatteryYard() {
  const on = useApp((s) => s.input.battery.on && s.input.battery.gwh > 0 && s.input.battery.gw > 0);
  const gwh = useApp((s) => s.input.battery.gwh);
  const count = gwh > 0
    ? Math.min(BATTERY_MAX_CONTAINERS, Math.max(2, Math.ceil((gwh / BATTERY_FULL_GWH) * BATTERY_MAX_CONTAINERS)))
    : 2;

  const fillRef = useRef<THREE.InstancedMesh>(null);
  const fillMat = useMemo(() => ownMat(SOURCE_COLORS.battery, { rough: 0.85 }), []);
  const st = useRef({ frac: 0, drawn: -1, drawnCount: -1, colorOn: true });
  const onRef = useRef(on);
  onRef.current = on;

  const parts = useMemo(() => {
    const bodies: InstanceItem[] = [];
    const coolers: InstanceItem[] = [];
    const tracks: InstanceItem[] = [];
    for (let k = 0; k < count; k++) {
      const [x, z] = SLOTS[k];
      bodies.push({ p: [x, C.h / 2 + 0.2, z], s: [C.l, C.h, C.w] });
      coolers.push({ p: [x + C.l / 2 - 0.45, C.h + 0.2 + 0.2, z], s: [0.7, 0.4, 1.4] });
      tracks.push({ p: [x, BAR.y + 0.2, z + C.w / 2 + 0.02], s: [BAR.l, BAR.h, 0.04] });
    }
    return { bodies, coolers, tracks };
  }, [count]);

  useFrame((_, delta) => {
    const m = fillRef.current;
    if (!m) return;
    const { s, r, i, live } = simNow();
    const cap = s.input.battery.gwh;
    let target = 0;
    if (onRef.current && cap > 0) target = live ? clamp01(safe(r.soc?.[i]) / cap) : 0.5;
    const t = st.current;
    t.frac = approach(t.frac, target, 4, Math.min(delta, 0.1));
    if (t.colorOn !== onRef.current) {
      t.colorOn = onRef.current;
      fillMat.color.set(onRef.current ? SOURCE_COLORS.battery : greyed(SOURCE_COLORS.battery));
    }
    if (Math.abs(t.frac - t.drawn) < 1e-3 && t.drawnCount === count) return;
    const f = Math.max(0.001, t.frac);
    for (let k = 0; k < count; k++) {
      const [x, z] = SLOTS[k];
      tmp.position.set(x - BAR.l / 2 + (BAR.l * f) / 2, BAR.y + 0.2, z + C.w / 2 + 0.05);
      tmp.scale.set(BAR.l * f, BAR.h - 0.06, 0.04);
      tmp.updateMatrix();
      m.setMatrixAt(k, tmp.matrix);
    }
    m.count = count;
    m.visible = t.frac > 0.002;
    m.instanceMatrix.needsUpdate = true;
    if (t.drawnCount !== count) m.computeBoundingSphere();
    t.drawn = t.frac;
    t.drawnCount = count;
  });

  const body = mat(on ? NEUTRAL.white : '#dcdcd8', { rough: 0.85 });

  return (
    <group>
      {/* Gravel pad */}
      <Block p={[0, 0, 0]} s={[22.6, 0.2, 20.8]} color={NEUTRAL.concrete} shadow={false} />
      <Instanced items={parts.bodies} material={body} />
      <Instanced items={parts.coolers} material={mat(NEUTRAL.steel, { rough: 0.8 })} />
      <Instanced items={parts.tracks} material={mat('#d6d8d6', { rough: 0.9 })} shadow={false} />
      <instancedMesh ref={fillRef} args={[GEO.box, fillMat, BATTERY_MAX_CONTAINERS]} frustumCulled={false} />
    </group>
  );
}
