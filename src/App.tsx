// App shell: the 3D city fills the screen; one home panel holds every control.
import { useEffect } from 'react';
import { useApp } from './store';
import WorldCanvas from './world/WorldCanvas';
import TitleScreen from './ui/TitleScreen';
import HomePanel from './ui/HomePanel';
import TourCard from './ui/TourCard';
import DemoHost from './demos/DemoHost';

// Exposed for the headless check script (scripts/quickshot.mjs).
if (typeof window !== 'undefined') (window as unknown as { __app: typeof useApp }).__app = useApp;

function useTicker() {
  const tick = useApp((s) => s.tick);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      tick((now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);
}

export default function App() {
  const screen = useApp((s) => s.screen);
  const tour = useApp((s) => s.tour);
  const demo = useApp((s) => s.demo);
  useTicker();

  return (
    <div className="app">
      <div className="canvas-layer">
        <WorldCanvas />
      </div>
      <div className="overlay">
        {screen === 'title' ? (
          <TitleScreen />
        ) : (
          <>
            <HomePanel />
            {demo && <DemoHost />}
            {tour && <TourCard />}
          </>
        )}
      </div>
    </div>
  );
}
