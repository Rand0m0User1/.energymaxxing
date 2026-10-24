// STUB — replaced by the engine module. Signatures are a contract.
import type { PlaceId } from '../types';
import type { SunPosition } from './types';

/** Sun position for the 3D sky at a given hour of year (0..8760, fractional) at a place. */
export function sunPosition(place: PlaceId, hourOfYear: number): SunPosition {
  const h = hourOfYear % 24;
  const elev = 50 * Math.sin(((h - 6) / 12) * Math.PI);
  return { elevationDeg: elev, azimuthDeg: 90 + (h - 6) * 15, clearSky: Math.max(0, Math.sin((elev * Math.PI) / 180)) };
}

/** Sunrise and sunset in local solar hours for a day of year (null if polar day/night or off Earth). */
export function sunriseSunset(place: PlaceId, dayOfYear: number): { sunrise: number; sunset: number; dayLength: number } | null {
  return { sunrise: 6, sunset: 18, dayLength: 12 };
}
