// Small headline numbers for the compact (lesson) strip: battery, lights on, cost, wasted sun.
// Re-renders with the sim result; the battery piece follows the clock on its own.
import { memo } from 'react';
import { useApp } from '../../store';
import { BatteryCompact } from './NowPanels';
import { fmtEnergy, wastedShare } from './Scorecards';
import { fmtDuration, fmtMoney, fmtPct, periodWord, pos } from './format';

const Totals = memo(function Totals() {
  const result = useApp((s) => s.result);
  const t = result.totals;
  const period = periodWord(result);
  const cost = t.costPerMWh ?? { low: 0, mid: 0, high: 0 };
  const hasCost = pos(cost.mid) > 0;
  const blackoutH = pos(t.longestBlackoutH);
  const curt = pos(t.curtailedTWh);

  return (
    <>
      <div className="dash-mini">
        <div className="dash-label">Lights on</div>
        <div className="dash-mini-value num">{fmtPct(pos(t.lightsOnPct))}</div>
        <div className="faint xsmall dash-mini-sub num">
          {blackoutH > 0 ? `Longest blackout ${fmtDuration(blackoutH)}` : 'No blackouts'}
        </div>
      </div>
      <div className="dash-mini">
        <div className="dash-label">Cost</div>
        <div className="dash-mini-value num">
          {hasCost ? fmtMoney(cost.mid) : '—'} <span className="dash-unit">per MWh</span>
        </div>
        <div className="faint xsmall dash-mini-sub num">
          {hasCost && pos(cost.high) > pos(cost.low) ? `likely ${fmtMoney(cost.low)} to ${fmtMoney(cost.high)}` : 'Generation only'}
        </div>
      </div>
      <div className="dash-mini">
        <div className="dash-label">Wasted sun</div>
        <div className="dash-mini-value num">{fmtPct(wastedShare(t))}</div>
        <div className="faint xsmall dash-mini-sub num">
          {curt > 0 ? `${fmtEnergy(curt)} over the ${period}` : 'None thrown away'}
        </div>
      </div>
    </>
  );
});

export default function CompactStats() {
  return (
    <div className="dash-c-stats">
      <BatteryCompact />
      <Totals />
    </div>
  );
}
