// Live "right now" pieces: big number, now-bar and battery gauge. Each subscribes to the current step only.
import { useApp } from '../../store';
import { stepIndex } from '../../engine/timeIndex';
import { SOURCE_IDS, type SourceId } from '../../types';
import { SOURCE_COLORS, SOURCE_LABELS } from '../../data/colors';
import { clamp, fmtDuration, fmtUnit, pos, powerUnit, refPowerGW, safeDiv } from './format';
import type { SimResult } from '../../engine/types';

const useStep = () => useApp((s) => stepIndex(s.result, s.hourOfYear));

function sourceValues(result: SimResult, idx: number): { id: SourceId; v: number }[] {
  return SOURCE_IDS.map((id) => ({
    id,
    v: pos(id === 'battery' ? result.batteryDischarge?.[idx] : result.supply?.[id]?.[idx]),
  }));
}

/** "Power right now: 1.02 GW needed / 1.02 GW supplied", plus a plain blackout warning. */
export function BigNumber({ compact }: { compact?: boolean }) {
  const result = useApp((s) => s.result);
  const idx = useStep();
  const pu = powerUnit(refPowerGW(result));
  const demand = pos(result.demand?.[idx]);
  const served = pos(result.served?.[idx]);
  const unserved = pos(result.unserved?.[idx]);
  const short = unserved > Math.max(1e-7, demand * 1e-4);

  if (compact) {
    return (
      <div className="dash-strip-text num">
        <span className="muted">Power right now: </span>
        <strong>{fmtUnit(demand, pu)}</strong> needed / <strong>{fmtUnit(served, pu)}</strong> supplied
        {short && <span className="dash-bad"> · Blackout, short by {fmtUnit(unserved, pu)}</span>}
      </div>
    );
  }

  const vals = sourceValues(result, idx).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const total = vals.reduce((a, b) => a + b.v, 0);
  const mix = vals.slice(0, 3).map((x) => `${SOURCE_LABELS[x.id]} ${Math.round(safeDiv(x.v, total) * 100)}%`).join(', ');
  const summary = `${short ? 'Blackout' : 'Lights on'}. Using ${fmtUnit(served, pu)}.${mix ? ` ${mix}.` : ''}`;

  return (
    <div className="dash-big">
      <div className="dash-label">Power right now</div>
      <div className="dash-bignum num">
        {fmtUnit(demand, pu)} <span className="dash-unit">needed</span>
        <span className="dash-sep"> / </span>
        {fmtUnit(served, pu)} <span className="dash-unit">supplied</span>
      </div>
      {short ? (
        <div className="dash-bad small">Blackout. The city is short by {fmtUnit(unserved, pu)}.</div>
      ) : demand > 0 ? (
        <div className="faint xsmall">Every home and business has power.</div>
      ) : null}
      <span className="dash-sr" aria-live="polite">{summary}</span>
    </div>
  );
}

/** Horizontal stacked bar of where power comes from right now. Hover highlights a source everywhere. */
export function NowBar() {
  const result = useApp((s) => s.result);
  const idx = useStep();
  const hl = useApp((s) => s.highlightSource);
  const setHl = useApp((s) => s.setHighlightSource);
  const pu = powerUnit(refPowerGW(result));
  const vals = sourceValues(result, idx).filter((x) => x.v > 0);
  const total = vals.reduce((a, b) => a + b.v, 0);
  const charge = pos(result.batteryCharge?.[idx]);
  const curt = pos(result.curtailed?.[idx]);
  const op = (id: SourceId) => (hl == null || hl === id ? 1 : 0.28);

  return (
    <div className="dash-nowbar-wrap">
      <div className="dash-label">Where the power comes from now</div>
      <div className="dash-nowbar" onMouseLeave={() => setHl(null)}>
        {total > 0 ? (
          vals.map((x) => (
            <div
              key={x.id}
              className="dash-seg"
              style={{ flex: `${x.v} 1 0px`, background: SOURCE_COLORS[x.id], opacity: op(x.id) }}
              onMouseEnter={() => setHl(x.id)}
              title={`${SOURCE_LABELS[x.id]}: ${fmtUnit(x.v, pu)}`}
            />
          ))
        ) : (
          <div className="dash-nowbar-empty">No power being made right now</div>
        )}
      </div>
      {vals.length > 0 && (
        <div className="dash-legend" onMouseLeave={() => setHl(null)}>
          {vals.map((x) => (
            <button
              key={x.id}
              className="dash-legend-item dash-legend-btn num"
              style={{ opacity: op(x.id) }}
              onMouseEnter={() => setHl(x.id)}
              onFocus={() => setHl(x.id)}
              onBlur={() => setHl(null)}
            >
              <span className="dot" style={{ background: SOURCE_COLORS[x.id] }} />
              {x.id === 'battery' ? 'Battery' : SOURCE_LABELS[x.id]} {Math.round(safeDiv(x.v, total) * 100)}%
            </button>
          ))}
        </div>
      )}
      {(charge > 0 || curt > 0) && (
        <div className="faint xsmall num">
          {charge > 0 && <>Filling the battery: {fmtUnit(charge, pu)}. </>}
          {curt > 0 && <>Wasted sun: {fmtUnit(curt, pu)}.</>}
        </div>
      )}
    </div>
  );
}

/** Battery state at the current step, shared by the full gauge and the compact strip. */
function useBatteryInfo() {
  const result = useApp((s) => s.result);
  const battery = useApp((s) => s.input.battery);
  const idx = useStep();
  const cap = battery.on ? pos(battery.gwh) : 0;
  const soc = pos(result.soc?.[idx]);
  const frac = cap > 0 ? clamp(safeDiv(soc, cap), 0, 1) : 0;
  const dis = pos(result.batteryDischarge?.[idx]);
  const ch = pos(result.batteryCharge?.[idx]);
  const eu = powerUnit(cap > 0 ? cap : refPowerGW(result));
  const eps = 1e-7;

  let status: string;
  let short: string;
  if (cap <= 0) { status = 'No battery in this setup.'; short = 'Not in this setup'; }
  else if (dis > eps) {
    status = soc > eps ? `About ${fmtDuration(safeDiv(soc, dis))} left at this rate.` : 'Empty.';
    short = soc > eps ? `${fmtDuration(safeDiv(soc, dis))} left` : 'Empty';
  }
  else if (ch > eps) { status = 'Charging.'; short = 'Charging'; }
  else if (frac > 0.995) { status = 'Full, waiting.'; short = 'Full, waiting'; }
  else if (frac < 0.005) { status = 'Empty.'; short = 'Empty'; }
  else { status = 'Idle.'; short = 'Idle'; }
  return { cap, soc, frac, eu, status, short };
}

/** One-line battery readout for the compact (lesson) strip. */
export function BatteryCompact() {
  const { cap, frac, status, short } = useBatteryInfo();
  return (
    <div className="dash-mini" aria-label={`Battery ${Math.round(frac * 100)}% full. ${status}`}>
      <div className="dash-label">Battery</div>
      {cap > 0 ? (
        <div className="dash-mini-value num">{Math.round(frac * 100)}% <span className="dash-unit">full</span></div>
      ) : (
        <div className="dash-mini-value muted">None</div>
      )}
      <div className="faint xsmall dash-mini-sub num">{short}</div>
    </div>
  );
}

/** A simple cylinder that fills and empties, with "% full" and "hours left at this rate". */
export function BatteryGauge() {
  const { cap, soc, frac, eu, status } = useBatteryInfo();

  // Cylinder geometry (SVG units).
  const top = 8, bottom = 62, rx = 17, ry = 5, cx = 20;
  const level = bottom - frac * (bottom - top);

  return (
    <div className="dash-battery" aria-label={`Battery ${Math.round(frac * 100)}% full. ${status}`}>
      <svg width={40} height={70} viewBox="0 0 40 70" aria-hidden="true">
        <rect x={cx - 5} y={1} width={10} height={4} rx={1.5} style={{ fill: 'var(--line-strong)' }} />
        <rect x={cx - rx} y={top} width={rx * 2} height={bottom - top} style={{ fill: 'rgba(20,24,28,0.05)' }} />
        <ellipse cx={cx} cy={bottom} rx={rx} ry={ry} style={{ fill: 'rgba(20,24,28,0.05)' }} />
        {frac > 0 && (
          <g>
            <rect x={cx - rx} y={level} width={rx * 2} height={bottom - level} fill={SOURCE_COLORS.battery} opacity={0.9} />
            <ellipse cx={cx} cy={bottom} rx={rx} ry={ry} fill={SOURCE_COLORS.battery} opacity={0.9} />
            <ellipse cx={cx} cy={level} rx={rx} ry={ry} fill="#7cc7a0" />
          </g>
        )}
        <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill="none" style={{ stroke: 'var(--ink-3)' }} strokeWidth={1} />
        <path d={`M${cx - rx},${top} V${bottom} A${rx},${ry} 0 0 0 ${cx + rx},${bottom} V${top}`} fill="none" style={{ stroke: 'var(--ink-3)' }} strokeWidth={1} />
      </svg>
      <div className="dash-battery-text">
        <div className="dash-label">Battery</div>
        {cap > 0 ? (
          <>
            <div className="dash-card-value num">{Math.round(frac * 100)}% <span className="dash-unit">full</span></div>
            <div className="faint xsmall num">{fmtUnit(soc, eu, undefined, true)}h of {fmtUnit(cap, eu, undefined, true)}h</div>
          </>
        ) : null}
        <div className="muted xsmall">{status}</div>
      </div>
    </div>
  );
}
