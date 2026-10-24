// Gas plant inside view (SPEC §8.6): turbine hall cutaway with an Output slider and CO2 per hour.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { fv } from '../../data/facts';
import { SOURCE_COLORS } from '../../data/colors';
import { Cite, Fact, fmtNumber } from '../../ui/Fact';
import { RealTerm, Slider } from '../../ui/kit';
import InsideLayout from '../InsideLayout';
import { Label, Matte, rng, safeDt, usd } from '../three';

const AXIS_Y = 1.5;
const STACK: [number, number, number] = [0.8, 0, -2.7];
const STACK_H = 9;

function Hall({ frac }: { frac: number }) {
  const fan = useRef<THREE.Group>(null);
  const shaft = useRef<THREE.Mesh>(null);
  const air = useRef<THREE.InstancedMesh>(null);
  const hot = useRef<THREE.InstancedMesh>(null);
  const co2 = useRef<THREE.InstancedMesh>(null);
  const A = 30, Hn = 20, C = 60;
  const seeds = useMemo(() => {
    const r = rng(9);
    const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ t: (i * 0.618034) % 1, a: r() * Math.PI * 2, rr: r(), d: r() }));
    return { air: mk(A), hot: mk(Hn), co2: mk(C) };
  }, []);
  const o = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dtRaw) => {
    const dt = safeDt(dtRaw);
    const running = frac > 0.001;
    const spin = running ? 6 : 0;
    if (fan.current) fan.current.rotation.x += spin * dt;
    const speed = 0.25 + 0.5 * frac;

    const am = air.current;
    if (am) {
      const active = Math.round(A * frac);
      for (let i = 0; i < A; i++) {
        const p = seeds.air[i];
        p.t = (p.t + dt * speed) % 1;
        const x = -9 + p.t * 5.6; // intake to burner
        const squeeze = 1 - p.t * 0.6; // the compressor squeezes the air
        const rad = 0.85 * p.rr * squeeze;
        o.position.set(x, AXIS_Y + Math.sin(p.a) * rad, Math.cos(p.a) * rad);
        o.scale.setScalar(i < active ? 1 : 0);
        o.updateMatrix();
        am.setMatrixAt(i, o.matrix);
      }
      am.instanceMatrix.needsUpdate = true;
    }
    const hm = hot.current;
    if (hm) {
      const active = Math.round(Hn * frac);
      for (let i = 0; i < Hn; i++) {
        const p = seeds.hot[i];
        p.t = (p.t + dt * speed * 1.4) % 1;
        const x = -2.2 + p.t * 2.4; // burner through the turbine
        const rad = (0.3 + p.t * 0.6) * p.rr;
        o.position.set(x, AXIS_Y + Math.sin(p.a) * rad, Math.cos(p.a) * rad);
        o.scale.setScalar(i < active ? 1 : 0);
        o.updateMatrix();
        hm.setMatrixAt(i, o.matrix);
      }
      hm.instanceMatrix.needsUpdate = true;
    }
    const cm = co2.current;
    if (cm) {
      const active = Math.round(C * frac);
      for (let i = 0; i < C; i++) {
        const p = seeds.co2[i];
        p.t = (p.t + dt * 0.12) % 1;
        const t = p.t;
        o.position.set(
          STACK[0] + Math.cos(p.a) * 0.25 + t * 3.5 * (0.6 + p.d),
          STACK_H + 0.2 + t * 6,
          STACK[2] + Math.sin(p.a) * 0.25 + (p.d - 0.5) * t * 2,
        );
        const s = (0.5 + t * 1.4) * (t > 0.75 ? (1 - t) / 0.25 : 1);
        o.scale.setScalar(i < active ? s : 0);
        o.updateMatrix();
        cm.setMatrixAt(i, o.matrix);
      }
      cm.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Hall floor and back wall (front and roof cut away) */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[20, 0.1, 9]} />
        <Matte color="#d6d8d4" />
      </mesh>
      <mesh position={[-2, 2, -3.9]} receiveShadow>
        <boxGeometry args={[16, 4, 0.15]} />
        <Matte color="#e4e5e1" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <Matte color="#dcdfd9" />
      </mesh>

      {/* Air intake */}
      <mesh position={[-7, AXIS_Y + 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 2.6, 2.4]} />
        <Matte color="#c9cdd1" />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[-7.62, AXIS_Y - 0.9 + k * 0.5, 0]}>
          <boxGeometry args={[0.04, 0.08, 2.2]} />
          <Matte color="#8b939a" />
        </mesh>
      ))}
      {/* Compressor: wide at the front, narrow at the back */}
      <mesh position={[-4.9, AXIS_Y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.95, 0.55, 2.6, 28, 1, true]} />
        <Matte color="#b8c0c7" double />
      </mesh>
      <group ref={fan} position={[-6.15, AXIS_Y, 0]}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} rotation={[(k * Math.PI) / 4, 0, 0]}>
            <boxGeometry args={[0.04, 1.7, 0.12]} />
            <Matte color="#7f8a93" />
          </mesh>
        ))}
      </group>
      {/* Burner */}
      <mesh position={[-2.9, AXIS_Y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.72, 0.72, 1.4, 28, 1, true]} />
        <Matte color="#d9a06b" double />
      </mesh>
      <mesh position={[-2.9, AXIS_Y + 1.6, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 1.8, 8]} />
        <Matte color={SOURCE_COLORS.gas} />
      </mesh>
      {/* Turbine: narrow at the front, wide at the back */}
      <mesh position={[-1.0, AXIS_Y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.6, 1.0, 2.2, 28, 1, true]} />
        <Matte color="#9aa1a8" double />
      </mesh>
      {/* Shaft and generator */}
      <mesh ref={shaft} position={[0.0, AXIS_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 9.8, 12]} />
        <Matte color="#5b636b" />
      </mesh>
      <mesh position={[3.9, AXIS_Y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[1.0, 1.0, 2.2, 28]} />
        <Matte color="#7f8a93" />
      </mesh>
      {/* Exhaust duct and stack */}
      <mesh position={[0.8, AXIS_Y, -1.5]} castShadow>
        <boxGeometry args={[1.1, 1.5, 2.0]} />
        <Matte color="#c9c6c0" />
      </mesh>
      <mesh position={[STACK[0], STACK_H / 2, STACK[2]]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.62, STACK_H, 24]} />
        <Matte color="#cfccc6" />
      </mesh>

      <instancedMesh ref={air} args={[undefined, undefined, A]} frustumCulled={false}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <Matte color="#bcd3e0" />
      </instancedMesh>
      <instancedMesh ref={hot} args={[undefined, undefined, Hn]} frustumCulled={false}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <Matte color="#d98f5a" />
      </instancedMesh>
      <instancedMesh ref={co2} args={[undefined, undefined, C]} frustumCulled={false}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <Matte color={SOURCE_COLORS.gas} opacity={0.55} />
      </instancedMesh>

      <Label position={[-7.6, AXIS_Y + 1.8, 0.4]}>Air in</Label>
      <Label position={[-5.6, AXIS_Y - 1.2, 0.9]}>Compressor: squeezes the air</Label>
      <Label position={[-2.9, AXIS_Y + 2.7, 0]}>Gas in</Label>
      <Label position={[-2.6, AXIS_Y - 1.0, 1.0]}>Burner</Label>
      <Label position={[-0.9, AXIS_Y + 1.35, 0.6]}>Turbine: hot gas spins it</Label>
      <Label position={[3.9, AXIS_Y + 1.4, 0.4]}>Generator</Label>
      <Label position={[STACK[0] + 0.9, STACK_H - 0.8, STACK[2]]} muted>Stack: CO2 goes out here</Label>
    </group>
  );
}

export default function GasInside() {
  const plantMW = fv('gasInsidePlantMW');
  const [mw, setMw] = useState(Math.round(plantMW * 0.6));
  const frac = plantMW > 0 ? Math.min(1, Math.max(0, mw / plantMW)) : 0;
  const co2PerHour = mw * fv('gasCO2PerMWh');

  const panel = (
    <>
      <section>
        <p>A gas plant is like a jet engine bolted to a generator. It burns natural gas and spins a turbine.</p>
        <p>It can go up and down whenever you ask. That is why grids keep it around.</p>
        <RealTerm>dispatchable power</RealTerm>
      </section>
      <section>
        <h3>Output</h3>
        <div className="il-between"><span className="muted">Off</span><span className="num">{fmtNumber(mw, 0)} MW (how fast)</span><span className="muted">Full</span></div>
        <Slider label="Gas plant output in MW" value={mw} min={0} max={plantMW} step={10} onChange={setMw} />
        <p className="muted xsmall">This turbine's full size: <Fact k="gasInsidePlantMW" unit /></p>
        <div className="il-box">
          <span className="muted">Carbon dioxide going into the air</span>
          <span className="il-big">{fmtNumber(co2PerHour, 0)} <small>tonnes per hour</small></span>
          <span className="xsmall muted">At <Fact k="gasCO2PerMWh" unit /> of CO2</span>
        </div>
        <p>Every hour it runs, it adds carbon dioxide to the air. More output, more CO2.</p>
      </section>
      <section>
        <h3>Why it is still built</h3>
        <p className="il-quote">"Lowest-cost dispatchable conventional technology."<Cite k="lcoeGasLow" /></p>
        <p>That is how Lazard describes combined-cycle gas. In plain words: the cheapest of the older plants that run on command.</p>
        <p>In a combined-cycle plant, the hot exhaust also boils water to spin a second, steam turbine.</p>
        <RealTerm>a combined-cycle gas turbine (CCGT)</RealTerm>
      </section>
    </>
  );

  return (
    <InsideLayout
      ariaLabel="Gas turbine hall cutaway"
      scene={<Hall frac={frac} />}
      cameraPos={[5, 11, 21]}
      target={[-0.5, 5.2, 0]}
      minDistance={5}
      maxDistance={40}
      lightSize={16}
      panel={panel}
      steps={[
        'A compressor squeezes air.',
        'Gas burns in the squeezed air, and the hot gas spins a turbine.',
        'The turbine turns a generator. The exhaust leaves through the stack.',
      ]}
      good={<>Runs whenever you ask, in any weather, day or night.</>}
      hard={<>Burns fuel and emits CO2, about <Fact k="gasCO2PerMWh" unit />. Fuel prices can swing.</>}
      costs={<>Combined-cycle gas: <Fact k="lcoeGasLow" format={usd} /> to <Fact k="lcoeGasHigh" format={usd} /> per MWh in the US.</>}
    />
  );
}
