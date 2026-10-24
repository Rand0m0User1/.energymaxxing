// "Settings" tab (City Lab): year, realism switches, weather seed, cost model, accessibility.
import type { ReactNode } from 'react';
import { useApp, useControlVisible } from '../store';
import { Segmented, Slider, Switch, RealTerm } from './kit';
import { Fact, AssumptionTag } from './Fact';
import { fv } from '../data/facts';
import type { CostSettings } from '../engine/types';
import './ui.css';

function ToggleRow({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  return (
    <div className="plant-card">
      <div className="plant-head">
        <span className="plant-name" style={{ fontWeight: 500 }}>{label}</span>
        <span className="grow" />
        <Switch checked={checked} onChange={onChange} label={label} />
      </div>
      {children && <div className="note" style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}

type CostKey = Exclude<keyof CostSettings, 'mode'>;
const COST_SLIDERS: { key: CostKey; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { key: 'solarPerKW', label: 'Solar, installed', min: 300, max: 1500, step: 50, fmt: (v) => `$${v.toLocaleString('en-US')}/kW` },
  { key: 'batteryPerKWh', label: 'Battery, installed', min: 100, max: 450, step: 10, fmt: (v) => `$${v.toLocaleString('en-US')}/kWh` },
  { key: 'fissionPerKW', label: 'Reactor, build cost', min: 3000, max: 14000, step: 250, fmt: (v) => `$${v.toLocaleString('en-US')}/kW` },
  { key: 'waccPct', label: 'Cost of borrowing money', min: 3, max: 12, step: 0.5, fmt: (v) => `${v}%` },
  { key: 'surplusPrice', label: 'Wasted sun sold at', min: 0, max: 40, step: 1, fmt: (v) => `$${v}/MWh` },
];

function CostNote({ k }: { k: CostKey }) {
  if (k === 'batteryPerKWh') return <div className="note">A real 4-hour system cost <Fact k="batterySystemPNNL2021" unit /> (2021 data).</div>;
  if (k === 'fissionPerKW') return <div className="note">Vogtle 3 and 4 cost about <Fact k="vogtlePerKW" unit />.</div>;
  if (k === 'waccPct') return <RealTerm>cost of capital</RealTerm>;
  if (k === 'surplusPrice') return <div className="note">Tests whether selling spare solar pays for overbuilding.</div>;
  return null;
}

export default function SettingsPanel() {
  const input = useApp((s) => s.input);
  const setInput = useApp((s) => s.setInput);
  const tools = useApp((s) => s.tools);
  const setTools = useApp((s) => s.setTools);
  const reducedMotion = useApp((s) => s.reducedMotion);
  const setReducedMotion = useApp((s) => s.setReducedMotion);
  const presenter = useApp((s) => s.presenter);
  const setPresenter = useApp((s) => s.setPresenter);
  const showCosts = useControlVisible('advancedCosts');
  const yMin = fv('uiYearMin');
  const yMax = fv('uiYearMax');
  const fusionYear = fv('fusionMinYear');
  const setCost = (patch: Partial<CostSettings>) => setInput({ costs: { ...input.costs, ...patch } });

  return (
    <div>
      <div className="plant-card">
        <div className="plant-head">
          <span className="plant-name">Year</span>
          <span className="grow" />
          <span className="val">{input.year}</span>
        </div>
        <Slider value={input.year} min={yMin} max={yMax} step={1} onChange={(year) => setInput({ year: Math.round(year) })} label="Year" />
        <div className="note">
          {input.year >= fusionYear ? 'Fusion can be switched on.' : <>Fusion unlocks in <Fact k="fusionMinYear" format={(v) => String(v)} />.</>}
        </div>
      </div>

      <div className="section-title">How real should it be?</div>
      <ToggleRow label="Realistic reactor outages" checked={input.realisticOutages} onChange={(v) => setInput({ realisticOutages: v })}>
        Reactors stop for about <Fact k="fissionOutageWeeks" unit /> to refuel every <Fact k="fissionOutageEveryMonths" unit />.
      </ToggleRow>
      <ToggleRow label="Flexible reactor" checked={input.fissionFlexible} onChange={(v) => setInput({ fissionFlexible: v })}>
        The reactor turns down when the sun floods the grid. You can then paint its hours.
      </ToggleRow>
      <ToggleRow label="Snow on panels" checked={input.snow} onChange={(v) => setInput({ snow: v })}>
        Snow covers some panels on cold winter days. <AssumptionTag />
      </ToggleRow>
      {input.place === 'lunarSouthPole' && (
        <ToggleRow label="10 m mast for the panels" checked={input.lunarMast} onChange={(v) => setInput({ lunarMast: v })}>
          A tall mast keeps panels in sunlight more than <Fact k="lunarMastLit" percent digits={0} /> of the time.
        </ToggleRow>
      )}
      <div className="plant-card">
        <div className="plant-head">
          <label className="plant-name" style={{ fontWeight: 500 }} htmlFor="weather-seed">Weather pattern number</label>
          <span className="grow" />
          <input id="weather-seed" type="number" min={1} max={9999} step={1} value={input.seed}
            style={{ width: 80, padding: '3px 6px', border: '1px solid var(--line-strong)', borderRadius: 6, background: '#fff' }}
            onChange={(e) => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) setInput({ seed: v }); }} />
        </div>
        <div className="note" style={{ marginTop: 4 }}>Change it to get a different run of cloudy and windy days.</div>
      </div>

      {showCosts && (
        <>
          <div className="section-title">Costs</div>
          <div className="stack" style={{ marginBottom: 8 }}>
            <Segmented<'simple' | 'advanced'>
              value={input.costs.mode}
              label="Cost model"
              options={[{ value: 'simple', label: 'Simple' }, { value: 'advanced', label: 'Advanced' }]}
              onChange={(mode) => setCost({ mode })}
            />
            <div className="note">
              {input.costs.mode === 'simple'
                ? 'Uses published price ranges for each kind of plant.'
                : 'Builds the price from what each plant costs to build and borrow for.'}
            </div>
          </div>
          {input.costs.mode === 'advanced' && COST_SLIDERS.map((c) => (
            <div className="plant-card" key={c.key}>
              <div className="plant-head">
                <span className="plant-name" style={{ fontWeight: 500 }}>{c.label}</span>
                <span className="grow" />
                <span className="val">{c.fmt(input.costs[c.key])}</span>
              </div>
              <Slider value={input.costs[c.key]} min={c.min} max={c.max} step={c.step}
                onChange={(v) => setCost({ [c.key]: v } as Partial<CostSettings>)} label={c.label}
                disabled={c.key === 'fissionPerKW' && tools.useReactorRowPrice} />
              <CostNote k={c.key} />
            </div>
          ))}
          <ToggleRow label="Use Reactor Row price" checked={tools.useReactorRowPrice}
            onChange={(v) => setTools({ useReactorRowPrice: v })}>
            {tools.reactorRowPricePerKW != null
              ? <>Uses the reactor price from Reactor Row: <span className="num">${Math.round(tools.reactorRowPricePerKW).toLocaleString('en-US')}/kW</span>.</>
              : 'Build reactors in Reactor Row first.'}
          </ToggleRow>
        </>
      )}

      <div className="section-title">Display</div>
      <ToggleRow label="Reduce motion" checked={reducedMotion} onChange={setReducedMotion}>
        Fewer moving particles and no camera flights.
      </ToggleRow>
      <ToggleRow label="Presenter mode" checked={presenter} onChange={setPresenter}>
        Bigger numbers, fewer hints. Press P to switch.
      </ToggleRow>
    </div>
  );
}
