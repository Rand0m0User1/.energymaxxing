// App shell: the 3D world is always mounted; overlays change with the screen.
import { useEffect } from 'react';
import { useApp } from './store';
import WorldCanvas from './world/WorldCanvas';
import TitleScreen from './screens/TitleScreen';
import TopBar from './ui/TopBar';
import PlantPanel from './ui/PlantPanel';
import BottomBar from './ui/BottomBar';
import PlacePicker from './ui/PlacePicker';
import SourcesDrawer from './ui/SourcesDrawer';
import HelpOverlay from './ui/HelpOverlay';
import StationPrompt from './ui/StationPrompt';
import { useKeyboard } from './ui/useKeyboard';
import Dashboard from './ui/dashboard/Dashboard';
import InsideView from './inside/InsideView';
import LessonCard from './lessons/LessonCard';
import LessonPicker from './lessons/LessonPicker';
import PresenterOverlay from './lessons/PresenterOverlay';
import ToolHost from './tools/ToolHost';

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
  const lesson = useApp((s) => s.lesson);
  const inside = useApp((s) => s.inside);
  const tool = useApp((s) => s.tool);
  useTicker();
  useKeyboard();

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
            <TopBar />
            {screen === 'tour' && (lesson ? <LessonCard /> : <LessonPicker />)}
            <PlantPanel />
            <Dashboard />
            <BottomBar />
            <StationPrompt />
          </>
        )}
        {tool && <ToolHost />}
        {inside && <InsideView />}
        <PlacePicker />
        <SourcesDrawer />
        <HelpOverlay />
        <PresenterOverlay />
      </div>
    </div>
  );
}
