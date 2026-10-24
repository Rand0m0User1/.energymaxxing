// 24-hour demand shapes per district per season (SPEC §6.2). All shapes are model assumptions.
// Raw numbers are relative; they are normalized here so each day's mean is 1 (the slider value).
// Hour index 0 = midnight to 1 AM, local time.
import type { DistrictId } from '../types';

export type Season = 'winter' | 'summer' | 'shoulder';
export const SEASONS: Season[] = ['winter', 'summer', 'shoulder'];

type Shape = number[];

const RAW: Record<DistrictId, Record<Season, Shape>> = {
  // Low at night, morning bump, big evening peak (6 to 10 PM). Winter evening starts earlier.
  homes: {
    winter: [0.55, 0.5, 0.48, 0.47, 0.48, 0.58, 0.85, 1.1, 1.0, 0.85, 0.78, 0.76, 0.78, 0.76, 0.76, 0.85, 1.1, 1.55, 1.8, 1.82, 1.7, 1.45, 1.1, 0.78],
    summer: [0.6, 0.53, 0.5, 0.48, 0.48, 0.52, 0.68, 0.88, 0.9, 0.85, 0.82, 0.84, 0.88, 0.9, 0.92, 0.98, 1.1, 1.35, 1.6, 1.75, 1.78, 1.6, 1.25, 0.85],
    shoulder: [0.57, 0.52, 0.49, 0.48, 0.48, 0.55, 0.78, 1.0, 0.95, 0.85, 0.8, 0.8, 0.82, 0.82, 0.83, 0.9, 1.1, 1.45, 1.72, 1.8, 1.72, 1.5, 1.15, 0.8],
  },
  // Flat during working hours, low at night.
  commercial: {
    winter: [0.45, 0.42, 0.42, 0.42, 0.42, 0.48, 0.7, 1.05, 1.35, 1.45, 1.48, 1.48, 1.45, 1.48, 1.48, 1.45, 1.4, 1.3, 1.05, 0.8, 0.65, 0.55, 0.5, 0.47],
    summer: [0.45, 0.42, 0.42, 0.42, 0.42, 0.46, 0.62, 0.95, 1.3, 1.45, 1.5, 1.55, 1.55, 1.58, 1.58, 1.55, 1.45, 1.3, 1.05, 0.8, 0.65, 0.55, 0.5, 0.47],
    shoulder: [0.45, 0.42, 0.42, 0.42, 0.42, 0.47, 0.66, 1.0, 1.32, 1.45, 1.48, 1.5, 1.5, 1.52, 1.52, 1.5, 1.42, 1.3, 1.05, 0.8, 0.65, 0.55, 0.5, 0.47],
  },
  // Two peaks: overnight home charging and midday workplace charging.
  transport: {
    winter: [1.6, 1.75, 1.7, 1.55, 1.3, 1.0, 0.7, 0.55, 0.6, 0.8, 1.05, 1.2, 1.25, 1.2, 1.05, 0.85, 0.7, 0.65, 0.7, 0.8, 0.95, 1.15, 1.35, 1.5],
    summer: [1.6, 1.75, 1.7, 1.55, 1.3, 1.0, 0.7, 0.55, 0.6, 0.8, 1.05, 1.2, 1.25, 1.2, 1.05, 0.85, 0.7, 0.65, 0.7, 0.8, 0.95, 1.15, 1.35, 1.5],
    shoulder: [1.6, 1.75, 1.7, 1.55, 1.3, 1.0, 0.7, 0.55, 0.6, 0.8, 1.05, 1.2, 1.25, 1.2, 1.05, 0.85, 0.7, 0.65, 0.7, 0.8, 0.95, 1.15, 1.35, 1.5],
  },
  // Three shifts: nearly flat around the clock.
  factory: {
    winter: [0.95, 0.95, 0.95, 0.95, 0.95, 0.97, 1.0, 1.03, 1.05, 1.05, 1.05, 1.03, 1.0, 1.03, 1.05, 1.05, 1.03, 1.0, 0.98, 0.97, 0.96, 0.95, 0.95, 0.95],
    summer: [0.95, 0.95, 0.95, 0.95, 0.95, 0.97, 1.0, 1.03, 1.05, 1.05, 1.05, 1.03, 1.0, 1.03, 1.05, 1.05, 1.03, 1.0, 0.98, 0.97, 0.96, 0.95, 0.95, 0.95],
    shoulder: [0.95, 0.95, 0.95, 0.95, 0.95, 0.97, 1.0, 1.03, 1.05, 1.05, 1.05, 1.03, 1.0, 1.03, 1.05, 1.05, 1.03, 1.0, 0.98, 0.97, 0.96, 0.95, 0.95, 0.95],
  },
  // Flat around the clock.
  datacenter: {
    winter: Array.from({ length: 24 }, () => 1),
    summer: Array.from({ length: 24 }, () => 1),
    shoulder: Array.from({ length: 24 }, () => 1),
  },
  // Electrolyzers run flat when they are a fixed load.
  hydrogen: {
    winter: Array.from({ length: 24 }, () => 1),
    summer: Array.from({ length: 24 }, () => 1),
    shoulder: Array.from({ length: 24 }, () => 1),
  },
};

/** Extra home heating through the day: high at night and in the morning and evening. */
const RAW_HEATING: Shape = [1.15, 1.15, 1.15, 1.15, 1.2, 1.3, 1.45, 1.4, 1.1, 0.85, 0.7, 0.62, 0.58, 0.56, 0.56, 0.62, 0.8, 1.05, 1.25, 1.3, 1.3, 1.25, 1.2, 1.17];
/** Extra home cooling through the day: afternoon and early evening. */
const RAW_COOLING: Shape = [0.6, 0.5, 0.45, 0.4, 0.38, 0.38, 0.42, 0.5, 0.65, 0.8, 0.95, 1.1, 1.25, 1.4, 1.55, 1.65, 1.72, 1.75, 1.7, 1.55, 1.35, 1.1, 0.9, 0.72];

/** Weekend demand compared with a weekday (the weekly average stays equal to the slider). */
export const WEEKEND_FACTOR: Record<DistrictId, number> = {
  homes: 1.05,
  commercial: 0.55,
  transport: 0.9,
  factory: 0.75,
  datacenter: 1,
  hydrogen: 1,
};

function normalize(s: Shape): Float64Array {
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return Float64Array.from(s, (v) => v / (mean || 1));
}

/** Normalized shapes: mean of 24 values is exactly 1. */
export const LOAD_SHAPES: Record<DistrictId, Record<Season, Float64Array>> = Object.fromEntries(
  (Object.keys(RAW) as DistrictId[]).map((d) => [
    d,
    { winter: normalize(RAW[d].winter), summer: normalize(RAW[d].summer), shoulder: normalize(RAW[d].shoulder) },
  ]),
) as Record<DistrictId, Record<Season, Float64Array>>;

export const HEATING_SHAPE: Float64Array = normalize(RAW_HEATING);
export const COOLING_SHAPE: Float64Array = normalize(RAW_COOLING);

/** Season for a 0-based day of year (northern hemisphere; all our Earth places are northern). */
export function seasonOfDay(day: number): Season {
  const d = ((Math.floor(day) % 365) + 365) % 365;
  if (d >= 334 || d < 59) return 'winter';
  if (d >= 151 && d < 243) return 'summer';
  return 'shoulder';
}

/** 0..1 heating weight for a day: peaks mid-January, zero from spring to autumn. */
export function heatingWeight(day: number): number {
  return Math.max(0, Math.cos((2 * Math.PI * (day - 15)) / 365));
}

/** 0..1 cooling weight for a day: peaks mid-July, zero from autumn to spring. */
export function coolingWeight(day: number): number {
  return Math.max(0, Math.cos((2 * Math.PI * (day - 200)) / 365));
}

/** True on Saturdays and Sundays (the model year starts on a Thursday, like 2026). */
export function isWeekend(day: number): boolean {
  const dow = (((Math.floor(day) + 3) % 7) + 7) % 7; // 0 = Monday
  return dow >= 5;
}
