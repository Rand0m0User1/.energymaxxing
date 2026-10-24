// How the price of power changes what industry does. Rough round numbers, simplified on purpose.
import { useState, type ReactNode } from 'react';
import { SOURCE_COLORS } from '../data/colors';
import { Slider } from '../ui/kit';

const HI = 100;
const LO = 5;
/** Slider 0..1 to $ per MWh, log scale: left is $100, right is $5. */
const priceAt = (v: number) => HI * Math.pow(LO / HI, v);
const sliderFor = (p: number) => Math.log(p / HI) / Math.log(LO / HI);

const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;

interface Use {
  name: string;
  tag: string;
  process: ReactNode;
  energy: string;
  /** Energy cost and other costs, in the same units, at price p ($ per MWh). */
  costs: (p: number) => { energy: number; other: number };
  extra?: (p: number) => string;
  note?: string;
  decide: (p: number) => string;
}

function Box({ x, y, w, label, fill }: { x: number; y: number; w: number; label: string; fill?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={22} rx="5" fill={fill ?? '#fff'} stroke="#8b939a" />
      <text x={x + w / 2} y={y + 15} textAnchor="middle" fontSize="10.5">{label}</text>
    </g>
  );
}

function AmmoniaFlow() {
  const a = 'url(#demo-arrow-i)';
  const line = { stroke: '#8b939a', strokeWidth: 1.3, markerEnd: a };
  return (
    <svg className="demo-svg" viewBox="0 0 400 86" role="img" aria-label="Electricity runs an electrolyser that makes hydrogen. Nitrogen comes from air. Haber-Bosch joins them into ammonia.">
      <defs>
        <marker id="demo-arrow-i" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="#8b939a" />
        </marker>
      </defs>
      <Box x={0} y={4} w={64} label="Electricity" fill={SOURCE_COLORS.solar + '33'} />
      <Box x={80} y={4} w={72} label="Electrolyser" />
      <Box x={168} y={4} w={58} label="Hydrogen" />
      <Box x={0} y={60} w={64} label="Air" />
      <Box x={168} y={60} w={58} label="Nitrogen" />
      <Box x={242} y={32} w={78} label="Haber-Bosch" />
      <Box x={336} y={32} w={62} label="Ammonia" fill={SOURCE_COLORS.wind + '33'} />
      <line x1={64} y1={15} x2={79} y2={15} {...line} />
      <line x1={152} y1={15} x2={167} y2={15} {...line} />
      <line x1={64} y1={71} x2={167} y2={71} {...line} />
      <line x1={226} y1={18} x2={250} y2={32} {...line} />
      <line x1={226} y1={68} x2={250} y2={54} {...line} />
      <line x1={320} y1={43} x2={335} y2={43} {...line} />
    </svg>
  );
}

const USES: Use[] = [
  {
    name: 'Ammonia plant',
    tag: 'Flexible, energy-heavy',
    process: <AmmoniaFlow />,
    energy: 'About 10 MWh of electricity per tonne of ammonia',
    costs: (p) => ({ energy: 10 * p, other: 250 }),
    extra: (p) => `Cost per tonne: ${usd(10 * p + 250)}. Gas-made ammonia: about $400.`,
    decide: (p) => (p > 40 ? 'Gas-made ammonia is cheaper. Electric plants stay small.'
      : p >= 15 ? 'Close to gas. Plants run only in the cheapest hours.'
        : 'Cheaper than gas-made ammonia. Build big and run on cheap sunny hours, storing ammonia.'),
  },
  {
    name: 'Aluminium smelter',
    tag: 'Continuous, energy-heavy',
    process: 'Electricity → electrolysis pots → aluminium',
    energy: 'About 14 MWh per tonne',
    costs: (p) => ({ energy: 14 * p, other: 1300 }),
    extra: (p) => `Cost per tonne: ${usd(14 * p + 1300)}. Sells for about $2,400.`,
    note: 'The pots must run nonstop. A long outage freezes the metal.',
    decide: (p) => (p > 50 ? 'Power is a third of the cost. Smelters go where power is cheapest.'
      : p >= 20 ? 'Profitable where cheap power runs day and night.'
        : 'Very profitable, but only with round-the-clock power: solar, batteries and firm power together.'),
  },
  {
    name: 'Data center (1 GW)',
    tag: 'Flexible computing',
    process: 'Electricity → servers → computing',
    energy: 'About 8.8 TWh a year',
    costs: (p) => ({ energy: 8.8e6 * p, other: 1.7e9 }),
    extra: (p) => `Power bill: about $${Math.round(8.8 * p)} million a year. Servers and building: about $1.7 billion.`,
    note: 'Training and batch jobs can wait for cheap hours. Live services cannot.',
    decide: (p) => (p > 50 ? 'Power matters, but getting connected fast matters more.'
      : 'Cheap power is a bonus. Flexible jobs shift to sunny hours.'),
  },
  {
    name: 'Semiconductor fab',
    tag: 'Inflexible, low energy share',
    process: 'Electricity → clean rooms and tools → chips',
    energy: 'About 1 TWh a year',
    // Energy is about 4% of cost at $60 per MWh: $60 million of about $1.5 billion.
    costs: (p) => ({ energy: 1e6 * p, other: 1.44e9 }),
    note: 'A brief power dip can ruin wafers.',
    decide: () => 'Energy is a small cost. Reliable power matters far more than cheap power.',
  },
];

function Card({ u, p }: { u: Use; p: number }) {
  const c = u.costs(p);
  const share = c.energy / (c.energy + c.other);
  return (
    <div className="demo-card">
      <div className="demo-card-head"><b>{u.name}</b><span className="demo-tag">{u.tag}</span></div>
      {typeof u.process === 'string' ? <div className="xsmall muted">{u.process}</div> : u.process}
      <div className="xsmall">{u.energy}</div>
      <div>
        <div className="xsmall muted">Energy share of cost: <b className="num">{Math.round(share * 100)}%</b></div>
        <div className="demo-bar"><span style={{ width: `${share * 100}%`, background: SOURCE_COLORS.solar }} /></div>
      </div>
      {u.extra && <div className="xsmall muted">{u.extra(p)}</div>}
      {u.note && <div className="xsmall muted">{u.note}</div>}
      <div className="demo-decision"><b>At this price:</b> {u.decide(p)}</div>
    </div>
  );
}

export default function Industry() {
  const [v, setV] = useState(sliderFor(40));
  const p = Math.round(priceAt(v));
  return (
    <>
      <div className="demo-section">
        <label className="small">Power price: <b className="num">${p} per MWh</b></label>
        <Slider label="Power price" min={0} max={1} step={0.005} value={v} onChange={setV} />
        <div className="demo-scale"><span>$100</span><span>$5</span></div>
      </div>
      <div className="demo-cards">
        {USES.map((u) => <Card key={u.name} u={u} p={p} />)}
      </div>
      <p className="demo-close-line">Cheap power helps most where energy is a big cost and the work can follow the sun.</p>
    </>
  );
}
