// STUB — replaced by the engine module. Signature is a contract: simulate(input) => SimResult (pure, sync).
import type { SimInput, SimResult } from './types';
import { DISTRICT_IDS, GEN_IDS, type DistrictId, type GenId } from '../types';

export function simulate(input: SimInput): SimResult {
  const steps = 8760;
  const z = () => new Float32Array(steps);
  const rec = <K extends string>(keys: K[]) => Object.fromEntries(keys.map((k) => [k, z()])) as Record<K, Float32Array>;
  const zeroGen = Object.fromEntries(GEN_IDS.map((g) => [g, 0])) as Record<GenId, number>;
  return {
    stepHours: 1, steps, startHour: 0,
    supply: rec(GEN_IDS), available: rec(GEN_IDS),
    batteryCharge: z(), batteryDischarge: z(), soc: z(), demand: z(),
    demandByDistrict: rec<DistrictId>(DISTRICT_IDS), served: z(), unserved: z(),
    servedFracByDistrict: rec<DistrictId>(DISTRICT_IDS), curtailed: z(), industryAbsorbed: z(), flexShed: z(), co2t: z(),
    sun: z(), wind: z(),
    totals: {
      lightsOnPct: 100, longestBlackoutH: 0, demandTWh: 0, servedTWh: 0, unservedTWh: 0, curtailedTWh: 0,
      generatedTWh: { ...zeroGen }, batteryOutTWh: 0, co2Mt: 0, costPerMWh: { low: 0, mid: 0, high: 0 },
      homeBillPerMonth: 0, overbuildRatio: 0, peakDemandGW: 0, capacityFactor: { ...zeroGen },
      share: { ...zeroGen, battery: 0 },
    },
  };
}
