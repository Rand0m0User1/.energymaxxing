// Quiet pill near the bottom centre when the camera is next to a station: "Press E or click to look inside".
import { useApp } from '../store';
import { STATIONS } from '../world/layout';
import { openStation } from './live';
import './ui.css';

export default function StationPrompt() {
  const near = useApp((s) => s.nearStation);
  const inside = useApp((s) => s.inside);
  const tool = useApp((s) => s.tool);
  const screen = useApp((s) => s.screen);
  const presenter = useApp((s) => s.presenter);
  const openTool = useApp((s) => s.openTool);
  if (!near || inside || (tool && !(screen === 'beyond' && tool === 'beyond')) || presenter) return null;
  const st = STATIONS[near];
  if (!st) return null;
  const toolName = near === 'batteryFactory' ? 'the Battery Factory' : near === 'industry' ? 'the Industry Quarter' : null;
  if (!st.inside && !toolName) return null;

  return (
    <div className="panel station-prompt" role="status">
      <button className="btn ghost" onClick={() => openStation(near)} aria-label={st.inside ? `Look inside the ${st.label}` : `Open ${toolName}`}>
        <kbd>E</kbd>&nbsp;{st.inside ? `Press E or click to look inside the ${st.label.toLowerCase()}` : `Press E to open ${toolName}`}
      </button>
      {near === 'reactor' && (
        <button className="btn ghost" onClick={() => openTool('reactorRow')} aria-label="Open Reactor Row">
          <kbd>R</kbd>&nbsp;Reactor Row
        </button>
      )}
    </div>
  );
}
