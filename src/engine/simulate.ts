// The simulation engine. simulate(input) => SimResult. Pure, synchronous, deterministic.
import type { SimInput, SimResult, SimTotals } from './types';
import { DISTRICT_IDS, GEN_IDS, type DistrictId, type GenId } from '../types';
import { PLACES, type Place } from '../data/places';
import { fv } from '../data/facts';
import { declinationDeg, earthSunVector, sunPosition } from './sun';
import { buildWeather } from './weather';
import { buildDemand } from './demand';
import { computeCost } from './cost';
import { heatingWeight } from '../data/loadShapes';

const ORBIT_STEPS = 1440;

/** Shed order when power runs out (a model choice, labelled as one in the UI):
 *  hydrogen (if a fixed load), data center flexible part, factory, transport, rest of data center, shops and offices, homes last. */
export const SHED_ORDER: ('hydrogen' | 'dcFlex' | 'factory' | 'transport' | 'dcRest' | 'commercial' | 'homes')[] =
  ['hydrogen', 'dcFlex', 'factory', 'transport', 'dcRest', 'commercial', 'homes'];

const recOf = <K extends string>(keys: readonly K[], steps: number) =>
  Object.fromEntries(keys.map((k) => [k, new Float32Array(steps)])) as Record<K, Float32Array>;
const zeroGen = (): Record<GenId, number> => Object.fromEntries(GEN_IDS.map((g) => [g, 0])) as Record<GenId, number>;

const AIR_EXTRA = fv('solarAirMassExp') - 1;
const SUBSTEPS = 4;
const D2R = Math.PI / 180;

/** Per-GW solar output for an Earth site at one moment (before weather and losses), with single-axis trackers. */
export function earthSolarUnitClear(lat: number, hourOfYear: number): number {
  return trackedFromVector(earthSunVector(lat, hourOfYear));
}

function trackedFromVector(v: { east: number; up: number }): number {
  if (v.up <= 0) return 0;
  // Panels on a north-south axis turn east to west: they catch the part of the sunlight in the east-up plane.
  // This is what makes tracked solar flat-topped through the day (more useful hours than fixed panels).
  const incidence = Math.sqrt(v.up * v.up + v.east * v.east);
  // Low sun passes through more air: dim it^1.15 for flat panels).
  return incidence * Math.pow(v.up, AIR_EXTRA);
}

interface Ctx {
  place: Place;
  input: SimInput;
  steps: number;
  dt: number;
  startHour: number;
}

/** Per-GW availability series for each generator (0..1, or a fixed value for firm plants). */
function unitSeries(ctx: Ctx, weatherSolar: Float32Array) {
  const { place, input, steps, dt, startHour } = ctx;
  const solarUnit = new Float32Array(steps);
  const sunVis = new Float32Array(steps);
  const fissionUnit = new Float32Array(steps);
  const derate = fv('solarDerate');
  const snowLoss = input.snow ? fv('snowSolarLoss') : 0;
  const lat = place.lat ?? 0;
  const orbitDay = Math.max(0, Math.min(364, Math.round(input.orbitDay ?? place.hardestDay)));
  const sunOpts = { lunarMast: !!input.lunarMast };
  const sinLat = Math.sin(lat * D2R);
  const cosLat = Math.cos(lat * D2R);
  let lastDay = -1;
  let sinDec = 0;
  let cosDec = 1;

  for (let t = 0; t < steps; t++) {
    const hStart = startHour + t * dt;
    const hMid = hStart + dt / 2;
    if (place.body === 'earth') {
      const day = Math.floor(hMid / 24);
      // Average four moments inside the step so sunrise and sunset hours get partial output.
      // (Same maths as earthSunVector, with the slow parts done once per day.)
      if (day !== lastDay) {
        lastDay = day;
        const dec = declinationDeg(day + 1 + 0.5) * D2R;
        sinDec = Math.sin(dec);
        cosDec = Math.cos(dec);
      }
      let clear = 0;
      let vis = 0;
      for (let k = 0; k < SUBSTEPS; k++) {
        const hh = hStart + ((k + 0.5) / SUBSTEPS) * dt;
        const H = 15 * ((((hh % 24) + 24) % 24) - 12) * D2R;
        const cosH = Math.cos(H);
        const up = sinLat * sinDec + cosLat * cosDec * cosH;
        if (up <= 0) continue;
        const east = -cosDec * Math.sin(H);
        const air = Math.exp(AIR_EXTRA * Math.log(up));
        clear += Math.sqrt(up * up + east * east) * air;
        vis += up * air;
      }
      clear /= SUBSTEPS;
      vis /= SUBSTEPS;
      let snow = 1;
      if (snowLoss > 0 && lat >= 45) snow = 1 - snowLoss * heatingWeight(day) * Math.min(1, (lat - 45) / 15);
      const w = weatherSolar[t];
      solarUnit[t] = Math.min(1, derate * clear * w * snow);
      sunVis[t] = vis * w;
    } else {
      const h = place.body === 'orbit' ? orbitDay * 24 + hMid : hMid;
      const sp = sunPosition(place.id, h, sunOpts);
      const w = weatherSolar[t];
      solarUnit[t] = Math.min(1, derate * sp.clearSky * w);
      sunVis[t] = Math.min(1, sp.clearSky * w);
    }
  }

  // Fission: refuelling outages (3 weeks every 18 months) plus small unplanned outages.
  // The plant is treated as three equal units refuelled in turn: two of the three refuel in any one year.
  const outageDays = fv('fissionOutageWeeks') * 7;
  const unplanned = fv('fissionUnplannedOutage');
  const unitOutages = [100, 283];
  for (let t = 0; t < steps; t++) {
    if (!input.realisticOutages) { fissionUnit[t] = 1; continue; }
    const day = (startHour + t * dt + dt / 2) / 24;
    let a = 1 - unplanned;
    for (const s of unitOutages) if (day >= s && day < s + outageDays) a *= 2 / 3;
    fissionUnit[t] = a;
  }
  return { solarUnit, sunVis, fissionUnit };
}

export function simulate(input: SimInput): SimResult {
  const place = PLACES[input.place] ?? PLACES.abuDhabi;
  const orbit = place.body === 'orbit';
  const steps = orbit ? ORBIT_STEPS : 8760;
  const dt = orbit ? 1 / 60 : 1;
  const startHour = 0;
  const ctx: Ctx = { place, input, steps, dt, startHour };

  // ---------- inputs ----------
  const weather = buildWeather(place, input, steps, dt, startHour);
  const demandS = buildDemand(place, input, steps, dt, startHour);
  const { solarUnit, sunVis, fissionUnit } = unitSeries(ctx, weather.solar);
  const windUnit = weather.wind;

  const p = input.plants;
  const on = (g: GenId) => !!p[g]?.on && (p[g]?.gw ?? 0) > 0;
  const cap: Record<GenId, number> = {
    solar: on('solar') ? p.solar.gw : 0,
    wind: on('wind') ? p.wind.gw : 0,
    fission: on('fission') ? p.fission.gw : 0,
    geothermal: on('geothermal') ? Math.min(p.geothermal.gw, place.geothermalMaxGW) : 0,
    fusion: on('fusion') && input.year >= fv('fusionMinYear') ? p.fusion.gw : 0,
    hydro: on('hydro') ? Math.min(p.hydro.gw, place.hydroMaxGW) : 0,
    gas: on('gas') ? p.gas.gw : 0,
  };
  const bat = input.battery;
  const batOn = !!bat?.on && bat.gw > 0 && bat.gwh > 0;
  const Pb = batOn ? bat.gw : 0;
  const Eb = batOn ? bat.gwh : 0;
  // Model choice: charging from local plants is limited by the cells (a full refill in about 4 hours),
  // not only by the output rating. Same as Pb for batteries of 4 hours or less; matters for long batteries
  // like the Abu Dhabi benchmark (19 GWh behind 1.5 GW), which a 1.5 GW charge limit could not refill in a winter day.
  const PbCharge = batOn ? Math.max(Pb, Eb / fv('batteryChargeHoursMin')) : 0;
  const eta = Math.sqrt(input.batteryRoundTrip ?? fv('batteryRoundTrip'));
  const batSchedule = batOn && bat.mode === 'schedule' && Array.isArray(bat.schedule) && bat.schedule.length >= 24 ? bat.schedule : null;
  const gasSchedule = Array.isArray(p.gas?.schedule) && p.gas.schedule.length >= 24 ? p.gas.schedule : null;
  const hydroSchedule = Array.isArray(p.hydro?.schedule) && p.hydro.schedule.length >= 24 ? p.hydro.schedule : null;

  const hydroInflow = cap.hydro * fv('hydroCF'); // GW average water budget
  const hydroMax = hydroInflow * 24 * 60; // reservoir holds about 60 days of average water
  const fissionMin = input.fissionFlexible ? fv('fissionFlexMin') : 1;
  const absorbCap = input.industryFlex
    ? (input.districts.hydrogen?.on ? input.districts.hydrogen.mw / 1000 : fv('industryFlexCapMW') / 1000)
    : 0;
  const flexDC = !!input.flexibleDataCenter;
  const dcShare = fv('dcFlexShare');
  const dcMaxH = fv('dcFlexHours');
  const dcRecover = fv('dcFlexRecoveryPerHour');

  // ---------- outputs ----------
  const supply = recOf(GEN_IDS, steps);
  const available = recOf(GEN_IDS, steps);
  const batteryCharge = new Float32Array(steps);
  const batteryDischarge = new Float32Array(steps);
  const soc = new Float32Array(steps);
  const served = new Float32Array(steps);
  const unserved = new Float32Array(steps);
  const curtailed = new Float32Array(steps);
  const industryAbsorbed = new Float32Array(steps);
  const flexShed = new Float32Array(steps);
  const co2t = new Float32Array(steps);
  const hydroStore = new Float32Array(steps);
  const servedFracByDistrict = recOf<DistrictId>(DISTRICT_IDS, steps);
  const demand = demandS.total;
  const dd = demandS.byDistrict;

  const co2PerMWh = fv('gasCO2PerMWh');
  const usedMWh = zeroGen();
  const availMWh = zeroGen();
  let fissionMadeMWh = 0;
  let dischargeMWh = 0, curtailedMWh = 0, absorbedMWh = 0, servedMWh = 0, unservedMWh = 0, demandMWh = 0, co2 = 0;
  let directMWh = zeroGen();
  let blackSteps = 0, run = 0, longest = 0;

  const state = { soc: 0.5 * Eb, hydro: 0.5 * hydroMax, dcBudget: dcMaxH };

  const runRange = (from: number, to: number, record: boolean) => {
    for (let t = from; t < to; t++) {
      const hod = Math.floor((((startHour + t * dt) % 24) + 24) % 24) % 24;
      const need = demand[t];
      const sAv = cap.solar * solarUnit[t];
      const wAv = cap.wind * windUnit[t];
      const fiAv = cap.fission * fissionUnit[t];
      const geAv = cap.geothermal;
      const fuAv = cap.fusion;
      const mustRun = sAv + wAv + fiAv + geAv + fuAv;
      const bs = batSchedule ? batSchedule[hod] : 0;
      const canCharge = batOn && (!batSchedule || bs === 1);
      const canDischarge = batOn && (!batSchedule || bs === -1);

      let charge = 0, discharge = 0, hydro = 0, gas = 0, flex = 0, uns = 0, absorb = 0, curt = 0, fCut = 0;
      let sUse = sAv, wUse = wAv, fiUse = fiAv, geUse = geAv, fuUse = fuAv;

      // Hydro reservoir fills with its water budget every step.
      state.hydro = Math.min(hydroMax, state.hydro + hydroInflow * dt);

      if (mustRun >= need) {
        let surplus = mustRun - need;
        if (canCharge) {
          const room = Math.max(0, Eb - state.soc);
          charge = Math.min(surplus, PbCharge, room / (eta * dt));
          state.soc = Math.min(Eb, state.soc + charge * eta * dt);
          surplus -= charge;
        }
        if (absorbCap > 0 && surplus > 0) {
          absorb = Math.min(surplus, absorbCap);
          surplus -= absorb;
        }
        if (fissionMin < 1 && surplus > 0 && fiAv > 0) {
          fCut = Math.min(surplus, fiAv * (1 - fissionMin));
          surplus -= fCut;
        }
        curt = Math.max(0, surplus);
        // Take spare energy away from sources in this order: solar, wind, fusion, geothermal, fission.
        let rem = absorb + curt;
        fiUse = fiAv - fCut;
        const take = (x: number) => { const d = Math.min(x, rem); rem -= d; return x - d; };
        sUse = take(sUse); wUse = take(wUse); fuUse = take(fuUse); geUse = take(geUse); fiUse = take(fiUse);
        if (flexDC) state.dcBudget = Math.min(dcMaxH, state.dcBudget + dcRecover * dt);
      } else {
        let gap = need - mustRun;
        if (canDischarge && state.soc > 0) {
          discharge = Math.min(gap, Pb, (state.soc * eta) / dt);
          state.soc = Math.max(0, state.soc - (discharge / eta) * dt);
          gap -= discharge;
        }
        if (gap > 0 && cap.hydro > 0 && (!hydroSchedule || hydroSchedule[hod])) {
          hydro = Math.min(gap, cap.hydro, state.hydro / dt);
          state.hydro -= hydro * dt;
          gap -= hydro;
        }
        if (gap > 0 && cap.gas > 0 && (!gasSchedule || gasSchedule[hod])) {
          gas = Math.min(gap, cap.gas);
          gap -= gas;
        }
        if (gap > 1e-12 && flexDC && state.dcBudget >= dt - 1e-9) {
          flex = Math.min(gap, dcShare * dd.datacenter[t]);
          if (flex > 0) state.dcBudget -= dt;
          gap -= flex;
        } else if (flexDC) {
          state.dcBudget = Math.min(dcMaxH, state.dcBudget + dcRecover * dt);
        }
        uns = gap > 1e-12 ? gap : 0;
      }

      if (!record) continue;

      const srv = need - flex - uns;
      supply.solar[t] = sUse; supply.wind[t] = wUse; supply.fission[t] = fiUse;
      supply.geothermal[t] = geUse; supply.fusion[t] = fuUse; supply.hydro[t] = hydro; supply.gas[t] = gas;
      available.solar[t] = sAv; available.wind[t] = wAv; available.fission[t] = fiAv;
      available.geothermal[t] = geAv; available.fusion[t] = fuAv;
      available.hydro[t] = cap.hydro > 0 && (!hydroSchedule || hydroSchedule[hod]) ? Math.min(cap.hydro, state.hydro / dt + hydro) : 0;
      available.gas[t] = cap.gas > 0 && (!gasSchedule || gasSchedule[hod]) ? cap.gas : 0;
      batteryCharge[t] = charge;
      batteryDischarge[t] = discharge;
      soc[t] = state.soc;
      served[t] = srv;
      unserved[t] = uns;
      curtailed[t] = curt;
      industryAbsorbed[t] = absorb;
      flexShed[t] = flex;
      co2t[t] = gas * dt * 1000 * co2PerMWh;
      hydroStore[t] = hydroMax > 0 ? state.hydro / hydroMax : 0;

      // Who was shed (SHED_ORDER), as a served fraction per district.
      const dcD = dd.datacenter[t];
      let shed = uns;
      const cut: Record<DistrictId, number> = { homes: 0, commercial: 0, transport: 0, factory: 0, datacenter: flex, hydrogen: 0 };
      if (shed > 0) {
        const takeFrom = (id: DistrictId, amount: number) => { const d = Math.min(Math.max(0, amount), shed); cut[id] += d; shed -= d; };
        takeFrom('hydrogen', dd.hydrogen[t]);
        takeFrom('datacenter', dcShare * dcD - flex);
        takeFrom('factory', dd.factory[t]);
        takeFrom('transport', dd.transport[t]);
        takeFrom('datacenter', dcD - cut.datacenter);
        takeFrom('commercial', dd.commercial[t]);
        takeFrom('homes', dd.homes[t]);
      }
      for (const id of DISTRICT_IDS) {
        const dv = dd[id][t];
        servedFracByDistrict[id][t] = dv > 1e-12 ? Math.max(0, Math.min(1, (dv - cut[id]) / dv)) : 1;
      }

      // Totals (double precision).
      const k = dt * 1000; // GW -> MWh
      usedMWh.solar += sUse * k; usedMWh.wind += wUse * k; usedMWh.fission += fiUse * k;
      usedMWh.geothermal += geUse * k; usedMWh.fusion += fuUse * k; usedMWh.hydro += hydro * k; usedMWh.gas += gas * k;
      availMWh.solar += sAv * k; availMWh.wind += wAv * k; availMWh.fission += fiAv * k;
      availMWh.geothermal += geAv * k; availMWh.fusion += fuAv * k; availMWh.hydro += hydro * k; availMWh.gas += gas * k;
      fissionMadeMWh += (fiAv - fCut) * k;
      // Energy from each generator that went straight to the city (the rest charged the battery).
      const genTotal = sUse + wUse + fiUse + geUse + fuUse + hydro + gas;
      const direct = genTotal > 0 ? (srv - discharge) / genTotal : 0;
      directMWh.solar += sUse * direct * k; directMWh.wind += wUse * direct * k; directMWh.fission += fiUse * direct * k;
      directMWh.geothermal += geUse * direct * k; directMWh.fusion += fuUse * direct * k;
      directMWh.hydro += hydro * direct * k; directMWh.gas += gas * direct * k;
      dischargeMWh += discharge * k;
      curtailedMWh += curt * k;
      absorbedMWh += absorb * k;
      servedMWh += srv * k;
      unservedMWh += uns * k;
      demandMWh += need * k;
      co2 += gas * k * co2PerMWh;
      if (uns > 1e-6 * Math.max(need, 1e-6)) {
        blackSteps++;
        run++;
        if (run > longest) longest = run;
      } else run = 0;
    }
  };

  // Warm-up: run the last two weeks (or the whole orbit day) first so the battery starts the period realistically.
  const warm = orbit ? steps : Math.min(steps, 14 * 24);
  runRange(steps - warm, steps, false);
  if (orbit) runRange(0, steps, false);
  runRange(0, steps, true);

  // ---------- totals ----------
  const spanH = steps * dt;
  let peak = 0;
  for (let t = 0; t < steps; t++) if (demand[t] > peak) peak = demand[t];

  const generatedTWh = zeroGen();
  const capacityFactor = zeroGen();
  for (const g of GEN_IDS) generatedTWh[g] = usedMWh[g] / 1e6;
  // Potential capacity factor per GW (shown even when a plant is off), from the unit series.
  let sSum = 0, wSum = 0, fSum = 0;
  for (let t = 0; t < steps; t++) { sSum += solarUnit[t]; wSum += windUnit[t]; fSum += fissionUnit[t]; }
  capacityFactor.solar = sSum / steps;
  capacityFactor.wind = wSum / steps;
  capacityFactor.fission = fSum / steps;
  capacityFactor.geothermal = place.geothermalMaxGW > 0 ? 1 : 0;
  capacityFactor.fusion = input.year >= fv('fusionMinYear') ? 1 : 0;
  capacityFactor.hydro = cap.hydro > 0 ? usedMWh.hydro / (cap.hydro * 1000 * spanH) : 0;
  capacityFactor.gas = cap.gas > 0 ? usedMWh.gas / (cap.gas * 1000 * spanH) : 0;

  const share = { ...zeroGen(), battery: 0 } as Record<GenId | 'battery', number>;
  if (servedMWh > 1e-9) {
    for (const g of GEN_IDS) share[g] = Math.max(0, directMWh[g] / servedMWh);
    share.battery = dischargeMWh / servedMWh;
  }

  const cost = computeCost({
    costs: input.costs,
    capGW: cap,
    batteryGW: Pb,
    batteryGWh: Eb,
    availMWh,
    usedMWh,
    fissionMadeMWh,
    dischargeMWh,
    curtailedMWh,
    absorbedMWh,
    servedMWh,
    spanYears: spanH / 8760,
  });

  const installed = GEN_IDS.reduce((a, g) => a + cap[g], 0) + Pb;
  const totals: SimTotals = {
    lightsOnPct: (100 * (steps - blackSteps)) / steps,
    longestBlackoutH: longest * dt,
    demandTWh: demandMWh / 1e6,
    servedTWh: servedMWh / 1e6,
    unservedTWh: unservedMWh / 1e6,
    curtailedTWh: curtailedMWh / 1e6,
    generatedTWh,
    batteryOutTWh: dischargeMWh / 1e6,
    co2Mt: co2 / 1e6,
    costPerMWh: { low: cost.low, mid: cost.mid, high: cost.high },
    homeBillPerMonth: cost.mid * fv('homeMWhPerMonth'),
    overbuildRatio: peak > 1e-9 ? installed / peak : 0,
    peakDemandGW: peak,
    capacityFactor,
    share,
  };

  return {
    stepHours: dt,
    steps,
    startHour,
    supply,
    available,
    batteryCharge,
    batteryDischarge,
    soc,
    demand,
    demandByDistrict: dd,
    served,
    unserved,
    servedFracByDistrict,
    curtailed,
    industryAbsorbed,
    flexShed,
    co2t,
    sun: sunVis,
    wind: windUnit,
    hydroStore,
    totals,
  };
}
