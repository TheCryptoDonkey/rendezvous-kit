# CLAUDE.md — rendezvous-kit

TypeScript library for finding fair meeting points using isochrone intersection, venue search, and fairness scoring. Only runtime dependency is `geohash-kit` (ours). Zero third-party dependencies.

## Conventions

- **British English** everywhere — favour, colour, behaviour, licence, initialise, metre
- **Only dependency: geohash-kit (ours)** — uses its pointInPolygon, GeoJSON types, distance utilities
- **Git:** commit messages use `type: description` format. Do NOT include `Co-Authored-By` lines.
- **TDD:** write failing test first, then implement
- **ESM-only** with `.js` extensions in imports
- **TypeScript strict mode** — no `any`, no implicit returns
- **GeoJSON coordinates:** [longitude, latitude] (GeoJSON standard, NOT [lat, lon])

## Project structure

```
src/
  types.ts              — shared TypeScript interfaces
  geo.ts                — polygon operations (intersection, area, bbox, centroid)
  engines/
    openrouteservice.ts — ORS adapter (isochrone + matrix)
    valhalla.ts         — Valhalla adapter (isochrone + matrix)
    graphhopper.ts      — GraphHopper adapter (isochrone + matrix)
    osrm.ts             — OSRM adapter (matrix only, no isochrone)
  venues.ts             — Overpass API venue search
  rendezvous.ts         — findRendezvous pipeline (the main event)
  index.ts              — barrel re-export
```

## Build & test

```bash
npm run build      # tsc → dist/
npm test           # vitest run
npm run typecheck  # tsc --noEmit
```
