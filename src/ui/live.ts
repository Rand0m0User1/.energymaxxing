// Small helpers for reading live sim values with narrow zustand selectors, plus number formatting.
import { useEffect, useState } from 'react';
import { useApp, type AppState } from '../store';
import { dayOfYear, stepIndex, stepsPerDay } from '../engine/timeIndex';
import type { SimResult } from '../engine/types';
import type { SourceId, StationId, InsideViewId } from '../types';
import type { Fact, FactStatus } from '../data/facts';
import { MONTH_NAMES } from '../engine/timeIndex';
import { STATIONS } from '../world/layout';

/** Safe step index (0 if the result is empty). */
export function safeStep(r: SimResult, hourOfYear: number): number {
  if (!r || !r.steps || !(r.stepHours > 0)) return 0;
  const i = stepIndex(r, hourOfYear);
  return Number.isFinite(i) ? i : 0;
}

/** Read one array value safely. */
export function at(a: ArrayLike<number> | undefined | null, i: number): number {
  const v = a ? a[i] : 0;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Live number derived from the current step. Rounded so the component re-renders only on visible change. */
export function useLive(fn: (r: SimResult, i: number, s: AppState) => number, precision = 100): number {
  return useApp((s) => {
    const r = s.result;
    if (!r || !r.steps) return 0;
    const v = fn(r, safeStep(r, s.hourOfYear), s);
    return Number.isFinite(v) ? Math.round(v * precision) / precision : 0;
  });
}

/** Day of year; components using it re-render once per sim day. */
export function useDay(): number {
  return useApp((s) => dayOfYear(s.hourOfYear));
}

/** [start, end) step range of "today" in the result. */
export function dayRange(r: SimResult, hourOfYear: number): [number, number] {
  if (!r || !r.steps) return [0, 0];
  const spd = stepsPerDay(r);
  if (!Number.isFinite(spd) || r.steps <= spd) return [0, r.steps];
  const start = safeStep(r, Math.floor(hourOfYear / 24) * 24);
  return [start, Math.min(r.steps, start + spd)];
}

/** Share of today's served energy from one source (battery = discharge). 0 when nothing was served. */
export function todayShare(r: SimResult, hourOfYear: number, src: SourceId): number {
  if (!r || !r.steps) return 0;
  const [a, b] = dayRange(r, hourOfYear);
  const arr = src === 'battery' ? r.batteryDischarge : r.supply?.[src];
  let num = 0;
  let den = 0;
  for (let k = a; k < b; k++) { num += at(arr, k); den += at(r.served, k); }
  return den > 1e-9 ? num / den : 0;
}

export function useNarrow(): boolean {
  const q = '(max-width: 899px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setNarrow(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return narrow;
}

export function fmtGW(gw: number, digits = 2): string {
  if (!Number.isFinite(gw)) return '—';
  return `${gw.toFixed(digits)} GW`;
}

export function fmtPct(x: number): string {
  if (!Number.isFinite(x)) return '—';
  return `${Math.round(x * 100)}%`;
}

export const STATUS_WORDS: Record<FactStatus, string> = {
  cited: 'Cited source',
  textbook: 'Textbook physics',
  assumption: 'Model assumption',
  verify: 'Needs checking',
};

/** Human text for a fact value with its unit. */
export function formatFactValue(fa: Fact): string {
  const v = fa.value;
  const u = fa.unit;
  if (u === 'fraction') return `${(v * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  if (u === 'fraction/yr') return `${(v * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}% per year`;
  if (u === 'year') return String(v);
  if (u === 'date') {
    const y = Math.floor(v / 10000);
    const m = Math.floor((v % 10000) / 100);
    const d = v % 100;
    return `${MONTH_NAMES[m - 1] ?? ''} ${d}, ${y}`;
  }
  const abs = Math.abs(v);
  const text = abs !== 0 && (abs < 0.001 || abs >= 1e9)
    ? v.toExponential(2)
    : v.toLocaleString('en-US', { maximumFractionDigits: abs >= 100 ? 0 : abs >= 1 ? 2 : 4 });
  return `${text} ${u}`;
}

/** Open the inside view or tool that belongs to a station. Returns true if something opened. */
export function openStation(id: StationId): boolean {
  const s = useApp.getState();
  const inside: InsideViewId | null = STATIONS[id]?.inside ?? null;
  if (inside) { s.openInside(inside); return true; }
  if (id === 'batteryFactory') { s.openTool('batteryFactory'); return true; }
  if (id === 'industry') { s.openTool('industry'); return true; }
  return false;
}

/** Save a PNG of the first canvas on the page. */
export function takeScreenshot(): void {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  try {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'length-of-the-night.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    // Canvas may be tainted or unavailable; nothing to do.
  }
}

export function toggleFullscreen(): void {
  try {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  } catch {
    // Fullscreen not allowed here.
  }
}
