// Shows a number from the facts registry with its source superscript and, when needed, a "model assumption" marker.
import { fact, isAssumption, type FactKey } from '../data/facts';
import { useApp } from '../store';

export function fmtNumber(v: number, digits?: number): string {
  if (!isFinite(v)) return '—';
  const abs = Math.abs(v);
  const d = digits ?? (abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 1 : 2);
  return v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

/**
 * <Fact k="solarCFUS" percent /> renders "23.4%¹".
 * Use `format` for custom text; the source marker and assumption tag are always added.
 */
export function Fact({ k, percent, digits, unit = false, format, noMarker }: {
  k: FactKey; percent?: boolean; digits?: number; unit?: boolean; format?: (v: number) => string; noMarker?: boolean;
}) {
  const openSources = useApp((s) => s.openSources);
  const fa = fact(k);
  const text = format ? format(fa.value) : percent ? `${fmtNumber(fa.value * 100, digits ?? 1)}%` : `${fmtNumber(fa.value, digits)}${unit ? ' ' + fa.unit : ''}`;
  return (
    <span className="num">
      {text}
      {!noMarker && (
        <button className="src-sup" onClick={() => openSources(k)} aria-label={`Source: ${fa.label}`} title={fa.label}>
          [src]
        </button>
      )}
      {isAssumption(k) && <AssumptionTag />}
    </span>
  );
}

/** Small marker for model assumptions and unverified numbers. */
export function AssumptionTag({ text = 'model assumption' }: { text?: string }) {
  return <span className="tag-assumption" title="A simplifying choice in our model, not a measured fact">{text}</span>;
}

/** A source citation link without a number (e.g. after a sentence). */
export function Cite({ k }: { k: FactKey }) {
  const openSources = useApp((s) => s.openSources);
  const fa = fact(k);
  return <button className="src-sup" onClick={() => openSources(k)} title={fa.label} aria-label={`Source: ${fa.label}`}>[src]</button>;
}
