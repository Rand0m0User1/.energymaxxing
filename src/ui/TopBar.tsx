// Top bar: home, place · date · clock, screen switcher, view and help buttons, and a spoken summary for screen readers.
import { useEffect, useState } from 'react';
import { useApp, useControlVisible } from '../store';
import { IconButton, Segmented } from './kit';
import { UIIcon } from './icons';
import { at, safeStep } from './live';
import { PLACES } from '../data/places';
import { SOURCE_LABELS } from '../data/colors';
import { formatClock, formatDate } from '../engine/timeIndex';
import type { SimResult } from '../engine/types';
import { GEN_IDS, type Screen, type SourceId } from '../types';
import './ui.css';

const SCREEN_TITLES: Record<Exclude<Screen, 'title'>, string> = {
  tour: 'Guided Tour', world: 'The World', lab: 'City Lab', beyond: 'Beyond Earth',
};

/** One plain sentence about the city right now, for the aria-live region. */
export function summarize(r: SimResult, hourOfYear: number): string {
  if (!r || !r.steps) return '';
  const i = safeStep(r, hourOfYear);
  const served = at(r.served, i);
  const unserved = at(r.unserved, i);
  const parts: string[] = [];
  parts.push(unserved > 0.001 ? `Some lights out. Short by ${unserved.toFixed(2)} GW.` : 'Lights on.');
  parts.push(`Using ${served.toFixed(2)} GW.`);
  if (served > 1e-6) {
    const shares: [SourceId, number][] = GEN_IDS.map((g) => [g, at(r.supply?.[g], i) / served] as [SourceId, number]);
    shares.push(['battery', at(r.batteryDischarge, i) / served]);
    const top = shares.filter(([, v]) => v >= 0.05).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) parts.push(top.map(([k, v]) => `${SOURCE_LABELS[k]} ${Math.round(Math.min(1, v) * 100)}%`).join(', ') + '.');
  }
  return parts.join(' ');
}

function LiveSummary() {
  const [text, setText] = useState('');
  useEffect(() => {
    const update = () => {
      const s = useApp.getState();
      if (s.screen === 'title') return;
      const t = summarize(s.result, s.hourOfYear);
      setText((prev) => (prev === t ? prev : t));
    };
    update();
    const id = window.setInterval(update, 2000);
    return () => window.clearInterval(id);
  }, []);
  return <div className="sr-only" aria-live="polite" aria-atomic="true">{text}</div>;
}

function Clock() {
  const date = useApp((s) => formatDate(s.hourOfYear));
  const clock = useApp((s) => formatClock(s.hourOfYear));
  return <span className="tb-date">{date} · {clock}</span>;
}

export default function TopBar() {
  const screen = useApp((s) => s.screen);
  const placeName = useApp((s) => PLACES[s.input.place]?.name ?? '');
  const cameraMode = useApp((s) => s.cameraMode);
  const setScreen = useApp((s) => s.setScreen);
  const setCameraMode = useApp((s) => s.setCameraMode);
  const setPlacePickerOpen = useApp((s) => s.setPlacePickerOpen);
  const openSources = useApp((s) => s.openSources);
  const setHelpOpen = useApp((s) => s.setHelpOpen);
  const showPlace = useControlVisible('place');
  const current = screen === 'title' ? 'world' : screen;

  return (
    <header className="panel topbar">
      <IconButton label="Back to the title screen" onClick={() => setScreen('title')}><UIIcon name="home" /></IconButton>
      <div className="tb-where">
        <span className="tb-place">{placeName}</span>
        <Clock />
        <h1 className="tb-title">{SCREEN_TITLES[current]}</h1>
      </div>
      <span className="grow" />
      <div className="tb-screens">
        <Segmented<Exclude<Screen, 'title'>>
          value={current}
          label="Choose a screen"
          options={[
            { value: 'tour', label: 'Tour' },
            { value: 'world', label: 'World' },
            { value: 'lab', label: 'City Lab' },
            { value: 'beyond', label: 'Beyond Earth' },
          ]}
          onChange={(s) => { if (s !== screen) setScreen(s); }}
        />
      </div>
      <span className="grow" />
      <span className="tb-scale">Not to scale</span>
      <div className="tb-actions">
        {showPlace && (
          <IconButton label="Choose a place" onClick={() => setPlacePickerOpen(true)}><UIIcon name="globe" /></IconButton>
        )}
        <IconButton label={cameraMode === 'map' ? 'Leave map view (M)' : 'Map view (M)'} active={cameraMode === 'map'}
          onClick={() => setCameraMode(cameraMode === 'map' ? 'orbit' : 'map')}><UIIcon name="map" /></IconButton>
        <IconButton label={cameraMode === 'walk' ? 'Stop walking' : 'Walk around (W A S D)'} active={cameraMode === 'walk'}
          onClick={() => setCameraMode(cameraMode === 'walk' ? 'orbit' : 'walk')}><UIIcon name="walk" /></IconButton>
        <IconButton label="Sources for every number" onClick={() => openSources(null)}><UIIcon name="book" /></IconButton>
        <IconButton label="Help and keyboard shortcuts (?)" onClick={() => setHelpOpen(true)}><UIIcon name="help" /></IconButton>
      </div>
      <LiveSummary />
    </header>
  );
}
