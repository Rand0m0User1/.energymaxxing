// Live dashboard (SPEC §2.5, §9.6, §9.7). Bottom-left, collapsible to a one-line strip.
// During a lesson it becomes a compact strip at the bottom centre, clear of the lesson card.
// The shell subscribes only to layout flags; each child subscribes to the narrow slice it needs.
import { useApp, useControlVisible, type AppState } from '../../store';
import { SOURCE_IDS } from '../../types';
import { IconButton, Icon, Panel } from '../kit';
import { BigNumber, NowBar, BatteryGauge } from './NowPanels';
import AreaChart from './AreaChart';
import Scorecards from './Scorecards';
import Compare from './Compare';
import CompactStats from './Compact';
import './dashboard.css';

function Chevron({ dir }: { dir: 'up' | 'down' }) {
  return (
    <span style={{ display: 'inline-flex', transform: `rotate(${dir === 'down' ? 90 : -90}deg)` }}>
      <Icon name="chevron" size={16} />
    </span>
  );
}

const PANEL_KEYS: readonly string[] = [...SOURCE_IDS, 'overbuild', 'demand', 'scenario', 'flexLoad'];

/** Mirrors PlantPanel's own rule: it hides only in a lesson step that shows none of its controls. */
function plantPanelShown(s: AppState): boolean {
  if (s.visibleControls === 'all' || s.screen !== 'tour') return true;
  const keys = s.visibleControls as readonly string[];
  return PANEL_KEYS.some((k) => keys.includes(k));
}

export default function Dashboard() {
  const visible = useControlVisible('dashboard');
  const compareVisible = useControlVisible('compare');
  const open = useApp((s) => s.dashboardOpen);
  const setOpen = useApp((s) => s.setDashboardOpen);
  const presenter = useApp((s) => s.presenter);
  const lessonMode = useApp((s) => s.screen === 'tour' && s.lesson != null);
  const plants = useApp(plantPanelShown);

  if (!visible) return null;
  const cls = `dash ${presenter ? 'dash-presenter' : ''} ${plants ? 'dash-has-plants' : 'dash-no-plants'}`;

  if (!open) {
    return (
      <Panel className={`${cls} dash-collapsed`} pad={false} role="region" aria-label="Live dashboard (collapsed)">
        <BigNumber compact />
        <IconButton label="Open the dashboard" onClick={() => setOpen(true)}><Chevron dir="up" /></IconButton>
      </Panel>
    );
  }

  if (lessonMode) {
    return (
      <Panel className={`${cls} dash-compact`} pad={false} role="region" aria-label="Live dashboard">
        <div className="dash-compact-body">
          <div className="dash-c-now">
            <BigNumber />
            <NowBar />
          </div>
          <CompactStats />
          <div className="dash-c-chart">
            <AreaChart compact />
          </div>
          <div className="dash-c-close">
            <IconButton label="Collapse the dashboard" onClick={() => setOpen(false)}><Chevron dir="down" /></IconButton>
          </div>
        </div>
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
