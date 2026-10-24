// Step back, play/pause, step forward and speed. Same place on every screen (PhET rule).
import { useApp, useControlVisible } from '../store';
import { Segmented } from './kit';
import { UIIcon } from './icons';
import type { Speed } from '../types';
import './ui.css';

export default function PlayControls() {
  const visible = useControlVisible('play');
  const playing = useApp((s) => s.playing);
  const speed = useApp((s) => s.speed);
  const togglePlay = useApp((s) => s.togglePlay);
  const stepHour = useApp((s) => s.stepHour);
  const setSpeed = useApp((s) => s.setSpeed);
  if (!visible) return null;
  return (
    <div className="play" role="group" aria-label="Time controls">
      <button className="icon-btn" onClick={() => stepHour(-1)} aria-label="Back one hour" title="Back one hour ([)">
        <UIIcon name="stepBack" />
      </button>
      <button className="icon-btn big" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
        <UIIcon name={playing ? 'pause' : 'play'} size={16} />
      </button>
      <button className="icon-btn" onClick={() => stepHour(1)} aria-label="Forward one hour" title="Forward one hour (])">
        <UIIcon name="stepForward" />
      </button>
      <Segmented<Speed>
        value={speed}
        label="Speed"
        options={[{ value: 'hour', label: '1 h/s' }, { value: 'day', label: '1 day/s' }, { value: 'week', label: '1 week/s' }]}
        onChange={setSpeed}
      />
    </div>
  );
}
