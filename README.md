# Energymaxxing

*How much darkness can a city survive?*

A 3D city you can power with solar, wind, batteries, nuclear and gas. Change the season and the time of day, or move the city to the Moon, and watch when the lights go out.

Team Energymaxxing (Aleksander Kurgan, Brad Wu, Belle Zhou, Munich Limapichat) · Stanford BASES Six Hour Challenge, Energy.

## Run it

```bash
npm install
npm run dev     # open http://localhost:5173
```

`npm test` runs the model tests. `npm run build` makes a production build in `dist/`.

## Deploy to Vercel

Import the repo on vercel.com, or run `vercel --prod`. Vercel detects Vite: build `npm run build`, output `dist`.

## Code

- `src/store.ts`: app state (place, season, time, which plants are on).
- `src/sim.ts`: turns the model's output into what the panel shows.
- `src/engine/`: the hourly power model.
- `src/world/`: the 3D island.
- `src/ui/`: the home panel, title screen and tours.
- `docs/SPEC.md`: the spec.
