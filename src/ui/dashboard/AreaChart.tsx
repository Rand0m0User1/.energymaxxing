// Stacked area chart of where power came from (Day | Week | Year). Paths are memoized; only the now-line moves each tick.
import { memo, useMemo, type MouseEvent } from 'react';
import { useApp } from '../../store';
import { Segmented } from '../kit';
import { SOURCE_COLORS, UNSERVED_COLOR, CURTAILED_COLOR, DEMAND_COLOR } from '../../data/colors';
import type { ChartRange } from '../../types';
import {
  AXIS_H, CHART_H, CHART_W, buildChart, chartWindow, chartWindowStart, stepPosition, xForStep, type ChartWindow,
} from './chart';
import { fmtUnit, powerUnit, refPowerGW } from './format';

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'year', label: 'Year' },
];

function NowLine({ win }: { win: ChartWindow }) {
  const result = useApp((s) => s.result);
  const hour = useApp((s) => s.hourOfYear);
  const x = xForStep(win, stepPosition(result, hour));
  if (!(x >= 0 && x <= CHART_W)) return null;
  return (
    <g pointerEvents="none">
      <line x1={x} x2={x} y1={0} y2={CHART_H} style={{ stroke: 'var(--ink)' }} strokeWidth={1} />
      <circle cx={x} cy={1.5} r={2.5} style={{ fill: 'var(--ink)' }} />
    </g>
  );
}

/** compact: a small chart for the lesson strip. It follows the range the lesson sets, with no switch and a shorter header. */
export default memo(function AreaChart({ compact = false }: { compact?: boolean }) {
  const result = useApp((s) => s.result);
  const range = useApp((s) => s.chartRange);
  const setRange = useApp((s) => s.setChartRange);
  const hl = useApp((s) => s.highlightSource);
  // Subscribes to the window start only: changes when the day changes, not every tick.
  const start = useApp((s) => chartWindowStart(s.result, s.chartRange, s.hourOfYear));
  const ids = compact ? { clip: 'dash-chart-clip-c', hatch: 'dash-unserved-hatch-c' } : { clip: 'dash-chart-clip', hatch: 'dash-unserved-hatch' };

  const win = useMemo(() => chartWindow(result, range, start), [result, range, start]);
  const paths = useMemo(() => buildChart(result, win), [result, win]);
  const pu = powerUnit(refPowerGW(result));

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    if (win.count <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const st = useApp.getState();
    const sNow = stepPosition(st.result, st.hourOfYear);
    let s: number;
    if (!win.oneDay && win.range === 'year') {
      // Jump to that day, keep the time of day.
      const day = Math.min(win.days - 1, Math.floor(frac * win.days));
      s = day * win.spd + (((sNow % win.spd) + win.spd) % win.spd);
    } else {
      s = Math.round(win.start + frac * win.count);
    }
    st.setHourOfYear(st.hourOfYear + (s - sNow) * result.stepHours);
  };

  const fade = (id: string) => (hl == null ? 0.92 : hl === id ? 1 : 0.22);
  const title = win.range === 'year' && !win.oneDay ? 'Daily average, over the year' : win.oneDay ? 'Over the simulated day' : win.range === 'week' ? 'Over this week' : 'Over this day';

  return (
    <div className={`dash-chart ${compact ? 'dash-chart-compact' : ''}`}>
      {compact ? (
        <div className="dash-label">
          {win.oneDay ? 'Over the simulated day' : win.range === 'year' ? 'Over the year, daily average' : win.range === 'week' ? 'This week' : 'Today'}
        </div>
      ) : (
      <div className="dash-row-between">
        <div>
          <div className="dash-label">Where the power came from</div>
          <div className="faint xsmall">{title}. Click to jump to a time.</div>
        </div>
        {win.oneDay ? (
          <span className="faint xsmall">The orbit model covers one day.</span>
        ) : (
          <Segmented value={range} options={RANGE_OPTIONS} onChange={setRange} label="Chart range" />
        )}
      </div>
      )}
      <svg
        className="dash-chart-svg"
        viewBox={`0 0 ${CHART_W} ${CHART_H + AXIS_H}`}
        role="img"
        aria-label="Stacked chart of power by source, with the city's need as a line"
        onClick={onClick}
      >
        <defs>
          <clipPath id={ids.clip}><rect x={0} y={0} width={CHART_W} height={CHART_H} /></clipPath>
          <pattern id={ids.hatch} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={4} height={4} fill={UNSERVED_COLOR} opacity={0.75} />
            <line x1={0} y1={0} x2={0} y2={4} stroke="#000" strokeWidth={1.5} opacity={0.5} />
          </pattern>
        </defs>
        <rect x={0} y={0} width={CHART_W} height={CHART_H} fill="transparent" />
        <g clipPath={`url(#${ids.clip})`}>
          {paths.curtailedD && <path d={paths.curtailedD} fill={CURTAILED_COLOR} opacity={0.55} />}
          {paths.areas.map((a) => (
            <path key={a.id} d={a.d} fill={SOURCE_COLORS[a.id]} opacity={fade(a.id)} />
          ))}
          {paths.unservedD && <path d={paths.unservedD} fill={`url(#${ids.hatch})`} />}
          {paths.demandD && <path d={paths.demandD} fill="none" stroke={DEMAND_COLOR} strokeWidth={1.25} strokeLinejoin="round" />}
        </g>
        {paths.gridValue > 0 && (
          <g pointerEvents="none">
            <line x1={0} x2={CHART_W} y1={paths.gridY} y2={paths.gridY} style={{ stroke: 'var(--line-strong)' }} strokeWidth={0.75} strokeDasharray="2 3" />
            <text x={2} y={paths.gridY - 3} className="dash-axis-text">{fmtUnit(paths.gridValue, pu)}</text>
          </g>
        )}
        {paths.demandD && (
          <text x={CHART_W - 2} y={Math.max(9, paths.demandEndY - 4)} textAnchor="end" className="dash-axis-text dash-axis-strong">Need</text>
        )}
        {paths.empty && (
          <text x={CHART_W / 2} y={CHART_H / 2} textAnchor="middle" className="dash-axis-text">No power data yet</text>
        )}
        <line x1={0} x2={CHART_W} y1={CHART_H + 0.5} y2={CHART_H + 0.5} style={{ stroke: 'var(--line-strong)' }} strokeWidth={1} />
        {paths.ticks.map((t, i) => (
          <text key={i} x={t.x} y={CHART_H + AXIS_H - 2} textAnchor={t.anchor} className="dash-axis-text">{t.label}</text>
        ))}
        <NowLine win={win} />
      </svg>
      {(paths.hasUnserved || paths.hasCurtailed) && (
        <div className="dash-legend">
          {paths.hasUnserved && (
            <span className="dash-legend-item"><span className="dash-swatch" style={{ background: UNSERVED_COLOR }} />Not enough power</span>
          )}
          {paths.hasCurtailed && (
            <span className="dash-legend-item"><span className="dash-swatch" style={{ background: CURTAILED_COLOR }} />Wasted sun</span>
          )}
        </div>
      )}
    </div>
  );
});
