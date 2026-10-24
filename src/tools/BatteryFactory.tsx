// Battery Factory (SPEC §12): double total production and watch pack and installed-system prices fall.
import type { ReactNode } from 'react';
import { useApp } from '../store';
import { fv } from '../data/facts';
import { SOURCE_COLORS } from '../data/colors';
import { Button, RealTerm, Segmented } from '../ui/kit';
import { Fact } from '../ui/Fact';
import { batteryMaxDoublings, batteryPrices, CHEMISTRY_START, pct, type Chemistry } from './model';
import { Section } from './parts';

const CHEM_OPTIONS: { value: Chemistry; label: string }[] = [
  { value: 'lfp', label: 'LFP' },
  { value: 'nmc', label: 'NMC' },
  { value: 'sodium', label: 'Sodium-ion' },
];

const CHEM_TEXT: Record<Chemistry, { plain: string; real: string }> = {
  lfp: { plain: 'Made with iron and phosphate. Cheap and safe. Most new grid batteries use it.', real: 'lithium iron phosphate (LFP)' },
  nmc: { plain: 'Made with nickel, manganese and cobalt. Holds more energy per kilogram, so many cars use it. Costs more.', real: 'lithium nickel manganese cobalt oxide (NMC)' },
  sodium: { plain: 'Uses sodium, from salt, instead of lithium. Newer and less proven, with fewer worries about materials.', real: 'sodium-ion' },
};

const perKWh = (v: number) => `$${v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US')}`;

function PriceChart({ chem, d }: { chem: Chemistry; d: number }) {
  const maxD = batteryMaxDoublings();
  const W = 520, H = 220, L = 46, R = 100, T = 14, B = 30;
  const iw = W - L - R, ih = H - T - B;
  const pts = Array.from({ length: maxD + 1 }, (_, i) => batteryPrices(chem, i));
  const pnnl21 = fv('batterySystemPNNL2021');
  const pnnl30 = fv('batterySystemPNNL2030');
  const yMax = Math.max(pts[0].system, pnnl21) * 1.25;
  const yMin = Math.max(0.5, Math.min(...pts.map((p) => p.pack)) * 0.7);
  const lmin = Math.log(yMin), lmax = Math.log(Math.max(yMin * 1.01, yMax));
  const x = (i: number) => L + (i / maxD) * iw;
  const y = (v: number) => T + (1 - (Math.log(Math.max(yMin, v)) - lmin) / (lmax - lmin)) * ih;
  const ticks = [2, 5, 10, 20, 50, 100, 200, 500, 1000].filter((v) => v >= yMin && v <= yMax);
  const line = (vals: number[], from: number, to: number) => vals.slice(from, to + 1).map((v, i) => `${x(from + i)},${y(v)}`).join(' ');
  const packs = pts.map((p) => p.pack);
  const systems = pts.map((p) => p.system);
  const cPack = SOURCE_COLORS.battery;
  const cSys = 'var(--ink-2)';
  let yPackLbl = y(packs[maxD]) + 4;
  let ySysLbl = y(systems[maxD]) + 4;
  if (Math.abs(yPackLbl - ySysLbl) < 12) { if (yPackLbl > ySysLbl) yPackLbl = ySysLbl + 12; else ySysLbl = yPackLbl + 12; }
  return (
    <svg className="tool-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Battery price per kWh against doublings of total production (log scale)">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={L + iw} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="var(--ink-3)">${v}</text>
        </g>
      ))}
      {pts.map((_, i) => (
        <text key={i} x={x(i)} y={H - 12} fontSize="10" textAnchor="middle" fill="var(--ink-3)">{i}</text>
      ))}
      <text x={L + iw / 2} y={H} fontSize="10" textAnchor="middle" fill="var(--ink-2)">Times total production has doubled</text>
      {/* PNNL reference marks (installed 100 MW, 4-hour systems) */}
      {[{ v: pnnl21, t: 'PNNL, 2021 data' }, { v: pnnl30, t: 'PNNL, 2030 estimate' }].map((m) => (
        <g key={m.t}>
          <path d={`M ${L + 6} ${y(m.v) - 4} l 4 4 l -4 4 l -4 -4 z`} fill="none" stroke={cSys} strokeWidth={1.2} />
          <text x={L + 14} y={y(m.v) + 4} fontSize="10" fill="var(--ink-2)">{m.t}: ${Math.round(m.v)}</text>
        </g>
      ))}
      {/* projection (faint) and the part already reached (solid) */}
      <polyline fill="none" stroke={cSys} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} points={line(systems, 0, maxD)} />
      <polyline fill="none" stroke={cPack} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} points={line(packs, 0, maxD)} />
      {d > 0 && <polyline fill="none" stroke={cSys} strokeWidth={2} points={line(systems, 0, d)} />}
      {d > 0 && <polyline fill="none" stroke={cPack} strokeWidth={2} points={line(packs, 0, d)} />}
      <circle cx={x(d)} cy={y(systems[d])} r={4} fill={cSys} />
      <circle cx={x(d)} cy={y(packs[d])} r={4} fill={cPack} />
      <text x={L + iw + 6} y={ySysLbl} fontSize="10" fill="var(--ink-2)" fontWeight={600}>Installed system</text>
      <text x={L + iw + 6} y={yPackLbl} fontSize="10" fill={cPack} fontWeight={600}>Battery pack</text>
    </svg>
  );
}

const BOTTLENECKS: { title: string; body: ReactNode; real: string }[] = [
  {
    title: 'Waiting to connect',
    body: <>New projects wait in line for a grid connection. In the US the wait is often about <Fact k="bfQueueYears" unit />.</>,
    real: 'interconnection queue',
  },
  {
    title: 'Where the materials come from',
    body: <>Lithium, graphite and cathode materials are processed in only a few countries. About <Fact k="bfGraphiteTopShare" percent digits={0} /> of battery graphite is processed in China.</>,
    real: 'supply chain concentration',
  },
  {
    title: 'Permits and local approval',
    body: 'Each site needs zoning, environmental review and the agreement of its neighbours. That can take longer than building.',
    real: 'permitting and siting',
  },
  {
    title: 'Fire codes and safety',
    body: 'A damaged cell can overheat and spread fire to its neighbours. Sites need spacing, monitoring and fire plans, and rules differ from town to town.',
    real: 'thermal runaway',
  },
  {
    title: 'Transformers and switchgear',
    body: <>The heavy electrical gear that links a battery to the grid is in short supply. Waits of about <Fact k="bfTransformerWaitYears" unit /> are common.</>,
    real: 'grid equipment lead times',
  },
];

export default function BatteryFactory() {
  const d = useApp((s) => s.tools.batteryDoublings);
  const chem = useApp((s) => s.tools.batteryChemistry);
  const setTools = useApp((s) => s.setTools);
  const maxD = batteryMaxDoublings();
  const dd = Math.max(0, Math.min(maxD, Math.round(d)));
  const start = batteryPrices(chem, 0);
  const now = batteryPrices(chem, dd);
  const packFall = start.pack > 0 ? 1 - now.pack / start.pack : 0;
  const sysFall = start.system > 0 ? 1 - now.system / start.system : 0;
  const tagSize = 22 + 22 * Math.max(0, Math.min(1, start.pack > 0 ? now.pack / start.pack : 1));
  const production = Math.pow(2, dd);

  return (
    <>
      <Section>
        <div className="tool-lead">
          Each time the world doubles the total number of batteries it has ever made, the price falls by about the same share. Factories learn.
        </div>
        <RealTerm>learning rate (Wright&rsquo;s law)</RealTerm>
      </Section>

      <Section title="Pick a battery type">
        <Segmented value={chem} options={CHEM_OPTIONS} label="Battery chemistry" onChange={(c) => setTools({ batteryChemistry: c })} />
        <div className="tool-p">
          {CHEM_TEXT[chem].plain} Pack price today: <Fact k={CHEMISTRY_START[chem]} format={(v) => `$${v}`} /> per kWh (how much).
        </div>
        <RealTerm>{CHEM_TEXT[chem].real}</RealTerm>
      </Section>

      <Section title="Double total production">
        <div className="tool-row" style={{ alignItems: 'flex-end', gap: 16 }}>
          <div className="bf-tag" aria-live="polite">
            <span className="xsmall muted">Battery pack</span>
            <span className="amount" style={{ fontSize: tagSize }}>{perKWh(now.pack)}</span>
            <span className="xsmall muted">per kWh</span>
          </div>
          <div className="bf-tag">
            <span className="xsmall muted">Installed system</span>
            <span className="amount" style={{ fontSize: 22 }}>{perKWh(now.system)}</span>
            <span className="xsmall muted">per kWh</span>
          </div>
          <div className="small muted num" style={{ flex: 1, minWidth: 140 }}>
            {dd === 0 ? 'Today.' : `Total production is ${production.toLocaleString('en-US')} times today's.`}
            {dd > 0 && <><br />Pack: {pct(packFall)} cheaper. System: {pct(sysFall)} cheaper.</>}
          </div>
        </div>
        <div className="tool-row">
          <Button primary onClick={() => setTools({ batteryDoublings: Math.min(maxD, dd + 1) })} disabled={dd >= maxD}>Double total production</Button>
          <Button onClick={() => setTools({ batteryDoublings: 0 })} disabled={dd === 0}>Reset</Button>
          <span className="small muted num" style={{ marginLeft: 'auto' }}>Doubled {dd} of {maxD} times</span>
        </div>
        <PriceChart chem={chem} d={dd} />
        <div className="tool-caption">
          Log scale: each step down the side is a fixed share cheaper. Packs fall <Fact k="batteryLearningRate" percent digits={0} /> per doubling.
          Today the pack is about <Fact k="bfPackShareOfSystem" format={() => 'a third'} /> of an installed system. The rest (wiring, land, labor, permits, inverters)
          falls only about <Fact k="bfNonPackLearningRate" percent digits={0} /> per doubling.
          The diamonds are installed prices for a 100 MW, 4-hour system from PNNL: <Fact k="batterySystemPNNL2021" format={(v) => `$${v}`} /> (2021 data)
          and <Fact k="batterySystemPNNL2030" format={(v) => `$${v}`} /> (2030 estimate).
        </div>
      </Section>

      <div className="tool-aha">
        Battery cells keep getting cheaper fast. The whole installed system does not, and the hold-ups are connections, materials and permits.
      </div>

      <Section title="What slows grid batteries down">
        <div className="tool-grid2">
          {BOTTLENECKS.map((b) => (
            <div key={b.title} className="tool-card">
              <h4>{b.title}</h4>
              <div className="tool-p">{b.body}</div>
              <RealTerm>{b.real}</RealTerm>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Compared with solar">
        <div className="tool-p">
          Solar panels have learned even faster. Over their whole history they got <Fact k="solarLearningRateOverall" percent digits={0} /> cheaper per doubling,
          and <Fact k="solarLearningRateSince2007" percent digits={0} /> per doubling in recent years, weighted by how much was made.
          Pack prices fell <Fact k="batteryPackFall2025" percent digits={0} /> in a single recent year.
        </div>
      </Section>
    </>
  );
}
