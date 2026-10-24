// Small card floating next to the selected station: name, live output, the plant's switch and slider, and actions.
import { Html } from '@react-three/drei';
import { useApp } from '../store';
import { STATIONS } from './layout';
import { Button, IconButton, Icon, RealTerm } from '../ui/kit';
import { PlantControls } from '../ui/PlantCard';
import type { SourceId, StationId } from '../types';
import { LABEL_HEIGHT, STATION_SOURCES, batteryActivity, stationLine, wastedNow } from './stationStatus';
import { stopCanvasEvents } from './cursor';
import { SafeBoundary } from './Stations';

export default function FloatingCard() {
  const id = useApp((s) => s.selectedStation);
  const hidden = useApp((s) => s.screen === 'title' || !!s.inside);
  if (!id || hidden) return null;
  const st = STATIONS[id];
  return (
    <Html key={id} position={[st.pos[0], LABEL_HEIGHT[id], st.pos[1]]} zIndexRange={[0, 0]}>
      <CardBody id={id} />
    </Html>
  );
}

function CardBody({ id }: { id: StationId }) {
  const st = STATIONS[id];
  const line = useApp((s) => stationLine(s, id));
  const activity = useApp((s) => (id === 'battery' ? batteryActivity(s) : ''));
  const wasted = useApp((s) => (id === 'solar' ? wastedNow(s) : ''));
  const openInside = useApp((s) => s.openInside);
  const openTool = useApp((s) => s.openTool);
  const close = () => useApp.getState().selectStation(null);

  const sources: SourceId[] = id === 'battery' ? ['battery'] : STATION_SOURCES[id] ?? [];

  return (
    <div style={{ transform: 'translate(-50%, calc(-100% - 14px))' }} {...stopCanvasEvents}>
      <div className="panel" style={{ width: 284, padding: '12px 14px', pointerEvents: 'auto' }} role="dialog" aria-label={st.label}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>{st.label}</div>
            {line && <div className="small muted num">{line}</div>}
          </div>
          <IconButton label="Close" onClick={close} style={{ width: 26, height: 26 }}>
            <Icon name="close" size={14} />
          </IconButton>
        </div>
        {activity && <div className="small num" style={{ marginTop: 4 }}>{activity}</div>}
        {wasted && (
          <div style={{ marginTop: 4 }}>
            <div className="small num">{wasted} GW of sun is wasted now. Nothing can use or store it.</div>
            <RealTerm>curtailment</RealTerm>
          </div>
        )}
        {id === 'city' && <div className="small" style={{ marginTop: 4 }}>Click a district to see what it uses.</div>}
        {sources.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sources.map((src) => (
              <SafeBoundary key={src} name={`PlantControls ${src}`}>
                <PlantControls source={src} compact />
              </SafeBoundary>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {st.inside && (
            <Button primary onClick={() => openInside(st.inside!)}>
              Look inside
            </Button>
          )}
          {(id === 'batteryFactory' || id === 'industry') && (
            <Button primary onClick={() => openTool(id)}>
              Open
            </Button>
          )}
          {id === 'reactor' && <Button onClick={() => openTool('reactorRow')}>Reactor Row</Button>}
        </div>
      </div>
    </div>
  );
}
