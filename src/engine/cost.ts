// Cost model (SPEC §9.7). Cost is divided by energy the city USED, so overbuilding raises the price.
import type { CostSettings } from './types';
import type { GenId } from '../types';
import { fv } from '../data/facts';

/** Capital recovery factor: turns an upfront cost into an equal yearly payment. */
export function crf(ratePct: number, years: number): number {
  const r = ratePct / 100;
  if (years <= 0) return 0;
  if (r <= 1e-9) return 1 / years;
  const g = Math.pow(1 + r, years);
  return (r * g) / (g - 1);
}

export interface CostInputs {
  costs: CostSettings;
  /** Installed size actually in use (GW), 0 if off. */
  capGW: Record<GenId, number>;
  batteryGW: number;
  batteryGWh: number;
  /** MWh each plant could have made (for capacity-heavy plants we pay for the plant either way). */
  availMWh: Record<GenId, number>;
  /** MWh each plant actually delivered to the city or the battery. */
  usedMWh: Record<GenId, number>;
  /** MWh the fission plant actually made (after flexible turn-down). */
  fissionMadeMWh: number;
  dischargeMWh: number;
  curtailedMWh: number;
  absorbedMWh: number;
  servedMWh: number;
  /** Length of the simulated period in years (1 for a full year, 1/365 for an orbit day). */
  spanYears: number;
}

export interface CostOutputs {
  low: number;
  mid: number;
  high: number;
  /** Total cost over the period, mid case ($). */
  totalMid: number;
}

type Range = [number, number];

const lazard = (): Record<GenId, Range> => ({
  solar: [fv('lcoeSolarLow'), fv('lcoeSolarHigh')],
  wind: [fv('lcoeWindLow'), fv('lcoeWindHigh')],
  fission: [fv('lcoeNuclearLow'), fv('lcoeNuclearHigh')],
  geothermal: [fv('lcoeGeothermalLow'), fv('lcoeGeothermalHigh')],
  fusion: [fv('lcoeFusionLow'), fv('lcoeFusionHigh')],
  hydro: [fv('lcoeHydroLow'), fv('lcoeHydroHigh')],
  gas: [fv('lcoeGasLow'), fv('lcoeGasHigh')],
});

/**
 * Simple mode: Lazard low/high per source.
 *  - solar, wind, fission are paid for by size (Lazard $/MWh × the US-average output of that size),
 *    so a weak site or a turned-down reactor costs more per useful MWh;
 *  - geothermal and fusion: $/MWh × what they could make; hydro and gas: $/MWh × what they made;
 *  - battery: storage adder per MWh it gave back.
 * Advanced mode: solar, battery and fission use build cost × CRF + upkeep (+ fuel); the rest stay on Lazard.
 * Spare energy (curtailed or soaked up by flexible industry) is credited at the surplus price.
 */
export function computeCost(c: CostInputs): CostOutputs {
  const L = lazard();
  const hoursSpan = 8760 * c.spanYears;
  const refCF: Partial<Record<GenId, number>> = { solar: fv('solarCFUS'), wind: fv('windCFUS'), fission: fv('nuclearCFUS') };

  const lazardEnergy = (g: GenId): number => {
    if (g === 'solar' || g === 'wind' || g === 'fission') return c.capGW[g] * 1000 * (refCF[g] ?? 1) * hoursSpan;
    if (g === 'geothermal' || g === 'fusion') return c.availMWh[g];
    return c.usedMWh[g];
  };

  let low = 0;
  let high = 0;
  const advanced = c.costs.mode === 'advanced';
  const advancedSet: GenId[] = advanced ? ['solar', 'fission'] : [];

  for (const g of Object.keys(L) as GenId[]) {
    if (advancedSet.includes(g)) continue;
    const e = lazardEnergy(g);
    low += L[g][0] * e;
    high += L[g][1] * e;
  }

  let fixed = 0;
  if (advanced) {
    const r = c.costs.waccPct;
    const solarKW = c.capGW.solar * 1e6;
    const fissionKW = c.capGW.fission * 1e6;
    const batteryKWh = c.batteryGWh * 1e6;
    const solarYear = solarKW * (c.costs.solarPerKW * crf(r, fv('solarLifeYears')) + fv('solarFixedOMPerKWYr'));
    const batteryYear = batteryKWh * (c.costs.batteryPerKWh * crf(r, fv('batteryLifeYears')) + fv('batteryFixedOMPerKWhYr'));
    const fissionYear = fissionKW * c.costs.fissionPerKW * crf(r, fv('fissionLifeYears'));
    fixed = (solarYear + batteryYear + fissionYear) * c.spanYears + (fv('fissionOM') + fv('fissionFuel')) * c.fissionMadeMWh;
  } else {
    low += fv('lcoeStorageAdderLow') * c.dischargeMWh;
    high += fv('lcoeStorageAdderHigh') * c.dischargeMWh;
  }

  const credit = Math.max(0, c.costs.surplusPrice) * (c.curtailedMWh + c.absorbedMWh);
  const totalLow = low + fixed - credit;
  const totalHigh = high + fixed - credit;
  const totalMid = (totalLow + totalHigh) / 2;
  if (!(c.servedMWh > 1e-9)) return { low: 0, mid: 0, high: 0, totalMid: 0 };
  const per = (x: number) => Math.max(0, x / c.servedMWh);
  return { low: per(totalLow), mid: per(totalMid), high: per(totalHigh), totalMid };
}
