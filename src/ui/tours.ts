// The two guided tours. Each step sets up the city, asks for one action, and explains the result.
import type { AppState, Env, PowerId, Season, TourId } from '../store';
import type { DaySummary } from '../sim';

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

function place(env: Env, season: Season, time: number, on: PowerId[]) {
  return (s: AppState) => {
    s.setPlaying(false);
    s.setEnv(env);
    s.setSeason(season);
    s.setTimeOfDay(time);
    s.setOnly(on);
  };
}

/** Winter hour shown once the batteries have run out (before sunrise). */
export const WINTER_DARK_HOUR = 6;

export const TOURS: Record<TourId, Tour> = {
  earth: {
    id: 'earth',
    title: 'Day and night',
    steps: [
      {
        auto: true,
        setup: place('earth', 'summer', 12, ['solar']),
        text: 'This city runs on solar power. At noon, the lights are on.',
      },
      {
        setup: place('earth', 'summer', 12, ['solar']),
        text: 'Drag the time to night.',
        check: (_s, sum) => !sum.litNow,
        result: 'No sun, no power. The city goes dark.',
      },
      {
        setup: place('earth', 'summer', 23, ['solar']),
        text: 'Turn on Batteries.',
        check: (s) => s.on.battery,
        onPass: (s) => s.setTimeOfDay(22),
        result: 'Batteries save extra sun for the night. The lights stay on.',
      },
      {
        setup: place('earth', 'summer', 22, ['solar', 'battery']),
        text: 'Now switch to Winter.',
        check: (s) => s.season === 'winter',
        onPass: (s) => s.setTimeOfDay(WINTER_DARK_HOUR),
        result: 'Winter nights are long and the sun is weak. The batteries run out.',
      },
      {
        setup: place('earth', 'winter', WINTER_DARK_HOUR, ['solar', 'battery']),
        text: 'Turn on Nuclear.',
        check: (s) => s.on.nuclear,
        result: 'A reactor runs day and night, in any season.',
      },
      {
        auto: true,
        setup: place('earth', 'winter', WINTER_DARK_HOUR, ['solar', 'battery', 'nuclear']),
        text: 'Solar and batteries do most of the work. The longer the night, the more always-on power you need.',
        end: [
          { label: 'Next tour: the Moon', primary: true, run: (s) => s.startTour('moon') },
          { label: 'Explore', run: (s) => s.endTour() },
        ],
      },
    ],
  },
  moon: {
    id: 'moon',
    title: 'The Moon',
    steps: [
      {
        auto: true,
        setup: place('moon', 'summer', 12, ['solar', 'battery']),
        text: 'Same city, now on the Moon. A Moon day lasts about a month: two weeks of sun, then two weeks of dark.',
      },
      {
        setup: place('moon', 'summer', 12, ['solar', 'battery']),
        text: 'Drag the time into the night.',
        check: (_s, sum) => !sum.litNow,
        result: 'The batteries last about a day. Then the city is dark for almost two weeks.',
      },
      {
        setup: place('moon', 'summer', 22, ['solar', 'battery']),
        text: 'Turn on Nuclear.',
        check: (s) => s.on.nuclear,
        result: 'A reactor does not need the sun. The base stays lit all night.',
      },
      {
        auto: true,
        setup: place('moon', 'summer', 22, ['solar', 'battery', 'nuclear']),
        text: 'On the Moon the night is long, so nuclear power matters most.',
        end: [{ label: 'Explore', primary: true, run: (s) => s.endTour() }],
      },
    ],
  },
};
