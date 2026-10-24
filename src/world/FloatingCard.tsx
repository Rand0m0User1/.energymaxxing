// Small card next to the selected station: name, one plain sentence and its on/off switch.
import { Html } from '@react-three/drei';
import { useApp } from '../store';
import { STATIONS, isWorldStation, stationsFor, type WorldStation } from './layout';
import { IconButton, Icon, Switch } from '../ui/kit';
import { cityLitNow } from './districtState';
import { stopCanvasEvents } from './cursor';

const SENTENCE: Record<WorldStation, string> = {
  city: 'Needs power every hour, day and night.',
  solar: 'Makes power from sunlight. Nothing at night.',
  wind: 'Makes power when the wind blows.',
  battery: 'Store extra power and release it later.',
  reactor: 'Runs day and night, in any season.',
  gas: 'Runs on demand, but burns fuel and pollutes.',
};

export default function FloatingCard() {
  const id = useApp((s) => s.selectedStation);
  const env = useApp((s) => s.env);
  const hidden = useApp((s) => s.screen === 'title');
  if (hidden || !isWorldStation(id) || !stationsFor(env).includes(id)) return null;
  const st = STATIONS[id];
  return (
    <Html key={id} position={[st.pos[0], st.labelY, st.pos[1]]} zIndexRange={[20, 11]}>
      <CardBody id={id} />
    </Html>
  );
}

function CardBody({ id }: { id: WorldStation }) {
  const st = STATIONS[id];
  const power = st.power;
  const on = useApp((s) => (power ? s.on[power] : true));
  const setOn = useApp((s) => s.setOn);
  const lit = useApp((s) => (id === 'city' ? cityLitNow(s) : true));
  const close = () => useApp.getState().selectStation(null);

  return (
    <div style={{ transform: 'translate(-50%, calc(-100% - 12px))' }} {...stopCanvasEvents}>
      <div className="panel" style={{ width: 220, padding: '10px 12px', pointerEvents: 'auto' }} role="dialog" aria-label={st.label}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, fontWeight: 600, fontSize: 'var(--fs-md)' }}>
            {st.label}
            {id === 'city' && (
              <span style={{ fontWeight: 400, color: lit ? 'var(--ink-2)' : 'var(--bad)' }}> · {lit ? 'Lights on' : 'Blackout'}</span>
            )}
          </div>
          <IconButton label="Close" onClick={close} style={{ width: 24, height: 24 }}>
            <Icon name="close" size={13} />
          </IconButton>
        </div>
        <div className="small" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{SENTENCE[id]}</div>
        {power && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span className="small" style={{ fontWeight: 600 }}>{on ? 'On' : 'Off'}</span>
            <Switch checked={on} onChange={(v) => setOn(power, v)} label={`${st.label} on or off`} />
          </div>
        )}
      </div>
    </div>
  );
}
