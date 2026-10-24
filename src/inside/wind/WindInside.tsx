// Wind turbine inside view (SPEC §8.5): nacelle cutaway and a wind-speed slider with a power curve.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useApp } from '../../store';
import { PLACES } from '../../data/places';
import { fv } from '../../data/facts';
import { SOURCE_COLORS } from '../../data/colors';
import { Cite, Fact, fmtNumber } from '../../ui/Fact';
import { RealTerm, Slider } from '../../ui/kit';
import InsideLayout from '../InsideLayout';
import { Ground, Label, Matte, rng, safeDt } from '../three';

const VMAX = 30;

interface Curve { cutIn: number; rated: number; cutOut: number; exp: number }

/** Share of maximum power at wind speed v: rises with the cube of v up to the rated cap, zero above cut-out. */
export function windPowerShare(v: number, c: Curve): number {
  if (v < c.cutIn || v >= c.cutOut || c.rated <= 0) return 0;
  if (v >= c.rated) return 1;
  return Math.pow(v / c.rated, c.exp);
}

function useCurve(): Curve {
  return {
    cutIn: fv('windCutInMs'),
    rated: fv('windRatedMs'),
    cutOut: fv('windCutOutMs'),
    exp: fv('windCubeExponent'),
  };
}

function Turbine({ v, curve, ground }: { v: number; curve: Curve; ground: string }) {
  const rotor = useRef<THREE.Group>(null);
  const shaft = useRef<THREE.Group>(null);
  const fast = useRef<THREE.Mesh>(null);
  const streaks = useRef<THREE.InstancedMesh>(null);
  const omega = useRef(0);
  const S = 40;
  const seeds = useMemo(() => {
    const r = rng(3);
    return Array.from({ length: S }, () => ({ x: -18 + r() * 26, y: 8 + r() * 14, z: -8 + r() * 16, k: 0.7 + r() * 0.6 }));
  }, []);
  const o = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dtRaw) => {
    const dt = safeDt(dtRaw);
    const spinning = v >= curve.cutIn && v < curve.cutOut;
    const goal = spinning ? 0.13 * Math.min(v, curve.rated) : 0;
    omega.current += (goal - omega.current) * Math.min(1, dt * 1.5);
    if (rotor.current) rotor.current.rotation.x += omega.current * dt;
    if (shaft.current) shaft.current.rotation.x += omega.current * dt;
    if (fast.current) fast.current.rotation.x += omega.current * dt * 8;
    const m = streaks.current;
    if (m) {
      const active = Math.round((S * Math.min(v, VMAX)) / VMAX);
      for (let i = 0; i < S; i++) {
        const p = seeds[i];
        p.x += dt * Math.max(0.5, v) * 0.9 * p.k;
        if (p.x > 8) p.x = -18;
        o.position.set(p.x, p.y, p.z);
        o.scale.set(i < active ? 1 : 0, 1, 1);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <Ground size={260} color={ground} />
      <mesh position={[0, 7, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.55, 14, 20]} />
        <Matte color="#eceeee" />
      </mesh>
      <group position={[0, 14.6, 0]}>
        {/* Nacelle: solid lower shell, see-through upper shell (cutaway) */}
        <mesh position={[0, -0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.6, 0.5, 1.4]} />
          <Matte color="#e9ebec" />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[3.6, 0.9, 1.4]} />
          <Matte color="#eef1f3" opacity={0.16} />
        </mesh>
        <group ref={shaft} position={[-1.2, 0.1, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 1.2, 12]} />
            <Matte color="#5b636b" />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0.1, 0, 0]}>
            <boxGeometry args={[0.05, 0.36, 0.05]} />
            <Matte color="#8b939a" />
          </mesh>
        </group>
        <mesh position={[-0.25, 0.08, 0]} castShadow>
          <boxGeometry args={[0.8, 0.62, 0.75]} />
          <Matte color="#9aa4ad" />
        </mesh>
        <mesh ref={fast} position={[0.45, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <Matte color="#5b636b" />
        </mesh>
        <mesh position={[1.2, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 1.0, 20]} />
          <Matte color={SOURCE_COLORS.wind} />
        </mesh>
        {/* Rotor */}
        <group ref={rotor} position={[-2.05, 0.1, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.42, 20, 14]} />
            <Matte color="#e9ebec" />
          </mesh>
          <mesh position={[-0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.32, 0.5, 16]} />
            <Matte color="#e9ebec" />
          </mesh>
          {[0, 1, 2].map((k) => (
            <group key={k} rotation={[(k * 2 * Math.PI) / 3, 0, 0]}>
              <mesh position={[0, 3.9, 0]} scale={[0.32, 1, 1]} castShadow>
                <cylinderGeometry args={[0.1, 0.34, 7, 8]} />
                <Matte color="#f1f2f2" />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      <instancedMesh ref={streaks} args={[undefined, undefined, S]} frustumCulled={false}>
        <boxGeometry args={[1.2, 0.025, 0.025]} />
        <Matte color="#ffffff" opacity={0.7} />
      </instancedMesh>
      <Label position={[-2.3, 18.2, 0]}>Blades</Label>
      <Label position={[-0.25, 15.25, 0.6]}>Gearbox: speeds up the slow spin</Label>
      <Label position={[1.3, 14.0, 0.9]}>Generator: turns spin into electricity</Label>
      <Label position={[0.5, 10, 0]} muted>Tower</Label>
    </group>
  );
}

function PowerCurve({ v, curve }: { v: number; curve: Curve }) {
  const W = 300, H = 150, L = 36, R = 10, T = 10, B = 30;
  const x = (s: number) => L + (s / VMAX) * (W - L - R);
  const y = (p: number) => T + (1 - p) * (H - T - B);
  const pts: string[] = [`M${x(0)},${y(0)}`, `L${x(curve.cutIn)},${y(0)}`];
  for (let s = curve.cutIn; s <= curve.rated; s += 0.2) pts.push(`L${x(s)},${y(windPowerShare(s, curve))}`);
  pts.push(`L${x(curve.rated)},${y(1)}`, `L${x(curve.cutOut)},${y(1)}`, `L${x(curve.cutOut)},${y(0)}`, `L${x(VMAX)},${y(0)}`);
  const p = windPowerShare(v, curve);
  const ticks = [curve.cutIn, curve.rated, curve.cutOut];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Power curve. At ${fmtNumber(v, 1)} metres per second the turbine makes ${Math.round(p * 100)} percent of its maximum.`}>
      <line x1={L} y1={y(0)} x2={W - R} y2={y(0)} stroke="var(--line-strong)" />
      <line x1={L} y1={y(0)} x2={L} y2={T} stroke="var(--line-strong)" />
      <line x1={L} y1={y(1)} x2={W - R} y2={y(1)} stroke="var(--line)" strokeDasharray="3 3" />
      <text x={L - 4} y={y(1) + 3} fontSize="10" textAnchor="end" fill="var(--ink-2)">100%</text>
      <text x={L - 4} y={y(0) + 3} fontSize="10" textAnchor="end" fill="var(--ink-2)">0</text>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={y(0)} x2={x(t)} y2={y(0) + 4} stroke="var(--ink-3)" />
          <text x={x(t)} y={y(0) + 14} fontSize="10" textAnchor="middle" fill="var(--ink-2)">{fmtNumber(t, 0)}</text>
        </g>
      ))}
      <text x={(L + W - R) / 2} y={H - 3} fontSize="10" textAnchor="middle" fill="var(--ink-3)">Wind speed (m/s)</text>
      <path d={pts.join(' ')} fill="none" stroke={SOURCE_COLORS.wind} strokeWidth={2} strokeLinejoin="round" />
      <line x1={x(Math.min(v, VMAX))} y1={T} x2={x(Math.min(v, VMAX))} y2={y(0)} stroke="var(--ink-3)" strokeDasharray="2 3" />
      <circle cx={x(Math.min(v, VMAX))} cy={y(p)} r={5} fill={SOURCE_COLORS.wind} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}

export default function WindInside() {
  const [v, setV] = useState(8);
  const curve = useCurve();
  const ground = PLACES[useApp((s) => s.input.place)].ground;
  const share = windPowerShare(v, curve);
  const factor = Math.pow(2, curve.exp);

  let state: string;
  if (v < curve.cutIn) state = 'Too little wind. The blades barely turn and make no power.';
  else if (v < curve.rated) state = 'Power climbs fast as the wind picks up.';
  else if (v < curve.cutOut) state = 'Full power. The blades turn their edges to the wind so the turbine stays at its cap.';
  else state = 'Too much wind. The turbine stops and locks its blades to protect itself.';

  const panel = (
    <>
      <section>
        <p>A wind turbine is a fan run backwards. The wind turns the blades, and a generator turns that spin into electricity.</p>
      </section>
      <section>
        <h3>Wind speed</h3>
        <div className="il-between"><span className="muted">Calm</span><span className="num">{fmtNumber(v, 1)} m/s</span><span className="muted">Storm</span></div>
        <Slider label="Wind speed in metres per second" value={v} min={0} max={VMAX} step={0.5} onChange={setV} />
        <div className="il-box">
          <span className="muted">Power right now</span>
          <span className="il-big">{Math.round(share * 100)}% <small>of the turbine's maximum</small></span>
        </div>
        <PowerCurve v={v} curve={curve} />
        <p>{state}</p>
      </section>
      <section>
        <h3>Why it climbs so fast</h3>
        <p>Power grows with the cube of wind speed. Twice the wind gives <span className="num">{fmtNumber(factor, 0)}</span> times the power.<Cite k="windCubeExponent" /></p>
        <p>A typical turbine starts at <Fact k="windCutInMs" unit />, reaches full power at <Fact k="windRatedMs" unit />, and shuts down at <Fact k="windCutOutMs" unit />.</p>
        <RealTerm>the power curve, with cut-in, rated and cut-out speeds</RealTerm>
      </section>
    </>
  );

  return (
    <InsideLayout
      ariaLabel="Wind turbine nacelle cutaway"
      scene={<Turbine v={v} curve={curve} ground={ground} />}
      cameraPos={[7, 17.5, 10]}
      target={[-0.4, 14.3, 0]}
      minDistance={4}
      maxDistance={40}
      maxPolar={Math.PI * 0.55}
      lightSize={22}
      panel={panel}
      steps={['Wind pushes on the blades and turns the rotor.', 'A gearbox speeds up the slow spin.', 'The generator turns the spin into electricity.']}
      good={<>Cheap: onshore wind costs <Fact k="lcoeWindLow" format={(n) => '$' + n} /> to <Fact k="lcoeWindHigh" format={(n) => '$' + n} /> per MWh in the US. In many places it blows harder in winter, when solar is weakest.</>}
      hard={<>Wind comes and goes. US wind farms make about <Fact k="windCFUS" percent /> of their maximum over a year. Some weeks are almost windless.</>}
      costs={<>Onshore wind: <Fact k="lcoeWindLow" format={(n) => '$' + n} /> to <Fact k="lcoeWindHigh" format={(n) => '$' + n} /> per MWh. No fuel to buy.</>}
    />
  );
}
