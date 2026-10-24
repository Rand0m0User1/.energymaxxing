// The single facts registry. Every number shown in the UI comes from here, with a source tag.
// Modules add their own facts in src/data/facts/<module>.ts; this file merges them.
import { coreFacts } from './facts/core';
import { engineFacts } from './facts/engine';
import { worldFacts } from './facts/world';
import { uiFacts } from './facts/ui';
import { dashboardFacts } from './facts/dashboard';
import { reactorFacts } from './facts/reactor';
import { insideFacts } from './facts/inside';
import { lessonsFacts } from './facts/lessons';
import { toolsFacts } from './facts/tools';
import type { Fact } from './facts/factType';

export type { Fact, FactStatus } from './facts/factType';

export const FACTS = {
  ...coreFacts,
  ...engineFacts,
  ...worldFacts,
  ...uiFacts,
  ...dashboardFacts,
  ...reactorFacts,
  ...insideFacts,
  ...lessonsFacts,
  ...toolsFacts,
};

export type FactKey = keyof typeof FACTS;

/** Numeric value of a fact. */
export function fv(key: FactKey): number {
  return (FACTS[key] as Fact).value;
}

/** The whole fact record. */
export function fact(key: FactKey): Fact {
  return FACTS[key] as Fact;
}

/** True when the UI must show a "model assumption" marker next to this number. */
export function isAssumption(key: FactKey): boolean {
  const s = (FACTS[key] as Fact).status;
  return s === 'assumption' || s === 'verify';
}
