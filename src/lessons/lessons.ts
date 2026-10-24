// The ten lessons of the Guided Tour (SPEC §11). Plain data plus small functions that drive the store.
// Text may contain {f:factKey[:pct|u|usd|nm]} and {live:kind} tokens (see types.ts).
import { fv } from '../data/facts';
import { PLACES } from '../data/places';
import { timeOfDay, dayOfYear } from '../engine/timeIndex';
import type { AppState } from '../store';
import { scene, S } from './scene';
import type { Lesson, Question } from './types';

export const QUESTIONS: Record<Question, { short: string; full: string }> = {
  1: { short: 'What will the energy mix be?', full: 'What will the future energy mix be: solar, fission, fusion or something else? Does it change in orbit, on the Moon or on Mars?' },
  2: { short: 'Can reactors be built at scale?', full: 'Will fission or fusion reach nth-of-a-kind building at scale, who pays for it, and will utilities adopt it?' },
  3: { short: 'How fast do batteries get cheaper?', full: 'What is the learning rate for batteries, and what holds back grid-scale batteries?' },
  4: { short: 'What does cheap power make possible?', full: 'What does the future cost of energy mean for manufacturing, data centers and chemical plants?' },
};

// Small helpers for checks.
const tod = (a: AppState) => timeOfDay(a.hourOfYear);
const isNight = (a: AppState) => tod(a) >= 21 || tod(a) < 5;
const isNoon = (a: AppState) => tod(a) >= 11.5 && tod(a) <= 13.5;
const near = (v: number, target: number, tol: number) => Math.abs(v - target) <= tol;
const plantOn = (a: AppState, id: 'fission' | 'geothermal' | 'hydro' | 'solar' | 'wind') =>
  a.input.plants[id].on && a.input.plants[id].gw > 0;
const hasEvent = (a: AppState, kind: string) => a.input.events.some((e) => e.kind === kind);
/** Earth-only lessons: bring the city home if an earlier lesson left it off Earth. */
const backToEarth = (a: AppState) => {
  if (PLACES[a.input.place].body !== 'earth') scene({ preset: 'today', place: 'abuDhabi', tod: 12 });
};

/* ---------------------------------------------------------------- 1 */
const gigawatt: Lesson = {
  id: 'gigawatt',
  number: 1,
  title: 'A gigawatt is not a gigawatt',
  question: 1,
  minutes: 2,
  learn: 'Why a solar farm makes far less energy in a year than a reactor of the same size.',
  aha: 'A gigawatt of solar is not a gigawatt of nuclear.',
  summary:
    'A gigawatt tells you how fast a plant can make power, not how much energy it makes in a year. US solar farms make {f:solarCFUS:pct} of their maximum over a year. Reactors make {f:nuclearCFUS:pct}.',
  steps: [
    {
      text: 'Here are two power plants of the same size: {f:lessonCompareGW:u} of solar and {f:lessonCompareGW:u} of reactor. It is 6 AM on a summer day. Drag the clock to noon.',
      controls: ['time', 'dashboard'],
      camera: 'solar',
      setup: () =>
        scene({
          preset: 'cleanStart',
          place: 'stanford',
          plants: {
            solar: { on: true, gw: fv('lessonCompareGW') },
            fission: { on: true, gw: fv('lessonCompareGW') },
            gas: { on: false },
            wind: { on: false },
          },
          battery: { on: false },
          day: 172,
          tod: 6,
          chart: 'day',
          playing: false,
        }),
      check: isNoon,
      watch: ['solarNow', 'fissionNow'],
      after: 'At noon the solar farm makes close to its full size. So does the reactor. On a sunny summer noon they look the same.',
    },
    {
      text: 'Now drag the clock to 10 PM.',
      camera: 'reactor',
      check: isNight,
      watch: ['solarNow', 'fissionNow'],
      after: 'At night the solar farm makes nothing. The reactor keeps going, day and night.',
    },
    {
      text: 'Before we look at a whole year, make a guess.',
      predict: {
        question: 'Over a full year, how much energy does the solar farm make compared with the reactor?',
        choices: ['About the same', 'About half as much', 'About a quarter as much'],
        correct: 2,
        reveal: 'About a quarter. Solar makes nothing at night, less in winter and less on cloudy days.',
        run: (a) => a.setChartRange('year'),
      },
      auto: true,
      watch: ['solarCF', 'fissionCF'],
      after:
        'Over a year, US solar farms make {f:solarCFUS:pct} of what they could at full power. Reactors make {f:nuclearCFUS:pct}. In this model city, solar made {live:solarCF} and the reactor {live:fissionCF}.',
      afterTerm: 'capacityFactor',
    },
    {
      text: 'Even so, solar is growing much faster. In 2025 the world added {f:solarAdded2025GW:u} of solar. All the reactors in the world add up to about {f:reactorsWorldGW:u}.',
      camera: 'city',
      auto: true,
      after: 'Solar is cheap enough that building several times as much can still pay. The hard part is not the gigawatts. It is the night.',
    },
  ],
};

/* ---------------------------------------------------------------- 2 */
const night: Lesson = {
  id: 'night',
  number: 2,
  title: 'The night',
  question: 1,
  minutes: 2,
  learn: 'What a battery does after sunset, and why it has two sizes: how fast and how much.',
  aha: 'Solar needs a battery that can carry the city through the whole night.',
  summary:
    'Solar alone goes dark at sunset. A battery moves the afternoon\'s extra sun into the night. It needs enough power in GW (how fast) to meet the city and enough energy in GWh (how much) to last until sunrise.',
  steps: [
    {
      text: 'This city runs on sun and batteries. It is 2 PM. The sun makes more power than the city needs, and the extra fills the battery.',
      controls: ['dashboard'],
      camera: 'city',
      setup: () => scene({ preset: 'abuDhabi', tod: 14, chart: 'day', speed: 'hour', playing: false }),
      auto: true,
      watch: ['solarNow', 'demandNow', 'batteryNow'],
    },
    {
      text: 'Turn off the battery. Then drag the clock to 10 PM.',
      controls: ['battery', 'time', 'dashboard'],
      camera: 'battery',
      check: (a) => !a.input.battery.on && isNight(a),
      watch: ['solarNow', 'unservedNow'],
      after: 'The lights go out. After sunset solar makes nothing, and nothing was stored to fill the gap.',
    },
    {
      text: 'Turn the battery back on.',
      camera: 'city',
      check: (a) => a.input.battery.on,
      watch: ['batteryNow', 'unservedNow'],
      after: 'The lights come back. The battery filled up in the afternoon and now gives that energy back, hour by hour, until sunrise.',
    },
    {
      text: 'A battery has two sizes. Power, in GW (how fast), is how quickly it can give energy. Energy, in GWh (how much), is how much it holds. Shrink the energy slider below {f:lessonSmallBatteryGWh:u}.',
      term: 'powerEnergy',
      check: (a) => a.input.battery.on && a.input.battery.gwh <= fv('lessonSmallBatteryGWh') + 0.01,
      watch: ['batteryNow', 'unservedNow'],
      after: 'Now the battery runs dry before sunrise, and the city goes dark in the small hours. Drag the clock toward 4 AM to see it. To last the night, a battery must hold the whole night\'s energy.',
    },
    {
      text: 'The battery is back to full size. Press play and watch a day go by.',
      controls: ['play', 'time', 'dashboard'],
      setup: (a) => {
        a.setBattery({ on: true, gwh: fv('abuDhabiBatteryGWh') });
        a.setSpeed('hour');
      },
      check: (a) => a.playing,
      watch: ['clock', 'solarNow', 'batteryNow'],
      after: 'Each day the battery fills in the afternoon and empties overnight. This is the daily rhythm of a solar city.',
    },
  ],
};

/* ---------------------------------------------------------------- 3 */
const abuDhabi: Lesson = {
  id: 'abuDhabi',
  number: 3,
  title: 'Rebuild Abu Dhabi',
  question: 1,
  minutes: 2,
  learn: 'How much solar and battery it takes to power a city around the clock in a sunny place.',
  aha: 'In a sunny place with short nights, sun and batteries alone can keep the lights on.',
  summary:
    '{f:abuDhabiSolarGW:u} of solar and {f:abuDhabiBatteryGWh:u} of batteries keep a city using {f:cityAvgGW:u} lit nearly all year in Abu Dhabi. A real project is being built at this size.',
  steps: [
    {
      text: 'In Abu Dhabi, a real project is being built to deliver {f:abuDhabiSteadyGW:u} of power around the clock, from sun and batteries alone. Let\'s rebuild it here.',
      controls: ['dashboard'],
      camera: 'city',
      setup: () =>
        scene({
          preset: 'abuDhabi',
          plants: { solar: { on: true, gw: fv('lessonStartSolarGW') } },
          battery: { on: true, gwh: fv('lessonStartBatteryGWh') },
          tod: 12,
          chart: 'day',
          speed: 'hour',
          playing: false,
        }),
      auto: true,
      watch: ['lightsOn'],
    },
    {
      text: 'Set solar to {f:abuDhabiSolarGW:u}.',
      controls: ['solar', 'dashboard'],
      camera: 'solar',
      check: (a) => a.input.plants.solar.on && near(a.input.plants.solar.gw, fv('abuDhabiSolarGW'), 0.2),
      watch: ['solarNow', 'demandNow'],
      after: 'That is several times what the city uses on average. At noon most of it is not needed by the city. It fills the batteries for the night.',
    },
    {
      text: 'Set the battery energy to {f:abuDhabiBatteryGWh:u} (how much).',
      controls: ['battery', 'dashboard'],
      camera: 'battery',
      check: (a) => a.input.battery.on && near(a.input.battery.gwh, fv('abuDhabiBatteryGWh'), 1),
      watch: ['batteryNow'],
      after: 'That is enough stored energy to carry the city through a long winter night, with some to spare.',
    },
    {
      text: 'Make a guess. Then we will run the whole year.',
      controls: ['play', 'time', 'dashboard'],
      camera: 'city',
      predict: {
        question: 'Over a whole year, how often will the lights stay on?',
        choices: ['Less than half the time', 'Most of the time, with some dark nights', 'Nearly all the time'],
        correct: 2,
        reveal: 'Nearly all the time. Abu Dhabi\'s nights are short all year and its skies are clear.',
        run: (a) => {
          a.setChartRange('year');
          a.setSpeed('week');
          a.setPlaying(true);
        },
      },
      auto: true,
      watch: ['lightsOn', 'longestBlackout'],
      after: 'Lights on: {live:lightsOn} of hours. Longest blackout: {live:longestBlackout}. A sunny place with short nights can run on sun and batteries today.',
    },
    {
      text: 'Now look at the cost. In this model each useful MWh costs about {live:costMid}. New gas plants cost {f:lcoeGasLow:usd} to {f:lcoeGasHigh:usd} per MWh.',
      controls: ['dashboard'],
      auto: true,
      watch: ['costMid', 'lightsOn'],
      term: 'lcoe',
    },
  ],
};

/* ---------------------------------------------------------------- 4 */
const north: Lesson = {
  id: 'north',
  number: 4,
  title: 'Move the city north',
  question: 1,
  minutes: 2,
  learn: 'Why the same solar city that works in Abu Dhabi fails in a Helsinki winter.',
  aha: 'It is not where the sun is strongest that matters, it is how long the darkness lasts.',
  summary:
    'The same equipment that runs Abu Dhabi fails in a Helsinki winter. What decides the energy mix is the longest dark stretch, not how strong the sun is at noon.',
  steps: [
    {
      text: 'This is the same city as before: sun and batteries, lights on nearly all year in Abu Dhabi. Make a guess, then choose Helsinki in the place picker.',
      controls: ['place', 'dashboard'],
      camera: 'city',
      setup: () => scene({ preset: 'abuDhabi', tod: 12, chart: 'week', speed: 'hour', playing: false }),
      predict: {
        question: 'What happens if we move this exact city to Helsinki, Finland, in December?',
        choices: ['The lights stay on. Same equipment, same result.', 'A few short blackouts at night.', 'The lights fail for days at a time.'],
        correct: 2,
        reveal: 'The lights fail for days. In late December Helsinki gets only a few hours of low, weak sun.',
        run: (a) => a.setPlacePickerOpen(true),
      },
      actions: [{ label: 'Move to Helsinki', run: (a) => a.setPlace('helsinki') }],
      check: (a) => a.input.place === 'helsinki',
      watch: ['place', 'lightsOn', 'longestBlackout'],
      after: 'Lights on: {live:lightsOn}. Longest blackout: {live:longestBlackout}. The battery never fills, because the short days make almost no extra sun.',
    },
    {
      text: 'Drag the clock to noon and watch the sun.',
      controls: ['time', 'dashboard'],
      camera: 'solar',
      setup: (a) => {
        a.setPlacePickerOpen(false);
        a.setTimeOfDay(8);
        a.setChartRange('day');
      },
      check: isNoon,
      watch: ['solarNow', 'demandNow'],
      after: 'Even at noon the sun stays low. The solar farm makes only a small part of its size.',
    },
    {
      text: 'Now move the date to June.',
      controls: ['season', 'time', 'dashboard'],
      check: (a) => {
        const d = dayOfYear(a.hourOfYear);
        return d >= 151 && d <= 212;
      },
      watch: ['date', 'solarNow', 'batteryNow'],
      after: 'In June, Helsinki barely has a night. The same solar farm and battery would cover the city easily. Summer is easy. Winter is the problem.',
    },
    {
      text: 'It is not where the sun is strongest that matters, it is how long the darkness lasts.',
      camera: 'city',
      controls: ['dashboard'],
      aha: 'text',
      auto: true,
      after: `Abu Dhabi: ${PLACES.abuDhabi.darkness}\n\nHelsinki: ${PLACES.helsinki.darkness}`,
    },
    {
      text: 'Try other cities: Berlin, London, Madrid, Phoenix. Watch the longest blackout change.',
      controls: ['place', 'dashboard'],
      auto: true,
      watch: ['place', 'lightsOn', 'longestBlackout'],
    },
  ],
};

/* ---------------------------------------------------------------- 5 */
const doldrums: Lesson = {
  id: 'doldrums',
  number: 5,
  title: 'Dark doldrums and firm power',
  question: 1,
  minutes: 3,
  learn: 'Why cold, dark, windless weeks call for a small layer of always-on power.',
  aha: 'Always-on power is insurance. How much you need depends on how long the dark, calm stretches last.',
  summary:
    'Dark, windless winter weeks drain any battery. A small layer of always-on power, such as a reactor, geothermal or hydro, covers them with far less total building than solar and batteries alone.',
  steps: [
    {
      text: 'This is Berlin in December. The city runs on solar, wind and batteries. Press play and watch the week.',
      controls: ['play', 'dashboard'],
      camera: 'wind',
      setup: () =>
        scene({
          preset: 'cleanStart',
          place: 'berlin',
          plants: { wind: { on: true, gw: fv('lessonBerlinWindGW') } },
          chart: 'week',
          speed: 'day',
          playing: false,
        }),
      check: (a) => a.playing,
      watch: ['lightsOn', 'batteryNow'],
      after: 'Short gray days. When the wind blows, the batteries fill. When it stops, they drain.',
    },
    {
      text: 'Some winter weeks are both dark and calm. Add a windless week.',
      controls: ['weather', 'dashboard'],
      actions: [{ label: 'Add a windless week', run: (a) => a.addWeatherEvent('windlessWeek') }],
      check: (a) => hasEvent(a, 'windlessWeek'),
      watch: ['lightsOn', 'longestBlackout'],
      after: 'The battery empties in a night or two. Then the city has days with almost no power coming in.',
      afterTerm: 'dunkelflaute',
    },
    {
      text: 'Make a guess.',
      controls: ['dashboard'],
      predict: {
        question: 'How could you keep the lights on through a week like this?',
        choices: ['Build much more solar, wind and batteries', 'Add a plant that runs all the time', 'Either, but at very different sizes'],
        correct: 2,
        reveal:
          'Either can work. A large study found that without always-on power, a clean grid needs {f:sepulvedaNoFirmLow}–{f:sepulvedaNoFirmHigh} times its peak demand in installed capacity. With some always-on power, {f:sepulvedaFirmLow}–{f:sepulvedaFirmHigh} times.',
      },
      auto: true,
      afterTerm: 'overbuild',
    },
    {
      text: 'Turn on an always-on plant: a reactor, geothermal or hydro.',
      term: 'firm',
      controls: ['fission', 'geothermal', 'hydro', 'dashboard'],
      camera: 'reactor',
      actions: [{ label: 'Turn on the reactor', run: (a) => a.setPlant('fission', { on: true }) }],
      check: (a) => plantOn(a, 'fission') || plantOn(a, 'geothermal') || plantOn(a, 'hydro'),
      watch: ['lightsOn', 'overbuild'],
      after: 'Always-on power keeps running when the sun and wind are gone. Lights on: {live:lightsOn}.',
    },
    {
      text: 'Set the reactor to {f:firmFissionGW:u}.',
      controls: ['fission', 'dashboard'],
      actions: [{ label: 'Set it for me', run: (a) => a.setPlant('fission', { on: true, gw: fv('firmFissionGW') }) }],
      check: (a) => a.input.plants.fission.on && a.input.plants.fission.gw >= fv('firmFissionGW') - 0.05,
      watch: ['lightsOn', 'overbuild', 'costMid'],
      after:
        'Installed power is now {live:overbuild} the peak demand. Studies of grids with always-on power land at {f:sepulvedaFirmLow}–{f:sepulvedaFirmHigh} times. Without it, {f:sepulvedaNoFirmLow}–{f:sepulvedaNoFirmHigh} times.',
    },
    {
      text: 'Always-on power is insurance. How much you need depends on how long the dark, calm stretches last.',
      camera: 'city',
      aha: true,
      auto: true,
    },
  ],
};

/* ---------------------------------------------------------------- 6 */
const handmer: Lesson = {
  id: 'handmer',
  number: 6,
  title: 'Build like Casey Handmer',
  question: 1,
  minutes: 2,
  learn: 'What happens when you build far more solar than you need, and who pays for the wasted sun.',
  aha: 'Overbuilt solar works when something can use the extra sun.',
  summary:
    'Building far more solar than you need keeps the lights on more often, but much of the sun is wasted. It pays off when something can use the extra: industry, heat storage or a buyer. It works best where nights are short.',
  steps: [
    {
      text: 'Casey Handmer argues that solar is so cheap we should build far more than we need. Press "Build like Casey Handmer".',
      controls: ['overbuild', 'dashboard'],
      camera: 'solar',
      setup: () => scene({ preset: 'cleanStart', place: 'stanford', day: 172, tod: 12, chart: 'day', speed: 'hour', playing: false }),
      actions: [{ label: 'Build like Casey Handmer', run: (a) => a.buildLikeHandmer() }],
      check: (a) => a.input.plants.solar.gw >= fv('handmerSolarMultiple') * fv('cityAvgGW') * 0.8,
      watch: ['lightsOn', 'solarNow'],
      after: 'Solar is now about {f:handmerSolarMultiple:nm} times the city\'s average use, with a large battery. Lights on: {live:lightsOn}.',
    },
    {
      text: 'Make a guess.',
      controls: ['time', 'dashboard'],
      setup: (a) => a.setTimeOfDay(12),
      predict: {
        question: 'It is noon on a summer day. Where does most of that solar power go?',
        choices: ['Into the city', 'Into the battery', 'It is thrown away'],
        correct: 2,
        reveal: 'Most of it is thrown away. The city is served and the battery is full, so the extra has nowhere to go.',
      },
      auto: true,
      watch: ['wastedPct', 'solarNow', 'demandNow'],
      after: 'Wasted sun over the year: {live:wastedPct} of all the solar energy.',
      afterTerm: 'curtailment',
    },
    {
      text: 'You pay for every panel, but only the energy you use counts. Wasted sun makes each useful MWh more expensive. Right now it is about {live:costMid}.',
      controls: ['dashboard'],
      term: 'lcoe',
      auto: true,
      watch: ['costMid', 'wastedPct'],
    },
    {
      text: 'Give the wasted sun a job. Let factories soak it up, store it as heat, or sell it for {f:surplusPriceTest:usd} per MWh.',
      controls: ['flexLoad', 'advancedCosts', 'dashboard'],
      camera: 'industry',
      actions: [
        { label: 'Let industry use it', run: (a) => a.setInput({ industryFlex: true }) },
        { label: 'Store it as heat', run: (a) => a.setInput({ heatStorage: true }) },
        { label: 'Sell it', run: (a) => a.setInput({ costs: { ...S().input.costs, surplusPrice: fv('surplusPriceTest') } }) },
      ],
      check: (a) => a.input.industryFlex || a.input.heatStorage || a.input.costs.surplusPrice > 0,
      watch: ['costMid', 'wastedPct'],
      after: 'Now the extra energy earns its keep. Cost per useful MWh: {live:costMid}. This is Handmer\'s point: wasted sun is not a loss if something can use it while it is there.',
    },
    {
      text: 'Overbuilding works best where nights are short. Try the same city in Helsinki in December.',
      controls: ['place', 'dashboard'],
      camera: 'city',
      actions: [{ label: 'Move to Helsinki', run: (a) => a.setPlace('helsinki') }],
      check: (a) => a.input.place === 'helsinki',
      watch: ['lightsOn', 'longestBlackout'],
      after: 'Even {f:handmerSolarMultiple:nm} times the solar struggles through weeks of weak winter light. Lights on: {live:lightsOn}.',
    },
  ],
};

/* ---------------------------------------------------------------- 7 */
const beyond: Lesson = {
  id: 'beyond',
  number: 7,
  title: 'Beyond Earth',
  question: 1,
  minutes: 2,
  learn: 'Why solar wins in orbit and at the Moon\'s poles, and a small reactor wins in long nights.',
  aha: 'Where the night is long, a small reactor wins.',
  summary:
    'In orbit and on lit peaks at the Moon\'s south pole, nights are short and solar wins. On the Moon\'s equator, or in a Mars dust storm, the dark lasts too long for batteries. Where the night is long, a small reactor wins.',
  steps: [
    {
      text: 'This is a base on the Moon\'s equator. Its night lasts about {f:lunarNightH} hours, more than two Earth weeks. Press play.',
      controls: ['play', 'dashboard'],
      camera: 'city',
      tool: 'beyond',
      setup: () => scene({ preset: 'moonBase', chart: 'year', speed: 'day', playing: false }),
      check: (a) => a.playing,
      watch: ['lightsOn', 'batteryNow', 'longestBlackout'],
      after: 'The battery empties long before the sun comes back. The base spends days in the dark.',
    },
    {
      text: 'Make a guess.',
      controls: ['dashboard'],
      predict: {
        question: 'How much battery does it take to keep one kilowatt running through one lunar night?',
        choices: ['About as heavy as a backpack', 'About as heavy as a person', 'About as heavy as a car'],
        correct: 2,
        reveal:
          'About {f:lunarNightBatteryKg:u}, as heavy as a car, for every kilowatt. That assumes {f:liIonWhPerKg:u} of battery, and every kilogram has to be launched.',
      },
      auto: true,
      afterTerm: 'launchMass',
    },
    {
      text: 'Move the base to a peak near the lunar south pole.',
      controls: ['place', 'dashboard'],
      actions: [{ label: 'Go to the south pole', run: (a) => a.setPlace('lunarSouthPole') }],
      check: (a) => a.input.place === 'lunarSouthPole',
      watch: ['lightsOn', 'longestBlackout'],
      after: 'Some peaks near the pole are in sunlight more than {f:lunarPeakLit:pct} of the time. With short nights, solar works again.',
    },
    {
      text: 'Raise the panels on a tall mast to catch even more sun.',
      actions: [{ label: 'Add a mast', run: (a) => a.setInput({ lunarMast: true }) }],
      check: (a) => a.input.lunarMast,
      watch: ['lightsOn'],
      after: 'On a mast, panels can be lit more than {f:lunarMastLit:pct} of the time.',
    },
    {
      text: 'Now go to the Mars equator and add a dust storm.',
      controls: ['place', 'weather', 'dashboard'],
      actions: [
        { label: 'Go to Mars', run: (a) => a.setPlace('marsEquator') },
        {
          label: 'Add a dust storm',
          run: () => {
            if (S().input.place !== 'marsEquator') S().setPlace('marsEquator');
            S().addWeatherEvent('dustStorm');
          },
        },
      ],
      check: (a) => a.input.place === 'marsEquator' && hasEvent(a, 'dustStorm'),
      watch: ['lightsOn', 'longestBlackout'],
      after: 'A dust storm can cut solar to about {f:marsDustStormFactor:pct} for {f:marsDustStormSols:u}. That is another long night.',
    },
    {
      text: 'Turn on a small reactor.',
      controls: ['fission', 'dashboard'],
      actions: [{ label: 'Turn on a reactor', run: (a) => a.setPlant('fission', { on: true, gw: Math.max(S().input.plants.fission.gw, fv('firmFissionGW')) }) }],
      check: (a) => plantOn(a, 'fission'),
      watch: ['lightsOn', 'longestBlackout'],
      after: 'Lights on: {live:lightsOn}. A reactor does not care about night or dust. NASA\'s Kilopower design makes up to {f:kilopowerKW:u} for years.\n\nWhere the night is long, a small reactor wins.',
      aha: true,
    },
  ],
};

/* ---------------------------------------------------------------- 8 */
const reactor: Lesson = {
  id: 'reactor',
  number: 8,
  title: 'Inside the reactor',
  question: 2,
  minutes: 3,
  learn: 'How a chain reaction is steered, and why the price of reactors depends on building many.',
  aha: 'Reactors are expensive because they are built one at a time. Build the same one many times and the price falls. Who pays for the first ones decides who wins.',
  summary:
    'A chain reaction is easy to steer and slows down when the water is gone. The hard part of fission is building: the price falls only when the same design is built again and again, and someone has to pay for the first ones.',
  steps: [
    {
      text: 'This is the heart of a reactor. A neutron hits a uranium atom. The atom splits, releases energy, and throws out about {f:neutronsPerFission} new neutrons. Fire a neutron (press N) and watch.',
      controls: [],
      camera: 'reactor',
      tool: null,
      inside: { id: 'reactor', level: 5 },
      setup: backToEarth,
      auto: true,
    },
    {
      text: 'Move the control rods until each split causes exactly one more split. The meter should read k = {f:kSteady:nm}.',
      term: 'k',
      auto: true,
      after: 'At k = {f:kSteady:nm} the chain reaction holds steady. Below that it dies out. Above it, it grows. Operators keep it right at the line.',
    },
    {
      text: 'Now remove the water.',
      term: 'moderator',
      auto: true,
      after: 'Without water, neutrons stay too fast to cause many splits, and the reaction slows down by itself. This is one reason these reactors are stable.',
    },
    {
      text: 'Now the business side. On the US path, press "Build the next reactor" {f:lessonReactors:nm} times.',
      inside: null,
      tool: 'reactorRow',
      setup: (a) => a.setTools({ reactorPath: 'us', reactorsBuilt: 0 }),
      check: (a) => a.tools.reactorsBuilt >= fv('lessonReactors'),
      watch: ['reactorsBuilt'],
      after: 'On the US path, each reactor cost more than the one before. In US plants, more than {f:softCostShare:pct} of the cost rise came from things outside the reactor itself, such as labor and supervision.',
    },
    {
      text: 'Switch to the South Korea path and build {f:lessonReactors:nm} again.',
      setup: (a) => a.setTools({ reactorPath: 'korea', reactorsBuilt: 0 }),
      check: (a) => a.tools.reactorPath === 'korea' && a.tools.reactorsBuilt >= fv('lessonReactors'),
      watch: ['reactorsBuilt'],
      after: 'In South Korea, building the same design again and again made each one cheaper. The first one starts near Vogtle\'s {f:vogtlePerKW:usd} per kW. At about {f:fissionTargetPerKW:usd} per kW, fission competes almost everywhere in our model.',
      afterTerm: 'foak',
    },
    {
      text: 'Look at who pays. The first reactors are paid for by people who accept big risks: founders, venture investors and government programs. Later ones can borrow cheaply from utilities and infrastructure funds.',
      term: 'capitalStack',
      auto: true,
      aha: true,
      after: 'Reactors are expensive because they are built one at a time. Build the same one many times and the price falls. Who pays for the first ones decides who wins.',
    },
  ],
};

/* ---------------------------------------------------------------- 9 */
const batteryFactory: Lesson = {
  id: 'batteryFactory',
  number: 9,
  title: 'The battery factory',
  question: 3,
  minutes: 2,
  learn: 'Why battery cells get cheaper fast, and why installed batteries do not.',
  aha: 'Battery cells keep getting cheaper fast. The whole installed system does not, and the hold-ups are connections, materials and permits.',
  summary:
    'Each doubling of production cuts the pack price by about {f:batteryLearningRate:pct}. The rest of an installed battery, from grid connection to permits, falls much more slowly.',
  steps: [
    {
      text: 'This factory makes battery packs. A stationary pack costs about {f:batteryPackPrice2025:usd} per kWh today. Pack prices fell {f:batteryPackFall2025:pct} in 2025 alone.',
      controls: [],
      camera: 'batteryFactory',
      tool: 'batteryFactory',
      inside: null,
      setup: (a) => {
        backToEarth(a);
        a.setTools({ batteryDoublings: 0 });
      },
      auto: true,
    },
    {
      text: 'Make a guess, then press "Double total production" {f:lessonDoublings:nm} times.',
      predict: {
        question: 'Each time the world\'s total production doubles, what happens to the pack price?',
        choices: ['It stays about the same', 'It falls by about a fifth', 'It falls by half'],
        correct: 1,
        reveal: 'It falls by about a fifth: around {f:batteryLearningRate:pct} per doubling in our model.',
      },
      check: (a) => a.tools.batteryDoublings >= fv('lessonDoublings'),
      watch: ['doublings'],
      after: 'The pack price fell fast. Now look at the installed system price. It fell much more slowly.',
      afterTerm: 'learningRate',
    },
    {
      text: 'Why the gap? The pack is only part of the cost. The rest is the grid connection, land, labor, permits and inverters, and those do not follow the factory\'s curve.',
      auto: true,
      after: 'A full installed system cost about {f:batterySystemPNNL2021:usd} per kWh in 2021 data, several times today\'s pack price.',
    },
    {
      text: 'Read the bottleneck cards. The hold-ups are long waits to connect to the grid, materials that come from a few countries, permits, and shortages of transformers.',
      auto: true,
      aha: true,
      after: 'Battery cells keep getting cheaper fast. The whole installed system does not, and the hold-ups are connections, materials and permits.',
    },
  ],
};

/* ---------------------------------------------------------------- 10 */
const cheapPower: Lesson = {
  id: 'cheapPower',
  number: 10,
  title: 'When power is nearly free',
  question: 4,
  minutes: 2,
  learn: 'Which industries gain the most as power gets cheaper, and why.',
  aha: 'Cheaper power does not help every industry the same way. Industries that can store their product and run when power is cheap win the most.',
  summary:
    'Cheap power matters most where power is a big share of the cost and the product can be stored, like aluminum and hydrogen. Data centers care more about getting connected fast.',
  steps: [
    {
      text: 'This is the Industry Quarter: an aluminum smelter, a data center, a hydrogen and ammonia plant, and a plant that makes fresh water and captures carbon. Power costs {f:industryDialHigh:usd} per MWh.',
      controls: [],
      camera: 'industry',
      tool: 'industry',
      inside: null,
      setup: (a) => {
        backToEarth(a);
        a.setTools({ industryPrice: fv('industryDialHigh') });
      },
      auto: true,
      watch: ['industryPrice'],
    },
    {
      text: 'Make a guess, then turn the price dial down to {f:industryTargetPrice:usd} per MWh.',
      predict: {
        question: 'If power became almost free, which would gain the most?',
        choices: ['The data center', 'The aluminum smelter and the hydrogen plant', 'All four the same'],
        correct: 1,
        reveal: 'Power is a big share of the cost of aluminum and hydrogen. The hydrogen plant can also store what it makes, so it can run only when power is cheap.',
      },
      check: (a) => a.tools.industryPrice <= fv('industryTargetPrice') + 0.01,
      watch: ['industryPrice'],
      after: 'The smelter and the hydrogen plant light up. Below about {f:h2CompetitivePrice:usd} per MWh, making hydrogen from water can compete with making it from gas.',
    },
    {
      text: 'Look at the data center. A data center that uses as much power as this whole city pays about {f:dcPowerCostPerYearB:usd} billion a year for power, but about {f:dcServerCostB:usd} billion for its servers.',
      auto: true,
      after: 'For data centers, getting connected fast matters more than cheap power.',
    },
    {
      text: 'Keep going, all the way down to {f:industryDialLow:usd} per MWh.',
      check: (a) => a.tools.industryPrice <= fv('industryDialLow') * 1.5,
      watch: ['industryPrice'],
      after: 'At very low prices, things that do not pay today start to make sense, like turning seawater into fresh water and pulling carbon out of the air. These plants can also wait for the cheap hours.',
    },
    {
      text: 'Cheaper power does not help every industry the same way. Industries that can store their product and run when power is cheap win the most.',
      aha: true,
      auto: true,
    },
  ],
};

export const LESSONS: Lesson[] = [gigawatt, night, abuDhabi, north, doldrums, handmer, beyond, reactor, batteryFactory, cheapPower];

export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]));

export function nextLesson(id: string): Lesson | null {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 && i < LESSONS.length - 1 ? LESSONS[i + 1] : null;
}
