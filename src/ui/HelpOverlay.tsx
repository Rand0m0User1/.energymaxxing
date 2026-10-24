// Help overlay: how to use the app and the keyboard shortcuts (SPEC §16).
import { useEffect, useRef } from 'react';
import { useApp } from '../store';
import { IconButton } from './kit';
import { UIIcon } from './icons';
import './ui.css';

const KEYS: [string[], string][] = [
  [['W', 'A', 'S', 'D'], 'Walk (or arrow keys). Hold Shift to go faster.'],
  [['Drag'], 'Look around. Scroll to zoom.'],
  [['M'], 'Map view from above'],
  [['1', '–', '0'], 'Jump to a place on the island'],
  [['E'], 'Look inside the plant you are next to'],
  [['R'], 'Reactor Row (next to the reactor)'],
  [['Esc'], 'Close or go back'],
  [['Space'], 'Play or pause time'],
  [['[', ']'], 'Step one hour back or forward'],
  [['P'], 'Presenter mode'],
  [['F'], 'Full screen'],
  [['S'], 'Save a picture of the view'],
  [['N'], 'Fire a neutron (inside the reactor)'],
  [['Page Up', 'Page Down'], 'Presenter script steps'],
  [['?'], 'This help'],
];

function Help() {
  const close = useApp((s) => s.setHelpOpen);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
      <div className="panel panel-pad modal" style={{ width: 'min(760px, calc(100vw - 32px))' }} role="dialog" aria-modal="true"
        aria-labelledby="help-title" tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h2 id="help-title">How to use this</h2>
          <span className="grow" />
          <IconButton label="Close help" onClick={() => close(false)}><UIIcon name="close" /></IconButton>
        </div>
        <div className="help-cols">
          <div>
            <div className="section-title" style={{ marginTop: 0 }}>Try this</div>
            <ol>
              <li>Press play and watch one day. Colored dots show where the city's power comes from.</li>
              <li>Switch plants on and off on the right. Drag a slider to make a plant bigger or smaller.</li>
              <li>Drag the clock at the bottom to night. Does the battery last until morning?</li>
              <li>Press the globe to move the city to Helsinki in December. Watch what the long night does.</li>
              <li>Walk up to a plant and press E to look inside.</li>
              <li>Click any small "src" mark to see where a number comes from.</li>
              <li>The round orange button puts everything back to the start.</li>
            </ol>
          </div>
          <div>
            <div className="section-title" style={{ marginTop: 0 }}>Keyboard</div>
            <div className="keys">
              {KEYS.map(([keys, what]) => (
                <div key={what} style={{ display: 'contents' }}>
                  <span>{keys.map((k, i) => (k === '–' ? <span key={i}> to </span> : <kbd key={i} style={{ marginRight: 3 }}>{k}</kbd>))}</span>
                  <span>{what}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelpOverlay() {
  const open = useApp((s) => s.helpOpen);
  return open ? <Help /> : null;
}
