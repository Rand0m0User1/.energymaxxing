// Title over the 3D island: one question and two ways in.
import { useApp } from '../store';
import { Button } from './kit';

export default function TitleScreen() {
  const startTour = useApp((s) => s.startTour);
  const setScreen = useApp((s) => s.setScreen);
  return (
    <div className="title-screen">
      <div className="title-body">
        <h1>Energymaxxing</h1>
        <p>Solar is cheap. Nights are long. How do we keep the lights on?</p>
        <div className="title-actions">
          <Button primary onClick={() => startTour('earth')}>Take the tour</Button>
          <Button onClick={() => setScreen('explore')}>Explore</Button>
        </div>
      </div>
      <footer className="title-foot xsmall">
        Aleksander Kurgan, Brad Wu, Belle Zhou, Munich Limapichat · Stanford BASES Six Hour Challenge
      </footer>
    </div>
  );
}
