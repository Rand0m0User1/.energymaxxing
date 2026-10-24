// The five guided tours. Each step sets up the whole scene, may ask for one action, and explains the result.
import type { AppState, DemoId, PlaceChoice, PowerId, Season, TourId } from '../store';
import type { StationId } from '../types';
import { NO_FUTURE, type BatteryType, type FutureBatteries } from '../batteries';
import { summarize, type DaySummary } from '../sim';

export interface TourStep {
  text: string;
  /** No action needed; Next is always enabled. */
  auto?: boolean;
  /** Puts the city in the state this step expects. Runs when the step starts. */
  setup?: (s: AppState) => void;
  check?: (s: AppState, sum: DaySummary) => boolean;
  /** Shown once the check passes. */
  result?: string;
  /** Runs once when the check first passes. */
  onPass?: (s: AppState) => void;
  /** Buttons on the last step. */
  end?: { label: string; primary?: boolean; run: (s: AppState) => void }[];
}

export interface Tour { id: TourId; title: string; steps: TourStep[] }

/** Live summary for tour checks, using the current battery size. */
export function tourSummary(s: Pick<AppState, 'result' | 'env' | 'season' | 'hourOfYear' | 'input'>): DaySummary {
  return summarize(s.result, s.env, s.season, s.hourOfYear, s.input.battery.gwh);
}

const ALL_FUTURE: FutureBatteries = { cost: true, life: true, longDuration: true, supply: true };

interface Scene {
  place: PlaceChoice;
  season?: Season;
  time: number;
  on: PowerId[];
  battery?: BatteryType;
  future?: FutureBatteries;
  demo?: DemoId | null;
  station?: StationId | null;
}

/** Sets the full scene, so Back and Next always land in the same state. */
function scene(c: Scene) {
  return (s: AppState) => {
    s.setPlaying(false);
    s.setPlace(c.place);
    s.setSeason(c.season ?? 'summer');
    s.setTimeOfDay(c.time);
    s.setBatteryType(c.battery ?? 'lfp');
    s.setFuture(c.future ?? NO_FUTURE);
    s.setOnly(c.on);
    s.openDemo(c.demo ?? null);
    s.selectStation(c.station ?? null);
  };
}

/** Winter hour shown once the batteries have run out (before sunrise). */
export const WINTER_DARK_HOUR = 6;
/** Spring hour just before dawn, when weak batteries are empty. */
export const SPRING_DAWN_HOUR = 5;
/** Moon time of day in the middle of the long night. */
export const MOON_NIGHT = 22;

const explore = (s: AppState) => { s.setFuture(NO_FUTURE); s.endTour(); };
const next = (label: string, id: TourId) => ({ label, primary: true, run: (s: AppState) => s.startTour(id) });

export const TOURS: Record<TourId, Tour> = {
  earth: {
    id: 'earth',
    title: 'Solar, night and winter',
    steps: [
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'summer', time: 12, on: ['solar'] }),
        text: 'Solar is now the cheapest power to build. At noon it runs the whole city.',
      },
      {
        setup: scene({ place: 'earth', season: 'summer', time: 12, on: ['solar'] }),
        text: 'Drag the time to night.',
        check: (_s, sum) => !sum.litNow,
        result: 'No sun, no power.',
      },
      {
        setup: scene({ place: 'earth', season: 'summer', time: 23, on: ['solar'] }),
        text: 'Turn on Batteries.',
        check: (s) => s.on.battery,
        onPass: (s) => s.setTimeOfDay(22),
        result: 'Batteries store spare sun for the night. The lights stay on.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'summer', time: 22, on: ['solar', 'battery'] }),
        text: 'Over a year, a solar farm makes about a quarter of what its size suggests. A reactor runs almost all the time.',
      },
      {
        setup: scene({ place: 'earth', season: 'summer', time: 22, on: ['solar', 'battery'] }),
        text: 'Now switch to Winter.',
        check: (s) => s.season === 'winter',
        onPass: (s) => s.setTimeOfDay(WINTER_DARK_HOUR),
        result: 'Short days and long nights drain the batteries. The city is lit only 38% of a winter day.',
      },
      {
        setup: scene({ place: 'earth', season: 'winter', time: WINTER_DARK_HOUR, on: ['solar', 'battery'] }),
        text: 'Turn on Nuclear (fission).',
        check: (s) => s.on.nuclear,
        result: 'Always-on power is insurance. The longer the night, the more you need.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'winter', time: WINTER_DARK_HOUR, on: ['solar', 'battery', 'gas'] }),
        text: 'Gas also keeps the lights on, but it burns fuel.',
        end: [next('Next tour: Batteries', 'batteries'), { label: 'Explore', run: explore }],
      },
    ],
  },
  batteries: {
    id: 'batteries',
    title: 'Batteries: four types and the future',
    steps: [
      {
        setup: scene({ place: 'earth', season: 'spring', time: SPRING_DAWN_HOUR, on: ['solar'], battery: 'lead' }),
        text: 'It is a spring night, just before dawn. Turn on Batteries.',
        check: (s) => s.on.battery,
        result: 'Lead-acid runs out before dawn. It is cheap to buy, but only half its charge is usable.',
      },
      {
        setup: scene({ place: 'earth', season: 'spring', time: SPRING_DAWN_HOUR, on: ['solar', 'battery'], battery: 'lead' }),
        text: 'Switch the battery type to LFP.',
        check: (s) => s.batteryType === 'lfp',
        result: 'LFP is cheap, safe and long-lasting. Most new grid batteries use it.',
      },
      {
        setup: scene({ place: 'earth', season: 'spring', time: SPRING_DAWN_HOUR, on: ['solar', 'battery'], battery: 'lfp' }),
        text: 'Now try NMC.',
        check: (s) => s.batteryType === 'nmc',
        result: 'NMC packs the most energy per kilo, so cars use it, but it costs more and relies on nickel and cobalt.',
      },
      {
        setup: scene({ place: 'earth', season: 'spring', time: SPRING_DAWN_HOUR, on: ['solar', 'battery'], battery: 'nmc' }),
        text: 'Now try Sodium-ion.',
        check: (s) => s.batteryType === 'sodium',
        result: 'Sodium-ion uses common salt instead of lithium. Newer and heavier.',
      },
      {
        setup: scene({ place: 'moonPole', time: 12, on: ['solar', 'battery'], demo: 'batteryFuture' }),
        text: 'Batteries are improving in four ways. Turn on all four.',
        check: (s) => s.future.cost && s.future.life && s.future.longDuration && s.future.supply,
        result: 'Cheaper, longer-lasting, long-duration batteries keep the Moon pole lit 95% of the time. A dark Earth winter still needs other power.',
      },
      {
        auto: true,
        setup: scene({ place: 'moonPole', time: 12, on: ['solar', 'battery'], future: ALL_FUTURE, demo: 'batteryFuture' }),
        text: 'Cells keep getting cheaper. The hold-ups are materials, grid connections and permits.',
        end: [next('Next tour: Nuclear', 'nuclear'), { label: 'Explore', run: explore }],
      },
    ],
  },
  nuclear: {
    id: 'nuclear',
    title: 'Fission and the nth reactor',
    steps: [
      {
        setup: scene({ place: 'earth', season: 'winter', time: WINTER_DARK_HOUR, on: ['solar', 'battery'], station: 'reactor' }),
        text: 'This is the reactor. Turn on Nuclear (fission).',
        check: (s) => s.on.nuclear,
        result: 'This reactor uses fission: it splits uranium atoms to make heat, day and night.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'winter', time: WINTER_DARK_HOUR, on: ['solar', 'battery', 'nuclear'], demo: 'nuclear' }),
        text: 'The first reactors cost the most. Build the same design again and again, and the price can fall.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'winter', time: WINTER_DARK_HOUR, on: ['solar', 'battery', 'nuclear'], demo: 'nuclear' }),
        text: 'Fusion has not put power on a grid yet. Fission is the one that can reach nth-of-a-kind first.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'winter', time: WINTER_DARK_HOUR, on: ['solar', 'battery', 'nuclear'], demo: 'nuclear' }),
        text: 'Who pays for the first reactors decides who gets the cheap ones.',
        end: [next('Next tour: Industry', 'industry'), { label: 'Explore', run: explore }],
      },
    ],
  },
  industry: {
    id: 'industry',
    title: 'Cheap power and industry',
    steps: [
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'summer', time: 12, on: ['solar', 'battery'], demo: 'industry' }),
        text: 'What happens to industry when power gets very cheap? Drag the price.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'summer', time: 12, on: ['solar', 'battery'], demo: 'industry' }),
        text: 'Ammonia is mostly energy. It can run when power is cheap and store its product, so it wins big.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'summer', time: 12, on: ['solar', 'battery'], demo: 'industry' }),
        text: 'An aluminium smelter must run nonstop. It needs cheap power at night too.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'summer', time: 12, on: ['solar', 'battery'], demo: 'industry' }),
        text: 'For a data center, power is a modest cost. Flexible jobs can follow cheap sunny hours.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'summer', time: 12, on: ['solar', 'battery'], demo: 'industry' }),
        text: 'For a chip fab, energy is a small cost and the fab can never stop. Reliability matters more than price.',
      },
      {
        auto: true,
        setup: scene({ place: 'earth', season: 'summer', time: 12, on: ['solar', 'battery'], demo: 'industry' }),
        text: 'Cheap power helps most where energy is a big cost and the work can wait for it.',
        end: [next('Next tour: the Moon', 'moon'), { label: 'Explore', run: explore }],
      },
    ],
  },
  moon: {
    id: 'moon',
    title: 'The Moon and orbit',
    steps: [
      {
        auto: true,
        setup: scene({ place: 'moonEquator', time: 12, on: ['solar', 'battery'] }),
        text: 'Same city, now on the Moon\'s equator. It is midday and the sun is up.',
      },
      {
        setup: scene({ place: 'moonEquator', time: 12, on: ['solar', 'battery'] }),
        text: 'Drag the time into the night.',
        check: (_s, sum) => !sum.litNow,
        result: 'A Moon night lasts about two weeks. Batteries last about a day.',
      },
      {
        setup: scene({ place: 'moonEquator', time: MOON_NIGHT, on: ['solar', 'battery'] }),
        text: 'Now move the city to the Moon pole.',
        check: (s) => s.env === 'moon' && s.moonSite === 'pole',
        result: 'Near the poles the sun circles the horizon. It is up most of the time, so solar does far better: lit about 80%.',
      },
      {
        setup: scene({ place: 'moonPole', time: MOON_NIGHT, on: ['solar', 'battery'] }),
        text: 'Turn on Nuclear (fission).',
        check: (s) => s.on.nuclear,
        result: 'Now the base is lit all the time. NASA is developing small fission reactors for the Moon for exactly this reason.',
      },
      {
        auto: true,
        setup: scene({ place: 'moonPole', time: MOON_NIGHT, on: ['solar', 'battery', 'nuclear'] }),
        text: 'In orbit the sun shines almost all the time. Low orbit has about 36 minutes of shadow every 90 minutes, so solar plus a small battery is enough.',
      },
      {
        auto: true,
        setup: scene({ place: 'moonPole', time: MOON_NIGHT, on: ['solar', 'battery', 'nuclear'] }),
        text: 'The longer the night, the more always-on power matters.',
        end: [
          { label: 'Explore', primary: true, run: explore },
          { label: 'Start over', run: (s) => s.startTour('earth') },
        ],
      },
    ],
  },
};
