// Solar farm inside view (SPEC §8.1): field → one panel → one cell, plus the sun-angle idea.
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useApp } from '../../store';
import { PLACES } from '../../data/places';
import { fv } from '../../data/facts';
import { SOURCE_COLORS } from '../../data/colors';
import { Fact, Cite } from '../../ui/Fact';
import { Button, RealTerm, Slider } from '../../ui/kit';
import InsideLayout, { LevelNav, useLevel } from '../InsideLayout';
import { DEG, Ground, InsideLights, Label, Matte, rng, safeDt, setInstances, usd, type Vec3 } from '../three';

const LEVELS = ['Field', 'One panel', 'One cell'];
const MIN_ELEV = 10;
const PANEL_BLUE = '#3a4a63';
const LIGHT = '#F2C14E';

/** Panel tilt that faces the sun, limited like a real tracker. */
function panelTilt(e: number): number {
  return -Math.min(Math.PI / 2 - e, 55 * DEG);
}

// ---------- Level 1: field with the beam footprint ----------
function Field({ e, ground }: { e: number; ground: string }) {
  const panels = useRef<THREE.InstancedMesh>(null);
  const posts = useRef<THREE.InstancedMesh>(null);
  const ROWS = 6, COLS = 9;
  const N = ROWS * COLS;
  useLayoutEffect(() => {
    const tilt = panelTilt(e);
    setInstances(panels.current, N, (i, o) => {
      const r = Math.floor(i / COLS), c = i % COLS;
      o.position.set(-10.8 + c * 2.7, 1.25, -6 - r * 3);
      o.rotation.set(0, 0, tilt);
    });
    setInstances(posts.current, N, (i, o) => {
      const r = Math.floor(i / COLS), c = i % COLS;
      o.position.set(-10.8 + c * 2.7, 0.6, -6 - r * 3);
    });
  }, [e, N]);

  const W = 2.4, D = 2.4, L = 14;
  const base = new THREE.Vector3(-2, 0, 7);
  const dir = new THREE.Vector3(Math.cos(e), Math.sin(e), 0);
  const beamCentre = base.clone().addScaledVector(dir, L / 2);
  const sunPos = base.clone().addScaledVector(dir, L + 0.9);
  const footLen = W / Math.max(0.05, Math.sin(e));
  const ratio = 1 / Math.max(0.05, Math.sin(e));
  const outline = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const h = W / 2, d = D / 2;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-h, 0, -d, h, 0, -d, h, 0, d, -h, 0, d], 3));
    return g;
  }, []);

  return (
    <group>
      <Ground size={260} color={ground} />
      <instancedMesh ref={panels} args={[undefined, undefined, N]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.06, 1.4]} />
        <Matte color={PANEL_BLUE} />
      </instancedMesh>
      <instancedMesh ref={posts} args={[undefined, undefined, N]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
        <Matte color="#9aa1a8" />
      </instancedMesh>

      {/* Beam of fixed width */}
      <mesh position={beamCentre.toArray() as Vec3} rotation={[0, 0, e - Math.PI / 2]}>
        <boxGeometry args={[W, L, D]} />
        <Matte color={LIGHT} opacity={0.24} />
      </mesh>
      <mesh position={sunPos.toArray() as Vec3}>
        <sphereGeometry args={[0.8, 24, 16]} />
        <meshBasicMaterial color="#F3C553" />
      </mesh>
      {/* Footprint on the ground: grows as the sun gets lower */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[base.x, 0.03, base.z]}>
        <planeGeometry args={[footLen, D]} />
        <Matte color={SOURCE_COLORS.solar} opacity={0.6} />
      </mesh>
      <lineLoop geometry={outline} position={[base.x, 0.06, base.z]}>
        <lineBasicMaterial color="#1d2227" transparent opacity={0.55} />
      </lineLoop>
      <Label position={[base.x, 0.2, base.z + D / 2 + 0.9]}>Spread over {ratio.toFixed(1)}× the area of an overhead sun</Label>
      <Label position={beamCentre.toArray() as Vec3} muted>Same beam of sunlight</Label>
      <Label position={[0, 2.6, -6]} muted>Rows of panels turn to face the sun</Label>
    </group>
  );
}

// ---------- Level 2: one panel ----------
function OnePanel({ e }: { e: number }) {
  const cells = useRef<THREE.InstancedMesh>(null);
  const packets = useRef<THREE.InstancedMesh>(null);
  const CX = 6, CZ = 10;
  const tilt = panelTilt(e);
  useLayoutEffect(() => {
    setInstances(cells.current, CX * CZ, (i, o) => {
      const x = i % CX, z = Math.floor(i / CX);
      o.position.set(-0.4375 + x * 0.175, 0.035, -0.7875 + z * 0.175);
    });
  }, []);

  const P = 30;
  const hits = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: P }, () => new THREE.Vector3((r() - 0.5) * 1.0, 0.06, (r() - 0.5) * 1.7));
  }, []);
  const phase = useRef(Array.from({ length: P }, (_, i) => (i * 0.618034) % 1));
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3(), axis: new THREE.Vector3(0, 0, 1) }), []);
  const centre = new THREE.Vector3(0, 1.15, 0);

  useFrame((_, dtRaw) => {
    const m = packets.current;
    if (!m) return;
    const dt = safeDt(dtRaw);
    const active = Math.max(1, Math.round(P * Math.sin(e)));
    const dir = new THREE.Vector3(Math.cos(e), Math.sin(e), 0.15).normalize();
    for (let i = 0; i < P; i++) {
      phase.current[i] = (phase.current[i] + dt * 0.6) % 1;
      const t = phase.current[i];
      tmp.v.copy(hits[i]).applyAxisAngle(tmp.axis, tilt).add(centre);
      tmp.o.position.copy(tmp.v).addScaledVector(dir, (1 - t) * 3);
      tmp.o.scale.setScalar(i < active ? 1 : 0);
      tmp.o.updateMatrix();
      m.setMatrixAt(i, tmp.o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <Ground size={14} color="#dcdfd9" />
      <group position={[0, 1.15, 0]} rotation={[0, 0, tilt]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.05, 1.86]} />
          <Matte color="#c9cdd1" />
        </mesh>
        <instancedMesh ref={cells} args={[undefined, undefined, CX * CZ]} receiveShadow>
          <boxGeometry args={[0.16, 0.02, 0.16]} />
          <Matte color="#34465f" />
        </instancedMesh>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[1.06, 0.005, 1.82]} />
          <Matte color="#e8eef3" opacity={0.18} />
        </mesh>
        <mesh position={[0, -0.07, 0.6]}>
          <boxGeometry args={[0.18, 0.06, 0.12]} />
          <Matte color="#2b2f33" />
        </mesh>
      </group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
        <Matte color="#9aa1a8" />
      </mesh>
      <mesh position={[0.15, 0.5, 0.6]}>
        <cylinderGeometry args={[0.012, 0.012, 1.0, 6]} />
        <Matte color="#2b2f33" />
      </mesh>
      <instancedMesh ref={packets} args={[undefined, undefined, P]} frustumCulled={false}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshBasicMaterial color={LIGHT} />
      </instancedMesh>
      <Label position={[-0.2, 1.75, -0.6]}>Solar cells under glass</Label>
      <Label position={[0.6, 0.9, 0.95]} muted>Frame</Label>
      <Label position={[0.25, 0.15, 0.85]} muted>Wires to the rest of the farm</Label>
    </group>
  );
}

// ---------- Level 3: one cell ----------
const FINGERS = [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9];
const BUS_Z = 0.62;
function OneCell({ e }: { e: number }) {
  const packets = useRef<THREE.InstancedMesh>(null);
  const electrons = useRef<THREE.InstancedMesh>(null);
  const N = 36;
  const paths = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: N }, () => {
      const hx = (r() - 0.5) * 1.8, hz = (r() - 0.5) * 1.1;
      const fx = FINGERS.reduce((a, b) => (Math.abs(b - hx) < Math.abs(a - hx) ? b : a), FINGERS[0]);
      const pts = [
        new THREE.Vector3(hx, 0.26, hz),
        new THREE.Vector3(fx, 0.34, hz),
        new THREE.Vector3(fx, 0.34, BUS_Z),
        new THREE.Vector3(1.0, 0.34, BUS_Z),
        new THREE.Vector3(1.9, 0.34, BUS_Z),
        new THREE.Vector3(1.9, -0.5, BUS_Z),
      ];
      const lens = [0];
      for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + pts[k].distanceTo(pts[k - 1]));
      return { pts, lens, total: lens[lens.length - 1] };
    });
  }, []);
  const phase = useRef(Array.from({ length: N }, (_, i) => (i * 0.618034) % 1));
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3() }), []);

  useFrame((_, dtRaw) => {
    const pm = packets.current, em = electrons.current;
    if (!pm || !em) return;
    const dt = safeDt(dtRaw);
    const active = Math.max(1, Math.round(N * Math.sin(e)));
    const dir = new THREE.Vector3(Math.cos(e), Math.sin(e), 0.2).normalize();
    for (let i = 0; i < N; i++) {
      phase.current[i] = (phase.current[i] + dt * 0.28) % 1;
      const t = phase.current[i];
      const p = paths[i];
      const on = i < active;
      // Light packet: falls along the sun direction and hits the cell.
      if (on && t < 0.3) {
        tmp.o.position.copy(p.pts[0]).addScaledVector(dir, (1 - t / 0.3) * 2.4);
        tmp.o.scale.setScalar(1);
      } else tmp.o.scale.setScalar(0);
      tmp.o.updateMatrix();
      pm.setMatrixAt(i, tmp.o.matrix);
      // Electron: from the hit point to the metal line, then out along the wire.
      if (on && t >= 0.3) {
        const d = ((t - 0.3) / 0.7) * p.total;
        let k = 1;
        while (k < p.lens.length - 1 && p.lens[k] < d) k++;
        const seg = p.lens[k] - p.lens[k - 1] || 1;
        tmp.v.copy(p.pts[k - 1]).lerp(p.pts[k], Math.min(1, (d - p.lens[k - 1]) / seg));
        tmp.o.position.copy(tmp.v);
        tmp.o.scale.setScalar(1);
      } else tmp.o.scale.setScalar(0);
      tmp.o.updateMatrix();
      em.setMatrixAt(i, tmp.o.matrix);
    }
    pm.instanceMatrix.needsUpdate = true;
    em.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <Ground size={12} color="#dcdfd9" y={-0.6} />
      <mesh position={[0, 0.26, 0]} receiveShadow>
        <boxGeometry args={[2, 0.08, 1.4]} />
        <Matte color="#4b6a96" />
      </mesh>
      <mesh position={[0, 0.13, 0]} receiveShadow castShadow>
        <boxGeometry args={[2, 0.18, 1.4]} />
        <Matte color="#33445e" />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[2, 0.04, 1.4]} />
        <Matte color="#a8adb2" />
      </mesh>
      {FINGERS.map((x) => (
        <mesh key={x} position={[x, 0.315, 0]} castShadow>
          <boxGeometry args={[0.035, 0.03, 1.4]} />
          <Matte color="#d5d8db" />
        </mesh>
      ))}
      <mesh position={[0, 0.32, BUS_Z]}>
        <boxGeometry args={[2, 0.035, 0.09]} />
        <Matte color="#d5d8db" />
      </mesh>
      <mesh position={[1.45, 0.34, BUS_Z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
        <Matte color="#2b2f33" />
      </mesh>
      <mesh position={[1.9, -0.08, BUS_Z]}>
        <cylinderGeometry args={[0.025, 0.025, 0.84, 8]} />
        <Matte color="#2b2f33" />
      </mesh>
      <instancedMesh ref={packets} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshBasicMaterial color={LIGHT} />
      </instancedMesh>
      <instancedMesh ref={electrons} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshBasicMaterial color="#f4f7fb" />
      </instancedMesh>
      <Label position={[-0.6, 1.3, -0.3]} muted>Sunlight</Label>
      <Label position={[-1.35, 0.27, -0.4]}>Top layer</Label>
      <Label position={[-1.4, 0.1, -0.4]}>Bottom layer</Label>
      <Label position={[0.3, 0.52, -0.75]}>Metal lines collect the electricity</Label>
      <Label position={[2.15, 0.45, BUS_Z]}>To the wire</Label>
    </group>
  );
}

function SolarScene({ level, e, ground }: { level: number; e: number; ground: string }) {
  const sun: Vec3 = [Math.cos(e) * 30, Math.sin(e) * 30, 8];
  return (
    <>
      <InsideLights sun={sun} size={level === 1 ? 26 : 4} />
      {level === 1 && <Field e={e} ground={ground} />}
      {level === 2 && <OnePanel e={e} />}
      {level === 3 && <OneCell e={e} />}
    </>
  );
}

const CAMERA: Record<number, { pos: Vec3; target: Vec3; min: number; max: number }> = {
  1: { pos: [6, 15, 28], target: [0, 1, -1], min: 8, max: 60 },
  2: { pos: [2.8, 2.4, 3.6], target: [0, 1, 0], min: 1.5, max: 10 },
  3: { pos: [2.2, 2.1, 3.3], target: [0.25, 0.2, 0], min: 1, max: 7 },
};

const LEVEL_COPY: Record<number, string> = {
  1: 'A solar farm is rows of panels. Many turn slowly through the day to face the sun.',
  2: 'Each panel is many small cells wired together under glass.',
  3: 'Light knocks electrons loose inside the cell. The two layers push them toward the metal lines and out along the wire.',
};

export default function SolarInside() {
  const level = useLevel(3);
  const [elev, setElev] = useState(55);
  const place = PLACES[useApp((s) => s.input.place)];
  const e = Math.max(MIN_ELEV, Math.min(90, elev)) * DEG;
  const share = Math.sin(e);
  const tilt = fv('earthTiltDeg');
  const lat = place.body === 'earth' && place.lat != null ? Math.abs(place.lat) : null;
  const summerNoon = lat != null ? Math.min(90, 90 - lat + tilt) : null;
  const winterNoon = lat != null ? Math.max(MIN_ELEV, 90 - lat - tilt) : null;
  const cam = CAMERA[level];
  const cfRatio = fv('nuclearCFUS') > 0 ? fv('solarCFUS') / fv('nuclearCFUS') : 0;

  const panel = (
    <>
      <section>
        <LevelNav levels={LEVELS} />
        <p>{LEVEL_COPY[level]}</p>
        {level === 3 && <RealTerm>the photovoltaic effect</RealTerm>}
      </section>

      <section>
        <h3>Sun angle</h3>
        <div className="il-between"><span className="muted">Low sun</span><span className="num">{Math.round(elev)}° above the horizon</span><span className="muted">Overhead</span></div>
        <Slider label="Sun angle above the horizon" value={elev} min={MIN_ELEV} max={90} step={1} onChange={setElev} />
        {summerNoon != null && winterNoon != null && (
          <div className="il-row">
            <Button onClick={() => setElev(Math.round(winterNoon))} active={Math.round(elev) === Math.round(winterNoon)}>Winter noon in {place.short}</Button>
            <Button onClick={() => setElev(Math.round(summerNoon))} active={Math.round(elev) === Math.round(summerNoon)}>Summer noon</Button>
            <Cite k="earthTiltDeg" />
          </div>
        )}
        <div className="il-box">
          <span className="muted">Light on each square metre</span>
          <span className="il-big">{Math.round(share * 100)}% <small>of what an overhead sun gives</small></span>
          <div className="il-bar"><div style={{ width: `${share * 100}%`, background: SOURCE_COLORS.solar }} /></div>
        </div>
        <p>When the sun is low, the same beam of light spreads over more ground. Each panel catches less of it.</p>
        <p>That is why winter is weak for solar. The sun stays low, the days are short, and clouds are more common.</p>
        <RealTerm>irradiance, which falls with the sine of the sun's angle</RealTerm>
      </section>

      <section>
        <h3>A gigawatt is not a gigawatt</h3>
        <p>
          In 2025 the world added <Fact k="solarAdded2025GW" unit /> of solar. That is more than all <Fact k="reactorsWorldCount" /> nuclear
          reactors in the world combined (about <Fact k="reactorsWorldGW" unit />).
        </p>
        <p>But a gigawatt of solar makes about a quarter of the energy of a gigawatt of nuclear.</p>
        <div className="il-box">
          <span className="muted xsmall">Energy from one gigawatt over a year</span>
          <div className="il-between"><span>Solar</span><Fact k="solarCFUS" percent /></div>
          <div className="il-bar"><div style={{ width: `${cfRatio * 100}%`, background: SOURCE_COLORS.solar }} /></div>
          <div className="il-between"><span>Nuclear</span><Fact k="nuclearCFUS" percent digits={0} /></div>
          <div className="il-bar"><div style={{ width: '100%', background: SOURCE_COLORS.fission }} /></div>
        </div>
        <RealTerm>capacity factor: how much of its maximum a plant makes over a year</RealTerm>
      </section>
    </>
  );

  return (
    <InsideLayout
      ariaLabel="Solar farm cutaway"
      customLights
      scene={<SolarScene level={level} e={e} ground={place.ground} />}
      cameraPos={cam.pos}
      target={cam.target}
      minDistance={cam.min}
      maxDistance={cam.max}
      panel={panel}
      steps={['Sunlight hits the panel.', 'The panel turns light straight into electricity.', 'No moving parts, no fuel.']}
      good={<>Cheapest new power in most places: <Fact k="lcoeSolarLow" format={usd} /> to <Fact k="lcoeSolarHigh" format={usd} /> per MWh in the US.</>}
      hard={<>Nothing at night, much less in clouds and winter. US solar plants make about <Fact k="solarCFUS" percent /> of their maximum over a year.</>}
      costs={<>Costs fell about <Fact k="solarCostDeclinePerYear" percent digits={0} /> per year in one long study. Installed costs fell <Fact k="solarInstalledCostFallSince2010" percent digits={0} /> since 2010.</>}
    />
  );
}
