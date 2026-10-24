// "City demand" tab: district switches and sizes, scenarios, flexible loads.
import { useApp, useControlVisible } from '../store';
import { Segmented, Slider, Switch, RealTerm } from './kit';
import { Fact, AssumptionTag } from './Fact';
import { at, useLive } from './live';
import { DISTRICT_LABELS } from '../data/colors';
import type { DemandScenario, DistrictId } from '../types';
import type { SimInput } from '../engine/types';
import { applyScenario as scenarioInput } from '../data/presets';
import './ui.css';

const DISTRICT_MAX_MW: Record<DistrictId, number> = { homes: 800, commercial: 500, transport: 400, factory: 500, datacenter: 1000, hydrogen: 600 };
const ORDER: DistrictId[] = ['homes', 'commercial', 'transport', 'factory', 'datacenter', 'hydrogen'];

/** Which scenario the current districts match (scenarios are not stored, so we infer them). */
const SCENARIOS: DemandScenario[] = ['today', 'ai2030', 'electric2040'];
const CORE: DistrictId[] = ['homes', 'commercial', 'transport', 'factory', 'datacenter'];
function inferScenario(input: SimInput): DemandScenario | 'custom' {
  for (const sc of SCENARIOS) {
    const ref = scenarioInput(input, sc).districts;
    if (CORE.every((d) => Math.abs(ref[d].mw - input.districts[d].mw) < 0.5)) return sc;
  }
  return 'custom';
}

function DistrictRow({ d }: { d: DistrictId }) {
  const set = useApp((s) => s.input.districts[d]);
  const setDistrict = useApp((s) => s.setDistrict);
  const nowMW = useLive((r, i) => at(r.demandByDistrict?.[d], i) * 1000, 1);
  const served = useLive((r, i) => (at(r.demandByDistrict?.[d], i) > 1e-6 ? at(r.servedFracByDistrict?.[d], i) : 1), 100);
  if (!set) return null;
  const isDC = d === 'datacenter';
  const max = DISTRICT_MAX_MW[d];
  return (
    <div className="plant-card">
      <div className="plant-ctl">
        <div className="plant-head">
          <span className="plant-name">{DISTRICT_LABELS[d]}</span>
          <span className="grow" />
          <Switch checked={set.on} onChange={(on) => setDistrict(d, { on })} label={`${DISTRICT_LABELS[d]}: on or off`} />
        </div>
        {isDC && <span className="label-sm">AI build-out, 100 MW at a time</span>}
        <div className="row">
          <Slider value={Math.min(set.mw, max)} min={0} max={max} step={isDC ? 100 : 10}
            onChange={(mw) => setDistrict(d, { mw })} label={`${DISTRICT_LABELS[d]} average size in megawatts`} />
          <span className="val">{Math.round(set.mw)} MW</span>
        </div>
        <div className="plant-live">
          {set.on ? (
            <>Using <b>{Math.round(nowMW)} MW</b> now{served < 0.995 && nowMW > 0 ? <> · <b>short of power</b></> : null}</>
          ) : 'Switched off.'}
        </div>
        {isDC && (
          <div className="note">
            Real AI campuses are now planned at about <Fact k="uiAiCampusGW" unit /> each. Data centers worldwide used <Fact k="dcTWh2025" unit /> in 2025
            and may use <Fact k="dcTWh2030" unit /> by 2030.
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemandPanel() {
  const showDemand = useControlVisible('demand');
  const showScenario = useControlVisible('scenario');
  const showFlex = useControlVisible('flexLoad');
  const screen = useApp((s) => s.screen);
  const lessonId = useApp((s) => s.lesson?.id ?? '');
  const scenario = useApp((s) => inferScenario(s.input));
  const applyScenario = useApp((s) => s.applyScenario);
  const flexDC = useApp((s) => s.input.flexibleDataCenter);
  const heat = useApp((s) => s.input.heatStorage);
  const industryFlex = useApp((s) => s.input.industryFlex);
  const setInput = useApp((s) => s.setInput);
  const showHydrogen = screen === 'lab' || screen === 'world' || lessonId.toLowerCase().includes('industry');

  return (
    <div>
      {showScenario && (
        <div className="stack" style={{ marginBottom: 10 }}>
          <span className="label-sm">Demand scenario</span>
          <div className="seg-stack">
          <Segmented<DemandScenario | 'custom'>
            value={scenario}
            label="Demand scenario"
            options={[
              { value: 'today', label: 'Today' },
              { value: 'ai2030', label: '2030 with AI growth' },
              { value: 'electric2040', label: 'Everything electric 2040' },
            ]}
            onChange={(v) => { if (v !== 'custom') applyScenario(v); }}
          />
          </div>
          {scenario === 'ai2030' && (
            <div className="note">
              US data centers used about <Fact k="usDcShare2023" percent /> of US electricity in 2023. They could use{' '}
              <Fact k="usDcShare2028Low" percent /> to <Fact k="usDcShare2028High" percent /> by 2028.
            </div>
          )}
          {scenario === 'electric2040' && (
            <div className="note">More electric cars, heat pumps and data centers. <AssumptionTag /></div>
          )}
        </div>
      )}

      {showDemand && ORDER.filter((d) => d !== 'hydrogen' || showHydrogen).map((d) => <DistrictRow key={d} d={d} />)}

      {showFlex && (
        <div className="plant-card">
          <div className="plant-head">
            <span className="plant-name" style={{ fontWeight: 500 }}>Let the data center pause batch jobs when power is short</span>
            <span className="grow" />
            <Switch checked={flexDC} onChange={(v) => setInput({ flexibleDataCenter: v })} label="Flexible data center" />
          </div>
          <div className="note" style={{ marginTop: 4 }}>
            Up to <Fact k="dcFlexShare" percent digits={0} /> of its load can wait, for up to <Fact k="dcFlexHours" unit />.
          </div>
          <RealTerm>flexible load</RealTerm>
        </div>
      )}

      {showDemand && (
        <>
          <div className="plant-card">
            <div className="plant-head">
              <span className="plant-name" style={{ fontWeight: 500 }}>Store summer heat in a sand pile for winter</span>
              <span className="grow" />
              <Switch checked={heat} onChange={(v) => setInput({ heatStorage: v })} label="Heat storage in sand" />
            </div>
            <div className="note" style={{ marginTop: 4 }}>
              Casey Handmer's idea: heat a big pile of sand with spare sun, then use it to warm homes. Early-stage technology.
            </div>
            <RealTerm>thermal storage</RealTerm>
          </div>
          <div className="plant-card">
            <div className="plant-head">
              <span className="plant-name" style={{ fontWeight: 500 }}>Use the city's wasted sun for industry</span>
              <span className="grow" />
              <Switch checked={industryFlex} onChange={(v) => setInput({ industryFlex: v })} label="Use wasted sun for industry" />
            </div>
            <div className="note" style={{ marginTop: 4 }}>Factories soak up spare midday power when the battery is full.</div>
            <RealTerm>flexible industrial demand</RealTerm>
          </div>
        </>
      )}
    </div>
  );
}
