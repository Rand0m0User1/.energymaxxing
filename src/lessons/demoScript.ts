// Presenter demo script (SPEC §23): ten steps, about three minutes. Each step sets up the scene.
import { fv } from '../data/facts';
import { fmtNumber } from '../ui/Fact';
import { PLACES } from '../data/places';
import { useApp } from '../store';
import { scene, S } from './scene';

export interface DemoStep {
  title: string;
  /** What the presenter says (shown small in the strip). */
  say: string;
  run: () => void;
}

const n = (k: Parameters<typeof fv>[0]) => fmtNumber(fv(k));

function closeAll() {
  const a = S();
  if (a.inside) a.closeInside();
  if (a.tool) a.openTool(null);
  if (a.placePickerOpen) a.setPlacePickerOpen(false);
}

export const DEMO_SCRIPT: DemoStep[] = [
  {
    title: 'Title at dusk',
    say: 'Solar is cheap. Night is long. How do we keep the lights on?',
    run: () => {
      closeAll();
      if (PLACES[S().input.place].body !== 'earth') scene({ preset: 'today', place: 'abuDhabi' });
      S().setScreen('title');
      S().setPlaying(false);
    },
  },
  {
    title: 'Abu Dhabi on sun and batteries',
    say: `${n('abuDhabiSolarGW')} GW of solar and ${n('abuDhabiBatteryGWh')} GWh of batteries, no gas. Watch a day: sun to battery to city.`,
    run: () => {
      S().setScreen('lab');
      scene({ preset: 'abuDhabi', tod: 6, chart: 'day', speed: 'hour', playing: true, camera: 'city' });
    },
  },
  {
    title: 'Move to Helsinki in December',
    say: 'Same city, same equipment. The lights fail. It is the length of the night.',
    run: () => {
      closeAll();
      scene({ place: 'helsinki', chart: 'week', speed: 'day', playing: true, camera: 'city' });
    },
  },
  {
    title: 'Add a small reactor',
    say: `Add ${n('firmFissionGW')} GW of always-on power. Lights come back, and the overbuild drops into the band with firm power.`,
    run: () => {
      closeAll();
      S().setPlant('fission', { on: true, gw: fv('firmFissionGW') });
      S().setChartRange('week');
      S().flyTo('reactor');
    },
  },
  {
    title: 'Inside the reactor',
    say: `The chain reaction. Move the control rods and hold k at ${n('kSteady')}.`,
    run: () => {
      if (S().tool) S().openTool(null);
      S().flyTo('reactor');
      S().openInside('reactor', 5);
    },
  },
  {
    title: 'Reactor Row',
    say: `Build ${n('demoReactors')} on the South Korea path, then the US path. First-of-a-kind against nth-of-a-kind.`,
    run: () => {
      if (S().inside) S().closeInside();
      S().setTools({ reactorPath: 'korea', reactorsBuilt: 0 });
      S().openTool('reactorRow');
      S().flyTo('reactor');
    },
  },
  {
    title: 'Battery Factory',
    say: `Double production ${n('demoDoublings')} times. Cell price falls fast; the installed system falls slowly.`,
    run: () => {
      if (S().inside) S().closeInside();
      S().setTools({ batteryDoublings: 0 });
      S().openTool('batteryFactory');
      S().flyTo('batteryFactory');
    },
  },
  {
    title: 'Industry Quarter',
    say: `Turn the dial to $${n('industryTargetPrice')} per MWh. Hydrogen and aluminum light up.`,
    run: () => {
      if (S().inside) S().closeInside();
      S().setTools({ industryPrice: fv('industryDialHigh') });
      S().openTool('industry');
      S().flyTo('industry');
    },
  },
  {
    title: 'The Moon',
    say: `A ${n('lunarNightH')}-hour night: ${n('lunarNightBatteryKg')} kg of batteries per kW. Off Earth, the reactor wins.`,
    run: () => {
      closeAll();
      S().setScreen('beyond');
      if (S().input.place !== 'lunarEquator') S().applyPreset('moonBase');
      S().openTool('beyond');
      S().setChartRange('year');
    },
  },
  {
    title: 'Close',
    say: 'Cheap solar and batteries everywhere, and firm power as insurance sized to the length of the night.',
    run: () => {
      closeAll();
      S().setScreen('lab');
      scene({ preset: 'firmMix', place: 'helsinki', chart: 'week', speed: 'day', playing: true, camera: 'city' });
    },
  },
];

/** Runs demo step i (clamped) and records it in the store. */
export function runDemoStep(i: number): void {
  const k = Math.max(0, Math.min(DEMO_SCRIPT.length - 1, i));
  useApp.getState().setPresenterStep(k);
  try {
    DEMO_SCRIPT[k].run();
  } catch (err) {
    console.error(`[presenter] step ${k + 1} failed`, err);
  }
}
