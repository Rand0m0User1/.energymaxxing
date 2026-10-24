// Sky colour, sun light, fill light and fog. Off Earth: black sky with stars, Earth in the sky (Moon) or below (orbit).
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useApp } from '../store';
import { PLACES } from '../data/places';
import { worldFrame, smoothstep } from './worldFrame';

const WARM = new THREE.Color('#E9B38A');
const SUN_WHITE = new THREE.Color('#FFF6EA');
const SUN_WARM = new THREE.Color('#FFB27A');
const NIGHT_FILL = new THREE.Color('#566A92');
const NIGHT_GROUND = new THREE.Color('#2A2F38');
const WHITE = new THREE.Color('#ffffff');

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

export default function SkyAndSun() {
  const placeId = useApp((s) => s.input.place);
  const place = PLACES[placeId];
  const body = place.body;
  const scene = useThree((s) => s.scene);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);

  const colors = useMemo(() => ({
    day: new THREE.Color(place.skyDay),
    night: new THREE.Color(place.skyNight),
    ground: new THREE.Color(place.ground),
    hemiDay: new THREE.Color(place.skyDay).lerp(WHITE, 0.45),
  }), [place]);

  const bg = useMemo(() => new THREE.Color(place.skyDay), []);

  useEffect(() => {
    scene.background = bg;
    if (body === 'earth') scene.fog = new THREE.Fog(bg.getHex(), 320, 1250);
    else if (body === 'mars') scene.fog = new THREE.Fog(bg.getHex(), 380, 1700);
    else scene.fog = null;
    return () => {
      scene.fog = null;
    };
  }, [scene, bg, body]);

  useFrame(() => {
    const elev = worldFrame.elevDeg;
    const az = (worldFrame.azDeg * Math.PI) / 180;
    const dl = worldFrame.daylight;

    // Sky colour
    if (body === 'moon' || body === 'orbit') {
      bg.copy(colors.day);
    } else {
      bg.copy(colors.night).lerp(colors.day, dl);
      if (body === 'earth') {
        const warm = Math.max(0, 1 - Math.abs(elev - 1) / 9) * 0.5;
        bg.lerp(WARM, warm);
      }
    }
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(bg);

    // Sun direction: azimuth clockwise from north, +x east, -z north.
    const el = (Math.max(elev, 3) * Math.PI) / 180;
    const l = sun.current;
    if (l) {
      l.position.set(Math.sin(az) * Math.cos(el) * 400, Math.sin(el) * 400, -Math.cos(az) * Math.cos(el) * 400);
      const up = smoothstep(-1, 6, elev);
      const peak = body === 'moon' ? 3.4 : body === 'orbit' ? 3.2 : body === 'mars' ? 2.1 : 2.7;
      l.intensity = peak * up;
      const low = body === 'earth' ? 1 - smoothstep(2, 16, elev) : 0;
      l.color.copy(SUN_WHITE).lerp(SUN_WARM, low * 0.8);
    }

    // Fill light: brighter by day, cool blue at night so the island stays readable.
    const h = hemi.current;
    if (h) {
      const airless = body === 'moon' || body === 'orbit';
      h.color.copy(NIGHT_FILL).lerp(airless ? tmpA.set('#9aa3b4') : colors.hemiDay, dl);
      h.groundColor.copy(NIGHT_GROUND).lerp(tmpB.copy(colors.ground).multiplyScalar(0.7), dl);
      const dayI = airless ? 0.35 : 1.0;
      const nightI = airless ? 0.3 : 0.55;
      h.intensity = nightI + (dayI - nightI) * dl;
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#ffffff', '#888888', 0.8]} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={2.5}
        position={[200, 300, 100]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-190}
        shadow-camera-right={190}
        shadow-camera-top={190}
        shadow-camera-bottom={-190}
        shadow-camera-near={10}
        shadow-camera-far={1000}
        shadow-bias={-0.0004}
        shadow-normalBias={0.4}
      />
      {body !== 'earth' && <Stars body={body} />}
      {body === 'moon' && <EarthInSky />}
      {body === 'orbit' && <EarthBelow />}
    </>
  );
}

function Stars({ body }: { body: 'orbit' | 'moon' | 'mars' }) {
  const geo = useMemo(() => {
    const n = body === 'mars' ? 260 : 420;
    const pos = new Float32Array(n * 3);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1;
      const yUnit = body === 'orbit' ? u : Math.abs(u) * 0.95 + 0.03;
      const th = rnd() * Math.PI * 2;
      const rr = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
      const R = 2600;
      pos[i * 3] = Math.cos(th) * rr * R;
      pos[i * 3 + 1] = yUnit * R;
      pos[i * 3 + 2] = Math.sin(th) * rr * R;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [body]);
  const mat = useRef<THREE.PointsMaterial>(null);
  useFrame(() => {
    if (body === 'mars' && mat.current) mat.current.opacity = 0.85 * worldFrame.night;
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial ref={mat} color="#e8ecf2" size={1.6} sizeAttenuation={false} fog={false} transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

function EarthInSky() {
  // Earth hanging low in the lunar sky (it barely moves as seen from the Moon).
  return (
    <group position={[-1500, 700, -1700]}>
      <mesh>
        <sphereGeometry args={[110, 40, 28]} />
        <meshStandardMaterial color="#5E8FCC" roughness={1} metalness={0} emissive="#2E5486" emissiveIntensity={0.55} fog={false} />
      </mesh>
      <mesh scale={1.015} rotation={[0.4, 0.3, 0]}>
        <sphereGeometry args={[110, 40, 28, 0, Math.PI * 2, 0.9, 0.5]} />
        <meshStandardMaterial color="#F2F5F8" roughness={1} metalness={0} emissive="#8A96A6" emissiveIntensity={0.35} transparent opacity={0.75} fog={false} />
      </mesh>
    </group>
  );
}

function EarthBelow() {
  // A large Earth far below the floating platform.
  return (
    <group position={[0, -3600, -600]}>
      <mesh>
        <sphereGeometry args={[3000, 72, 48]} />
        <meshStandardMaterial color="#5B8DCB" roughness={1} metalness={0} emissive="#2B4E7E" emissiveIntensity={0.5} fog={false} />
      </mesh>
      <mesh scale={1.004} rotation={[0.3, 0, 0.2]}>
        <sphereGeometry args={[3000, 72, 48, 0, Math.PI * 2, 0.15, 0.35]} />
        <meshStandardMaterial color="#F3F6F9" roughness={1} metalness={0} emissive="#8995a5" emissiveIntensity={0.3} transparent opacity={0.7} fog={false} />
      </mesh>
    </group>
  );
}
