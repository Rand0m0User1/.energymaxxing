// Sunlight model. Pure functions, no React.
import type { PlaceId } from '../types';
import type { SunPosition } from './types';
import { PLACES, type Place } from '../data/places';
import { fv } from '../data/facts';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const AIR_MASS_EXP = fv('solarAirMassExp');
export const LUNAR_DAY_H = fv('lunarCycleDays') * 24; // ~708.7 h
export const MARS_SOL_H = fv('marsSolH');
const MARS_SUN = fv('marsSunShare');
const LEO_PERIOD_MIN = fv('leoPeriodMin');
const LEO_SHADOW_MIN = fv('leoShadowMin');
const GEO_ECLIPSE_MAX_MIN = fv('geoEclipseMaxMin');
const GEO_SEASON_DAYS = fv('geoEclipseSeasonDays');
const POLE_LIT = fv('lunarPeakLit');
const POLE_LIT_MAST = fv('lunarMastLit');
const POLE_SWING = fv('lunarPoleDarkSwing');
const EQUINOX_DAYS = [79, 265];

export interface SunOptions {
  /** Lunar south pole: 10 m mast raises the lit share from 80% to 90%. */
  lunarMast?: boolean;
}

/** Solar declination in degrees for a (fractional, 1-based) day of year n. */
export function declinationDeg(n: number): number {
  return 23.44 * Math.sin((2 * Math.PI * (284 + n)) / 365);
}

export interface SunVector {
  /** Components of the unit vector toward the sun in the local frame. */
  east: number;
  north: number;
  up: number;
}

/** Sun direction for a latitude, declination and local solar hour. */
export function sunVector(latDeg: number, declDeg: number, solarHour: number): SunVector {
  const phi = latDeg * D2R;
  const dec = declDeg * D2R;
  const H = 15 * (solarHour - 12) * D2R;
  const cosDec = Math.cos(dec);
  return {
    east: -cosDec * Math.sin(H),
    north: Math.sin(dec) * Math.cos(phi) - cosDec * Math.sin(phi) * Math.cos(H),
    up: Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * cosDec * Math.cos(H),
  };
}

function fromVector(v: SunVector, clearSky: number): SunPosition {
  const up = Math.max(-1, Math.min(1, v.up));
  let az = Math.atan2(v.east, v.north) * R2D;
  if (az < 0) az += 360;
  return { elevationDeg: Math.asin(up) * R2D, azimuthDeg: az, clearSky };
}

/** Simple clear-sky factor from the cosine of the sun's angle from straight up. */
export function clearSkyFactor(cosZenith: number): number {
  return cosZenith > 0 ? Math.pow(cosZenith, AIR_MASS_EXP) : 0;
}

/** Earth sun vector at an hour of year (local solar time). */
export function earthSunVector(lat: number, hourOfYear: number): SunVector {
  const n = hourOfYear / 24 + 1;
  const solarHour = ((hourOfYear % 24) + 24) % 24;
  return sunVector(lat, declinationDeg(n), solarHour);
}

// ---------- off-Earth lit patterns ----------

/** LEO: minutes into the current orbit (0 = leaving Earth's shadow). */
function leoPhaseMin(hourOfYear: number): number {
  const m = hourOfYear * 60;
  return ((m % LEO_PERIOD_MIN) + LEO_PERIOD_MIN) % LEO_PERIOD_MIN;
}

/** GEO eclipse length in minutes for a day of year (0 outside the two eclipse seasons). */
export function geoEclipseMinutes(dayOfYear: number): number {
  let best = Infinity;
  for (const e of EQUINOX_DAYS) best = Math.min(best, Math.abs(dayOfYear - e));
  if (best >= GEO_SEASON_DAYS) return 0;
  const x = best / GEO_SEASON_DAYS;
  return GEO_ECLIPSE_MAX_MIN * Math.sqrt(1 - x * x);
}

/** Lunar south pole: share of each lunar day that is dark, changing with the season. */
export function lunarPoleDarkShare(hourOfYear: number, mast: boolean): number {
  const mean = 1 - (mast ? POLE_LIT_MAST : POLE_LIT);
  const season = Math.sin((2 * Math.PI * hourOfYear) / 8760);
  return Math.max(0, mean * (1 - POLE_SWING * season));
}

/** 0..1 light at the lunar south pole peak (vertical panels that turn, so lit = full output). */
export function lunarPoleLight(hourOfYear: number, mast: boolean): number {
  const p = (((hourOfYear / LUNAR_DAY_H) % 1) + 1) % 1;
  const dark = lunarPoleDarkShare(hourOfYear, mast);
  if (dark <= 0) return 1;
  // Dark window centred on the middle of each lunar day (a ridge blocks the sun in one direction).
  const dist = Math.abs(p - 0.5); // 0..0.5
  const edge = dark / 2;
  const fade = 2 / LUNAR_DAY_H; // about two hours of half-light at each edge
  if (dist <= edge - fade) return 0;
  if (dist >= edge + fade) return 1;
  return (dist - (edge - fade)) / (2 * fade);
}

/** True when the lunar south pole peak is in sunlight. Exposed for visuals and lessons. */
export function lunarPoleLit(hourOfYear: number, mast = false): boolean {
  return lunarPoleLight(hourOfYear, mast) > 0.5;
}

/** Mars local solar hour and (compressed) season. Seasons are squeezed into the 12-month timeline. */
function marsSunVector(lat: number, hourOfYear: number): SunVector {
  const solarHour = (((hourOfYear / MARS_SOL_H) % 1) + 1) % 1 * 24;
  const n = hourOfYear / 24 + 1;
  const decl = 25.19 * Math.sin((2 * Math.PI * (284 + n)) / 365);
  return sunVector(lat, decl, solarHour);
}

/**
 * Sun position for the 3D sky at a given hour of year (0..8760, fractional) at a place.
 * Earth: formula, azimuth clockwise from north. Off Earth: patterns.
 * Orbit "elevation" is positive while lit and negative in shadow.
 */
export function sunPosition(placeId: PlaceId, hourOfYear: number, opts: SunOptions = {}): SunPosition {
  const place: Place = PLACES[placeId];
  switch (place.body) {
    case 'earth': {
      const v = earthSunVector(place.lat ?? 0, hourOfYear);
      return fromVector(v, clearSkyFactor(v.up));
    }
    case 'mars': {
      const v = marsSunVector(place.lat ?? 0, hourOfYear);
      return fromVector(v, clearSkyFactor(v.up) * MARS_SUN);
    }
    case 'orbit': {
      if (placeId === 'geo') {
        const day = Math.floor((((hourOfYear % 8760) + 8760) % 8760) / 24);
        const tod = ((hourOfYear % 24) + 24) % 24;
        const halfH = geoEclipseMinutes(day) / 120; // half the eclipse, in hours
        const fromMidnight = Math.min(tod, 24 - tod);
        const fadeH = 1 / 60;
        let light = 1;
        if (halfH > 0) light = Math.max(0, Math.min(1, (fromMidnight - (halfH - fadeH / 2)) / fadeH));
        const elev = light > 0.5 ? 5 + 40 * (1 + Math.cos(((tod - 12) / 24) * 2 * Math.PI)) : -5;
        return { elevationDeg: elev, azimuthDeg: (tod / 24) * 360, clearSky: light };
      }
      const p = leoPhaseMin(hourOfYear);
      const litMin = LEO_PERIOD_MIN - LEO_SHADOW_MIN;
      const lit = p < litMin;
      const light = lit ? Math.max(0, Math.min(1, p, litMin - p)) : 0; // 1-minute fade
      const elev = lit ? 90 * Math.sin((Math.PI * p) / litMin) : -90 * Math.sin((Math.PI * (p - litMin)) / LEO_SHADOW_MIN);
      return { elevationDeg: elev, azimuthDeg: (p / LEO_PERIOD_MIN) * 360, clearSky: light };
    }
    case 'moon': {
      if (placeId === 'lunarSouthPole') {
        const mast = !!opts.lunarMast;
        const light = lunarPoleLight(hourOfYear, mast);
        const p = (((hourOfYear / LUNAR_DAY_H) % 1) + 1) % 1;
        const wobble = 0.4 * Math.sin(2 * Math.PI * p) + 0.6 * Math.sin((2 * Math.PI * hourOfYear) / 8760);
        const elev = light > 0.5 ? 0.6 + Math.abs(wobble) : -0.4 - Math.abs(wobble);
        return { elevationDeg: elev, azimuthDeg: p * 360, clearSky: light };
      }
      // Equator: sunrise at hour 0, noon after ~177 h, sunset after ~354 h.
      const H = (((hourOfYear / LUNAR_DAY_H) % 1) + 1) % 1 * 360 - 90; // -90..270
      const Hw = H > 180 ? H - 360 : H; // -180..180
      const cz = Math.cos(Hw * D2R);
      return { elevationDeg: 90 - Math.abs(Hw), azimuthDeg: Hw < 0 ? 90 : 270, clearSky: Math.max(0, cz) };
    }
  }
}

/** Sunrise and sunset in local solar hours for a day of year (null if polar day/night or off Earth). */
export function sunriseSunset(placeId: PlaceId, dayOfYear: number): { sunrise: number; sunset: number; dayLength: number } | null {
  const place = PLACES[placeId];
  if (place.body !== 'earth' || place.lat == null) return null;
  const decl = declinationDeg(dayOfYear + 1.5) * D2R; // middle of the day
  const x = -Math.tan(place.lat * D2R) * Math.tan(decl);
  if (x <= -1 || x >= 1) return null;
  const H0 = Math.acos(x) * R2D; // degrees
  const half = H0 / 15;
  return { sunrise: 12 - half, sunset: 12 + half, dayLength: 2 * half };
}
