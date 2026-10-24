// The tours' claims must match the model.
import { describe, expect, it } from 'vitest';
import { simulate } from '../engine/simulate';
import { buildInput, hourFor, SIZE, type Env, type PowerId, type Season } from '../store';
import { summarize } from '../sim';

function day(env: Env, season: Season, list: PowerId[], t = 12) {
  const on = { solar: false, wind: false, battery: false, nuclear: false, gas: false } as Record<PowerId, boolean>;
  for (const p of list) on[p] = true;
  const r = simulate(buildInput(env, on));
  return summarize(r, env, season, hourFor(env, season, t), SIZE.batteryGWh);
}

describe('tour claims', () => {
  it('solar alone: lit at noon, dark at midnight', () => {
    expect(day('earth', 'summer', ['solar'], 12).litNow).toBe(true);
    expect(day('earth', 'summer', ['solar'], 0).litNow).toBe(false);
  });
  it('solar + batteries: lit all day in summer', () => {
    expect(day('earth', 'summer', ['solar', 'battery']).litShare).toBe(1);
  });
  it('solar + batteries: dark for part of a winter day', () => {
    expect(day('earth', 'winter', ['solar', 'battery']).litShare).toBeLessThan(0.75);
  });
  it('adding nuclear keeps winter lit', () => {
    expect(day('earth', 'winter', ['solar', 'battery', 'nuclear']).litShare).toBe(1);
  });
  it('gas also keeps winter lit, but burns gas', () => {
    const s = day('earth', 'winter', ['solar', 'battery', 'gas']);
    expect(s.litShare).toBe(1);
    expect(s.usesGas).toBe(true);
  });
  it('moon: solar + batteries are dark for most of the night', () => {
    expect(day('moon', 'summer', ['solar', 'battery']).litShare).toBeLessThan(0.65);
  });
  it('moon: nuclear keeps the base lit', () => {
    expect(day('moon', 'summer', ['solar', 'battery', 'nuclear']).litShare).toBe(1);
  });
  it('print', () => {
    for (const [e, s, l] of [['earth','summer',['solar','battery']],['earth','spring',['solar','battery']],['earth','fall',['solar','battery']],['earth','winter',['solar','battery']],['earth','winter',['solar','battery','nuclear']],['earth','winter',['nuclear']],['earth','summer',['solar','wind','battery']],['moon','summer',['solar','battery']],['moon','summer',['solar','battery','nuclear']]] as [Env, Season, PowerId[]][]) {
      console.log(e, s, l.join('+'), day(e, s, l).litShare.toFixed(2));
    }
  });
});
