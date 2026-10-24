// Side panel content for each level, the two collapsible sidebars and the bottom strip.
import type { ReactNode } from 'react';
import { Button, Icon, RealTerm, Slider, Switch } from '../../ui/kit';
import { AssumptionTag, Cite, Fact } from '../../ui/Fact';
import { fv } from '../../data/facts';
import { PAL } from './shared';

const yearFmt = (v: number) => String(Math.round(v));
const pct = (v: number) => `${Math.round(v * 100)}%`;

function Toggle({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  return (
    <>
      <div className="rx-row">
        <span>{label}</span>
        <Switch checked={checked} onChange={onChange} label={label} />
      </div>
      {children}
    </>
  );
}

export function Collapsible({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="rx-details" open={defaultOpen}>
      <summary><Icon name="chevron" size={14} />{title}</summary>
      {children}
    </details>
  );
}

export function PlantPanel() {
  return (
    <>
      <p className="rx-lead">A reactor is a very hot kettle. Splitting atoms makes heat, heat makes steam, steam spins a turbine.</p>
      <div className="rx-legend">
        <span><i className="rx-swatch" style={{ background: PAL.hotWater }} />Hot water loop. It carries heat from the reactor to the steam generator.</span>
        <span><i className="rx-swatch" style={{ background: PAL.steamTube }} />Steam loop. Steam spins the turbine, then turns back into water.</span>
        <span><i className="rx-swatch" style={{ background: PAL.cooling }} />Cooling loop. It carries away the heat that is left over.</span>
        <span><i className="rx-swatch" style={{ background: PAL.power }} />Electricity going to the city.</span>
      </div>
      <p className="rx-p">The water around the reactor is about <Fact k="pwrWaterTempC" unit />. It is kept under high pressure so it does not boil.</p>
      <RealTerm>pressurized water reactor</RealTerm>
      <p className="rx-p muted" style={{ marginTop: 8 }}>The three loops never mix. The water that touches the fuel stays inside the dome.</p>
    </>
  );
}

export function CorePanel({ rods, setRods }: { rods: number; setRods: (v: number) => void }) {
  return (
    <>
      <p className="rx-lead">The core sits in a steel pot full of water. A large core holds about <Fact k="assembliesPerCore" /> tall fuel bundles.</p>
      <p className="rx-p">The darker rods soak up neutrons. Push them in and the reaction shrinks. Pull them out and it grows.</p>
      <div className="rx-row"><span>Control rods in / out</span><span className="num muted">{Math.round(rods * 100)}% in</span></div>
      <Slider value={rods} min={0} max={1} step={0.01} onChange={setRods} label="Control rods in or out" />
      <div className="rx-ends"><span>out</span><span>in</span></div>
      <RealTerm>control rods</RealTerm>
      <p className="rx-p muted" style={{ marginTop: 8 }}>Watch the gauge. Near the middle the reaction is steady. Real operators keep it there.</p>
    </>
  );
}

export function AssemblyPanel({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <>
      <p className="rx-lead">Each bundle is a grid of thin metal tubes. Each tube is filled with a stack of ceramic fuel pellets.</p>
      <p className="rx-p">One bundle holds <Fact k="rodsPerAssembly" /> fuel rods. Each rod holds about <Fact k="pelletsPerRod" /> pellets.</p>
      <p className="rx-p">Each pellet is about the size of a fingertip, about <Fact k="pelletSizeCm" unit /> across.</p>
      <p className="rx-p">One pellet holds about as much energy as <Fact k="pelletCoalTonnes" unit />.</p>
      <div className="rx-btns">
        <Button onClick={() => setOpen(!open)} active={open}>{open ? 'Close the rod' : 'Open the rod'}</Button>
      </div>
      <RealTerm>fuel assembly; the metal tube is the cladding</RealTerm>
    </>
  );
}

export function PelletPanel({ haleu, setHaleu, share, setShare, greenCount, total }: {
  haleu: boolean; setHaleu: (v: boolean) => void; share: number; setShare: (v: number) => void; greenCount: number; total: number;
}) {
  const lo = haleu ? fv('haleuLow') : fv('u235NormalLow');
  const hi = haleu ? fv('haleuHigh') : fv('u235NormalHigh');
  return (
    <>
      <p className="rx-lead">Inside a pellet, uranium and oxygen atoms sit in a neat repeating pattern.</p>
      <p className="rx-p">Most uranium atoms (grey) are uranium-238. They rarely split. A few (green) are uranium-235. Those split easily.</p>
      <p className="rx-p">Normal reactor fuel is about <Fact k="u235NormalLow" format={pct} /> to <Fact k="u235NormalHigh" format={pct} /> uranium-235.</p>
      <Toggle label="HALEU fuel" checked={haleu} onChange={setHaleu}>
        <RealTerm>high-assay low-enriched uranium (HALEU)</RealTerm>
      </Toggle>
      {haleu && (
        <p className="rx-p" style={{ marginTop: 8 }}>
          HALEU has <Fact k="haleuLow" format={pct} /> to <Fact k="haleuHigh" format={pct} /> uranium-235.
          Newer small reactors need fuel with more U-235. Few places make it today. That is why the paper highlights General Matter and American Centrifuge Operating,
          awarded <Fact k="haleuAward" format={(v) => `$${v} million`} /> to build US supply.
        </p>
      )}
      <div className="rx-row"><span>Share of uranium-235</span><span className="num muted">{(share * 100).toFixed(1)}%</span></div>
      <Slider value={Math.min(hi, Math.max(lo, share))} min={lo} max={hi} step={0.005} onChange={setShare} label="Share of uranium-235" />
      <p className="rx-p muted num" style={{ marginTop: 6 }}>Green atoms in this view: {greenCount} of {total}.</p>
      <div className="rx-legend">
        <span><i className="dot" style={{ background: PAL.u235 }} />Uranium-235</span>
        <span><i className="dot" style={{ background: PAL.u238 }} />Uranium-238</span>
        <span><i className="dot" style={{ background: PAL.oxygen }} />Oxygen</span>
      </div>
      <RealTerm>uranium dioxide crystal; raising the U-235 share is called enrichment</RealTerm>
    </>
  );
}

export interface AtomsControls {
  rods: number; water: boolean; delayed: boolean; plutonium: boolean;
}

export function AtomsPanel({ c, set, onFire, onSteady, onReset }: {
  c: AtomsControls; set: (patch: Partial<AtomsControls>) => void; onFire: () => void; onSteady: () => void; onReset: () => void;
}) {
  return (
    <>
      <p className="rx-lead">A neutron hits a uranium-235 atom. The atom splits, gives off heat and throws out a few new neutrons. Those can split more atoms.</p>
      <p className="rx-p muted">On average a split throws out <Fact k="neutronsPerFission" /> new neutrons.</p>
      <div className="rx-btns">
        <Button primary onClick={onFire} ariaLabel="Fire a neutron (N)">Fire a neutron</Button>
        <Button onClick={onReset} ariaLabel="Reset atoms"><Icon name="reset" size={14} />Reset atoms</Button>
      </div>
      <div className="rx-btns">
        <Button onClick={onSteady} ariaLabel="Start a steady reaction">Start a steady reaction</Button>
      </div>
      <p className="rx-p muted small">Sets the rods about a third of the way in and fires a few neutrons. The gauge should settle near 1.</p>
      <p className="rx-p muted small">Or click the atoms, or press <span className="rx-key">N</span>.</p>

      <div className="rx-sec">
        <div className="rx-row"><span>Control rods</span><span className="num muted">{Math.round(c.rods * 100)}% in</span></div>
        <Slider value={c.rods} min={0} max={1} step={0.01} onChange={(v) => set({ rods: v })} label="Control rods in or out" />
        <div className="rx-ends"><span>out</span><span>in</span></div>
        <p className="rx-p muted small" style={{ marginTop: 4 }}>The dark rods soak up neutrons. A small dot shows where one was caught.</p>
      </div>

      <div className="rx-sec">
        <Toggle label="Remove water" checked={!c.water} onChange={(v) => set({ water: !v })} />
        <p className="rx-p small">Water slows the neutrons down so they are more likely to split the next atom.</p>
        <RealTerm>moderator</RealTerm>
      </div>

      <Collapsible title="More detail">
        <Toggle label="Delayed neutrons" checked={c.delayed} onChange={(v) => set({ delayed: v })} />
        <p className="rx-p small">
          A small share of neutrons, under 1%, come out seconds later. That delay is what gives operators and control systems time to react.
        </p>
        <p className="rx-p muted small">
          Real share: <Fact k="delayedNeutronShare" percent digits={2} />. This model uses <Fact k="simDelayedShare" percent digits={0} /> so you can see it.
          Waiting neutrons show as small grey dots.
        </p>
        <Toggle label="Uranium-238 turns into plutonium" checked={c.plutonium} onChange={(v) => set({ plutonium: v })} />
        <p className="rx-p small">
          When a uranium-238 atom soaks up a neutron, it slowly turns into plutonium-239 (purple). Plutonium-239 can split too.
          In real fuel this takes a few days. Here it takes a few seconds.
        </p>
      </Collapsible>

      <Collapsible title="How this model is simplified">
        <p className="rx-p small">
          This box has far more uranium-235 than real fuel, <Fact k="simU235Share" percent digits={0} /> instead of about <Fact k="u235NormalLow" format={pct} /> to{' '}
          <Fact k="u235NormalHigh" format={pct} />, so a chain reaction fits in a small space.
        </p>
        <p className="rx-p small">
          Used atoms are slowly swapped for fresh ones so the demo can keep going. Neutrons that leave the box are lost.
          At most <Fact k="simNeutronCap" /> neutrons are drawn at once.
        </p>
      </Collapsible>

      <div className="rx-sec" style={{ marginTop: 12 }}>
        <p className="rx-p small">
          Splitting one uranium atom releases tens of millions of times more energy than burning one carbon atom.<Cite k="fissionVsCarbonRatio" />
        </p>
      </div>
    </>
  );
}

export function MicroreactorCard() {
  return (
    <Collapsible title="Small reactors on a truck">
      <p className="rx-p small">Some new reactors are small enough to move on a truck. Each makes far less power than a big plant, but they can be built in a factory and set up where power is needed.</p>
      <p className="rx-p small">
        Antares Nuclear was the first company in the US Department of Energy's Reactor Pilot Program to reach zero-power criticality (June 4, 2026).
        <Cite k="antaresCriticalityDate" /><AssumptionTag />
      </p>
      <p className="rx-p small">
        Valar Atomics was second (June 18, 2026).<Cite k="valarCriticalityDate" /><AssumptionTag />
      </p>
      <p className="rx-p muted small">Zero-power criticality means a steady chain reaction at very low power, the first big test of a new reactor.</p>
      <RealTerm>microreactor</RealTerm>
    </Collapsible>
  );
}

export function MoonReactorCard() {
  return (
    <Collapsible title="A reactor for the Moon">
      <p className="rx-p small">A night on the Moon lasts about <Fact k="lunarNightH" format={(v) => `${Math.round(v)} hours`} />. Solar panels sit idle, so a small reactor can keep a base running.</p>
      <p className="rx-p small">
        In <Fact k="krustyYear" format={yearFmt} />, the KRUSTY test showed a small reactor working. Heat pipes carried its heat to Stirling engines, which turn heat into electricity.
      </p>
      <p className="rx-p small">The Kilopower design gives up to <Fact k="kilopowerKW" unit /> for at least <Fact k="kilopowerYears" unit />.</p>
      <p className="rx-p small">NASA's target for a Moon reactor: <Fact k="fspTargetKW" unit /> in a package under <Fact k="fspTargetTonnes" unit />.</p>
      <p className="rx-p small">
        A 2025 directive asks for at least <Fact k="fsp2025DirectiveKW" unit />, ready to launch by late <Fact k="fspLaunchYear" format={yearFmt} />.
      </p>
      <RealTerm>fission surface power</RealTerm>
    </Collapsible>
  );
}

export function BottomStrip({ onHide }: { onHide: () => void }) {
  const money = (v: number) => `$${v}`;
  return (
    <div className="rx-strip">
      <div className="panel">
        <h3>How it works in 3 steps</h3>
        <ol className="rx-steps">
          <li>Split atoms. Each split makes heat.</li>
          <li>The heat boils water into steam.</li>
          <li>Steam spins a turbine, which spins a generator. Out comes electricity.</li>
        </ol>
      </div>
      <div className="panel">
        <h3>
          Trade-offs
          <button className="btn ghost" style={{ padding: '2px 8px', fontSize: 'var(--fs-xs)' }} onClick={onHide} aria-label="Hide the trade-offs strip">Hide</button>
        </h3>
        <div className="rx-trade">
          <div>
            <b style={{ color: 'var(--good)' }}>Good</b>
            <p>
              Runs day and night, in any weather. The world's reactors ran at <Fact k="nuclearCFWorld2024" percent digits={0} /> of their maximum in 2024.
              US plants ran above <Fact k="nuclearCFUS" percent digits={0} />.
            </p>
          </div>
          <div>
            <b style={{ color: 'var(--warn)' }}>Hard</b>
            <p>
              Slow and costly to build. Vogtle 3 and 4, two <Fact k="vogtleReactorMW" unit /> reactors, cost more than <Fact k="vogtleCostB" format={(v) => `$${v} billion`} />.
            </p>
          </div>
          <div>
            <b style={{ color: 'var(--ink-2)' }}>Costs</b>
            <p>
              Power from new US reactors costs <Fact k="lcoeNuclearLow" format={money} /> to <Fact k="lcoeNuclearHigh" format={money} /> per MWh.
            </p>
            <RealTerm>levelized cost of energy</RealTerm>
          </div>
        </div>
      </div>
    </div>
  );
}
