# The Length of the Night: build spec for a 3D energy city simulation

**Team:** Energymaxxing (Aleksander Kurgan, Brad Wu, Belle Zhou, Munich Limapichat)
**Event:** Stanford Bases Six Hour Challenge, Energy sector, October 24, 2026
**What this is:** a complete product and engineering spec. It covers what the person sees, every way they can interact, the simulation math, the data and its sources, the visual style, the tech stack, the file layout, and the order to build things in.

> NOTE: The original spec was truncated partway through section 10.2. Sections 0–10.1 below are verbatim. Sections marked **[ADDENDUM]** at the end (10.2 onward, 11–23) were reconstructed by the lead engineer from the interaction outline in section 2 and the four "aha" moments. Treat the addendum as authoritative for the build.

---

## 0. Read this first

1. **Build order matters more than completeness.** The team has limited time. Build the "must ship" cut end to end before anything else, run it, then add layers.
2. **Every number lives in one data registry** (`src/data/facts.ts`, which merges `src/data/facts/*.ts`) with a source tag. No number is typed directly into a component. If a number is marked `assumption` or `verify`, the UI must show it with a small "model assumption" marker, never as a cited fact.
3. **Plain language is a hard requirement.** Every label, tooltip and lesson line must be readable by someone who has never studied energy. Technical terms appear only after a plain sentence has explained the idea, and then only in a smaller "the real term is…" line.
4. **Clean, quiet visuals.** Simple shapes, flat or softly shaded matte materials, one light, soft shadows, a lot of empty space. No neon, no glow-everything, no fake terminal readouts, no gradients on text, no emoji.
5. **Runs locally with one command:** `npm install && npm run dev`, then open `http://localhost:5173`. No backend, no API keys, no network calls at runtime. All 3D models are built from code (primitives), so there are no asset downloads.
6. **The thesis must be visible in the product.** The whole app argues one idea from the paper: *cheap solar and batteries become the main source of energy almost everywhere, and a firm, always-on layer (fission, geothermal, hydro, later maybe fusion) is insurance whose size depends on how long the night is.* Every lesson and the sandbox should let a viewer discover that rule for themselves.

---

## 1. The product in one page

**Name:** *The Length of the Night* (subtitle in the app: "How much darkness can a city survive?")

**One-sentence pitch:** A walkable 3D model city where you switch power plants on and off, move the city from Abu Dhabi to Helsinki to the Moon, scrub through a day and a year, and watch energy flow as moving particles, so you can see for yourself why the length of the night decides the energy mix.

**Who uses it:**
- The Bases judges and leadership team, in a 3 to 5 minute walk-through, with a team member driving or with the judge driving.
- Anyone curious, alone, with no help. It must teach without a presenter.

**What it is modeled on:** PhET Interactive Simulations from the University of Colorado Boulder (for example *Energy Forms and Changes*, *Energy Skate Park*, and the older *Nuclear Fission* sim). We keep PhET's teaching approach and move it into 3D.

**Structure (four places in the app):**

| Place | What happens there | Which question it answers |
|---|---|---|
| **Guided Tour** | Ten short lessons, 1 to 3 minutes each. Each lesson locks most controls and asks the viewer to try one thing. | All four, in order |
| **The World** (walkable map) | A small island "park" of power plants around a city. Walk or click to any plant and open its inside view. | Q1 inner workings, Q2 reactors, Q3 batteries |
| **City Lab** (sandbox) | Every control unlocked. Pick place, season, time, plants, battery size, demand. Read the live dashboard. | Q1 and Q2 |
| **Beyond Earth** | Same city engine, but the city is a base in orbit, on the Moon or on Mars. Cost turns into launch mass. | Q1 second half |
| **Battery Factory** and **Industry Quarter** (two districts of The World) | Learning-curve machine for batteries; four industry buildings that react to the price of power. | Q3 and Q4 |

**The four "aha" moments the product must deliver** (one per question):

1. **Q1:** "A gigawatt of solar is not a gigawatt of nuclear." Then: "It is not where the sun is strongest that matters, it is how long the darkness lasts."
2. **Q2:** "Reactors are expensive because they are built one at a time. Build the same one many times and the price falls. Who pays for the first ones decides who wins."
3. **Q3:** "Battery cells keep getting cheaper fast. The whole installed system does not, and the hold-ups are connections, materials and permits."
4. **Q4:** "Cheaper power does not help every industry the same way. Industries that can store their product and run when power is cheap win the most."

The four challenge questions (Stanford BASES Six Hour Challenge, Energy sector):
1. What will the future energy mix be: solar, fission, fusion or something else? Does the answer change in orbit, on the Moon or on Mars?
2. Will fission or fusion reach nth-of-a-kind deployment at scale as data centers, electric vehicles and industry push demand up? Which companies pull ahead, what capital stack pays for it, and will utilities adopt it quickly or stick with traditional sources?
3. What is the learning rate for battery technology, and what are the bottlenecks to producing grid-scale batteries?
4. What does the future cost of energy mean for manufacturing, data centers, chemical processing and other industries? What becomes possible as the cost per watt falls by orders of magnitude?

---

## 2. Interaction outline (every way the user can interact)

### 2.1 Getting around

- **Walk:** arrow keys or W A S D move a small on-foot camera across the island at eye height. Shift to move faster. The camera never clips through buildings (simple circle-versus-box collision).
- **Look:** drag with the mouse (or one finger) to turn. Scroll or pinch to zoom.
- **Fly over:** press **M** or click the map button to rise to a top-down "map view" of the whole island. Click any building or plant to fly the camera to it (a smooth 1.2 second move).
- **Jump to place:** a row of small round tabs at the bottom (City, Solar, Batteries, Reactor, Fusion Lab, Wind, Gas, Hydro and Geothermal, Battery Factory, Industry Quarter). Number keys 1 to 0 jump to them.
- **Inside view:** when the camera is near a plant, a quiet prompt appears: "Press E or click to look inside." This opens the plant's cutaway (section 8).
- **Back:** Esc closes the current panel or inside view. A second Esc returns to the map view.
- **Guided camera:** during lessons the camera is driven for the viewer. They can still look around, but a "Return to view" button snaps it back.

### 2.2 Controlling time and place

- **Time of day scrubber:** a horizontal dial at the bottom of the screen, 00:00 to 24:00. Drag it, or press **[** and **]** to step one hour. The sun moves, shadows move, city lights turn on at dusk.
- **Play, pause, speed:** space bar plays or pauses. Speed options: 1 hour per second, 1 day per second (to watch weeks pass), 1 week per second (to watch a whole year).
- **Day of year / season:** a second slider (January to December) with four quick buttons: Winter, Spring, Summer, Autumn. Default is the hardest case for the chosen place.
- **Weather events:** buttons for "Clear", "Cloudy day", "Cloudy week" (5 days at low sun), and "Windless week". On Mars: "Dust storm". These insert the event at the current time.
- **Location picker:** a globe button opens a small rotating globe with pins. Earth: Abu Dhabi, Phoenix, Stanford (Bay Area), Madrid, Tokyo, Berlin, London, Helsinki. Off Earth: Low Earth orbit, Geostationary orbit, Lunar south pole peak, Lunar equator, Mars equator, Mars mid-latitude. Picking a place re-skins the ground (sand, green, snow, grey regolith, red dust), moves the sun path, changes the sky.

### 2.3 Controlling the power plants

- **Plant cards:** a right-side panel lists each power source as a card with an on/off switch and a size slider (for example "Solar: 0 to 12 GW"). Batteries have two sliders: power (GW, how fast) and energy (GWh, how much).
- **Toggle in the world:** clicking a plant in the 3D world shows the same switch and slider in a small floating card next to it.
- **"When does it run?" schedule:** for plants that can be turned up and down on command (gas, hydro, reactor in flexible mode, fusion), a tiny 24-hour strip lets the viewer paint the hours it runs. Default is "Automatic: run when needed".
- **Battery rule:** choose "Store extra sun, release at night" (default) or "Paint my own schedule".
- **Overbuild button:** "Build like Casey Handmer" sets solar to 10 times the city's average demand with a large battery, to test his argument (lesson 6).
- **Reset all:** a round arrow button bottom-right, like PhET's, resets the current screen.

### 2.4 Controlling demand (the city)

- **District switches:** Homes, Shops and offices, Transport (electric car charging), Factory district, Data center campus, Hydrogen and ammonia plant (only in the Industry Quarter lesson and sandbox).
- **District size sliders:** each district can grow or shrink. The data center slider is special: "AI build-out" adds up to 1 GW in steps of 100 MW, with a note about how real projects are this size.
- **Demand scenario buttons:** "Today", "2030 with AI growth", "Everything electric 2040".
- **Flexible load switch:** "Let the data center pause batch jobs when power is short" (from the paper's Norris et al. 2025 point).

### 2.5 Reading what is happening

- **Energy particles:** small matte spheres (no glow) stream along power lines from each running plant to the city substation, then branch to districts. One particle stands for a fixed amount of energy (for example 10 MWh). Each source has its own color. Particle speed is constant; particle **density** shows power. This is PhET's "energy chunks" idea in 3D.
- **City lights:** districts that are short of power dim and flicker. A blackout turns a district dark grey with a small "No power" tag.
- **Live dashboard (bottom-left, collapsible):**
  - Big number: "Power right now: 1.02 GW used / 1.02 GW supplied".
  - A stacked bar of where the power is coming from right now.
  - A 24-hour (or 7-day, or 365-day) stacked area chart with a moving "now" line.
  - Battery gauge: a simple cylinder filling and emptying, with "hours left at this rate".
  - Three plain scorecards: **Lights on** (percent of hours fully supplied), **Cost** (dollars per MWh and per month for an average home), **Carbon** (tonnes of CO2).
  - **Wasted sun:** how much solar had to be thrown away because the battery was full ("curtailed").
- **Compare mode:** pin the current setup as "A", change things, and see "A vs B" side by side.
- **Why? button:** next to any scorecard, opens a two-sentence plain explanation and the source.
- **Sources drawer:** every number with a small superscript opens the source list at that item.

### 2.6 Inside views (cutaways)

- **Solar farm:** zoom from field to panel to cell. Toggle "show sunlight angle" to see why winter sun gives less power.
- **Battery yard:** open a container to see racks, modules, cells. "Charge" and "Discharge" animate ions moving.
- **Fission reactor:** five zoom levels from plant to atom. Interactive chain reaction with control rods, a criticality meter, and a fuel pellet comparison (section 8.3).
- **Fusion lab:** three machines side by side (tokamak, Helion-style pulsed machine, laser target), each with a "how far along is it" bar.
- **Wind, gas, hydro, geothermal:** one simple cutaway each, with a single interactive idea.

### 2.7 Lessons

- **Lesson picker:** ten tiles (section 11). Each says the question it answers, its length, and one line of what you will learn.
- **Lesson flow:** a small card on the left with one instruction at a time ("Turn off the battery. Then drag the clock to 10 PM."). The card waits until the viewer does it (the app detects the action), then shows what just happened and why.
- **Predict first:** at key steps the card asks "What do you think happens?" with 2 or 3 choices, before showing the answer. Wrong answers are fine; the card says "Let's see" and runs it.
- **Skip, back, restart** buttons on every lesson card.
- **Unlock:** finishing a lesson unlocks its controls in the City Lab. A "Skip to sandbox" link is always present for presenters.

### 2.8 Special tools

- **Battery Factory:** a "Double total production" button and a chemistry picker; the price tag on the battery shrinks along a learning curve (section 12).
- **Industry Quarter:** a big electricity price dial from $100 to $1 per MWh; four buildings react (section 13).
- **Reactor Builder:** a "Build the next one" button stacks reactors in a row; cost per reactor falls or rises depending on the country path chosen (section 10.2).
- **Capital stack tower:** blocks of money stacked under a reactor, labeled by who pays at each stage.

### 2.9 Presenter tools

- **Presenter mode:** press **P**. Hides help prompts, enlarges the dashboard numbers, enables a clicker (Page Up / Page Down) to step through a fixed 3-minute demo script (section 23).
- **Fullscreen:** **F**.
- **Screenshot:** **S** saves a PNG of the current view with the dashboard (useful for the submission write-up).

---

## 3. What we learned from PhET and how we apply it

| PhET principle | What it means | How we apply it in 3D |
|---|---|---|
| **Implicit scaffolding** | The controls themselves guide you. Few words, no long instructions. You learn by trying. | Each lesson exposes only 1 to 3 controls. Controls are big, labeled with plain words, and do one thing. |
| **Make the invisible visible** | Show things you cannot normally see: electrons, energy, forces. | Energy particles flow along lines. Neutrons in the reactor are visible. Battery charge is a filling cylinder. |
| **Multiple linked views** | The same thing shown as a picture, a bar chart and a number, all moving together. | The world, the stacked bar and the area chart all update in the same frame. Hovering a color in one highlights it in all. |
| **Immediate feedback** | Every change shows its result within a fraction of a second. | The sim engine recomputes a whole year in under 50 ms, so every slider is live. |
| **Screens: Intro, then Lab** | Most PhET sims have a simple first screen and a "Lab" screen with everything unlocked. | Guided Tour first, then City Lab and the open World. |
| **Productive constraints** | Sliders have sensible ranges so you cannot break the lesson, but you can make interesting mistakes. | Ranges are set so a blackout is possible (the interesting mistake) but nonsense is not. |
| **Reset All** | One round button returns everything to the start. | Same, bottom-right, same icon. |
| **Play, pause, step** | Time controls are always in the same place. | Bottom center, same each screen. |
| **Accessibility** | Keyboard navigation, screen-reader descriptions and sound in newer sims. | Full keyboard control, text descriptions for the dashboard, reduced-motion setting. |

Where we go further than PhET: 3D and walkable, with real places and a real calendar; real, sourced data in every number, with the source one click away; one argument runs through the whole app (the length of the night); economics as well as physics.

---

## 4. Screens and flow

```
Title screen
  ├── "Start the tour" → Guided Tour (lesson picker → lessons 1–10)
  ├── "Explore the world" → The World (walkable island)
  │       ├── Inside views for each plant
  │       ├── Battery Factory district
  │       └── Industry Quarter district
  ├── "Open the City Lab" → City Lab (sandbox)
  └── "Go beyond Earth" → Beyond Earth (orbit, Moon, Mars)
```

### 4.1 Title screen
- Full-bleed 3D view of the island at dusk, slowly orbiting. City lights come on, solar farm fades to dark, the battery yard starts glowing softly with flow lines (the thesis in one shot).
- Large title "The Length of the Night". One line under it: "Solar is cheap. Night is long. How do we keep the lights on?"
- Four buttons, plain text, left-aligned in a column: Start the tour (primary), Explore the world, Open the City Lab, Go beyond Earth.
- Small footer: team names, "Stanford Bases Six Hour Challenge, Energy", "Sources" link.

### 4.2 Shared layout for all 3D screens
```
┌───────────────────────────────────────────────────────────────┐
│ Top bar: place · date · time             [Globe] [Sources] [?]│
│                                                               │
│ [Lesson card]                                 [Plant cards]   │
│  (left, 320px)                                 (right, 300px) │
│                                                               │
│                     3D VIEW (full screen)                     │
│                                                               │
│ [Dashboard (collapsible)]                                     │
│ [ Place tabs ………… ]  [◀ ▶ ⏸ speed] [ time dial ] [season] [⟲] │
└───────────────────────────────────────────────────────────────┘
```
- Panels float over the 3D view with a translucent background (backdrop blur) and a thin border. They never cover the center third of the screen.
- At narrow widths (under 900 px) the side panels become bottom sheets.

---

## 5. The World: the island map

### 5.1 Layout
A round island about 2 km across in world units (scaled down; real plants would be much larger, and the app says so in a small "not to scale" note). The city sits in the center. Plants sit around it like stations around a park. Power lines run from each plant to a central substation at the edge of the city. **Exact station positions live in `src/world/layout.ts`.**

- **Solar farm:** rows of tilted panels, east of the city.
- **Battery yard:** rows of white shipping-container-sized boxes next to the solar farm.
- **Reactor hall:** a cooling tower (optional, can be off for a small modular reactor) and a domed containment building. A small microreactor sits beside it on a truck bed (Antares and Valar style).
- **Fusion lab:** a low building with a glass roof showing three machines. A sign says "Experimental: not on the grid yet".
- **Gas plant:** a simple turbine hall with one stack. Exhaust is shown as faint grey particles when running.
- **Wind ridge:** five turbines on a low hill.
- **Hydro dam and geothermal:** a small reservoir with a dam, and a geothermal well-head with a pipe loop.
- **Battery Factory district:** a factory with a conveyor and a price board (section 12).
- **Industry Quarter:** four buildings for the four archetypes (section 13).
- **City:** about 60 simple block buildings in five districts, each district a different tint so it reads as a zone from above.

### 5.2 Walking
- On-foot camera at 1.7 m eye height, speed 6 m/s, shift for 20 m/s (scale to world units). Paths are light-grey lines on the ground connecting all stations.
- Each station has a short **sign** (a floating label facing the camera) with its name and one live number, for example "Solar farm · 4.2 GW built · making 2.9 GW now".

### 5.3 What changes with place and season
- Ground material and sky color per place (section 7).
- Sun path: computed from latitude and day of year (section 9.2). At Helsinki in December, the sun barely clears the horizon.
- Snow layer on panels in winter at high latitude (cuts output in the model only if "snow" is enabled; default off, marked as an assumption).

---

## 6. The city and its demand

### 6.1 Size of the city
The model city uses **about 1 GW on average**. This matches the Abu Dhabi project in the paper, where **5.2 GW of solar and 19 GWh of batteries deliver a steady 1 GW**. The app calls the city "a city of about a million people" with a `verify` marker.

### 6.2 Districts and default loads (all `assumption` unless noted)

| District | Default average | Shape through the day | Notes shown in app |
|---|---|---|---|
| Homes | 380 MW | Low at night, morning bump, big evening peak (6 to 10 PM). Winter: higher at high latitude (heating). Summer: higher in hot places (cooling). | "Most of a home's evening power is lights, cooking and heating or cooling." |
| Shops and offices | 220 MW | Flat during working hours, low at night. | |
| Transport (EV charging) | 80 MW | Two peaks: overnight charging and workplace midday charging. Grows in "2040" scenario to 250 MW. | |
| Factory district | 170 MW | Flat around the clock on weekdays (3 shifts). | Links to Industry Quarter. |
| Data center campus | 150 MW | Flat around the clock. "AI build-out" slider up to 1 GW. With "flexible" on, 30% of its load can pause for up to 4 hours when power is short. | Uses paper's IEA figures: data centres 485 TWh in 2025 to 950 TWh in 2030. |
| **Total** | **~1,000 MW** | Peak about 1.35 GW in the evening. | |

Shapes are stored as 24 hourly multipliers per district per season (`src/data/loadShapes.ts`), normalized so the daily average equals the slider value.

### 6.3 Demand scenarios
- **Today:** the table above.
- **2030 with AI growth:** data center to 500 MW. Context line: "US data centers used about 4.4% of US electricity in 2023 and could use 6.7% to 12% by 2028." (DOE/LBNL)
- **Everything electric 2040:** transport 250 MW, homes +20% in winter (heat pumps), factory +30%, data center 1 GW. Marked as `assumption`.

### 6.4 Clicking a district
Opens a small card: "Homes · using 412 MW now · 37% of the city", a 24-hour sparkline, and one plain fact. For the data center: "In a typical 1 GW data center, power costs about $0.6 billion a year, but the servers cost about $5 billion. Cheaper power matters less to it than getting connected fast." (paper, Epoch AI 2026)

---

## 7. Places (locations)

Each place has a preset in `src/data/places.ts`. Numbers for the sun model are computed (section 9.2). Cloudiness and wind are simple monthly factors, marked `assumption`.

| Place | Latitude | Ground and sky | Longest dark period | Default hardest case |
|---|---|---|---|---|
| Abu Dhabi, UAE | 24.5° N | Pale sand, clear blue sky | One night (~13 h in December) | December |
| Phoenix, USA | 33.4° N | Sand and scrub | One night | December |
| Stanford, California | 37.4° N | Golden grass, oak dots | One night, some cloudy winter days | January cloudy week |
| Madrid, Spain | 40.4° N | Dry olive ground | One night, some cloudy days | January |
| Tokyo, Japan | 35.7° N | Green, rainy season | Rainy weeks in June | June cloudy week |
| Berlin, Germany | 52.5° N | Green-grey | Long dark winter, windless weeks ("dark doldrums") | December windless week |
| London, UK | 51.5° N | Green, overcast | Long dark winter. Handmer: the UK is the one big country that cannot easily run on solar alone, "due primarily to a high population density and high latitude." | December |
| Helsinki, Finland | 60.2° N | Snow, low pale sun | Very long winter nights, about 18 h of darkness in late December | December |
| Low Earth orbit | n/a | Black sky, blue Earth below | ~36 min of shadow every ~90 min orbit | any |
| Geostationary orbit | n/a | Black sky, small Earth | Up to 72 min a day during two eclipse seasons (NOAA, GOES) | equinox |
| Lunar south pole peak | ~89.5° S | Grey regolith, long shadows | Some peaks lit more than 80% of the time; a 10 m mast gives a 200 m × 500 m area lit more than 90% | worst month |
| Lunar equator | 0° | Grey regolith | 14.5 Earth days (about 350 h) | any |
| Mars equator | ~0° | Red dust, butterscotch sky | One sol night (~12 h) or a planet-wide dust storm lasting weeks | dust storm |
| Mars mid-latitude | ~45° N | Red dust, frost in winter | Long winter plus storms | winter storm |

Show once in the place card: "Engineers call a long windless, cloudy winter spell a *Dunkelflaute*, German for 'dark doldrums'."

---

## 8. Power sources and their inside views

Every source has: a card in the plant panel (name, color dot, on/off, size slider, "making X GW now", "share of today"); a world object with idle and running animations; an inside view with one interactive idea, a "How it works in 3 steps" strip, and a "Trade-offs" strip (good / hard / costs); a color used everywhere (particles, chart, cards).

### 8.1 Solar farm
- **World:** 8 rows of panels on single-axis trackers that rotate slowly to follow the sun. At night they lie flat.
- **Inside view (3 zoom levels):** field → one panel → one cell. At cell level, yellow "light packets" hit the cell and small particles move to the wire. Interactive: **sun angle** handle. Drag the sun lower and watch the same light spread over a larger area (a beam-footprint rectangle that grows), so less power. This is the "why winter is weaker" idea.
- **3 steps:** Sunlight hits the panel. The panel turns light straight into electricity. No moving parts, no fuel.
- **Trade-offs:** Good: cheapest new power in most places ($40 to $98 per MWh in the US, Lazard 2026). Hard: nothing at night, much less in clouds and winter; US solar plants produce about 23.4% of their maximum over a year (DOE). Cost trend: costs fell about 15% per year in one long study (Way et al. 2022), and installed costs fell 87% since 2010 (IRENA).
- **Big fact panel:** "In 2025 the world added 647 GW of solar, more than all 443 nuclear reactors in the world combined (about 406 GW). But a gigawatt of solar makes about a quarter of the energy of a gigawatt of nuclear." (Ember; WNA; DOE)

### 8.2 Battery yard
- **World:** white containers in rows. A soft fill bar on each container's side shows charge. Particles flow in during the day and out at night.
- **Inside view (3 zoom levels):** yard → container (racks of modules, a cooling unit, a fire suppression box labeled simply) → one cell. At cell level, lithium ions (small spheres) move from one side to the other on charge, and back on discharge. Interactive: **Charge / Discharge** toggle and a **chemistry** picker (Lithium iron phosphate, NMC lithium, Sodium-ion, Lead-acid) that changes the cell size needed to store the same energy, using the paper's energy density ranges.
- **Two sliders explained plainly:** "Power (GW): how fast it can push energy out. Energy (GWh): how much it holds. A 1 GW, 4 GWh battery can run 1 GW for 4 hours."
- **Trade-offs:** Good: stationary battery packs fell 45% in 2025 to $70/kWh (BNEF). Hard: a whole installed system costs far more than the pack; PNNL put a 100 MW, 4-hour system at $385/kWh (2021 data), and US storage costs per MWh rose about 27% since 2020 (Lazard). Batteries cover hours, not weeks.
- **Round-trip loss:** 100 units in, about 85 out (`assumption`, shown as a few particles fading at the battery).
- **Shipping container count:** "19 GWh ≈ about 4,000 containers" using an assumed ~5 MWh per 20-foot container (`assumption`, `verify`).

### 8.3 Fission reactor (the deepest inside view)

The team wants the reaction itself shown in more scientific detail than PhET's 2D sim, in 3D. This is the showpiece. Facts here are standard textbook nuclear physics (tagged `textbook`) unless they cite the paper.

**World object:** containment dome, turbine hall, optional cooling tower. A small microreactor on a trailer next to it. When running, steady particles leave at a constant rate, day and night, in rain or snow. That steadiness is the visual point.

**Five zoom levels (scroll or click "Go deeper"):**

1. **Plant.** Cutaway of the dome and turbine hall. Labels: reactor, steam generator, turbine, generator, condenser. Three animated loops: hot water loop (orange), steam loop (white), cooling loop (blue). Plain line: "A reactor is a very hot kettle. Splitting atoms makes heat, heat makes steam, steam spins a turbine."
2. **Core.** A grid of fuel assemblies (tall square bundles) in water, with control rods (darker rods) above. Slider: **control rods in / out**. A plain gauge: "Reaction: shrinking · steady · growing."
3. **Fuel assembly.** A bundle of thin fuel rods. One rod opens to show a stack of ceramic pellets. Fact: "Each pellet is about the size of a fingertip." (`textbook`; NEI often says a pellet holds about as much energy as a tonne of coal, tagged `verify` before showing).
4. **Pellet.** Uranium dioxide crystal. Most atoms grey (uranium-238), a few highlighted green (uranium-235, about 3 to 5% in normal reactor fuel). Toggle "HALEU" raises it to 5–20% and explains: "Newer small reactors need fuel with more U-235. Few places make it today. That is why the paper highlights General Matter and American Centrifuge Operating, awarded $900 million to build US supply." (paper)
5. **Atoms: the chain reaction.** A 3D volume (about 300 nuclei, instanced) where the viewer can watch and steer a chain reaction.

**Chain reaction simulation (level 5):**
- Nuclei: U-235 (green spheres) and U-238 (grey spheres), randomly placed in a cube, with water molecules (small light-blue pairs) between them.
- Neutrons: small white spheres with a short fading trail.
- Click anywhere (or press **N**) to fire one neutron in.
- **What happens on a hit with a slow neutron and U-235:** the nucleus wobbles (becomes U-236 for a split second), stretches into a peanut shape, then splits into two smaller nuclei (fission fragments, shown as two different-sized spheres, for example barium and krypton) that fly apart, plus 2 or 3 new neutrons (average about 2.4, `textbook`), plus a flash of heat shown as the surrounding water tinting warmer.
- **Fast versus slow neutrons:** new neutrons start fast (drawn long and stretched). They slow down by bouncing off water (the moderator). Toggle "Remove water" to see that fast neutrons mostly miss U-235 and the reaction fades. Plain text: "Water slows the neutrons down so they are more likely to split the next atom."
- **Control rods:** slider inserts dark rods that absorb neutrons (neutrons hitting a rod disappear with a small dot). This directly controls the count.
- **Criticality meter:** a needle showing the "multiplication number" k (plain label: "new splits caused by each split"). Below 1: shrinking. Exactly 1: steady (this is how a power reactor runs). Above 1: growing. The app explains: "A power reactor is held at exactly 1, so the same amount of heat comes out every second."
- **Delayed neutrons (advanced toggle):** "A small share of neutrons, under 1%, come out seconds later. That delay is what gives operators and control systems time to react." (`textbook`)
- **Energy counter:** "Splits so far: 1,284 · Energy released: ~0.04 nanojoules". Each fission releases about 200 MeV, about 3.2 × 10⁻¹¹ J (`textbook`). A side comparison: "Splitting one uranium atom releases tens of millions of times more energy than burning one carbon atom." (`textbook`)
- **Uranium-238 note:** neutrons absorbed by U-238 turn it (eventually) into plutonium-239, shown as a grey sphere turning purple. Optional, advanced toggle.
- **Safety framing:** avoid weapon framing entirely. If k goes above 1 in the sim, the app shows: "Real reactors are designed so that if they get hotter, the reaction slows down on its own. Control rods also drop in automatically." Don't show explosions.
- **Performance:** at most ~200 neutrons alive at once; if more, cap and show "and many more". Use instanced meshes.

**Microreactor sidebar (Q2 tie-in):** a small reactor on a truck. Card: "Antares Nuclear was the first company in the US Department of Energy's Reactor Pilot Program to reach zero-power criticality (June 4, 2026). Valar Atomics was second (June 18, 2026)." (paper; marked `verify`).

**Moon reactor sidebar:** KRUSTY demonstration (2018): heat pipes carry reactor heat to Stirling engines; Kilopower provides up to 10 kW for at least 10 years. NASA's fission surface power target: 40 kW under six tonnes. 2025 directive: at least 100 kW, ready to launch by late 2029.

**Trade-offs strip:** Good: runs day and night in any weather; the global fleet ran at 83% of maximum in 2024 (WNA), US plants above 92% (DOE). Hard: new US nuclear costs $175 to $255 per MWh (Lazard 2026); Vogtle 3 and 4 (two 1,117 MW reactors) cost more than $30 billion. Long build times.

### 8.4 Fusion lab
- **World:** a glass-roofed building, three machines visible inside. A sign: "Experimental: no fusion plant has put electricity on a grid yet."
- **Inside view:** three stations.
  1. **Tokamak (Commonwealth Fusion Systems style):** a doughnut-shaped chamber with magnet coils. A pink-violet plasma ring circulates. Slider: magnet strength. Plain: "Very strong magnets hold a gas hotter than the Sun's core away from the walls." Fact: Google signed to buy 200 MW from CFS's first ARC plant, expected on the grid in the early 2030s.
  2. **Pulsed machine (Helion style):** a long tube where two plasma rings fire from each end and collide in the middle, then the machine "breathes" out and recovers electricity directly. Fact: Microsoft agreed to buy electricity from Helion in 2028; the Fusion Industry Association's CEO said in 2023 "No one has delivered electricity."
  3. **Laser target (NIF):** 192 beams (drawn as a few dozen thin lines) converge on a tiny capsule. Fact: December 5, 2022, 3.15 MJ of fusion energy out from 2.05 MJ of laser energy in. Advanced toggle: "But the lasers themselves drew far more energy from the grid" (`verify` before showing a number).
- **Reaction view (all three):** deuterium and tritium fuse into helium plus one fast neutron; 17.6 MeV per reaction (`textbook`).
- **Readiness bar:** "Lab proof · Pilot plant · First power on grid · Many plants" with each company's marker. Cost estimate from the paper: tokamak fusion plants estimated at $140 to $550 per MWh.
- **In the City Lab:** fusion is available only when the "Year" control is set to 2035 or later, and is labeled "speculative".

### 8.5 Wind ridge
- Turbines turn at a speed tied to modeled wind. Inside view: nacelle cutaway (blades, gearbox, generator). Interactive: wind speed slider shows power rising steeply (roughly with the cube of wind speed, `textbook`) until a cap.
- Facts: onshore wind $37 to $99 per MWh (Lazard 2026); US wind capacity factor 34.3% (DOE).
- In the model, wind has its own seasonal and random weekly pattern (`assumption`) and drops to near zero during "Windless week".

### 8.6 Gas plant
- Turbine hall plus one stack. When running, faint grey particles rise (carbon dioxide).
- Facts: combined cycle gas $51 to $129 per MWh (Lazard 2026); "lowest-cost dispatchable conventional technology". Runs on command but emits CO₂ (about 0.4 t per MWh, `assumption`, `verify`).
- In the model, gas is the "fill the gap" plant: it runs only when everything else falls short, up to its size. It is on by default only in the "Today" preset, so the viewer can see the CO₂ counter, and off in lessons about low-carbon grids.

### 8.7 Hydro and geothermal (firm, location-limited)
- Dam with reservoir level that drops when used; geothermal well with a hot loop.
- "These are firm too, but only where geography allows. Many places have little of either." In presets, their maximum size depends on the place (`assumption`): e.g., Helsinki has some hydro import, Abu Dhabi none.

### 8.8 Heat storage (Handmer's sand pile)
- A small mound next to the solar farm in the Handmer lesson. Hot air blown in during summer, released as heat for homes in winter.
- Plain: "Storing electricity for months is hard. Storing heat is easy." (Handmer quote) Only reduces the **heating** part of winter home demand in the model, and is marked as an early-stage technology.

---

## 9. Simulation engine

### 9.1 Principles
- Hourly time steps. A full year is 8,760 steps (on Mars, sols; on the Moon, the 29.53-day cycle; in orbit, minute steps over one day).
- Pure TypeScript functions, no React inside the engine. Target: one full year in under 50 ms.
- Deterministic: the same inputs give the same output. Random weather uses a seeded generator (seed shown in the sandbox, editable).
- The 3D view and charts read from the results array at the current time index.

### 9.2 Sunlight model (Earth)
```
declination δ(n) = 23.44° × sin(2π × (284 + n) / 365)          // n = day of year
hour angle  H   = 15° × (solarHour − 12)
cos θz = sin φ sin δ + cos φ cos δ cos H                         // φ = latitude
clearSky(t) = max(0, cos θz) ^ 1.15                              // 0..1, simple air-mass softening
pvOutput(t) = capacityGW × clearSky(t) × trackerGain × weather(t) × derate
```
- `trackerGain`: 1.25 for single-axis tracking at low sun (`assumption`), applied smoothly.
- `weather(t)`: the month's clearness factor times a daily random draw, or the event override (cloudy day = 0.25, cloudy week = 0.2 for 5 days; `assumption`).
- `derate`: 0.85 for losses (`assumption`).
- **Calibration test:** US average is 23.4% (DOE). Abu Dhabi and Phoenix should come out around 24 to 28%, Berlin and London around 10 to 12%, Helsinki around 9 to 11% (`assumption` ranges; adjust the place's clearness factors until they fall inside). Show the computed capacity factor in the solar card.
- Sunrise, sunset and day length come from the same formula and also drive the 3D sun and the city lights.

### 9.3 Sunlight off Earth
- **Orbit (LEO):** period 90 min, shadow 36 min per orbit. Output = full or zero, with a 1-minute fade. Irradiance 1,361 W/m².
- **Orbit (GEO):** full sun except during eclipse seasons around the equinoxes, up to 72 minutes a day (NOAA).
- **Moon equator:** 29.53-day cycle, about 14.5 days of light then about 14.5 days of dark. Irradiance 1,361 W/m² at noon, cos-shaped.
- **Lunar south pole peak:** lit fraction 80% by default; with "Add 10 m mast" switch, 90%. Light comes from low on the horizon all the time; the panels are vertical and rotate.
- **Mars:** day length 24.66 h (`textbook`), irradiance 586.2 W/m² (0.431 × Earth). Dust storm event: output falls to 10% for 30 sols (`assumption`). Panel dust: output drops slowly over time unless "clean panels" is clicked (InSight ran out of power partly from dust; NASA).

### 9.4 Other generators
- **Fission:** runs at 100% of its size whenever on, minus a planned refueling outage of 3 weeks every 18 months if the "realistic outages" switch is on (gives ~92% capacity factor; DOE). Flexible mode (advanced): can drop to 50% when solar floods the grid.
- **Wind:** monthly mean factor per place times a smoothed random series; capped at 1. Target annual capacity factor ~30 to 35% at windy places (DOE US average 34.3%).
- **Gas:** dispatchable, 0 to size, instantly. Emits CO₂ per MWh.
- **Hydro:** dispatchable from a reservoir with a yearly energy budget per place.
- **Geothermal:** constant, like fission, if available at the place.
- **Fusion:** constant like fission, available only for year ≥ 2035, labeled speculative.

### 9.5 Dispatch (who runs when)
Each hour:
```
need = demand(t) after flexible load shifting
1. Must-run supply: solar(t) + wind(t) + fission(t) + geothermal(t) + fusion(t)
2. If supply ≥ need:
     surplus = supply − need
     charge battery with min(surplus, batteryPowerGW, roomLeft / η_charge)
     anything left over = curtailed ("wasted sun")
     (Industry Quarter: flexible industries absorb curtailed energy first if switched on)
3. If supply < need:
     gap = need − supply
     discharge battery: min(gap, batteryPowerGW, stored × η_discharge)
     then hydro, then gas, up to their sizes (or user schedule)
     then flexible data center pause (if on)
     anything still missing = unserved energy → blackout
4. Battery self-discharge: ignore (state as a simplification).
```
- Round-trip efficiency 85% (split as √0.85 on charge and on discharge; `assumption`).
- Blackout priority: shed districts in a fixed order (data center flexible part, then factory, then shops, then homes last). This order is a model choice and is labeled as one.

### 9.6 Outputs (per hour and totals)
- Supply by source, demand by district, battery state of charge, curtailed energy, unserved energy, CO₂.
- **Lights on:** share of hours with no unserved energy. Also "longest blackout" in hours.
- **Cost per MWh delivered** (section 9.7).
- **Overbuild ratio:** total installed generation and storage power divided by peak demand. Links to Sepulveda et al.: without firm power, zero-carbon systems needed **5 to 8 times** peak demand in capacity, versus **1.3 to 2.6 times** with firm power. The dashboard shows the user's own ratio next to those bands.

### 9.7 Cost model
**A. Simple (default in lessons): Lazard range per source.** Each source has a low and high cost per MWh (Lazard 2026). The dashboard shows the energy-weighted cost of what the city actually used, with a low–high band. Curtailed energy still costs money: cost is divided by **energy used**, not energy made, so overbuilding visibly raises cost per useful MWh. This is the key honest point.

**B. Build-cost model (City Lab "Advanced costs"):**
```
annual cost of a plant = capex × CRF(r, life) + fixed O&M + fuel × energy
CRF(r, n) = r(1+r)^n / ((1+r)^n − 1)
cost per MWh = Σ annual costs / energy delivered to the city
```
| Item | Default | Range on slider | Note |
|---|---|---|---|
| Solar, installed | $1,000/kW | $300–1,500 | |
| Battery, installed | $300/kWh | $100–450 | PNNL: $385/kWh (2021 data), $291/kWh by 2030 for 100 MW 4 h LFP |
| Fission, overnight | $10,000/kW | $3,000–14,000 | Vogtle 3 & 4: >$30B / 2,234 MW ≈ $13,400/kW (our division) |
| Fission O&M + fuel | $14 + $10 /MWh | fixed | from the paper's calculator |
| Cost of capital | 7% | 3–12% | |
| Lives | solar 25 y, battery 15 y, fission 40 y | fixed | paper's calculator |
| Surplus solar sold at | $0/MWh | $0–40 | tests Handmer's overbuild |

- Footnote always visible under the cost scorecard: "Generation cost only. Delivering power (wires, poles, substations) adds a lot on top. At one large US utility, generation's share of costs fell from 69% to 54% in a decade as delivery's share rose (EIA 2017)."
- **Home bill equivalent:** cost per MWh × 0.9 MWh per month (`assumption` ≈ average US home; EIA, `verify`) = "about $X a month for a typical home's power, before delivery charges".

### 9.8 Validation checks (unit tests)
1. **Abu Dhabi benchmark:** Abu Dhabi preset, flat 1 GW demand, 5.2 GW solar, 19 GWh battery with 1.5 GW power: lights on ≥ 99% of hours across the year. If it fails, adjust solar calibration, not the benchmark.
2. **Capacity factor:** 1 GW fission over a year with outages ≈ 8.0 TWh (92%). 1 GW US-average solar ≈ 2.0 TWh (23.4%). Ratio ≈ 0.25.
3. **Lunar night:** 1 kW for 350 h needs 350 kWh; at 200 Wh/kg that is 1,750 kg (paper).
4. **Helsinki December, solar + 24 h of battery, no firm:** unserved energy > 20% of December.
5. **Energy conservation:** each hour, supply + battery discharge = demand served + battery charge + curtailed (within 1e-6).

---

## 10. Q2 module: Reactor Row (can fission or fusion reach scale?)

Located beside the reactor hall. Answers: will fission or fusion reach nth-of-a-kind deployment, which companies pull ahead, what capital stack pays for it, and will utilities adopt it.

### 10.1 Plain framing (shown on entry)
"First-of-a-kind means the first one ever built. It is slow and expensive because everything is new. Nth-of-a-kind means the tenth or hundredth copy. If builders get better each time, the price falls. Our paper's view: fission is much closer to this than fusion. Fission physics is proven; the hard parts are building and permits. Fusion has not yet put power on a grid."

### 10.2 Build-the-next-one machine
- A row of empty building pads. Button: **Build the next reactor**. Each click raises a reactor on the next pad with a price tag above it.
- **Three country paths** (switch above the row):
  - **US history:** each new reactor costs more than the last (cost escalation). Fact: in US plants, "soft" factors outside the reactor hardware, such as labor supervision, caused over half of the cost rise from 1976 to 1987 (Eash-Gates et al. 2020).
  - **France:** even France's successful build-out saw rising real costs, a case of "negative learning" (Grubler 2010).
  - **South Korea:** costs fell over time (Lovering et al. 2016).
  - **Your choice:** a learning-rate slider from −10% to +20% per doubling.
- The tag on reactor 1 starts at the first-of-a-kind cost (default $13,400/kW, the Vogtle division). The curve uses Wright's law (section 12.2). A dotted line shows the $3,000/kW mark with the paper's note: "At about $3,000/kW, fission competes almost everywhere in our model."
- After each build, the City Lab cost of fission updates if the viewer switches "Use Reactor Row price" on.

---

# [ADDENDUM] Sections reconstructed by the lead engineer

## 10.3 Capital stack tower  [ADDENDUM]
Blocks of money stacked under a reactor, one block per stage, labeled by who pays, heights proportional to dollars (model assumption, `assumption`):
1. **Design and licensing** — venture capital and founders (highest risk, wants the biggest return).
2. **First-of-a-kind build** — government grants, cost-share and loan guarantees (e.g. DOE programs), plus strategic investors.
3. **Fuel supply** — government contracts (e.g. the $900M HALEU awards).
4. **Early fleet** — customers who sign long-term power purchase agreements (tech companies buying for data centers: Google with Kairos/CFS, Microsoft with Helion and Three Mile Island restart, Amazon with X-energy).
5. **Nth-of-a-kind** — utilities and infrastructure funds with cheap debt (low risk, low return).
A slider "How many reactors built" moves the stack: as the count grows, the risky top blocks shrink and cheap debt dominates, and the cost of capital falls. Plain line: "Who pays for the first ones decides who wins."

## 10.4 Will utilities adopt it?  [ADDENDUM]
A small card: utilities are regulated and rewarded for reliability, not risk; they usually wait for the third or fourth copy. Data-center buyers move faster because getting connected matters more to them than the price of power (Epoch AI: power ~ $0.6B/yr vs servers ~ $5B for 1 GW).

## 11. Lessons  [ADDENDUM]
Ten lessons. Each lesson = list of steps. A step has: instruction text, optional prediction (2–3 choices + the explanation shown after), a `check(state)` that detects when the viewer did it, an "after" explanation, a `setup(state)` that sets plants/place/time and which controls are visible, and an optional camera target.

1. **A gigawatt is not a gigawatt** (Q1, 2 min). Same 1 GW of solar vs 1 GW of reactor. Scrub through a day and a year; compare energy made. Aha: solar makes about a quarter of the energy (23.4% vs 92%). Fact panel: 647 GW solar added in 2025 vs ~406 GW for all reactors.
2. **The night** (Q1, 2 min). Solar only, then turn off the battery, drag clock to 10 PM: lights go out. Turn the battery back on: lights stay on. Two sliders explained (GW vs GWh).
3. **Rebuild Abu Dhabi** (Q1, 2 min). Set 5.2 GW solar and 19 GWh of batteries; run a year. Lights on ≥ 99%. A real project does this today.
4. **Move the city north** (Q1, 2 min). Same setup, move to Helsinki in December. Predict first. Lights fail for days. Aha: "It is not where the sun is strongest that matters, it is how long the darkness lasts."
5. **Dark doldrums and firm power** (Q1/Q2, 3 min). Berlin, December windless week. Add a firm layer (reactor/geothermal/hydro). Overbuild ratio meter vs Sepulveda bands (5–8× without firm, 1.3–2.6× with firm).
6. **Build like Casey Handmer** (Q1, 2 min). Press the overbuild button: 10× solar + big battery. Lights mostly on, but huge wasted sun; cost per useful MWh rises unless surplus is sold or used (heat storage, industry).
7. **Beyond Earth** (Q1, 2 min). Moon equator: 350 h night → 1,750 kg of batteries per kW. South pole peak: lit 80–90%. Mars dust storm. Aha: off Earth, a small reactor (Kilopower/FSP) wins where the night is long.
8. **Inside the reactor** (Q2, 3 min). Opens the reactor inside view, chain reaction level; steer k to 1 with control rods; remove water. Then Reactor Row: build 10 reactors on the US path vs Korea path; capital stack.
9. **The battery factory** (Q3, 2 min). Double production several times; cell price falls along the learning curve; installed system price falls slower. Bottlenecks list.
10. **When power is nearly free** (Q4, 2 min). Industry Quarter: turn the price dial from $100 to $1/MWh; watch which buildings grow. Aha: industries that can store their product and run when power is cheap win the most.

## 12. Battery Factory  [ADDENDUM]
### 12.1 What you see
A factory with a conveyor carrying battery packs to a price board. Buttons: "Double total production", "Reset". Chemistry picker (LFP, NMC, Sodium-ion). Two price lines: **cell/pack price** (falls fast) and **installed system price** (falls slowly because of grid connection, land, labor, permits, inverters, which do not follow the cell curve).
### 12.2 Wright's law
`price(Q) = price0 × (Q / Q0)^(−b)`, where `learningRate = 1 − 2^(−b)`; each doubling of cumulative production cuts price by the learning rate. Battery pack learning rate default 18% per doubling (`assumption`, literature commonly cites ~18–20%; `verify`). Solar module learning rate from Handmer's chart: 26% overall, 48% production-weighted since 2007. Starting pack price $70/kWh stationary (BNEF 2025). Installed system: pack is ~1/3 to 1/2 of the installed cost (`assumption`); the non-pack part learns at ~5% per doubling (`assumption`).
### 12.3 Bottlenecks panel
Plain cards: grid connection queues (years of waiting), materials (lithium, graphite, and cathode supply concentrated in a few countries), permits and local approval, fire codes and safety, transformers and switchgear shortages. Each with a short line and source tag (`verify` where uncertain).

## 13. Industry Quarter  [ADDENDUM]
A big price dial from $100 to $1 per MWh (log scale). Four buildings react, each grows/lights up when its break-even is crossed:
1. **Aluminum smelter** (energy is a large share of cost; runs flat; benefits strongly). ~14 MWh per tonne (`textbook`/`verify`).
2. **Data center** (energy a small share vs servers; benefits little from price, a lot from fast connection).
3. **Green hydrogen and ammonia plant** (electrolyzer ~50–55 kWh per kg H₂, `verify`; can store product; runs when power is cheap; becomes competitive with gas-made hydrogen at ~$20/MWh or below, `assumption`).
4. **Desalination / direct air capture** (store water/CO₂; flexible; "becomes possible" at very low prices).
Each building card shows: "energy share of cost", "can it store its product and run only when power is cheap?", and cost of product at the dial price. Toggle "Use the city's wasted sun" links to dispatch (industries absorb curtailment).

## 14. Visual style and design tokens  [ADDENDUM]
- Background (UI panels): `--panel: rgba(250, 249, 246, 0.82)` with `backdrop-filter: blur(14px)`; border `--line: rgba(20, 24, 28, 0.10)`; radius 14px; shadow `0 6px 24px rgba(20,24,28,0.08)`.
- Ink `--ink: #1d2227`, secondary ink `--ink-2: #5b636b`, faint `--ink-3: #8b939a`.
- Page background `--bg: #eef0ee`.
- Accent (primary buttons, focus): `--accent: #1f5f8b`.
- Font: Inter (bundled via @fontsource), sizes 12/13/15/18/24/40. Numbers use `font-variant-numeric: tabular-nums`.
- **Source colors** (used everywhere, in `src/data/colors.ts`): solar `#E0A526` (warm amber), wind `#5FA8A0` (sea green), fission `#7B61C9` (violet), fusion `#D46FA0` (rose), gas `#8A8178` (warm grey), hydro `#3D7DCA` (blue), geothermal `#C2643A` (rust), battery `#3BA272` (green; battery discharge), unserved `#2B2F33` (near-black), curtailed `#F2D58A` (pale amber).
- 3D: matte `meshStandardMaterial` (roughness 0.85–1, metalness 0–0.1), one directional sun light with soft shadows (PCFSoft), hemisphere fill light, fog for depth. No bloom, no emissive except city windows at night (soft, low intensity).
- Icons: simple inline SVG strokes (1.5px). No emoji.

## 15. Accessibility  [ADDENDUM]
Full keyboard control (see shortcuts), visible focus rings, `aria-label`s on all controls, an `aria-live="polite"` text summary of the dashboard ("Lights on. Using 1.02 GW. Solar 60%, battery 40%."), `prefers-reduced-motion` respected (fewer particles, no camera flights — cut instead), contrast AA for text.

## 16. Keyboard shortcuts  [ADDENDUM]
W A S D / arrows: walk · Shift: faster · Mouse drag: look · M: map view · 1–0: jump to station · E: look inside · Esc: close/back · Space: play/pause · [ and ]: step one hour · P: presenter mode · F: fullscreen · S: screenshot · N: fire neutron (reactor view) · Page Up/Down: presenter script steps · ?: help overlay.

## 17. Tech stack  [ADDENDUM]
Vite 5 + React 18 + TypeScript (strict). Three.js via @react-three/fiber 8 and @react-three/drei 9. State via zustand 4 (`src/store.ts`). Charts are hand-written SVG (no chart library). Tests with vitest. No backend, no runtime network.

## 18. File layout  [ADDENDUM]
```
src/
  main.tsx, App.tsx, store.ts, types.ts
  styles/ tokens.css, base.css
  data/ facts.ts (registry, merges facts/*), facts/*.ts, sources.ts, colors.ts, places.ts, loadShapes.ts, presets.ts, glossary.ts
  engine/ types.ts, sun.ts, offworld.ts, weather.ts, rng.ts, demand.ts, dispatch.ts, cost.ts, simulate.ts, learning.ts, __tests__/
  world/ WorldCanvas.tsx, layout.ts, Island.tsx, City.tsx, SkyAndSun.tsx, PowerLines.tsx, EnergyParticles.tsx, CameraRig.tsx, Signs.tsx, plants/*.tsx
  ui/ TopBar.tsx, PlantPanel.tsx, PlantCard.tsx, DemandPanel.tsx, BottomBar.tsx, TimeDial.tsx, PlayControls.tsx, PlacePicker.tsx, SourcesDrawer.tsx, Fact.tsx, Why.tsx, useKeyboard.ts, dashboard/*
  inside/ InsideView.tsx (router), reactor/*, solar/*, battery/*, fusion/*, wind/*, gas/*, hydro/*
  lessons/ lessons.ts, LessonCard.tsx, LessonPicker.tsx, demoScript.ts
  screens/ TitleScreen.tsx
  tools/ BatteryFactory.tsx, IndustryQuarter.tsx, ReactorRow.tsx, CapitalStack.tsx, BeyondEarthPanel.tsx
```

## 19. Copy guide and glossary  [ADDENDUM]
- Short sentences. Active voice. Say "power plant", "battery", "split atoms", "wasted sun", "always-on power".
- First plain, then "The real term is …" in smaller ink-2 text. Examples: "Always-on power. The real term is *firm* or *baseload* power." · "Wasted sun. The real term is *curtailment*." · "How much of its maximum a plant makes over a year. The real term is *capacity factor*." · "Price falls each time total production doubles. The real term is a *learning rate* (Wright's law)." · "New splits caused by each split. The real term is the *multiplication factor, k*." · "First-of-a-kind (FOAK) / Nth-of-a-kind (NOAK)." · "Dark doldrums. The real term is *Dunkelflaute*."
- Units: always write "GW" with "(how fast)" and "GWh" with "(how much)" the first time on a screen.
- Never: "revolutionary", "game-changing", exclamation marks, emoji.

## 20. Facts registry  [ADDENDUM]
All numbers in section 1–10 and the addendum, each with `{ value, unit, label, source, status }` where status ∈ `cited | textbook | assumption | verify`. See `src/data/facts.ts`.

## 21. Sources  [ADDENDUM]
Source keys used in facts (see `src/data/sources.ts`): handmer2025 (Casey Handmer, Energy predictions 2025), ember2025, wna2025 (World Nuclear Association), doeCF (US DOE capacity factors), lazard2026 (Lazard LCOE+ 2026), way2022 (Way et al. 2022, Joule), irena (IRENA Renewable Power Generation Costs), bnef2025 (BloombergNEF battery price survey 2025), pnnl2022 (PNNL Energy Storage Cost and Performance Database), iea2025 (IEA Energy and AI), lbnl2024 (DOE/LBNL 2024 data center report), epoch2026 (Epoch AI), sepulveda2018 (Sepulveda et al. 2018, Joule), eashgates2020 (Eash-Gates et al. 2020, Joule), grubler2010 (Grubler 2010, Energy Policy), lovering2016 (Lovering et al. 2016, Energy Policy), eia2017, nasaKilopower, nasaFSP, noaaGoes, nasaInsight, nif2022 (LLNL), fia2023, norris2025, doeHaleu, paper (the team's paper), textbook, assumption. PhET: phet.colorado.edu (research and design guide).

## 22. Build order and must-ship cut  [ADDENDUM]
**Must ship (end to end first):** title screen → world with island, city, solar, battery, reactor, gas; time dial + play; place picker (Earth + Moon + Mars); plant cards; dashboard with now-bar, area chart, battery gauge, three scorecards; energy particles; lessons 1–4; reactor chain reaction (level 5).
**Then:** remaining lessons, all inside views, Reactor Row + capital stack, Battery Factory, Industry Quarter, Beyond Earth panel, compare mode, presenter mode, screenshot.
**Hallway test:** 10 minutes with a non-technical friend before submission.

## 23. Presenter demo script (3 minutes)  [ADDENDUM]
1. Title at dusk: "Solar is cheap. Night is long."
2. City Lab, Abu Dhabi, Today preset with gas off: 5.2 GW solar + 19 GWh battery. Play a day: particles flow solar → battery → city. Lights on 99%+.
3. Move to Helsinki, December. Lights fail. "It's the length of the night."
4. Add 0.6 GW of fission. Lights back on; overbuild ratio drops into the "with firm power" band; cost shown.
5. Open the reactor: chain reaction, hold k at 1.
6. Reactor Row: build 10 on the Korea path vs US path; FOAK → NOAK.
7. Battery Factory: double production 4×; cell vs system price.
8. Industry Quarter: dial to $10/MWh; hydrogen and aluminum light up.
9. Moon equator: 350-hour night → 1,750 kg of batteries per kW; reactor wins off Earth.
10. Close: "Cheap solar and batteries everywhere; firm power as insurance sized to the length of the night."
