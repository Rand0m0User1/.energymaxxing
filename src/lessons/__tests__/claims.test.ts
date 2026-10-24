// Truth check: every outcome the lessons and the presenter demo claim must hold in the real engine.
// Each test applies the same setup the lesson step applies (applyStep runs the step's setup against the
// store), then does what the viewer is told to do with the same store actions, and reads the result.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApp } from '../../store';
import { fv } from '../../data/facts';
import { stepIndex } from '../../engine/timeIndex';
import { LESSONS, LESSON_BY_ID } from '../lessons';
import { applyStep, effectiveFor } from '../engine';
import { findBadTokens } from '../live';
import { DEMO_SCRIPT, runDemoStep } from '../demoScript';

const S = () => useApp.getState();
const T = () => S().result.totals;

/** Apply lesson steps 0..i in order, as the card does when the viewer presses Next. */
function runTo(id: string, i: number) {
  const l = LESSON_BY_ID[id];
  expect(l, `lesson ${id}`).toBeTruthy();
  for (let k = 0; k <= i; k++) applyStep(l, k);
}
/** Value of a per-step array at an hour of the year. */
function at(arr: Float32Array, hour: number) {
  const r = S().result;
  return arr[stepIndex(r, hour)];
}
const day = () => Math.floor(S().hourOfYear / 24);
/** Hours with unserved demand and unserved GWh between two hours of the year. */
function dark(h0: number, h1: number) {
  const r = S().result;
  let hours = 0, gwh = 0;
  for (let h = h0; h < h1; h++) {
    const u = r.unserved[stepIndex(r, h)];
    if (u > 1e-6) hours++;
    gwh += u * r.stepHours;
  }
  return { hours, gwh };
}
function avgDemand(h0: number, h1: number) {
  const r = S().result;
  let s = 0;
  for (let h = h0; h < h1; h++) s += r.demand[stepIndex(r, h)];
  return s / (h1 - h0);
}
const DEC = [334 * 24, 365 * 24] as const;

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => { errSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { errSpy.mockRestore(); });

describe('lesson 1: a gigawatt is not a gigawatt', () => {
  it('solar and reactor look the same at summer noon, differ at night, and solar makes about a quarter over a year', () => {
    runTo('gigawatt', 0);
    expect(S().input.place).toBe('stanford');
    const d = day();
    const g = fv('lessonCompareGW');
    // Step 1: at summer noon solar is near its best for the year; the reactor is close to full size.
    const rs = S().result;
    let maxSolar = 0;
    for (let i = 0; i < rs.steps; i++) maxSolar = Math.max(maxSolar, rs.available.solar[i]);
    expect(at(rs.available.solar, d * 24 + 12)).toBeGreaterThan(0.75 * maxSolar);
    expect(at(rs.available.solar, d * 24 + 12)).toBeGreaterThan(0.5 * g);
    expect(at(rs.available.fission, d * 24 + 12)).toBeGreaterThan(0.9 * g);
    // Step 2: at 10 PM solar makes nothing, the reactor keeps going.
    expect(at(S().result.available.solar, d * 24 + 22)).toBeLessThan(0.01);
    expect(at(S().result.available.fission, d * 24 + 22)).toBeGreaterThan(0.9 * g);
    // Step 3: "about a quarter" over the year (energy each plant makes).
    const t = T();
    const cfRatio = t.capacityFactor.solar / t.capacityFactor.fission;
    expect(cfRatio).toBeGreaterThan(0.18);
    expect(cfRatio).toBeLessThan(0.35);
    const r = S().result;
    let sSum = 0, fSum = 0;
    for (let i = 0; i < r.steps; i++) { sSum += r.available.solar[i]; fSum += r.available.fission[i]; }
    expect(sSum / fSum).toBeGreaterThan(0.18);
    expect(sSum / fSum).toBeLessThan(0.35);
  });
});

describe('lesson 2: the night', () => {
  it('2 PM sun fills the battery; lights go out at 10 PM with the battery off and stay on with it on', () => {
    runTo('night', 0);
    const d = day();
    const r0 = S().result;
    expect(at(r0.available.solar, d * 24 + 14)).toBeGreaterThan(at(r0.demand, d * 24 + 14));
    expect(at(r0.batteryCharge, d * 24 + 14)).toBeGreaterThan(0);
    expect(at(r0.unserved, d * 24 + 22)).toBe(0);

    applyStep(LESSON_BY_ID.night, 1);
    S().setBattery({ on: false });
    S().setTimeOfDay(22);
    expect(at(S().result.unserved, S().hourOfYear)).toBeGreaterThan(0.1);

    applyStep(LESSON_BY_ID.night, 2);
    S().setBattery({ on: true });
    expect(at(S().result.unserved, S().hourOfYear)).toBe(0);
    // Battery on: the whole night through sunrise is lit.
    expect(dark(d * 24 + 17, d * 24 + 24 + 8).hours).toBe(0);
  });

  it('a battery below the small size runs dry hours before sunrise and stays dark until morning', () => {
    runTo('night', 3);
    const d = day();
    S().setBattery({ on: true, gwh: fv('lessonSmallBatteryGWh') });
    // Dark from 10 PM to 4 AM, every hour.
    expect(dark(d * 24 + 22, d * 24 + 24 + 5).hours).toBe(7);
    // Step 5 restores the full battery: lit again.
    applyStep(LESSON_BY_ID.night, 4);
    expect(S().input.battery.gwh).toBe(fv('abuDhabiBatteryGWh'));
    expect(dark(d * 24 + 17, d * 24 + 24 + 8).hours).toBe(0);
  });
});

describe('lesson 3: rebuild Abu Dhabi', () => {
  it('starts short, then 5.2 GW of solar and 19 GWh keep the lights on nearly all the time', () => {
    runTo('abuDhabi', 0);
    expect(T().lightsOnPct).toBeLessThan(80);
    applyStep(LESSON_BY_ID.abuDhabi, 1);
    S().setPlant('solar', { on: true, gw: fv('abuDhabiSolarGW') });
    applyStep(LESSON_BY_ID.abuDhabi, 2);
    S().setBattery({ on: true, gwh: fv('abuDhabiBatteryGWh') });
    expect(fv('abuDhabiSolarGW')).toBeCloseTo(5.2, 5);
    expect(fv('abuDhabiBatteryGWh')).toBeCloseTo(19, 5);
    expect(T().lightsOnPct).toBeGreaterThanOrEqual(99);
    // "Enough stored energy to carry the city through a long winter night, with some to spare."
    const r = S().result;
    let minSoc = Infinity;
    for (let h = DEC[0]; h < DEC[1]; h++) minSoc = Math.min(minSoc, r.soc[stepIndex(r, h)]);
    expect(minSoc).toBeGreaterThan(1);
    // "Several times what the city uses on average."
    expect(fv('abuDhabiSolarGW') / (T().demandTWh * 1000 / 8760)).toBeGreaterThan(3);
  });
});

describe('lesson 4: move the city north', () => {
  it('the same city fails for days in a Helsinki December, with a battery that never fills', () => {
    runTo('north', 0);
    expect(T().lightsOnPct).toBeGreaterThanOrEqual(99);
    S().setPlace('helsinki');
    expect(T().lightsOnPct).toBeLessThan(60);
    expect(T().longestBlackoutH).toBeGreaterThanOrEqual(72);
    const r = S().result;
    let maxSoc = 0;
    for (let h = DEC[0]; h < DEC[1]; h++) maxSoc = Math.max(maxSoc, r.soc[stepIndex(r, h)]);
    expect(maxSoc).toBeLessThan(0.25 * fv('abuDhabiBatteryGWh'));
  });

  it('the noon sun is weak in December, and June keeps the lights on almost every hour', () => {
    runTo('north', 0);
    S().setPlace('helsinki');
    applyStep(LESSON_BY_ID.north, 1);
    const d = day();
    expect(d).toBeGreaterThanOrEqual(334);
    expect(at(S().result.available.solar, d * 24 + 12)).toBeLessThan(0.3 * S().input.plants.solar.gw);
    // June (days 151-180): almost every hour lit.
    const june = dark(151 * 24, 181 * 24);
    expect(june.hours / (30 * 24)).toBeLessThan(0.03);
  });
});

describe('lesson 5: dark doldrums and firm power', () => {
  it('a windless Berlin December week goes dark without firm power and the suggested reactor covers it', () => {
    runTo('doldrums', 0);
    expect(S().input.place).toBe('berlin');
    applyStep(LESSON_BY_ID.doldrums, 1);
    S().addWeatherEvent('windlessWeek');
    const ev = S().input.events.find((e) => e.kind === 'windlessWeek')!;
    expect(ev).toBeTruthy();
    const w0 = ev.startHour, w1 = ev.startHour + 168;
    // Fails badly: most of the week dark, the battery empty within two nights.
    const before = dark(w0, w1);
    expect(before.hours).toBeGreaterThan(100);
    expect(T().lightsOnPct).toBeLessThan(85);
    const r = S().result;
    let emptyBy = -1;
    for (let h = w0; h < w0 + 72; h++) if (r.soc[stepIndex(r, h)] < 0.05) { emptyBy = h - w0; break; }
    expect(emptyBy).toBeGreaterThanOrEqual(0);
    expect(emptyBy).toBeLessThanOrEqual(48);
    // "Days with almost no power coming in": most of the week's demand goes unserved.
    let demandGWh = 0;
    for (let h = w0; h < w1; h++) demandGWh += r.demand[stepIndex(r, h)];
    expect(before.gwh / demandGWh).toBeGreaterThan(0.5);

    applyStep(LESSON_BY_ID.doldrums, 2);
    applyStep(LESSON_BY_ID.doldrums, 3);
    LESSON_BY_ID.doldrums.steps[3].actions![0].run(S());
    const withDefault = T().lightsOnPct;
    expect(withDefault).toBeGreaterThan(85); // "keeps running when the sun and wind are gone"

    applyStep(LESSON_BY_ID.doldrums, 4);
    LESSON_BY_ID.doldrums.steps[4].actions![0].run(S());
    expect(S().input.plants.fission.gw).toBeCloseTo(fv('firmFissionGW'), 5);
    // "A bit more than the city uses on an average winter day."
    expect(fv('firmFissionGW')).toBeGreaterThan(avgDemand(DEC[0], DEC[1]));
    expect(fv('firmFissionGW')).toBeLessThan(T().peakDemandGW);
    // "The windless week is covered."
    expect(dark(w0, w1).hours).toBe(0);
    expect(T().lightsOnPct).toBeGreaterThanOrEqual(99);
  });

  it('holds wherever the viewer lets the clock run before adding the windless week (December to January)', () => {
    for (const d0 of [345, 360, 5, 20]) {
      runTo('doldrums', 0);
      S().setDayOfYear(d0);
      S().addWeatherEvent('windlessWeek');
      const w0 = S().input.events[0].startHour;
      expect(dark(w0, w0 + 168).hours, `no firm, week from day ${d0}`).toBeGreaterThan(80);
      S().setPlant('fission', { on: true, gw: fv('firmFissionGW') });
      expect(dark(w0, w0 + 168).hours, `firm, week from day ${d0}`).toBe(0);
    }
  });
});

describe('lesson 6: build like Casey Handmer', () => {
  it('overbuild wastes much of the sun and raises the cost per useful MWh; selling it lowers the cost', () => {
    runTo('handmer', 0);
    const costBefore = T().costPerMWh.mid;
    const lightsBefore = T().lightsOnPct;
    S().buildLikeHandmer();
    const t = T();
    // "About ten times the city's average use, with a large battery."
    const avg = t.demandTWh * 1000 / 8760;
    expect(S().input.plants.solar.gw / avg).toBeGreaterThan(8);
    expect(S().input.plants.solar.gw / avg).toBeLessThan(12);
    expect(t.lightsOnPct).toBeGreaterThan(lightsBefore); // keeps the lights on more often
    const wasted = t.curtailedTWh / (t.generatedTWh.solar + t.generatedTWh.wind + t.curtailedTWh);
    expect(wasted).toBeGreaterThan(0.3);
    expect(t.costPerMWh.mid).toBeGreaterThan(costBefore * 1.2);

    // Step 2: noon on a summer day, most of the solar is thrown away and the battery is full.
    applyStep(LESSON_BY_ID.handmer, 1);
    const h = S().hourOfYear;
    const r = S().result;
    expect(at(r.curtailed, h)).toBeGreaterThan(0.5 * at(r.available.solar, h));
    expect(at(r.soc, h)).toBeGreaterThan(0.9 * S().input.battery.gwh);

    // Step 4: factories cut the waste; selling lowers the cost.
    applyStep(LESSON_BY_ID.handmer, 2);
    applyStep(LESSON_BY_ID.handmer, 3);
    const acts = LESSON_BY_ID.handmer.steps[3].actions!;
    const base = T();
    acts.find((a) => a.label === 'Let industry use it')!.run(S());
    expect(T().curtailedTWh).toBeLessThan(base.curtailedTWh);
    acts.find((a) => a.label === 'Sell it')!.run(S());
    expect(T().costPerMWh.mid).toBeLessThan(base.costPerMWh.mid);

    // Step 5: Helsinki in December still struggles.
    applyStep(LESSON_BY_ID.handmer, 4);
    S().setPlace('helsinki');
    expect(T().lightsOnPct).toBeLessThan(80);
    expect(T().longestBlackoutH).toBeGreaterThan(24 * 7);
  });
});

describe('lesson 7: beyond Earth', () => {
  it('the moon base has a ~350-hour night and goes dark; the pole and mast help; a reactor carries Mars', () => {
    runTo('beyond', 0);
    expect(S().input.place).toBe('lunarEquator');
    expect(S().tool).toBe('beyond');
    const r = S().result;
    let best = 0, cur = 0;
    for (let i = 0; i < r.steps; i++) {
      if (r.sun[i] <= 1e-4) { cur++; best = Math.max(best, cur); } else cur = 0;
    }
    const nightH = best * r.stepHours;
    expect(Math.abs(nightH - fv('lunarNightH'))).toBeLessThan(25);
    expect(T().lightsOnPct).toBeLessThan(60);
    expect(T().longestBlackoutH).toBeGreaterThanOrEqual(72); // "days in the dark"
    const moonLights = T().lightsOnPct;

    for (let k = 1; k <= 2; k++) applyStep(LESSON_BY_ID.beyond, k);
    LESSON_BY_ID.beyond.steps[2].actions![0].run(S());
    expect(S().input.place).toBe('lunarSouthPole');
    const poleLights = T().lightsOnPct;
    expect(poleLights).toBeGreaterThan(moonLights + 20);

    applyStep(LESSON_BY_ID.beyond, 3);
    LESSON_BY_ID.beyond.steps[3].actions![0].run(S());
    expect(T().lightsOnPct).toBeGreaterThan(poleLights);

    applyStep(LESSON_BY_ID.beyond, 4);
    for (const a of LESSON_BY_ID.beyond.steps[4].actions!) a.run(S());
    expect(S().input.place).toBe('marsEquator');
    expect(T().lightsOnPct).toBeLessThan(50);

    applyStep(LESSON_BY_ID.beyond, 5);
    LESSON_BY_ID.beyond.steps[5].actions![0].run(S());
    expect(T().lightsOnPct).toBeGreaterThanOrEqual(99); // "a reactor does not care about night or dust"
  });
});

describe('lesson 8: inside the reactor', () => {
  it('opens the reactor at the atoms level, then Reactor Row with the right path', () => {
    runTo('reactor', 0);
    expect(S().inside).toBe('reactor');
    expect(S().insideLevel).toBe(5);
    expect(S().tool).toBe(null);
    const l = LESSON_BY_ID.reactor;
    expect(l.steps[0].text).toMatch(/Fire a neutron/);
    expect(l.steps[0].text).toMatch(/N key/);
    expect(l.steps[1].text).toMatch(/Control rods/);
    expect(l.steps[2].text).toMatch(/Remove water/);
    for (let k = 1; k <= 3; k++) applyStep(l, k);
    expect(S().inside).toBe(null);
    expect(S().tool).toBe('reactorRow');
    expect(S().tools.reactorPath).toBe('us');
    applyStep(l, 4);
    expect(S().tools.reactorPath).toBe('korea');
  });
});

describe('skipping steps keeps later claims true', () => {
  it('lesson 3, 4 and 6 later steps set up what they talk about', () => {
    runTo('abuDhabi', 3); // sizing steps skipped
    expect(T().lightsOnPct).toBeGreaterThanOrEqual(99);
    runTo('north', 1); // move to Helsinki skipped
    expect(S().input.place).toBe('helsinki');
    runTo('handmer', 1); // build step skipped
    expect(S().input.plants.solar.gw).toBeGreaterThanOrEqual(fv('handmerSolarMultiple') * fv('cityAvgGW') * 0.8);
    const r = S().result, h = S().hourOfYear;
    expect(at(r.curtailed, h)).toBeGreaterThan(0.5 * at(r.available.solar, h));
    runTo('doldrums', 4); // windless week skipped
    expect(S().input.events.some((e) => e.kind === 'windlessWeek')).toBe(true);
  });
});

describe('every lesson step', () => {
  it('runs its setup and actions without errors and opens the tool or inside view it names', () => {
    for (const l of LESSONS) {
      S().startLesson(l.id);
      for (let i = 0; i < l.steps.length; i++) {
        applyStep(l, i);
        const eff = effectiveFor(l, i);
        expect(S().tool, `${l.id} step ${i + 1} tool`).toBe(eff.tool);
        expect(S().inside, `${l.id} step ${i + 1} inside`).toBe(eff.inside?.id ?? null);
        expect(S().visibleControls).toEqual(eff.controls);
        for (const a of l.steps[i].actions ?? []) expect(() => a.run(S()), `${l.id} step ${i + 1} ${a.label}`).not.toThrow();
        expect(() => l.steps[i].predict?.run?.(S())).not.toThrow();
        if (l.steps[i].check) expect(() => l.steps[i].check!(S())).not.toThrow();
      }
      S().exitLesson();
    }
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('uses only tokens that resolve, and plain copy (no exclamation marks)', () => {
    for (const l of LESSONS) {
      const texts = [l.summary, l.aha ?? '', l.learn, ...l.steps.flatMap((s) => [s.text, s.after ?? '', s.predict?.reveal ?? '', s.predict?.question ?? '', ...(s.predict?.choices ?? [])])];
      expect(texts.flatMap(findBadTokens), l.id).toEqual([]);
      for (const t of texts) expect(t.includes('!'), `${l.id}: ${t}`).toBe(false);
    }
  });
});

describe('presenter demo script', () => {
  it('steps through every demo step without throwing', () => {
    for (let i = 0; i < DEMO_SCRIPT.length; i++) {
      expect(() => DEMO_SCRIPT[i].run(), DEMO_SCRIPT[i].title).not.toThrow();
      runDemoStep(i);
      expect(S().presenterStep).toBe(i);
    }
    // Backwards too (Page Up).
    for (let i = DEMO_SCRIPT.length - 1; i >= 0; i--) runDemoStep(i);
    expect(errSpy).not.toHaveBeenCalled();
    for (const d of DEMO_SCRIPT) expect(d.say.includes('!'), d.title).toBe(false);
  });

  it('Abu Dhabi stays lit, Helsinki fails, and Helsinki plus the reactor has its lights back on', () => {
    const find = (re: RegExp) => DEMO_SCRIPT.findIndex((d) => re.test(d.title));
    const abu = find(/Abu Dhabi/), hel = find(/Helsinki/), rx = find(/Add a reactor/), close = find(/Close/);
    expect([abu, hel, rx, close].every((i) => i >= 0)).toBe(true);

    runDemoStep(abu);
    expect(S().input.place).toBe('abuDhabi');
    expect(T().lightsOnPct).toBeGreaterThanOrEqual(99);

    runDemoStep(hel);
    expect(S().input.place).toBe('helsinki');
    expect(S().input.plants.fission.on).toBe(false);
    expect(T().lightsOnPct).toBeLessThan(60);
    expect(dark(DEC[0], DEC[1]).hours).toBeGreaterThan(200);

    runDemoStep(rx);
    expect(S().input.place).toBe('helsinki');
    expect(S().input.plants.fission.gw).toBeCloseTo(fv('firmFissionGW'), 5);
    expect(fv('firmFissionGW')).toBeGreaterThan(avgDemand(DEC[0], DEC[1])); // "a bit more than an average winter day"
    expect(T().lightsOnPct).toBeGreaterThanOrEqual(99);
    expect(dark(DEC[0], DEC[1]).hours).toBe(0); // "lights back on all winter"
    // The week chart shows the hardest week: fully lit.
    const h0 = day() * 24;
    expect(dark(h0 - 3 * 24, h0 + 4 * 24).hours).toBe(0);

    // Same equipment works whichever step came before it.
    runDemoStep(0);
    runDemoStep(rx);
    expect(T().lightsOnPct).toBeGreaterThanOrEqual(99);

    runDemoStep(close);
    expect(S().input.place).toBe('helsinki');
    expect(T().lightsOnPct).toBeGreaterThanOrEqual(98);
  });

  it('the Moon step opens the lunar base and its tool', () => {
    const moon = DEMO_SCRIPT.findIndex((d) => /Moon/.test(d.title));
    runDemoStep(moon);
    expect(S().input.place).toBe('lunarEquator');
    expect(S().tool).toBe('beyond');
  });
});
