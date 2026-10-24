// Beyond Earth (SPEC §1 Q1 second half, §7 off-Earth rows, §8.3 Moon reactor, §9.3): cost turns into launch mass.
import { useApp } from '../store';
import { isAssumption, type FactKey } from '../data/facts';
import { PLACES } from '../data/places';
import { SOURCE_COLORS } from '../data/colors';
import type { PresetId } from '../data/presets';
import { Button, RealTerm } from '../ui/kit';
import { AssumptionTag, Cite, Fact } from '../ui/Fact';
import { OFFWORLD_PLACES, type Body, type PlaceId } from '../types';
import { hours, kg, launchCostPerKg, money, offworldCase, offworldMasses, type OffworldCase } from './model';
import { KV, LabeledSwitch, Section } from './parts';

/** Top of the fission slider in the plant panel (PlantCard MAX_GW.fission). */
const REACTOR_MAX_GW = 3;

const PRESET_FOR: Record<Body, PresetId | null> = { earth: null, orbit: 'orbit', moon: 'moonBase', mars: 'marsBase' };

function goPlace(p: PlaceId) {
  const s = useApp.getState();
  const cur = PLACES[s.input.place].body;
  const target = PLACES[p].body;
  const preset = PRESET_FOR[target];
  // Changing world: start from that world's base setup (no gas plants on the Moon).
  if (cur !== target && preset) s.applyPreset(preset);
  if (useApp.getState().input.place !== p) useApp.getState().setPlace(p);
}

function backToEarth() {
  const s = useApp.getState();
  s.setPlace('abuDhabi');
  useApp.getState().applyPreset('today');
  if (useApp.getState().screen === 'beyond') useApp.getState().setScreen('lab');
}

function darkFact(c: OffworldCase, mast: boolean): FactKey {
  switch (c.place) {
    case 'leo': return 'leoShadowMin';
    case 'geo': return 'geoEclipseMaxMin';
    case 'lunarEquator': return 'lunarNightH';
    case 'lunarSouthPole': return mast ? 'beLunarPoleMastDarkH' : 'beLunarPoleDarkH';
    case 'marsEquator': return 'marsSolH';
    default: return 'beMarsMidLatNightH';
  }
}

function MassBars({ c }: { c: OffworldCase }) {
  const m = offworldMasses(c);
  const max = Math.max(m.solarBatteryKg, m.reactorKg, 1);
  const W = 520, BH = 22, L = 120, R = 90;
  const iw = W - L - R;
  const w = (v: number) => (Math.max(0, v) / max) * iw;
  const rows = [
    { label: 'Solar + batteries', parts: [{ v: m.batteryKg, c: SOURCE_COLORS.battery }, { v: m.solarKg, c: SOURCE_COLORS.solar }], total: m.solarBatteryKg },
    { label: 'Small reactor', parts: [{ v: m.reactorKg, c: SOURCE_COLORS.fission }], total: m.reactorKg },
  ];
  return (
    <svg className="tool-chart" viewBox={`0 0 ${W} ${rows.length * (BH + 18) + 6}`} role="img" aria-label="Kilograms per kW of steady power">
      {rows.map((r, i) => {
        const y = 6 + i * (BH + 18);
        let x = L;
        return (
          <g key={r.label}>
            <text x={L - 8} y={y + BH / 2 + 4} fontSize="11" textAnchor="end" fill="var(--ink)">{r.label}</text>
            {r.parts.map((p, j) => {
              const ww = w(p.v);
              const el = <rect key={j} x={x} y={y} width={Math.max(0, ww)} height={BH} fill={p.c} opacity={0.85} rx={2} style={{ transition: 'width 300ms' }} />;
              x += ww;
              return el;
            })}
            <text x={x + 6} y={y + BH / 2 + 4} fontSize="11" fill="var(--ink-2)" style={{ fontVariantNumeric: 'tabular-nums' }}>{kg(r.total)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Comparison({ c }: { c: OffworldCase }) {
  const mast = useApp((s) => s.input.lunarMast);
  const m = offworldMasses(c);
  const perKg = launchCostPerKg(c.surface);
  const dk = darkFact(c, mast);
  const winner = m.reactorKg < m.solarBatteryKg ? 'reactor' : 'solar';
  const ratio = winner === 'reactor' ? m.solarBatteryKg / Math.max(1, m.reactorKg) : m.reactorKg / Math.max(1, m.solarBatteryKg);
  return (
    <Section title="What it takes to keep 1 kW running">
      <KV k={<>Longest dark period <Cite k={dk} />{isAssumption(dk) && <AssumptionTag />}</>}>
        {c.place === 'marsEquator' ? `${hours(c.darkH)} (half a sol)` : hours(c.darkH)}
      </KV>
      <MassBars c={c} />
      <div className="tool-row xsmall muted" style={{ gap: 14 }}>
        <span><span className="dot" style={{ background: SOURCE_COLORS.battery, marginRight: 4 }} />Batteries {kg(m.batteryKg)}</span>
        <span><span className="dot" style={{ background: SOURCE_COLORS.solar, marginRight: 4 }} />Solar panels {kg(m.solarKg)}</span>
        <span><span className="dot" style={{ background: SOURCE_COLORS.fission, marginRight: 4 }} />Reactor {kg(m.reactorKg)}</span>
      </div>
      <div className="tool-p">
        To ride through the dark you need {Math.round(c.darkH).toLocaleString('en-US')} kWh of batteries for every kW. At <Fact k="liIonWhPerKg" unit /> that
        is {kg(m.batteryKg)}.
        {c.place === 'lunarEquator' && <> This matches our paper&rsquo;s figure of <Fact k="lunarNightBatteryKg" unit />.</>}
        {' '}The panels must also fill the batteries while the sun is up: about {m.arrayKW.toLocaleString('en-US', { maximumFractionDigits: 1 })} kW of panels
        at <Fact k="beSolarWPerKg" unit />.
      </div>
      <div className="tool-p">
        A small reactor runs day and night. NASA&rsquo;s target is <Fact k="fspTargetKW" unit /> in under <Fact k="fspTargetTonnes" unit />, about {kg(m.reactorKg)} per kW.
      </div>
      <div className="tool-card">
        <KV k="Launch cost per kg">{money(perKg)}</KV>
        <KV k="Solar + batteries, launch cost per kW">{money(m.solarBatteryKg * perKg)}</KV>
        <KV k="Small reactor, launch cost per kW">{money(m.reactorKg * perKg)}</KV>
        <div className="xsmall faint">
          Reaching low orbit costs about <Fact k="launchCostPerKg" format={(v) => `$${v.toLocaleString('en-US')}`} /> per kg.
          {c.surface && <> Landing on the Moon or Mars costs about <Fact k="surfaceDeliveryMultiplier" format={(v) => `${v} times`} /> more.</>}
        </div>
      </div>
      <div className="tool-lead">
        {winner === 'reactor'
          ? `Here the reactor is about ${ratio.toLocaleString('en-US', { maximumFractionDigits: 1 })} times lighter.`
          : `Here solar and batteries are about ${ratio.toLocaleString('en-US', { maximumFractionDigits: 1 })} times lighter.`}
      </div>
      <RealTerm>specific mass (kg per kW)</RealTerm>
    </Section>
  );
}

export default function BeyondEarthPanel() {
  const place = useApp((s) => s.input.place);
  const mast = useApp((s) => s.input.lunarMast);
  const events = useApp((s) => s.input.events);
  const fissionOn = useApp((s) => s.input.plants.fission.on);
  const lightsOn = useApp((s) => s.result.totals.lightsOnPct);
  const setInput = useApp((s) => s.setInput);
  const setPlant = useApp((s) => s.setPlant);
  // Turning the reactor on: size it to cover the base's peak demand (the default 0.6 GW cannot carry a
  // city-sized base through a 350-hour night), but never shrink a size the user already chose.
  const toggleReactor = (on: boolean) => {
    if (!on) { setPlant('fission', { on: false }); return; }
    const s = useApp.getState();
    const peak = s.result.totals.peakDemandGW;
    const fit = isFinite(peak) && peak > 0 ? Math.min(REACTOR_MAX_GW, Math.ceil(peak * 10) / 10 + 0.1) : s.input.plants.fission.gw;
    setPlant('fission', { on: true, gw: Math.max(s.input.plants.fission.gw, fit) });
  };
  const addWeatherEvent = useApp((s) => s.addWeatherEvent);

  const info = PLACES[place];
  const c = offworldCase({ place, lunarMast: mast, events });
  const storm = events.some((e) => e.kind === 'dustStorm');
  const isMars = info.body === 'mars';

  return (
    <>
      <Section>
        <div className="tool-lead">Off Earth, every kilogram has to be launched. So the question becomes: what is lightest?</div>
        <div className="place-btns">
          {OFFWORLD_PLACES.map((p) => (
            <Button key={p} active={p === place} onClick={() => goPlace(p)}>{PLACES[p].short}</Button>
          ))}
          <Button ghost onClick={backToEarth}>Back to Earth</Button>
        </div>
      </Section>

      {!c ? (
        <Section>
          <div className="tool-p">The city is on Earth right now ({info.name}). Pick a place above to move the base off Earth.</div>
        </Section>
      ) : (
        <>
          <Section title={info.name}>
            <div className="tool-p">{info.darkness}</div>
            <KV k="Lights on in this run (share of hours fully supplied)">
              {isFinite(lightsOn) ? `${lightsOn.toLocaleString('en-US', { maximumFractionDigits: 1 })}%` : '—'}
            </KV>
            <div className="xsmall faint">
              The base uses the same engine as the city, scaled to the city&rsquo;s size, so compare the per-kW numbers below.
            </div>
            <LabeledSwitch checked={fissionOn} onChange={toggleReactor} label="Add a small reactor to the base">
              Add a small reactor to the base
            </LabeledSwitch>
            {place === 'lunarSouthPole' && (
              <LabeledSwitch checked={mast} onChange={(v) => setInput({ lunarMast: v })} label="Add 10 m mast">
                Put the panels on a 10 m mast. Lit about <Fact k="lunarMastLit" percent digits={0} /> of the time instead of <Fact k="lunarPeakLit" percent digits={0} />.
              </LabeledSwitch>
            )}
            {isMars && (
              <>
                <LabeledSwitch checked={storm} onChange={(v) => addWeatherEvent(v ? 'dustStorm' : 'clear')} label="Dust storm">
                  Dust storm: sunlight falls to <Fact k="marsDustStormFactor" percent digits={0} /> for <Fact k="marsDustStormSols" unit />
                </LabeledSwitch>
                <div className="tool-p">
                  Dust also settles on panels and slowly cuts their output, so someone has to clean them. NASA&rsquo;s InSight lander ran out of power
                  partly because of dust <Cite k="beInsightEndYear" />.
                </div>
              </>
            )}
          </Section>
          <Comparison c={c} />
        </>
      )}

      <Section title="Reactors for the Moon">
        <ul className="tool-list">
          <li>In <Fact k="beKrustyYear" format={(v) => String(v)} />, NASA&rsquo;s KRUSTY test ran a small reactor whose heat pipes fed Stirling engines.</li>
          <li>The Kilopower design gives up to <Fact k="kilopowerKW" unit /> for at least <Fact k="beKilopowerYears" unit />.</li>
          <li>NASA&rsquo;s fission surface power target: <Fact k="fspTargetKW" unit /> in under <Fact k="fspTargetTonnes" unit />.</li>
          <li>A 2025 directive asks for at least <Fact k="fsp2025DirectiveKW" unit />, ready to launch by late <Fact k="beFspLaunchYear" format={(v) => String(v)} />.</li>
        </ul>
        <RealTerm>fission surface power (FSP)</RealTerm>
      </Section>

      <div className="tool-aha">
        Off Earth, cost turns into launch mass. Where the night is long, a small reactor wins; where the sun almost never sets, solar wins.
      </div>
      <div className="xsmall faint">Panel mass per kW and the longest dark spells at the pole and on Mars are model assumptions. Real designs vary.</div>
    </>
  );
}
