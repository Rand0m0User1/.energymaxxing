// Headless checks of the level 5 chain reaction model: it can hold steady, grow, shrink and fade.
import { describe, expect, it } from 'vitest';
import { ChainSim, NEUTRON_CAP, STEADY_RODS, type SimParams } from '../chainSim';

const BASE: SimParams = { rods: STEADY_RODS, water: true, delayed: false, plutonium: false, u235Share: 0.55, nu: 2.4, delayedShare: 0.15 };
const DT = 1 / 60;
const SEEDS = [11, 12, 13, 14, 15];

interface RunResult { kAvg: number; died: boolean; minN: number; maxN: number; hitCap: boolean }

/** Start a reaction with a burst of 6 neutrons and step it; k is averaged from `from` to `until` seconds. */
function run(seed: number, patch: Partial<SimParams>, from = 10, until = 40, waterOffAt = -1): RunResult {
  const sim = new ChainSim({ ...BASE, ...patch }, seed, 340);
  sim.fireBurst(6);
  let kSum = 0, kN = 0, minN = Infinity, maxN = 0, died = false;
  for (let s = 0; s < Math.round(until / DT); s++) {
    if (waterOffAt >= 0 && sim.stats.time >= waterOffAt) sim.params.water = false;
    sim.step(DT);
    const st = sim.stats;
    if (st.time > from) {
      if (st.hasData) { kSum += st.kRaw; kN++; }
      minN = Math.min(minN, st.neutrons + st.pending);
      maxN = Math.max(maxN, st.neutrons);
    }
    if (st.time > 1.5 && st.neutrons === 0 && st.pending === 0) { died = true; break; }
  }
  return { kAvg: kN ? kSum / kN : 0, died, minN, maxN, hitCap: sim.stats.lastCapTime > 0 };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('ChainSim', () => {
  it('holds k near 1 for 30 seconds at the steady rod setting', () => {
    const runs = SEEDS.map((s) => run(s, {}));
    for (const r of runs) {
      expect(r.died).toBe(false);
      expect(r.minN).toBeGreaterThan(0);
      expect(r.maxN).toBeLessThan(NEUTRON_CAP);
    }
    const k = mean(runs.map((r) => r.kAvg));
    expect(k).toBeGreaterThan(0.85);
    expect(k).toBeLessThan(1.2);
  });

  it('grows to the neutron cap with the rods fully out', () => {
    const runs = SEEDS.map((s) => run(s, { rods: 0 }, 5, 40));
    expect(runs.filter((r) => r.died).length).toBe(0);
    expect(runs.filter((r) => r.hitCap).length).toBeGreaterThanOrEqual(3);
    expect(mean(runs.map((r) => r.kAvg))).toBeGreaterThan(1.15);
  });

  it('dies out with the rods fully in', () => {
    const runs = SEEDS.map((s) => run(s, { rods: 1 }, 5, 30));
    expect(runs.every((r) => r.died)).toBe(true);
  });

  it('fades out when the water is removed', () => {
    const runs = SEEDS.map((s) => run(s, {}, 10, 40, 15));
    expect(runs.every((r) => r.died)).toBe(true);
  });
});
