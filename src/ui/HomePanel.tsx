// The one control panel: status, place, season, time and power switches.
import { Fragment, useEffect, useRef, useState } from 'react';
import { POWER_BY_ENV, POWER_STATION, SEASONS, useApp, type PlaceChoice, type PowerId, type Season, type TourId } from '../store';
import { BATTERIES, BATTERY_TYPES, batterySpec } from '../batteries';
import { sunPosition } from '../engine/sun';
import { Icon, IconButton, Segmented, Slider, Switch } from './kit';
import { DARK_COLOR, POWER_COLOR, POWER_HINT, POWER_LABEL, clock, useSummary } from './power';
import { TOURS } from './tours';

const SEASON_LABEL: Record<Season, string> = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };
const MIX_ORDER: PowerId[] = ['solar', 'wind', 'battery', 'nuclear', 'gas'];

export default function HomePanel() {
  useSpaceToPlay();
  return (
    <aside className="panel home" aria-label="Controls">
      <Header />
      <Status />
      <Place />
      <SeasonRow />
      <Time />
      <Power />
    </aside>
  );
}

function useSpaceToPlay() {
  const togglePlay = useApp((s) => s.togglePlay);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const textInput = tag === 'INPUT' && (el as HTMLInputElement).type !== 'range';
      if (textInput || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      e.preventDefault();
      if (tag === 'BUTTON') (el as HTMLButtonElement).blur();
      togglePlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);
}

function Header() {
  const reset = useApp((s) => s.reset);
  const startTour = useApp((s) => s.startTour);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  const pick = (id: TourId) => { setOpen(false); startTour(id); };

  return (
    <div className="home-head">
      <div className="home-title">The Length of the Night</div>
      <div className="tour-menu" ref={ref}>
        <button className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>Tours</button>
        {open && (
          <div className="panel tour-menu-list" role="menu">
            {Object.values(TOURS).map((t) => (
              <button key={t.id} role="menuitem" onClick={() => pick(t.id)}>{t.title}</button>
            ))}
          </div>
        )}
      </div>
      <IconButton label="Reset" onClick={reset}><Icon name="reset" /></IconButton>
    </div>
  );
}

function Status() {
  const env = useApp((s) => s.env);
  const timeOfDay = useApp((s) => s.timeOfDay);
  const batteryOn = useApp((s) => s.on.battery);
  const sum = useSummary();
  const running = MIX_ORDER.filter((p) => (sum.mixNow[p] ?? 0) > 0.005);
  const litHours = sum.slots.filter((x) => x.lit).length;

  return (
    <section className="home-sec">
      <div className={`status ${sum.litNow ? 'on' : 'off'}`}>
        <span className="status-dot" />
        {sum.litNow ? 'Lights on' : 'Blackout'}
      </div>

      <div className="label">Power now</div>
      <div className="bar" aria-hidden>
        {running.map((p) => (
          <span key={p} style={{ width: `${(sum.mixNow[p] ?? 0) * 100}%`, background: POWER_COLOR[p] }} />
        ))}
      </div>
      <div className="small muted num">
        {running.length ? running.map((p) => `${POWER_LABEL[p]} ${Math.round((sum.mixNow[p] ?? 0) * 100)}%`).join(' · ') : 'Nothing running'}
      </div>

      <div className="label">{env === 'earth' ? 'Today' : 'This Moon day'}</div>
      <div className="strip" role="img" aria-label={env === 'earth' ? `Lit ${litHours} of 24 hours` : `Lit ${Math.round(sum.litShare * 100)}% of the Moon day`}>
        {sum.slots.map((x, k) => (
          <span key={k} style={{ background: x.lit && x.main ? POWER_COLOR[x.main] : DARK_COLOR }} />
        ))}
        <i className="strip-now" style={{ left: `${(timeOfDay / 24) * 100}%` }} />
      </div>
      <div className="strip-labels xsmall faint">
        {env === 'earth' ? (
          <><span>00:00</span><span>24:00</span></>
        ) : (
          <><span className="at" style={{ left: '25%' }}>Sunrise</span><span className="at" style={{ left: '75%' }}>Sunset</span></>
        )}
      </div>
      <div className="small num">
        {env === 'earth' ? `Lit ${litHours} of 24 hours today` : `Lit ${Math.round(sum.litShare * 100)}% of this Moon day`}
      </div>

      {batteryOn && (
        <div className="batt">
          <div className="bar thin" aria-hidden>
            <span style={{ width: `${sum.batteryNow * 100}%`, background: POWER_COLOR.battery }} />
          </div>
          <span className="small num">Battery {Math.round(sum.batteryNow * 100)}%</span>
        </div>
      )}
      {(sum.mixNow.gas ?? 0) > 0.005 && <div className="small gas-line">Burning gas</div>}
    </section>
  );
}

function Place() {
  const place = useApp((s): PlaceChoice => (s.env === 'earth' ? 'earth' : s.moonSite === 'pole' ? 'moonPole' : 'moonEquator'));
  const setPlace = useApp((s) => s.setPlace);
  return (
    <section className="home-sec">
      <span className="label">Place</span>
      <Segmented label="Place" value={place} onChange={setPlace}
        options={[{ value: 'earth', label: 'Earth' }, { value: 'moonEquator', label: 'Moon equator' }, { value: 'moonPole', label: 'Moon pole' }]} />
    </section>
  );
}

function SeasonRow() {
  const env = useApp((s) => s.env);
  const season = useApp((s) => s.season);
  const setSeason = useApp((s) => s.setSeason);
  return (
    <section className="home-sec">
      <span className="label">Season</span>
      {env === 'earth' ? (
        <Segmented label="Season" value={season} onChange={setSeason}
          options={SEASONS.map((s) => ({ value: s, label: SEASON_LABEL[s] }))} />
      ) : (
        <div className="small muted">The Moon has no seasons.</div>
      )}
    </section>
  );
}

function Time() {
  const env = useApp((s) => s.env);
  const t = useApp((s) => s.timeOfDay);
  const playing = useApp((s) => s.playing);
  const togglePlay = useApp((s) => s.togglePlay);
  const setTimeOfDay = useApp((s) => s.setTimeOfDay);
  const day = useApp((s) => sunPosition(s.input.place, s.hourOfYear).elevationDeg > 0);

  return (
    <section className="home-sec">
      <div className="row">
        <span className="label">Time</span>
        <span className="small num">{env === 'earth' ? `${clock(t)} · ${day ? 'Day' : 'Night'}` : day ? 'Day' : 'Night'}</span>
      </div>
      <div className="row">
        <IconButton label={playing ? 'Pause' : 'Play'} onClick={togglePlay}><Icon name={playing ? 'pause' : 'play'} /></IconButton>
        <Slider label="Time of day" min={0} max={24} step={0.25} value={t} onChange={(v) => setTimeOfDay(Math.min(v, 23.99))} />
      </div>
      {env === 'moon' && <div className="xsmall muted">A Moon day lasts about a month.</div>}
    </section>
  );
}

function Power() {
  const env = useApp((s) => s.env);
  const on = useApp((s) => s.on);
  const setOn = useApp((s) => s.setOn);
  const selected = useApp((s) => s.selectedStation);
  const selectStation = useApp((s) => s.selectStation);

  return (
    <section className="home-sec">
      <span className="label">Power</span>
      {POWER_BY_ENV[env].map((p) => (
        <Fragment key={p}>
          <div className={`power-row ${selected === POWER_STATION[p] ? 'sel' : ''}`}>
            <span className="dot" style={{ background: POWER_COLOR[p] }} />
            <button className="power-name" onClick={() => selectStation(POWER_STATION[p])} title="Show in the city">
              <span>{POWER_LABEL[p]}</span>
              <span className="xsmall muted">{POWER_HINT[p]}</span>
            </button>
            <Switch label={POWER_LABEL[p]} checked={on[p]} onChange={(v) => setOn(p, v)} />
          </div>
          {p === 'battery' && on.battery && <BatteryType />}
        </Fragment>
      ))}
    </section>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <span className="hp-meter" role="img" aria-label={`${label} ${value} of 3`}>
      <span>{label}</span>
      {[1, 2, 3].map((k) => <i key={k} className={k <= value ? 'on' : ''} />)}
    </span>
  );
}

function BatteryType() {
  const type = useApp((s) => s.batteryType);
  const setType = useApp((s) => s.setBatteryType);
  const future = useApp((s) => s.future);
  const info = BATTERIES[type];
  const spec = batterySpec(type, future);
  const improved = future.cost || future.life || future.longDuration || future.supply;
  return (
    <div className="hp-batt">
      <Segmented label="Battery type" value={type} onChange={setType}
        options={BATTERY_TYPES.map((t) => ({ value: t, label: BATTERIES[t].short }))} />
      <div className="hp-batt-name small">
        {info.name}
        {improved && <span className="hp-tag xsmall">2035 batteries</span>}
      </div>
      <div className="xsmall muted">{info.line}</div>
      <div className="hp-meters xsmall">
        <Meter label="Cost" value={info.ratings.cost} />
        <Meter label="Lifespan" value={info.ratings.life} />
        <Meter label="Safety" value={info.ratings.safety} />
        <Meter label="Supply" value={spec.supply} />
      </div>
      <div className="xsmall num">Holds {Math.round(spec.gwh)} GWh · returns {Math.round(spec.efficiency * 100)}%</div>
    </div>
  );
}
