// Inside-view router: full-screen overlay with a 56 px header and the cutaway for store.inside.
import { Component, Suspense, type ReactNode } from 'react';
import { useApp } from '../store';
import { Button, Icon } from '../ui/kit';
import { SOURCE_COLORS } from '../data/colors';
import { stepIndex } from '../engine/timeIndex';
import type { GenId, InsideViewId, SourceId } from '../types';
import ReactorInside from './reactor/ReactorInside';
import SolarInside from './solar/SolarInside';
import BatteryInside from './battery/BatteryInside';
import FusionInside from './fusion/FusionInside';
import WindInside from './wind/WindInside';
import GasInside from './gas/GasInside';
import HydroInside from './hydro/HydroInside';
import './inside.css';

const META: Record<InsideViewId, { title: string; source: SourceId }> = {
  solar: { title: 'Inside the solar farm', source: 'solar' },
  battery: { title: 'Inside the battery yard', source: 'battery' },
  reactor: { title: 'Inside the reactor', source: 'fission' },
  fusion: { title: 'Inside the fusion lab', source: 'fusion' },
  wind: { title: 'Inside a wind turbine', source: 'wind' },
  gas: { title: 'Inside the gas plant', source: 'gas' },
  hydro: { title: 'Hydro dam and geothermal well', source: 'hydro' },
};

class ViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.error('Inside view failed', err); }
  render() {
    if (this.state.failed) return <div className="inside-error">This view could not load. Go back to the island and try again.</div>;
    return this.props.children;
  }
}

/** "Making 0.42 GW now" from the live simulation. Isolated so hour ticks re-render only this line. */
function LiveNow({ source }: { source: SourceId }) {
  const result = useApp((s) => s.result);
  const hour = useApp((s) => s.hourOfYear);
  const on = useApp((s) => (source === 'battery' ? s.input.battery.on : s.input.plants[source as GenId]?.on ?? false));
  if (!on) return <span className="live">Switched off on the island</span>;
  if (!result || !result.steps) return null;
  const i = stepIndex(result, hour);
  if (source === 'battery') {
    const net = (result.batteryDischarge?.[i] ?? 0) - (result.batteryCharge?.[i] ?? 0);
    if (Math.abs(net) < 0.005) return <span className="live num">Resting right now</span>;
    return <span className="live num">{net > 0 ? 'Giving' : 'Storing'} {Math.abs(net).toFixed(2)} GW now</span>;
  }
  let gw = result.supply?.[source as GenId]?.[i] ?? 0;
  if (source === 'hydro') gw += result.supply?.geothermal?.[i] ?? 0;
  if (!isFinite(gw)) gw = 0;
  return <span className="live num">Making {gw.toFixed(2)} GW now</span>;
}

function Body({ id }: { id: InsideViewId }) {
  switch (id) {
    case 'reactor': return <div className="inside-fill"><ReactorInside /></div>;
    case 'solar': return <SolarInside />;
    case 'battery': return <BatteryInside />;
    case 'fusion': return <FusionInside />;
    case 'wind': return <WindInside />;
    case 'gas': return <GasInside />;
    case 'hydro': return <HydroInside />;
  }
}

export default function InsideView() {
  const inside = useApp((s) => s.inside);
  const closeInside = useApp((s) => s.closeInside);
  if (!inside) return null;
  const meta = META[inside];
  return (
    <div className="inside-root" role="dialog" aria-modal="true" aria-label={meta.title}>
      <header className="inside-header">
        <span className="dot" style={{ background: SOURCE_COLORS[meta.source], width: 12, height: 12 }} aria-hidden />
        <h2>{meta.title}</h2>
        <LiveNow source={meta.source} />
        <span className="spacer" />
        <Button onClick={closeInside} ariaLabel="Back to the island (Esc)">
          <Icon name="close" size={14} /> Back to the island
        </Button>
      </header>
      <div className="inside-body">
        <ViewBoundary key={inside}>
          <Suspense fallback={null}>
            <Body id={inside} />
          </Suspense>
        </ViewBoundary>
      </div>
    </div>
  );
}
