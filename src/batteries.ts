// The four battery types and the four ways batteries are improving. Simplified on purpose.

export type BatteryType = 'lfp' | 'nmc' | 'sodium' | 'lead';
export const BATTERY_TYPES: BatteryType[] = ['lfp', 'nmc', 'sodium', 'lead'];

export interface FutureBatteries {
  /** Cheaper to build, using cheaper materials. */
  cost: boolean;
  /** Lasts more years before it wears out. */
  life: boolean;
  /** Adds long-duration storage that holds energy for days. */
  longDuration: boolean;
  /** Relies less on a few countries for materials. */
  supply: boolean;
}
export const NO_FUTURE: FutureBatteries = { cost: false, life: false, longDuration: false, supply: false };

export interface BatteryInfo {
  name: string;
  short: string;
  /** One plain line on what it is good and bad at. */
  line: string;
  /** Storage the city's battery budget buys, GWh. */
  gwh: number;
  /** Share of energy you get back out (0–1). */
  efficiency: number;
  /** Years before it wears out, in daily use. */
  lifeYears: number;
  /** Rough installed cost, $ per kWh stored. */
  costPerKWh: number;
  /** 1 (worst) to 3 (best). */
  ratings: { cost: number; life: number; safety: number; supply: number };
}

export const BATTERIES: Record<BatteryType, BatteryInfo> = {
  lfp: {
    name: 'Lithium iron phosphate', short: 'LFP',
    line: 'Cheap, safe and long-lasting. Most new grid batteries use it.',
    gwh: 19, efficiency: 0.9, lifeYears: 15, costPerKWh: 300,
    ratings: { cost: 3, life: 3, safety: 3, supply: 2 },
  },
  nmc: {
    name: 'Nickel manganese cobalt', short: 'NMC',
    line: 'Packs the most energy per kilo, so cars use it. Costs more, wears out sooner.',
    gwh: 12, efficiency: 0.92, lifeYears: 10, costPerKWh: 420,
    ratings: { cost: 2, life: 2, safety: 2, supply: 1 },
  },
  sodium: {
    name: 'Sodium-ion', short: 'Sodium-ion',
    line: 'Made from common salt, so no lithium. Heavier and newer.',
    gwh: 15, efficiency: 0.88, lifeYears: 12, costPerKWh: 340,
    ratings: { cost: 3, life: 2, safety: 3, supply: 3 },
  },
  lead: {
    name: 'Lead-acid', short: 'Lead-acid',
    line: 'Old and cheap to buy, but only half its charge is usable and it wears out fast.',
    gwh: 7, efficiency: 0.78, lifeYears: 4, costPerKWh: 280,
    ratings: { cost: 2, life: 1, safety: 2, supply: 3 },
  },
};

/** Long-duration storage added by the "longDuration" improvement, GWh. */
export const LONG_DURATION_GWH = 100;

/** Battery as used by the model, after any future improvements. */
export function batterySpec(type: BatteryType, future: FutureBatteries) {
  const b = BATTERIES[type];
  let gwh = b.gwh;
  let efficiency = b.efficiency;
  let costPerKWh = b.costPerKWh;
  let lifeYears = b.lifeYears;
  let supply = b.ratings.supply;
  if (future.cost) { costPerKWh *= 0.6; gwh *= 1.6; }
  if (future.life) lifeYears *= 2;
  if (future.longDuration) {
    // Long-duration storage holds far more energy but gives back less of it.
    efficiency = (efficiency * gwh + 0.6 * LONG_DURATION_GWH) / (gwh + LONG_DURATION_GWH);
    gwh += LONG_DURATION_GWH;
  }
  if (future.supply) supply = 3;
  return { gwh, efficiency, costPerKWh, lifeYears, supply, gw: 2 };
}
