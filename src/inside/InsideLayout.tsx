// Shared layout for the non-reactor inside views:
// own R3F canvas (left), side panel (right), "How it works in 3 steps" + "Trade-offs" strip (bottom).
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Fragment, Suspense, useEffect, useRef, type ElementRef, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import { useApp } from '../store';
import { Button } from '../ui/kit';
import { InsideLights, type Vec3 } from './three';
import './inside.css';

type Controls = ElementRef<typeof OrbitControls>;

export interface InsideLayoutProps {
  /** R3F scene content (lights are added unless customLights). */
  scene: ReactNode;
  /** Camera position and look-at target. Changing them glides the camera there. */
  cameraPos: Vec3;
  target?: Vec3;
  minDistance?: number;
  maxDistance?: number;
  /** Lowest the camera may go: 0 = straight down, PI/2 = level with the ground. */
  maxPolar?: number;
  fov?: number;
  customLights?: boolean;
  lightSize?: number;
  /** DOM content drawn over the top-left of the canvas. */
  canvasOverlay?: ReactNode;
  panel: ReactNode;
  steps: [ReactNode, ReactNode, ReactNode];
  good: ReactNode;
  hard: ReactNode;
  costs: ReactNode;
  ariaLabel: string;
}

/** Glides camera and orbit target to new values whenever they change. User can orbit freely in between. */
function CameraRig({ pos, target, controls }: { pos: Vec3; target: Vec3; controls: RefObject<Controls> }) {
  const camera = useThree((s) => s.camera);
  const goalPos = useRef(new THREE.Vector3(...pos));
  const goalTarget = useRef(new THREE.Vector3(...target));
  const remaining = useRef(0);
  const snapped = useRef(false);
  const key = `${pos.join(',')}|${target.join(',')}`;

  useEffect(() => {
    goalPos.current.set(...pos);
    goalTarget.current.set(...target);
    remaining.current = snapped.current ? 1.3 : 0;
  }, [key]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (!snapped.current) {
      snapped.current = true;
      camera.position.copy(goalPos.current);
      c.target.copy(goalTarget.current);
      c.update();
      return;
    }
    if (remaining.current <= 0) return;
    const d = Math.min(dt, 0.05);
    remaining.current -= d;
    const k = 1 - Math.exp(-d * 4.5);
    camera.position.lerp(goalPos.current, k);
    c.target.lerp(goalTarget.current, k);
    if (remaining.current <= 0) {
      camera.position.copy(goalPos.current);
      c.target.copy(goalTarget.current);
    }
    c.update();
  });
  return null;
}

export default function InsideLayout(p: InsideLayoutProps) {
  const controls = useRef<Controls>(null);
  const target = p.target ?? [0, 0, 0];
  return (
    <div className="il-grid">
      <div className="il-canvas" aria-label={p.ariaLabel} role="img">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: p.cameraPos, fov: p.fov ?? 40, near: 0.05, far: 400 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#e7eae6']} />
          {!p.customLights && <InsideLights size={p.lightSize ?? 16} />}
          <Suspense fallback={null}>{p.scene}</Suspense>
          <OrbitControls
            ref={controls}
            enablePan={false}
            enableDamping
            dampingFactor={0.12}
            minDistance={p.minDistance ?? 1}
            maxDistance={p.maxDistance ?? 60}
            minPolarAngle={0.15}
            maxPolarAngle={p.maxPolar ?? Math.PI * 0.47}
          />
          <CameraRig pos={p.cameraPos} target={target} controls={controls} />
        </Canvas>
        {p.canvasOverlay && <div className="il-canvas-overlay">{p.canvasOverlay}</div>}
        <div className="il-hint">Drag to turn. Scroll to zoom.</div>
      </div>
      <aside className="panel panel-pad il-panel">{p.panel}</aside>
      <div className="il-strip">
        <div className="panel panel-pad il-card">
          <h3>How it works in 3 steps</h3>
          <ol className="il-steps">
            {p.steps.map((s, i) => (
              <li key={i}><span className="il-step-n">{i + 1}</span><span>{s}</span></li>
            ))}
          </ol>
        </div>
        <div className="panel panel-pad il-card">
          <h3>Trade-offs</h3>
          <div className="il-trade">
            <div><div className="il-trade-h good">Good</div>{p.good}</div>
            <div><div className="il-trade-h hard">Hard</div>{p.hard}</div>
            <div><div className="il-trade-h">Costs</div>{p.costs}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Current zoom level, clamped to 1..n. */
export function useLevel(n: number): number {
  const level = useApp((s) => s.insideLevel);
  return Math.min(n, Math.max(1, Math.round(level || 1)));
}

/** "Field · One panel · One cell" crumbs plus Back up / Go deeper buttons. Uses store.insideLevel. */
export function LevelNav({ levels }: { levels: string[] }) {
  const n = levels.length;
  const cur = useLevel(n);
  const setLevel = useApp((s) => s.setInsideLevel);
  return (
    <div className="il-levels">
      <div className="il-crumbs" role="navigation" aria-label="Zoom level">
        {levels.map((l, i) => (
          <Fragment key={l}>
            {i > 0 && <span className="il-crumb-sep" aria-hidden>›</span>}
            <button className="il-crumb" aria-current={i + 1 === cur ? 'step' : undefined} onClick={() => setLevel(i + 1)}>{l}</button>
          </Fragment>
        ))}
      </div>
      <div className="il-level-btns">
        <Button onClick={() => setLevel(cur - 1)} disabled={cur <= 1}>Back up</Button>
        <Button primary onClick={() => setLevel(cur + 1)} disabled={cur >= n}>Go deeper</Button>
      </div>
    </div>
  );
}
