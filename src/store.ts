// App state. The user controls only: Earth or Moon, season, time of day, and which power sources are on.
import { create } from 'zustand';
import type { SimInput, SimResult } from './engine/types';
import { simulate } from './engine/simulate';
import { defaultInput } from './data/presets';
import { LUNAR_DAY_H } from './engine/sun';
import type { GenId, PlaceId, StationId } from './types';
import { batterySpec, NO_FUTURE, type BatteryType, type FutureBatteries } from './batteries';

export type Env = 'earth' | 'moon';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type PowerId = 'solar' | 'wind' | 'battery' | 'nuclear' | 'gas';
export type TourId = 'earth' | 'batteries' | 'nuclear' | 'industry' | 'moon';
export type MoonSite = 'equator' | 'pole';
export type PlaceChoice = 'earth' | 'moonEquator' | 'moonPole';
/** Educational overlays shown by tours, separate from the city. */
export type DemoId = 'batteryFuture' | 'nuclear' | 'industry';

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

const placeId = (env: Env, site: MoonSite): PlaceId => (env === 'earth' ? 'berlin' : site === 'pole' ? 'lunarSouthPole' : 'lunarEquator');
const SEASON_DAY: Record<Season, number> = { spring: 79, summer: 171, fall: 265, winter: 354 };
/** Moon: start of a lunar day (sunrise) after the battery has settled, in a typical season for the pole. */
const MOON_SUNRISE = 6 * LUNAR_DAY_H;

/** Hour of the simulated year shown for a time of day (0–24). On the Moon, 0–24 spans one whole lunar day. */
export function hourFor(env: Env, season: Season, t: number): number {
  if (env === 'moon') return MOON_SUNRISE + ((t - 6) / 24) * LUNAR_DAY_H;
  return SEASON_DAY[season] * 24 + t;
}

const GEN: Record<Exclude<PowerId, 'battery'>, GenId> = { solar: 'solar', wind: 'wind', nuclear: 'fission', gas: 'gas' };

export interface BuildOptions { moonSite?: MoonSite; batteryType?: BatteryType; future?: FutureBatteries }

export function buildInput(env: Env, on: Record<PowerId, boolean>, opts: BuildOptions = {}): SimInput {
  const bat = batterySpec(opts.batteryType ?? 'lfp', opts.future ?? NO_FUTURE);
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
    place: placeId(env, opts.moonSite ?? 'equator'),
    plants,
    battery: { on: isOn('battery'), gw: bat.gw, gwh: bat.gwh, mode: 'auto', schedule: null },
    batteryRoundTrip: bat.efficiency,
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
  moonSite: MoonSite;
  /** Earth, Moon equator or Moon pole in one call. */
  setPlace: (p: PlaceChoice) => void;
  batteryType: BatteryType;
  setBatteryType: (t: BatteryType) => void;
  future: FutureBatteries;
  setFuture: (patch: Partial<FutureBatteries>) => void;
  demo: DemoId | null;
  openDemo: (d: DemoId | null) => void;
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
  const recompute = (patch: Partial<Pick<AppState, 'env' | 'on' | 'moonSite' | 'batteryType' | 'future'>>) => {
    const env = patch.env ?? get().env;
    const on = patch.on ?? get().on;
    const input = buildInput(env, on, {
      moonSite: patch.moonSite ?? get().moonSite,
      batteryType: patch.batteryType ?? get().batteryType,
      future: patch.future ?? get().future,
    });
    set({ ...patch, input, result: simulate(input), hourOfYear: hourFor(env, get().season, get().timeOfDay) });
  };
  const initialInput = buildInput('earth', DEFAULT_ON);

  return {
    screen: 'title',
    setScreen: (screen) => set({ screen }),

    env: 'earth',
    moonSite: 'equator',
    setPlace: (p) => {
      set({ selectedStation: null });
      if (p === 'earth') recompute({ env: 'earth' });
      else recompute({ env: 'moon', moonSite: p === 'moonPole' ? 'pole' : 'equator' });
    },
    batteryType: 'lfp',
    setBatteryType: (batteryType) => recompute({ batteryType }),
    future: { ...NO_FUTURE },
    setFuture: (patch) => recompute({ future: { ...get().future, ...patch } }),
    demo: null,
    openDemo: (demo) => set({ demo }),
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
    endTour: () => set({ tour: null, demo: null }),

    reducedMotion: prefersReducedMotion,
    reset: () => {
      set({ season: 'summer', timeOfDay: 12, playing: false, selectedStation: null, tour: null, demo: null });
      recompute({ env: 'earth', moonSite: 'equator', on: { ...DEFAULT_ON }, batteryType: 'lfp', future: { ...NO_FUTURE } });
    },
  };
});
