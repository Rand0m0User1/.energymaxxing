// Controls for one power source: on/off, size, live output, schedule. Used by the plant panel and the world's floating card.
import { useApp, useControlVisible } from '../store';
import { Segmented, Slider, Switch, RealTerm } from './kit';
import { Fact } from './Fact';
import { PaintStrip, Legend, type PaintState } from './PaintStrip';
import { at, fmtGW, fmtPct, todayShare, useLive } from './live';
import { SOURCE_COLORS, SOURCE_LABELS } from '../data/colors';
import { PLACES, type Place } from '../data/places';
import { fv } from '../data/facts';
import type { GenId, SourceId } from '../types';
import './ui.css';

/** Slider maximum (GW) per generator. Hydro and geothermal depend on the place. */
const MAX_GW: Record<GenId, number> = { solar: 12, wind: 4, fission: 3, geothermal: 0.05, hydro: 0.05, gas: 2, fusion: 2 };
export const BATTERY_MAX_GW = 4;
export const BATTERY_MAX_GWH = 60;

export interface PlantRange { max: number; step: number; available: boolean; reason: 'none' | 'place' | 'year' | 'wind' }

export function plantRange(g: GenId, place: Place, year: number): PlantRange {
  let max = MAX_GW[g];
  let available = true;
  let reason: PlantRange['reason'] = 'none';
  if (g === 'geothermal') { max = Math.max(0.05, place.geothermalMaxGW); available = place.geothermalMaxGW > 0; reason = available ? 'none' : 'place'; }
  if (g === 'hydro') { max = Math.max(0.05, place.hydroMaxGW); available = place.hydroMaxGW > 0; reason = available ? 'none' : 'place'; }
  if (g === 'fusion' && year < fv('fusionMinYear')) { available = false; reason = 'year'; }
  if (g === 'wind' && place.body !== 'earth') { available = false; reason = 'wind'; }
  const step = max <= 0.5 ? 0.01 : 0.1;
  return { max, step, available, reason };
}

export function isDispatchable(g: GenId, fissionFlexible: boolean): boolean {
  return g === 'gas' || g === 'hydro' || g === 'fusion' || (g === 'fission' && fissionFlexible);
}

export function PlantControls({ source, compact }: { source: SourceId; compact?: boolean }) {
  if (source === 'battery') return <BatteryControls compact={compact} />;
  return <GenControls g={source} compact={compact} />;
}

function Head({ source, on, onToggle, tag }: { source: SourceId; on: boolean | null; onToggle: (v: boolean) => void; tag?: string }) {
  return (
    <div className="plant-head">
      <span className="dot" style={{ background: SOURCE_COLORS[source] }} aria-hidden="true" />
      <span className="plant-name">{SOURCE_LABELS[source]}</span>
      {tag && <span className="tag-assumption">{tag}</span>}
      <span className="grow" />
      {on !== null && <Switch checked={on} onChange={onToggle} label={`${SOURCE_LABELS[source]}: on or off`} />}
    </div>
  );
}

function GenControls({ g, compact }: { g: GenId; compact?: boolean }) {
  const visible = useControlVisible(g);
  const plant = useApp((s) => s.input.plants[g]);
  const setPlant = useApp((s) => s.setPlant);
  const place = useApp((s) => PLACES[s.input.place]);
  const year = useApp((s) => s.input.year);
  const fissionFlexible = useApp((s) => s.input.fissionFlexible);
  if (!visible || !plant) return null;
  const range = plantRange(g, place, year);
  const label = SOURCE_LABELS[g];

  return (
    <div className="plant-ctl">
      <Head source={g} on={range.available ? plant.on : null} onToggle={(on) => setPlant(g, { on })}
        tag={g === 'fusion' ? 'Speculative' : undefined} />
      {range.available ? (
        <>
          <div className="row">
            <Slider value={Math.min(plant.gw, range.max)} min={0} max={range.max} step={range.step}
              onChange={(gw) => setPlant(g, gw > 0 ? { gw, on: true } : { gw })} label={`${label} size in gigawatts`} />
            <span className="val">{fmtGW(plant.gw, range.step < 0.1 ? 2 : 1)}</span>
          </div>
          {plant.on ? <LiveGen g={g} /> : <div className="plant-live">Switched off.</div>}
          {!compact && g === 'solar' && <SolarCF />}
          {!compact && isDispatchable(g, fissionFlexible) && <ScheduleControl g={g} />}
        </>
      ) : (
        <div className="note">
          {range.reason === 'place' && 'Not available here.'}
          {range.reason === 'wind' && 'No wind to use here.'}
          {range.reason === 'year' && (
            <>Speculative. Not available before <Fact k="fusionMinYear" format={(v) => String(v)} />. Change the year in Settings.</>
          )}
        </div>
      )}
    </div>
  );
}

function LiveGen({ g }: { g: GenId }) {
  const now = useLive((r, i) => at(r.supply?.[g], i));
  const share = useApp((s) => Math.round(todayShare(s.result, s.hourOfYear, g) * 100) / 100);
  return (
    <div className="plant-live">
      Making <b>{fmtGW(now)}</b> now · <b>{fmtPct(share)}</b> of today's power
    </div>
  );
}

function SolarCF() {
  const cf = useApp((s) => s.result.totals?.capacityFactor?.solar ?? 0);
  return (
    <div className="plant-sub">
      <div className="note">
        Over this year it makes <b className="num">{fmtPct(cf)}</b> of its maximum here. US average: <Fact k="solarCFUS" percent />.
      </div>
      <RealTerm>capacity factor</RealTerm>
    </div>
  );
}

function ScheduleControl({ g }: { g: GenId }) {
  const schedule = useApp((s) => s.input.plants[g].schedule);
  const setPlant = useApp((s) => s.setPlant);
  const states: PaintState[] = [
    { color: 'var(--line-strong)', label: 'Off' },
    { color: SOURCE_COLORS[g], label: 'Runs' },
  ];
  const values = schedule && schedule.length === 24 ? schedule.map((b) => (b ? 1 : 0)) : new Array(24).fill(0);
  return (
    <div className="plant-sub">
      <div className="row">
        <span className="label-sm">When does it run?</span>
        <span className="grow" />
        {schedule && <button className="linkish" onClick={() => setPlant(g, { schedule: null })}>Back to automatic</button>}
      </div>
      <PaintStrip values={values} states={states} auto={!schedule}
        label={`${SOURCE_LABELS[g]} hours of the day it runs`}
        onChange={(v) => setPlant(g, { schedule: v.map((x) => x === 1) })} />
      <div className="note">{schedule ? 'Runs only in the painted hours.' : 'Automatic: runs when needed. Click hours to paint your own.'}</div>
    </div>
  );
}

const BATTERY_STATES: PaintState[] = [
  { color: 'var(--line-strong)', label: 'Idle' },
  { color: SOURCE_COLORS.solar, label: 'Charge' },
  { color: SOURCE_COLORS.battery, label: 'Release' },
];
const toIdx = (v: -1 | 0 | 1) => (v === 1 ? 1 : v === -1 ? 2 : 0);
const fromIdx = (i: number): -1 | 0 | 1 => (i === 1 ? 1 : i === 2 ? -1 : 0);
function defaultBatterySchedule(): (-1 | 0 | 1)[] {
  return Array.from({ length: 24 }, (_, h) => (h >= 9 && h < 16 ? 1 : h >= 18 || h < 6 ? -1 : 0));
}

function BatteryControls({ compact }: { compact?: boolean }) {
  const visible = useControlVisible('battery');
  const b = useApp((s) => s.input.battery);
  const setBattery = useApp((s) => s.setBattery);
  if (!visible || !b) return null;
  const exGW = fv('uiBatteryExampleGW');
  const exGWh = fv('uiBatteryExampleGWh');
  const exH = exGW > 0 ? exGWh / exGW : 0;

  return (
    <div className="plant-ctl">
      <Head source="battery" on={b.on} onToggle={(on) => setBattery({ on })} />
      <div className="plant-sub">
        <span className="label-sm">Power (GW, how fast)</span>
        <div className="row">
          <Slider value={Math.min(b.gw, BATTERY_MAX_GW)} min={0} max={BATTERY_MAX_GW} step={0.1} onChange={(gw) => setBattery({ gw })}
            label="Battery power in gigawatts, how fast" />
          <span className="val">{fmtGW(b.gw, 1)}</span>
        </div>
      </div>
      <div className="plant-sub">
        <span className="label-sm">Energy (GWh, how much)</span>
        <div className="row">
          <Slider value={Math.min(b.gwh, BATTERY_MAX_GWH)} min={0} max={BATTERY_MAX_GWH} step={1} onChange={(gwh) => setBattery({ gwh })}
            label="Battery energy in gigawatt-hours, how much" />
          <span className="val">{b.gwh.toFixed(0)} GWh</span>
        </div>
      </div>
      {!compact && (
        <div className="note">
          Power is how fast it can push energy out. Energy is how much it holds. A {exGW} GW, {exGWh} GWh battery can run {exGW} GW for {exH} hours.
        </div>
      )}
      {b.on ? <LiveBattery gwh={b.gwh} /> : <div className="plant-live">Switched off.</div>}
      {!compact && (
        <div className="plant-sub">
          <span className="label-sm">Battery rule</span>
          <div className="seg-stack">
          <Segmented<'auto' | 'schedule'>
            value={b.mode}
            label="Battery rule"
            options={[{ value: 'auto', label: 'Store extra sun, release at night' }, { value: 'schedule', label: 'Paint my own schedule' }]}
            onChange={(mode) => setBattery(mode === 'schedule' && !b.schedule ? { mode, schedule: defaultBatterySchedule() } : { mode })}
          />
          </div>
          {b.mode === 'schedule' && (
            <>
              <PaintStrip
                values={(b.schedule && b.schedule.length === 24 ? b.schedule : defaultBatterySchedule()).map(toIdx)}
                states={BATTERY_STATES}
                label="Battery schedule: charge, idle or release for each hour"
                onChange={(v) => setBattery({ schedule: v.map(fromIdx) })}
              />
              <Legend states={BATTERY_STATES} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LiveBattery({ gwh }: { gwh: number }) {
  const soc = useLive((r, i) => at(r.soc, i));
  const out = useLive((r, i) => at(r.batteryDischarge, i));
  const inn = useLive((r, i) => at(r.batteryCharge, i));
  const share = useApp((s) => Math.round(todayShare(s.result, s.hourOfYear, 'battery') * 100) / 100);
  const full = gwh > 0 ? Math.max(0, Math.min(1, soc / gwh)) : 0;
  return (
    <div className="plant-live">
      <b>{fmtPct(full)}</b> full now ·{' '}
      {out > 0.005 ? <>releasing <b>{fmtGW(out)}</b></> : inn > 0.005 ? <>charging <b>{fmtGW(inn)}</b></> : 'resting'}
      {' '}· <b>{fmtPct(share)}</b> of today's power
    </div>
  );
}
