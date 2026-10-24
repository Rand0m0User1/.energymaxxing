// Chain reaction model for level 5 (atoms). Plain TypeScript, no three.js, so it can be run headless.
// All state lives in typed arrays. The view reads these arrays every frame and writes instance matrices.
// The model is deliberately simple and only qualitatively right (see facts simU235Share, simDelayedShare).

export const HALF = 4; // half the width of the cube of atoms
const GRID = 8; // nuclei sit near the centres of an 8 x 8 x 8 grid
export const CELL = (HALF * 2) / GRID;
export const NUC_RADIUS = 0.22;
export const NEUTRON_CAP = 200;
export const TRAIL_LEN = 5;
export const FRAG_CAP = 140;
export const DOT_CAP = 90;
export const PENDING_CAP = 90;
export const WATER_MAX = 400;

/** Control rods: x, z positions (between nuclei columns). */
export const ROD_XZ: ReadonlyArray<readonly [number, number]> = [
  [-3, -3], [-1, -3], [1, -3], [3, -3],
  [-3, -1], [-1, -1], [1, -1], [3, -1],
  [-3, 1], [-1, 1], [1, 1], [3, 1],
  [-3, 3], [-1, 3], [1, 3], [3, 3],
];
export const ROD_RADIUS = 0.28;
let ROD_CAPTURE = 0.6;

export const K_U235 = 0;
export const K_U238 = 1;
export const K_PU239 = 2;

export const S_READY = 0;
export const S_WOBBLE = 1; // U-236 for a split second
export const S_PEANUT = 2;
export const S_EMPTY = 3;
export const S_REFILL = 4;

export const WOBBLE_T = 0.38;
export const PEANUT_T = 0.3;
export const REFILL_T = 0.9;
export const FRAG_LIFE = 1.5;
export const DOT_LIFE = 1.1;
export const TRANSMUTE_T = 3.5;

/** Speed levels: 0 fast, 1 medium, 2 slow. Units per second. */
export const SPEED = [5.5, 3.0, 1.6];
let CONTACT = 0.65;
let P_FISSION = [0.05, 0.35, 0.95]; // chance a neutron touching a U-235 splits it
let P_CAPTURE238 = [0.02, 0.05, 0.03]; // chance a neutron touching a U-238 is soaked up
let MODERATE_PER_UNIT = 2.8; // water bumps that slow a neutron down one level, per unit of path
let SCATTER_PER_UNIT = 4.0; // water bumps that only change direction (slow neutrons)
const WATER_ABSORB_PER_UNIT = 0.012;
const MAX_AGE = 14;
let REFILL_DELAY_MIN = 3.5;
let REFILL_DELAY_SPREAD = 3;
const GUIDED_T = 0.75; // a neutron you fire flies straight at its target for this long
const FATE_N = 140;
const FATE_WINDOW_S = 8;

/** Tuning hook for headless tests. */
export function tune(o: { contact?: number; rod?: number; pf?: number[]; pc?: number[]; mod?: number; scat?: number; refill?: number; refillSpread?: number }) {
  if (o.contact != null) CONTACT = o.contact;
  if (o.rod != null) ROD_CAPTURE = o.rod;
  if (o.pf) P_FISSION = o.pf;
  if (o.pc) P_CAPTURE238 = o.pc;
  if (o.mod != null) MODERATE_PER_UNIT = o.mod;
  if (o.scat != null) SCATTER_PER_UNIT = o.scat;
  if (o.refill != null) REFILL_DELAY_MIN = o.refill;
  if (o.refillSpread != null) REFILL_DELAY_SPREAD = o.refillSpread;
}

export interface SimParams {
  rods: number; // 0 = out, 1 = fully in
  water: boolean;
  delayed: boolean;
  plutonium: boolean;
  u235Share: number;
  nu: number; // average neutrons per split
  delayedShare: number;
}

export interface SimStats {
  splits: number;
  neutrons: number;
  pending: number;
  kRaw: number;
  kSmooth: number;
  hasData: boolean;
  lastCapTime: number;
  time: number;
  growingFor: number; // seconds k has been clearly above 1
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ChainSim {
  params: SimParams;
  rand: () => number;
  stats: SimStats;

  // Nuclei
  nCount = 0;
  nx = new Float32Array(GRID * GRID * GRID);
  ny = new Float32Array(GRID * GRID * GRID);
  nz = new Float32Array(GRID * GRID * GRID);
  kind = new Uint8Array(GRID * GRID * GRID);
  state = new Uint8Array(GRID * GRID * GRID);
  timer = new Float32Array(GRID * GRID * GRID);
  refillDelay = new Float32Array(GRID * GRID * GRID);
  refillKind = new Uint8Array(GRID * GRID * GRID);
  transmute = new Float32Array(GRID * GRID * GRID); // 0 = none, (0,1) turning into Pu-239
  axis = new Float32Array(GRID * GRID * GRID * 3);
  hitFlash = new Float32Array(GRID * GRID * GRID); // brief pulse when a U-238 soaks up a neutron
  cellNuc = new Int32Array(GRID * GRID * GRID);

  // Neutrons
  alive = new Uint8Array(NEUTRON_CAP);
  px = new Float32Array(NEUTRON_CAP);
  py = new Float32Array(NEUTRON_CAP);
  pz = new Float32Array(NEUTRON_CAP);
  dx = new Float32Array(NEUTRON_CAP);
  dy = new Float32Array(NEUTRON_CAP);
  dz = new Float32Array(NEUTRON_CAP);
  level = new Uint8Array(NEUTRON_CAP);
  fromFission = new Uint8Array(NEUTRON_CAP);
  guided = new Uint8Array(NEUTRON_CAP);
  lastHit = new Int32Array(NEUTRON_CAP);
  age = new Float32Array(NEUTRON_CAP);
  trail = new Float32Array(NEUTRON_CAP * TRAIL_LEN * 3);
  trailHead = new Uint8Array(NEUTRON_CAP);
  trailClock = new Float32Array(NEUTRON_CAP);

  // Delayed neutrons waiting to come out
  pendCount = 0;
  pendX = new Float32Array(PENDING_CAP);
  pendY = new Float32Array(PENDING_CAP);
  pendZ = new Float32Array(PENDING_CAP);
  pendT = new Float32Array(PENDING_CAP);

  // Fission fragments
  fAlive = new Uint8Array(FRAG_CAP);
  fx = new Float32Array(FRAG_CAP);
  fy = new Float32Array(FRAG_CAP);
  fz = new Float32Array(FRAG_CAP);
  fvx = new Float32Array(FRAG_CAP);
  fvy = new Float32Array(FRAG_CAP);
  fvz = new Float32Array(FRAG_CAP);
  fAge = new Float32Array(FRAG_CAP);
  fKind = new Uint8Array(FRAG_CAP); // 0 barium (bigger), 1 krypton (smaller)
  fCursor = 0;

  // Small dots where neutrons were soaked up
  dAlive = new Uint8Array(DOT_CAP);
  dX = new Float32Array(DOT_CAP);
  dY = new Float32Array(DOT_CAP);
  dZ = new Float32Array(DOT_CAP);
  dAge = new Float32Array(DOT_CAP);
  dCursor = 0;

  // Water molecules (visual; moderation itself is statistical)
  wCount = 0;
  wx = new Float32Array(WATER_MAX);
  wy = new Float32Array(WATER_MAX);
  wz = new Float32Array(WATER_MAX);
  wSpin = new Float32Array(WATER_MAX);
  wPhase = new Float32Array(WATER_MAX);
  heat = new Float32Array(WATER_MAX);
  anyHeat = false;

  // k measurement: fates of neutrons born from splits (1 = caused a split, 0 = lost)
  fateVal = new Uint8Array(FATE_N);
  fateTime = new Float32Array(FATE_N);
  fateHead = 0;
  fateFilled = 0;

  rodBottom = HALF;
  /** Where neutrons ended up (for tuning and the help text). */
  losses = { leak: 0, rod: 0, water: 0, u238: 0, age: 0, split: 0 };
  private seed: number;

  constructor(params: SimParams, seed = 7, waterCount = 360) {
    this.params = { ...params };
    this.seed = seed;
    this.rand = mulberry32(seed);
    this.stats = { splits: 0, neutrons: 0, pending: 0, kRaw: 0, kSmooth: 0, hasData: false, lastCapTime: -99, time: 0, growingFor: 0 };
    this.reset(seed, waterCount);
  }

  reset(seed = this.seed + 1, waterCount = this.wCount || 360) {
    this.seed = seed;
    this.rand = mulberry32(seed);
    const r = this.rand;
    // Pick 300 of the 512 grid cells for nuclei, spread evenly.
    const total = GRID * GRID * GRID;
    const order = new Int32Array(total);
    for (let i = 0; i < total; i++) order[i] = i;
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    const want = 300;
    this.cellNuc.fill(-1);
    this.nCount = want;
    const nU235 = Math.round(want * this.params.u235Share);
    for (let n = 0; n < want; n++) {
      const c = order[n];
      const ix = c % GRID, iy = Math.floor(c / GRID) % GRID, iz = Math.floor(c / (GRID * GRID));
      const j = 0.05;
      this.nx[n] = -HALF + CELL * (ix + 0.5) + (r() * 2 - 1) * j;
      this.ny[n] = -HALF + CELL * (iy + 0.5) + (r() * 2 - 1) * j;
      this.nz[n] = -HALF + CELL * (iz + 0.5) + (r() * 2 - 1) * j;
      this.kind[n] = n < nU235 ? K_U235 : K_U238;
      this.state[n] = S_READY;
      this.timer[n] = 0;
      this.transmute[n] = 0;
      this.hitFlash[n] = 0;
      this.cellNuc[c] = n;
    }
    // Water: random spots not too close to a nucleus or a rod.
    this.wCount = 0;
    let guard = 0;
    while (this.wCount < Math.min(WATER_MAX, waterCount) && guard++ < 20000) {
      const x = (r() * 2 - 1) * (HALF - 0.15), y = (r() * 2 - 1) * (HALF - 0.15), z = (r() * 2 - 1) * (HALF - 0.15);
      const nn = this.nucleusNear(x, y, z, 0.4, -1);
      if (nn >= 0) continue;
      let nearRod = false;
      for (const [rx, rz] of ROD_XZ) if ((x - rx) ** 2 + (z - rz) ** 2 < 0.42 * 0.42) nearRod = true;
      if (nearRod) continue;
      const i = this.wCount++;
      this.wx[i] = x; this.wy[i] = y; this.wz[i] = z;
      this.wSpin[i] = (r() * 2 - 1) * 0.8;
      this.wPhase[i] = r() * Math.PI * 2;
      this.heat[i] = 0;
    }
    this.anyHeat = false;
    this.alive.fill(0);
    this.pendCount = 0;
    this.fAlive.fill(0);
    this.dAlive.fill(0);
    this.fateHead = 0;
    this.fateFilled = 0;
    const s = this.stats;
    this.losses = { leak: 0, rod: 0, water: 0, u238: 0, age: 0, split: 0 };
    s.splits = 0; s.neutrons = 0; s.pending = 0; s.kRaw = 0; s.kSmooth = 0; s.hasData = false; s.lastCapTime = -99; s.time = 0; s.growingFor = 0;
  }

  /** Index of a ready-or-busy nucleus within `rad` of a point, or -1. */
  private nucleusNear(x: number, y: number, z: number, rad: number, skip: number): number {
    const cx = Math.floor((x + HALF) / CELL), cy = Math.floor((y + HALF) / CELL), cz = Math.floor((z + HALF) / CELL);
    const r2 = rad * rad;
    for (let ox = -1; ox <= 1; ox++) {
      const ix = cx + ox; if (ix < 0 || ix >= GRID) continue;
      for (let oy = -1; oy <= 1; oy++) {
        const iy = cy + oy; if (iy < 0 || iy >= GRID) continue;
        for (let oz = -1; oz <= 1; oz++) {
          const iz = cz + oz; if (iz < 0 || iz >= GRID) continue;
          const n = this.cellNuc[ix + iy * GRID + iz * GRID * GRID];
          if (n < 0 || n === skip) continue;
          const ddx = this.nx[n] - x, ddy = this.ny[n] - y, ddz = this.nz[n] - z;
          if (ddx * ddx + ddy * ddy + ddz * ddz < r2) return n;
        }
      }
    }
    return -1;
  }

  private randDir(out: Float32Array, i: number) {
    const z = this.rand() * 2 - 1;
    const p = this.rand() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);
    out[i] = s * Math.cos(p);
    out[i + 1] = s * Math.sin(p);
    out[i + 2] = z;
  }

  private tmp = new Float32Array(3);

  /** Start a neutron. Returns false when the drawing cap is reached. */
  spawn(x: number, y: number, z: number, dx: number, dy: number, dz: number, fromFission: boolean, lastHit = -1, level = 0, guided = false): boolean {
    let i = -1;
    for (let k = 0; k < NEUTRON_CAP; k++) if (!this.alive[k]) { i = k; break; }
    if (i < 0) { this.stats.lastCapTime = this.stats.time; return false; }
    const len = Math.hypot(dx, dy, dz) || 1;
    this.alive[i] = 1;
    this.px[i] = x; this.py[i] = y; this.pz[i] = z;
    this.dx[i] = dx / len; this.dy[i] = dy / len; this.dz[i] = dz / len;
    this.level[i] = level;
    this.fromFission[i] = fromFission ? 1 : 0;
    this.guided[i] = guided ? 1 : 0;
    this.lastHit[i] = lastHit;
    this.age[i] = 0;
    this.trailHead[i] = 0;
    this.trailClock[i] = 0;
    const b = i * TRAIL_LEN * 3;
    for (let t = 0; t < TRAIL_LEN; t++) { this.trail[b + t * 3] = x; this.trail[b + t * 3 + 1] = y; this.trail[b + t * 3 + 2] = z; }
    return true;
  }

  /** Ready atoms that can split, near the middle. */
  private fissileTargets(inner: number): number[] {
    const out: number[] = [];
    for (let n = 0; n < this.nCount; n++) {
      if (this.state[n] !== S_READY || (this.kind[n] !== K_U235 && this.kind[n] !== K_PU239)) continue;
      if (Math.abs(this.nx[n]) > inner || Math.abs(this.ny[n]) > inner || Math.abs(this.nz[n]) > inner) continue;
      out.push(n);
    }
    return out;
  }

  /** A slow neutron that flies straight at atom n from about one atom spacing away. */
  private fireAt(n: number, dx: number, dy: number, dz: number) {
    const len = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / len, uy = dy / len, uz = dz / len;
    const back = 1.0;
    const clamp = (v: number) => Math.max(-HALF + 0.02, Math.min(HALF - 0.02, v));
    this.spawn(clamp(this.nx[n] - ux * back), clamp(this.ny[n] - uy * back), clamp(this.nz[n] - uz * back), ux, uy, uz, false, -1, 2, true);
  }

  /** Fire a slow neutron at a random atom that can split (falls back to a random face). */
  fireRandom() {
    const t = this.fissileTargets(HALF - 1.2);
    if (t.length) {
      const n = t[Math.floor(this.rand() * t.length)];
      this.randDir(this.tmp, 0);
      this.fireAt(n, this.tmp[0], this.tmp[1], this.tmp[2]);
      return;
    }
    this.fireFromFace();
  }

  /** Fire a neutron in from a random face toward the middle of the cube. */
  fireFromFace() {
    const r = this.rand;
    const face = Math.floor(r() * 6);
    const a = (r() * 2 - 1) * (HALF - 1), b = (r() * 2 - 1) * (HALF - 1);
    const e = HALF - 0.02;
    let x = 0, y = 0, z = 0;
    switch (face) {
      case 0: x = e; y = a; z = b; break;
      case 1: x = -e; y = a; z = b; break;
      case 2: y = e; x = a; z = b; break;
      case 3: y = -e; x = a; z = b; break;
      case 4: z = e; x = a; y = b; break;
      default: z = -e; x = a; y = b; break;
    }
    const tx = (r() * 2 - 1) * 1.5, ty = (r() * 2 - 1) * 1.5, tz = (r() * 2 - 1) * 1.5;
    this.spawn(x, y, z, tx - x, ty - y, tz - z, false);
  }

  /** Fire along a ray (from the camera). Enters the cube where the ray meets it. */
  fireRay(ox: number, oy: number, oz: number, rdx: number, rdy: number, rdz: number) {
    let best = -1, bestD = 1.2 * 1.2;
    for (let n = 0; n < this.nCount; n++) {
      if (this.state[n] !== S_READY || (this.kind[n] !== K_U235 && this.kind[n] !== K_PU239)) continue;
      const wx = this.nx[n] - ox, wy = this.ny[n] - oy, wz = this.nz[n] - oz;
      const t = wx * rdx + wy * rdy + wz * rdz;
      if (t <= 0) continue;
      const px = wx - rdx * t, py = wy - rdy * t, pz = wz - rdz * t;
      const d2 = px * px + py * py + pz * pz;
      // prefer atoms nearer the camera when several are close to the ray
      const score = d2 + t * 0.004;
      if (score < bestD) { bestD = score; best = n; }
    }
    if (best >= 0) { this.fireAt(best, rdx, rdy, rdz); return; }
    let tmin = -Infinity, tmax = Infinity;
    const o = [ox, oy, oz], d = [rdx, rdy, rdz];
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) { if (o[a] < -HALF || o[a] > HALF) { tmin = Infinity; break; } continue; }
      let t1 = (-HALF - o[a]) / d[a], t2 = (HALF - o[a]) / d[a];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    }
    if (tmin === Infinity || tmin > tmax || tmax < 0) { this.fireRandom(); return; }
    const t = Math.max(0, tmin) + 0.03;
    this.spawn(ox + rdx * t, oy + rdy * t, oz + rdz * t, rdx, rdy, rdz, false);
  }

  private addDot(x: number, y: number, z: number) {
    const i = this.dCursor; this.dCursor = (this.dCursor + 1) % DOT_CAP;
    this.dAlive[i] = 1; this.dX[i] = x; this.dY[i] = y; this.dZ[i] = z; this.dAge[i] = 0;
  }

  private recordFate(i: number, split: boolean) {
    if (!this.fromFission[i]) return;
    this.fateVal[this.fateHead] = split ? 1 : 0;
    this.fateTime[this.fateHead] = this.stats.time;
    this.fateHead = (this.fateHead + 1) % FATE_N;
    if (this.fateFilled < FATE_N) this.fateFilled++;
  }

  private kill(i: number, split: boolean, dot: boolean) {
    if (dot) this.addDot(this.px[i], this.py[i], this.pz[i]);
    this.recordFate(i, split);
    this.alive[i] = 0;
  }

  private split(n: number) {
    const x = this.nx[n], y = this.ny[n], z = this.nz[n];
    const ax = this.axis[n * 3], ay = this.axis[n * 3 + 1], az = this.axis[n * 3 + 2];
    // Two fragments of different size fly apart along the stretch axis. The lighter one is faster.
    for (let s = 0; s < 2; s++) {
      const i = this.fCursor; this.fCursor = (this.fCursor + 1) % FRAG_CAP;
      const sign = s === 0 ? 1 : -1;
      const sp = s === 0 ? 2.1 : 2.9;
      this.fAlive[i] = 1; this.fKind[i] = s; this.fAge[i] = 0;
      this.fx[i] = x + sign * ax * 0.12; this.fy[i] = y + sign * ay * 0.12; this.fz[i] = z + sign * az * 0.12;
      this.fvx[i] = sign * ax * sp; this.fvy[i] = sign * ay * sp; this.fvz[i] = sign * az * sp;
    }
    // 2 or 3 new fast neutrons; average = nu.
    const extra = Math.max(0, Math.min(1, this.params.nu - 2));
    const count = this.rand() < extra ? 3 : 2;
    for (let k = 0; k < count; k++) {
      if (this.params.delayed && this.rand() < this.params.delayedShare && this.pendCount < PENDING_CAP) {
        const p = this.pendCount++;
        this.pendX[p] = x; this.pendY[p] = y; this.pendZ[p] = z;
        this.pendT[p] = 1.5 + this.rand() * 2.5;
        continue;
      }
      this.randDir(this.tmp, 0);
      this.spawn(x + this.tmp[0] * 0.3, y + this.tmp[1] * 0.3, z + this.tmp[2] * 0.3, this.tmp[0], this.tmp[1], this.tmp[2], true, n);
    }
    // Warm the nearby water.
    for (let w = 0; w < this.wCount; w++) {
      const d2 = (this.wx[w] - x) ** 2 + (this.wy[w] - y) ** 2 + (this.wz[w] - z) ** 2;
      if (d2 < 3.4) { this.heat[w] = Math.min(1, this.heat[w] + 0.9 * (1 - Math.sqrt(d2) / 1.85)); this.anyHeat = true; }
    }
    this.stats.splits++;
    this.state[n] = S_EMPTY;
    this.timer[n] = 0;
    this.refillKind[n] = this.kind[n] === K_PU239 ? K_U238 : K_U235;
    this.refillDelay[n] = REFILL_DELAY_MIN + this.rand() * REFILL_DELAY_SPREAD;
  }

  step(dtIn: number) {
    const dt = Math.min(Math.max(dtIn, 0), 0.05);
    if (!(dt > 0)) return;
    const sub = dt > 1 / 45 ? 2 : 1;
    for (let s = 0; s < sub; s++) this.stepOnce(dt / sub);
  }

  private stepOnce(dt: number) {
    const st = this.stats;
    const P = this.params;
    st.time += dt;
    const r = this.rand;
    this.rodBottom = HALF - Math.max(0, Math.min(1, P.rods)) * HALF * 2;
    const rodsActive = P.rods > 0.001;
    const rc2 = ROD_CAPTURE * ROD_CAPTURE;
    const contact2 = CONTACT * CONTACT;

    // Delayed neutrons
    for (let p = 0; p < this.pendCount; p++) {
      this.pendT[p] -= dt;
      if (this.pendT[p] <= 0) {
        this.randDir(this.tmp, 0);
        this.spawn(this.pendX[p], this.pendY[p], this.pendZ[p], this.tmp[0], this.tmp[1], this.tmp[2], true);
        const last = --this.pendCount;
        this.pendX[p] = this.pendX[last]; this.pendY[p] = this.pendY[last]; this.pendZ[p] = this.pendZ[last]; this.pendT[p] = this.pendT[last];
        p--;
      }
    }

    // Neutrons
    let aliveCount = 0;
    for (let i = 0; i < NEUTRON_CAP; i++) {
      if (!this.alive[i]) continue;
      this.age[i] += dt;
      const lv = this.level[i];
      const dist = SPEED[lv] * dt;
      if (this.guided[i] && this.age[i] > GUIDED_T) this.guided[i] = 0;
      if (P.water && !this.guided[i]) {
        if (lv < 2) {
          if (r() < MODERATE_PER_UNIT * dist) {
            this.level[i] = lv + 1;
            this.randDir(this.tmp, 0);
            this.dx[i] = this.tmp[0]; this.dy[i] = this.tmp[1]; this.dz[i] = this.tmp[2];
            this.lastHit[i] = -1;
          }
        } else {
          if (r() < SCATTER_PER_UNIT * dist) {
            this.randDir(this.tmp, 0);
            this.dx[i] = this.tmp[0]; this.dy[i] = this.tmp[1]; this.dz[i] = this.tmp[2];
            this.lastHit[i] = -1;
          }
          if (r() < WATER_ABSORB_PER_UNIT * dist) { this.losses.water++; this.kill(i, false, true); continue; }
        }
      }
      const x = (this.px[i] += this.dx[i] * dist);
      const y = (this.py[i] += this.dy[i] * dist);
      const z = (this.pz[i] += this.dz[i] * dist);

      // Trail sample
      this.trailClock[i] += dt;
      if (this.trailClock[i] > 0.035) {
        this.trailClock[i] = 0;
        const h = (this.trailHead[i] + 1) % TRAIL_LEN;
        this.trailHead[i] = h;
        const b = (i * TRAIL_LEN + h) * 3;
        this.trail[b] = x; this.trail[b + 1] = y; this.trail[b + 2] = z;
      }

      // Left the cube: lost.
      if (x < -HALF || x > HALF || y < -HALF || y > HALF || z < -HALF || z > HALF) { this.losses.leak++; this.kill(i, false, false); continue; }
      if (this.age[i] > MAX_AGE) { this.losses.age++; this.kill(i, false, true); continue; }

      // Control rods soak up neutrons.
      if (rodsActive && y > this.rodBottom) {
        let hitRod = false;
        for (let k = 0; k < ROD_XZ.length; k++) {
          const ddx = x - ROD_XZ[k][0], ddz = z - ROD_XZ[k][1];
          if (ddx * ddx + ddz * ddz < rc2) { hitRod = true; break; }
        }
        if (hitRod) { this.losses.rod++; this.kill(i, false, true); continue; }
      }

      // Nuclei
      const n = this.nucleusNear(x, y, z, CONTACT, this.lastHit[i]);
      if (n >= 0 && this.state[n] === S_READY) {
        const ddx = this.nx[n] - x, ddy = this.ny[n] - y, ddz = this.nz[n] - z;
        if (ddx * ddx + ddy * ddy + ddz * ddz < contact2) {
          this.lastHit[i] = n;
          const k = this.kind[n];
          const fissile = k === K_U235 || k === K_PU239;
          if (fissile) {
            if (r() < P_FISSION[this.level[i]]) {
              this.state[n] = S_WOBBLE;
              this.timer[n] = 0;
              this.axis[n * 3] = this.dx[i]; this.axis[n * 3 + 1] = this.dy[i]; this.axis[n * 3 + 2] = this.dz[i];
              this.losses.split++;
              this.kill(i, true, false);
              continue;
            }
          } else if (r() < P_CAPTURE238[this.level[i]]) {
            this.hitFlash[n] = 1;
            if (P.plutonium && this.transmute[n] === 0) this.transmute[n] = 0.0001;
            this.losses.u238++;
            this.kill(i, false, true);
            continue;
          } else {
            // Bounce off the heavy nucleus.
            const len = Math.hypot(ddx, ddy, ddz) || 1;
            this.randDir(this.tmp, 0);
            let ndx = -ddx / len + this.tmp[0] * 0.8, ndy = -ddy / len + this.tmp[1] * 0.8, ndz = -ddz / len + this.tmp[2] * 0.8;
            const l2 = Math.hypot(ndx, ndy, ndz) || 1;
            ndx /= l2; ndy /= l2; ndz /= l2;
            this.dx[i] = ndx; this.dy[i] = ndy; this.dz[i] = ndz;
          }
        }
      }
      aliveCount++;
    }

    // Nuclei states
    let busy = false;
    for (let n = 0; n < this.nCount; n++) {
      const sN = this.state[n];
      if (this.hitFlash[n] > 0) this.hitFlash[n] = Math.max(0, this.hitFlash[n] - dt * 2.5);
      if (this.transmute[n] > 0) {
        if (this.kind[n] !== K_U238 || this.state[n] !== S_READY) this.transmute[n] = 0;
        else {
          this.transmute[n] += dt / TRANSMUTE_T;
          if (this.transmute[n] >= 1) { this.transmute[n] = 0; this.kind[n] = K_PU239; }
        }
      }
      if (sN === S_READY) continue;
      this.timer[n] += dt;
      if (sN === S_WOBBLE) { busy = true; if (this.timer[n] > WOBBLE_T) { this.state[n] = S_PEANUT; this.timer[n] = 0; } }
      else if (sN === S_PEANUT) { busy = true; if (this.timer[n] > PEANUT_T) this.split(n); }
      else if (sN === S_EMPTY) {
        if (this.timer[n] > this.refillDelay[n]) { this.state[n] = S_REFILL; this.timer[n] = 0; this.kind[n] = this.refillKind[n]; }
      } else if (sN === S_REFILL) {
        if (this.timer[n] > REFILL_T) { this.state[n] = S_READY; this.timer[n] = 0; }
      }
    }

    // Fragments and dots
    const damp = Math.exp(-dt * 1.6);
    for (let i = 0; i < FRAG_CAP; i++) {
      if (!this.fAlive[i]) continue;
      this.fAge[i] += dt;
      if (this.fAge[i] > FRAG_LIFE) { this.fAlive[i] = 0; continue; }
      this.fvx[i] *= damp; this.fvy[i] *= damp; this.fvz[i] *= damp;
      this.fx[i] += this.fvx[i] * dt; this.fy[i] += this.fvy[i] * dt; this.fz[i] += this.fvz[i] * dt;
    }
    for (let i = 0; i < DOT_CAP; i++) {
      if (!this.dAlive[i]) continue;
      this.dAge[i] += dt;
      if (this.dAge[i] > DOT_LIFE) this.dAlive[i] = 0;
    }
    if (this.anyHeat) {
      const decay = Math.exp(-dt / 1.3);
      let any = false;
      for (let w = 0; w < this.wCount; w++) {
        if (this.heat[w] > 0.002) { this.heat[w] *= decay; any = true; } else this.heat[w] = 0;
      }
      this.anyHeat = any;
    }

    // k = average new neutrons per split x share of split-born neutrons that go on to cause a split.
    let tot = 0, hits = 0;
    const cutoff = st.time - FATE_WINDOW_S;
    for (let k = 0; k < this.fateFilled; k++) {
      if (this.fateTime[k] < cutoff) continue;
      tot++; hits += this.fateVal[k];
    }
    st.neutrons = aliveCount;
    st.pending = this.pendCount;
    const active = aliveCount > 0 || this.pendCount > 0 || busy;
    if (tot >= 4) {
      st.kRaw = (P.nu * hits) / tot;
      st.hasData = true;
      st.kSmooth += (st.kRaw - st.kSmooth) * (1 - Math.exp(-dt / 0.8));
    } else if (!active) {
      st.hasData = tot > 0;
      st.kSmooth += (0 - st.kSmooth) * (1 - Math.exp(-dt / 1.5));
    }
    if (st.kSmooth > 1.08 && active) st.growingFor += dt; else st.growingFor = Math.max(0, st.growingFor - dt * 2);
  }
}
