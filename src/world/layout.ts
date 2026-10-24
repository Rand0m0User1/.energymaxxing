// Island layout. World units: 1 unit ≈ 1 m at walking scale; the island is "not to scale".
// Axes: +x = east, -z = north, +y = up. Sun azimuth (clockwise from north) maps to
// direction (sin az, ·, -cos az).
import type { DistrictId, InsideViewId, StationId } from '../types';

export const ISLAND_RADIUS = 150;
export const CITY_RADIUS = 30;
export const SUBSTATION: [number, number, number] = [0, 0, 0];
export const EYE_HEIGHT = 1.8;
export const WALK_SPEED = 8;
export const RUN_SPEED = 25;

export interface Station {
  id: StationId;
  label: string;
  /** Centre on the ground (x, z). */
  pos: [number, number];
  /** Rough footprint radius, used for clicks, collision and camera framing. */
  radius: number;
  inside: InsideViewId | null;
  /** Camera offset from pos for fly-to (x, y, z). */
  view: [number, number, number];
  /** Where the power line leaves this station (x, z), null if it has no line. */
  lineFrom: [number, number] | null;
}

export const STATIONS: Record<StationId, Station> = {
  city:           { id: 'city',           label: 'City',               pos: [0, 0],     radius: 30, inside: null,      view: [0, 55, 70],  lineFrom: null },
  solar:          { id: 'solar',          label: 'Solar farm',         pos: [82, 18],   radius: 24, inside: 'solar',   view: [10, 30, 45], lineFrom: [62, 14] },
  battery:        { id: 'battery',        label: 'Battery yard',       pos: [70, -38],  radius: 15, inside: 'battery', view: [8, 22, 34],  lineFrom: [56, -30] },
  reactor:        { id: 'reactor',        label: 'Reactor hall',       pos: [-68, 48],  radius: 18, inside: 'reactor', view: [-6, 28, 46], lineFrom: [-52, 38] },
  fusion:         { id: 'fusion',         label: 'Fusion lab',         pos: [-92, -20], radius: 14, inside: 'fusion',  view: [-4, 22, 34], lineFrom: [-78, -16] },
  wind:           { id: 'wind',           label: 'Wind ridge',         pos: [-45, -92], radius: 24, inside: 'wind',    view: [0, 34, 60],  lineFrom: [-36, -72] },
  gas:            { id: 'gas',            label: 'Gas plant',          pos: [-8, 88],   radius: 13, inside: 'gas',     view: [4, 22, 34],  lineFrom: [-6, 74] },
  hydro:          { id: 'hydro',          label: 'Hydro dam and geothermal', pos: [40, -95], radius: 22, inside: 'hydro', view: [0, 30, 52], lineFrom: [32, -74] },
  batteryFactory: { id: 'batteryFactory', label: 'Battery Factory',    pos: [-46, 108], radius: 15, inside: null,      view: [0, 24, 38],  lineFrom: null },
  industry:       { id: 'industry',       label: 'Industry Quarter',   pos: [62, 92],   radius: 20, inside: null,      view: [0, 30, 48],  lineFrom: null },
};

/** Which station each generator lives at (for particles and signs). */
export const SOURCE_STATION = {
  solar: 'solar', battery: 'battery', fission: 'reactor', fusion: 'fusion',
  wind: 'wind', gas: 'gas', hydro: 'hydro', geothermal: 'hydro',
} as const;

/** City districts as wedges around the central substation. Angles in radians, measured from +x toward +z. */
export const DISTRICT_WEDGES: Record<Exclude<DistrictId, 'hydrogen'>, { from: number; to: number; centroid: [number, number] }> = {
  homes:      { from: 0.0,  to: 2.2,  centroid: [12, 16] },
  commercial: { from: 2.2,  to: 3.6,  centroid: [-18, 8] },
  transport:  { from: 3.6,  to: 4.4,  centroid: [-12, -16] },
  factory:    { from: 4.4,  to: 5.3,  centroid: [2, -20] },
  datacenter: { from: 5.3,  to: 6.283, centroid: [18, -10] },
};

/** The hydrogen and ammonia plant sits in the Industry Quarter. */
export const HYDROGEN_POS: [number, number] = [74, 100];

/** Reactor Row: pads for the "Build the next reactor" tool, in a line west of the reactor hall. */
export const REACTOR_ROW = { start: [-112, 20] as [number, number], step: [0, 9] as [number, number], count: 10 };

/** Point where a power line enters the city ring, on the way to the central substation. */
export function cityEntry(from: [number, number]): [number, number] {
  const a = Math.atan2(from[1], from[0]);
  return [Math.cos(a) * (CITY_RADIUS + 2), Math.sin(a) * (CITY_RADIUS + 2)];
}
