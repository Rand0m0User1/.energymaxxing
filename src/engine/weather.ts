// Weather: daily cloudiness, wind, and weather events (SPEC §9.2–9.4). Seeded, so repeatable.
import type { Place } from '../data/places';
import type { SimInput } from './types';
import type { WeatherEvent, WeatherEventKind } from '../types';
import { PLACE_INDEX } from './placeIndex';
import { hashSeed, makeRng } from './rng';
import { MONTH_START_DAY } from './timeIndex';
import { fv } from '../data/facts';
import { MARS_SOL_H } from './sun';

const MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_MID = MONTH_START_DAY.map((s, i) => s + MONTH_LEN[i] / 2);

/** Smoothly interpolate a 12-month table at a (fractional) day of year. */
export function monthlyAt(table: number[], day: number): number {
  const d = ((day % 365) + 365) % 365;
  let i = 11;
  for (let m = 0; m < 12; m++) if (d >= MONTH_MID[m]) i = m;
  const j = (i + 1) % 12;
  const a = MONTH_MID[i];
  let b = MONTH_MID[j];
  let x = d;
  if (b <= a) {
    b += 365;
    if (x < a) x += 365;
  }
  const t = (x - a) / (b - a);
  return table[i] * (1 - t) + table[j] * t;
}

/** How long each event lasts, in hours. */
export function eventHours(kind: WeatherEventKind): number {
  switch (kind) {
    case 'cloudyDay': return fv('cloudyDayHours');
    case 'cloudyWeek': return fv('cloudyWeekDays') * 24;
    case 'windlessWeek': return fv('windlessWeekDays') * 24;
    case 'dustStorm': return fv('marsDustStormSols') * MARS_SOL_H;
  }
}

/** True if hour h falls inside the event (wraps around the end of the year). */
export function inEvent(h: number, e: WeatherEvent, spanH = 8760): boolean {
  const d = (((h - e.startHour) % spanH) + spanH) % spanH;
  return d < eventHours(e.kind);
}

export interface WeatherSeries {
  /** 0..1 multiplier on clear-sky sunlight per step. */
  solar: Float32Array;
  /** 0..1 wind output per step (share of the turbines' maximum). */
  wind: Float32Array;
}

/**
 * Builds per-step weather.
 * Earth: one cloudiness draw per day around the month's clearness (days are linked, so cloudy spells happen),
 * wind = monthly mean × smoothed random series, capped at 1.
 * Mars: small daily dust changes plus optional dust storm. Moon and orbit: always clear, no wind.
 */
export function buildWeather(place: Place, input: SimInput, steps: number, stepHours: number, startHour: number): WeatherSeries {
  const solar = new Float32Array(steps);
  const wind = new Float32Array(steps);
  const pIdx = PLACE_INDEX[place.id];

  if (place.body === 'orbit' || place.body === 'moon') {
    solar.fill(1);
    return { solar, wind };
  }

  // ----- daily cloudiness -----
  const days = Math.ceil((steps * stepHours) / 24) + 1;
  const daily = new Float64Array(days);
  const rs = makeRng(hashSeed(input.seed, pIdx, 1));
  const rho = 0.55;
  const k = Math.sqrt(1 - rho * rho);
  let z = rs.normal();
  for (let d = 0; d < days; d++) {
    z = rho * z + k * rs.normal();
    const c = monthlyAt(place.clearness, d + 0.5);
    // Clear places vary little from day to day; cloudy places vary a lot.
    const sd = place.body === 'mars' ? 0.03 : c * (0.02 + 0.8 * (1 - c) * (1 - c));
    daily[d] = Math.max(0.05, Math.min(1, c + sd * z));
  }

  const cloudyDay = fv('cloudyDayFactor');
  const cloudyWeek = fv('cloudyWeekFactor');
  const dust = fv('marsDustStormFactor');
  const windless = fv('windlessWeekFactor');
  const events = input.events ?? [];
  const solarEvents = events.filter((e) =>
    place.body === 'mars' ? e.kind === 'dustStorm' : e.kind === 'cloudyDay' || e.kind === 'cloudyWeek');
  const windEvents = place.body === 'earth' ? events.filter((e) => e.kind === 'windlessWeek') : [];

  for (let t = 0; t < steps; t++) {
    const h = startHour + t * stepHours;
    const d = Math.min(days - 1, Math.floor((t * stepHours) / 24));
    let w = daily[d];
    for (const e of solarEvents) {
      if (!inEvent(h, e)) continue;
      if (e.kind === 'cloudyDay') w = Math.min(w, cloudyDay);
      else if (e.kind === 'cloudyWeek') w = Math.min(w, cloudyWeek);
      else if (e.kind === 'dustStorm') w = w * dust;
    }
    solar[t] = w;
  }

  // ----- wind -----
  const hasWind = place.windMonthly.some((v) => v > 0);
  if (hasWind) {
    const rw = makeRng(hashSeed(input.seed, pIdx, 2));
    const sigma = 0.65;
    const tauH = 30; // weather systems last about a day or two
    const r = Math.exp(-stepHours / tauH);
    const kk = Math.sqrt(1 - r * r);
    let zw = rw.normal();
    const half = (sigma * sigma) / 2;
    for (let t = 0; t < steps; t++) {
      zw = r * zw + kk * rw.normal();
      const h = startHour + t * stepHours;
      const mean = monthlyAt(place.windMonthly, h / 24);
      let v = Math.min(1, mean * Math.exp(sigma * zw - half));
      for (const e of windEvents) if (inEvent(h, e)) v = Math.min(v, windless);
      wind[t] = v;
    }
  }

  return { solar, wind };
}
