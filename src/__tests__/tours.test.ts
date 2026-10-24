// Every tour step must work through the real store: setup, the user's action, then the check.
import { beforeEach, describe, expect, it } from 'vitest';
import { useApp } from '../store';
import { TOURS } from '../ui/tours';
import { summaryOf } from '../ui/power';

const st = () => useApp.getState();
const sum = () => summaryOf(st());
const checkPasses = (tour: 'earth' | 'moon', step: number) => {
  const s = TOURS[tour].steps[step];
  return s.check ? s.check(st(), sum()) : true;
};
const start = (tour: 'earth' | 'moon', step: number) => {
  st().startTour(tour);
  st().setTourStep(step);
  TOURS[tour].steps[step].setup?.(st());
};
const pass = (tour: 'earth' | 'moon', step: number) => TOURS[tour].steps[step].onPass?.(st());

beforeEach(() => st().reset());

describe('earth tour', () => {
  it('step 1: solar at summer noon is lit', () => {
    start('earth', 0);
    expect(st().env).toBe('earth');
    expect(sum().litNow).toBe(true);
  });
  it('step 2: dragging to night makes it dark', () => {
    start('earth', 1);
    expect(checkPasses('earth', 1)).toBe(false);
    st().setTimeOfDay(23);
    expect(checkPasses('earth', 1)).toBe(true);
  });
  it('step 3: batteries keep a summer night lit', () => {
    start('earth', 2);
    expect(sum().litNow).toBe(false);
    expect(checkPasses('earth', 2)).toBe(false);
    st().setOn('battery', true);
    expect(checkPasses('earth', 2)).toBe(true);
    pass('earth', 2);
    expect(st().timeOfDay).toBe(22);
    expect(sum().litNow).toBe(true);
    expect(sum().litShare).toBe(1);
  });
  it('step 4: in winter the batteries run out', () => {
    start('earth', 3);
    expect(checkPasses('earth', 3)).toBe(false);
    st().setSeason('winter');
    expect(checkPasses('earth', 3)).toBe(true);
    pass('earth', 3);
    expect(sum().litNow).toBe(false);
    expect(sum().slots.some((x) => !x.lit)).toBe(true);
  });
  it('step 5: nuclear keeps winter lit all day', () => {
    start('earth', 4);
    expect(sum().litNow).toBe(false);
    st().setOn('nuclear', true);
    expect(checkPasses('earth', 4)).toBe(true);
    expect(sum().litNow).toBe(true);
    expect(sum().litShare).toBe(1);
  });
  it('last step leads to the Moon tour', () => {
    start('earth', 5);
    TOURS.earth.steps[5].end![0].run(st());
    expect(st().tour).toEqual({ id: 'moon', step: 0 });
  });
});

describe('moon tour', () => {
  it('step 1: solar and batteries at Moon noon are lit', () => {
    start('moon', 0);
    expect(st().env).toBe('moon');
    expect(sum().litNow).toBe(true);
  });
  it('step 2: the night outlasts the batteries', () => {
    start('moon', 1);
    expect(checkPasses('moon', 1)).toBe(false);
    st().setTimeOfDay(22);
    expect(checkPasses('moon', 1)).toBe(true);
    expect(sum().litShare).toBeLessThan(0.65);
  });
  it('step 3: nuclear keeps the base lit', () => {
    start('moon', 2);
    expect(sum().litNow).toBe(false);
    st().setOn('nuclear', true);
    expect(checkPasses('moon', 2)).toBe(true);
    expect(sum().litNow).toBe(true);
    expect(sum().litShare).toBe(1);
  });
  it('explore ends the tour', () => {
    start('moon', 3);
    TOURS.moon.steps[3].end![0].run(st());
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

