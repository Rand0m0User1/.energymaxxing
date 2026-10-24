// The tours' claims must match the model.
import { describe, expect, it } from 'vitest';
import { simulate } from '../engine/simulate';
import { buildInput, hourFor, type BuildOptions, type Env, type PowerId, type Season } from '../store';
import { summarize } from '../sim';
import { batterySpec, NO_FUTURE } from '../batteries';

function day(env: Env, season: Season, list: PowerId[], t = 12, opts: BuildOptions = {}) {
  const on = { solar: false, wind: false, battery: false, nuclear: false, gas: false } as Record<PowerId, boolean>;
  for (const p of list) on[p] = true;
  const r = simulate(buildInput(env, on, opts));
  const gwh = batterySpec(opts.batteryType ?? 'lfp', opts.future ?? NO_FUTURE).gwh;
  return summarize(r, env, season, hourFor(env, season, t), gwh);
}

const ALL_FUTURE = { cost: true, life: true, longDuration: true, supply: true };

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
  it('lead-acid lights less of a spring day than LFP', () => {
    const lead = day('earth', 'spring', ['solar', 'battery'], 12, { batteryType: 'lead' }).litShare;
    const lfp = day('earth', 'spring', ['solar', 'battery'], 12, { batteryType: 'lfp' }).litShare;
    expect(lead).toBeLessThan(lfp);
  });
  it('moon pole stays lit longer than the moon equator', () => {
    const pole = day('moon', 'summer', ['solar', 'battery'], 12, { moonSite: 'pole' }).litShare;
    const eq = day('moon', 'summer', ['solar', 'battery'], 12, { moonSite: 'equator' }).litShare;
    expect(pole).toBeGreaterThan(eq);
  });
  it('all four battery improvements lift the moon pole above 90%', () => {
    expect(day('moon', 'summer', ['solar', 'battery'], 12, { moonSite: 'pole', future: ALL_FUTURE }).litShare).toBeGreaterThan(0.9);
  });
  it('better batteries do not fix an Earth winter', () => {
    expect(day('earth', 'winter', ['solar', 'battery'], 12, { future: ALL_FUTURE }).litShare).toBeLessThanOrEqual(0.4);
  });
  it('print', () => {
    for (const [e, s, l] of [['earth','summer',['solar','battery']],['earth','spring',['solar','battery']],['earth','fall',['solar','battery']],['earth','winter',['solar','battery']],['earth','winter',['solar','battery','nuclear']],['earth','winter',['nuclear']],['earth','summer',['solar','wind','battery']],['moon','summer',['solar','battery']],['moon','summer',['solar','battery','nuclear']]] as [Env, Season, PowerId[]][]) {
      console.log(e, s, l.join('+'), day(e, s, l).litShare.toFixed(2));
    }
  });
});
