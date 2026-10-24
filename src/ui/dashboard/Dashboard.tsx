// Live dashboard (SPEC §2.5, §9.6, §9.7). Bottom-left, collapsible to a one-line strip.
// The shell subscribes only to layout flags; each child subscribes to the narrow slice it needs.
import { useApp, useControlVisible } from '../../store';
import { IconButton, Icon, Panel } from '../kit';
import { BigNumber, NowBar, BatteryGauge } from './NowPanels';
import AreaChart from './AreaChart';
import Scorecards from './Scorecards';
import Compare from './Compare';
import './dashboard.css';

function Chevron({ dir }: { dir: 'up' | 'down' }) {
  return (
    <span style={{ display: 'inline-flex', transform: `rotate(${dir === 'down' ? 90 : -90}deg)` }}>
      <Icon name="chevron" size={16} />
    </span>
  );
}

export default function Dashboard() {
  const visible = useControlVisible('dashboard');
  const compareVisible = useControlVisible('compare');
  const open = useApp((s) => s.dashboardOpen);
  const setOpen = useApp((s) => s.setDashboardOpen);
  const presenter = useApp((s) => s.presenter);

  if (!visible) return null;
  const cls = `dash ${presenter ? 'dash-presenter' : ''}`;

  if (!open) {
    return (
      <Panel className={`${cls} dash-collapsed`} pad={false} role="region" aria-label="Live dashboard (collapsed)">
        <BigNumber compact />
        <IconButton label="Open the dashboard" onClick={() => setOpen(true)}><Chevron dir="up" /></IconButton>
      </Panel>
    );
  }

  return (
    <Panel className={cls} pad={false} role="region" aria-label="Live dashboard">
      <div className="dash-scroll">
        <div className="dash-top">
          <BigNumber />
          <IconButton label="Collapse the dashboard" onClick={() => setOpen(false)}><Chevron dir="down" /></IconButton>
        </div>
        <div className="dash-now-row">
          <NowBar />
          <BatteryGauge />
        </div>
        <AreaChart />
        <Scorecards />
        {compareVisible && <Compare />}
      </div>
    </Panel>
  );
}
