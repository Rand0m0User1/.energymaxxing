// Right-side panel: Power plants | City demand | Settings. Becomes a collapsible bottom sheet under 900 px.
import { useEffect, useRef, useState } from 'react';
import { useApp, controlVisible } from '../store';
import { Button } from './kit';
import { Fact } from './Fact';
import { PlantControls } from './PlantCard';
import DemandPanel from './DemandPanel';
import SettingsPanel from './SettingsPanel';
import { UIIcon } from './icons';
import { useNarrow } from './live';
import { SOURCE_IDS, type SourceId, type StationId } from '../types';
import { PLACES } from '../data/places';
import './ui.css';

type Tab = 'plants' | 'demand' | 'settings';
const TAB_LABELS: Record<Tab, string> = { plants: 'Power plants', demand: 'City demand', settings: 'Settings' };

const STATION_SOURCE: Partial<Record<StationId, SourceId>> = {
  solar: 'solar', battery: 'battery', reactor: 'fission', fusion: 'fusion', wind: 'wind', gas: 'gas', hydro: 'hydro',
};

function PlantCardShell({ source }: { source: SourceId }) {
  const setHighlight = useApp((s) => s.setHighlightSource);
  const hl = useApp((s) => s.highlightSource === source);
  const visible = useApp((s) => controlVisible(s, source));
  if (!visible) return null;
  return (
    <div id={`plant-card-${source}`} className={`plant-card ${hl ? 'hl' : ''}`}
      onMouseEnter={() => setHighlight(source)} onMouseLeave={() => setHighlight(null)}
      onFocus={() => setHighlight(source)} onBlur={() => setHighlight(null)}>
      <PlantControls source={source} />
    </div>
  );
}

function PlantsTab({ showOverbuild, anySource }: { showOverbuild: boolean; anySource: boolean }) {
  const buildLikeHandmer = useApp((s) => s.buildLikeHandmer);
  const offEarth = useApp((s) => PLACES[s.input.place]?.body !== 'earth');
  return (
    <div>
      {offEarth && (
        <div className="pp-offworld">
          This base runs the same engine as the city, at the same size, so you can compare. The Beyond Earth panel shows the numbers per kilowatt.
        </div>
      )}
      {anySource && <div className="pp-units">GW is how fast power flows. GWh is how much energy is stored.</div>}
      {SOURCE_IDS.map((s) => <PlantCardShell key={s} source={s} />)}
      {showOverbuild && (
        <div className="handmer">
          <Button onClick={buildLikeHandmer} ariaLabel="Build like Casey Handmer: lots of solar and a big battery">Build like Casey Handmer</Button>
          <div className="note" style={{ marginTop: 6 }}>
            Build solar about <Fact k="uiHandmerSolarMultiple" format={(v) => `${v} times`} /> what the city uses on average, plus a big battery. Then see if the nights are covered.
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlantPanel() {
  const vis = useApp((s) => s.visibleControls);
  const selectedStation = useApp((s) => s.selectedStation);
  const narrow = useNarrow();
  const [tab, setTab] = useState<Tab>('plants');
  const [sheetOpen, setSheetOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const all = vis === 'all';
  const has = (k: Parameters<typeof controlVisible>[1]) => all || (vis as string[]).includes(k);
  const anySource = SOURCE_IDS.some((s) => has(s));
  const showOverbuild = has('overbuild');
  const showDemand = has('demand') || has('scenario') || has('flexLoad');
  // In lessons the Settings tab appears only when the step asks for the cost controls.
  const showSettings = all || has('advancedCosts');
  const tabs: Tab[] = [];
  if (anySource || showOverbuild) tabs.push('plants');
  if (showDemand) tabs.push('demand');
  if (showSettings) tabs.push('settings');
  // Show every tab that has something visible in it; tabs with no visible controls are left out.
  const showTabRow = has('tabs') || all || tabs.length > 1;
  const active: Tab | undefined = tabs.includes(tab) ? tab : tabs[0];

  // Clicking a plant in the world brings its card into view.
  useEffect(() => {
    const src = selectedStation ? STATION_SOURCE[selectedStation] : undefined;
    if (!src) return;
    setTab('plants');
    setSheetOpen(true);
    const id = window.setTimeout(() => {
      document.getElementById(`plant-card-${src}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 30);
    return () => window.clearTimeout(id);
  }, [selectedStation]);

  if (!active) return null;
  const collapsed = narrow && !sheetOpen;

  return (
    <aside className={`panel plant-panel ${collapsed ? 'collapsed' : ''} ${all ? '' : 'fit'}`} aria-label="Power plants and city controls">
      <div className="pp-head" role={showTabRow && tabs.length > 1 ? 'tablist' : undefined}>
        {(showTabRow ? tabs : [active]).map((t) => (
          <button key={t} className="pp-tab" role={showTabRow && tabs.length > 1 ? 'tab' : undefined}
            aria-selected={t === active}
            onClick={() => { setTab(t); setSheetOpen(true); }}>
            {TAB_LABELS[t]}
          </button>
        ))}
        <button className="icon-btn pp-toggle" style={{ width: 28, height: 28 }} onClick={() => setSheetOpen(!sheetOpen)}
          aria-label={collapsed ? 'Show controls' : 'Hide controls'} aria-expanded={!collapsed}>
          <UIIcon name={collapsed ? 'chevronUp' : 'chevronDown'} />
        </button>
      </div>
      <div className="pp-body" ref={bodyRef} role={showTabRow && tabs.length > 1 ? 'tabpanel' : undefined}>
        {active === 'plants' && <PlantsTab showOverbuild={showOverbuild} anySource={anySource} />}
        {active === 'demand' && <DemandPanel />}
        {active === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  );
}
