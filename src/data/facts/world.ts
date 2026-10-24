// Facts added by the world module. Owned by that module's builder.
import { f, type FactMap } from './factType';

export const worldFacts = {
  dcReferenceGW: f(1, 'GW', 'Size of the typical data center in the cost example', 'cited', 'epoch2026'),
} satisfies FactMap;
