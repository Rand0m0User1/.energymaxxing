// Engine input/output contract. The engine is pure TypeScript (no React).
// Add optional fields if needed; never rename or remove existing ones.
import type { DistrictId, GenId, PlaceId, WeatherEvent } from '../types';

export interface PlantSetting {
  on: boolean;
  /** Installed size in GW (for orbit/Moon/Mars bases the UI shows kW/MW but the engine still uses GW). */
  gw: number;
  /** Optional 24-hour "when does it run" schedule for dispatchable plants. null = automatic. */
  schedule: boolean[] | null;
}

export interface BatterySetting {
  on: boolean;
  gw: number;   // power: how fast
  gwh: number;  // energy: how much
  mode: 'auto' | 'schedule';
  /** 24 entries: 1 = charge, -1 = discharge, 0 = idle. Used when mode = 'schedule'. */
  schedule: (-1 | 0 | 1)[] | null;
}

export interface DistrictSetting { on: boolean; mw: number }

export interface CostSettings {
  mode: 'simple' | 'advanced';
  solarPerKW: number;      // $/kW installed
  batteryPerKWh: number;   // $/kWh installed
  fissionPerKW: number;    // $/kW overnight
  waccPct: number;         // cost of capital, %
  surplusPrice: number;    // $/MWh paid for curtailed solar (Handmer test)
}

export interface SimInput {
  place: PlaceId;
  year: number;                 // fusion only allowed if >= 2035
  plants: Record<GenId, PlantSetting>;
  battery: BatterySetting;
  districts: Record<DistrictId, DistrictSetting>;
  flexibleDataCenter: boolean;  // 30% of DC load can pause up to 4 h
  realisticOutages: boolean;    // fission refuelling outages
  fissionFlexible: boolean;     // fission can drop to 50% when solar floods
  heatStorage: boolean;         // Handmer sand pile: trims winter heating demand
  snow: boolean;                // snow on panels at high latitude (assumption)
  lunarMast: boolean;           // 10 m mast at lunar south pole -> 90% lit
  industryFlex: boolean;        // flexible industry absorbs curtailed energy
  events: WeatherEvent[];
  seed: number;
  costs: CostSettings;
  /** Optional: replace the district model with a flat demand of this many GW (used by the benchmark test). */
  flatDemandGW?: number;
  /** Optional: which day of year an orbit (one-day) sim covers. Default: the place's hardest day. */
  orbitDay?: number;
}

export interface SimTotals {
  lightsOnPct: number;          // % of steps with zero unserved energy
  longestBlackoutH: number;
  demandTWh: number;
  servedTWh: number;
  unservedTWh: number;
  curtailedTWh: number;
  generatedTWh: Record<GenId, number>;
  batteryOutTWh: number;
  co2Mt: number;                // million tonnes CO2 over the sim period
  costPerMWh: { low: number; mid: number; high: number }; // per MWh actually used
  homeBillPerMonth: number;     // $ / month for a typical home, mid cost
  overbuildRatio: number;       // installed gen + storage power / peak demand
  peakDemandGW: number;
  capacityFactor: Record<GenId, number>; // 0..1
  /** Share of served energy by source (0..1), battery counted as its own source. */
  share: Record<GenId | 'battery', number>;
}

export interface SimResult {
  /** Hours per step (1 on Earth/Moon/Mars, 1/60 in orbit). */
  stepHours: number;
  steps: number;
  /** Hour-of-year at step 0 (0 for full-year sims). */
  startHour: number;
  /** GW delivered by each generator per step (before curtailment is subtracted for solar/wind it is the amount actually used or stored). */
  supply: Record<GenId, Float32Array>;
  /** GW each generator could have made (availability), used for capacity factor and "making X GW now". */
  available: Record<GenId, Float32Array>;
  batteryCharge: Float32Array;     // GW into battery (>= 0)
  batteryDischarge: Float32Array;  // GW out of battery (>= 0)
  soc: Float32Array;               // GWh stored
  demand: Float32Array;            // GW requested (after heat storage, before flex)
  demandByDistrict: Record<DistrictId, Float32Array>; // GW per district requested
  served: Float32Array;            // GW actually served
  unserved: Float32Array;          // GW unserved
  /** 0..1 fraction of each district's request that was served (shed order: datacenter flex, factory, commercial, homes last). */
  servedFracByDistrict: Record<DistrictId, Float32Array>;
  curtailed: Float32Array;         // GW wasted
  industryAbsorbed: Float32Array;  // GW absorbed by flexible industry from would-be curtailment
  flexShed: Float32Array;          // GW of data center load paused
  co2t: Float32Array;              // tonnes CO2 per step
  /** 0..1 sunlight factor at the site per step (clear sky × weather), for visuals. */
  sun: Float32Array;
  /** 0..1 wind factor per step, for turbine animation. */
  wind: Float32Array;
  /** Optional: 0..1 hydro reservoir fill per step (for the dam visual). */
  hydroStore?: Float32Array;
  totals: SimTotals;
}

export interface SunPosition {
  /** Degrees above horizon (negative = below). */
  elevationDeg: number;
  /** Degrees clockwise from north. */
  azimuthDeg: number;
  /** 0..1 clear-sky output factor. */
  clearSky: number;
}
