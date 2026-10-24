// Compare mode: pin the current setup as A, change things, see A vs B (now).
import { useApp } from '../../store';
import { Button, Icon } from '../kit';
import type { SimTotals } from '../../engine/types';
import { fmtMoney, fmtPct, fmtRatio, pos } from './format';
import { fmtCarbonShort, wastedShare } from './Scorecards';

interface Row { label: string; fmt: (t: SimTotals) => string; value: (t: SimTotals) => number; better: 'high' | 'low' | 'none' }

const ROWS: Row[] = [
  { label: 'Lights on', fmt: (t) => fmtPct(pos(t.lightsOnPct)), value: (t) => pos(t.lightsOnPct), better: 'high' },
  { label: 'Cost per MWh', fmt: (t) => fmtMoney(t.costPerMWh?.mid ?? 0), value: (t) => pos(t.costPerMWh?.mid), better: 'low' },
  { label: 'Carbon', fmt: (t) => fmtCarbonShort(t.co2Mt), value: (t) => pos(t.co2Mt), better: 'low' },
  { label: 'Wasted sun', fmt: (t) => fmtPct(wastedShare(t)), value: (t) => wastedShare(t), better: 'low' },
  { label: 'Built vs. need', fmt: (t) => fmtRatio(pos(t.overbuildRatio)), value: (t) => pos(t.overbuildRatio), better: 'none' },
];

function betterSide(row: Row, a: SimTotals, b: SimTotals): 'a' | 'b' | null {
  if (row.better === 'none') return null;
  const va = row.value(a), vb = row.value(b);
  if (Math.abs(va - vb) <= Math.max(1e-9, Math.abs(va) * 0.005)) return null;
  if (row.label === 'Cost per MWh' && (va <= 0 || vb <= 0)) return null;
  return (row.better === 'high' ? va > vb : va < vb) ? 'a' : 'b';
}

export default function Compare() {
  const pin = useApp((s) => s.comparePin);
  const totals = useApp((s) => s.result.totals);
  const pinCompare = useApp((s) => s.pinCompare);
  const clearCompare = useApp((s) => s.clearCompare);

  if (!pin) {
    return (
      <div className="dash-compare dash-row-between">
        <span className="muted xsmall">Save this setup, change something, then compare.</span>
        <Button onClick={() => pinCompare('A')} ariaLabel="Pin this setup as A"><Icon name="pin" size={14} /> Pin as A</Button>
      </div>
    );
  }

  return (
    <div className="dash-compare">
      <div className="dash-row-between">
        <span className="dash-label">A vs B</span>
        <Button ghost onClick={clearCompare} ariaLabel="Clear the comparison">Clear</Button>
      </div>
      <table className="dash-table num">
        <thead>
          <tr><th scope="col"></th><th scope="col">A (pinned)</th><th scope="col">B (now)</th></tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const side = betterSide(r, pin.totals, totals);
            return (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td className={side === 'a' ? 'dash-better' : ''}>{r.fmt(pin.totals)}</td>
                <td className={side === 'b' ? 'dash-better' : ''}>{r.fmt(totals)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="faint xsmall">The better value in each row is in bold. Wasted sun is the share of solar and wind thrown away.</div>
    </div>
  );
}
