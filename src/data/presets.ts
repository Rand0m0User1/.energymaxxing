// Default inputs and named presets. Owned by the engine module (values may be tuned), shape is a contract.
import type { SimInput } from '../engine/types';
import type { DemandScenario, PlaceId } from '../types';

export type PresetId = 'today' | 'cleanStart' | 'abuDhabi' | 'handmer' | 'firmMix' | 'moonBase' | 'marsBase' | 'orbit';

const off = { on: false, gw: 0, schedule: null };

export function defaultInput(): SimInput {
  return {
    place: 'abuDhabi',
    year: 2026,
    plants: {
      solar: { on: true, gw: 5.2, schedule: null },
      wind: { ...off, gw: 0.5 },
      fission: { ...off, gw: 0.6 },
      geothermal: { ...off, gw: 0.1 },
      fusion: { ...off, gw: 0.3 },
      hydro: { ...off, gw: 0.1 },
      gas: { on: true, gw: 1.6, schedule: null },
    },
    battery: { on: true, gw: 1.5, gwh: 19, mode: 'auto', schedule: null },
    districts: {
      homes: { on: true, mw: 380 },
      commercial: { on: true, mw: 220 },
      transport: { on: true, mw: 80 },
      factory: { on: true, mw: 170 },
      datacenter: { on: true, mw: 150 },
      hydrogen: { on: false, mw: 200 },
    },
    flexibleDataCenter: false,
    realisticOutages: true,
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

/** Returns a full input for a named preset, keeping the current place unless the preset sets one. */
export function presetInput(id: PresetId, current: SimInput): SimInput {
  const base = defaultInput();
  const keepPlace = (p: PlaceId) => ({ ...base, place: p });
  switch (id) {
    case 'today':
      return keepPlace(current.place);
    case 'cleanStart': {
      const s = keepPlace(current.place);
      s.plants.gas.on = false;
      return s;
    }
    case 'abuDhabi': {
      const s = keepPlace('abuDhabi');
      s.plants.gas.on = false;
      s.plants.solar = { on: true, gw: 5.2, schedule: null };
      s.battery = { ...s.battery, on: true, gw: 1.5, gwh: 19 };
      return s;
    }
    case 'handmer': {
      const s = keepPlace(current.place);
      s.plants.gas.on = false;
      s.plants.solar = { on: true, gw: 10, schedule: null };
      s.battery = { ...s.battery, on: true, gw: 2, gwh: 30 };
      return s;
    }
    case 'firmMix': {
      const s = keepPlace(current.place);
      s.plants.gas.on = false;
      s.plants.solar = { on: true, gw: 3, schedule: null };
      s.plants.fission = { on: true, gw: 1, schedule: null };
      s.battery = { ...s.battery, on: true, gw: 1.5, gwh: 8 };
      return s;
    }
    case 'moonBase': {
      const s = keepPlace('lunarEquator');
      s.plants.gas.on = false;
      s.plants.solar = { on: true, gw: 3, schedule: null };
      s.battery = { ...s.battery, on: true, gw: 1.5, gwh: 19 };
      return s;
    }
    case 'marsBase': {
      const s = keepPlace('marsEquator');
      s.plants.gas.on = false;
      s.plants.solar = { on: true, gw: 14, schedule: null };
      s.battery = { ...s.battery, on: true, gw: 2, gwh: 24 };
      return s;
    }
    case 'orbit': {
      const s = keepPlace('leo');
      s.plants.gas.on = false;
      s.plants.solar = { on: true, gw: 2.8, schedule: null };
      s.battery = { ...s.battery, on: true, gw: 1.5, gwh: 2 };
      return s;
    }
  }
}

/** Demand scenarios (SPEC §6.3). Returns a copy of districts with the scenario applied. */
export function applyScenario(input: SimInput, scenario: DemandScenario): SimInput {
  const d = defaultInput().districts;
  if (scenario === 'ai2030') d.datacenter.mw = 500;
  if (scenario === 'electric2040') {
    d.transport.mw = 250;
    d.homes.mw = Math.round(380 * 1.1);
    d.factory.mw = Math.round(170 * 1.3);
    d.datacenter.mw = 1000;
  }
  return { ...input, districts: d };
}
