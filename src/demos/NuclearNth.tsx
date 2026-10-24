// How fission works, and why the cost of the nth reactor matters more than the first.
import { useState } from 'react';
import { SOURCE_COLORS } from '../data/colors';
import { Segmented, Slider } from '../ui/kit';

type Path = 'learn' | 'restart';
const FIRST = 13400;
const TARGET = 3000;
/** Cost change per doubling of reactors built. */
const PER_DOUBLING: Record<Path, number> = { learn: 0.8, restart: 1.05 };
const TILES = [1, 2, 3, 5, 8, 13, 22, 36, 60, 100];
const SCALE_MAX = 20000;

const costOf = (n: number, path: Path) => FIRST * Math.pow(PER_DOUBLING[path], Math.log2(Math.max(1, n)));
const money = (x: number) => `$${(Math.round(x / 100) * 100).toLocaleString('en-US')}`;

function FissionPicture() {
  const U = SOURCE_COLORS.fission;
  const heat = SOURCE_COLORS.solar;
  const arrow = 'url(#demo-arrow)';
  return (
    <svg className="demo-svg" viewBox="0 0 520 130" role="img" aria-label="A neutron hits a uranium-235 atom, which splits into two smaller pieces, a few neutrons and heat">
      <defs>
        <marker id="demo-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#8b939a" />
        </marker>
      </defs>
      <circle cx="30" cy="65" r="7" fill="#8b939a" />
      <text x="30" y="92" textAnchor="middle" fontSize="12">neutron</text>
      <line x1="42" y1="65" x2="128" y2="65" stroke="#8b939a" strokeWidth="1.5" markerEnd={arrow} />
      <circle cx="170" cy="65" r="34" fill={U} opacity="0.9" />
      <text x="170" y="69" textAnchor="middle" fontSize="13" style={{ fill: '#fff' }}>U-235</text>
      <line x1="210" y1="65" x2="276" y2="65" stroke="#8b939a" strokeWidth="1.5" markerEnd={arrow} />
      <circle cx="310" cy="38" r="20" fill={U} opacity="0.65" />
      <circle cx="310" cy="96" r="18" fill={U} opacity="0.65" />
      <text x="310" y="126" textAnchor="middle" fontSize="12">two smaller pieces</text>
      {[30, 65, 100].map((y, i) => (
        <g key={y}>
          <line x1="352" y1={65 + (y - 65) * 0.3} x2="400" y2={y} stroke="#8b939a" strokeWidth="1.5" markerEnd={arrow} />
          <circle cx={410} cy={y} r="6" fill="#8b939a" />
          {i === 2 && <text x="410" y="124" textAnchor="middle" fontSize="12">neutrons</text>}
        </g>
      ))}
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M${452 + k * 16} 85 q6 -8 0 -16 q-6 -8 0 -16 q6 -8 0 -16`} fill="none" stroke={heat} strokeWidth="2.5" strokeLinecap="round" />
      ))}
      <text x="468" y="104" textAnchor="middle" fontSize="12">heat</text>
    </svg>
  );
}

function Tiles({ n, path }: { n: number; path: Path }) {
  const W = 600, H = 170, base = 150, top = 10;
  const y = (c: number) => base - (Math.min(c, SCALE_MAX) / SCALE_MAX) * (base - top);
  const slot = W / TILES.length;
  return (
    <svg className="demo-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cost of reactors 1 to ${n}`}>
      {TILES.map((k, i) => {
        const built = k <= n;
        const c = costOf(k, path);
        const x = i * slot + slot * 0.2;
        const w = slot * 0.6;
        return (
          <g key={k}>
            <rect x={x} y={y(c)} width={w} height={base - y(c)} rx="6"
              fill={built ? SOURCE_COLORS.fission : 'none'} stroke={SOURCE_COLORS.fission}
              strokeDasharray={built ? undefined : '3 3'} opacity={built ? 0.9 : 0.4} />
            <text x={x + w / 2} y={H - 4} textAnchor="middle" fontSize="12" style={{ fill: built ? '#1d2227' : '#8b939a' }}>#{k}</text>
          </g>
        );
      })}
      <line x1="0" x2={W} y1={y(TARGET)} y2={y(TARGET)} stroke="#5b636b" strokeWidth="1.5" strokeDasharray="5 4" />
    </svg>
  );
}

export default function NuclearNth() {
  const [logN, setLogN] = useState(0);
  const [path, setPath] = useState<Path>('learn');
  const n = Math.max(1, Math.round(Math.pow(10, logN)));
  const latest = costOf(n, path);

  return (
    <>
      <div className="demo-section">
        <p>A fission reactor splits uranium atoms. Each split releases heat and a few neutrons that split more atoms.</p>
        <FissionPicture />
      </div>

      <div className="demo-section">
        <h3>First-of-a-kind vs nth-of-a-kind</h3>
        <div className="demo-row">
          <Segmented<Path> label="Building path" value={path} onChange={setPath}
            options={[{ value: 'learn', label: 'Learn each time' }, { value: 'restart', label: 'Start over each time' }]} />
          <span className="small muted">
            {path === 'learn' ? 'Each doubling of reactors built cuts cost by 20%.' : 'Each doubling of reactors built raises cost by 5%.'}
          </span>
        </div>
        <label className="small">Reactors built: <b className="num">{n}</b></label>
        <Slider label="Reactors built" min={0} max={2} step={0.01} value={logN} onChange={setLogN} />
        <div className="demo-row">
          <span className="demo-big num">{money(latest)} per kW</span>
          <span className="small muted">for reactor #{n}. The first costs {money(FIRST)} per kW, like the most recent large US reactors.</span>
        </div>
        <Tiles n={n} path={path} />
        <div className="demo-legend"><span className="dash" /> About $3,000 per kW: cheap enough to compete almost everywhere</div>
      </div>

      <p className="small">Fusion has not put power on a grid yet. Fission works today; the hard part is building it cheaply and often.</p>
      <p className="small">Small reactors built in factories aim to learn faster.</p>
    </>
  );
}
