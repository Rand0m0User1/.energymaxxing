// Fusion lab inside view (SPEC §8.4): tokamak, pulsed machine and laser target side by side,
// a D–T reaction diagram and a readiness bar.
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { fv } from '../../data/facts';
import { SOURCE_COLORS } from '../../data/colors';
import { AssumptionTag, Cite, Fact, fmtNumber } from '../../ui/Fact';
import { RealTerm, Segmented, Slider, Switch } from '../../ui/kit';
import InsideLayout from '../InsideLayout';
import { DEG, Label, Matte, safeDt, usd, type Vec3 } from '../three';

type Station = 'tokamak' | 'pulsed' | 'laser' | 'all';
const X: Record<Exclude<Station, 'all'>, number> = { tokamak: -9, pulsed: 0, laser: 9 };
const PLASMA = '#E39BC2';
const PLASMA_LIGHT = '#F3C9DD';
const COIL = '#a9805e';

const CAM: Record<Station, { pos: Vec3; target: Vec3 }> = {
  tokamak: { pos: [-9, 5.8, 8.6], target: [-9, 1.4, 0] },
  pulsed: { pos: [0, 4.4, 8.4], target: [0, 1.4, 0] },
  laser: { pos: [9, 4.6, 8.2], target: [9, 1.8, 0] },
  all: { pos: [0, 8.5, 19], target: [0, 1.2, 0] },
};

// ---------- Tokamak ----------
function Tokamak({ strength, detail }: { strength: number; detail: boolean }) {
  const plasma = useRef<THREE.Group>(null);
  const blobs = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);
  const R = 2;
  const B = 14;
  const o = useMemo(() => new THREE.Object3D(), []);
  const coils = useMemo(() => Array.from({ length: 12 }, (_, k) => (k * 2 * Math.PI) / 12).filter((a) => a < 1.5 * Math.PI - 0.1), []);

  useFrame((_, dtRaw) => {
    const dt = safeDt(dtRaw);
    t.current += dt;
    const tt = t.current;
    const loose = 1 - strength;
    const amp = loose * 0.55;
    if (plasma.current) {
      plasma.current.position.set(amp * Math.sin(tt * 2.7), amp * 0.8 * Math.cos(tt * 2.1), amp * 0.6 * Math.sin(tt * 1.7));
      plasma.current.scale.setScalar(1 + loose * 0.12 * (0.5 + 0.5 * Math.sin(tt * 3.3)));
    }
    if (mat.current) mat.current.opacity = strength < 0.35 ? 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(tt * 7)) : 0.85;
    const m = blobs.current;
    if (m) {
      for (let i = 0; i < B; i++) {
        const a = (i / B) * Math.PI * 2 + tt * 1.6;
        o.position.set(Math.cos(a) * R, Math.sin(a) * R, Math.sin(a * 3 + tt) * 0.08);
        o.scale.setScalar(strength < 0.35 ? 0.6 : 1);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[X.tokamak, 1.6, 0]}>
      {/* Central magnet column */}
      <mesh castShadow>
        <cylinderGeometry args={[0.55, 0.55, 2.4, 24]} />
        <Matte color={COIL} />
      </mesh>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* Chamber with a quarter cut away */}
        <mesh castShadow receiveShadow>
          <torusGeometry args={[R, 0.78, 24, 64, 1.5 * Math.PI]} />
          <Matte color="#d3d7da" double />
        </mesh>
        {coils.map((a) => (
          <group key={a} rotation={[0, 0, a]}>
            <mesh position={[R, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.98, 0.07, 8, 28]} />
              <Matte color={COIL} />
            </mesh>
          </group>
        ))}
        <group ref={plasma}>
          <mesh>
            <torusGeometry args={[R, 0.3, 16, 72]} />
            <meshStandardMaterial ref={mat} color={PLASMA} roughness={1} metalness={0} transparent opacity={0.85} />
          </mesh>
          <instancedMesh ref={blobs} args={[undefined, undefined, B]} frustumCulled={false}>
            <sphereGeometry args={[0.2, 12, 8]} />
            <Matte color={PLASMA_LIGHT} />
          </instancedMesh>
        </group>
      </group>
      <mesh position={[0, -1.25, 0]} receiveShadow>
        <cylinderGeometry args={[1.6, 1.8, 0.5, 24]} />
        <Matte color="#c9cdd1" />
      </mesh>
      {detail && <Label position={[R + 0.4, 0.35, 0.9]}>Hot gas ring (plasma)</Label>}
      {detail && <Label position={[-R - 0.5, 1.2, 0]} muted>Magnet coils</Label>}
    </group>
  );
}

// ---------- Pulsed machine ----------
function Pulsed({ detail }: { detail: boolean }) {
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const burst = useRef<THREE.Mesh>(null);
  const burstMat = useRef<THREE.MeshStandardMaterial>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const t = useRef(0);
  const RN = 14;
  const ringX = useMemo(() => Array.from({ length: RN }, (_, i) => -3.25 + i * 0.5), []);
  const o = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dtRaw) => {
    const dt = safeDt(dtRaw);
    t.current += dt;
    const T = 3.4;
    const ph = (t.current % T) / T;
    const travel = ph < 0.45 ? ph / 0.45 : 1;
    const x = 3.1 * (1 - travel * travel);
    const showRings = ph < 0.45;
    if (left.current) { left.current.position.x = -x; left.current.visible = showRings; }
    if (right.current) { right.current.position.x = x; right.current.visible = showRings; }
    const b = ph >= 0.43 && ph < 0.62 ? Math.sin((Math.PI * (ph - 0.43)) / 0.19) : 0;
    if (burst.current) { burst.current.visible = b > 0.01; burst.current.scale.setScalar(0.3 + 0.7 * b); }
    if (burstMat.current) burstMat.current.opacity = 0.55 * b;
    const breathe = ph >= 0.5 && ph < 0.92 ? Math.sin((Math.PI * (ph - 0.5)) / 0.42) : 0;
    const m = rings.current;
    if (m) {
      for (let i = 0; i < RN; i++) {
        const rx = ringX[i];
        const s = 1 + 0.2 * breathe * Math.exp(-(rx * rx) / 2);
        o.position.set(rx, 0, 0);
        o.rotation.set(0, Math.PI / 2, 0);
        o.scale.set(s, s, 1);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[X.pulsed, 1.4, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 7.2, 24, 1, true]} />
        <Matte color="#cdd6de" opacity={0.25} double />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 0.6, 1.3, 24, 1, true]} />
        <Matte color="#cdd6de" opacity={0.3} double />
      </mesh>
      <instancedMesh ref={rings} args={[undefined, undefined, RN]} castShadow frustumCulled={false}>
        <torusGeometry args={[0.6, 0.07, 8, 28]} />
        <Matte color={COIL} />
      </instancedMesh>
      <mesh ref={left} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.24, 0.1, 10, 24]} />
        <Matte color={PLASMA} />
      </mesh>
      <mesh ref={right} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.24, 0.1, 10, 24]} />
        <Matte color={PLASMA} />
      </mesh>
      <mesh ref={burst} visible={false}>
        <sphereGeometry args={[0.45, 20, 14]} />
        <meshStandardMaterial ref={burstMat} color={PLASMA_LIGHT} roughness={1} metalness={0} transparent opacity={0} depthWrite={false} />
      </mesh>
      {[-2.6, 2.6].map((sx) => (
        <mesh key={sx} position={[sx, -0.85, 0]} castShadow>
          <boxGeometry args={[0.3, 1.1, 0.8]} />
          <Matte color="#c9cdd1" />
        </mesh>
      ))}
      {detail && <Label position={[-2.9, 1.0, 0]} muted>Rings of hot gas fire from each end</Label>}
      {detail && <Label position={[0, 1.15, 0]}>They collide and fuse here</Label>}
      {detail && <Label position={[2.2, -0.75, 0.7]} muted>Magnets catch the push as electricity</Label>}
    </group>
  );
}

// ---------- Laser target ----------
function Laser({ detail }: { detail: boolean }) {
  const beamMat = useRef<THREE.LineBasicMaterial>(null);
  const flash = useRef<THREE.Mesh>(null);
  const flashMat = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);
  const beams = useMemo(() => {
    const pts: number[] = [];
    const polar = [28, 48, 180 - 28, 180 - 48];
    polar.forEach((p, ri) => {
      for (let k = 0; k < 8; k++) {
        const az = (k / 8) * Math.PI * 2 + (ri % 2) * (Math.PI / 8);
        const dir = new THREE.Vector3(Math.sin(p * DEG) * Math.cos(az), Math.cos(p * DEG), Math.sin(p * DEG) * Math.sin(az));
        const a = dir.clone().multiplyScalar(4.6);
        const b = dir.clone().multiplyScalar(0.12);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  useFrame((_, dtRaw) => {
    const dt = safeDt(dtRaw);
    t.current += dt;
    const T = 4;
    const ph = (t.current % T) / T;
    let beam = 0.3;
    if (ph < 0.1) beam = 0.3 + 0.55 * (ph / 0.1);
    else if (ph < 0.2) beam = 0.85 - 0.55 * ((ph - 0.1) / 0.1);
    if (beamMat.current) beamMat.current.opacity = beam;
    const f = ph >= 0.09 && ph < 0.2 ? Math.sin((Math.PI * (ph - 0.09)) / 0.11) : 0;
    if (flash.current) { flash.current.visible = f > 0.01; flash.current.scale.setScalar(0.4 + 0.6 * f); }
    if (flashMat.current) flashMat.current.opacity = 0.5 * f;
  });

  return (
    <group position={[X.laser, 1.9, 0]}>
      <mesh rotation={[0, Math.PI * 0.75, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1.5, 36, 22, 0, 1.5 * Math.PI]} />
        <Matte color="#d8dcdf" double />
      </mesh>
      <lineSegments geometry={beams}>
        <lineBasicMaterial ref={beamMat} color="#6f82c8" transparent opacity={0.3} depthWrite={false} />
      </lineSegments>
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.22, 16]} />
        <Matte color="#c9a24f" />
      </mesh>
      <mesh ref={flash} visible={false}>
        <sphereGeometry args={[0.28, 16, 12]} />
        <meshStandardMaterial ref={flashMat} color="#f6e7c8" roughness={1} metalness={0} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, -1.4, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.4, 1.1, 16]} />
        <Matte color="#c9cdd1" />
      </mesh>
      {detail && <Label position={[0, 0.35, 0.3]}>Tiny fuel capsule</Label>}
      {detail && <Label position={[2.6, 2.6, 0]} muted>Laser beams</Label>}
      {detail && <Label position={[-1.4, -1.2, 1.0]} muted>Target chamber</Label>}
    </group>
  );
}

function FusionScene({ strength, station, onPick }: { strength: number; station: Station; onPick: (s: Station) => void }) {
  const pick = (s: Station) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > 6) return; onPick(s); };
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 120]} />
        <Matte color="#dcdfd9" />
      </mesh>
      {(['tokamak', 'pulsed', 'laser'] as const).map((s) => (
        <mesh key={s} position={[X[s], 0.04, 0]} receiveShadow onClick={pick(s)}>
          <cylinderGeometry args={[3.6, 3.6, 0.08, 40]} />
          <Matte color="#d1d4cf" />
        </mesh>
      ))}
      <group onClick={pick('tokamak')}><Tokamak strength={strength} detail={station === 'tokamak'} /></group>
      <group onClick={pick('pulsed')}><Pulsed detail={station === 'pulsed'} /></group>
      <group onClick={pick('laser')}><Laser detail={station === 'laser'} /></group>
      <Label position={[X.tokamak, 4.3, 0]}>Tokamak</Label>
      <Label position={[X.pulsed, 3.4, 0]}>Pulsed machine</Label>
      <Label position={[X.laser, 4.3, 0]}>Laser target</Label>
    </group>
  );
}

function Reaction() {
  const P = SOURCE_COLORS.fusion;
  const N = '#9aa1a8';
  const nuc = (cx: number, cy: number, parts: ('p' | 'n')[]) => {
    const offs: [number, number][] = [[0, 0], [9, 3], [3, 9], [10, 11]];
    return parts.map((t, i) => <circle key={i} cx={cx + offs[i][0] - 5} cy={cy + offs[i][1] - 5} r={6} fill={t === 'p' ? P : N} stroke="#fff" strokeWidth={1} />);
  };
  return (
    <svg viewBox="0 0 300 92" width="100%" role="img" aria-label="Deuterium plus tritium makes helium plus a fast neutron">
      {nuc(24, 36, ['p', 'n'])}
      <text x={52} y={41} fontSize="14" fill="var(--ink-2)" textAnchor="middle">+</text>
      {nuc(80, 36, ['p', 'n', 'n'])}
      <text x={118} y={41} fontSize="14" fill="var(--ink-2)" textAnchor="middle">→</text>
      {nuc(160, 36, ['p', 'n', 'p', 'n'])}
      <text x={196} y={41} fontSize="14" fill="var(--ink-2)" textAnchor="middle">+</text>
      <circle cx={232} cy={36} r={6} fill={N} stroke="#fff" strokeWidth={1} />
      <path d="M244 32 h22 M244 36 h30 M244 40 h22" stroke="var(--ink-3)" strokeWidth={1.2} />
      <g fontSize="10" fill="var(--ink-2)" textAnchor="middle">
        <text x={24} y={68}>Deuterium</text>
        <text x={80} y={68}>Tritium</text>
        <text x={160} y={68}>Helium</text>
        <text x={244} y={68}>Fast neutron</text>
      </g>
      <g fontSize="9" fill="var(--ink-3)">
        <circle cx={10} cy={85} r={4} fill={P} /><text x={18} y={88}>proton</text>
        <circle cx={62} cy={85} r={4} fill={N} /><text x={70} y={88}>neutron</text>
      </g>
    </svg>
  );
}

function Readiness() {
  const W = 300, L = 14, R = 14;
  const x = (stage: number) => L + (Math.min(3, Math.max(0, stage)) / 3) * (W - L - R);
  const stops = ['Lab proof', 'Pilot plant', 'First power on grid', 'Many plants'];
  const markers = [
    { name: 'NIF', v: fv('readinessNIF'), y: 10, anchor: 'middle' as const },
    { name: 'CFS', v: fv('readinessCFS'), y: 20, anchor: 'end' as const },
    { name: 'Helion', v: fv('readinessHelion'), y: 20, anchor: 'start' as const },
  ];
  return (
    <svg viewBox={`0 0 ${W} 72`} width="100%" role="img" aria-label="How far along each fusion approach is">
      <line x1={L} y1={40} x2={W - R} y2={40} stroke="var(--line-strong)" strokeWidth={2} />
      {stops.map((s, i) => (
        <g key={s}>
          <circle cx={x(i)} cy={40} r={4.5} fill="var(--panel-solid)" stroke="var(--ink-3)" />
          <text x={x(i)} y={60} fontSize="9.5" fill="var(--ink-2)" textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'} dx={i === 0 ? -8 : i === 3 ? 8 : 0}>{s}</text>
        </g>
      ))}
      {markers.map((m) => (
        <g key={m.name}>
          <line x1={x(m.v)} y1={m.y + 3} x2={x(m.v)} y2={40} stroke={SOURCE_COLORS.fusion} strokeWidth={1.5} />
          <circle cx={x(m.v)} cy={40} r={3.5} fill={SOURCE_COLORS.fusion} />
          <text x={x(m.v)} y={m.y} fontSize="10" fill="var(--ink)" textAnchor={m.anchor} dx={m.anchor === 'end' ? 3 : m.anchor === 'start' ? -3 : 0}>{m.name}</text>
        </g>
      ))}
    </svg>
  );
}

export default function FusionInside() {
  const [station, setStation] = useState<Station>('all');
  const [strength, setStrength] = useState(0.85);
  const [fullPicture, setFullPicture] = useState(false);
  const cam = CAM[station];
  const gain = fv('nifInMJ') > 0 ? fv('nifOutMJ') / fv('nifInMJ') : 0;
  const year = (v: number) => String(Math.round(v));

  let magnetState: string;
  if (strength >= 0.7) magnetState = 'The ring stays in the middle, away from the wall.';
  else if (strength >= 0.35) magnetState = 'The ring wobbles toward the wall and loses heat.';
  else magnetState = 'The ring touches the wall and cools down. Fusion stops.';

  const panel = (
    <>
      <section>
        <p>Fusion joins light atoms together. It is how the Sun makes its energy.</p>
        <p>No fusion plant has put electricity on a grid yet.</p>
        <Segmented<Station> label="Choose a machine" value={station} onChange={setStation}
          options={[{ value: 'all', label: 'All three' }, { value: 'tokamak', label: 'Tokamak' }, { value: 'pulsed', label: 'Pulsed' }, { value: 'laser', label: 'Laser' }]} />
        <p className="muted xsmall">You can also click a machine.</p>
      </section>

      {(station === 'tokamak' || station === 'all') && (
        <section>
          <h3>Tokamak (Commonwealth Fusion Systems style)</h3>
          <p>Very strong magnets hold a gas hotter than the Sun's core away from the walls.</p>
          <div className="il-between"><span className="muted">Weak</span><span>Magnet strength</span><span className="muted">Strong</span></div>
          <Slider label="Magnet strength" value={strength} min={0} max={1} step={0.05} onChange={setStrength} />
          <p>{magnetState}</p>
          <p>Google agreed to buy <Fact k="googleCfsMW" unit /> from the first CFS plant, called ARC, expected on the grid in the early 2030s.</p>
          <RealTerm>magnetic confinement</RealTerm>
        </section>
      )}

      {station === 'pulsed' && (
        <section>
          <h3>Pulsed machine (Helion style)</h3>
          <p>Two rings of hot gas fire from each end and crash together in the middle. The squeeze makes them fuse.</p>
          <p>Then the machine breathes out. The push on its magnets is collected straight as electricity.</p>
          <p>Microsoft agreed to buy electricity from Helion starting in <Fact k="helionMicrosoftYear" format={year} />.</p>
          <p className="il-quote">"No one has delivered electricity."</p>
          <p className="xsmall muted">The head of the Fusion Industry Association, <Fact k="fiaNoElectricity2023" format={year} /></p>
          <RealTerm>a field-reversed configuration with direct energy recovery</RealTerm>
        </section>
      )}

      {station === 'laser' && (
        <section>
          <h3>Laser target (National Ignition Facility)</h3>
          <p>Lasers crush a tiny fuel capsule for a split second. It fuses before it can fly apart.</p>
          <p>The real machine has <Fact k="nifBeams" /> beams. We draw a few dozen.</p>
          <p>On December 5, 2022, it got <Fact k="nifOutMJ" unit /> of fusion energy out from <Fact k="nifInMJ" unit /> of laser light in. That is about <span className="num">{fmtNumber(gain, 1)}</span> times what went in.</p>
          <div className="il-row"><Switch checked={fullPicture} onChange={setFullPicture} label="Show the full energy picture" /><span className="small">Show the full energy picture</span></div>
          {fullPicture && <p>But the lasers themselves drew far more energy from the grid.<Cite k="nifGridDrawNote" /><AssumptionTag text="number still to verify" /></p>}
          <RealTerm>inertial confinement fusion</RealTerm>
        </section>
      )}

      {station === 'all' && (
        <section>
          <p>Three ways to hold a fusion fire: magnets in a ring, colliding pulses, or a laser squeeze. Pick one to look closer.</p>
        </section>
      )}

      <section>
        <h3>The reaction</h3>
        <Reaction />
        <p>Two heavy kinds of hydrogen join. They make helium and one fast neutron. The neutron carries the energy out as heat.</p>
        <p><Fact k="mevPerDT" unit /> from each reaction.</p>
        <RealTerm>deuterium–tritium (D–T) fusion</RealTerm>
      </section>

      <section>
        <h3>How far along is it?</h3>
        <Readiness />
        <p className="xsmall muted">Marker positions are our rough reading.<Cite k="readinessCFS" /><AssumptionTag /></p>
      </section>
    </>
  );

  return (
    <InsideLayout
      ariaLabel="Fusion lab with three machines"
      scene={<FusionScene strength={strength} station={station} onPick={setStation} />}
      cameraPos={cam.pos}
      target={cam.target}
      minDistance={3}
      maxDistance={45}
      lightSize={20}
      panel={panel}
      steps={[
        'Heat heavy hydrogen far hotter than the Sun\'s core.',
        'Hold it together long enough, with magnets or a laser squeeze.',
        'The atoms fuse and give off fast neutrons, which make heat for a turbine.',
      ]}
      good={<>Plentiful fuel and no carbon emissions. A plant would run day and night.</>}
      hard={<>No one has delivered electricity yet.<Cite k="fiaNoElectricity2023" /> Every approach is still a test machine.</>}
      costs={<>Tokamak fusion plants are estimated at <Fact k="lcoeFusionLow" format={usd} /> to <Fact k="lcoeFusionHigh" format={usd} /> per MWh.</>}
    />
  );
}
