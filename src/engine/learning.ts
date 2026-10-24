// Wright's law helpers (SPEC §12.2). Pure functions, shared by tools and engine.

/** Exponent b from a learning rate (fraction of price cut per doubling). Negative rates mean costs rise. */
export function learningExponent(learningRate: number): number {
  return -Math.log2(1 - learningRate);
}

/** Price after `doublings` doublings of cumulative production. */
export function priceAfterDoublings(price0: number, learningRate: number, doublings: number): number {
  return price0 * Math.pow(1 - learningRate, doublings);
}

/** Price of the nth unit (n >= 1) when unit 1 costs price0. */
export function priceOfNth(price0: number, learningRate: number, n: number): number {
  return price0 * Math.pow(Math.max(1, n), -learningExponent(learningRate));
}
