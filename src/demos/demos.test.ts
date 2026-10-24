// The battery demo's "Effect on the city" rows match the model's known outcomes.
import { describe, expect, it } from 'vitest';
import { buildInput, hourFor, type Env, type MoonSite, type Season } from '../store';
import { NO_FUTURE } from '../batteries';
import { simulate } from '../engine/simulate';
import { summarize } from '../sim';

const ALL = { cost: true, life: true, longDuration: true, supply: true };
const lit = (env: Env, site: MoonSite, season: Season, future = NO_FUTURE) => {
  const input = buildInput(env, { solar: true, wind: false, battery: true, nuclear: false, gas: false }, { moonSite: site, batteryType: 'lfp', future });
  return Math.round(100 * summarize(simulate(input), env, season, hourFor(env, season, 12), input.battery.gwh).litShare);
};

describe('battery future demo', () => {
  it('improvements help the Moon but not an Earth winter', () => {
    const pole = [lit('moon', 'pole', 'summer'), lit('moon', 'pole', 'summer', ALL)];
    const eq = [lit('moon', 'equator', 'summer'), lit('moon', 'equator', 'summer', ALL)];
    const winter = [lit('earth', 'equator', 'winter'), lit('earth', 'equator', 'winter', ALL)];
    expect(pole[1]).toBeGreaterThan(pole[0]);
    expect(eq[1]).toBeGreaterThan(eq[0]);
    expect(winter[1]).toBeLessThanOrEqual(winter[0]);
  });
});
