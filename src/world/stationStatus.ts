// Live one-line status for each station (signs and floating cards). Reads store.hourOfYear.
import type { AppState } from '../store';
import type { GenId, StationId } from '../types';
import { fmtNumber } from '../ui/Fact';
import { at, safeStep } from './worldFrame';

/** Generators that live at each station. */
export const STATION_SOURCES: Partial<Record<StationId, GenId[]>> = {
  solar: ['solar'],
  reactor: ['fission'],
  fusion: ['fusion'],
  wind: ['wind'],
  gas: ['gas'],
  hydro: ['hydro', 'geothermal'],
};

/** Height of each station's floating label and card (world units). */
export const LABEL_HEIGHT: Record<StationId, number> = {
  city: 24,
  solar: 12,
  battery: 11,
  reactor: 32,
  fusion: 15,
  wind: 38,
  gas: 24,
  hydro: 18,
  batteryFactory: 18,
  industry: 22,
};

const gw = (v: number) => fmtNumber(Math.abs(v) < 0.005 ? 0 : v, Math.abs(v) >= 10 ? 0 : 1);

export function stationLine(s: Pick<AppState, 'result' | 'input' | 'hourOfYear' | 'tools'>, id: StationId): string {
  const r = s.result;
  const i = safeStep(r, s.hourOfYear);
  const gens = STATION_SOURCES[id];
  if (gens) {
    let built = 0;
    let now = 0;
    for (const g of gens) {
      const p = s.input.plants[g];
      if (p?.on) built += p.gw;
      now += at(r.supply?.[g], i);
    }
    if (built <= 0) return 'switched off';
    return `${gw(built)} GW built · making ${gw(now)} GW now`;
  }
  switch (id) {
    case 'city':
      return `using ${gw(at(r.served, i))} GW now`;
    case 'battery': {
      const b = s.input.battery;
      if (!b.on || b.gwh <= 0) return 'switched off';
      const pct = Math.max(0, Math.min(100, (at(r.soc, i) / b.gwh) * 100));
      return `${gw(b.gwh)} GWh · ${fmtNumber(pct, 0)}% full`;
    }
    case 'batteryFactory':
      return 'See battery prices fall';
    case 'industry':
      return `Power price on the dial: $${fmtNumber(s.tools.industryPrice, 0)} per MWh`;
    default:
      return '';
  }
}

/** Extra detail for the battery card: what the battery is doing right now. */
export function batteryActivity(s: Pick<AppState, 'result' | 'hourOfYear'>): string {
  const i = safeStep(s.result, s.hourOfYear);
  const out = at(s.result.batteryDischarge, i);
  const inn = at(s.result.batteryCharge, i);
  if (out > 0.005) return `Giving ${gw(out)} GW to the city now.`;
  if (inn > 0.005) return `Storing ${gw(inn)} GW of extra sun now.`;
  return 'Resting now.';
}

/** Wasted sun right now (GW), for the solar card. */
export function wastedNow(s: Pick<AppState, 'result' | 'hourOfYear'>): string {
  const i = safeStep(s.result, s.hourOfYear);
  const w = at(s.result.curtailed, i);
  return w > 0.05 ? gw(w) : '';
}
