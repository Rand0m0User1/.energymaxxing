// Formatting and safe-math helpers for the dashboard. Every division is guarded: the engine may return zeros.
import type { SimResult } from '../../engine/types';

export function safeDiv(a: number, b: number, fallback = 0): number {
  if (!isFinite(a) || !isFinite(b) || Math.abs(b) < 1e-12) return fallback;
  const r = a / b;
  return isFinite(r) ? r : fallback;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Non-negative finite value (Float32 noise and missing arrays become 0). */
export function pos(v: number | undefined): number {
  return v != null && isFinite(v) && v > 0 ? v : 0;
}

/** Plain number with sensible digits: 1.02, 12.4, 640. */
export function num(v: number, digits?: number, trim = false): string {
  if (!isFinite(v)) return '—';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  const d = digits ?? (abs >= 100 ? 0 : abs >= 10 ? 1 : 2);
  return v.toLocaleString('en-US', { minimumFractionDigits: trim ? 0 : d, maximumFractionDigits: d });
}

export interface Unit { label: string; mult: number }

/** Pick GW / MW / kW from a reference size so a small Moon base does not read "0.00 GW". */
export function powerUnit(refGW: number): Unit {
  const r = Math.abs(refGW);
  if (!(r > 0) || r >= 0.1) return { label: 'GW', mult: 1 };
  if (r >= 1e-4) return { label: 'MW', mult: 1e3 };
  return { label: 'kW', mult: 1e6 };
}

/** Pick TWh / GWh / MWh / kWh for an energy total given in TWh. */
export function energyUnit(refTWh: number): Unit {
  const r = Math.abs(refTWh);
  if (!(r > 0) || r >= 0.1) return { label: 'TWh', mult: 1 };
  if (r >= 1e-4) return { label: 'GWh', mult: 1e3 };
  if (r >= 1e-7) return { label: 'MWh', mult: 1e6 };
  return { label: 'kWh', mult: 1e9 };
}

export function fmtUnit(v: number, u: Unit, digits?: number, trim = false): string {
  return `${num(v * u.mult, digits, trim)} ${u.label}`;
}

const refCache = new WeakMap<SimResult, number>();

/** Reference power (GW) for choosing display units: peak demand, else max demand, else 1. */
export function refPowerGW(result: SimResult): number {
  const cached = refCache.get(result);
  if (cached != null) return cached;
  let ref = pos(result.totals?.peakDemandGW);
  if (!(ref > 0) && result.demand) {
    for (let i = 0; i < result.demand.length; i++) if (result.demand[i] > ref) ref = result.demand[i];
  }
  if (!(ref > 0)) ref = 1;
  refCache.set(result, ref);
  return ref;
}

/** True when the sim covers a single day (orbit). Totals are then "over the day". */
export function isOneDay(result: SimResult): boolean {
  return result.steps * result.stepHours <= 24.5;
}

export function periodWord(result: SimResult): 'day' | 'year' {
  return isOneDay(result) ? 'day' : 'year';
}

/** Percent that never rounds a shortfall up to 100%. */
export function fmtPct(v: number): string {
  if (!isFinite(v)) return '—';
  if (v >= 100) return '100%';
  if (v <= 0) return '0%';
  if (v >= 10) return `${(Math.floor(v * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
  return `${v.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export function fmtMoney(v: number): string {
  if (!isFinite(v) || v <= 0) return '—';
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

/** "about 40 minutes", "5.3 hours", "3.1 days". */
export function fmtDuration(h: number): string {
  if (!isFinite(h) || h <= 0) return '0 minutes';
  if (h < 1) { const m = Math.max(1, Math.round(h * 60)); return `${m} minute${m === 1 ? '' : 's'}`; }
  if (h < 48) return `${num(h, h < 10 ? 1 : 0)} hours`;
  return `${num(h / 24, 1)} days`;
}

/** Carbon in million tonnes → readable value and unit words. */
export function fmtCO2(mt: number): { value: string; unit: string } {
  const v = pos(mt);
  if (v >= 0.1) return { value: num(v, v >= 10 ? 0 : 1), unit: 'million tonnes' };
  const t = v * 1e6;
  return { value: Math.round(t).toLocaleString('en-US'), unit: 'tonnes' };
}

export function fmtRatio(r: number): string {
  if (!isFinite(r) || r <= 0) return '0×';
  return `${num(r, r >= 10 ? 0 : 1)}×`;
}
