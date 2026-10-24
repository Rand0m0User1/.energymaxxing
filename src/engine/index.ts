// Public entry point of the engine. Other modules can import from 'src/engine'.
import type { SimResult } from './types';
import { stepIndex, stepsPerDay } from './timeIndex';

export { simulate, SHED_ORDER, earthSolarUnitClear } from './simulate';
export {
  sunPosition, sunriseSunset, lunarPoleLit, lunarPoleLight, lunarPoleDarkShare, geoEclipseMinutes,
  declinationDeg, LUNAR_DAY_H, MARS_SOL_H,
} from './sun';
export { crf } from './cost';
export { eventHours, inEvent } from './weather';
export { makeRng, hashSeed } from './rng';
export * from './timeIndex';
export type * from './types';

/** Largest value in an array (0 for an empty array). */
export function peakOf(arr: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
}

/** Sum of an array between two indices (end exclusive). Multiply by stepHours to get GWh from GW. */
export function sumRange(arr: ArrayLike<number>, start = 0, end = arr.length): number {
  let s = 0;
  const e = Math.min(end, arr.length);
  for (let i = Math.max(0, start); i < e; i++) s += arr[i];
  return s;
}

/** Energy (GWh) of a GW series over [start, end) steps. */
export function energyGWh(result: SimResult, arr: ArrayLike<number>, start = 0, end = result.steps): number {
  return sumRange(arr, start, end) * result.stepHours;
}

/**
 * The step-index window [start, end) for the day that contains hourOfYear
 * (24 steps on Earth, Moon and Mars; the whole 1,440-step day in orbit).
 */
export function dailySlice(result: SimResult, hourOfYear: number): { start: number; end: number; stepsPerDay: number } {
  const spd = Math.max(1, Math.min(result.steps, stepsPerDay(result)));
  const i = stepIndex(result, hourOfYear);
  const start = Math.floor(i / spd) * spd;
  return { start, end: Math.min(result.steps, start + spd), stepsPerDay: spd };
}

/** The window [start, end) of `days` days starting at the day containing hourOfYear (clamped to the result). */
export function windowSlice(result: SimResult, hourOfYear: number, days: number): { start: number; end: number } {
  const { start, stepsPerDay: spd } = dailySlice(result, hourOfYear);
  return { start, end: Math.min(result.steps, start + spd * Math.max(1, days)) };
}

/** Daily mean (default), sum or max of a per-step array. Returns one value per day. */
export function aggregateDaily(arr: ArrayLike<number>, stepsPerDayN: number, mode: 'mean' | 'sum' | 'max' = 'mean'): Float32Array {
  const spd = Math.max(1, Math.round(stepsPerDayN));
  const days = Math.ceil(arr.length / spd);
  const out = new Float32Array(days);
  for (let d = 0; d < days; d++) {
    const s = d * spd;
    const e = Math.min(arr.length, s + spd);
    let acc = mode === 'max' ? -Infinity : 0;
    for (let i = s; i < e; i++) acc = mode === 'max' ? Math.max(acc, arr[i]) : acc + arr[i];
    out[d] = mode === 'mean' ? acc / Math.max(1, e - s) : mode === 'max' ? (Number.isFinite(acc) ? acc : 0) : acc;
  }
  return out;
}

/** Total supply per step across all generators (GW), plus battery discharge if asked. */
export function totalSupplyAt(result: SimResult, i: number, includeBattery = true): number {
  let s = 0;
  for (const k in result.supply) s += result.supply[k as keyof typeof result.supply][i];
  return includeBattery ? s + result.batteryDischarge[i] : s;
}

/** Battery state of charge as 0..1 at a step (0 if no battery). */
export function socFraction(result: SimResult, i: number, batteryGWh: number): number {
  return batteryGWh > 0 ? Math.max(0, Math.min(1, result.soc[i] / batteryGWh)) : 0;
}
