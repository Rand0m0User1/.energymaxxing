// Scorecards (lights on, carbon, wasted sun, cost) and the overbuild meter. Re-render only when the sim result changes.
import { memo, useState } from 'react';
import { useApp } from '../../store';
import { RealTerm } from '../kit';
import { Fact } from '../Fact';
import { fv } from '../../data/facts';
import { PLACES } from '../../data/places';
import type { SimTotals } from '../../engine/types';
import { WhyBox, WhyButton } from './Why';
import { clamp, energyUnit, fmtCO2, fmtDuration, fmtMoney, fmtPct, fmtRatio, fmtUnit, isOneDay, periodWord, pos, safeDiv } from './format';

type WhyId = 'lights' | 'carbon' | 'wasted' | 'cost' | 'overbuild';

/** Share of solar (and wind) energy that was thrown away. generatedTWh is energy used or stored, so made = generated + curtailed. */
export function wastedShare(t: SimTotals): number {
  const gen = pos(t.generatedTWh?.solar) + pos(t.generatedTWh?.wind);
  const curt = pos(t.curtailedTWh);
  return safeDiv(curt, gen + curt) * 100;
}

export function fmtCarbonShort(mt: number): string {
  const c = fmtCO2(mt);
  return `${c.value} ${c.unit === 'tonnes' ? 't' : 'Mt'}`;
}

export function fmtEnergy(twh: number): string {
  const v = pos(twh);
  if (v <= 0) return 'None';
  return fmtUnit(v, energyUnit(v));
}

export default memo(function Scorecards() {
  const result = useApp((s) => s.result);
  const body = useApp((s) => PLACES[s.input.place]?.body ?? 'earth');
  const [why, setWhy] = useState<WhyId | null>(null);
  const toggle = (id: WhyId) => setWhy((w) => (w === id ? null : id));
  const t = result.totals;
  const period = periodWord(result);
  const oneDay = isOneDay(result);
  const co2 = fmtCO2(t.co2Mt);
  const wasted = wastedShare(t);
  const hasWind = pos(t.generatedTWh?.wind) > 0;
  const cost = t.costPerMWh ?? { low: 0, mid: 0, high: 0 };
  const hasCost = pos(cost.mid) > 0;
  const blackoutH = pos(t.longestBlackoutH);

  return (
    <div className="dash-scores">
      <div className="dash-cards3">
        <div className="dash-card">
          <div className="dash-card-head"><span className="dash-label">Lights on</span><WhyButton topic="Lights on" open={why === 'lights'} onClick={() => toggle('lights')} /></div>
          <div className="dash-card-value num">{fmtPct(pos(t.lightsOnPct))}</div>
          <div className="faint xsmall">{oneDay ? 'of the day with full power' : 'of hours with full power'}</div>
          <div className="muted xsmall num">{blackoutH > 0 ? `Longest blackout: ${fmtDuration(blackoutH)}` : 'No blackouts'}</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-head"><span className="dash-label">Carbon</span><WhyButton topic="Carbon" open={why === 'carbon'} onClick={() => toggle('carbon')} /></div>
          <div className="dash-card-value num">{co2.value}</div>
          <div className="faint xsmall">{co2.unit} of CO2 over the {period}</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-head"><span className="dash-label">Wasted sun</span><WhyButton topic="Wasted sun" open={why === 'wasted'} onClick={() => toggle('wasted')} /></div>
          <div className="dash-card-value num">{fmtEnergy(t.curtailedTWh)}</div>
          <div className="faint xsmall num">
            {fmtPct(wasted)} of the {hasWind ? 'sun and wind' : 'solar'} power made
          </div>
          <RealTerm>curtailment</RealTerm>
        </div>
      </div>

      {why === 'lights' && (
        <WhyBox title="Why lights on?" sourceKey="paper" onClose={() => setWhy(null)}>
          This counts the {oneDay ? 'minutes' : 'hours'} when every home and business got all the power it asked for. One dark hour at night counts against it, even after a sunny day.
        </WhyBox>
      )}
      {why === 'carbon' && (
        <WhyBox title="Why this much carbon?" sourceKey="gasCO2PerMWh" onClose={() => setWhy(null)}>
          Only the gas plant burns fuel in this model, about <Fact k="gasCO2PerMWh" /> tonnes of CO2 for each MWh. Sun, wind, batteries, reactors, hydro and geothermal release almost none while running.
        </WhyBox>
      )}
      {why === 'wasted' && (
        <WhyBox title="Why is sun wasted?" sourceKey="handmer2025" onClose={() => setWhy(null)}>
          When the battery is full and the city needs no more, extra solar power has nowhere to go, so panels are switched off. Some waste is normal in a cheap solar grid, but it still had to be built and paid for.
        </WhyBox>
      )}

      <div className="dash-card dash-card-wide">
        <div className="dash-card-head"><span className="dash-label">Cost</span><WhyButton topic="Cost" open={why === 'cost'} onClick={() => toggle('cost')} /></div>
        <div className="dash-row-baseline">
          <div className="dash-card-value num">{hasCost ? fmtMoney(cost.mid) : '—'} <span className="dash-unit">per MWh used</span></div>
          {hasCost && pos(cost.high) > pos(cost.low) && (
            <div className="muted xsmall num">likely {fmtMoney(cost.low)} to {fmtMoney(cost.high)}</div>
          )}
        </div>
        {!hasCost && <div className="faint xsmall">The cost shows once the city uses power.</div>}
        {hasCost && body === 'earth' && pos(t.homeBillPerMonth) > 0 && (
          <div className="small num">
            About <strong>{fmtMoney(t.homeBillPerMonth)} a month</strong> for a typical home's power, before delivery charges.
            <span className="faint xsmall"> A typical home uses about <Fact k="homeMWhPerMonth" /> MWh a month.</span>
          </div>
        )}
        {why === 'cost' && (
          <WhyBox title="Why this cost?" sourceKey="lcoeSolarLow" onClose={() => setWhy(null)}>
            Each kind of plant has a low and a high cost per MWh from Lazard's 2026 survey, weighted by how much power the city actually used. Wasted sun still has to be paid for, so building far more than you need raises the cost of each useful MWh.
          </WhyBox>
        )}
        <div className="dash-footnote">
          Generation cost only. Delivering power (wires, poles, substations) adds a lot on top. At one large US utility,
          generation's share of costs fell from <Fact k="generationShare2007" percent digits={0} /> to <Fact k="generationShare2017" percent digits={0} /> in
          a decade as delivery's share rose.
        </div>
      </div>

      <OverbuildMeter ratio={pos(t.overbuildRatio)} open={why === 'overbuild'} onToggle={() => toggle('overbuild')} onClose={() => setWhy(null)} />
    </div>
  );
});

const SCALE_MAX = 10;

function OverbuildMeter({ ratio, open, onToggle, onClose }: { ratio: number; open: boolean; onToggle: () => void; onClose: () => void }) {
  const W = 356, x0 = 10, x1 = W - 14;
  const x = (r: number) => x0 + (clamp(r, 0, SCALE_MAX) / SCALE_MAX) * (x1 - x0);
  const fLo = fv('sepulvedaFirmLow'), fHi = fv('sepulvedaFirmHigh');
  const nLo = fv('sepulvedaNoFirmLow'), nHi = fv('sepulvedaNoFirmHigh');
  const mx = x(ratio);
  const labelX = clamp(mx, x0 + 18, x1 - 18);
  const hideStart = Math.abs(labelX - x0) < 30;
  const hideEnd = Math.abs(labelX - x1) < 30;

  return (
    <div className="dash-card dash-card-wide">
      <div className="dash-card-head">
        <span className="dash-label">Built compared with need</span>
        <WhyButton topic="Overbuild" open={open} onClick={onToggle} />
      </div>
      <div className="dash-card-value num">{fmtRatio(ratio)} <span className="dash-unit">the busiest hour's need</span></div>
      <svg className="dash-meter" viewBox={`0 0 ${W} 44`} role="img"
        aria-label={`Your build is ${fmtRatio(ratio)} peak need. Studies: ${fLo} to ${fHi} times with always-on power, ${nLo} to ${nHi} times without.`}>
        <text x={(x(fLo) + x(fHi)) / 2} y={10} textAnchor="middle" className="dash-axis-text">with always-on power</text>
        <text x={(x(nLo) + x(nHi)) / 2} y={10} textAnchor="middle" className="dash-axis-text">without</text>
        <line x1={x0} x2={x1} y1={21} y2={21} style={{ stroke: 'var(--line-strong)' }} strokeWidth={1} />
        <rect x={x(fLo)} y={15} width={x(fHi) - x(fLo)} height={12} rx={2} style={{ fill: 'rgba(31, 95, 139, 0.18)' }} />
        <rect x={x(nLo)} y={15} width={x(nHi) - x(nLo)} height={12} rx={2} style={{ fill: 'rgba(20, 24, 28, 0.10)' }} />
        {[0, 5, 10].map((r) => (
          <line key={r} x1={x(r)} x2={x(r)} y1={27} y2={30} style={{ stroke: 'var(--ink-3)' }} strokeWidth={1} />
        ))}
        {!hideStart && <text x={x0} y={41} textAnchor="middle" className="dash-axis-text">0×</text>}
        {Math.abs(labelX - x(5)) > 34 && <text x={x(5)} y={41} textAnchor="middle" className="dash-axis-text">5×</text>}
        {!hideEnd && <text x={x1} y={41} textAnchor="middle" className="dash-axis-text">10×</text>}
        <line x1={mx} x2={mx} y1={13} y2={30} style={{ stroke: 'var(--ink)' }} strokeWidth={2} />
        <text x={labelX} y={41} textAnchor="middle" className="dash-axis-text dash-axis-strong">
          {ratio > SCALE_MAX ? `You: ${fmtRatio(ratio)}` : 'You'}
        </text>
      </svg>
      <div className="muted xsmall">
        Power you built, compared with the most the city needs at once. Studies of clean grids found about{' '}
        <Fact k="sepulvedaFirmLow" noMarker />–<Fact k="sepulvedaFirmHigh" format={(v) => `${v}×`} /> with always-on power, and{' '}
        <Fact k="sepulvedaNoFirmLow" noMarker />–<Fact k="sepulvedaNoFirmHigh" format={(v) => `${v}×`} /> without.
      </div>
      <RealTerm>overbuild ratio</RealTerm>
      {open && (
        <WhyBox title="Why build more than you need?" sourceKey="sepulvedaNoFirmLow" onClose={onClose}>
          Sun and wind come and go, so a grid built only from them needs a lot of spare capacity to get through dark, still days. Always-on power such as reactors, hydro or geothermal covers those gaps, so much less has to be built.
        </WhyBox>
      )}
    </div>
  );
}
