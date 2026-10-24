// The four ways batteries are improving, and what they do for the city.
import { useMemo, type ReactNode } from 'react';
import { useApp, buildInput, hourFor, type Env, type MoonSite, type PowerId, type Season } from '../store';
import { BATTERIES, batterySpec, NO_FUTURE, type BatteryType, type FutureBatteries } from '../batteries';
import { simulate } from '../engine/simulate';
import { summarize } from '../sim';
import { SOURCE_COLORS } from '../data/colors';
import { Switch } from '../ui/kit';

const SWITCHES: { key: keyof FutureBatteries; title: string; line: string }[] = [
  { key: 'cost', title: 'Cheaper to build', line: 'cheaper materials and factories' },
  { key: 'life', title: 'Longer life', line: 'lasts twice as many years' },
  { key: 'longDuration', title: 'Long-duration storage', line: 'holds energy for days' },
  { key: 'supply', title: 'More diverse supply', line: 'less reliance on a few countries' },
];

const SOLAR_BATTERY: Record<PowerId, boolean> = { solar: true, wind: false, battery: true, nuclear: false, gas: false };

const PLACES: { label: string; env: Env; site: MoonSite; season: Season }[] = [
  { label: 'Moon pole', env: 'moon', site: 'pole', season: 'summer' },
  { label: 'Moon equator', env: 'moon', site: 'equator', season: 'summer' },
  { label: 'Earth in winter', env: 'earth', site: 'equator', season: 'winter' },
];

function litShares(type: BatteryType, future: FutureBatteries): number[] {
  return PLACES.map((p) => {
    const input = buildInput(p.env, SOLAR_BATTERY, { moonSite: p.site, batteryType: type, future });
    return summarize(simulate(input), p.env, p.season, hourFor(p.env, p.season, 12), input.battery.gwh).litShare;
  });
}

function Dots({ n }: { n: number }) {
  return <span className="demo-dots" aria-label={`${n} of 3`}>{[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function BatteryFuture() {
  const type = useApp((s) => s.batteryType);
  const future = useApp((s) => s.future);
  const setFuture = useApp((s) => s.setFuture);

  const before = batterySpec(type, NO_FUTURE);
  const after = batterySpec(type, future);
  const today = useMemo(() => litShares(type, NO_FUTURE), [type]);
  const withFuture = useMemo(() => litShares(type, future), [type, future]);

  const rows: { label: string; a: ReactNode; b: ReactNode; better: boolean }[] = [
    { label: 'Cost ($ per kWh)', a: `$${Math.round(before.costPerKWh)}`, b: `$${Math.round(after.costPerKWh)}`, better: after.costPerKWh < before.costPerKWh },
    { label: 'Years of life', a: Math.round(before.lifeYears), b: Math.round(after.lifeYears), better: after.lifeYears > before.lifeYears },
    { label: 'Storage (GWh)', a: Math.round(before.gwh), b: Math.round(after.gwh), better: after.gwh > before.gwh },
    { label: 'Supply', a: <Dots n={before.supply} />, b: <Dots n={after.supply} />, better: after.supply > before.supply },
  ];

  return (
    <>
      <div className="demo-section">
        {SWITCHES.map((s) => (
          <div className="demo-switch" key={s.key}>
            <Switch checked={future[s.key]} onChange={(v) => setFuture({ [s.key]: v })} label={s.title} />
            <span><b>{s.title}:</b> <span className="muted">{s.line}</span></span>
          </div>
        ))}
      </div>

      <div className="demo-section">
        <h3>{BATTERIES[type].name}</h3>
        <table className="demo-table">
          <thead><tr><th></th><th>Today</th><th>With these changes</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="num">{r.a}</td>
                <td className={`num ${r.better ? 'better' : ''}`}>{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="demo-section">
        <h3>Effect on the city</h3>
        <p className="small muted">Share of the day with the lights on, with solar and batteries.</p>
        <div className="demo-effect">
          {PLACES.map((p, i) => (
            <Effect key={p.label} label={p.label} a={today[i]} b={withFuture[i]} />
          ))}
        </div>
        <div className="demo-legend">
          <span className="dot" style={{ background: 'var(--ink-3)' }} /> Today
          <span className="dot" style={{ background: SOURCE_COLORS.battery, marginLeft: 8 }} /> With these changes
        </div>
      </div>

      <p className="demo-close-line">Batteries move energy in time. They cannot make it. Better batteries help with short gaps, not a dark winter.</p>
    </>
  );
}

function Effect({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <>
      <span>{label}</span>
      <span className="demo-bars">
        <span className="demo-bar"><span style={{ width: pct(a), background: 'var(--ink-3)' }} /></span>
        <span className="demo-bar"><span style={{ width: pct(b), background: SOURCE_COLORS.battery }} /></span>
      </span>
      <span className="num">{pct(a)} → {pct(b)}</span>
    </>
  );
}
