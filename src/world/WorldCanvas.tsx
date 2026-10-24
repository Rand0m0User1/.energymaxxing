// The 3D world: one canvas that stays mounted behind every screen.
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

function onMissed() {
  const s = useApp.getState();
  if (s.selectedStation) s.selectStation(null);
  if (s.selectedDistrict) s.selectDistrict(null);
}

export default function WorldCanvas() {
  // An inside view covers the screen: render only on demand to save work.
  const paused = useApp((s) => s.inside !== null);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      frameloop={paused ? 'demand' : 'always'}
      camera={{ position: [240, 120, 200], fov: 45, near: 0.5, far: 7000 }}
      style={{ position: 'absolute', inset: 0 }}
      onPointerMissed={onMissed}
    >
      <WorldClock />
      <SkyAndSun />
      <SafeBoundary name="Island">
        <Island />
      </SafeBoundary>
      <SafeBoundary name="City">
        <City />
      </SafeBoundary>
      <SafeBoundary name="PowerLines">
        <PowerLines />
      </SafeBoundary>
      <SafeBoundary name="EnergyParticles">
        <EnergyParticles />
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
