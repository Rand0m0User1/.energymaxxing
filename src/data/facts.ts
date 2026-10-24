// Every number the model uses lives here.
import { coreFacts } from './facts/core';
import { engineFacts } from './facts/engine';
import { worldFacts } from './facts/world';
import type { Fact } from './facts/factType';

export type { Fact } from './facts/factType';

export const FACTS = { ...coreFacts, ...engineFacts, ...worldFacts };

export type FactKey = keyof typeof FACTS;

export function fv(key: FactKey): number {
  return (FACTS[key] as Fact).value;
}
