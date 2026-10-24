// Small name labels above each visible station. "off" shows muted when that source is switched off.
// Hidden on the title screen, for the selected station (its card shows instead) and when the camera is far away.
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useApp } from '../store';
import { STATIONS, stationsFor, type WorldStation } from './layout';
import { cityLitNow } from './districtState';

const FADE_START = 380;
const FADE_END = 520;

export default function Signs() {
  const env = useApp((s) => s.env);
  const ids = stationsFor(env);
  const refs = useRef<Partial<Record<WorldStation, HTMLDivElement | null>>>({});
  const camera = useThree((s) => s.camera);
  const tmp = useRef(new THREE.Vector3());

  useFrame(() => {
    const s = useApp.getState();
    const hideAll = s.screen === 'title';
    for (const id of ids) {
      const el = refs.current[id];
      if (!el) continue;
      const st = STATIONS[id];
      let op = 0;
      if (!hideAll && s.selectedStation !== id) {
        tmp.current.set(st.pos[0], st.labelY, st.pos[1]);
        const d = camera.position.distanceTo(tmp.current);
        op = d <= FADE_START ? 1 : d >= FADE_END ? 0 : 1 - (d - FADE_START) / (FADE_END - FADE_START);
      }
      const o = op.toFixed(2);
      if (el.style.opacity !== o) el.style.opacity = o;
      const vis = op > 0.01 ? 'visible' : 'hidden';
      if (el.style.visibility !== vis) el.style.visibility = vis;
    }
  });

  return (
    <>
      {ids.map((id) => (
        <Html key={id} position={[STATIONS[id].pos[0], STATIONS[id].labelY, STATIONS[id].pos[1]]} center zIndexRange={[10, 0]} pointerEvents="none">
          <div
            ref={(el) => {
              refs.current[id] = el;
            }}
            style={{ opacity: 0, visibility: 'hidden', pointerEvents: 'none' }}
          >
            <Label id={id} />
          </div>
        </Html>
      ))}
    </>
  );
}

function Label({ id }: { id: WorldStation }) {
  const power = STATIONS[id].power;
  const off = useApp((s) => (power ? !s.on[power] : false));
  const dark = useApp((s) => (id === 'city' ? !cityLitNow(s) : false));
  const note = off ? 'off' : dark ? 'Blackout' : '';
  return (
    <div
      style={{
        padding: '3px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        fontSize: 'var(--fs-xs)',
        lineHeight: 1.3,
        background: dark ? 'rgba(43, 47, 51, 0.88)' : 'rgba(250, 249, 246, 0.88)',
        color: dark ? '#f4f3ef' : 'var(--ink)',
        border: '1px solid var(--line)',
        pointerEvents: 'none',
        userSelect: 'none',
        opacity: off ? 0.75 : 1,
      }}
    >
      <span style={{ fontWeight: 600 }}>{STATIONS[id].label}</span>
      {note && <span style={{ marginLeft: 5, opacity: dark ? 0.85 : 0.6 }}>{note}</span>}
    </div>
  );
}
