# rendezvous-kit

**Find fair meeting points for N people — isochrone intersection, venue search, and fairness scoring.**

[![npm](https://img.shields.io/npm/v/rendezvous-kit)](https://www.npmjs.com/package/rendezvous-kit)
[![licence](https://img.shields.io/npm/l/rendezvous-kit)](https://github.com/TheCryptoDonkey/rendezvous-kit/blob/main/LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-native-blue)
[![Nostr](https://img.shields.io/badge/Nostr-Zap%20me-purple)](https://primal.net/p/npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2)

**[Live Demo →](https://thecryptodonkey.github.io/rendezvous-kit)**

### How it works

```
  Alice (London)        Bob (Bristol)        Carol (Birmingham)
       ╲                     │                     ╱
    isochrone            isochrone            isochrone
       ╲                     │                     ╱
        ╲────────── intersection ──────────╱
                         │
                   venue search
                         │
                  fairness scoring
                         │
                 ranked suggestions
```

Geographic midpoint tools find the centre of a triangle. **rendezvous-kit finds where everyone can actually get to** — using real road networks, travel times, and venue availability.

## Why rendezvous-kit?

- **Full pipeline** — isochrone computation → polygon intersection → venue search → fairness scoring, all in one library
- **Engine-agnostic** — bring your own routing engine: Valhalla, OpenRouteService, GraphHopper, or OSRM
- **Fairness strategies** — `min_max` (minimise worst case), `min_total` (minimise sum), `min_variance` (equalise travel times)
- **Built on geohash-kit** — leverages our spatial primitives; only runtime dependency
- **Zero third-party dependencies** — ships with a pure-TypeScript Sutherland–Hodgman polygon intersection, Overpass API venue search, and all engine adapters

## Use Cases

- **Social apps** — "Meet in the middle" features for groups of friends picking a pub, café, or restaurant
- **Ride-sharing** — optimal pickup points that minimise detour for all passengers
- **Event planning** — conference venues fair to attendees from multiple cities
- **Corporate** — office locations that balance commute times across a distributed team
- **Delivery logistics** — hub placement that minimises worst-case last-mile distances
- **Emergency services** — staging areas reachable by multiple response units within a time budget

## Compared to Alternatives

| Capability | Geographic midpoint libraries | Commercial APIs (Targomo, TravelTime) | rendezvous-kit |
|---|---|---|---|
| Travel-time aware | No — straight-line distance only | Yes | Yes |
| Multi-person intersection | No | Yes (API key + billing) | Yes (self-hosted, free) |
| Fairness weighting | No | No | Yes — 3 strategies |
| Venue search included | No | No | Yes — via Overpass API |
| Engine-agnostic | N/A | No — vendor lock-in | Yes — 4 engines |
| Works offline/self-hosted | N/A | No | Yes (with local Valhalla/OSRM) |

rendezvous-kit is the only open-source library that combines isochrone intersection, venue discovery, and fairness scoring in a single pipeline.

## Install

```bash
npm install rendezvous-kit
```

## Quick Start

```typescript
import { findRendezvous } from 'rendezvous-kit'
import { ValhallaEngine } from 'rendezvous-kit/engines/valhalla'

const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })

const suggestions = await findRendezvous(engine, {
  participants: [
    { lat: 51.5074, lon: -0.1278, label: 'Alice' },  // London
    { lat: 51.4545, lon: -2.5879, label: 'Bob' },    // Bristol
    { lat: 52.4862, lon: -1.8904, label: 'Carol' },  // Birmingham
  ],
  mode: 'drive',
  maxTimeMinutes: 90,
  venueTypes: ['cafe', 'restaurant'],
  fairness: 'min_max',
  limit: 5,
})

for (const s of suggestions) {
  console.log(`${s.venue.name} — score: ${s.fairnessScore.toFixed(1)} min`)
  console.log('  Travel times:', s.travelTimes)
}
```

## Engine Support

| Engine | Isochrone | Route Matrix | Auth |
|--------|:---------:|:------------:|------|
| Valhalla | Yes | Yes | None (self-hosted) |
| OpenRouteService | Yes | Yes | API key |
| GraphHopper | Yes | Yes | API key (optional) |
| OSRM | No | Yes | None (self-hosted) |

OSRM does not support isochrone computation — use it only when you need a fast route matrix and are supplying your own intersection polygon.

## Fairness Strategies

| Strategy | Optimises | Use when... |
|----------|-----------|-------------|
| `min_max` | Worst-case travel time | You want nobody to travel excessively |
| `min_total` | Sum of all travel times | You want minimum total travel for the group |
| `min_variance` | Variance in travel times | You want everyone to travel roughly equally |

## API Reference

### Core function

| Function | Description |
|----------|-------------|
| `findRendezvous(engine, options)` | Run the full pipeline and return ranked suggestions |

### Geometry (`rendezvous-kit/geo`)

| Function | Description |
|----------|-------------|
| `intersectPolygons(polygons)` | Sutherland–Hodgman N-polygon intersection; returns largest component or `null` |
| `intersectPolygonsAll(polygons)` | N-polygon intersection preserving all disconnected components; returns `GeoJSONPolygon[]` |
| `boundingBox(polygon)` | Compute `BBox` (minLon, minLat, maxLon, maxLat) |
| `centroid(polygon)` | Geometric centre as `{ lat, lon }` |
| `polygonArea(polygon)` | Area in square metres |
| `circleToPolygon(centre, radiusMetres, segments?)` | Approximate a circle as a GeoJSON Polygon (default 64 segments) |
| `getDestinationPoint(start, distanceMetres, bearingDeg)` | Haversine destination point from `[lon, lat]`, distance, and bearing |

### Engines

| Class | Import path | Constructor |
|-------|-------------|-------------|
| `ValhallaEngine` | `rendezvous-kit/engines/valhalla` | `{ baseUrl }` |
| `OpenRouteServiceEngine` | `rendezvous-kit/engines/openrouteservice` | `{ apiKey, baseUrl? }` |
| `GraphHopperEngine` | `rendezvous-kit/engines/graphhopper` | `{ baseUrl, apiKey? }` |
| `OsrmEngine` | `rendezvous-kit/engines/osrm` | `{ baseUrl }` |

### Venues (`rendezvous-kit/venues`)

| Function | Description |
|----------|-------------|
| `searchVenues(polygon, venueTypes, overpassUrl?)` | Search Overpass API within polygon bounding box |

### Types

| Type | Shape |
|------|-------|
| `LatLon` | `{ lat, lon, label? }` |
| `GeoJSONPolygon` | Standard GeoJSON polygon geometry |
| `TransportMode` | `'drive' \| 'cycle' \| 'walk' \| 'public_transit'` |
| `FairnessStrategy` | `'min_max' \| 'min_total' \| 'min_variance'` |
| `VenueType` | `'park' \| 'cafe' \| 'restaurant' \| 'service_station' \| 'library' \| 'pub' \| 'playground' \| 'community_centre' \| string` |
| `RoutingEngine` | Interface — `computeIsochrone` + `computeRouteMatrix` |
| `Isochrone` | `{ origin, mode, timeMinutes, polygon }` |
| `MatrixEntry` | `{ originIndex, destinationIndex, durationMinutes, distanceKm }` |
| `RouteMatrix` | `{ origins, destinations, entries }` |
| `Venue` | `{ name, lat, lon, venueType, osmId? }` |
| `RendezvousOptions` | `{ participants, mode, maxTimeMinutes, venueTypes, fairness?, limit? }` |
| `RendezvousSuggestion` | `{ venue, travelTimes, fairnessScore }` |
| `BBox` | `{ minLon, minLat, maxLon, maxLat }` |
| `Coordinate` | `{ lat, lon }` |

## Subpath Exports

```typescript
import { findRendezvous } from 'rendezvous-kit'                          // barrel
import { intersectPolygons, intersectPolygonsAll, centroid,
         circleToPolygon, getDestinationPoint } from 'rendezvous-kit/geo' // geometry
import { ValhallaEngine } from 'rendezvous-kit/engines/valhalla'
import { OpenRouteServiceEngine } from 'rendezvous-kit/engines/openrouteservice'
import { GraphHopperEngine } from 'rendezvous-kit/engines/graphhopper'
import { OsrmEngine } from 'rendezvous-kit/engines/osrm'
import { searchVenues } from 'rendezvous-kit/venues'
import { findRendezvous } from 'rendezvous-kit/rendezvous'               // same as barrel
```

## Pipeline

`findRendezvous` runs six steps:

1. **Isochrones** — compute a reachability polygon for each participant
2. **Intersection** — intersect all polygons using Sutherland–Hodgman (supports concave shapes and disconnected components)
3. **Venue search** — query Overpass API within the intersection's bounding box
4. **Route matrix** — compute travel times from every participant to every candidate venue
5. **Filtering** — remove venues where any participant exceeds the time budget or is unreachable
6. **Scoring** — apply the fairness strategy to produce a single score per venue
7. **Ranking** — sort by score ascending and return the top `limit` suggestions

If the isochrones do not overlap, `findRendezvous` returns an empty array. If no venues are found, it falls back to the geometric centroid of the intersection.

## Implementing a Custom Engine

```typescript
import type { RoutingEngine, LatLon, TransportMode, Isochrone, RouteMatrix } from 'rendezvous-kit'

class MyEngine implements RoutingEngine {
  readonly name = 'MyEngine'

  async computeIsochrone(origin: LatLon, mode: TransportMode, timeMinutes: number): Promise<Isochrone> {
    // call your API and return an Isochrone
  }

  async computeRouteMatrix(origins: LatLon[], destinations: LatLon[], mode: TransportMode): Promise<RouteMatrix> {
    // call your API and return a RouteMatrix
  }
}
```

## Companion Library

**geohash-kit** — spatial primitives (pointInPolygon, GeoJSON types, distance utilities) used internally by rendezvous-kit.

- npm: [`geohash-kit`](https://www.npmjs.com/package/geohash-kit)
- GitHub: [`TheCryptoDonkey/geohash-kit`](https://github.com/TheCryptoDonkey/geohash-kit)

## For AI Assistants

See [llms.txt](./llms.txt) for a concise API summary, or [llms-full.txt](./llms-full.txt) for the complete reference with examples.

## Troubleshooting

**`findRendezvous` returns an empty array**
The participants' isochrones don't overlap — they are too far apart for the given `maxTimeMinutes`. Try increasing the time budget or switching to a faster transport mode.

**No venues found (fallback to centroid)**
The Overpass API found no matching venues within the intersection zone. This can happen in rural areas. The library returns a synthetic "Meeting point" at the area-weighted centroid as a fallback. Try broader `venueTypes` or a larger `maxTimeMinutes`.

**`RangeError: findRendezvous requires at least 2 participants`**
You must pass at least 2 participants. Single-origin use cases don't need a meeting-point library — query the routing engine directly.

**Engine HTTP errors (e.g., `Valhalla isochrone error: 400`)**
Check that your engine base URL is correct and the service is running. For ORS, verify your API key is valid. For Valhalla/OSRM, ensure the server has routing tiles loaded for the region you're querying.

**OSRM: `Error: OSRM does not support isochrone computation`**
OSRM cannot generate isochrones. Use Valhalla, OpenRouteService, or GraphHopper instead. OSRM is supported only for route matrix computation.

## Licence

[MIT](https://github.com/TheCryptoDonkey/rendezvous-kit/blob/main/LICENSE)

## Support

For issues and feature requests, see [GitHub Issues](https://github.com/TheCryptoDonkey/rendezvous-kit/issues).

If you find rendezvous-kit useful, consider sending a tip:

- **Lightning:** `thedonkey@strike.me`
- **Nostr zaps:** `npub1mgvlrnf5hm9yf0n5mf9nqmvarhvxkc6remu5ec3vf8r0txqkuk7su0e7q2`
