// Engine validation checks plus safety, conservation, speed and determinism.
import { describe, expect, it } from 'vitest';
import { simulate } from '../simulate';
import { sunPosition, sunriseSunset, lunarPoleLit, geoEclipseMinutes } from '../sun';
import { defaultInput } from '../../data/presets';
import { fv } from '../../data/facts';
import { MONTH_START_DAY } from '../timeIndex';
import { GEN_IDS, type GenId, type PlaceId } from '../../types';
import type { SimInput, SimResult } from '../types';

function blank(place: PlaceId): SimInput {
  const i = defaultInput();
  i.place = place;
  for (const g of GEN_IDS) i.plants[g] = { ...i.plants[g], on: false };
  i.battery = { ...i.battery, on: false };
  return i;
}

const MUST_RUN: GenId[] = ['solar', 'wind', 'fission', 'geothermal', 'fusion'];

function checkConservation(r: SimResult, exactMustRun: boolean) {
  let worst = 0;
  for (let t = 0; t < r.steps; t++) {
    let gen = 0;
    for (const g of GEN_IDS) gen += r.supply[g][t];
    // 1. supply + battery out = served + battery in
    const a = gen + r.batteryDischarge[t] - (r.served[t] + r.batteryCharge[t]);
    // 2. demand = served + unserved + paused data center load
    const b = r.demand[t] - (r.served[t] + r.unserved[t] + r.flexShed[t]);
    // 3. what must-run plants made = what was used + curtailed + soaked up by industry
    let made = 0;
    let used = 0;
    for (const g of MUST_RUN) { made += r.available[g][t]; used += r.supply[g][t]; }
    const c = made - (used + r.curtailed[t] + r.industryAbsorbed[t]);
    const scale = Math.max(1, r.demand[t]);
    worst = Math.max(worst, Math.abs(a) / scale, Math.abs(b) / scale);
    if (exactMustRun) worst = Math.max(worst, Math.abs(c) / scale);
    else expect(c).toBeGreaterThan(-1e-6 * scale); // fission turn-down makes "made" smaller than "could make"
    for (const g of GEN_IDS) expect(r.supply[g][t]).toBeGreaterThanOrEqual(-1e-6);
    expect(r.unserved[t]).toBeGreaterThanOrEqual(0);
    expect(r.curtailed[t]).toBeGreaterThanOrEqual(0);
  }
  expect(worst).toBeLessThan(1e-6);
}

describe('SPEC 9.8 validation checks', () => {
  it('1. Abu Dhabi benchmark: 5.2 GW solar + 19 GWh / 1.5 GW battery keeps a flat 1 GW on >= 99% of hours', () => {
    const i = blank('abuDhabi');
    i.flatDemandGW = fv('abuDhabiSteadyGW');
    i.plants.solar = { on: true, gw: fv('abuDhabiSolarGW'), schedule: null };
    i.battery = { on: true, gw: 1.5, gwh: fv('abuDhabiBatteryGWh'), mode: 'auto', schedule: null };
    const r = simulate(i);
    expect(r.totals.lightsOnPct).toBeGreaterThanOrEqual(99);
  });

  it('2. capacity factors: fission with outages ~92%, solar near the US average, ratio ~0.25', () => {
    const i = blank('stanford');
    i.flatDemandGW = 1.2;
    i.realisticOutages = true;
    i.plants.fission = { on: true, gw: 1, schedule: null };
    i.plants.gas = { on: true, gw: 1.2, schedule: null };
    const r = simulate(i);
    expect(r.totals.generatedTWh.fission).toBeGreaterThan(7.9);
    expect(r.totals.generatedTWh.fission).toBeLessThan(8.2);
    expect(r.totals.capacityFactor.fission).toBeCloseTo(fv('nuclearCFUS'), 2);

    const cf = (p: PlaceId) => simulate(blank(p)).totals.capacityFactor.solar;
    const usLike = (cf('phoenix') + cf('stanford')) / 2;
    expect(Math.abs(usLike - fv('solarCFUS'))).toBeLessThan(0.02);
    const ratio = usLike / r.totals.capacityFactor.fission;
    expect(ratio).toBeGreaterThan(0.22);
    expect(ratio).toBeLessThan(0.28);
  });

  it('2b. solar calibration ranges per place (SPEC 9.2)', () => {
    const ranges: [PlaceId, number, number][] = [
      ['abuDhabi', 0.24, 0.28], ['phoenix', 0.24, 0.28], ['stanford', 0.19, 0.23], ['madrid', 0.19, 0.23],
      ['tokyo', 0.14, 0.17], ['berlin', 0.1, 0.12], ['london', 0.1, 0.12], ['helsinki', 0.09, 0.11],
    ];
    for (const [p, lo, hi] of ranges) {
      const c = simulate(blank(p)).totals.capacityFactor.solar;
      expect(c, p).toBeGreaterThanOrEqual(lo);
      expect(c, p).toBeLessThanOrEqual(hi);
    }
  });

  it('3. lunar night: 1 kW for 350 h at 200 Wh/kg needs 1,750 kg of battery', () => {
    const kWh = fv('lunarNightH') * 1;
    const kg = (kWh * 1000) / fv('liIonWhPerKg');
    expect(kg).toBeCloseTo(fv('lunarNightBatteryKg'), 6);
    // The engine's lunar night is about that long.
    const r = simulate(blank('lunarEquator'));
    let run = 0;
    let longest = 0;
    for (let t = 0; t < r.steps; t++) {
      if (r.sun[t] <= 0) { run++; longest = Math.max(longest, run); } else run = 0;
    }
    expect(longest).toBeGreaterThan(340);
    expect(longest).toBeLessThan(362);
  });

  it('4. Helsinki December, solar + 24 h of battery, no firm power: unserved > 20% of December', () => {
    const i = blank('helsinki');
    i.plants.solar = { on: true, gw: 10, schedule: null };
    i.battery = { on: true, gw: 2, gwh: 24, mode: 'auto', schedule: null };
    const r = simulate(i);
    let dem = 0;
    let uns = 0;
    for (let t = MONTH_START_DAY[11] * 24; t < 8760; t++) { dem += r.demand[t]; uns += r.unserved[t]; }
    expect(uns / dem).toBeGreaterThan(0.2);
  });

  it('5. energy is conserved every step (within 1e-6)', () => {
    // Default city with gas.
    checkConservation(simulate(defaultInput()), true);
    // Berlin with every flexible option on.
    const b = defaultInput();
    b.place = 'berlin';
    b.plants.gas.on = false;
    b.plants.fission = { on: true, gw: 0.8, schedule: null };
    b.plants.wind = { on: true, gw: 1, schedule: null };
    b.plants.hydro = { on: true, gw: 0.1, schedule: null };
    b.fissionFlexible = true;
    b.industryFlex = true;
    b.flexibleDataCenter = true;
    b.heatStorage = true;
    b.snow = true;
    b.events = [{ kind: 'windlessWeek', startHour: 8000 }, { kind: 'cloudyWeek', startHour: 8100 }];
    checkConservation(simulate(b), false);
    // Battery schedule mode and gas schedule.
    const s = defaultInput();
    s.battery = { ...s.battery, mode: 'schedule', schedule: Array.from({ length: 24 }, (_, h) => (h >= 9 && h < 16 ? 1 : h >= 18 || h < 6 ? -1 : 0)) };
    s.plants.gas = { on: true, gw: 1.6, schedule: Array.from({ length: 24 }, (_, h) => h >= 17) };
    checkConservation(simulate(s), true);
    // Orbit (one-minute steps) and the Moon.
    const o = blank('leo');
    o.plants.solar = { on: true, gw: 2.8, schedule: null };
    o.battery = { on: true, gw: 1.5, gwh: 2, mode: 'auto', schedule: null };
    checkConservation(simulate(o), true);
    const m = blank('lunarSouthPole');
    m.plants.solar = { on: true, gw: 3, schedule: null };
    m.battery = { on: true, gw: 1.5, gwh: 19, mode: 'auto', schedule: null };
    checkConservation(simulate(m), true);
  });
});

describe('engine behaviour', () => {
  it('runs a full year in under 50 ms', () => {
    const i = defaultInput();
    i.place = 'berlin';
    i.plants.wind.on = true;
    i.flexibleDataCenter = true;
    simulate(i); // warm up the JIT
    const n = 5;
    const t0 = performance.now();
    for (let k = 0; k < n; k++) simulate({ ...i, seed: 100 + k });
    const per = (performance.now() - t0) / n;
    expect(per).toBeLessThan(50);
  });

  it('is deterministic for a seed, and the seed changes the weather', () => {
    const i = defaultInput();
    i.place = 'london';
    i.plants.wind.on = true;
    const a = simulate(i);
    const b = simulate(i);
    expect(Array.from(a.served)).toEqual(Array.from(b.served));
    expect(Array.from(a.wind)).toEqual(Array.from(b.wind));
    expect(a.totals).toEqual(b.totals);
    const c = simulate({ ...i, seed: i.seed + 1 });
    expect(Array.from(c.wind)).not.toEqual(Array.from(a.wind));
  });

  it('does not crash or make NaN with nothing switched on', () => {
    const i = blank('abuDhabi');
    for (const d of Object.keys(i.districts) as (keyof typeof i.districts)[]) i.districts[d] = { ...i.districts[d], on: false };
    for (const p of ['abuDhabi', 'leo', 'geo', 'lunarSouthPole', 'marsMidLat'] as PlaceId[]) {
      const r = simulate({ ...i, place: p });
      const t = r.totals;
      for (const v of [t.lightsOnPct, t.costPerMWh.mid, t.overbuildRatio, t.homeBillPerMonth, t.share.battery, t.peakDemandGW]) {
        expect(Number.isFinite(v)).toBe(true);
      }
      expect(t.lightsOnPct).toBe(100);
    }
  });

  it('shares of served energy add up to 1', () => {
    const i = defaultInput();
    i.place = 'berlin';
    i.plants.wind = { on: true, gw: 1.5, schedule: null };
    i.plants.gas = { on: true, gw: 1.6, schedule: null };
    const t = simulate(i).totals;
    const sum = Object.values(t.share).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 4);
  });

  it('orbit sims are one day of one-minute steps', () => {
    const r = simulate(blank('leo'));
    expect(r.steps).toBe(1440);
    expect(r.stepHours).toBeCloseTo(1 / 60, 10);
  });

  it('fission turn-down never goes below half', () => {
    const i = blank('abuDhabi');
    i.flatDemandGW = 1;
    i.plants.solar = { on: true, gw: 5, schedule: null };
    i.plants.fission = { on: true, gw: 1, schedule: null };
    i.fissionFlexible = true;
    const r = simulate(i);
    let turned = 0;
    for (let t = 0; t < r.steps; t++) {
      expect(r.supply.fission[t] + 1e-6).toBeGreaterThanOrEqual(0.5 * r.available.fission[t] - r.curtailed[t] - 1e-6);
      if (r.supply.fission[t] < r.available.fission[t] - 1e-3) turned++;
    }
    expect(turned).toBeGreaterThan(100);
  });

  it('fusion only runs from its earliest year', () => {
    const i = blank('berlin');
    i.plants.fusion = { on: true, gw: 0.5, schedule: null };
    expect(simulate({ ...i, year: 2030 }).totals.generatedTWh.fusion).toBe(0);
    expect(simulate({ ...i, year: fv('fusionMinYear') }).totals.generatedTWh.fusion).toBeGreaterThan(0);
  });
});

describe('sun model', () => {
  it('Helsinki has about 18 h of darkness in late December; Abu Dhabi about 13 h', () => {
    const h = sunriseSunset('helsinki', 354)!;
    expect(24 - h.dayLength).toBeGreaterThan(17.5);
    expect(24 - h.dayLength).toBeLessThan(19);
    const a = sunriseSunset('abuDhabi', 354)!;
    expect(24 - a.dayLength).toBeGreaterThan(12.8);
    expect(24 - a.dayLength).toBeLessThan(13.8);
    expect(sunriseSunset('leo', 0)).toBeNull();
  });

  it('sun is in the south at noon and east in the morning (northern places)', () => {
    const noon = sunPosition('berlin', 172 * 24 + 12);
    expect(noon.azimuthDeg).toBeGreaterThan(170);
    expect(noon.azimuthDeg).toBeLessThan(190);
    expect(noon.elevationDeg).toBeGreaterThan(55);
    const morning = sunPosition('berlin', 172 * 24 + 8);
    expect(morning.azimuthDeg).toBeGreaterThan(60);
    expect(morning.azimuthDeg).toBeLessThan(130);
  });

  it('low orbit is lit 54 of every 90 minutes; geostationary eclipse is up to 72 minutes at equinox', () => {
    let lit = 0;
    for (let m = 0; m < 90; m++) if (sunPosition('leo', (m + 0.5) / 60).elevationDeg > 0) lit++;
    expect(lit).toBe(54);
    expect(geoEclipseMinutes(79)).toBeCloseTo(72, 5);
    expect(geoEclipseMinutes(172)).toBe(0);
    let dark = 0;
    for (let m = 0; m < 1440; m++) if (sunPosition('geo', 79 * 24 + (m + 0.5) / 60).clearSky < 0.5) dark++;
    expect(dark).toBeGreaterThan(68);
    expect(dark).toBeLessThan(76);
  });

  it('lunar south pole peak is lit about 80% of the time, 90% with the mast', () => {
    let a = 0;
    let b = 0;
    for (let h = 0; h < 8760; h++) { if (lunarPoleLit(h + 0.5, false)) a++; if (lunarPoleLit(h + 0.5, true)) b++; }
    expect(a / 8760).toBeGreaterThan(0.77);
    expect(a / 8760).toBeLessThan(0.83);
    expect(b / 8760).toBeGreaterThan(0.87);
    expect(b / 8760).toBeLessThan(0.93);
  });
});
