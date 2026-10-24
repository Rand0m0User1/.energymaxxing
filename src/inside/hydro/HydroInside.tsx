// Hydro and geothermal inside view (SPEC §8.7): a dam whose lake drains when the gate opens, and a geothermal loop.
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useApp } from '../../store';
import { PLACES } from '../../data/places';
import { SOURCE_COLORS } from '../../data/colors';
import { AssumptionTag, Fact, fmtNumber } from '../../ui/Fact';
import { Button, RealTerm, Slider } from '../../ui/kit';
import InsideLayout from '../InsideLayout';
import { Label, Matte, safeDt, usd, type Vec3 } from '../three';

interface DamState { level: number }

const INFLOW = 0.008;   // share of the lake refilled per second by rivers (visual only)
const DRAIN = 0.05;     // share drained per second with the gate fully open (visual only)
const LAKE_X = -13.5, LAKE_W = 13, LAKE_D = 10, LAKE_MAX_H = 4.6;
const COOL = new THREE.Color('#6f8fa8');
const HOT = new THREE.Color(SOURCE_COLORS.geothermal);

/** Power as a share of maximum: more gate, more power; a lower lake gives less push. */
function hydroShare(gate: number, level: number): number {
  if (level <= 0.01) return 0;
  return gate * (0.35 + 0.65 * level);
}

function polyPoint(pts: THREE.Vector3[], lens: number[], d: number, out: THREE.Vector3) {
  let k = 1;
  while (k < lens.length - 1 && lens[k] < d) k++;
  const seg = lens[k] - lens[k - 1] || 1;
  return out.copy(pts[k - 1]).lerp(pts[k], Math.min(1, Math.max(0, (d - lens[k - 1]) / seg)));
}

function makePath(points: Vec3[]) {
  const pts = points.map((p) => new THREE.Vector3(...p));
  const lens = [0];
  for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + pts[k].distanceTo(pts[k - 1]));
  return { pts, lens, total: lens[lens.length - 1] };
}

function Dam({ gate, dam }: { gate: number; dam: MutableRefObject<DamState> }) {
  const water = useRef<THREE.Mesh>(null);
  const gateMesh = useRef<THREE.Mesh>(null);
  const turbine = useRef<THREE.Group>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const N = 40;
  const path = useMemo(() => makePath([[-7.2, 0.7, 0], [-3, 0.7, 0], [-3, 0.35, 0], [2, 0.08, 0]]), []);
  const phase = useRef(Array.from({ length: N }, (_, i) => (i * 0.618034) % 1));
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3() }), []);

  useFrame((_, dtRaw) => {
    const dt = safeDt(dtRaw);
    const d = dam.current;
    const out = d.level > 0.01 ? gate * DRAIN : 0;
    d.level = Math.min(1, Math.max(0, d.level + (INFLOW - out) * dt));
    const h = 0.15 + d.level * LAKE_MAX_H;
    if (water.current) { water.current.scale.y = h; water.current.position.y = h / 2; }
    if (gateMesh.current) gateMesh.current.position.y = 0.75 + gate * 0.9;
    const share = hydroShare(gate, d.level);
    if (turbine.current) turbine.current.rotation.y += dt * 8 * share;
    const m = drops.current;
    if (m) {
      const active = Math.round(N * Math.min(1, share * 1.3));
      for (let i = 0; i < N; i++) {
        phase.current[i] = (phase.current[i] + dt * 0.45) % 1;
        polyPoint(path.pts, path.lens, phase.current[i] * path.total, tmp.v);
        tmp.o.position.set(tmp.v.x, tmp.v.y + ((i % 3) - 1) * 0.08, tmp.v.z + ((i % 5) - 2) * 0.08);
        tmp.o.scale.setScalar(i < active ? 1 : 0);
        tmp.o.updateMatrix();
        m.setMatrixAt(i, tmp.o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Valley plinth */}
      <mesh position={[-10, -0.3, 0]} receiveShadow>
        <boxGeometry args={[24, 0.6, 16]} />
        <Matte color="#c9cfbf" />
      </mesh>
      {/* Far valley wall (near wall cut away) */}
      <mesh position={[LAKE_X, 2.8, -LAKE_D / 2 - 0.6]} castShadow receiveShadow>
        <boxGeometry args={[LAKE_W + 1, 5.6, 1.2]} />
        <Matte color="#b9b3a2" />
      </mesh>
      <mesh position={[-20.6, 2.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 5.6, LAKE_D + 2.4]} />
        <Matte color="#b9b3a2" />
      </mesh>
      {/* Reservoir water: a unit-height box scaled to the lake level */}
      <mesh ref={water} position={[LAKE_X, 2, 0]}>
        <boxGeometry args={[LAKE_W, 1, LAKE_D]} />
        <Matte color="#6f9fd6" opacity={0.82} />
      </mesh>
      {/* Dam wall */}
      <mesh position={[-6.3, 2.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 5.4, LAKE_D + 2.4]} />
        <Matte color="#cfcac1" />
      </mesh>
      <mesh ref={gateMesh} position={[-7.06, 0.75, 0]} castShadow>
        <boxGeometry args={[0.14, 1.1, 1.2]} />
        <Matte color="#5b636b" />
      </mesh>
      {/* Pipe through the dam to the turbine house */}
      <mesh position={[-4.6, 0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.28, 3.2, 14]} />
        <Matte color="#7f8a93" />
      </mesh>
      {/* Turbine house (see-through) with a spinning turbine */}
      <mesh position={[-3, 1.0, 0]}>
        <boxGeometry args={[1.9, 2.0, 2.4]} />
        <Matte color="#e2dfd8" opacity={0.3} />
      </mesh>
      <group ref={turbine} position={[-3, 0.55, 0]}>
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.3, 12]} />
          <Matte color="#5b636b" />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <mesh key={k} rotation={[0, (k * Math.PI) / 3, 0]} position={[Math.cos((k * Math.PI) / 3) * 0.38, 0, -Math.sin((k * Math.PI) / 3) * 0.38]}>
            <boxGeometry args={[0.42, 0.24, 0.05]} />
            <Matte color={SOURCE_COLORS.hydro} />
          </mesh>
        ))}
      </group>
      <mesh position={[-3, 1.45, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
        <Matte color="#5b636b" />
      </mesh>
      <mesh position={[-3, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.6, 18]} />
        <Matte color="#7f8a93" />
      </mesh>
      {/* River below the dam */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.2, 0.02, 0]}>
        <planeGeometry args={[6.4, 2.4]} />
        <Matte color="#8fb4dd" opacity={0.8} />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <Matte color={SOURCE_COLORS.hydro} />
      </instancedMesh>
      <Label position={[LAKE_X, 5.4, 1]}>Reservoir</Label>
      <Label position={[-6.3, 5.8, 0]}>Dam</Label>
      <Label position={[-7.4, 1.9, 1.2]} muted>Gate</Label>
      <Label position={[-3, 2.8, 0.9]}>Turbine and generator</Label>
      <Label position={[0.5, 0.4, 1.1]} muted>River</Label>
    </group>
  );
}

function Geothermal() {
  const drops = useRef<THREE.InstancedMesh>(null);
  const N = 28;
  const Z = 3.08;
  const path = useMemo(() => makePath([
    [7, 0.9, Z], [7, -5.3, Z], [11, -5.3, Z], [11, 0.9, Z], [9.9, 1.6, Z], [8.1, 1.6, Z], [7, 0.9, Z],
  ]), []);
  const phase = useRef(Array.from({ length: N }, (_, i) => (i * 0.618034) % 1));
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3(), c: new THREE.Color() }), []);
  useLayoutEffect(() => {
    const m = drops.current;
    if (!m) return;
    for (let i = 0; i < N; i++) m.setColorAt(i, COOL);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  useFrame((_, dtRaw) => {
    const dt = safeDt(dtRaw);
    const m = drops.current;
    if (!m) return;
    const hotStart = path.lens[2] - 1.5; // heats up in the hot rock at the bottom
    const coolStart = path.lens[4];      // gives its heat away in the heat exchanger
    for (let i = 0; i < N; i++) {
      phase.current[i] = (phase.current[i] + dt * 0.07) % 1;
      const d = phase.current[i] * path.total;
      polyPoint(path.pts, path.lens, d, tmp.v);
      tmp.o.position.copy(tmp.v);
      tmp.o.updateMatrix();
      m.setMatrixAt(i, tmp.o.matrix);
      let k = 0;
      if (d > hotStart && d < coolStart) k = Math.min(1, (d - hotStart) / 3);
      else if (d >= coolStart) k = Math.max(0, 1 - (d - coolStart) / 2);
      tmp.c.copy(COOL).lerp(HOT, k);
      m.setColorAt(i, tmp.c);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Ground cut open: soil, rock, hot rock */}
      <mesh position={[9, -0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[10, 0.6, 6]} />
        <Matte color="#b9a88a" />
      </mesh>
      <mesh position={[9, -2.3, 0]} receiveShadow>
        <boxGeometry args={[10, 3.4, 6]} />
        <Matte color="#a39a8c" />
      </mesh>
      <mesh position={[9, -5, 0]} receiveShadow>
        <boxGeometry args={[10, 2, 6]} />
        <Matte color="#b8775e" />
      </mesh>
      {/* Wells and the loop */}
      <mesh position={[7, -2.2, Z]}>
        <cylinderGeometry args={[0.1, 0.1, 6.2, 10]} />
        <Matte color="#6f8fa8" />
      </mesh>
      <mesh position={[11, -2.2, Z]}>
        <cylinderGeometry args={[0.1, 0.1, 6.2, 10]} />
        <Matte color={SOURCE_COLORS.geothermal} />
      </mesh>
      <mesh position={[9, -5.3, Z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 4, 10]} />
        <Matte color={SOURCE_COLORS.geothermal} />
      </mesh>
      {/* Surface plant with heat exchanger */}
      <mesh position={[9, 0.8, 1.2]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.6, 2]} />
        <Matte color="#d9d6cf" />
      </mesh>
      <mesh position={[9, 1.6, Z]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 1.8, 18]} />
        <Matte color="#9aa1a8" />
      </mesh>
      <mesh position={[7.55, 1.25, Z]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
        <Matte color="#6f8fa8" />
      </mesh>
      <mesh position={[10.45, 1.25, Z]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
        <Matte color={SOURCE_COLORS.geothermal} />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial roughness={0.9} metalness={0.02} />
      </instancedMesh>
      <Label position={[9, -5, 3.3]}>Hot rock</Label>
      <Label position={[12.4, -2.4, Z]}>Hot water comes up</Label>
      <Label position={[5.6, -2.4, Z]}>Cooled water goes back down</Label>
      <Label position={[9, 2.35, Z]}>Heat exchanger</Label>
    </group>
  );
}

export default function HydroInside() {
  const [gate, setGate] = useState(0.4);
  const dam = useRef<DamState>({ level: 0.85 });
  const [level, setLevel] = useState(0.85);
  const place = PLACES[useApp((s) => s.input.place)];
  useEffect(() => {
    const id = window.setInterval(() => setLevel(dam.current.level), 250);
    return () => window.clearInterval(id);
  }, []);
  const share = hydroShare(gate, level);
  const gw = (v: number) => (v > 0 ? `up to ${fmtNumber(v, 2)} GW` : 'none');

  const panel = (
    <>
      <section>
        <p>These are firm too, but only where geography allows. Many places have little of either.</p>
        <RealTerm>firm, location-limited power</RealTerm>
      </section>
      <section>
        <h3>Hydro dam</h3>
        <p>Water falls through the dam and spins a turbine. Open the gate for more power, but the lake drains. Rain and rivers refill it slowly.</p>
        <div className="il-between"><span className="muted">Closed</span><span className="num">Gate {Math.round(gate * 100)}% open</span><span className="muted">Open</span></div>
        <Slider label="Open the dam gate" value={gate} min={0} max={1} step={0.05} onChange={setGate} />
        <div className="il-box">
          <div className="il-between"><span className="muted">Power now</span><span className="il-big">{Math.round(share * 100)}% <small>of maximum</small></span></div>
          <div className="il-between"><span className="muted">Lake level</span><span className="num">{Math.round(level * 100)}%</span></div>
          <div className="il-bar"><div style={{ width: `${level * 100}%`, background: SOURCE_COLORS.hydro }} /></div>
        </div>
        {level <= 0.02 && <p>The lake is empty. The dam has to wait for rain.</p>}
        <div className="il-row"><Button onClick={() => { dam.current.level = 0.9; setLevel(0.9); }}>Refill the lake (rainy season)</Button></div>
        <p className="muted xsmall">A dam is like a big battery that rain fills for free.</p>
      </section>
      <section>
        <h3>Geothermal well</h3>
        <p>Deep underground the rock is hot. Water goes down one well, heats up, and comes back up the other. Its heat runs a turbine, day and night.</p>
        <RealTerm>an enhanced geothermal system with a heat exchanger</RealTerm>
      </section>
      <section>
        <h3>Here in {place.short}</h3>
        <div className="il-between"><span>Hydro</span><span className="num">{gw(place.hydroMaxGW)}<AssumptionTag /></span></div>
        <div className="il-between"><span>Geothermal</span><span className="num">{gw(place.geothermalMaxGW)}<AssumptionTag /></span></div>
        <p className="muted xsmall">Change the place with the globe button to compare.</p>
      </section>
    </>
  );

  return (
    <InsideLayout
      ariaLabel="Hydro dam and geothermal well cutaway"
      scene={<><Dam gate={gate} dam={dam} /><Geothermal /></>}
      cameraPos={[-3.5, 13, 27]}
      target={[-3.5, -0.5, 0]}
      minDistance={8}
      maxDistance={50}
      lightSize={24}
      panel={panel}
      steps={[
        'Water waits behind a dam, or heat waits in deep rock.',
        'Falling water spins a turbine. Hot water from a well runs a heat engine.',
        'The generator makes electricity whenever it is needed.',
      ]}
      good={<>Firm: runs day and night, and can follow demand.</>}
      hard={<>Only where geography allows. A dry year means less hydro. Good hot rock near the surface is rare.</>}
      costs={<>Hydro: <Fact k="lcoeHydroLow" format={usd} /> to <Fact k="lcoeHydroHigh" format={usd} /> per MWh. Geothermal: <Fact k="lcoeGeothermalLow" format={usd} /> to <Fact k="lcoeGeothermalHigh" format={usd} /> per MWh.</>}
    />
  );
}
