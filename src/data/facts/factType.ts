import type { SourceKey } from '../sources';

export type FactStatus = 'cited' | 'textbook' | 'assumption' | 'verify';

export interface Fact {
  value: number;
  unit: string;
  label: string;
  status: FactStatus;
  source: SourceKey;
}

export type FactMap = Record<string, Fact>;

export function f(value: number, unit: string, label: string, status: FactStatus, source: SourceKey): Fact {
  return { value, unit, label, status, source };
}
