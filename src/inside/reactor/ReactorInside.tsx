// Fission reactor inside view (SPEC §8.3): five zoom levels, chain reaction model, k gauge, sidebars and trade-offs.
// Rendered by InsideView inside a full-size box; this root fills it.
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useApp } from '../../store';
import { Button, Panel } from '../../ui/kit';
import { fv } from '../../data/facts';
import { ChainSim } from './chainSim';
import { LEVELS, PAL, type CoreState } from './shared';
import PlantScene from './PlantScene';
import CoreScene from './CoreScene';
import AssemblyScene from './AssemblyScene';
import PelletScene, { URANIUM_ATOMS } from './PelletScene';
import AtomsScene, { type Bridge } from './AtomsScene';
import { AtomsOverlay, CoreOverlay } from './Overlays';
import {
  AssemblyPanel, AtomsPanel, BottomStrip, CorePanel, MicroreactorCard, MoonReactorCard, PelletPanel, PlantPanel, type AtomsControls,
} from './Panels';
import './reactor.css';

type V3 = [number, number, number];
const VIEWS: Record<number, { pos: V3; target: V3; dark: boolean }> = {
  1: { pos: [3, 11, 25], target: [2, 2, 0], dark: false },
  2: { pos: [0, 10.5, 13.5], target: [0, 2.6, 0], dark: false },
  3: { pos: [4.6, 5.2, 11.8], target: [1.4, 3.9, 0], dark: false },
  4: { pos: [0, 2.2, 9], target: [-0.6, 0, 0], dark: true },
  5: { pos: [8.5, 6.5, 13], target: [0, -0.3, 0], dark: true },
};

const TITLES: Record<number, string> = {
  1: 'The plant',
  2: 'The core',
  3: 'A fuel bundle',
  4: 'Inside a pellet',
  5: 'Atoms: the chain reaction',
};

/** Moves the camera to each level's view. Quick glide, or a cut when reduced motion is on. */
function CameraRig({ level }: { level: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const reduced = useApp((s) => s.reducedMotion);
  const anim = useRef({ t: 1, fromPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(), toPos: new THREE.Vector3(), toTarget: new THREE.Vector3() });
  useEffect(() => {
    const v = VIEWS[level];
    const a = anim.current;
    a.toPos.set(...v.pos);
    a.toTarget.set(...v.target);
    if (reduced || !controls) {
      camera.position.copy(a.toPos);
      if (controls) { controls.target.copy(a.toTarget); controls.update(); } else camera.lookAt(a.toTarget);
      a.t = 1;
      return;
    }
    a.fromPos.copy(camera.position);
    a.fromTarget.copy(controls.target);
    a.t = 0;
  }, [level, camera, controls, reduced]);
  useFrame((_, dt) => {
    const a = anim.current;
    if (a.t >= 1 || !controls) return;
    a.t = Math.min(1, a.t + Math.min(dt, 0.05) / 0.7);
    const e = a.t * a.t * (3 - 2 * a.t);
    camera.position.lerpVectors(a.fromPos, a.toPos, e);
    controls.target.lerpVectors(a.fromTarget, a.toTarget, e);
    controls.update();
  });
  return null;
}

function Backdrop({ dark }: { dark: boolean }) {
  const color = dark ? PAL.bgDark : PAL.bgLight;
  return (
    <>
      <color attach="background" args={[color]} />
      <fog attach="fog" args={[color, 30, 70]} />
    </>
  );
}

function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

export default function ReactorInside() {
  const rawLevel = useApp((s) => s.insideLevel);
  const setInsideLevel = useApp((s) => s.setInsideLevel);
  const reduced = useApp((s) => s.reducedMotion);
  const level = Math.min(5, Math.max(1, Math.round(rawLevel || 1)));
  const visible = usePageVisible();
  const view = VIEWS[level];

  // Level 2 core model (mutated by the scene each frame, read by the overlay a few times a second)
  const core = useRef<CoreState>({ target: 0.5, shown: 0.5, power: 0.5 }).current;
  const [coreRods, setCoreRods] = useState(0.5);
  useEffect(() => { core.target = coreRods; }, [coreRods, core]);

  // Level 3 and 4
  const [rodOpen, setRodOpen] = useState(true);
  const [haleu, setHaleu] = useState(false);
  const [share, setShare] = useState(() => (fv('u235NormalLow') + fv('u235NormalHigh')) / 2);
  const onHaleu = useCallback((v: boolean) => {
    setHaleu(v);
    setShare(v ? fv('haleuHigh') * 0.98 : (fv('u235NormalLow') + fv('u235NormalHigh')) / 2);
  }, []);
  const greenCount = Math.round(URANIUM_ATOMS * share);

  // Level 5 chain reaction model (lives as long as this view is open)
  const [atoms, setAtoms] = useState<AtomsControls>({ rods: 0.3, water: true, delayed: false, plutonium: false });
  const simRef = useRef<ChainSim | null>(null);
  if (!simRef.current) {
    simRef.current = new ChainSim({
      rods: 0.3, water: true, delayed: false, plutonium: false,
      u235Share: fv('simU235Share'), nu: fv('neutronsPerFission'), delayedShare: fv('simDelayedShare'),
    }, 7, reduced ? 200 : 340);
  }
  const sim = simRef.current;
  useEffect(() => {
    sim.params.rods = atoms.rods;
    sim.params.water = atoms.water;
    sim.params.delayed = atoms.delayed;
    sim.params.plutonium = atoms.plutonium;
  }, [atoms, sim]);
  const setAtomsPatch = useCallback((patch: Partial<AtomsControls>) => setAtoms((a) => ({ ...a, ...patch })), []);
  const bridge = useRef<Bridge>({});
  const fire = useCallback(() => sim.fireRandom(), [sim]);
  const resetAtoms = useCallback(() => sim.reset(), [sim]);

  // First visit to level 5: start with a couple of neutrons so something happens.
  useEffect(() => {
    if (level !== 5) return;
    const id = window.setTimeout(() => {
      if (sim.stats.splits === 0 && sim.stats.neutrons === 0) { sim.fireRandom(); sim.fireRandom(); }
    }, 700);
    return () => window.clearTimeout(id);
  }, [level, sim]);

  // N fires a neutron on level 5 (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (useApp.getState().insideLevel !== 5) return;
      sim.fireRandom();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sim]);

  const go = useCallback((n: number) => setInsideLevel(Math.min(5, Math.max(1, n))), [setInsideLevel]);

  // Scroll wheel over the canvas changes level (debounced).
  const wheel = useRef({ acc: 0, lockUntil: 0 });
  const onWheel = useCallback((e: RWheelEvent<HTMLDivElement>) => {
    const w = wheel.current;
    const now = performance.now();
    if (now < w.lockUntil) return;
    w.acc += e.deltaY;
    if (Math.abs(w.acc) > 90) {
      const lv = Math.min(5, Math.max(1, Math.round(useApp.getState().insideLevel || 1)));
      go(lv + (w.acc > 0 ? 1 : -1));
      w.acc = 0;
      w.lockUntil = now + 800;
    }
  }, [go]);

  // Click (not drag) on the canvas fires a neutron where you click, on level 5.
  const down = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = useCallback((e: RPointerEvent<HTMLDivElement>) => { down.current = { x: e.clientX, y: e.clientY }; }, []);
  const onPointerUp = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    const d = down.current;
    down.current = null;
    if (!d || level !== 5) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    const target = e.target as HTMLElement;
    if (target.tagName !== 'CANVAS') return;
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    if (bridge.current.fireNdc) bridge.current.fireNdc(x, y); else sim.fireRandom();
  }, [level, sim]);

  const [stripOpen, setStripOpen] = useState(true);
  const initialCam = useMemo(() => ({ position: VIEWS[level].pos, fov: 40, near: 0.1, far: 200 }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rx-root">
      <div className="rx-main">
        <div
          className={`rx-stage ${level === 5 ? 'rx-fire' : ''}`}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <Canvas
            frameloop={visible ? 'always' : 'never'}
            dpr={[1, 1.75]}
            camera={initialCam}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
          >
            <Backdrop dark={view.dark} />
            <hemisphereLight args={['#ffffff', view.dark ? '#3a4550' : '#d9d4c8', view.dark ? 0.8 : 0.9]} />
            <ambientLight intensity={view.dark ? 0.35 : 0.3} />
            <directionalLight position={[8, 14, 10]} intensity={view.dark ? 1.4 : 1.5} />
            <directionalLight position={[-10, 6, -6]} intensity={0.35} />
            <OrbitControls makeDefault enableZoom={false} enablePan={false} enableDamping dampingFactor={0.12} minPolarAngle={0.15} maxPolarAngle={Math.PI * 0.62} />
            <CameraRig level={level} />
            {level === 1 && <PlantScene />}
            {level === 2 && <CoreScene core={core} />}
            {level === 3 && <AssemblyScene open={rodOpen} />}
            {level === 4 && <PelletScene share={share} />}
            {level === 5 && <AtomsScene sim={sim} bridge={bridge} />}
          </Canvas>
          {level === 2 && <CoreOverlay core={core} />}
          {level === 5 && <AtomsOverlay sim={sim} />}
          {!stripOpen && (
            <div className="rx-strip-toggle">
              <Button onClick={() => setStripOpen(true)}>Show trade-offs</Button>
            </div>
          )}
        </div>
        {stripOpen && <BottomStrip onHide={() => setStripOpen(false)} />}
      </div>

      <aside className="rx-side" aria-label="Reactor controls">
        <Panel>
          <h2>Inside a fission reactor</h2>
          <p className="rx-p muted small" style={{ margin: 0 }}>Zoom in five steps, from the whole plant down to single atoms.</p>
          <ol className="rx-levels">
            {LEVELS.map((l) => (
              <li key={l.n}>
                <button aria-current={l.n === level ? 'step' : undefined} onClick={() => go(l.n)}>
                  <span className="rx-n">{l.n}</span>{l.name}
                </button>
              </li>
            ))}
          </ol>
          <div className="rx-nav">
            <Button onClick={() => go(level - 1)} disabled={level <= 1}>Back up</Button>
            <Button primary onClick={() => go(level + 1)} disabled={level >= 5}>Go deeper</Button>
          </div>

          <div className="rx-sec">
            <h3>{TITLES[level]}</h3>
            {level === 1 && <PlantPanel />}
            {level === 2 && <CorePanel rods={coreRods} setRods={setCoreRods} />}
            {level === 3 && <AssemblyPanel open={rodOpen} setOpen={setRodOpen} />}
            {level === 4 && (
              <PelletPanel haleu={haleu} setHaleu={onHaleu} share={share} setShare={setShare} greenCount={greenCount} total={URANIUM_ATOMS} />
            )}
            {level === 5 && <AtomsPanel c={atoms} set={setAtomsPatch} onFire={fire} onReset={resetAtoms} />}
          </div>

          <MicroreactorCard />
          <MoonReactorCard />
        </Panel>
      </aside>
    </div>
  );
}
