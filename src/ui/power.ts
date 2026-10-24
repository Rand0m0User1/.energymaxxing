// Names, colours and one-line hints for each kind of power, plus the live summary used by the panel and tours.
import { useMemo } from 'react';
import { SOURCE_COLORS } from '../data/colors';
import { useApp, type AppState, type PowerId } from '../store';
import { summarize, type DaySummary } from '../sim';

export const POWER_LABEL: Record<PowerId, string> = {
  solar: 'Solar', wind: 'Wind', battery: 'Batteries', nuclear: 'Nuclear (fission)', gas: 'Gas',
};

export const POWER_HINT: Record<PowerId, string> = {
  solar: 'Only when the sun shines',
  wind: "Only when it's windy",
  battery: 'Store power for later',
  nuclear: 'Splits atoms. Always on',
  gas: 'Always on, pollutes',
};

/** One plain sentence per plant, for the plant card. */
export const POWER_SENTENCE: Record<PowerId, string> = {
  solar: 'Panels make power from sunlight, so they stop at night.',
  wind: 'Turbines make power when the wind blows, day or night.',
  battery: 'Batteries charge from spare power and release it later.',
  nuclear: 'A reactor makes steady power day and night, in any season.',
  gas: 'A gas plant runs any time, but it burns fuel and pollutes.',
};

export const POWER_COLOR: Record<PowerId, string> = {
  solar: SOURCE_COLORS.solar,
  wind: SOURCE_COLORS.wind,
  battery: SOURCE_COLORS.battery,
  nuclear: SOURCE_COLORS.fission,
  gas: SOURCE_COLORS.gas,
};

export const DARK_COLOR = '#2B2F33';

export function summaryOf(s: Pick<AppState, 'result' | 'env' | 'season' | 'hourOfYear' | 'input'>): DaySummary {
  return summarize(s.result, s.env, s.season, s.hourOfYear, s.input.battery.gwh);
}

export function useSummary(): DaySummary {
  const result = useApp((s) => s.result);
  const env = useApp((s) => s.env);
  const season = useApp((s) => s.season);
  const hourOfYear = useApp((s) => s.hourOfYear);
  const input = useApp((s) => s.input);
  return useMemo(() => summaryOf({ result, env, season, hourOfYear, input }), [result, env, season, hourOfYear, input]);
}

export function clock(t: number): string {
  const m = Math.floor(t * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
