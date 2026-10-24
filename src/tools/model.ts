// Pure maths for the special tools. No React. Every input number comes from the facts registry.
// Other modules (3D plants, lessons) may import these helpers.
import { fv, type FactKey } from '../data/facts';
import { priceAfterDoublings, priceOfNth, learningExponent } from '../engine/learning';
import { HOURS_PER_YEAR } from '../engine/timeIndex';
import type { SimInput } from '../engine/types';
import type { PlaceId } from '../types';
import type { ReactorPath, ToolState } from '../store';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const safe = (v: number, fallback = 0) => (isFinite(v) ? v : fallback);

// ---------------- Reactor Row ----------------

export const REACTOR_PATH_RATE: Record<Exclude<ReactorPath, 'custom'>, FactKey> = {
  us: 'rrLearnUS',
  france: 'rrLearnFrance',
  korea: 'rrLearnKorea',
};

export function reactorPads(): number {
  return Math.max(1, Math.round(fv('rrPads')));
}

export function reactorLearningRate(path: ReactorPath, custom: number): number {
  if (path === 'custom') return clamp(custom, fv('rrCustomMin'), fv('rrCustomMax'));
  return fv(REACTOR_PATH_RATE[path]);
}

/** $/kW of reactor n (n >= 1), starting from the Vogtle first-of-a-kind price. */
export function reactorPricePerKW(path: ReactorPath, custom: number, n: number): number {
  return safe(priceOfNth(fv('vogtlePerKW'), reactorLearningRate(path, custom), Math.max(1, n)), fv('vogtlePerKW'));
}

/** Convenience: latest built reactor price from store tool state (null if none built). */
export function reactorRowPrice(t: Pick<ToolState, 'reactorPath' | 'customLearningRate' | 'reactorsBuilt'>): number | null {
  if (t.reactorsBuilt <= 0) return null;
  return reactorPricePerKW(t.reactorPath, t.customLearningRate, t.reactorsBuilt);
}

/** Capital recovery factor. r in percent. */
export function crf(ratePct: number, years: number): number {
  const r = Math.max(0, ratePct) / 100;
  const n = Math.max(1, years);
  if (r < 1e-9) return 1 / n;
  const g = Math.pow(1 + r, n);
  return (r * g) / (g - 1);
}

/** Cost per MWh of a reactor at a given $/kW (capex × CRF over the year's energy, plus O&M and fuel). */
export function reactorCostPerMWh(perKW: number, waccPct: number): number {
  const mwhPerKWYear = (HOURS_PER_YEAR / 1000) * Math.max(0.01, fv('nuclearCFUS'));
  return safe(perKW * crf(waccPct, fv('rrLifeYears')) / mwhPerKWYear + fv('fissionOM') + fv('fissionFuel'));
}

/** How many reactors until the price reaches `target` at this learning rate. null = never (costs flat or rising). */
export function copiesToReach(target: number, start: number, rate: number): number | null {
  if (start <= target) return 1;
  const b = learningExponent(rate);
  if (!(b > 1e-6)) return null;
  const n = Math.pow(start / target, 1 / b);
  return isFinite(n) ? Math.ceil(n) : null;
}

// ---------------- Capital stack ----------------

export interface StackBlockDef {
  id: 'vc' | 'gov' | 'fuel' | 'ppa' | 'debt';
  stage: string;
  who: string;
  foak: FactKey;
  noak: FactKey;
  ret: FactKey;
}

/** Top of the tower first (riskiest money on top). */
export const STACK_BLOCKS: StackBlockDef[] = [
  { id: 'vc', stage: 'Design and licensing', who: 'Venture capital and founders', foak: 'csShareVcFoak', noak: 'csShareVcNoak', ret: 'csReturnVc' },
  { id: 'gov', stage: 'First-of-a-kind build', who: 'Government grants, cost-share and loan guarantees', foak: 'csShareGovFoak', noak: 'csShareGovNoak', ret: 'csReturnGov' },
  { id: 'fuel', stage: 'Fuel supply', who: 'Government fuel contracts', foak: 'csShareFuelFoak', noak: 'csShareFuelNoak', ret: 'csReturnFuel' },
  { id: 'ppa', stage: 'Early fleet', who: 'Long-term power deals from tech companies', foak: 'csSharePpaFoak', noak: 'csSharePpaNoak', ret: 'csReturnPpa' },
  { id: 'debt', stage: 'Nth-of-a-kind', who: 'Utilities and infrastructure funds with cheap debt', foak: 'csShareDebtFoak', noak: 'csShareDebtNoak', ret: 'csReturnDebt' },
];

export interface StackBlock extends StackBlockDef { share: number; dollars: number; returnRate: number }

/** Money stack for reactor n. totalDollars = cost of that reactor. Shares slide from FOAK to NOAK on a log scale. */
export function capitalStack(n: number, totalDollars: number): { blocks: StackBlock[]; blendedRate: number } {
  const pads = reactorPads();
  const t = pads > 1 ? clamp(Math.log(Math.max(1, n)) / Math.log(pads), 0, 1) : 1;
  const raw = STACK_BLOCKS.map((b) => fv(b.foak) * (1 - t) + fv(b.noak) * t);
  const sum = raw.reduce((a, v) => a + v, 0) || 1;
  const blocks = STACK_BLOCKS.map((b, i) => {
    const share = raw[i] / sum;
    return { ...b, share, dollars: share * Math.max(0, safe(totalDollars)), returnRate: fv(b.ret) };
  });
  const blendedRate = blocks.reduce((a, b) => a + b.share * b.returnRate, 0);
  return { blocks, blendedRate };
}

// ---------------- Battery Factory ----------------

export type Chemistry = ToolState['batteryChemistry'];

export const CHEMISTRY_START: Record<Chemistry, FactKey> = {
  lfp: 'batteryPackPrice2025',
  nmc: 'bfPackNMC',
  sodium: 'bfPackSodium',
};

export function batteryMaxDoublings(): number {
  return Math.max(1, Math.round(fv('bfMaxDoublings')));
}

/** Pack and installed-system price ($/kWh) after d doublings of total production. */
export function batteryPrices(chem: Chemistry, d: number): { pack: number; nonPack: number; system: number } {
  const pack0 = fv(CHEMISTRY_START[chem]);
  const share = clamp(fv('bfPackShareOfSystem'), 0.05, 1);
  // The rest of the system (grid connection, land, labor, permits, inverters) does not depend on chemistry.
  const nonPack0 = fv('batteryPackPrice2025') * (1 / share - 1);
  const pack = priceAfterDoublings(pack0, fv('batteryLearningRate'), Math.max(0, d));
  const nonPack = priceAfterDoublings(nonPack0, fv('bfNonPackLearningRate'), Math.max(0, d));
  return { pack: safe(pack), nonPack: safe(nonPack), system: safe(pack + nonPack) };
}

// ---------------- Industry Quarter ----------------

export type IndustryKind = 'smelter' | 'datacenter' | 'hydrogen' | 'desal';
export type IndustryState = 'off' | 'competitive' | 'booming';

/** Break-even power price ($/MWh). null = runs at any price (data center). Matches the 3D buildings' thresholds. */
export function industryThreshold(kind: IndustryKind): number | null {
  switch (kind) {
    case 'smelter': return fv('iqSmelterThreshold');
    case 'hydrogen': return fv('iqH2Threshold');
    case 'desal': return fv('iqDesalThreshold');
    case 'datacenter': return null;
  }
}

export function industryState(kind: IndustryKind, price: number): IndustryState {
  const th = industryThreshold(kind);
  if (th == null) return 'competitive';
  if (price > th) return 'off';
  return price <= th * fv('iqBoomFactor') ? 'booming' : 'competitive';
}

export function priceToDial(price: number): number {
  const lo = Math.log(Math.max(0.01, fv('iqPriceMin')));
  const hi = Math.log(Math.max(fv('iqPriceMin') + 0.01, fv('iqPriceMax')));
  return clamp((hi - Math.log(Math.max(0.01, price))) / (hi - lo), 0, 1);
}

export function dialToPrice(t: number): number {
  const lo = Math.log(Math.max(0.01, fv('iqPriceMin')));
  const hi = Math.log(Math.max(fv('iqPriceMin') + 0.01, fv('iqPriceMax')));
  return Math.exp(hi - clamp(t, 0, 1) * (hi - lo));
}

/** Round a dial price to a tidy value. */
export function tidyPrice(p: number): number {
  return p >= 10 ? Math.round(p) : Math.round(p * 10) / 10;
}

export interface IndustryNumbers {
  smelter: { perT: number; share: number };
  datacenter: { powerB: number; share: number };
  hydrogen: { perKg: number; share: number };
  desal: { waterPerM3: number; co2PerT: number; share: number };
}

export function industryNumbers(price: number): IndustryNumbers {
  const p = Math.max(0, price);
  const alE = p * fv('iqSmelterMWhPerT');
  const alT = alE + fv('iqSmelterOtherPerT');
  const dcPowerB = (p * HOURS_PER_YEAR * 1000) / 1e9; // 1 GW running all year: MWh × $/MWh → $ billion
  const dcTot = dcPowerB + fv('dcServerCostB');
  const h2E = (p * fv('iqH2KWhPerKg')) / 1000;
  const h2T = h2E + fv('iqH2OtherPerKg');
  const waterE = (p * fv('iqDesalKWhPerM3')) / 1000;
  const co2E = p * fv('iqDacMWhPerT');
  const co2T = co2E + fv('iqDacOtherPerT');
  return {
    smelter: { perT: alT, share: alT > 0 ? alE / alT : 0 },
    datacenter: { powerB: dcPowerB, share: dcTot > 0 ? dcPowerB / dcTot : 0 },
    hydrogen: { perKg: h2T, share: h2T > 0 ? h2E / h2T : 0 },
    desal: { waterPerM3: waterE + fv('iqDesalOtherPerM3'), co2PerT: co2T, share: co2T > 0 ? co2E / co2T : 0 },
  };
}

/** Tonnes of hydrogen that `twh` of electricity could make. */
export function hydrogenTonnesFromTWh(twh: number): number {
  const kwh = Math.max(0, safe(twh)) * 1e9;
  const perKg = Math.max(1, fv('iqH2KWhPerKg'));
  return kwh / perKg / 1000;
}

// ---------------- Beyond Earth ----------------

export interface OffworldCase {
  place: PlaceId;
  /** Longest dark period, hours. */
  darkH: number;
  /** Fraction of time the panels are lit. */
  litFrac: number;
  /** Average sunlight while lit, compared with full sun above the atmosphere. */
  sunScale: number;
  /** Extra panel factor to keep going through a dust storm. */
  stormFactor: number;
  /** True on the Moon or Mars: landing costs more than reaching low orbit. */
  surface: boolean;
}

export function offworldCase(input: Pick<SimInput, 'place' | 'lunarMast' | 'events'>): OffworldCase | null {
  const storm = input.events.some((e) => e.kind === 'dustStorm');
  const marsSun = fv('marsIrradiance') / Math.max(1, fv('solarConstant'));
  switch (input.place) {
    case 'leo':
      return { place: 'leo', darkH: fv('leoShadowMin') / 60, litFrac: 1 - fv('leoShadowMin') / Math.max(1, fv('leoPeriodMin')), sunScale: 1, stormFactor: 1, surface: false };
    case 'geo':
      return { place: 'geo', darkH: fv('geoEclipseMaxMin') / 60, litFrac: 1 - fv('geoEclipseMaxMin') / (24 * 60), sunScale: 1, stormFactor: 1, surface: false };
    case 'lunarEquator':
      return { place: 'lunarEquator', darkH: fv('lunarNightH'), litFrac: clamp(1 - fv('lunarNightH') / (fv('lunarCycleDays') * 24), 0.05, 1), sunScale: fv('beCosAvg'), stormFactor: 1, surface: true };
    case 'lunarSouthPole':
      return {
        place: 'lunarSouthPole',
        darkH: input.lunarMast ? fv('beLunarPoleMastDarkH') : fv('beLunarPoleDarkH'),
        litFrac: input.lunarMast ? fv('lunarMastLit') : fv('lunarPeakLit'),
        sunScale: fv('bePoleSunScale'), stormFactor: 1, surface: true,
      };
    case 'marsEquator':
      return { place: 'marsEquator', darkH: fv('marsSolH') / 2, litFrac: 0.5, sunScale: marsSun * fv('beCosAvg'), stormFactor: storm ? 1 / Math.max(0.01, fv('marsDustStormFactor')) : 1, surface: true };
    case 'marsMidLat':
      return {
        place: 'marsMidLat', darkH: fv('beMarsMidLatNightH'),
        litFrac: clamp(1 - fv('beMarsMidLatNightH') / Math.max(1, fv('marsSolH')), 0.05, 1),
        sunScale: marsSun * fv('beCosAvg') * fv('beMarsMidLatSun'), stormFactor: storm ? 1 / Math.max(0.01, fv('marsDustStormFactor')) : 1, surface: true,
      };
    default:
      return null;
  }
}

export interface OffworldMasses { batteryKg: number; solarKg: number; solarBatteryKg: number; reactorKg: number; arrayKW: number }

/** Mass per kW of steady load for solar + battery versus a small reactor. */
export function offworldMasses(c: OffworldCase): OffworldMasses {
  const batteryKg = (Math.max(0, c.darkH) * 1000) / Math.max(1, fv('liIonWhPerKg'));
  const rt = clamp(fv('batteryRoundTrip'), 0.1, 1);
  const lit = clamp(c.litFrac, 0.01, 1);
  // Panels must make a full day's energy while lit, plus battery losses for the dark share.
  const energyNeed = lit + (1 - lit) / rt;
  const arrayKW = (energyNeed / (lit * Math.max(0.001, c.sunScale))) * Math.max(1, c.stormFactor);
  const solarKg = (arrayKW * 1000) / Math.max(1, fv('beSolarWPerKg'));
  const reactorKg = (fv('fspTargetTonnes') * 1000) / Math.max(1, fv('fspTargetKW'));
  return { batteryKg: safe(batteryKg), solarKg: safe(solarKg), solarBatteryKg: safe(batteryKg + solarKg), reactorKg: safe(reactorKg), arrayKW: safe(arrayKW) };
}

export function launchCostPerKg(surface: boolean): number {
  return fv('launchCostPerKg') * (surface ? fv('surfaceDeliveryMultiplier') : 1);
}

// ---------------- Formatting ----------------

export function money(v: number): string {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(v / 1e9).toLocaleString('en-US', { maximumFractionDigits: a >= 1e10 ? 0 : 1 })} billion`;
  if (a >= 1e6) return `$${(v / 1e6).toLocaleString('en-US', { maximumFractionDigits: a >= 1e7 ? 0 : 1 })} million`;
  if (a >= 100) return `$${Math.round(v).toLocaleString('en-US')}`;
  if (a >= 10) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: a < 1 && a > 0 ? 2 : 0 })}`;
}

export function moneyShort(v: number): string {
  if (!isFinite(v)) return '—';
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`;
  return `$${Math.round(v)}`;
}

export function pct(v: number, digits = 0): string {
  if (!isFinite(v)) return '—';
  return `${(v * 100).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })}%`;
}

/** "+10%" / "−8%" style, for learning rates. */
export function signedPct(v: number, digits = 0): string {
  if (!isFinite(v)) return '—';
  const s = (Math.abs(v) * 100).toLocaleString('en-US', { maximumFractionDigits: digits });
  if (Math.abs(v) < 1e-9) return '0%';
  return `${v > 0 ? '+' : '−'}${s}%`;
}

export function kg(v: number): string {
  if (!isFinite(v)) return '—';
  return `${v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;
}

export function hours(h: number): string {
  if (!isFinite(h)) return '—';
  if (h < 2) return `${Math.round(h * 60)} minutes`;
  if (h >= 48) return `${Math.round(h).toLocaleString('en-US')} hours (about ${(Math.round((h / 24) * 2) / 2).toLocaleString('en-US')} Earth days)`;
  return `${h.toLocaleString('en-US', { maximumFractionDigits: 1 })} hours`;
}
