// The 3D world: one canvas that stays mounted behind every screen.
import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useApp } from '../store';
import { WorldClock } from './worldFrame';
import SkyAndSun from './SkyAndSun';
import Island from './Island';
import City from './City';
import PowerLines from './PowerLines';
import EnergyParticles from './EnergyParticles';
import Stations, { SafeBoundary } from './Stations';
import Signs from './Signs';
import FloatingCard from './FloatingCard';
import CameraRig from './CameraRig';
import { setCursor } from './cursor';

function onMissed() {
  const s = useApp.getState();
  if (s.selectedStation) s.selectStation(null);
}

export default function WorldCanvas() {
  // Remount env-specific pieces so nothing from the other world stays behind.
  const env = useApp((s) => s.env);
  useEffect(() => setCursor(false), [env]);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [205, 115, 200], fov: 45, near: 0.5, far: 7000 }}
      style={{ position: 'absolute', inset: 0 }}
      onPointerMissed={onMissed}
    >
      <WorldClock />
      <SkyAndSun key={`sky-${env}`} />
      <SafeBoundary name="Island">
        <Island key={`island-${env}`} />
      </SafeBoundary>
      <SafeBoundary name="City">
        <City />
      </SafeBoundary>
      <SafeBoundary name="PowerLines">
        <PowerLines key={`lines-${env}`} />
      </SafeBoundary>
      <SafeBoundary name="EnergyParticles">
        <EnergyParticles key={`flow-${env}`} />
      </SafeBoundary>
      <Stations />
      <SafeBoundary name="Signs">
        <Signs />
      </SafeBoundary>
      <SafeBoundary name="FloatingCard">
        <FloatingCard />
      </SafeBoundary>
      <CameraRig />
    </Canvas>
  );
}
