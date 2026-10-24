// Live city supply state from the sim result.
import type { AppState } from '../store';
import type { CityDistrict } from './cityLayout';
import { at, safeStep } from './worldFrame';

/** Served fraction of a district at a step: 1 when nothing is requested. */
export function districtServed(s: Pick<AppState, 'result' | 'input'>, d: CityDistrict, i: number): { on: boolean; frac: number; mw: number } {
  const on = !!s.input.districts[d]?.on;
  if (!on) return { on, frac: 0, mw: 0 };
  const dem = at(s.result.demandByDistrict?.[d], i);
  if (dem <= 1e-6) return { on, frac: 1, mw: 0 };
  const frac = Math.max(0, Math.min(1, at(s.result.servedFracByDistrict?.[d], i)));
  return { on, frac, mw: dem * frac * 1000 };
}

/** True when the whole city has power at the hour shown (same rule as the day summary). */
export function cityLitNow(s: Pick<AppState, 'result' | 'hourOfYear'>): boolean {
  const i = safeStep(s.result, s.hourOfYear);
  return at(s.result.unserved, i) <= 1e-3 * Math.max(0.01, at(s.result.demand, i));
}
