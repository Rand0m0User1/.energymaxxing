// Lesson model (SPEC §11). Lessons are plain data plus small functions that drive the store.
import type { AppState } from '../store';
import type { ControlKey, InsideViewId, StationId, ToolId } from '../types';
import type { GlossaryId } from '../data/glossary';

export type Question = 1 | 2 | 3 | 4;

/** Live readouts a step can show. Rendered by <LiveValue kind=… /> in live.tsx. */
export type LiveKind =
  | 'lightsOn' | 'longestBlackout' | 'solarCF' | 'fissionCF' | 'costMid' | 'overbuild' | 'wastedPct'
  | 'solarNow' | 'fissionNow' | 'demandNow' | 'supplyNow' | 'unservedNow' | 'batteryNow'
  | 'place' | 'clock' | 'date' | 'doublings' | 'reactorsBuilt' | 'industryPrice';

export interface Prediction {
  question: string;
  choices: string[];
  correct?: number;
  /** The answer, shown once the step is done. May contain {f:…} and {live:…} tokens. */
  reveal: string;
  /** Runs right after the viewer picks an answer ("Let's see."). */
  run?: (app: AppState) => void;
}

export interface StepAction {
  label: string;
  run: (app: AppState) => void;
}

/**
 * One instruction. Text fields may contain tokens:
 *   {f:factKey}      number from the facts registry with its source marker
 *   {f:factKey:pct}  as a percent      {f:factKey:u}   with its unit
 *   {f:factKey:usd}  with a $ prefix   {f:factKey:nm}  plain number, no marker
 *   {live:kind}      live value from the simulation (see LiveKind)
 */
export interface Step {
  text: string;
  /** Glossary term shown under the step text. */
  term?: GlossaryId;
  /** Glossary term shown under the after text. */
  afterTerm?: GlossaryId;
  /** Visible controls for this step. Inherited from earlier steps when omitted. */
  controls?: ControlKey[] | 'all';
  /** Camera target, flown to when the step starts. "Return to view" uses the latest one. */
  camera?: StationId;
  /** Tool panel open during this step. Inherited when omitted; null closes it. */
  tool?: ToolId | null;
  /** Inside view open during this step. Inherited when omitted; null closes it. */
  inside?: { id: InsideViewId; level: number } | null;
  /** Runs once when the step starts (after controls, tool and inside view are applied). */
  setup?: (app: AppState) => void;
  predict?: Prediction;
  /** Polled about 4 times a second; when true the card shows `after` and enables Next. */
  check?: (app: AppState) => boolean;
  after?: string;
  /** No check: Next is enabled straight away (after any prediction is answered). */
  auto?: boolean;
  /** Live numbers shown in a small row while the step is active. */
  watch?: LiveKind[];
  /** "Do it for me" buttons shown in the card. */
  actions?: StepAction[];
  /** Style as the lesson's key idea: 'text' or 'after'. true = the after text if there is one, else the step text. */
  aha?: boolean | 'text' | 'after';
}

export interface Lesson {
  id: string;
  number: number;
  title: string;
  question: Question;
  minutes: number;
  /** One line: what you will learn. */
  learn: string;
  steps: Step[];
  /** Shown on the finish card. May contain tokens. */
  summary: string;
  /** The key idea, shown on the finish card. */
  aha?: string;
}
