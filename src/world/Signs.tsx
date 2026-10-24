// Quiet floating labels above each station: name and one live number. Hidden in map view, on the title screen,
// for the selected station (its card shows instead) and when the camera is far away.
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useApp } from '../store';
import { STATIONS } from './layout';
import { STATION_IDS, type StationId } from '../types';
import { LABEL_HEIGHT, stationLine } from './stationStatus';

const FADE_START = 260;
const FADE_END = 380;

export default function Signs() {
  const refs = useRef<Partial<Record<StationId, HTMLDivElement | null>>>({});
  const camera = useThree((s) => s.camera);
  const tmp = useRef(new THREE.Vector3());

  useFrame(() => {
    const s = useApp.getState();
    const hideAll = s.screen === 'title' || s.cameraMode === 'map' || !!s.inside;
    for (const id of STATION_IDS) {
      const el = refs.current[id];
      if (!el) continue;
      const st = STATIONS[id];
      let op = 0;
      if (!hideAll && s.selectedStation !== id) {
        tmp.current.set(st.pos[0], LABEL_HEIGHT[id], st.pos[1]);
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
      {STATION_IDS.map((id) => (
        <Html key={id} position={[STATIONS[id].pos[0], LABEL_HEIGHT[id], STATIONS[id].pos[1]]} center zIndexRange={[10, 0]} pointerEvents="none">
          <div
            ref={(el) => {
              refs.current[id] = el;
            }}
            style={{ opacity: 0, visibility: 'hidden', pointerEvents: 'none' }}
          >
            <SignBody id={id} />
          </div>
        </Html>
      ))}
    </>
  );
}

function SignBody({ id }: { id: StationId }) {
  const line = useApp((s) => stationLine(s, id));
  return (
    <div
      className="panel"
      style={{
        padding: '4px 9px',
        borderRadius: 9,
        whiteSpace: 'nowrap',
        fontSize: 'var(--fs-xs)',
        lineHeight: 1.35,
        textAlign: 'center',
        boxShadow: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        background: 'rgba(250, 249, 246, 0.9)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{STATIONS[id].label}</div>
      {line && <div className="num" style={{ color: 'var(--ink-2)' }}>{line}</div>}
    </div>
  );
}
