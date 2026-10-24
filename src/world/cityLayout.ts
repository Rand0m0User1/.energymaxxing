// Deterministic city layout (buildings in the five district wedges) and power-line routes.
// Shared by City, PowerLines and EnergyParticles.
import * as THREE from 'three';
import { CITY_RADIUS, DISTRICT_WEDGES, STATIONS, WORLD_STATIONS, cityEntry, type WorldStation } from './layout';

export type CityDistrict = keyof typeof DISTRICT_WEDGES;
export const CITY_DISTRICTS: CityDistrict[] = ['homes', 'commercial', 'transport', 'factory', 'datacenter'];

export interface Building {
  d: CityDistrict;
  x: number;
  z: number;
  /** Size along the radial direction. */
  dp: number;
  /** Size along the tangent. */
  w: number;
  h: number;
  /** Rotation about y (local +x points away from the city centre). */
  rot: number;
}

// ---------- power-line geometry ----------
export const TRUNK_H = 9; // pylon height
export const ARM_Y = TRUNK_H - 0.25; // wire height at the arms
export const WIRE_Y = TRUNK_H - 0.7; // particle height along transmission lines
export const SUB_Y = 5.4; // where lines meet the substation gantry
export const DIST_POLE_H = 5.2;
export const DIST_Y = DIST_POLE_H - 0.5;

export interface Route { pts: THREE.Vector3[]; cum: number[]; len: number }

export function makeRoute(pts: THREE.Vector3[]): Route {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum, len: cum[cum.length - 1] };
}

export function sampleRoute(r: Route, s: number, out: THREE.Vector3): THREE.Vector3 {
  if (s <= 0) return out.copy(r.pts[0]);
  if (s >= r.len) return out.copy(r.pts[r.pts.length - 1]);
  for (let i = 1; i < r.pts.length; i++) {
    if (s <= r.cum[i]) {
      const segLen = r.cum[i] - r.cum[i - 1] || 1;
      return out.copy(r.pts[i - 1]).lerp(r.pts[i], (s - r.cum[i - 1]) / segLen);
    }
  }
  return out.copy(r.pts[r.pts.length - 1]);
}

const v3 = (p: [number, number], y: number) => new THREE.Vector3(p[0], y, p[1]);
const SUB_POINT = new THREE.Vector3(0, SUB_Y, 0);

/** Transmission route from each station's line start to the central substation. */
export const TRUNKS: Partial<Record<WorldStation, Route>> = {};
for (const id of WORLD_STATIONS) {
  const lf = STATIONS[id].lineFrom;
  if (!lf) continue;
  TRUNKS[id] = makeRoute([v3(lf, WIRE_Y), v3(cityEntry(lf), WIRE_Y), SUB_POINT.clone()]);
}

/** Distribution route from the substation to each district centre. */
export const BRANCHES = Object.fromEntries(
  CITY_DISTRICTS.map((d) => [d, makeRoute([SUB_POINT.clone(), v3(DISTRICT_WEDGES[d].centroid, DIST_Y)])]),
) as Record<CityDistrict, Route>;

/** Line from the solar farm to the battery yard (charging). */
export const CHARGE_FROM: [number, number] = STATIONS.solar.lineFrom ?? [62, 14];
export const CHARGE_TO: [number, number] = STATIONS.battery.lineFrom ?? [56, -30];
export const CHARGE_ROUTE = makeRoute([v3(CHARGE_FROM, WIRE_Y), v3(CHARGE_TO, WIRE_Y)]);

// ---------- buildings ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** City-ground segments that must stay clear of buildings (power lines). */
const CLEAR_SEGS: [number, number, number, number][] = [];
for (const id of WORLD_STATIONS) {
  const lf = STATIONS[id].lineFrom;
  if (!lf) continue;
  const e = cityEntry(lf);
  CLEAR_SEGS.push([e[0], e[1], 0, 0]);
}
for (const d of CITY_DISTRICTS) {
  const c = DISTRICT_WEDGES[d].centroid;
  CLEAR_SEGS.push([0, 0, c[0], c[1]]);
}

function distToSeg(px: number, pz: number, s: [number, number, number, number]) {
  const [ax, az, bx, bz] = s;
  const dx = bx - ax;
  const dz = bz - az;
  const L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

const STYLE: Record<CityDistrict, { w: [number, number]; d: [number, number]; h: [number, number] }> = {
  homes: { w: [3, 3.9], d: [3, 3.8], h: [3, 6.5] },
  commercial: { w: [3.6, 4.2], d: [3.5, 4.0], h: [7, 15] },
  transport: { w: [3.8, 4.2], d: [3.2, 3.8], h: [2.4, 4] },
  factory: { w: [4, 4.2], d: [3.6, 4.0], h: [4, 7] },
  datacenter: { w: [4, 4.2], d: [3.6, 4.0], h: [4, 5.5] },
};

const RINGS = [9.5, 14, 18.5, 23, CITY_RADIUS - 2.7];
const CELL = 5.0;

function generateBuildings(): Building[] {
  const rnd = mulberry32(20261024);
  const out: Building[] = [];
  for (const d of CITY_DISTRICTS) {
    const wedge = DISTRICT_WEDGES[d];
    const st = STYLE[d];
    for (const r of RINGS) {
      const usable = (wedge.to - wedge.from) * r - 2.2;
      const n = Math.floor(usable / CELL);
      if (n <= 0) continue;
      const slot = usable / n;
      for (let k = 0; k < n; k++) {
        const a = wedge.from + (1.1 + (k + 0.5) * slot) / r;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        let w = st.w[0] + rnd() * (st.w[1] - st.w[0]);
        w = Math.min(w, slot - 0.9);
        const dp = st.d[0] + rnd() * (st.d[1] - st.d[0]);
        let h = st.h[0] + rnd() * (st.h[1] - st.h[0]);
        if (d === 'commercial') h *= 1.3 - r / 50;
        const half = Math.max(w, dp) / 2;
        if (w < 2) continue;
        if (CLEAR_SEGS.some((s) => distToSeg(x, z, s) < half + 0.5)) continue;
        out.push({ d, x, z, w, dp, h, rot: -a });
      }
    }
  }
  return out;
}

export const BUILDINGS: Building[] = generateBuildings();
