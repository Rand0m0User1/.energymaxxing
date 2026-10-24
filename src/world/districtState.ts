// Live district supply state from the sim result (safe on the all-zero stub result).
import type { AppState } from '../store';
import type { CityDistrict } from './cityLayout';
import { at } from './worldFrame';

/** Served fraction of a district at a step: 1 when nothing is requested (or the engine is still a stub). */
export function districtServed(s: Pick<AppState, 'result' | 'input'>, d: CityDistrict, i: number): { on: boolean; frac: number; mw: number } {
  const on = !!s.input.districts[d]?.on;
  if (!on) return { on, frac: 0, mw: 0 };
  const dem = at(s.result.demandByDistrict?.[d], i);
  if (dem <= 1e-6) return { on, frac: 1, mw: 0 };
  const frac = Math.max(0, Math.min(1, at(s.result.servedFracByDistrict?.[d], i)));
  return { on, frac, mw: dem * frac * 1000 };
}
