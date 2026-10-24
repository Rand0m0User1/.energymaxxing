import type { SimResult } from './types';

/** Index into SimResult arrays for a given hour of year. Orbit sims cover one day, so they wrap at 24 h. */
export function stepIndex(result: SimResult, hourOfYear: number): number {
  const span = result.steps * result.stepHours;
  let h = hourOfYear - result.startHour;
  h = ((h % span) + span) % span;
  return Math.min(result.steps - 1, Math.max(0, Math.floor(h / result.stepHours)));
}

/** Steps per day for this result (24 on Earth, 1440 in orbit). */
export function stepsPerDay(result: SimResult): number {
  return Math.round(24 / result.stepHours);
}

export const HOURS_PER_YEAR = 8760;
export const MONTH_START_DAY = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function dayOfYear(hourOfYear: number): number {
  return Math.floor((((hourOfYear % HOURS_PER_YEAR) + HOURS_PER_YEAR) % HOURS_PER_YEAR) / 24);
}

export function timeOfDay(hourOfYear: number): number {
  return ((hourOfYear % 24) + 24) % 24;
}

export function monthOf(day: number): number {
  let m = 0;
  for (let i = 0; i < 12; i++) if (day >= MONTH_START_DAY[i]) m = i;
  return m;
}

export function formatClock(hourOfYear: number): string {
  const t = timeOfDay(hourOfYear);
  const hh = Math.floor(t);
  const mm = Math.floor((t - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function formatDate(hourOfYear: number): string {
  const d = dayOfYear(hourOfYear);
  const m = monthOf(d);
  return `${MONTH_NAMES[m]} ${d - MONTH_START_DAY[m] + 1}`;
}
