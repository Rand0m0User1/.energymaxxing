# The Length of the Night: spec

**Team:** Energymaxxing (Aleksander Kurgan, Brad Wu, Belle Zhou, Munich Limapichat)
**Event:** Stanford BASES Six Hour Challenge, Energy sector, October 24, 2026

## Idea

Solar is cheap, but it stops at night. The longer the night, the more always-on power a city needs. The sim lets you see that for yourself.

## What the user sees

- A 3D island with one city and its power plants: solar, wind, batteries, nuclear, gas.
- One home panel on the left with every control.
- Click a plant to see one sentence about it and switch it on or off.

## What the user can change

Only these:

| Control | Options |
|---|---|
| Place | Earth or Moon (the same city) |
| Season | Spring, Summer, Fall, Winter (Earth only) |
| Time of day | 0–24 slider, with play/pause |
| Power sources | On/off. Earth: Solar, Wind, Batteries, Nuclear, Gas. Moon: Solar, Batteries, Nuclear |

Plant sizes are fixed. Skies are clear, so the season and the time of day are the only things that change the sunlight.

## What the panel shows

- **Status:** Lights on or Blackout, where the power comes from now, and the battery level.
- **Day strip:** 24 cells, each coloured by its main source, dark when the city is out.
- **One summary line:** how much of the day the lights stayed on.

## Tours

1. **Day and night (Earth).** Solar works at noon and fails at night. Batteries carry the night in summer, but run out in winter. Nuclear keeps the lights on in every season.
2. **The Moon.** A Moon day lasts about a month. Batteries last about a day of the two-week night. Nuclear keeps the base lit.

## Model

- The city uses about 1 GW on average, with an evening peak and more heating in winter.
- Fixed sizes: solar 5.2 GW, wind 1.5 GW, batteries 2 GW / 19 GWh, nuclear 1.3 GW, gas 1.6 GW.
- Earth uses a northern European latitude. Seasons use the solstices and equinoxes.
- Each hour, the model runs the plants that are on, charges the batteries with any extra power, and drains them when there is too little. Gas fills any gap left. Whatever is still missing is a blackout.
- Tests in `src/__tests__/` check that the tours' claims hold.
