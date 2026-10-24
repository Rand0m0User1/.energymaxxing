// City demand per district per step (SPEC §6). Slider MW = that district's average over the year.
import type { Place } from '../data/places';
import type { SimInput } from './types';
import { DISTRICT_IDS, type DistrictId } from '../types';
import {
  COOLING_SHAPE, HEATING_SHAPE, LOAD_SHAPES, WEEKEND_FACTOR, coolingWeight, heatingWeight, isWeekend, seasonOfDay,
} from '../data/loadShapes';
import { fv } from '../data/facts';

export interface DemandSeries {
  byDistrict: Record<DistrictId, Float32Array>;
  /** Total firm demand per step (GW). */
  total: Float32Array;
  /** True when the hydrogen district is a flexible absorber rather than a fixed load. */
  hydrogenFlexible: boolean;
}

/** Mean over a year of the homes seasonal multiplier (used so the slider stays the yearly average). */
function homesYearMean(aHeat: number, aCool: number): number {
  let s = 0;
  for (let d = 0; d < 365; d++) s += 1 + aHeat * heatingWeight(d + 0.5) + aCool * coolingWeight(d + 0.5);
  return s / 365;
}

export function buildDemand(place: Place, input: SimInput, steps: number, stepHours: number, startHour: number): DemandSeries {
  const byDistrict = Object.fromEntries(DISTRICT_IDS.map((d) => [d, new Float32Array(steps)])) as Record<DistrictId, Float32Array>;
  const total = new Float32Array(steps);
  const orbit = place.body === 'orbit';
  const hydrogenFlexible = !!input.industryFlex && !!input.districts.hydrogen?.on;

  // Flat-demand override (benchmark test).
  if (input.flatDemandGW != null && input.flatDemandGW > 0) {
    const on = DISTRICT_IDS.filter((d) => input.districts[d]?.on && input.districts[d].mw > 0 && !(d === 'hydrogen' && hydrogenFlexible));
    const sum = on.reduce((a, d) => a + input.districts[d].mw, 0);
    const parts: [DistrictId, number][] = sum > 0 ? on.map((d) => [d, input.districts[d].mw / sum]) : [['homes', 1]];
    for (const [d, frac] of parts) byDistrict[d].fill(input.flatDemandGW * frac);
    total.fill(input.flatDemandGW);
    return { byDistrict, total, hydrogenFlexible };
  }

  // Homes heating / cooling (SPEC §6.2): the share of winter (summer) home demand that is heating (cooling).
  const hs = Math.min(0.9, Math.max(0, place.heatingShare));
  const cs = Math.min(0.9, Math.max(0, place.coolingShare));
  const aHeat = hs / (1 - hs);
  const aCool = cs / (1 - cs);
  const homesNorm = homesYearMean(aHeat, aCool);
  const heatKeep = input.heatStorage ? 1 - fv('heatStorageTrim') : 1;

  for (const d of DISTRICT_IDS) {
    const setting = input.districts[d];
    if (!setting || !setting.on || setting.mw <= 0) continue;
    if (d === 'hydrogen' && hydrogenFlexible) continue;
    const gw = setting.mw / 1000;
    const arr = byDistrict[d];
    const wf = WEEKEND_FACTOR[d];
    const weekday = 7 / (5 + 2 * wf);
    const shapes = LOAD_SHAPES[d];
    for (let t = 0; t < steps; t++) {
      const h = startHour + t * stepHours;
      const day = Math.floor(h / 24);
      const hod = Math.floor(((h % 24) + 24) % 24) % 24;
      const shape = shapes[seasonOfDay(day)];
      const week = orbit ? 1 : isWeekend(day) ? wf * weekday : weekday;
      let v: number;
      if (d === 'homes') {
        const hw = heatingWeight(day + 0.5);
        const cw = coolingWeight(day + 0.5);
        v = (shape[hod] + aHeat * hw * heatKeep * HEATING_SHAPE[hod] + aCool * cw * COOLING_SHAPE[hod]) / homesNorm;
      } else {
        v = shape[hod];
      }
      arr[t] = gw * v * week;
    }
  }

  for (let t = 0; t < steps; t++) {
    let s = 0;
    for (const d of DISTRICT_IDS) s += byDistrict[d][t];
    total[t] = s;
  }
  return { byDistrict, total, hydrogenFlexible };
}
