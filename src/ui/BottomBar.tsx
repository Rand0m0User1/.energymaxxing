// Bottom bar: station tabs, play controls, time dial, season, weather, Reset All.
import { useApp, useControlVisible } from '../store';
import { Button, Slider } from './kit';
import PlayControls from './PlayControls';
import TimeDial from './TimeDial';
import { UIIcon } from './icons';
import { useDay } from './live';
import { STATIONS } from '../world/layout';
import { PLACES } from '../data/places';
import { formatDate, MONTH_NAMES, monthOf } from '../engine/timeIndex';
import { STATION_IDS, type StationId, type WeatherEventKind } from '../types';
import './ui.css';

const STATION_SHORT: Record<StationId, string> = {
  city: 'City', solar: 'Solar', battery: 'Battery', reactor: 'Reactor', fusion: 'Fusion',
  wind: 'Wind', gas: 'Gas', hydro: 'Hydro', batteryFactory: 'Factory', industry: 'Industry',
};

function StationTabs() {
  const target = useApp((s) => s.cameraTarget);
  const flyTo = useApp((s) => s.flyTo);
  return (
    <nav className="stations" aria-label="Jump to a place on the island">
      {STATION_IDS.map((id, i) => (
        <button key={id} className="st-tab" onClick={() => flyTo(id)} aria-current={target === id}
          aria-label={`${STATIONS[id]?.label ?? STATION_SHORT[id]} (key ${(i + 1) % 10})`} title={`${STATIONS[id]?.label ?? STATION_SHORT[id]} (${(i + 1) % 10})`}>
          <span className="st-num">{(i + 1) % 10}</span>
          <span className="st-label">{STATION_SHORT[id]}</span>
        </button>
      ))}
    </nav>
  );
}

// Northern-hemisphere day numbers (0-based) for solstices and equinoxes; flipped for southern places.
const SEASON_DAY = { winter: 354, spring: 79, summer: 171, autumn: 265 } as const;
type Season = keyof typeof SEASON_DAY;
const FLIP: Record<Season, Season> = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' };

function SeasonControl() {
  const visible = useControlVisible('season');
  const day = useDay();
  const placeId = useApp((s) => s.input.place);
  const setDayOfYear = useApp((s) => s.setDayOfYear);
  const place = PLACES[placeId];
  if (!visible || !place || place.body === 'orbit') return null;
  const south = (place.lat ?? 0) < 0;
  const go = (s: Season) => setDayOfYear(SEASON_DAY[south ? FLIP[s] : s]);
  return (
    <div className="season" role="group" aria-label="Season">
      <span className="season-date num" aria-hidden="true">{formatDate(day * 24)}</span>
      <Slider value={day} min={0} max={364} step={1} onChange={(d) => setDayOfYear(d)}
        label={`Day of the year: ${MONTH_NAMES[monthOf(day)]}`} />
      <div className="quick">
        {(['winter', 'spring', 'summer', 'autumn'] as Season[]).map((s) => (
          <Button key={s} ghost onClick={() => go(s)} ariaLabel={`Jump to ${s}`}>{s[0].toUpperCase() + s.slice(1)}</Button>
        ))}
      </div>
      <Button onClick={() => setDayOfYear(place.hardestDay)} ariaLabel="Jump to the hardest time of year for this place">Hardest case</Button>
    </div>
  );
}

const WEATHER_LABELS: Record<WeatherEventKind | 'clear', string> = {
  clear: 'Clear', cloudyDay: 'Cloudy day', cloudyWeek: 'Cloudy week', windlessWeek: 'Windless week', dustStorm: 'Dust storm',
};

function WeatherButtons() {
  const visible = useControlVisible('weather');
  const body = useApp((s) => PLACES[s.input.place]?.body);
  const events = useApp((s) => s.input.events);
  const addWeatherEvent = useApp((s) => s.addWeatherEvent);
  if (!visible || body === 'moon' || body === 'orbit') return null;
  const kinds: (WeatherEventKind | 'clear')[] = body === 'mars' ? ['clear', 'dustStorm'] : ['clear', 'cloudyDay', 'cloudyWeek', 'windlessWeek'];
  return (
    <div className="weather" role="group" aria-label="Weather from today">
      <span className="label-sm">Weather</span>
      {kinds.map((k) => {
        const active = k === 'clear' ? events.length === 0 : events.some((e) => e.kind === k);
        return (
          <Button key={k} active={active} onClick={() => addWeatherEvent(k)} ariaLabel={`${WEATHER_LABELS[k]}, starting today`}>
            {WEATHER_LABELS[k]}
          </Button>
        );
      })}
    </div>
  );
}

export default function BottomBar() {
  const resetAll = useApp((s) => s.resetAll);
  return (
    <footer className="panel bottombar" aria-label="Time, place and weather controls">
      <div className="bb-main">
        <div className="bb-row r1">
          <PlayControls />
          <div className="row grow" style={{ gap: 10 }}>
            <TimeDial />
          </div>
          <SeasonControl />
        </div>
        <div className="bb-row r2">
          <StationTabs />
          <span className="grow" />
          <WeatherButtons />
        </div>
      </div>
      <button className="reset-all" onClick={resetAll} aria-label="Reset all" title="Reset all">
        <UIIcon name="reset" size={20} />
      </button>
    </footer>
  );
}
