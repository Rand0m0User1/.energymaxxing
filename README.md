# The Length of the Night

*How much darkness can a city survive?*

A walkable 3D model city where you switch power plants on and off, move the city from Abu Dhabi to Helsinki to the Moon, scrub through a day and a year, and watch energy flow as moving particles — so you can see for yourself why the length of the night decides the energy mix.

Team **Energymaxxing** (Aleksander Kurgan, Brad Wu, Belle Zhou, Munich Limapichat) · Stanford BASES Six Hour Challenge, Energy sector · October 24, 2026. Inspired by PhET Interactive Simulations (University of Colorado Boulder).

## Run it

```bash
npm install
npm run dev
# open http://localhost:5173
```

No backend, no API keys, no network calls at runtime. All 3D models are built from code.

Other commands: `npm test` (engine validation tests), `npm run build` (typecheck + production build into `dist/`), `node scripts/smoke.mjs [url] [outDir]` (headless Edge walkthrough with screenshots).

## What's inside

| Place | What it answers |
|---|---|
| **Guided Tour** — ten short lessons, each exposing only 1–3 controls | All four challenge questions, in order |
| **The World** — walk (WASD) or fly (M for map view) around an island of power plants; press E to look inside | How each source works |
| **City Lab** — every control unlocked, live dashboard, compare mode, advanced costs | Q1, Q2 |
| **Beyond Earth** — the same engine in orbit, on the Moon and on Mars; cost turns into launch mass | Q1 (second half) |
| **Reactor Row**, **Battery Factory**, **Industry Quarter** | Q2, Q3, Q4 |

The thesis: cheap solar and batteries become the main source of energy almost everywhere, and a firm, always-on layer (fission, geothermal, hydro, later maybe fusion) is insurance whose size depends on how long the night is.

## Keyboard

W A S D / arrows walk · Shift faster · drag to look · M map view · 1–0 jump to a station · E look inside · Esc back · Space play/pause · [ ] step an hour · P presenter mode (Page Up/Down steps the demo script) · F fullscreen · S screenshot · N fire a neutron (reactor view) · ? help

## Code map

- `src/engine/` — pure TypeScript simulation: sun geometry (Earth, orbit, Moon, Mars), seeded weather, demand shapes, hourly dispatch, cost model. Tests in `src/engine/__tests__/` cover the spec's validation checks (Abu Dhabi benchmark, capacity factors, lunar night, Helsinki winter, energy conservation).
- `src/data/facts.ts` — **every number shown in the app**, each with a source and a status (`cited`, `textbook`, `assumption`, `verify`). Assumptions show a "model assumption" tag in the UI. Sources are in `src/data/sources.ts`.
- `src/store.ts` — app state (zustand); the simulation recomputes synchronously on every change.
- `src/world/` — the 3D island (react-three-fiber): sky and sun, city, power lines, energy particles, camera (orbit, map, walk), plant models in `src/world/plants/`.
- `src/ui/` — panels, time dial, place picker, sources drawer, keyboard shortcuts; `src/ui/dashboard/` — live charts and scorecards.
- `src/inside/` — cutaway views; `src/inside/reactor/` is the five-level fission view with the interactive chain reaction.
- `src/lessons/` — the ten-lesson Guided Tour, title screen and presenter script.
- `src/tools/` — Reactor Row and capital stack, Battery Factory, Industry Quarter, Beyond Earth panel.
- `docs/SPEC.md` — the full build spec.

## Honesty notes

The model is deliberately simple: hourly steps, a clear-sky sun model with monthly cloudiness factors, a single battery, no transmission limits, generation cost only (delivery costs are extra and the app says so). Numbers marked "model assumption" are our choices, not measurements. The island is not to scale.
