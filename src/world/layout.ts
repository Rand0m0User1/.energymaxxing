// Island layout. Axes: +x = east, -z = north, +y = up. Sun azimuth (clockwise from north) maps to
// direction (sin az, ·, -cos az).
import type { DistrictId, StationId } from '../types';
import type { Env, PowerId } from '../store';

export const ISLAND_RADIUS = 150;
export const CITY_RADIUS = 30;

/** Stations shown in the world. */
export type WorldStation = 'city' | 'solar' | 'battery' | 'reactor' | 'gas' | 'wind';
export const WORLD_STATIONS: WorldStation[] = ['city', 'solar', 'battery', 'reactor', 'gas', 'wind'];
const MOON_STATIONS: WorldStation[] = ['city', 'solar', 'battery', 'reactor'];

export function stationsFor(env: Env): WorldStation[] {
  return env === 'moon' ? MOON_STATIONS : WORLD_STATIONS;
}

export function isWorldStation(id: StationId | null): id is WorldStation {
  return id != null && (WORLD_STATIONS as StationId[]).includes(id);
}

export interface Station {
  id: WorldStation;
  label: string;
  /** Centre on the ground (x, z). */
  pos: [number, number];
  /** Rough footprint radius, used for clicks. */
  radius: number;
  /** Height of the label and card (world units). */
  labelY: number;
  /** Where the power line leaves this station (x, z), null if it has no line. */
  lineFrom: [number, number] | null;
  /** Power source switched by this station, null for the city. */
  power: PowerId | null;
}

export const STATIONS: Record<WorldStation, Station> = {
  city:    { id: 'city',    label: 'City',      pos: [0, 0],    radius: 30, labelY: 22, lineFrom: null,      power: null },
  solar:   { id: 'solar',   label: 'Solar',     pos: [82, 18],  radius: 24, labelY: 10, lineFrom: [62, 14],  power: 'solar' },
  battery: { id: 'battery', label: 'Batteries', pos: [70, -38], radius: 15, labelY: 10, lineFrom: [56, -30], power: 'battery' },
  reactor: { id: 'reactor', label: 'Nuclear (fission)', pos: [-68, 48], radius: 18, labelY: 30, lineFrom: [-52, 38], power: 'nuclear' },
  wind:    { id: 'wind',    label: 'Wind',      pos: [-45, -92], radius: 24, labelY: 36, lineFrom: [-36, -72], power: 'wind' },
  gas:     { id: 'gas',     label: 'Gas',       pos: [-8, 88],  radius: 13, labelY: 22, lineFrom: [-6, 74],  power: 'gas' },
};

/** City districts as wedges around the central substation. Angles in radians, measured from +x toward +z. */
export const DISTRICT_WEDGES: Record<Exclude<DistrictId, 'hydrogen'>, { from: number; to: number; centroid: [number, number] }> = {
  homes:      { from: 0.0,  to: 2.2,  centroid: [12, 16] },
  commercial: { from: 2.2,  to: 3.6,  centroid: [-18, 8] },
  transport:  { from: 3.6,  to: 4.4,  centroid: [-12, -16] },
  factory:    { from: 4.4,  to: 5.3,  centroid: [2, -20] },
  datacenter: { from: 5.3,  to: 6.283, centroid: [18, -10] },
};

/** Point where a power line enters the city ring, on the way to the central substation. */
export function cityEntry(from: [number, number]): [number, number] {
  const a = Math.atan2(from[1], from[0]);
  return [Math.cos(a) * (CITY_RADIUS + 2), Math.sin(a) * (CITY_RADIUS + 2)];
}
