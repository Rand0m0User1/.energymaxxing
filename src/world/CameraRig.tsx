// Orbit camera around the island. Slow auto-rotate on the title screen; on explore the view shifts right
// so the island sits clear of the home panel on the left.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useApp } from '../store';

/** Minimal shape of the three-stdlib OrbitControls we use. */
interface Controls {
  target: THREE.Vector3;
  enabled: boolean;
  autoRotate: boolean;
  update: () => void;
}

const TARGET = new THREE.Vector3(0, 0, 0);
const DEFAULT_POS = new THREE.Vector3(110, 165, 235);
const TITLE_POS = new THREE.Vector3(205, 115, 200);
const FLY_S = 1.4;
/** Screen shift (px) that keeps the island clear of the home panel. */
const PANEL_SHIFT = 170;

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function CameraRig() {
  const screen = useApp((s) => s.screen);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controlsRef = useRef<Controls | null>(null);
  const tween = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number } | null>(null);
  const shift = useRef(0);

  useEffect(() => {
    if (screen === 'title') {
      tween.current = null;
      camera.position.copy(TITLE_POS);
      camera.lookAt(TARGET);
      return;
    }
    const to = DEFAULT_POS.clone();
    if (useApp.getState().reducedMotion) {
      camera.position.copy(to);
      tween.current = null;
    } else {
      tween.current = { from: camera.position.clone(), to, t: 0 };
    }
  }, [screen, camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = useApp.getState();
    const c = controlsRef.current;

    // Shift the view right on wide screens while the home panel shows.
    const want = s.screen === 'title' || size.width < 760 ? 0 : PANEL_SHIFT;
    const v = camera.view;
    if (Math.abs(want - shift.current) > 0.01 || !v || v.fullWidth !== size.width || v.fullHeight !== size.height) {
      shift.current += (want - shift.current) * Math.min(1, dt * 4);
      if (Math.abs(want - shift.current) < 0.5) shift.current = want;
      if (size.width < 1 || size.height < 1) return;
      camera.setViewOffset(size.width, size.height, -shift.current, 0, size.width, size.height);
    }

    if (c) {
      c.autoRotate = s.screen === 'title' && !s.reducedMotion;
      c.target.copy(TARGET);
    }
    const tw = tween.current;
    if (tw) {
      if (c) c.enabled = false;
      tw.t += dt / FLY_S;
      const k = ease(Math.min(1, tw.t));
      camera.position.lerpVectors(tw.from, tw.to, k);
      camera.lookAt(TARGET);
      if (tw.t >= 1) tween.current = null;
    } else if (c) {
      c.enabled = true;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef as never}
      makeDefault
      enableRotate={screen !== 'title'}
      enableZoom={screen !== 'title'}
      target={[0, 0, 0]}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={70}
      maxDistance={480}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2 - 0.14}
      autoRotateSpeed={0.35}
      zoomSpeed={0.8}
    />
  );
}
