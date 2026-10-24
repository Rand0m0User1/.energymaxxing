// Every tour step must work through the real store: setup, the user's action, then the check.
import { beforeEach, describe, expect, it } from 'vitest';
import { useApp, type TourId } from '../store';
import { TOURS, tourSummary } from '../ui/tours';

const st = () => useApp.getState();
const sum = () => tourSummary(st());
const checkPasses = (tour: TourId, step: number) => {
  const s = TOURS[tour].steps[step];
  return s.check ? s.check(st(), sum()) : true;
};
const start = (tour: TourId, step: number) => {
  st().startTour(tour);
  st().setTourStep(step);
  TOURS[tour].steps[step].setup?.(st());
};
const pass = (tour: TourId, step: number) => TOURS[tour].steps[step].onPass?.(st());

/** The action each step asks for, keyed by tour and step index. */
const ACTIONS: Partial<Record<TourId, Record<number, () => void>>> = {
  earth: {
    1: () => st().setTimeOfDay(23),
    2: () => st().setOn('battery', true),
    4: () => st().setSeason('winter'),
    5: () => st().setOn('nuclear', true),
  },
  batteries: {
    0: () => st().setOn('battery', true),
    1: () => st().setBatteryType('lfp'),
    2: () => st().setBatteryType('nmc'),
    3: () => st().setBatteryType('sodium'),
    4: () => st().setFuture({ cost: true, life: true, longDuration: true, supply: true }),
  },
  nuclear: { 0: () => st().setOn('nuclear', true) },
  moon: {
    1: () => st().setTimeOfDay(22),
    2: () => st().setPlace('moonPole'),
    3: () => st().setOn('nuclear', true),
  },
};

beforeEach(() => st().reset());

describe('every step', () => {
  for (const tour of Object.values(TOURS)) {
    it(`${tour.id}: setup, action and check line up`, () => {
      expect(tour.id).toBeTruthy();
      expect(tour.title).toBeTruthy();
      tour.steps.forEach((step, i) => {
        start(tour.id, i);
        const act = ACTIONS[tour.id]?.[i];
        if (step.check && !step.auto) {
          expect(act, `${tour.id} step ${i} needs an action`).toBeTypeOf('function');
          expect(checkPasses(tour.id, i), `${tour.id} step ${i} passes before the action`).toBe(false);
          act!();
          expect(checkPasses(tour.id, i), `${tour.id} step ${i} fails after the action`).toBe(true);
          pass(tour.id, i);
        } else {
          expect(act).toBeUndefined();
        }
      });
      expect(tour.steps[tour.steps.length - 1].end?.length).toBeGreaterThan(0);
    });
  }
});

describe('earth tour', () => {
  it('summer noon solar is lit, then batteries cover the night', () => {
    start('earth', 0);
    expect(st().env).toBe('earth');
    expect(sum().litNow).toBe(true);
    start('earth', 2);
    expect(sum().litNow).toBe(false);
    st().setOn('battery', true);
    pass('earth', 2);
    expect(sum().litNow).toBe(true);
    expect(sum().litShare).toBe(1);
  });
  it('winter drains the batteries, nuclear or gas keeps it lit', () => {
    start('earth', 4);
    st().setSeason('winter');
    pass('earth', 4);
    expect(sum().litNow).toBe(false);
    expect(sum().litShare).toBeLessThan(0.6);
    start('earth', 5);
    st().setOn('nuclear', true);
    expect(sum().litShare).toBe(1);
    start('earth', 6);
    expect(sum().litShare).toBe(1);
    expect(sum().usesGas).toBe(true);
  });
  it('last step leads to the batteries tour', () => {
    start('earth', 6);
    TOURS.earth.steps[6].end![0].run(st());
    expect(st().tour).toEqual({ id: 'batteries', step: 0 });
  });
});

describe('batteries tour', () => {
  it('lead-acid goes dark before dawn, LFP keeps it lit', () => {
    start('batteries', 0);
    st().setOn('battery', true);
    expect(sum().litNow).toBe(false);
    start('batteries', 1);
    st().setBatteryType('lfp');
    expect(sum().litNow).toBe(true);
  });
  it('future batteries open the demo and help the Moon pole', () => {
    start('batteries', 4);
    expect(st().demo).toBe('batteryFuture');
    expect(st().moonSite).toBe('pole');
    const before = sum().litShare;
    st().setFuture({ cost: true, life: true, longDuration: true, supply: true });
    expect(sum().litShare).toBeGreaterThanOrEqual(before);
  });
  it('explore ends the tour, closes the demo and resets the future', () => {
    start('batteries', 5);
    TOURS.batteries.steps[5].end![1].run(st());
    expect(st().tour).toBeNull();
    expect(st().demo).toBeNull();
    expect(st().future.cost).toBe(false);
  });
});

describe('nuclear and industry tours', () => {
  it('nuclear selects the reactor, then opens its demo', () => {
    start('nuclear', 0);
    expect(st().selectedStation).toBe('reactor');
    expect(st().demo).toBeNull();
    start('nuclear', 1);
    expect(st().demo).toBe('nuclear');
  });
  it('industry keeps its demo open throughout', () => {
    TOURS.industry.steps.forEach((s, i) => {
      expect(s.auto).toBe(true);
      start('industry', i);
      expect(st().demo).toBe('industry');
    });
  });
  it('going back from a demo step closes the demo', () => {
    start('nuclear', 1);
    start('nuclear', 0);
    expect(st().demo).toBeNull();
  });
});

describe('moon tour', () => {
  it('equator night outlasts the batteries', () => {
    start('moon', 0);
    expect(st().env).toBe('moon');
    expect(sum().litNow).toBe(true);
    start('moon', 1);
    st().setTimeOfDay(22);
    expect(sum().litShare).toBeLessThan(0.65);
  });
  it('the pole does better, and nuclear lights it all the time', () => {
    start('moon', 1);
    st().setTimeOfDay(22);
    const equator = sum().litShare;
    start('moon', 2);
    st().setPlace('moonPole');
    expect(sum().litShare).toBeGreaterThan(equator);
    start('moon', 3);
    st().setOn('nuclear', true);
    expect(sum().litShare).toBe(1);
  });
  it('explore ends the tour', () => {
    const last = TOURS.moon.steps.length - 1;
    start('moon', last);
    TOURS.moon.steps[last].end![0].run(st());
    expect(st().tour).toBeNull();
  });
});

describe('tour text', () => {
  it('is short and plain', () => {
    for (const t of Object.values(TOURS)) {
      for (const s of t.steps) {
        for (const line of [s.text, s.result ?? '']) {
          expect(line).not.toMatch(/!|source|citation|assum/i);
          expect(line.split(/(?<=\.)\s/).filter(Boolean).length).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});
