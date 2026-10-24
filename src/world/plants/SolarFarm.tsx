// Solar farm: rows of panels on single-axis trackers that follow the sun and lie flat at night.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useApp } from '../../store';
import { sunPosition } from '../../engine/sun';
import { SOURCE_COLORS } from '../../data/colors';
import {
  GEO, NEUTRAL, Block, Instanced, accent, approach, mat, ownMat, usePlantGw, usePlantOn, type InstanceItem,
} from './shared';
import { SOLAR_FULL_GW, SOLAR_MIN_ROWS, SOLAR_ROWS, TRACKER_MAX_DEG } from './plantFacts';

const PER_ROW = 11;
const ROW_DX = 3.8;
const PANEL_DZ = 2.36;
const PIVOT_Y = 1.6;
const PANEL = { w: 2.9, t: 0.08, d: 2.2 };
const ROW_LEN = PER_ROW * PANEL_DZ;
/** Rows fill from the middle outward. */
const ROW_ORDER = [3, 4, 2, 5, 1, 6, 0, 7];
const rowX = (k: number) => (k - (SOLAR_ROWS - 1) / 2) * ROW_DX;
const panelZ = (j: number) => (j - (PER_ROW - 1) / 2) * PANEL_DZ;
const MAX_TILT = (TRACKER_MAX_DEG * Math.PI) / 180;

const PANEL_ON = new THREE.Color(NEUTRAL.panel);
const PANEL_OFF = new THREE.Color('#5d6670');

const tmp = new THREE.Object3D();

export default function SolarFarm() {
  const on = usePlantOn('solar');
  const gw = usePlantGw('solar');
  const rows = gw > 0
    ? Math.min(SOLAR_ROWS, Math.max(SOLAR_MIN_ROWS, Math.ceil((gw / SOLAR_FULL_GW) * SOLAR_ROWS)))
    : SOLAR_MIN_ROWS;

  const panelRef = useRef<THREE.InstancedMesh>(null);
  const panelMat = useMemo(() => ownMat(NEUTRAL.panel, { rough: 0.8 }), []);
  const state = useRef({ angle: 0, drawnAngle: NaN, drawnRows: -1 });
  const onRef = useRef(on);
  onRef.current = on;

  const structure = useMemo(() => {
    const posts: InstanceItem[] = [];
    const tubes: InstanceItem[] = [];
    for (let r = 0; r < rows; r++) {
      const x = rowX(ROW_ORDER[r]);
      for (const z of [-ROW_LEN / 2 + 0.6, 0, ROW_LEN / 2 - 0.6]) posts.push({ p: [x, PIVOT_Y / 2, z], s: [0.18, PIVOT_Y, 0.18] });
      tubes.push({ p: [x, PIVOT_Y, 0], s: [0.14, 0.14, ROW_LEN] });
    }
    return { posts, tubes };
  }, [rows]);

  useFrame((_, delta) => {
    const m = panelRef.current;
    if (!m) return;
    const dt = Math.min(delta, 0.1);
    const s = useApp.getState();
    const st = state.current;

    // Tracker angle: face the sun's east-west direction, flat at night or when off.
    let target = 0;
    if (onRef.current) {
      const sp = sunPosition(s.input.place, s.hourOfYear);
      if (sp.elevationDeg > 0) {
        const el = (sp.elevationDeg * Math.PI) / 180;
        const az = (sp.azimuthDeg * Math.PI) / 180;
        const east = Math.sin(az) * Math.cos(el);
        const up = Math.sin(el);
        target = Math.max(-MAX_TILT, Math.min(MAX_TILT, -Math.atan2(east, up)));
      }
    }
    st.angle = s.reducedMotion ? target : approach(st.angle, target, 2.5, dt);

    // Panel colour: idle or running.
    const want = onRef.current ? PANEL_ON : PANEL_OFF;
    if (!panelMat.color.equals(want)) panelMat.color.copy(want);

    if (Math.abs(st.angle - st.drawnAngle) < 1e-4 && st.drawnRows === rows) return;
    const a = st.angle;
    const ox = -Math.sin(a) * 0.12;
    const oy = Math.cos(a) * 0.12;
    let n = 0;
    for (let r = 0; r < rows; r++) {
      const x = rowX(ROW_ORDER[r]);
      for (let j = 0; j < PER_ROW; j++) {
        tmp.position.set(x + ox, PIVOT_Y + oy, panelZ(j));
        tmp.rotation.set(0, 0, a);
        tmp.scale.set(PANEL.w, PANEL.t, PANEL.d);
        tmp.updateMatrix();
        m.setMatrixAt(n++, tmp.matrix);
      }
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (st.drawnRows !== rows) m.computeBoundingSphere();
    st.drawnAngle = a;
    st.drawnRows = rows;
  });

  const steel = mat(NEUTRAL.steel, { metal: 0.1, rough: 0.8 });
  const stripe = accent(SOURCE_COLORS.solar, on);

  return (
    <group>
      <instancedMesh ref={panelRef} args={[GEO.box, panelMat, SOLAR_ROWS * PER_ROW]} castShadow receiveShadow />
      <Instanced items={structure.posts} geometry={GEO.cylLow} material={steel} />
      <Instanced items={structure.tubes} material={steel} />

      {/* Inverter and transformer on the city side, with a solar-coloured roof stripe. */}
      <Block p={[-17.5, 0, 0]} s={[2.4, 2, 3.2]} color={NEUTRAL.offWhite} />
      <Block p={[-17.5, 2, 0]} s={[2.5, 0.22, 3.3]} color={stripe} />
      <Block p={[-17.5, 0, 3.4]} s={[1.6, 1.4, 1.6]} color={NEUTRAL.steel} />
    </group>
  );
}
