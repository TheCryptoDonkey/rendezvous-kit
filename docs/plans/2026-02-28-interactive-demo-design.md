# Interactive Demo Mode — Design

**Date:** 2026-02-28
**Status:** Approved
**Repos:** rendezvous-kit, toll-booth

## Context

The rendezvous-kit demo at `thecryptodonkey.github.io/rendezvous-kit` has two tabs:

- **Showcase** — works. Pre-baked scenario JSON with pre-computed isochrones, animates the pipeline.
- **Interactive** — shows a "Coming soon" overlay.

A self-hosted Valhalla instance is live at `routing.trotters.cc` (UK tiles, v3.5.1), gated behind L402 via toll-booth middleware. Free tier: 10 requests/day per IP. After that, HTTP 402 with Lightning invoice.

## Scope

Six pieces of work, executed in dependency order:

1. **`computeRoute()` in rendezvous-kit** — add route geometry API to the engine interface
2. **`ValhallaError` + headers config** — typed errors and auth header support in ValhallaEngine
3. **toll-booth invoice status endpoint** — expose `checkInvoice()` as HTTP for browser polling
4. **Interactive demo mode** — the main feature (click-to-place, live pipeline, results)
5. **L402 payment flow in demo** — inline payment UI with QR code, polling, auto-resume
6. **Scenario data regeneration** — fix Showcase scenarios with real Valhalla data + route geometries

## 1. computeRoute() in rendezvous-kit

### Types (`src/types.ts`)

```typescript
interface GeoJSONLineString {
  type: 'LineString'
  coordinates: number[][]
}

interface RouteLeg {
  instruction: string
  distanceKm: number
  durationMinutes: number
}

interface RouteGeometry {
  origin: LatLon
  destination: LatLon
  mode: TransportMode
  durationMinutes: number
  distanceKm: number
  geometry: GeoJSONLineString
  legs?: RouteLeg[]
}
```

### RoutingEngine interface

Add `computeRoute(origin, destination, mode): Promise<RouteGeometry>` to the `RoutingEngine` interface.

### ValhallaEngine implementation

Calls `POST /route` with `directions_type: 'maneuvers'`. Parses the response shape (GeoJSON LineString from `trip.legs[*].shape` decoded, maneuvers from `trip.legs[*].maneuvers`).

### Other engines

ORS, GraphHopper, OSRM get stub implementations that throw `'computeRoute not yet implemented'`.

### Tests

One unit test against a mock Valhalla server verifying response parsing.

## 2. ValhallaError + headers config

### ValhallaError class (`src/engines/valhalla.ts`)

```typescript
export class ValhallaError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message)
    this.name = 'ValhallaError'
  }
}
```

All non-200 responses throw `ValhallaError` instead of generic `Error`. Consumers can catch and check `err.status === 402` to detect payment-required.

### Headers config

```typescript
constructor(config: { baseUrl: string; headers?: Record<string, string> })
```

Extra headers merged into every request. Used by the demo to pass `Authorization: L402 <macaroon>:<preimage>` after payment.

## 3. toll-booth changes

### Invoice status endpoint

New export from toll-booth: `invoiceStatus(backend: LightningBackend)` returning a Hono route handler.

```typescript
// toll-booth/src/invoice-status.ts
export function invoiceStatus(backend: LightningBackend) {
  return async (c: Context) => {
    const hash = c.req.param('paymentHash')
    const status = await backend.checkInvoice(hash)
    return c.json(status)
  }
}
```

Mounted in valhalla-proxy:

```typescript
app.get('/invoice-status/:paymentHash', invoiceStatus(backend))
```

### 402 response body

Add `macaroon` and `payment_hash` to the 402 JSON body:

```json
{
  "error": "Payment required",
  "invoice": "lnbc...",
  "macaroon": "...",
  "payment_hash": "abc...",
  "amount_sats": 1000
}
```

### CORS

Add `Access-Control-Expose-Headers: WWW-Authenticate` to CORS configuration in the valhalla-proxy. The `/invoice-status` endpoint also needs CORS headers.

## 4. Interactive demo mode

### HTML (`index.html`)

Remove the overlay div (lines 97-106). Tab switching swaps sidebar content between Showcase and Interactive states.

Interactive sidebar contains:

- **Participant list** — colour dots, labels (A-E), drag indicator, remove button, max 5
- **Transport mode** — 3 buttons: drive / cycle / walk
- **Time budget** — slider 5-60 min, default 15, current value label
- **Venue types** — checkboxes: cafe, restaurant, park, pub (at least one required)
- **"Find rendezvous" button** — disabled until 2+ participants placed
- **Pipeline** — reused from Showcase
- **Results** — reused from Showcase
- **Error area** — inline text for errors
- **Payment panel** — inline area for L402 flow (hidden until 402)

### JS (`demo.js`)

**Module import:**
```javascript
import { ValhallaEngine, intersectPolygonsAll, searchVenues }
  from 'https://esm.sh/rendezvous-kit'
```

**Decomposed pipeline** (not using `findRendezvous()` — we need intermediate data for animation):

1. Call `engine.computeIsochrone()` per participant, staggered, animate each
2. Call `intersectPolygonsAll()` on the isochrone polygons, display intersection
3. Call `searchVenues()` within the intersection area
4. Call `engine.computeRouteMatrix()` for travel times
5. Score venues by selected fairness strategy
6. Display results

Each step updates the pipeline UI and map layers using the same functions as Showcase (`addIsochrone()`, `addIntersection()`, `addVenueMarkers()`, `displayResults()`).

**Click-to-place markers:**
- Map click adds a draggable marker with label A-E and colour from COLOURS palette
- Marker drag updates participant coordinates
- Participant list in sidebar updates reactively
- Maximum 5 participants; show message if trying to add more
- Click marker to remove it (or X button in sidebar)

**Tab switching:**
- Showcase → Interactive: clear map, enable click-to-place, show interactive controls
- Interactive → Showcase: clear map, disable click-to-place, show showcase controls, reload scenario

**State variables:**
```javascript
let interactiveMode = false
let interactiveParticipants = []  // { lat, lon, label, marker }
let l402Token = null              // { macaroon, preimage } from localStorage
```

### CSS (`style.css`)

New styles for interactive controls, matching existing dark theme:

- `.interactive-controls` — container for interactive sidebar content
- `.participant-list` — list of placed participants
- `.participant-chip` — individual participant with colour dot and label
- `.mode-buttons` — transport mode button group
- `.mode-buttons button.active` — selected mode
- `.time-slider` — range input styled for dark theme
- `.venue-checkboxes` — checkbox group
- `.btn-find` — primary action button (accent colour)
- `.payment-panel` — inline payment UI
- `.error-message` — inline error text

## 5. L402 payment flow in demo

### Error detection

When any Valhalla call throws `ValhallaError` with `status === 402`:

1. Parse `JSON.parse(err.body)` to get `{ invoice, macaroon, payment_hash, amount_sats }`
2. Show inline payment panel in sidebar

### Payment panel

- Amount display: `amount_sats` converted to human-readable
- QR code: BOLT11 invoice rendered as inline SVG via `qrcode-generator` from esm.sh
- Copy button: copies BOLT11 string to clipboard
- Text: "Pay to continue — buys N routing requests"
- Cancel button: stops polling, resets pipeline

### Polling

Poll `GET https://routing.trotters.cc/invoice-status/:payment_hash` every 3 seconds.

On `{ paid: true, preimage: '...' }`:
1. Store `{ macaroon, preimage }` in `localStorage` key `rendezvous-l402`
2. Create new `ValhallaEngine` with `headers: { Authorization: 'L402 <macaroon>:<preimage>' }`
3. Hide payment panel with "Paid!" flash animation
4. Resume pipeline from the failed step

### On page reload

Check `localStorage` for existing L402 token. If present, create authenticated engine. Token persists until explicitly cleared or credits are exhausted.

## 6. Scenario data regeneration

### Script: `docs/regenerate-scenarios.js`

Node.js script (ESM) that:

1. Reads each `docs/scenarios/*.json` file
2. For each scenario, calls the decomposed pipeline against `routing.trotters.cc`:
   - `computeIsochrone()` per participant
   - `intersectPolygonsAll()` for intersection polygons
   - `searchVenues()` for venues
   - `computeRouteMatrix()` for travel times
   - `computeRoute()` for route geometries (to the top-ranked venue)
3. Writes updated JSON preserving metadata (name, description, participants, mode, maxTimeMinutes, venueTypes)
4. Adds `routes` object keyed by participant label with geometry + legs

### Updated scenario JSON structure

```json
{
  "name": "Bristol Meetup",
  "description": "...",
  "participants": [...],
  "mode": "drive",
  "maxTimeMinutes": 15,
  "venueTypes": ["cafe", "pub"],
  "isochrones": [...],
  "intersection": [...],
  "venues": [...],
  "routes": {
    "Alice": {
      "geometry": { "type": "LineString", "coordinates": [...] },
      "legs": [{ "instruction": "...", "distanceKm": 0.5, "durationMinutes": 1.2 }, ...]
    },
    "Bob": { ... },
    "Carol": { ... }
  }
}
```

### Route display in Showcase

When a user clicks a venue result in Showcase mode, routes from the pre-baked `routes` object are drawn on the map in participant colours with dashed lines. No live API calls needed.

## Error handling

| Error | Source | Display |
|-------|--------|---------|
| 402 (free tier exhausted) | ValhallaEngine | Inline payment panel with QR code |
| Network error | fetch | "Routing service unavailable — check your connection." |
| No intersection | intersectPolygonsAll returns [] | "No overlapping area found — try increasing the time budget or moving participants closer." |
| No venues | searchVenues returns [] | "No venues found in the intersection area — try different venue types or a larger time budget." |
| Invoice polling failure | /invoice-status | Silent retry (polling continues) |

## Route display

### Interactive mode (live)

On venue result click:
1. Call `engine.computeRoute(participant, venue, mode)` for each participant
2. Draw polylines in participant colours, dashed style
3. Click polyline → popup with turn-by-turn directions
4. Clicking different venue clears old routes, shows new ones

### Showcase mode (pre-baked)

On venue result click:
1. Read routes from scenario JSON `routes` object
2. Draw polylines in participant colours, dashed style
3. Same popup interaction

### Map layers

```javascript
map.addLayer({
  id: `demo-route-${participantIndex}`,
  type: 'line',
  source: routeSourceId,
  paint: {
    'line-color': COLOURS[participantIndex],
    'line-width': 4,
    'line-dasharray': [2, 1],
    'line-opacity': 0.9,
  },
})
```

## Dependencies

| Dependency | Source | Purpose |
|-----------|--------|---------|
| rendezvous-kit | esm.sh | Core library (isochrones, intersection, venues) |
| qrcode-generator | esm.sh | Lightning invoice QR code |
| MapLibre GL JS | unpkg CDN | Map rendering |
| routing.trotters.cc | Self-hosted | Valhalla routing engine |
| overpass-api.de | Public | Venue search |

## What NOT to change

- Showcase tab pipeline/results code — reuse, don't rewrite
- Pre-baked scenario structure — extend with `routes`, don't restructure
- No build step — vanilla JS with CDN imports
- No frameworks — keep it consistent with existing code
