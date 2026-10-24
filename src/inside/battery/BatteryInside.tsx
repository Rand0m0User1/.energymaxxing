// Battery yard inside view (SPEC §8.2): yard → container → one cell. Charge / Discharge and a chemistry picker.
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { fv, type FactKey } from '../../data/facts';
import { SOURCE_COLORS } from '../../data/colors';
import { Fact, fmtNumber } from '../../ui/Fact';
import { Button, RealTerm, Segmented, Slider } from '../../ui/kit';
import InsideLayout, { LevelNav, useLevel } from '../InsideLayout';
import { Ground, Label, Matte, rng, safeDt, setInstances, usd, type Vec3 } from '../three';

const LEVELS = ['Yard', 'Container', 'One cell'];
type Mode = 'charge' | 'discharge';
type Chem = 'lfp' | 'nmc' | 'sodium' | 'lead';
const ION = SOURCE_COLORS.battery;
const WHITE = '#f1f1ee';

const CHEMS: Record<Chem, { label: string; lo: FactKey; hi: FactKey; cathode: string; anode: string; anodeLabel: string; cathodeLabel: string; ion: string }> = {
  lfp: { label: 'Lithium iron phosphate', lo: 'lfpWhKgLow', hi: 'lfpWhKgHigh', cathode: '#8d9cb0', anode: '#5b5f63', anodeLabel: 'Negative side (graphite)', cathodeLabel: 'Positive side (iron phosphate)', ion: 'Lithium ions' },
  nmc: { label: 'NMC lithium', lo: 'nmcWhKgLow', hi: 'nmcWhKgHigh', cathode: '#7f8c80', anode: '#5b5f63', anodeLabel: 'Negative side (graphite)', cathodeLabel: 'Positive side (nickel, manganese, cobalt)', ion: 'Lithium ions' },
  sodium: { label: 'Sodium-ion', lo: 'sodiumWhKgLow', hi: 'sodiumWhKgHigh', cathode: '#a8a08a', anode: '#4f5256', anodeLabel: 'Negative side (hard carbon)', cathodeLabel: 'Positive side (sodium compound)', ion: 'Sodium ions' },
  lead: { label: 'Lead-acid', lo: 'leadAcidWhKgLow', hi: 'leadAcidWhKgHigh', cathode: '#7a6f66', anode: '#9aa0a6', anodeLabel: 'Lead plate', cathodeLabel: 'Lead dioxide plate', ion: 'Charged particles in the acid' },
};

const midWhKg = (c: Chem) => (fv(CHEMS[c].lo) + fv(CHEMS[c].hi)) / 2;

// ---------- Level 1: yard ----------
function Yard({ mode }: { mode: Mode }) {
  const boxes = useRef<THREE.InstancedMesh>(null);
  const bars = useRef<THREE.InstancedMesh>(null);
  const fills = useRef<THREE.InstancedMesh>(null);
  const flow = useRef<THREE.InstancedMesh>(null);
  const ROWS = 3, COLS = 5, N = ROWS * COLS;
  const pos = (i: number): [number, number] => [-14 + (i % COLS) * 7, -5 + Math.floor(i / COLS) * 4.4];
  useLayoutEffect(() => {
    setInstances(boxes.current, N, (i, o) => { const [x, z] = pos(i); o.position.set(x, 1.3, z); });
    setInstances(bars.current, N, (i, o) => { const [x, z] = pos(i); o.position.set(x, 1.7, z + 1.23); });
  }, [N]);

  const fill = useRef(0.5);
  const P = 20;
  const rt = fv('batteryRoundTrip');
  const lost = Math.max(0, Math.min(P, Math.round(P * (1 - rt))));
  const lostSet = useMemo(() => new Set(Array.from({ length: lost }, (_, k) => Math.floor((k * P) / Math.max(1, lost)) + 1)), [lost]);
  const phase = useRef(Array.from({ length: P }, (_, i) => i / P));
  const o = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dtRaw) => {
    const dt = safeDt(dtRaw);
    const goal = mode === 'charge' ? 1 : 0;
    fill.current += Math.sign(goal - fill.current) * Math.min(Math.abs(goal - fill.current), dt * 0.12);
    const fm = fills.current;
    if (fm) {
      const w = Math.max(0.001, fill.current);
      for (let i = 0; i < N; i++) {
        const [x, z] = pos(i);
        o.position.set(x - 2 + 2 * w, 1.7, z + 1.25);
        o.rotation.set(0, 0, 0);
        o.scale.set(w, 1, 1);
        o.updateMatrix();
        fm.setMatrixAt(i, o.matrix);
      }
      fm.instanceMatrix.needsUpdate = true;
    }
    const pm = flow.current;
    if (pm) {
      o.rotation.set(0, 0, 0);
      for (let i = 0; i < P; i++) {
        phase.current[i] = (phase.current[i] + dt * 0.25) % 1;
        const t = phase.current[i];
        // Charge: from the grid (far left) into the yard. Discharge: out of the yard.
        const u = mode === 'charge' ? t : 1 - t;
        o.position.set(-30 + u * 26, 0.7, 9);
        // A few particles fade away at the battery end: round-trip loss.
        let s = 1;
        if (lostSet.has(i)) {
          if (mode === 'charge') s = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
          else s = t < 0.3 ? 1 - t / 0.3 : 0;
        }
        o.scale.setScalar(Math.max(0, s));
        o.updateMatrix();
        pm.setMatrixAt(i, o.matrix);
      }
      pm.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <Ground size={90} color="#dcdfd9" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -0.6]} receiveShadow>
        <planeGeometry args={[36, 16]} />
        <Matte color="#cfd2cc" />
      </mesh>
      <instancedMesh ref={boxes} args={[undefined, undefined, N]} castShadow receiveShadow>
        <boxGeometry args={[6.06, 2.6, 2.44]} />
        <Matte color={WHITE} />
      </instancedMesh>
      <instancedMesh ref={bars} args={[undefined, undefined, N]}>
        <boxGeometry args={[4, 0.28, 0.02]} />
        <Matte color="#d7dbd8" />
      </instancedMesh>
      <instancedMesh ref={fills} args={[undefined, undefined, N]} frustumCulled={false}>
        <boxGeometry args={[4, 0.28, 0.02]} />
        <Matte color={ION} />
      </instancedMesh>
      <mesh position={[-17, 0.7, 9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 26, 6]} />
        <Matte color="#9aa1a8" />
      </mesh>
      <mesh position={[-3, 0.9, 9]} castShadow>
        <boxGeometry args={[1.6, 1.8, 1.4]} />
        <Matte color="#c9cdd1" />
      </mesh>
      <instancedMesh ref={flow} args={[undefined, undefined, P]} frustumCulled={false}>
        <sphereGeometry args={[0.28, 12, 8]} />
        <Matte color={ION} />
      </instancedMesh>
      <Label position={[0, 3.4, -5]}>Battery containers</Label>
      <Label position={[-14, 2.3, 5.2]} muted>Charge level</Label>
      <Label position={[-20, 1.6, 9]} muted>{mode === 'charge' ? 'Power flowing in' : 'Power flowing out'}</Label>
    </group>
  );
}

// ---------- Level 2: open container ----------
function Container() {
  const modules = useRef<THREE.InstancedMesh>(null);
  const leds = useRef<THREE.InstancedMesh>(null);
  const fan = useRef<THREE.Group>(null);
  const RACKS = 6, PER = 9, N = RACKS * PER;
  useLayoutEffect(() => {
    setInstances(modules.current, N, (i, o) => {
      const r = Math.floor(i / PER), j = i % PER;
      o.position.set(-2.3 + r * 0.62, 0.3 + j * 0.23, -0.72);
    });
    setInstances(leds.current, N, (i, o) => {
      const r = Math.floor(i / PER), j = i % PER;
      o.position.set(-2.3 + r * 0.62 + 0.17, 0.3 + j * 0.23, -0.35);
    });
  }, [N]);
  useFrame((_, dt) => { if (fan.current) fan.current.rotation.z += safeDt(dt) * 4; });

  return (
    <group>
      <Ground size={30} color="#dcdfd9" />
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[6.06, 0.12, 2.44]} />
        <Matte color="#cfd2cc" />
      </mesh>
      <mesh position={[0, 1.3, -1.19]} receiveShadow castShadow>
        <boxGeometry args={[6.06, 2.6, 0.06]} />
        <Matte color={WHITE} />
      </mesh>
      {[-3, 3].map((x) => (
        <mesh key={x} position={[x, 1.3, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.06, 2.6, 2.44]} />
          <Matte color={WHITE} />
        </mesh>
      ))}
      {Array.from({ length: RACKS + 1 }, (_, k) => (
        <mesh key={k} position={[-2.61 + k * 0.62, 1.15, -0.36]} castShadow>
          <boxGeometry args={[0.04, 2.1, 0.04]} />
          <Matte color="#5b636b" />
        </mesh>
      ))}
      <instancedMesh ref={modules} args={[undefined, undefined, N]} castShadow receiveShadow>
        <boxGeometry args={[0.54, 0.19, 0.72]} />
        <Matte color="#e3e6e8" />
      </instancedMesh>
      <instancedMesh ref={leds} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.05, 0.04, 0.01]} />
        <Matte color={ION} />
      </instancedMesh>
      {/* Cooling unit */}
      <mesh position={[2.35, 1.2, -0.35]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 2.2, 1.5]} />
        <Matte color="#cfd6dc" />
      </mesh>
      <mesh position={[2.35, 1.5, 0.41]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.02, 24]} />
        <Matte color="#5b636b" />
      </mesh>
      <group ref={fan} position={[2.35, 1.5, 0.43]}>
        <mesh><boxGeometry args={[0.62, 0.07, 0.01]} /><Matte color="#c9cdd1" /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.62, 0.07, 0.01]} /><Matte color="#c9cdd1" /></mesh>
      </group>
      {/* Fire safety system */}
      <mesh position={[-2.88, 1.9, 0.3]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.4]} />
        <Matte color="#b8483a" />
      </mesh>
      <mesh position={[-0.3, 2.45, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 5.2, 8]} />
        <Matte color="#b8483a" />
      </mesh>
      <Label position={[-0.8, 2.75, -0.6]}>Racks of battery modules</Label>
      <Label position={[-1.1, 0.25, 0.4]} muted>Each module holds many cells</Label>
      <Label position={[2.35, 2.55, 0.2]}>Cooling unit</Label>
      <Label position={[-2.6, 1.45, 0.7]}>Fire safety system</Label>
    </group>
  );
}

// ---------- Level 3: one cell ----------
function Cell({ mode, chem }: { mode: Mode; chem: Chem }) {
  const c = CHEMS[chem];
  const s = Math.sqrt(midWhKg('nmc') / Math.max(1, midWhKg(chem)));
  const ions = useRef<THREE.InstancedMesh>(null);
  const electrons = useRef<THREE.InstancedMesh>(null);
  const N = 40, E = 10;
  const seeds = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: N }, () => ({
      y: (r() - 0.5) * 0.85, z: (r() - 0.5) * 0.65,
      a: -0.62 - r() * 0.25, c: 0.62 + r() * 0.25, delay: r() * 1.2, w: r() * 6,
    }));
  }, []);
  const xs = useRef(seeds.map((p) => (Math.random() < 0.5 ? p.a : p.c)));
  const since = useRef(0);
  useEffect(() => { since.current = 0; }, [mode]);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-1.05, 0.5 * s, 0), new THREE.Vector3(0, 0.5 * s + 1.0, 0), new THREE.Vector3(1.05, 0.5 * s, 0),
  ), [s]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.02, 6, false), [curve]);
  useEffect(() => () => tube.dispose(), [tube]);
  const ePhase = useRef(Array.from({ length: E }, (_, i) => i / E));
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3(), t: 0 }), []);

  useFrame((_, dtRaw) => {
    const dt = safeDt(dtRaw);
    since.current += dt;
    tmp.t += dt;
    const im = ions.current, em = electrons.current;
    if (im) {
      for (let i = 0; i < N; i++) {
        const p = seeds[i];
        const goal = mode === 'charge' ? p.a : p.c;
        if (since.current > p.delay) {
          const d = goal - xs.current[i];
          xs.current[i] += Math.sign(d) * Math.min(Math.abs(d), dt * 0.9);
        }
        tmp.o.position.set(xs.current[i], (p.y + Math.sin(tmp.t * 2 + p.w) * 0.015) * s, p.z * s);
        tmp.o.scale.setScalar(1);
        tmp.o.updateMatrix();
        im.setMatrixAt(i, tmp.o.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    }
    if (em) {
      for (let i = 0; i < E; i++) {
        ePhase.current[i] = (ePhase.current[i] + dt * 0.35) % 1;
        // Charging: electrons pushed from the positive side to the negative side. Discharging: the reverse.
        const u = mode === 'charge' ? 1 - ePhase.current[i] : ePhase.current[i];
        curve.getPoint(u, tmp.v);
        tmp.o.position.copy(tmp.v);
        tmp.o.updateMatrix();
        em.setMatrixAt(i, tmp.o.matrix);
      }
      em.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <Ground size={14} color="#dcdfd9" y={-0.5 * s - 0.25} />
      <group scale={[1, s, s]}>
        <mesh position={[-1.05, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 1, 0.8]} />
          <Matte color={c.anode} />
        </mesh>
        <mesh position={[1.05, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 1, 0.8]} />
          <Matte color={c.cathode} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.02, 1, 0.8]} />
          <Matte color="#f4f4f2" opacity={0.6} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.8, 1, 0.8]} />
          <Matte color="#cfe0ea" opacity={0.16} />
        </mesh>
      </group>
      <mesh geometry={tube}>
        <Matte color="#2b2f33" />
      </mesh>
      <instancedMesh ref={ions} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[0.04, 12, 8]} />
        <Matte color={ION} />
      </instancedMesh>
      <instancedMesh ref={electrons} args={[undefined, undefined, E]} frustumCulled={false}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshBasicMaterial color="#e9eef5" />
      </instancedMesh>
      <Label position={[-1.05, -0.5 * s - 0.12, 0.45 * s]}>{c.anodeLabel}</Label>
      <Label position={[1.05, -0.5 * s - 0.12, 0.45 * s]}>{c.cathodeLabel}</Label>
      <Label position={[0, -0.5 * s - 0.12, -0.4 * s]} muted>Separator: lets ions through, blocks electrons</Label>
      <Label position={[0, 0.5 * s + 1.0, 0]} muted>{mode === 'discharge' ? 'Electrons run through the wire and power the city' : 'The grid pushes electrons back'}</Label>
      <Label position={[mode === 'charge' ? -0.55 : 0.55, 0.5 * s + 0.14, 0.2]}>{c.ion}</Label>
    </group>
  );
}

const CAMERA: Record<number, { pos: Vec3; target: Vec3; min: number; max: number }> = {
  1: { pos: [8, 17, 32], target: [-4, 0, 1], min: 10, max: 70 },
  2: { pos: [2.2, 3.0, 6.6], target: [0, 1.1, 0], min: 2.5, max: 14 },
  3: { pos: [0.6, 1.3, 4.8], target: [0, 0.25, 0], min: 1.8, max: 10 },
};

const LEVEL_COPY: Record<number, string> = {
  1: 'A battery yard is rows of shipping containers full of batteries. The green bar on each one shows how full it is.',
  2: 'Inside a container: racks of battery modules, a cooling unit to keep them at a safe temperature, and a fire safety system.',
  3: 'Inside one cell, charged atoms (ions) move from one side to the other and back. That movement stores and releases energy.',
};

export default function BatteryInside() {
  const level = useLevel(3);
  const [mode, setMode] = useState<Mode>('charge');
  const [chem, setChem] = useState<Chem>('lfp');
  const [gw, setGw] = useState(1);
  const [gwh, setGwh] = useState(4);
  const cellScale = Math.sqrt(midWhKg('nmc') / Math.max(1, midWhKg(chem)));
  const base = CAMERA[level];
  const cam = level === 3
    ? { ...base, pos: [base.pos[0], base.pos[1] + 0.5 * (cellScale - 1), base.pos[2] + 2.4 * (cellScale - 1)] as Vec3, target: [0, 0.25 + 0.2 * (cellScale - 1), 0] as Vec3 }
    : base;
  const c = CHEMS[chem];
  const kgLow = 1000 / Math.max(1, fv(c.hi));
  const kgHigh = 1000 / Math.max(1, fv(c.lo));
  const sizeVsNmc = midWhKg('nmc') / Math.max(1, midWhKg(chem));
  const rt = fv('batteryRoundTrip');
  const dots = 20;
  const lostDots = Math.max(0, Math.min(dots, Math.round(dots * (1 - rt))));
  const containerMWh = fv('containerMWh');
  const containers = containerMWh > 0 ? Math.round((fv('abuDhabiBatteryGWh') * 1000) / containerMWh / 100) * 100 : 0;
  const hours = gw > 0 ? gwh / gw : 0;

  const panel = (
    <>
      <section>
        <LevelNav levels={LEVELS} />
        <p>{LEVEL_COPY[level]}</p>
      </section>

      <section>
        <h3>Charge or discharge</h3>
        <Segmented<Mode> label="Charge or discharge" value={mode} onChange={setMode}
          options={[{ value: 'charge', label: 'Charge' }, { value: 'discharge', label: 'Discharge' }]} />
        <p>{mode === 'charge'
          ? 'Charging pushes ions to the negative side, where they wait.'
          : 'Discharging lets the ions flow back. On the way, electrons run through the wire and power the city.'}</p>
        {level === 3 && <RealTerm>anode (negative side) and cathode (positive side)</RealTerm>}
        {level !== 3 && <p className="muted xsmall">Go to "One cell" to watch the ions move.</p>}
      </section>

      <section>
        <h3>Battery chemistry</h3>
        <div className="il-grid2">
          {(Object.keys(CHEMS) as Chem[]).map((k) => (
            <Button key={k} active={k === chem} onClick={() => setChem(k)}>{CHEMS[k].label}</Button>
          ))}
        </div>
        <p>Energy per kilogram: <Fact k={c.lo} /> to <Fact k={c.hi} unit /></p>
        <p>To store one kWh you need about <span className="num">{fmtNumber(kgLow, 1)}</span> to <span className="num">{fmtNumber(kgHigh, 1)}</span> kg of cells.
          {chem !== 'nmc' && <> That is about <span className="num">{fmtNumber(sizeVsNmc, 1)}</span> times the weight of NMC cells for the same energy.</>}</p>
        <p className="muted xsmall">{level === 3 ? 'The cell drawn above grows or shrinks to hold the same energy.' : 'Go to "One cell" to see the size change.'}</p>
      </section>

      <section>
        <h3>Two numbers describe a battery</h3>
        <div className="il-between"><span>Power (GW, how fast)</span><span className="num">{fmtNumber(gw, 2)} GW</span></div>
        <Slider label="Battery power in GW" value={gw} min={0.25} max={4} step={0.25} onChange={setGw} />
        <div className="il-between"><span>Energy (GWh, how much)</span><span className="num">{fmtNumber(gwh, 1)} GWh</span></div>
        <Slider label="Battery energy in GWh" value={gwh} min={0.5} max={16} step={0.5} onChange={setGwh} />
        <p>Power is how fast it can push energy out. Energy is how much it holds.</p>
        <p>This battery can run <span className="num">{fmtNumber(gw, 2)} GW</span> for <span className="num">{fmtNumber(hours, 1)}</span> hours.</p>
      </section>

      <section>
        <h3>Some energy is lost</h3>
        <p>100 in, about <Fact k="batteryRoundTrip" format={(v) => String(Math.round(v * 100))} /> out. The rest turns into heat.</p>
        <div className="il-dots" aria-hidden>
          {Array.from({ length: dots }, (_, i) => <span key={i} className={i >= dots - lostDots ? 'lost' : ''} />)}
        </div>
        <RealTerm>round-trip efficiency</RealTerm>
      </section>

      <section>
        <h3>How many containers?</h3>
        <p>The Abu Dhabi project stores <Fact k="abuDhabiBatteryGWh" unit />. At <Fact k="containerMWh" unit /> per container, that is about <span className="num">{containers.toLocaleString('en-US')}</span> containers.</p>
        <p className="muted">Batteries cover hours, not weeks.</p>
      </section>
    </>
  );

  return (
    <InsideLayout
      ariaLabel="Battery yard cutaway"
      scene={level === 1 ? <Yard mode={mode} /> : level === 2 ? <Container /> : <Cell mode={mode} chem={chem} />}
      cameraPos={cam.pos}
      target={cam.target}
      minDistance={cam.min}
      maxDistance={cam.max}
      lightSize={level === 1 ? 30 : 8}
      panel={panel}
      steps={[
        'Extra power pushes ions to one side of each cell.',
        'They wait there, holding the energy.',
        'When the city needs power, they flow back and electricity comes out.',
      ]}
      good={<>Stationary battery packs fell <Fact k="batteryPackFall2025" percent digits={0} /> in 2025, to <Fact k="batteryPackPrice2025" format={usd} /> per kWh.</>}
      hard={<>Batteries cover hours, not weeks. US storage costs per MWh rose about <Fact k="storageCostRiseSince2020" percent digits={0} /> since 2020.</>}
      costs={<>A whole installed system costs far more than the pack. For a large grid system, PNNL put it at <Fact k="batterySystemPNNL2021" format={usd} /> per kWh (2021 data).</>}
    />
  );
}
