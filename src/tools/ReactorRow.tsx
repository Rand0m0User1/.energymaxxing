// Reactor Row (SPEC §10): build the same reactor again and again and watch the price move.
import { useEffect, useMemo } from 'react';
import { useApp, type ReactorPath } from '../store';
import { fv } from '../data/facts';
import { SOURCE_COLORS } from '../data/colors';
import { Button, RealTerm, Segmented, Slider } from '../ui/kit';
import { Fact, Cite } from '../ui/Fact';
import {
  copiesToReach, money, moneyShort, reactorCostPerMWh, reactorLearningRate, reactorPads, reactorPricePerKW, signedPct,
} from './model';
import { setReactorPath, setReactorsBuilt } from './actions';
import { KV, LabeledSwitch, Section } from './parts';
import CapitalStack from './CapitalStack';

const PATH_OPTIONS: { value: ReactorPath; label: string }[] = [
  { value: 'us', label: 'US history' },
  { value: 'france', label: 'France' },
  { value: 'korea', label: 'South Korea' },
  { value: 'custom', label: 'Your choice' },
];

const PATH_SHORT: Record<ReactorPath, string> = { us: 'US', france: 'France', korea: 'S. Korea', custom: 'Your choice' };

const dollars = (v: number) => `$${v.toLocaleString('en-US')}`;

function PathNote({ path }: { path: ReactorPath }) {
  const custom = useApp((s) => s.tools.customLearningRate);
  if (path === 'us') {
    return (
      <p className="tool-p">
        In the US, each new reactor cost more than the last: about <Fact k="rrLearnUS" format={(v) => signedPct(-v)} /> per doubling in our model.
        Over half of the rise came from &ldquo;soft&rdquo; costs outside the reactor itself, such as labor supervision <Cite k="rrSoftCostShare" />.
        <RealTerm>cost escalation</RealTerm>
      </p>
    );
  }
  if (path === 'france') {
    return (
      <p className="tool-p">
        France built many reactors of a few designs. Even so, real costs rose over time: about <Fact k="rrLearnFrance" format={(v) => signedPct(-v)} /> per doubling in our model.
        <RealTerm>negative learning by doing</RealTerm>
      </p>
    );
  }
  if (path === 'korea') {
    return (
      <p className="tool-p">
        South Korea built the same design again and again with the same teams, and costs fell: about <Fact k="rrLearnKorea" format={(v) => signedPct(-v)} /> per doubling in our model.
        <RealTerm>learning rate</RealTerm>
      </p>
    );
  }
  return (
    <div className="tool-section" style={{ gap: 4 }}>
      <div className="tool-row between small">
        <span>Price change each time the number built doubles</span>
        <b className="num">{signedPct(-custom)}</b>
      </div>
      <Slider value={custom} min={fv('rrCustomMin')} max={fv('rrCustomMax')} step={0.01} label="Learning rate per doubling"
        onChange={(v) => setReactorPath('custom', v)} />
      <div className="tool-row between xsmall faint">
        <span>Costs rise <Fact k="rrCustomMin" format={(v) => signedPct(-v)} /></span>
        <span>Costs fall <Fact k="rrCustomMax" format={(v) => signedPct(-v)} /></span>
      </div>
      <RealTerm>learning rate (Wright&rsquo;s law)</RealTerm>
    </div>
  );
}

function ReactorChart({ path, custom, built }: { path: ReactorPath; custom: number; built: number }) {
  const pads = reactorPads();
  const W = 520, H = 210, L = 46, R = 74, T = 12, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const paths: ReactorPath[] = path === 'custom' ? ['us', 'france', 'korea', 'custom'] : ['us', 'france', 'korea'];
  const series = paths.map((p) => ({ p, prices: Array.from({ length: pads }, (_, i) => reactorPricePerKW(p, custom, i + 1)) }));
  const target = fv('fissionTargetPerKW');
  const maxY = Math.max(target, fv('vogtlePerKW'), ...series.flatMap((s) => s.prices)) * 1.08 || 1;
  const x = (n: number) => L + (pads > 1 ? (n - 1) / (pads - 1) : 0) * iw;
  const y = (v: number) => T + (1 - Math.max(0, v) / maxY) * ih;
  const step = maxY > 30000 ? 10000 : 5000;
  const ticks: number[] = [];
  for (let v = 0; v <= maxY; v += step) ticks.push(v);

  // Direct labels at the right end, nudged apart so they do not overlap.
  const labels = series.map((s) => ({ p: s.p, y: y(s.prices[pads - 1]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 12) labels[i].y = labels[i - 1].y + 12;

  const sel = series.find((s) => s.p === path)!;
  const color = SOURCE_COLORS.fission;
  return (
    <svg className="tool-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Price per kW for each reactor built">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={L + iw} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="var(--ink-3)">{v === 0 ? '$0' : moneyShort(v)}</text>
        </g>
      ))}
      {Array.from({ length: pads }, (_, i) => (
        <text key={i} x={x(i + 1)} y={H - 10} fontSize="10" textAnchor="middle" fill="var(--ink-3)">{i + 1}</text>
      ))}
      <text x={L + iw / 2} y={H} fontSize="10" textAnchor="middle" fill="var(--ink-2)">Reactor number</text>
      <line x1={L} x2={L + iw} y1={y(target)} y2={y(target)} stroke="var(--ink-2)" strokeDasharray="2 4" strokeWidth={1.2} />
      <text x={L + iw + 6} y={y(target) + 4} fontSize="10" fill="var(--ink-2)">{moneyShort(target)} target</text>
      {series.filter((s) => s.p !== path).map((s) => (
        <polyline key={s.p} fill="none" stroke="var(--ink-3)" strokeWidth={1} points={s.prices.map((v, i) => `${x(i + 1)},${y(v)}`).join(' ')} />
      ))}
      <polyline fill="none" stroke={color} strokeWidth={2} points={sel.prices.map((v, i) => `${x(i + 1)},${y(v)}`).join(' ')} />
      {sel.prices.map((v, i) => (i < built ? <circle key={i} cx={x(i + 1)} cy={y(v)} r={3.5} fill={color} /> : null))}
      {built < pads && <circle cx={x(built + 1)} cy={y(sel.prices[built])} r={4} fill="var(--panel-solid)" stroke={color} strokeWidth={1.5} />}
      {labels.map((l) => (
        <text key={l.p} x={L + iw + 6} y={l.y + 4} fontSize="10" fill={l.p === path ? color : 'var(--ink-3)'} fontWeight={l.p === path ? 600 : 400}>{PATH_SHORT[l.p]}</text>
      ))}
    </svg>
  );
}

function ReactorTiles({ prices, built }: { prices: number[]; built: number }) {
  const tint = `${SOURCE_COLORS.fission}`;
  return (
    <div className="rr-tiles" style={{ gridTemplateColumns: `repeat(${prices.length}, 1fr)` }}>
      {prices.map((p, i) => {
        const isBuilt = i < built;
        return (
          <div key={i} className={`rr-tile ${isBuilt ? 'built' : ''} ${i === built ? 'next' : ''}`}>
            <div className="rr-pad" style={isBuilt ? { background: `${tint}1a` } : undefined}>
              {isBuilt && (
                <svg viewBox="0 0 24 24" width="78%" aria-hidden>
                  <rect x="4" y="13" width="16" height="9" rx="1" fill={tint} opacity={0.55} />
                  <path d="M5 13a7 7 0 0 1 14 0z" fill={tint} opacity={0.85} />
                </svg>
              )}
            </div>
            <span>{isBuilt || i === built ? moneyShort(p) : ' '}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReactorRow() {
  const rawBuilt = useApp((s) => s.tools.reactorsBuilt);
  const path = useApp((s) => s.tools.reactorPath);
  const custom = useApp((s) => s.tools.customLearningRate);
  const usePrice = useApp((s) => s.tools.useReactorRowPrice);
  const rowPrice = useApp((s) => s.tools.reactorRowPricePerKW);
  const waccPct = useApp((s) => s.input.costs.waccPct);
  const setTools = useApp((s) => s.setTools);

  const pads = reactorPads();
  const built = Math.max(0, Math.min(pads, Math.round(rawBuilt || 0)));
  const prices = useMemo(() => Array.from({ length: pads }, (_, i) => reactorPricePerKW(path, custom, i + 1)), [pads, path, custom]);
  const rate = reactorLearningRate(path, custom);
  const target = fv('fissionTargetPerKW');
  const copies = copiesToReach(target, fv('vogtlePerKW'), rate);

  // Keep the published price in step if something else (a lesson, the demo script) changed the row.
  useEffect(() => {
    const want = built > 0 ? reactorPricePerKW(path, custom, built) : null;
    if (want !== rowPrice) setTools({ reactorRowPricePerKW: want });
  }, [built, path, custom, pads, rowPrice, setTools]);

  const rows: { label: string; n: number }[] = [{ label: 'Reactor 1 (first-of-a-kind)', n: 1 }];
  if (built > 1 && built < pads) rows.push({ label: `Reactor ${built} (latest built)`, n: built });
  rows.push({ label: `Reactor ${pads}${built >= pads ? ' (latest built)' : ''}`, n: pads });

  return (
    <>
      <Section>
        <p className="tool-lead">
          First-of-a-kind means the first one ever built. It is slow and expensive because everything is new.
          Nth-of-a-kind means the tenth or hundredth copy. If builders get better each time, the price falls.
        </p>
        <p className="tool-p">
          Our paper&rsquo;s view: fission is much closer to this than fusion. Fission physics is proven; the hard parts are building and permits.
          Fusion has not yet put power on a grid.
        </p>
        <RealTerm>first-of-a-kind (FOAK) and nth-of-a-kind (NOAK)</RealTerm>
      </Section>

      <Section title="Build the next reactor">
        <Segmented value={path} options={PATH_OPTIONS} label="Country path" onChange={(p) => setReactorPath(p)} />
        <PathNote path={path} />
        <ReactorChart path={path} custom={custom} built={built} />
        <div className="tool-caption">
          Reactor 1 starts at <Fact k="vogtlePerKW" format={dollars} /> per kW, the Vogtle price.
          The dotted line is <Fact k="fissionTargetPerKW" format={dollars} /> per kW. At about this price, fission competes almost everywhere in our model.
        </div>
        <ReactorTiles prices={prices} built={built} />
        <div className="tool-row">
          <Button primary onClick={() => setReactorsBuilt(built + 1)} disabled={built >= pads}>Build the next reactor</Button>
          <Button onClick={() => setReactorsBuilt(0)} disabled={built === 0}>Reset row</Button>
          <span className="small muted num" style={{ marginLeft: 'auto' }}>
            {built === 0 ? 'No reactors built yet' : `Built ${built} of ${pads}. Latest: ${dollars(Math.round(prices[built - 1]))} per kW`}
          </span>
        </div>
        <p className="tool-p">
          {copies == null
            ? `On this path the price never reaches ${dollars(target)} per kW. Each copy costs the same or more.`
            : `On this path it takes about ${copies.toLocaleString('en-US')} copies to reach ${dollars(target)} per kW from the Vogtle price.`}
          {copies != null && copies > pads && ' Learning helps, but a cheaper first reactor matters just as much.'}
        </p>
        <LabeledSwitch checked={usePrice} onChange={(v) => setTools({ useReactorRowPrice: v })} label="Use this price in the City Lab">
          Use this price in the City Lab
          <div className="xsmall faint num">
            {usePrice
              ? rowPrice != null ? `The City Lab reactor now costs ${dollars(Math.round(rowPrice))} per kW.` : 'Build a reactor first. Until then the City Lab keeps its own price.'
              : 'Off. The City Lab uses its own reactor price.'}
          </div>
        </LabeledSwitch>
      </Section>

      <Section title="What that means for the price of power">
        <p className="tool-p">
          A cheaper reactor makes cheaper power. Here is the cost of each megawatt-hour over the reactor&rsquo;s life.
        </p>
        <table className="tool-table">
          <thead>
            <tr><th>Reactor</th><th className="r">Build cost per kW</th><th className="r">Power cost per MWh</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="r">{dollars(Math.round(prices[r.n - 1]))}</td>
                <td className="r">{money(reactorCostPerMWh(prices[r.n - 1], waccPct))}</td>
              </tr>
            ))}
            <tr>
              <td className="muted">At the <Fact k="fissionTargetPerKW" format={dollars} /> target</td>
              <td className="r muted">{dollars(target)}</td>
              <td className="r muted">{money(reactorCostPerMWh(target, waccPct))}</td>
            </tr>
          </tbody>
        </table>
        <div className="tool-caption">
          Uses the City Lab cost of borrowing ({waccPct.toLocaleString('en-US', { maximumFractionDigits: 1 })}% a year), a <Fact k="rrLifeYears" unit /> life,
          running <Fact k="nuclearCFUS" percent digits={0} /> of the time, plus <Fact k="fissionOM" format={(v) => `$${v}`} /> for upkeep
          and <Fact k="fissionFuel" format={(v) => `$${v}`} /> for fuel per MWh.
          For comparison, Lazard puts new US nuclear at <Fact k="lcoeNuclearLow" format={(v) => `$${v}`} /> to <Fact k="lcoeNuclearHigh" format={(v) => `$${v}`} /> per MWh.
        </div>
        <RealTerm>levelized cost of electricity, using a capital recovery factor</RealTerm>
      </Section>

      <CapitalStack />

      <Section title="Will utilities adopt it?">
        <div className="tool-card">
          <p className="tool-p" style={{ color: 'var(--ink)' }}>
            Utilities are paid to keep the lights on, not to take risks. Most wait until a design has been built several times before they buy one.
          </p>
          <p className="tool-p">
            Data-center buyers move faster. For a 1 GW data center, power costs about <Fact k="dcPowerCostPerYearB" format={(v) => `$${v} billion`} /> a year,
            but the servers cost about <Fact k="dcServerCostB" format={(v) => `$${v} billion`} />. Getting connected soon matters more to them than the price of power.
          </p>
          <p className="tool-p">So tech companies are likely to buy the first reactors, and utilities follow once the price is proven.</p>
          <RealTerm>regulated utility (paid a set return on approved spending)</RealTerm>
        </div>
      </Section>

      <Section title="And fusion?">
        <p className="tool-p">
          Fusion has not yet put power on a grid. Our paper&rsquo;s estimate for the first tokamak power plants is <Fact k="lcoeFusionLow" format={(v) => `$${v}`} /> to <Fact k="lcoeFusionHigh" format={(v) => `$${v}`} /> per MWh.
          Fission&rsquo;s problem is building cheaply. Fusion still has to show it works as a power plant first.
        </p>
        <KV k="Google has agreed to buy power from the first CFS fusion plant">
          <Fact k="googleCfsMW" unit />
        </KV>
        <KV k="Microsoft has agreed to buy power from Helion starting">
          <Fact k="helionMicrosoftYear" format={(v) => String(v)} />
        </KV>
      </Section>

      <p className="tool-aha">
        Reactors are expensive because they are built one at a time. Build the same one many times and the price falls. Who pays for the first ones decides who wins.
      </p>
    </>
  );
}
