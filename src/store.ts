// Global app state (zustand). This is the contract between all modules.
// Add fields/actions freely; never rename or remove existing ones.
import { create } from 'zustand';
import type { BatterySetting, DistrictSetting, PlantSetting, SimInput, SimResult, SimTotals } from './engine/types';
import { simulate } from './engine/simulate';
import { defaultInput, presetInput, applyScenario, type PresetId } from './data/presets';
import { PLACES } from './data/places';
import { HOURS_PER_YEAR, timeOfDay, dayOfYear } from './engine/timeIndex';
import type {
  CameraMode, ChartRange, ControlKey, DemandScenario, DistrictId, GenId, InsideViewId, PlaceId, Screen,
  SourceId, Speed, StationId, ToolId, WeatherEventKind,
} from './types';

export interface ComparePin { label: string; input: SimInput; totals: SimTotals }

export type ReactorPath = 'us' | 'france' | 'korea' | 'custom';

export interface ToolState {
  /** Battery Factory: number of times total production has been doubled. */
  batteryDoublings: number;
  batteryChemistry: 'lfp' | 'nmc' | 'sodium';
  /** Industry Quarter: electricity price on the dial, $/MWh. */
  industryPrice: number;
  /** Reactor Row */
  reactorsBuilt: number;
  reactorPath: ReactorPath;
  customLearningRate: number; // -0.10 .. 0.20 per doubling
  /** Latest reactor price from Reactor Row ($/kW) and whether the City Lab uses it. */
  reactorRowPricePerKW: number | null;
  useReactorRowPrice: boolean;
}

export interface LessonState { id: string; step: number; answered: Record<number, number> }

export interface AppState {
  // Screens and panels
  screen: Screen;
  setScreen: (s: Screen) => void;
  inside: InsideViewId | null;
  insideLevel: number;
  openInside: (id: InsideViewId, level?: number) => void;
  setInsideLevel: (n: number) => void;
  closeInside: () => void;
  tool: ToolId | null;
  openTool: (t: ToolId | null) => void;
  sourcesOpen: boolean;
  sourcesFocus: string | null;
  openSources: (factOrSourceKey?: string | null) => void;
  closeSources: () => void;
  placePickerOpen: boolean;
  setPlacePickerOpen: (v: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  dashboardOpen: boolean;
  setDashboardOpen: (v: boolean) => void;
  chartRange: ChartRange;
  setChartRange: (r: ChartRange) => void;

  // Simulation input and result
  input: SimInput;
  result: SimResult;
  setInput: (patch: Partial<SimInput>) => void;
  setPlant: (id: GenId, patch: Partial<PlantSetting>) => void;
  setBattery: (patch: Partial<BatterySetting>) => void;
  setDistrict: (id: DistrictId, patch: Partial<DistrictSetting>) => void;
  setPlace: (p: PlaceId) => void;
  applyPreset: (p: PresetId) => void;
  applyScenario: (s: DemandScenario) => void;
  addWeatherEvent: (kind: WeatherEventKind | 'clear') => void;
  buildLikeHandmer: () => void;
  resetAll: () => void;

  // Time
  hourOfYear: number;
  playing: boolean;
  speed: Speed;
  setHourOfYear: (h: number) => void;
  setTimeOfDay: (h: number) => void;
  setDayOfYear: (d: number) => void;
  stepHour: (delta: number) => void;
  setPlaying: (v: boolean) => void;
  togglePlay: () => void;
  setSpeed: (s: Speed) => void;
  tick: (dtSeconds: number) => void;

  // Camera and selection
  cameraMode: CameraMode;
  cameraTarget: StationId | null;
  flyNonce: number;
  setCameraMode: (m: CameraMode) => void;
  flyTo: (id: StationId) => void;
  nearStation: StationId | null;
  setNearStation: (id: StationId | null) => void;
  selectedStation: StationId | null;
  selectStation: (id: StationId | null) => void;
  selectedDistrict: DistrictId | null;
  selectDistrict: (id: DistrictId | null) => void;
  highlightSource: SourceId | null;
  setHighlightSource: (s: SourceId | null) => void;

  // Lessons
  lesson: LessonState | null;
  visibleControls: ControlKey[] | 'all';
  completedLessons: string[];
  startLesson: (id: string) => void;
  setLessonStep: (step: number) => void;
  answerPrediction: (step: number, choice: number) => void;
  exitLesson: () => void;
  completeLesson: (id: string) => void;
  setVisibleControls: (v: ControlKey[] | 'all') => void;

  // Compare, presenter, accessibility
  comparePin: ComparePin | null;
  pinCompare: (label?: string) => void;
  clearCompare: () => void;
  presenter: boolean;
  presenterStep: number;
  setPresenter: (v: boolean) => void;
  setPresenterStep: (n: number) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;

  // Tools
  tools: ToolState;
  setTools: (patch: Partial<ToolState>) => void;
}

/** True if a control should be shown (lessons hide most controls). */
export function controlVisible(state: Pick<AppState, 'visibleControls'>, key: ControlKey): boolean {
  return state.visibleControls === 'all' || state.visibleControls.includes(key);
}

export const useControlVisible = (key: ControlKey) => useApp((s) => controlVisible(s, key));

const defaultTools = (): ToolState => ({
  batteryDoublings: 0,
  batteryChemistry: 'lfp',
  industryPrice: 60,
  reactorsBuilt: 0,
  reactorPath: 'us',
  customLearningRate: 0.1,
  reactorRowPricePerKW: null,
  useReactorRowPrice: false,
});

function withReactorPrice(input: SimInput, tools: ToolState): SimInput {
  if (tools.useReactorRowPrice && tools.reactorRowPricePerKW != null) {
    return { ...input, costs: { ...input.costs, fissionPerKW: tools.reactorRowPricePerKW } };
  }
  return input;
}

const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const useApp = create<AppState>((set, get) => {
  /** Replace the input and recompute the simulation synchronously. */
  const commit = (input: SimInput) => set({ input, result: simulate(withReactorPrice(input, get().tools)) });
  const initialInput = defaultInput();
  const initialHour = PLACES[initialInput.place].hardestDay * 24 + 12;

  return {
    screen: 'title',
    setScreen: (screen) => {
      const s = get();
      const patch: Partial<AppState> = { screen, inside: null, tool: null, selectedStation: null };
      if (screen === 'lab' || screen === 'world') { patch.visibleControls = 'all'; patch.lesson = null; }
      if (screen === 'tour' && !s.lesson) patch.visibleControls = 'all';
      set(patch);
      if (screen === 'beyond' && PLACES[s.input.place].body === 'earth') {
        get().applyPreset('moonBase');
        set({ visibleControls: 'all', lesson: null, tool: 'beyond' });
      }
      if (screen !== 'beyond' && screen !== 'title' && PLACES[get().input.place].body !== 'earth' && screen !== 'tour') {
        // keep off-Earth place if user chose it; nothing to do
      }
    },
    inside: null,
    insideLevel: 1,
    openInside: (id, level = 1) => set({ inside: id, insideLevel: level, playing: false }),
    setInsideLevel: (n) => set({ insideLevel: n }),
    closeInside: () => set({ inside: null }),
    tool: null,
    openTool: (tool) => set({ tool }),
    sourcesOpen: false,
    sourcesFocus: null,
    openSources: (k = null) => set({ sourcesOpen: true, sourcesFocus: k }),
    closeSources: () => set({ sourcesOpen: false }),
    placePickerOpen: false,
    setPlacePickerOpen: (placePickerOpen) => set({ placePickerOpen }),
    helpOpen: false,
    setHelpOpen: (helpOpen) => set({ helpOpen }),
    dashboardOpen: true,
    setDashboardOpen: (dashboardOpen) => set({ dashboardOpen }),
    chartRange: 'day',
    setChartRange: (chartRange) => set({ chartRange }),

    input: initialInput,
    result: simulate(initialInput),
    setInput: (patch) => commit({ ...get().input, ...patch }),
    setPlant: (id, patch) => {
      const i = get().input;
      commit({ ...i, plants: { ...i.plants, [id]: { ...i.plants[id], ...patch } } });
    },
    setBattery: (patch) => {
      const i = get().input;
      commit({ ...i, battery: { ...i.battery, ...patch } });
    },
    setDistrict: (id, patch) => {
      const i = get().input;
      commit({ ...i, districts: { ...i.districts, [id]: { ...i.districts[id], ...patch } } });
    },
    setPlace: (place) => {
      const i = get().input;
      const tod = timeOfDay(get().hourOfYear);
      commit({ ...i, place, events: [] });
      set({ hourOfYear: PLACES[place].hardestDay * 24 + tod });
    },
    applyPreset: (p) => {
      const next = presetInput(p, get().input);
      const placeChanged = next.place !== get().input.place;
      commit(next);
      if (placeChanged) set({ hourOfYear: PLACES[next.place].hardestDay * 24 + timeOfDay(get().hourOfYear) });
    },
    applyScenario: (sc) => commit(applyScenario(get().input, sc)),
    addWeatherEvent: (kind) => {
      const i = get().input;
      if (kind === 'clear') return commit({ ...i, events: [] });
      const startHour = Math.floor(get().hourOfYear / 24) * 24;
      commit({ ...i, events: [...i.events.filter((e) => e.kind !== kind), { kind, startHour }] });
    },
    buildLikeHandmer: () => get().applyPreset('handmer'),
    resetAll: () => {
      const s = get();
      const place = s.input.place;
      const base = { ...defaultInput(), place };
      commit(base);
      set({
        hourOfYear: PLACES[place].hardestDay * 24 + 12, playing: false, speed: 'hour', comparePin: null,
        tools: defaultTools(), chartRange: 'day', selectedStation: null, selectedDistrict: null,
      });
    },

    hourOfYear: initialHour,
    playing: false,
    speed: 'hour',
    setHourOfYear: (h) => set({ hourOfYear: ((h % HOURS_PER_YEAR) + HOURS_PER_YEAR) % HOURS_PER_YEAR }),
    setTimeOfDay: (t) => {
      const d = dayOfYear(get().hourOfYear);
      set({ hourOfYear: d * 24 + Math.min(23.999, Math.max(0, t)) });
    },
    setDayOfYear: (d) => {
      const t = timeOfDay(get().hourOfYear);
      set({ hourOfYear: (Math.max(0, Math.min(364, Math.round(d))) * 24) + t });
    },
    stepHour: (delta) => get().setHourOfYear(Math.round(get().hourOfYear) + delta),
    setPlaying: (playing) => set({ playing }),
    togglePlay: () => set({ playing: !get().playing }),
    setSpeed: (speed) => set({ speed }),
    tick: (dt) => {
      const s = get();
      if (!s.playing) return;
      const rate = s.speed === 'hour' ? 1 : s.speed === 'day' ? 24 : 168;
      // In orbit a day is many orbits; slow the clock so a 90-minute orbit is watchable.
      const orbit = PLACES[s.input.place].body === 'orbit';
      const r = orbit ? rate / 8 : rate;
      s.setHourOfYear(s.hourOfYear + r * Math.min(dt, 0.1));
    },

    cameraMode: 'orbit',
    cameraTarget: null,
    flyNonce: 0,
    setCameraMode: (cameraMode) => set({ cameraMode }),
    flyTo: (id) => set({ cameraTarget: id, flyNonce: get().flyNonce + 1, cameraMode: get().cameraMode === 'walk' ? 'walk' : 'orbit' }),
    nearStation: null,
    setNearStation: (nearStation) => { if (get().nearStation !== nearStation) set({ nearStation }); },
    selectedStation: null,
    selectStation: (selectedStation) => set({ selectedStation }),
    selectedDistrict: null,
    selectDistrict: (selectedDistrict) => set({ selectedDistrict }),
    highlightSource: null,
    setHighlightSource: (highlightSource) => set({ highlightSource }),

    lesson: null,
    visibleControls: 'all',
    completedLessons: [],
    startLesson: (id) => set({ lesson: { id, step: 0, answered: {} }, screen: 'tour', inside: null, tool: null }),
    setLessonStep: (step) => { const l = get().lesson; if (l) set({ lesson: { ...l, step } }); },
    answerPrediction: (step, choice) => { const l = get().lesson; if (l) set({ lesson: { ...l, answered: { ...l.answered, [step]: choice } } }); },
    exitLesson: () => set({ lesson: null, visibleControls: 'all' }),
    completeLesson: (id) => { if (!get().completedLessons.includes(id)) set({ completedLessons: [...get().completedLessons, id] }); },
    setVisibleControls: (visibleControls) => set({ visibleControls }),

    comparePin: null,
    pinCompare: (label = 'A') => set({ comparePin: { label, input: get().input, totals: get().result.totals } }),
    clearCompare: () => set({ comparePin: null }),
    presenter: false,
    presenterStep: 0,
    setPresenter: (presenter) => set({ presenter }),
    setPresenterStep: (presenterStep) => set({ presenterStep }),
    reducedMotion: !!prefersReducedMotion,
    setReducedMotion: (reducedMotion) => set({ reducedMotion }),

    tools: defaultTools(),
    setTools: (patch) => {
      const tools = { ...get().tools, ...patch };
      set({ tools });
      if ('useReactorRowPrice' in patch || 'reactorRowPricePerKW' in patch) commit(get().input);
    },
  };
});
