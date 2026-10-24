// Pure helpers for the stacked area chart. No React. Memoize the output by (result, range, window start).
import type { SimResult } from '../../engine/types';
import { SOURCE_IDS, type ChartRange, type SourceId } from '../../types';
import { stepIndex, stepsPerDay, MONTH_NAMES, MONTH_START_DAY, dayOfYear } from '../../engine/timeIndex';
import { clamp, pos } from './format';

export const CHART_W = 356;
export const CHART_H = 118;
export const AXIS_H = 14;

export interface ChartWindow {
  start: number;    // first step index
  count: number;    // number of steps shown
  bucket: number;   // steps averaged per point
  spd: number;      // steps per day
  days: number;     // days in the simulation
  oneDay: boolean;  // sim covers one day only (orbit)
  range: ChartRange;
}

function simDays(result: SimResult): { spd: number; days: number } {
  const spd = Math.max(1, stepsPerDay(result));
  const days = Math.max(1, Math.floor(result.steps / spd));
  return { spd, days };
}

/** First step of the window for this range. Changes only when the day changes, so it is safe to subscribe to. */
export function chartWindowStart(result: SimResult, range: ChartRange, hourOfYear: number): number {
  if (!result || result.steps <= 0) return 0;
  const { spd, days } = simDays(result);
  if (days <= 1 || range === 'year') return 0;
  const idx = stepIndex(result, hourOfYear);
  const day = clamp(Math.floor(idx / spd), 0, days - 1);
  if (range === 'day') return day * spd;
  const wd = Math.min(7, days);
  return clamp(day - 3, 0, days - wd) * spd;
}

export function chartWindow(result: SimResult, range: ChartRange, start: number): ChartWindow {
  const { spd, days } = simDays(result);
  const oneDay = days <= 1;
  let count: number;
  let bucket: number;
  if (result.steps <= 0) { count = 0; bucket = 1; }
  else if (oneDay) { count = result.steps; bucket = Math.max(1, Math.ceil(count / 288)); }
  else if (range === 'day') { count = spd; bucket = Math.max(1, Math.ceil(spd / 288)); }
  else if (range === 'week') { count = Math.min(7, days) * spd; bucket = Math.max(1, Math.ceil(count / 336)); }
  else { count = days * spd; bucket = spd; }
  const s = clamp(start, 0, Math.max(0, result.steps - 1));
  count = Math.max(0, Math.min(count, result.steps - s));
  return { start: s, count, bucket, spd, days, oneDay, range };
}

/** Fractional step position of the clock (wraps like stepIndex). */
export function stepPosition(result: SimResult, hourOfYear: number): number {
  const span = result.steps * result.stepHours;
  if (!(span > 0) || !(result.stepHours > 0)) return 0;
  let h = hourOfYear - result.startHour;
  h = ((h % span) + span) % span;
  return h / result.stepHours;
}

export function xForStep(win: ChartWindow, s: number): number {
  if (win.count <= 0) return 0;
  return ((s - win.start) / win.count) * CHART_W;
}

export interface ChartPaths {
  areas: { id: SourceId; d: string }[];
  unservedD: string | null;
  curtailedD: string | null;
  demandD: string | null;
  demandEndY: number;
  yMax: number;
  gridValue: number;
  gridY: number;
  ticks: { x: number; label: string; anchor: 'start' | 'middle' | 'end' }[];
  hasUnserved: boolean;
  hasCurtailed: boolean;
  empty: boolean;
}

function niceBelow(v: number): number {
  if (!(v > 0)) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [5, 2.5, 2, 1]) if (m * p <= v) return m * p;
  return p / 2;
}

const f1 = (v: number) => (Math.round(v * 10) / 10).toString();

export function buildChart(result: SimResult, win: ChartWindow): ChartPaths {
  const n = win.count > 0 ? Math.ceil(win.count / win.bucket) : 0;
  const nSrc = SOURCE_IDS.length;
  const tops: Float32Array[] = SOURCE_IDS.map(() => new Float32Array(n));
  const demand = new Float32Array(n);
  const unservedTop = new Float32Array(n);
  const curtTop = new Float32Array(n);
  const xs = new Float32Array(n);
  const srcArrays = SOURCE_IDS.map((id) => (id === 'battery' ? result.batteryDischarge : result.supply?.[id]));
  const any = new Array<boolean>(nSrc).fill(false);
  let hasUnserved = false;
  let hasCurtailed = false;
  let base = 0;
  let withCurt = 0;

  for (let i = 0; i < n; i++) {
    const a = win.start + i * win.bucket;
    const b = Math.min(win.start + win.count, a + win.bucket);
    const len = Math.max(1, b - a);
    let cum = 0;
    for (let k = 0; k < nSrc; k++) {
      const arr = srcArrays[k];
      let sum = 0;
      if (arr) for (let s = a; s < b; s++) sum += pos(arr[s]);
      const v = sum / len;
      if (v > 0) any[k] = true;
      cum += v;
      tops[k][i] = cum;
    }
    let dSum = 0, uSum = 0, cSum = 0;
    for (let s = a; s < b; s++) {
      dSum += pos(result.demand?.[s]);
      uSum += pos(result.unserved?.[s]);
      cSum += pos(result.curtailed?.[s]);
    }
    const u = uSum / len;
    const c = cSum / len;
    if (u > 1e-9) hasUnserved = true;
    if (c > 1e-9) hasCurtailed = true;
    demand[i] = dSum / len;
    unservedTop[i] = cum + u;
    curtTop[i] = cum + u + c;
    xs[i] = (((a + b) / 2 - win.start) / Math.max(1, win.count)) * CHART_W;
    base = Math.max(base, unservedTop[i], demand[i]);
    withCurt = Math.max(withCurt, curtTop[i]);
  }

  // Wasted sun can be huge (overbuild); let it push the scale up a little, then clip it.
  let yMax = Math.max(base, Math.min(withCurt, base * 1.6)) * 1.08;
  const empty = !(yMax > 0);
  if (empty) yMax = 1;
  const y = (v: number) => clamp(CHART_H - (v / yMax) * CHART_H, 0, CHART_H);

  // Points: left edge, bucket centres, right edge (edges repeat the end values).
  const px = (i: number) => (i < 0 ? 0 : i >= n ? CHART_W : xs[i]);
  const val = (arr: Float32Array | null, i: number) => (arr ? arr[clamp(i, 0, n - 1)] : 0);
  const band = (top: Float32Array, bottom: Float32Array | null): string => {
    if (n === 0) return '';
    let d = '';
    for (let i = -1; i <= n; i++) d += `${i === -1 ? 'M' : 'L'}${f1(px(i))},${f1(y(val(top, i)))}`;
    for (let i = n; i >= -1; i--) d += `L${f1(px(i))},${f1(y(val(bottom, i)))}`;
    return d + 'Z';
  };

  const areas: ChartPaths['areas'] = [];
  for (let k = 0; k < nSrc; k++) {
    if (!any[k]) continue;
    areas.push({ id: SOURCE_IDS[k], d: band(tops[k], k === 0 ? null : tops[k - 1]) });
  }
  const stackTop = n > 0 ? tops[nSrc - 1] : null;
  const unservedD = hasUnserved && stackTop ? band(unservedTop, stackTop) : null;
  const curtailedD = hasCurtailed ? band(curtTop, unservedTop) : null;

  let demandD: string | null = null;
  let demandEndY = CHART_H;
  if (n > 0 && demand.some((v) => v > 0)) {
    let d = '';
    for (let i = -1; i <= n; i++) d += `${i === -1 ? 'M' : 'L'}${f1(px(i))},${f1(y(val(demand, i)))}`;
    demandD = d;
    demandEndY = y(demand[n - 1]);
  }

  const gridValue = empty ? 0 : niceBelow(base * 0.95);
  const gridY = y(gridValue);

  return {
    areas, unservedD, curtailedD, demandD, demandEndY, yMax, gridValue, gridY,
    ticks: buildTicks(result, win), hasUnserved, hasCurtailed, empty,
  };
}

function buildTicks(result: SimResult, win: ChartWindow): ChartPaths['ticks'] {
  const ticks: ChartPaths['ticks'] = [];
  if (win.count <= 0) return ticks;
  if (win.oneDay || win.range === 'day') {
    // Hours 0, 6, 12, 18, 24 of the window.
    const hoursShown = win.count * result.stepHours;
    for (const h of [0, 6, 12, 18, 24]) {
      if (h > hoursShown + 1e-6) continue;
      const x = (h / Math.max(1e-9, hoursShown)) * CHART_W;
      ticks.push({ x, label: `${String(h).padStart(2, '0')}:00`, anchor: h === 0 ? 'start' : h >= 24 ? 'end' : 'middle' });
    }
    return ticks;
  }
  if (win.range === 'week') {
    const wd = Math.round(win.count / win.spd);
    const startDay = Math.round(win.start / win.spd);
    for (let d = 0; d < wd; d++) {
      const doy = dayOfYear(result.startHour + (startDay + d) * 24);
      let m = 0;
      for (let i = 0; i < 12; i++) if (doy >= MONTH_START_DAY[i]) m = i;
      ticks.push({ x: ((d + 0.5) / wd) * CHART_W, label: `${MONTH_NAMES[m].slice(0, 3)} ${doy - MONTH_START_DAY[m] + 1}`, anchor: 'middle' });
    }
    return ticks;
  }
  const days = Math.max(1, Math.round(win.count / win.spd));
  for (let m = 0; m < 12; m++) {
    const mid = MONTH_START_DAY[m] + 15;
    if (mid >= days) break;
    ticks.push({ x: (mid / days) * CHART_W, label: MONTH_NAMES[m].slice(0, 3), anchor: 'middle' });
  }
  return ticks;
}
