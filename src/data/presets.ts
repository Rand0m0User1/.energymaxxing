// Default engine input. The store sets the place, plants and battery.
import type { SimInput } from '../engine/types';

const off = { on: false, gw: 0, schedule: null };

export function defaultInput(): SimInput {
  return {
    place: 'berlin',
    year: 2026,
    plants: {
      solar: { ...off }, wind: { ...off }, fission: { ...off }, geothermal: { ...off },
      fusion: { ...off }, hydro: { ...off }, gas: { ...off },
    },
    battery: { on: false, gw: 0, gwh: 0, mode: 'auto', schedule: null },
    districts: {
      homes: { on: true, mw: 380 },
      commercial: { on: true, mw: 220 },
      transport: { on: true, mw: 80 },
      factory: { on: true, mw: 170 },
      datacenter: { on: true, mw: 150 },
      hydrogen: { on: false, mw: 0 },
    },
    flexibleDataCenter: false,
    realisticOutages: false,
    fissionFlexible: false,
    heatStorage: false,
    snow: false,
    lunarMast: false,
    industryFlex: false,
    events: [],
    seed: 42,
    costs: { mode: 'simple', solarPerKW: 1000, batteryPerKWh: 300, fissionPerKW: 10000, waccPct: 7, surplusPrice: 0 },
  };
}
