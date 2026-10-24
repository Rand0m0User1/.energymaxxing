// Plain-language glossary (SPEC §19). Each entry pairs a plain phrase with the real term.
// Lessons show `plain` first, then a small "The real term is …" line built from `term`.

export interface GlossaryEntry {
  /** The plain phrase used in the app. */
  plain: string;
  /** The technical term, shown second and smaller. */
  term: string;
  /** One or two plain sentences explaining the idea. */
  explain: string;
}

export const GLOSSARY = {
  firm: {
    plain: 'Always-on power',
    term: 'firm or baseload power',
    explain: 'Power that can run at any hour, whatever the weather. Reactors, geothermal and hydro are examples.',
  },
  curtailment: {
    plain: 'Wasted sun',
    term: 'curtailment',
    explain: 'Solar or wind power that is thrown away because the city is served and the battery is full.',
  },
  capacityFactor: {
    plain: 'How much of its maximum a plant makes over a year',
    term: 'capacity factor',
    explain: 'A plant running flat out all year scores 100%. Solar scores much lower because of nights, winter and clouds.',
  },
  learningRate: {
    plain: 'Price falls each time total production doubles',
    term: "learning rate (Wright's law)",
    explain: 'Each time the world has made twice as many, the price drops by about the same share.',
  },
  k: {
    plain: 'New splits caused by each split',
    term: 'multiplication factor, k',
    explain: 'If each split causes exactly one more, the chain reaction holds steady.',
  },
  foak: {
    plain: 'The first one ever built, and the tenth or hundredth copy',
    term: 'first-of-a-kind (FOAK) and nth-of-a-kind (NOAK)',
    explain: 'The first one is slow and expensive because everything is new. Later copies can be cheaper if builders learn.',
  },
  dunkelflaute: {
    plain: 'Dark doldrums: cold weeks with little sun and little wind',
    term: 'Dunkelflaute',
    explain: 'A German word for dark, windless winter weather, when solar and wind both make very little.',
  },
  powerEnergy: {
    plain: 'How fast (GW) and how much (GWh)',
    term: 'power capacity and energy capacity',
    explain: 'Power is how quickly a battery can give energy. Energy is how much it holds in total.',
  },
  overbuild: {
    plain: 'How much you build compared with the most the city ever needs',
    term: 'overbuild ratio (installed capacity over peak demand)',
    explain: 'Sun and wind need extra capacity to cover bad days. Always-on power needs much less.',
  },
  unserved: {
    plain: 'Power the city wanted but did not get',
    term: 'unserved energy or loss of load',
    explain: 'When supply falls short, some districts go dark.',
  },
  lcoe: {
    plain: 'Cost of each unit of energy actually used',
    term: 'levelized cost of electricity (LCOE)',
    explain: 'All the money spent on a plant over its life, divided by the useful energy it made.',
  },
  capitalStack: {
    plain: 'Who pays at each stage',
    term: 'capital stack',
    explain: 'Risky early stages are paid by investors who want big returns. Safe later stages use cheap loans.',
  },
  costOfCapital: {
    plain: 'The cost of borrowing the money to build',
    term: 'cost of capital (WACC)',
    explain: 'Expensive plants that take years to build are very sensitive to interest rates.',
  },
  moderator: {
    plain: 'The water that slows neutrons down so they cause more splits',
    term: 'moderator',
    explain: 'In most reactors the water is the moderator. Without it, the chain reaction slows down.',
  },
  roundTrip: {
    plain: 'How much comes back out of a battery for what you put in',
    term: 'round-trip efficiency',
    explain: 'Some energy is lost as heat each time a battery charges and discharges.',
  },
  launchMass: {
    plain: 'How much has to be carried up by rocket',
    term: 'launch mass',
    explain: 'Off Earth, the cost of power is mostly the cost of launching the equipment.',
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryId = keyof typeof GLOSSARY;

export const GLOSSARY_LIST: (GlossaryEntry & { id: GlossaryId })[] =
  (Object.keys(GLOSSARY) as GlossaryId[]).map((id) => ({ id, ...GLOSSARY[id] }));
