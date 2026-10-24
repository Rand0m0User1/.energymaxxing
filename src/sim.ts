// Plain-language summary of the day being shown: is the power on, where it comes from, and how the day went.
import type { SimResult } from './engine/types';
import { stepIndex } from './engine/timeIndex';
import { LUNAR_DAY_H } from './engine/sun';
import { hourFor, type Env, type PowerId, type Season } from './store';

export interface Slot {
  /** Main source in this slot, or null if the city was dark. */
  main: PowerId | null;
  lit: boolean;
}

export interface DaySummary {
  litNow: boolean;
  /** Share of demand met right now (0–1). */
  metNow: number;
  /** Share of power coming from each source right now (sums to 1 when anything runs). */
  mixNow: Partial<Record<PowerId, number>>;
  /** Battery charge, 0–1. */
  batteryNow: number;
  /** 24 slots across the day (on the Moon each slot is about 30 Earth hours). */
  slots: Slot[];
  /** Share of the day with the lights fully on (0–1). */
  litShare: number;
  usesGas: boolean;
}

const MAP: Record<PowerId, (r: SimResult, i: number) => number> = {
  solar: (r, i) => r.supply.solar[i],
  wind: (r, i) => r.supply.wind[i],
  nuclear: (r, i) => r.supply.fission[i],
  gas: (r, i) => r.supply.gas[i],
  battery: (r, i) => r.batteryDischarge[i],
};
const ORDER: PowerId[] = ['solar', 'wind', 'battery', 'nuclear', 'gas'];

/** Power going to the city (not into the battery) from each source at step i. */
function mixAt(r: SimResult, i: number): Partial<Record<PowerId, number>> {
  const raw = ORDER.map((p) => Math.max(0, MAP[p](r, i)));
  const gen = raw[0] + raw[1] + raw[3] + raw[4];
  // Generators also fill the battery; remove that share so the mix shows what the city uses.
  const toCity = gen > 0 ? Math.max(0, 1 - r.batteryCharge[i] / gen) : 0;
  const parts = ORDER.map((p, k) => (p === 'battery' ? raw[k] : raw[k] * toCity));
  const sum = parts.reduce((a, b) => a + b, 0);
  const out: Partial<Record<PowerId, number>> = {};
  if (sum > 1e-6) ORDER.forEach((p, k) => { if (parts[k] > 1e-6) out[p] = parts[k] / sum; });
  return out;
}

const isLit = (r: SimResult, i: number) => r.unserved[i] <= 1e-3 * Math.max(0.01, r.demand[i]);

export function summarize(r: SimResult, env: Env, season: Season, hourOfYear: number, batteryGWh: number): DaySummary {
  const i = stepIndex(r, hourOfYear);
  const mixNow = mixAt(r, i);
  const slots: Slot[] = [];
  let litSteps = 0;
  let total = 0;
  let usesGas = false;
  for (let s = 0; s < 24; s++) {
    const h0 = hourFor(env, season, s);
    const h1 = hourFor(env, season, s + 1);
    const a = stepIndex(r, h0);
    const n = Math.max(1, Math.round((h1 - h0) / r.stepHours));
    let lit = 0;
    const acc: Record<PowerId, number> = { solar: 0, wind: 0, battery: 0, nuclear: 0, gas: 0 };
    for (let k = 0; k < n; k++) {
      const j = Math.min(r.steps - 1, a + k);
      if (isLit(r, j)) lit++;
      const m = mixAt(r, j);
      for (const p of ORDER) acc[p] += m[p] ?? 0;
      if (r.supply.gas[j] > 1e-4) usesGas = true;
    }
    litSteps += lit;
    total += n;
    const main = ORDER.reduce<PowerId | null>((best, p) => (acc[p] > 1e-6 && (best == null || acc[p] > acc[best]) ? p : best), null);
    slots.push({ main: lit / n >= 0.5 ? main : null, lit: lit / n >= 0.5 });
  }
  const demand = r.demand[i];
  return {
    litNow: isLit(r, i),
    metNow: demand > 0 ? Math.min(1, r.served[i] / demand) : 1,
    mixNow,
    batteryNow: batteryGWh > 0 ? Math.min(1, r.soc[i] / batteryGWh) : 0,
    slots,
    litShare: total > 0 ? litSteps / total : 1,
    usesGas,
  };
}

/** Moon: Earth days per lunar day, for labels. */
export const MOON_DAY_EARTH_DAYS = Math.round(LUNAR_DAY_H / 24);
