// Store actions shared by the tools panels (kept out of model.ts so the maths stays pure).
import { useApp, type ReactorPath } from '../store';
import { clamp, reactorPads, reactorPricePerKW } from './model';

/** Set how many reactors are built in Reactor Row and publish the latest price to the store. */
export function setReactorsBuilt(n: number) {
  const s = useApp.getState();
  const t = s.tools;
  const nn = clamp(Math.round(n), 0, reactorPads());
  if (nn === t.reactorsBuilt) return;
  s.setTools({ reactorsBuilt: nn, reactorRowPricePerKW: nn > 0 ? reactorPricePerKW(t.reactorPath, t.customLearningRate, nn) : null });
}

/** Change the country path (or custom rate) and re-price the latest reactor. */
export function setReactorPath(path: ReactorPath, customRate?: number) {
  const s = useApp.getState();
  const t = s.tools;
  const custom = customRate ?? t.customLearningRate;
  const patch: Parameters<typeof s.setTools>[0] = { reactorPath: path, customLearningRate: custom };
  const price = t.reactorsBuilt > 0 ? reactorPricePerKW(path, custom, t.reactorsBuilt) : null;
  // Only touch the price (which re-runs the simulation) when it actually changes.
  if (price !== t.reactorRowPricePerKW) patch.reactorRowPricePerKW = price;
  s.setTools(patch);
}
