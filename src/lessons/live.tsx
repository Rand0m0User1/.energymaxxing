// Live readouts and token-aware text for lesson cards.
// Readouts poll the store a few times a second instead of subscribing, so play mode
// (which changes the hour every frame) never re-renders the card per frame.
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useApp, type AppState } from '../store';
import { FACTS, type FactKey } from '../data/facts';
import { PLACES } from '../data/places';
import { Fact, fmtNumber } from '../ui/Fact';
import { stepIndex, formatClock, formatDate } from '../engine/timeIndex';
import type { LiveKind } from './types';

/** Re-reads `fn(state)` every `ms` and re-renders only when the result changes. */
export function usePolled<T extends string | number | boolean | null>(fn: (s: AppState) => T, ms = 250, key = ''): T {
  const [v, setV] = useState<T>(() => fn(useApp.getState()));
  useEffect(() => {
    const tick = () => {
      const nv = fn(useApp.getState());
      setV((prev) => (Object.is(prev, nv) ? prev : nv));
    };
    tick();
    const id = window.setInterval(tick, ms);
    return () => window.clearInterval(id);
    // fn is expected to be stable for a given key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, key]);
  return v;
}

const DASH = '—';

function at(arr: Float32Array | undefined, s: AppState): number | null {
  const r = s.result;
  if (!arr || !r || !(r.steps > 0) || !(r.stepHours > 0) || arr.length === 0) return null;
  const i = stepIndex(r, s.hourOfYear);
  const v = arr[i];
  return Number.isFinite(v) ? v : null;
}

const pct = (v: number | null | undefined, digits = 1) => (v == null || !Number.isFinite(v) ? DASH : `${fmtNumber(v * 100, digits)}%`);
const gw = (v: number | null) => (v == null ? DASH : `${fmtNumber(v, 2)} GW`);

/** Formatted live value for a kind. Never throws, never divides by zero. */
export function liveText(kind: LiveKind, s: AppState): string {
  const t = s.result?.totals;
  try {
    switch (kind) {
      case 'lightsOn': return t ? `${fmtNumber(t.lightsOnPct, 1)}%` : DASH;
      case 'longestBlackout': {
        if (!t) return DASH;
        const h = t.longestBlackoutH;
        if (!(h > 0)) return 'none';
        return h >= 48 ? `${fmtNumber(h / 24, 1)} days` : `${fmtNumber(h, 0)} hours`;
      }
      case 'solarCF': return pct(t?.capacityFactor?.solar);
      case 'fissionCF': return pct(t?.capacityFactor?.fission);
      case 'costMid': {
        const c = t?.costPerMWh?.mid;
        return c != null && c > 0 && Number.isFinite(c) ? `$${fmtNumber(c, 0)} per MWh` : DASH;
      }
      case 'overbuild': {
        const o = t?.overbuildRatio;
        return o != null && o > 0 && Number.isFinite(o) ? `${fmtNumber(o, 1)}×` : DASH;
      }
      case 'wastedPct': {
        if (!t) return DASH;
        const used = (t.generatedTWh?.solar ?? 0) + (t.generatedTWh?.wind ?? 0);
        const total = used + (t.curtailedTWh ?? 0);
        return total > 0 ? pct(t.curtailedTWh / total, 0) : DASH;
      }
      case 'solarNow': return gw(at(s.result?.available?.solar, s));
      case 'fissionNow': return gw(at(s.result?.available?.fission, s));
      case 'demandNow': return gw(at(s.result?.demand, s));
      case 'supplyNow': return gw(at(s.result?.served, s));
      case 'unservedNow': {
        const u = at(s.result?.unserved, s);
        return u == null ? DASH : u > 0.001 ? `${fmtNumber(u, 2)} GW short` : 'none';
      }
      case 'batteryNow': {
        if (!s.input.battery.on) return 'off';
        const v = at(s.result?.soc, s);
        return v == null ? DASH : `${fmtNumber(v, 1)} GWh`;
      }
      case 'place': return PLACES[s.input.place]?.short ?? DASH;
      case 'clock': return formatClock(s.hourOfYear);
      case 'date': return formatDate(s.hourOfYear);
      case 'doublings': return String(s.tools.batteryDoublings);
      case 'reactorsBuilt': return String(s.tools.reactorsBuilt);
      case 'industryPrice': return `$${fmtNumber(s.tools.industryPrice, 0)} per MWh`;
    }
  } catch {
    return DASH;
  }
  return DASH;
}

export const LIVE_LABELS: Record<LiveKind, string> = {
  lightsOn: 'Lights on (year)',
  longestBlackout: 'Longest blackout',
  solarCF: 'Solar, share of maximum',
  fissionCF: 'Reactor, share of maximum',
  costMid: 'Cost per useful MWh',
  overbuild: 'Built vs peak demand',
  wastedPct: 'Wasted sun',
  solarNow: 'Solar now',
  fissionNow: 'Reactor now',
  demandNow: 'City needs now',
  supplyNow: 'Supplied now',
  unservedNow: 'Missing now',
  batteryNow: 'Battery holds',
  place: 'Place',
  clock: 'Time',
  date: 'Date',
  doublings: 'Doublings',
  reactorsBuilt: 'Reactors built',
  industryPrice: 'Power price',
};

export function LiveValue({ kind }: { kind: LiveKind }) {
  const v = usePolled((s) => liveText(kind, s), 250, kind);
  return <strong className="num lesson-live">{v}</strong>;
}

export function LiveRow({ kinds }: { kinds: LiveKind[] }) {
  if (!kinds.length) return null;
  return (
    <div className="lesson-watch" aria-live="polite">
      {kinds.map((k) => (
        <div key={k} className="lesson-watch-item">
          <span className="xsmall muted">{LIVE_LABELS[k]}</span>
          <LiveValue kind={k} />
        </div>
      ))}
    </div>
  );
}

const TOKEN = /\{(f|live):([A-Za-z0-9_]+)(?::([a-z]+))?\}/g;
const LIVE_KINDS = new Set(Object.keys(LIVE_LABELS));

function isFactKey(k: string): k is FactKey {
  return Object.prototype.hasOwnProperty.call(FACTS, k);
}

function renderToken(type: string, key: string, mod: string | undefined, i: number): ReactNode {
  if (type === 'live') {
    return LIVE_KINDS.has(key) ? <LiveValue key={i} kind={key as LiveKind} /> : null;
  }
  if (!isFactKey(key)) return <span key={i}>{DASH}</span>;
  switch (mod) {
    case 'pct': return <Fact key={i} k={key} percent />;
    case 'u': return <Fact key={i} k={key} unit />;
    case 'usd': return <Fact key={i} k={key} format={(v) => `$${fmtNumber(v)}`} />;
    case 'nm': return <span key={i} className="num">{fmtNumber(FACTS[key].value)}</span>;
    default: return <Fact key={i} k={key} />;
  }
}

/** Renders one line of lesson text, replacing {f:…} and {live:…} tokens. */
export function RichLine({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push(<Fragment key={`t${i}`}>{text.slice(last, start)}</Fragment>);
    out.push(renderToken(m[1], m[2], m[3], i));
    last = start + m[0].length;
    i++;
  }
  if (last < text.length) out.push(<Fragment key="end">{text.slice(last)}</Fragment>);
  return <>{out}</>;
}

/** Paragraphs separated by blank lines. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n\s*\n/);
  return (
    <>
      {paras.map((p, idx) => (
        <p key={idx} className={className}><RichLine text={p} /></p>
      ))}
    </>
  );
}

/** Plain-text version of a string with tokens (for aria labels and the presenter strip). */
export function plainText(text: string): string {
  return text.replace(TOKEN, (_m, type: string, key: string, mod?: string) => {
    if (type === 'live') return liveText(key as LiveKind, useApp.getState());
    if (!isFactKey(key)) return DASH;
    const v = FACTS[key].value;
    if (mod === 'pct') return `${fmtNumber(v * 100, 1)}%`;
    if (mod === 'usd') return `$${fmtNumber(v)}`;
    if (mod === 'u') return `${fmtNumber(v)} ${FACTS[key].unit}`;
    return fmtNumber(v);
  });
}

/** Dev helper: lists tokens that do not resolve (unknown fact keys or live kinds). */
export function findBadTokens(text: string): string[] {
  const bad: string[] = [];
  for (const m of text.matchAll(TOKEN)) {
    if (m[1] === 'f' && !isFactKey(m[2])) bad.push(m[0]);
    if (m[1] === 'live' && !LIVE_KINDS.has(m[2])) bad.push(m[0]);
  }
  return bad;
}
