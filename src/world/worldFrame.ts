// Per-frame world state shared by the 3D components (sun, lights, particles, windows).
// Updated once per frame by <WorldClock/> (runs before the other useFrame callbacks).
// On the title screen the visuals use a local "display hour" (a dusk loop) without touching store.hourOfYear.
import { useFrame } from '@react-three/fiber';
import { useApp, hourFor } from '../store';
import { sunPosition, sunriseSunset } from '../engine/sun';
import { stepIndex } from '../engine/timeIndex';
import type { SimResult } from '../engine/types';

export const worldFrame = {
  /** Hour of year used for all visuals this frame. */
  hour: 0,
  /** Index into the current SimResult arrays (0 if the result is empty). */
  step: 0,
  elevDeg: 0,
  azDeg: 180,
  /** 0..1, 1 = full daylight. */
  daylight: 1,
  /** 0..1, how much the city lights are on (1 = full night, sun below about -2 degrees). */
  night: 0,
  /** Seconds since the canvas started. */
  t: 0,
};

const TITLE_LOOP_S = 36;

/** Visual hour: store.hourOfYear, except on the title screen where it loops gently through dusk. */
export function computeDisplayHour(elapsed: number): number {
  const s = useApp.getState();
  if (s.screen !== 'title' || s.env !== 'earth') return s.hourOfYear;
  const day = Math.floor(hourFor('earth', s.season, 12) / 24);
  let start = 17.5;
  let end = 20.5;
  try {
    const rs = sunriseSunset(s.input.place, day);
    if (rs && isFinite(rs.sunset)) {
      start = rs.sunset - 1;
      end = rs.sunset + 2;
    }
  } catch {
    /* engine mid-edit: keep defaults */
  }
  const k = 0.5 - 0.5 * Math.cos((elapsed / TITLE_LOOP_S) * Math.PI * 2);
  return day * 24 + start + (end - start) * k;
}

/** Safe step index (never NaN, never out of range). */
export function safeStep(result: SimResult, hour: number): number {
  if (!result || !(result.steps > 0) || !(result.stepHours > 0)) return 0;
  const i = stepIndex(result, hour);
  return isFinite(i) ? i : 0;
}

/** Safe array read: finite number or 0. */
export function at(arr: ArrayLike<number> | undefined, i: number): number {
  if (!arr) return 0;
  const v = arr[i];
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

export function WorldClock() {
  useFrame((state) => {
    const s = useApp.getState();
    const t = state.clock.elapsedTime;
    const hour = computeDisplayHour(t);
    worldFrame.t = t;
    worldFrame.hour = hour;
    worldFrame.step = safeStep(s.result, hour);
    let elev = 30;
    let az = 180;
    try {
      const sp = sunPosition(s.input.place, hour);
      if (isFinite(sp.elevationDeg)) elev = sp.elevationDeg;
      if (isFinite(sp.azimuthDeg)) az = sp.azimuthDeg;
    } catch {
      /* keep defaults */
    }
    worldFrame.elevDeg = elev;
    worldFrame.azDeg = az;
    worldFrame.daylight = smoothstep(-5, 10, elev);
    worldFrame.night = clamp01((0.5 - elev) / 5);
  }, -2);
  return null;
}
