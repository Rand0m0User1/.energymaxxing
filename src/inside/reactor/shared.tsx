// Shared bits for the reactor inside view: palette, 3D label, the core model and the k gauge.
import { Html } from '@react-three/drei';
import { SOURCE_COLORS } from '../../data/colors';

export const PAL = {
  bgLight: '#e6e9e6',
  bgDark: '#29323a',
  concrete: '#e7e4dd',
  concreteIn: '#cfcac0',
  floor: '#dcd8cf',
  ground: '#dfe3dd',
  steel: '#c9cfd4',
  steelDark: '#9aa5af',
  vessel: SOURCE_COLORS.fission,
  hotWater: '#dd8a4e',
  steamTube: '#aab2b9',
  steamDot: '#ffffff',
  cooling: '#4f8fcb',
  power: SOURCE_COLORS.fission,
  fuel: '#bdb5a7',
  pellet: '#5f5752',
  rod: '#3a3f46',
  rodDark: '#15191d',
  water: '#a8cde3',
  waterWarm: '#e9b48c',
  u235: '#5dbb7e',
  u238: '#9aa1a8',
  u236: '#a9d58b',
  pu239: '#9378d3',
  barium: '#c9806a',
  krypton: '#e2c76b',
  neutron: '#ffffff',
  oxygen: '#d49a8a',
  dot: '#f3ead8',
  highlight: '#1f5f8b',
};

export const LEVELS = [
  { n: 1, name: 'Plant' },
  { n: 2, name: 'Core' },
  { n: 3, name: 'Fuel bundle' },
  { n: 4, name: 'Pellet' },
  { n: 5, name: 'Atoms' },
] as const;

/** A small pill label in 3D space. Never fetches anything (drei Html, not Text). */
export function Label({ position, children }: { position: [number, number, number]; children: string }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="rx-label">{children}</div>
    </Html>
  );
}

/** Level 2 core model: k from control rod position, steady in a band around the middle. */
export function coreK(insertion: number): number {
  const d = 0.5 - insertion;
  const a = Math.abs(d);
  if (a < 0.04) return 1;
  return 1 + Math.sign(d) * (a - 0.04) * 0.5;
}

export interface CoreState { target: number; shown: number; power: number }

export type Zone = 'shrinking' | 'steady' | 'growing';
export function zoneOf(k: number): Zone {
  if (k < 0.97) return 'shrinking';
  if (k > 1.03) return 'growing';
  return 'steady';
}

const ZONE_COLOR: Record<Zone, string> = { shrinking: '#7fa3c0', steady: '#3ba272', growing: '#d29a5e' };

/** Half-circle gauge from 0 to 2 with a needle. Plain SVG. */
export function KGauge({ k, active = true }: { k: number; active?: boolean }) {
  const W = 240, H = 120, cx = W / 2, cy = 110, R = 92;
  const kk = Math.max(0, Math.min(2, isFinite(k) ? k : 0));
  const ang = (v: number) => Math.PI * (1 - v / 2); // 0 -> left, 2 -> right
  const pt = (v: number, r: number) => [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))] as const;
  const arc = (a: number, b: number, color: string) => {
    const [x1, y1] = pt(a, R), [x2, y2] = pt(b, R);
    return <path d={`M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`} stroke={color} strokeWidth={10} fill="none" strokeLinecap="butt" opacity={0.85} />;
  };
  const [nx, ny] = pt(kk, R - 18);
  const ticks = [0, 0.5, 1, 1.5, 2];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`New splits caused by each split: ${kk.toFixed(2)}`}>
      {arc(0, 0.97, ZONE_COLOR.shrinking)}
      {arc(0.97, 1.03, ZONE_COLOR.steady)}
      {arc(1.03, 2, ZONE_COLOR.growing)}
      {ticks.map((t) => {
        const [x1, y1] = pt(t, R - 8), [x2, y2] = pt(t, R - 14);
        const [tx, ty] = pt(t, R - 26);
        return (
          <g key={t}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-3)" strokeWidth={1.2} />
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize={10} fill="var(--ink-2)">{t}</text>
          </g>
        );
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={active ? 'var(--ink)' : 'var(--ink-3)'} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill={active ? 'var(--ink)' : 'var(--ink-3)'} />
    </svg>
  );
}

export function zoneColor(z: Zone) { return ZONE_COLOR[z]; }

/** Format a tiny energy in joules with a plain unit name. */
export function formatEnergy(j: number): string {
  if (!isFinite(j) || j <= 0) return '0 joules';
  const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: v < 10 ? 1 : 0 });
  if (j < 1e-9) return `${fmt(j * 1e12)} picojoules`;
  if (j < 1e-6) return `${fmt(j * 1e9)} nanojoules`;
  if (j < 1e-3) return `${fmt(j * 1e6)} microjoules`;
  return `${fmt(j * 1e3)} millijoules`;
}
