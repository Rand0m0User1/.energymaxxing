// App state. The user controls only: Earth or Moon, season, time of day, and which power sources are on.
import { create } from 'zustand';
import type { SimInput, SimResult } from './engine/types';
import { simulate } from './engine/simulate';
import { defaultInput } from './data/presets';
import { LUNAR_DAY_H } from './engine/sun';
import type { GenId, PlaceId, StationId } from './types';

export type Env = 'earth' | 'moon';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type PowerId = 'solar' | 'wind' | 'battery' | 'nuclear' | 'gas';
export type TourId = 'earth' | 'moon';

export const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];
export const POWER_BY_ENV: Record<Env, PowerId[]> = {
  earth: ['solar', 'wind', 'battery', 'nuclear', 'gas'],
  moon: ['solar', 'battery', 'nuclear'],
};

/** Which island station shows each power source. */
export const POWER_STATION: Record<PowerId, StationId> = {
  solar: 'solar', wind: 'wind', battery: 'battery', nuclear: 'reactor', gas: 'gas',
};

/** Fixed plant sizes. The city uses about 1 GW on average. */
export const SIZE = { solar: 5.2, wind: 1.5, nuclear: 1.3, gas: 1.6, batteryGW: 2, batteryGWh: 19 };

const PLACE: Record<Env, PlaceId> = { earth: 'berlin', moon: 'lunarEquator' };
const SEASON_DAY: Record<Season, number> = { spring: 79, summer: 171, fall: 265, winter: 354 };
/** Moon: start of a lunar day (sunrise) late enough that the battery has settled. */
const MOON_SUNRISE = 2 * LUNAR_DAY_H;

/** Hour of the simulated year shown for a time of day (0–24). On the Moon, 0–24 spans one whole lunar day. */
export function hourFor(env: Env, season: Season, t: number): number {
  if (env === 'moon') return MOON_SUNRISE + ((t - 6) / 24) * LUNAR_DAY_H;
  return SEASON_DAY[season] * 24 + t;
}

const GEN: Record<Exclude<PowerId, 'battery'>, GenId> = { solar: 'solar', wind: 'wind', nuclear: 'fission', gas: 'gas' };

export function buildInput(env: Env, on: Record<PowerId, boolean>): SimInput {
  const base = defaultInput();
  const allowed = POWER_BY_ENV[env];
  const isOn = (p: PowerId) => on[p] && allowed.includes(p);
  const plants = { ...base.plants };
  for (const g of Object.keys(plants) as GenId[]) plants[g] = { on: false, gw: 0, schedule: null };
  for (const p of ['solar', 'wind', 'nuclear', 'gas'] as const) {
    plants[GEN[p]] = { on: isOn(p), gw: SIZE[p], schedule: null };
  }
  return {
    ...base,
    place: PLACE[env],
    plants,
    battery: { on: isOn('battery'), gw: SIZE.batteryGW, gwh: SIZE.batteryGWh, mode: 'auto', schedule: null },
    districts: { ...base.districts, hydrogen: { on: false, mw: 0 } },
    clearSky: true,
    realisticOutages: false,
    fissionFlexible: true,
    events: [],
  };
}

const DEFAULT_ON: Record<PowerId, boolean> = { solar: true, wind: false, battery: false, nuclear: false, gas: false };

export interface AppState {
  screen: 'title' | 'explore';
  setScreen: (s: 'title' | 'explore') => void;

  env: Env;
  season: Season;
  timeOfDay: number;
  on: Record<PowerId, boolean>;
  setEnv: (e: Env) => void;
  setSeason: (s: Season) => void;
  setTimeOfDay: (t: number) => void;
  setOn: (p: PowerId, v: boolean) => void;
  /** Set several sources at once (tours). Sources not listed are switched off. */
  setOnly: (list: PowerId[]) => void;

  playing: boolean;
  togglePlay: () => void;
  setPlaying: (v: boolean) => void;
  tick: (dtSeconds: number) => void;

  /** Derived: engine input/result and the hour of the simulated year being shown. */
  input: SimInput;
  result: SimResult;
  hourOfYear: number;

  selectedStation: StationId | null;
  selectStation: (id: StationId | null) => void;

  tour: { id: TourId; step: number } | null;
  startTour: (id: TourId) => void;
  setTourStep: (n: number) => void;
  endTour: () => void;

  reducedMotion: boolean;
  reset: () => void;
}

const prefersReducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const useApp = create<AppState>((set, get) => {
  const recompute = (patch: Partial<Pick<AppState, 'env' | 'on'>>) => {
    const env = patch.env ?? get().env;
    const on = patch.on ?? get().on;
    const input = buildInput(env, on);
    set({ ...patch, input, result: simulate(input), hourOfYear: hourFor(env, get().season, get().timeOfDay) });
  };
  const initialInput = buildInput('earth', DEFAULT_ON);

  return {
    screen: 'title',
    setScreen: (screen) => set({ screen }),

    env: 'earth',
    season: 'summer',
    timeOfDay: 12,
    on: { ...DEFAULT_ON },
    setEnv: (env) => {
      if (env === get().env) return;
      set({ selectedStation: null });
      recompute({ env });
    },
    setSeason: (season) => set({ season, hourOfYear: hourFor(get().env, season, get().timeOfDay) }),
    setTimeOfDay: (t) => {
      const timeOfDay = ((t % 24) + 24) % 24;
      set({ timeOfDay, hourOfYear: hourFor(get().env, get().season, timeOfDay) });
    },
    setOn: (p, v) => recompute({ on: { ...get().on, [p]: v } }),
    setOnly: (list) => recompute({ on: { solar: false, wind: false, battery: false, nuclear: false, gas: false, ...Object.fromEntries(list.map((p) => [p, true])) } }),

    playing: false,
    togglePlay: () => set({ playing: !get().playing }),
    setPlaying: (playing) => set({ playing }),
    tick: (dt) => {
      if (!get().playing) return;
      get().setTimeOfDay(get().timeOfDay + Math.min(dt, 0.1) * 1.5);
    },

    input: initialInput,
    result: simulate(initialInput),
    hourOfYear: hourFor('earth', 'summer', 12),

    selectedStation: null,
    selectStation: (selectedStation) => set({ selectedStation }),

    tour: null,
    startTour: (id) => set({ tour: { id, step: 0 }, screen: 'explore', selectedStation: null }),
    setTourStep: (step) => { const t = get().tour; if (t) set({ tour: { ...t, step } }); },
    endTour: () => set({ tour: null }),

    reducedMotion: prefersReducedMotion,
    reset: () => {
      set({ season: 'summer', timeOfDay: 12, playing: false, selectedStation: null, tour: null });
      recompute({ env: 'earth', on: { ...DEFAULT_ON } });
    },
  };
});
