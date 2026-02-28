# Interactive Demo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Interactive tab's "Coming soon" overlay with a working interactive mode, including live Valhalla routing, L402 Lightning payments, and route display — plus fix Showcase scenario data.

**Architecture:** Layered bottom-up. First extend rendezvous-kit with `computeRoute()`, `ValhallaError`, and headers config. Then add an invoice status endpoint to toll-booth. Then build the interactive demo mode with decomposed pipeline animation, L402 payment flow with QR codes, and route display. Finally regenerate Showcase scenario data with real Valhalla responses.

**Tech Stack:** TypeScript (rendezvous-kit, toll-booth), vanilla JS (demo), MapLibre GL JS, Hono (toll-booth), Vitest (tests), esm.sh CDN imports.

**Repos:**
- `rendezvous-kit` — `/Users/darren/WebstormProjects/rendezvous-kit/`
- `toll-booth` — `/Users/darren/WebstormProjects/toll-booth/`

**Design doc:** `rendezvous-kit/docs/plans/2026-02-28-interactive-demo-design.md`

---

## Task 1: Add route types to rendezvous-kit

**Files:**
- Modify: `rendezvous-kit/src/types.ts`

**Step 1: Add GeoJSONLineString, RouteLeg, RouteGeometry types and update RoutingEngine interface**

Add after the `GeoJSONPolygon` interface (after line 18):

```typescript
/** GeoJSON LineString geometry. */
export interface GeoJSONLineString {
  type: 'LineString'
  coordinates: number[][]
}
```

Add after the `Venue` interface (after line 53):

```typescript
/** A single manoeuvre in a route. */
export interface RouteLeg {
  instruction: string
  distanceKm: number
  durationMinutes: number
}

/** Result of a single route computation. */
export interface RouteGeometry {
  origin: LatLon
  destination: LatLon
  mode: TransportMode
  durationMinutes: number
  distanceKm: number
  geometry: GeoJSONLineString
  legs?: RouteLeg[]
}
```

Add `computeRoute` to the `RoutingEngine` interface (after `computeRouteMatrix`, before the closing brace at line 85):

```typescript
  /** Compute a route between two points, returning the polyline and optional turn-by-turn legs. */
  computeRoute(origin: LatLon, destination: LatLon, mode: TransportMode): Promise<RouteGeometry>
```

**Step 2: Update barrel exports**

In `rendezvous-kit/src/index.ts`, add the new types to the type export block:

```typescript
export type {
  LatLon,
  GeoJSONPolygon,
  GeoJSONLineString,
  TransportMode,
  FairnessStrategy,
  VenueType,
  RoutingEngine,
  Isochrone,
  MatrixEntry,
  RouteMatrix,
  RouteLeg,
  RouteGeometry,
  Venue,
  RendezvousOptions,
  RendezvousSuggestion,
} from './types.js'
```

**Step 3: Run typecheck to verify**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && npx tsc --noEmit`

Expected: Type errors in engine files because `RoutingEngine` now requires `computeRoute` — that's expected and will be fixed in Tasks 2-4.

**Step 4: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add src/types.ts src/index.ts
git commit -m "feat: add route types (GeoJSONLineString, RouteLeg, RouteGeometry) to RoutingEngine"
```

---

## Task 2: Add ValhallaError class and headers config

**Files:**
- Modify: `rendezvous-kit/src/engines/valhalla.ts`
- Modify: `rendezvous-kit/src/index.ts`

**Step 1: Write the failing test**

Add to `rendezvous-kit/src/engines/valhalla.test.ts`, after the existing imports:

```typescript
import { ValhallaError } from './valhalla.js'
```

Add these tests at the end of the file (inside the describe block or as new describe blocks):

```typescript
describe('ValhallaError', () => {
  it('exposes status and body', () => {
    const err = new ValhallaError('payment required', 402, '{"error":"Payment required"}')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ValhallaError')
    expect(err.status).toBe(402)
    expect(err.body).toBe('{"error":"Payment required"}')
    expect(err.message).toBe('payment required')
  })
})

describe('custom headers', () => {
  it('sends custom headers with requests', async () => {
    const engine = new ValhallaEngine({
      baseUrl: 'http://localhost:8002',
      headers: { 'Authorization': 'L402 token:preimage' },
    })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        features: [{ geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } }],
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await engine.computeIsochrone({ lat: 51.5, lon: -2.6 }, 'drive', 15)

    expect(mockFetch.mock.calls[0][1].headers).toEqual(
      expect.objectContaining({ 'Authorization': 'L402 token:preimage' })
    )

    vi.unstubAllGlobals()
  })
})

describe('error handling', () => {
  it('throws ValhallaError with status and body on non-200', async () => {
    const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      statusText: 'Payment Required',
      text: () => Promise.resolve('{"error":"Payment required","invoice":"lnbc..."}'),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(engine.computeIsochrone({ lat: 51.5, lon: -2.6 }, 'drive', 15))
      .rejects.toThrow(ValhallaError)

    try {
      await engine.computeIsochrone({ lat: 51.5, lon: -2.6 }, 'drive', 15)
    } catch (err) {
      expect(err).toBeInstanceOf(ValhallaError)
      expect((err as ValhallaError).status).toBe(402)
      expect((err as ValhallaError).body).toContain('Payment required')
    }

    vi.unstubAllGlobals()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && npx vitest run src/engines/valhalla.test.ts`

Expected: FAIL — `ValhallaError` is not exported, `headers` config not accepted.

**Step 3: Implement ValhallaError and headers config**

In `rendezvous-kit/src/engines/valhalla.ts`, add before the `COSTING` constant:

```typescript
/**
 * Error thrown by ValhallaEngine when the server returns a non-200 response.
 * Includes the HTTP status code and response body for error handling
 * (e.g. detecting 402 Payment Required for L402 flows).
 */
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

Update the constructor and class to accept and use headers:

```typescript
export class ValhallaEngine implements RoutingEngine {
  readonly name = 'Valhalla'
  private readonly baseUrl: string
  private readonly extraHeaders: Record<string, string>

  constructor(config: { baseUrl: string; headers?: Record<string, string> }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.extraHeaders = config.headers ?? {}
  }
```

Update `computeIsochrone` to merge headers and throw `ValhallaError`:

```typescript
    const res = await fetch(`${this.baseUrl}/isochrone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.extraHeaders },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ValhallaError(
        `Valhalla isochrone error: ${res.status} ${res.statusText}`,
        res.status,
        text,
      )
    }
```

Update `computeRouteMatrix` similarly — merge headers and throw `ValhallaError`:

```typescript
    const res = await fetch(`${this.baseUrl}/sources_to_targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.extraHeaders },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ValhallaError(
        `Valhalla matrix error: ${res.status} ${res.statusText}`,
        res.status,
        text,
      )
    }
```

**Step 4: Export ValhallaError from barrel**

In `rendezvous-kit/src/index.ts`, update the Valhalla engine export:

```typescript
export { ValhallaEngine, ValhallaError } from './engines/valhalla.js'
```

**Step 5: Run tests to verify they pass**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && npx vitest run src/engines/valhalla.test.ts`

Expected: ALL PASS (including existing tests — the constructor change is backwards-compatible since `headers` is optional).

**Step 6: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add src/engines/valhalla.ts src/engines/valhalla.test.ts src/index.ts
git commit -m "feat: add ValhallaError class and optional headers config to ValhallaEngine"
```

---

## Task 3: Implement computeRoute in ValhallaEngine

**Files:**
- Modify: `rendezvous-kit/src/engines/valhalla.ts`
- Modify: `rendezvous-kit/src/engines/valhalla.test.ts`

**Step 1: Write the failing test**

Add to `rendezvous-kit/src/engines/valhalla.test.ts`:

```typescript
describe('computeRoute', () => {
  it('computes a route with geometry and manoeuvres', async () => {
    const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })

    // Valhalla /route returns trip.legs[].shape as polyline6 encoded string
    // and trip.legs[].maneuvers as array of instruction objects
    // trip.summary has total time (seconds) and length (km)
    const mockResponse = {
      trip: {
        summary: { time: 720, length: 5.4 },
        legs: [{
          shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',  // encoded polyline6
          maneuvers: [
            {
              instruction: 'Drive north on High Street.',
              length: 3.2,
              time: 420,
              begin_shape_index: 0,
              end_shape_index: 1,
            },
            {
              instruction: 'Turn right onto Park Road.',
              length: 2.2,
              time: 300,
              begin_shape_index: 1,
              end_shape_index: 2,
            },
          ],
        }],
      },
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await engine.computeRoute(
      { lat: 51.456, lon: -2.626, label: 'Alice' },
      { lat: 51.461, lon: -2.588 },
      'drive',
    )

    // Verify request
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:8002/route')
    const body = JSON.parse(opts.body)
    expect(body.costing).toBe('auto')
    expect(body.locations).toHaveLength(2)
    expect(body.locations[0]).toEqual({ lat: 51.456, lon: -2.626 })
    expect(body.locations[1]).toEqual({ lat: 51.461, lon: -2.588 })
    expect(body.directions_type).toBe('maneuvers')

    // Verify response parsing
    expect(result.origin).toEqual({ lat: 51.456, lon: -2.626, label: 'Alice' })
    expect(result.destination).toEqual({ lat: 51.461, lon: -2.588 })
    expect(result.mode).toBe('drive')
    expect(result.durationMinutes).toBe(12)  // 720s / 60
    expect(result.distanceKm).toBe(5.4)
    expect(result.geometry.type).toBe('LineString')
    expect(result.geometry.coordinates.length).toBeGreaterThan(0)
    // Coordinates are [lon, lat] (GeoJSON standard)
    expect(result.geometry.coordinates[0]).toHaveLength(2)
    expect(result.legs).toHaveLength(2)
    expect(result.legs![0].instruction).toBe('Drive north on High Street.')
    expect(result.legs![0].distanceKm).toBe(3.2)
    expect(result.legs![0].durationMinutes).toBe(7)  // 420s / 60

    vi.unstubAllGlobals()
  })

  it('throws ValhallaError on failure', async () => {
    const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('bad'),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(engine.computeRoute(
      { lat: 51.456, lon: -2.626 },
      { lat: 51.461, lon: -2.588 },
      'walk',
    )).rejects.toThrow(ValhallaError)

    vi.unstubAllGlobals()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && npx vitest run src/engines/valhalla.test.ts`

Expected: FAIL — `computeRoute` does not exist on `ValhallaEngine`.

**Step 3: Implement computeRoute and polyline6 decoder**

Add the polyline6 decoder as a private function at the end of `rendezvous-kit/src/engines/valhalla.ts` (before the closing of the file):

```typescript
/**
 * Decodes a Valhalla polyline6-encoded string into [lon, lat] coordinate pairs.
 * Valhalla uses 6-digit precision (unlike Google's 5-digit polyline format).
 * Returns GeoJSON-order coordinates: [longitude, latitude].
 */
function decodePolyline6(encoded: string): number[][] {
  const coordinates: number[][] = []
  let index = 0
  let lat = 0
  let lon = 0
  const factor = 1e6

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lon += (result & 1) ? ~(result >> 1) : (result >> 1)

    // GeoJSON: [lon, lat]
    coordinates.push([lon / factor, lat / factor])
  }

  return coordinates
}
```

Add `computeRoute` method to the `ValhallaEngine` class:

```typescript
  async computeRoute(
    origin: LatLon,
    destination: LatLon,
    mode: TransportMode,
  ): Promise<RouteGeometry> {
    const body = {
      locations: [
        { lat: origin.lat, lon: origin.lon },
        { lat: destination.lat, lon: destination.lon },
      ],
      costing: COSTING[mode],
      directions_type: 'maneuvers',
    }

    const res = await fetch(`${this.baseUrl}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.extraHeaders },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ValhallaError(
        `Valhalla route error: ${res.status} ${res.statusText}`,
        res.status,
        text,
      )
    }

    const data = await res.json() as {
      trip: {
        summary: { time: number; length: number }
        legs: Array<{
          shape: string
          maneuvers: Array<{
            instruction: string
            length: number
            time: number
          }>
        }>
      }
    }

    const leg = data.trip.legs[0]
    const coordinates = decodePolyline6(leg.shape)

    return {
      origin,
      destination,
      mode,
      durationMinutes: Math.round(data.trip.summary.time / 60),
      distanceKm: data.trip.summary.length,
      geometry: { type: 'LineString', coordinates },
      legs: leg.maneuvers.map(m => ({
        instruction: m.instruction,
        distanceKm: m.length,
        durationMinutes: Math.round(m.time / 60),
      })),
    }
  }
```

Make sure to import `RouteGeometry` in the import block at the top of the file:

```typescript
import type {
  RoutingEngine, Isochrone, RouteMatrix, RouteGeometry, MatrixEntry,
  TransportMode, LatLon, GeoJSONPolygon,
} from '../types.js'
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && npx vitest run src/engines/valhalla.test.ts`

Expected: ALL PASS.

**Step 5: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add src/engines/valhalla.ts src/engines/valhalla.test.ts
git commit -m "feat: implement computeRoute in ValhallaEngine with polyline6 decoding"
```

---

## Task 4: Add stub computeRoute to other engines

**Files:**
- Modify: `rendezvous-kit/src/engines/openrouteservice.ts`
- Modify: `rendezvous-kit/src/engines/graphhopper.ts`
- Modify: `rendezvous-kit/src/engines/osrm.ts`

**Step 1: Add stub to each engine**

Each engine needs to import `RouteGeometry` and add a `computeRoute` method that throws.

For **openrouteservice.ts**, add `RouteGeometry` to the type import, then add:

```typescript
  async computeRoute(): Promise<RouteGeometry> {
    throw new Error('computeRoute is not yet implemented for OpenRouteService')
  }
```

For **graphhopper.ts**, same pattern:

```typescript
  async computeRoute(): Promise<RouteGeometry> {
    throw new Error('computeRoute is not yet implemented for GraphHopper')
  }
```

For **osrm.ts**, same pattern (OSRM already has a similar stub for `computeIsochrone`):

```typescript
  async computeRoute(): Promise<RouteGeometry> {
    throw new Error('computeRoute is not yet implemented for OSRM')
  }
```

**Step 2: Run typecheck**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && npx tsc --noEmit`

Expected: PASS — all engines now satisfy the `RoutingEngine` interface.

**Step 3: Run full test suite**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && npx vitest run`

Expected: ALL PASS.

**Step 4: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add src/engines/openrouteservice.ts src/engines/graphhopper.ts src/engines/osrm.ts
git commit -m "feat: add stub computeRoute to ORS, GraphHopper, and OSRM engines"
```

---

## Task 5: Build and publish rendezvous-kit

**Files:** None modified — build only.

**Step 1: Build**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && npm run build`

Expected: Clean build to `dist/`.

**Step 2: Verify exports**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && node -e "import('./dist/index.js').then(m => console.log(Object.keys(m).sort().join(', ')))"`

Expected: Output includes `ValhallaEngine`, `ValhallaError`, and all existing exports.

**Step 3: Bump version and publish**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
npm version minor  # 1.9.0 → 1.10.0
npm publish
```

This ensures the esm.sh CDN will have the new exports when the demo imports it.

**Step 4: Commit version bump**

The `npm version` command auto-commits, so just push:

```bash
git push && git push --tags
```

---

## Task 6: toll-booth invoice status endpoint

**Files:**
- Create: `toll-booth/src/invoice-status.ts`
- Create: `toll-booth/src/invoice-status.test.ts`
- Modify: `toll-booth/src/index.ts`

**Step 1: Write the failing test**

Create `toll-booth/src/invoice-status.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { invoiceStatus } from './invoice-status.js'
import type { LightningBackend } from './types.js'

describe('invoiceStatus', () => {
  function makeBackend(overrides: Partial<LightningBackend> = {}): LightningBackend {
    return {
      createInvoice: vi.fn(),
      checkInvoice: vi.fn().mockResolvedValue({ paid: false }),
      ...overrides,
    }
  }

  it('returns paid: false for unpaid invoice', async () => {
    const backend = makeBackend()
    const app = new Hono()
    app.get('/invoice-status/:paymentHash', invoiceStatus(backend))

    const res = await app.request('/invoice-status/abc123')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ paid: false })
    expect(backend.checkInvoice).toHaveBeenCalledWith('abc123')
  })

  it('returns paid: true with preimage for settled invoice', async () => {
    const backend = makeBackend({
      checkInvoice: vi.fn().mockResolvedValue({ paid: true, preimage: 'deadbeef' }),
    })
    const app = new Hono()
    app.get('/invoice-status/:paymentHash', invoiceStatus(backend))

    const res = await app.request('/invoice-status/abc123')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ paid: true, preimage: 'deadbeef' })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/darren/WebstormProjects/toll-booth && npx vitest run src/invoice-status.test.ts`

Expected: FAIL — module not found.

**Step 3: Implement invoiceStatus handler**

Create `toll-booth/src/invoice-status.ts`:

```typescript
import type { Context } from 'hono'
import type { LightningBackend } from './types.js'

/**
 * Creates a Hono route handler that checks invoice payment status.
 * Mount as: app.get('/invoice-status/:paymentHash', invoiceStatus(backend))
 *
 * Returns { paid: false } or { paid: true, preimage: '...' }.
 */
export function invoiceStatus(backend: LightningBackend) {
  return async (c: Context) => {
    const hash = c.req.param('paymentHash')
    const status = await backend.checkInvoice(hash)
    return c.json(status)
  }
}
```

**Step 4: Export from barrel**

In `toll-booth/src/index.ts`, add:

```typescript
export { invoiceStatus } from './invoice-status.js'
```

**Step 5: Run tests to verify they pass**

Run: `cd /Users/darren/WebstormProjects/toll-booth && npx vitest run src/invoice-status.test.ts`

Expected: ALL PASS.

**Step 6: Commit**

```bash
cd /Users/darren/WebstormProjects/toll-booth
git add src/invoice-status.ts src/invoice-status.test.ts src/index.ts
git commit -m "feat: add invoiceStatus route handler for browser payment polling"
```

---

## Task 7: Update toll-booth 402 response with macaroon and payment_hash

**Files:**
- Modify: `toll-booth/src/middleware.ts`
- Modify: `toll-booth/src/middleware.test.ts`

**Step 1: Write the failing test**

Add to `toll-booth/src/middleware.test.ts`, in the existing test suite where the 402 response is tested. Find the test that checks the 402 response and add assertions:

```typescript
it('includes macaroon and payment_hash in 402 response body', async () => {
  // ... setup similar to existing 402 test ...
  // The 402 JSON body should contain: error, invoice, macaroon, payment_hash, amount_sats
  const body = await res.json()
  expect(body.error).toBe('Payment required')
  expect(body.invoice).toBeDefined()
  expect(body.macaroon).toBeDefined()
  expect(body.payment_hash).toBeDefined()
  expect(body.amount_sats).toBeDefined()
})
```

This test should be integrated into the existing 402 test or added as a new one. Check the existing test pattern — likely there's already a test that verifies 402 is returned. Extend it to also check for `macaroon` and `payment_hash` in the body.

**Step 2: Run test to verify it fails**

Run: `cd /Users/darren/WebstormProjects/toll-booth && npx vitest run src/middleware.test.ts`

Expected: FAIL — `macaroon` and `payment_hash` not present in the response body.

**Step 3: Update middleware to include macaroon and payment_hash in 402 body**

In `toll-booth/src/middleware.ts`, find the 402 response (around line 86-89). Change:

```typescript
    c.header('WWW-Authenticate', `L402 macaroon="${macaroon}", invoice="${invoice.bolt11}"`)
    c.header('X-Coverage', 'GB')
    return c.json(
      { error: 'Payment required', invoice: invoice.bolt11, amount_sats: defaultAmount },
      402,
    )
```

To:

```typescript
    c.header('WWW-Authenticate', `L402 macaroon="${macaroon}", invoice="${invoice.bolt11}"`)
    c.header('X-Coverage', 'GB')
    return c.json(
      {
        error: 'Payment required',
        invoice: invoice.bolt11,
        macaroon,
        payment_hash: invoice.paymentHash,
        amount_sats: defaultAmount,
      },
      402,
    )
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/darren/WebstormProjects/toll-booth && npx vitest run`

Expected: ALL PASS.

**Step 5: Commit**

```bash
cd /Users/darren/WebstormProjects/toll-booth
git add src/middleware.ts src/middleware.test.ts
git commit -m "feat: include macaroon and payment_hash in 402 response body"
```

---

## Task 8: Update valhalla-proxy with invoice-status route and CORS

**Files:**
- Modify: `toll-booth/examples/valhalla-proxy/server.ts`

**Step 1: Add invoice-status route and CORS**

Update `toll-booth/examples/valhalla-proxy/server.ts`:

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { tollBooth, invoiceStatus } from 'toll-booth'
import { phoenixdBackend } from 'toll-booth/backends/phoenixd'

const app = new Hono()

const backend = phoenixdBackend({
  url: process.env.PHOENIXD_URL ?? 'http://localhost:9740',
  password: process.env.PHOENIXD_PASSWORD ?? '',
})

// CORS — allow browser requests from any origin (demo runs on GitHub Pages)
app.use('/*', cors({
  origin: '*',
  exposeHeaders: ['WWW-Authenticate', 'X-Coverage'],
}))

// Invoice status endpoint — must be before tollBooth middleware
app.get('/invoice-status/:paymentHash', invoiceStatus(backend))

const booth = tollBooth({
  backend,
  pricing: {
    '/route': 2,
    '/isochrone': 5,
    '/sources_to_targets': 10,
  },
  freeTier: {
    requestsPerDay: parseInt(process.env.FREE_TIER_REQUESTS ?? '10', 10),
  },
  upstream: process.env.VALHALLA_URL ?? 'http://localhost:8002',
  defaultInvoiceAmount: parseInt(process.env.DEFAULT_INVOICE_SATS ?? '1000', 10),
  dbPath: process.env.DB_PATH ?? './credits.db',
  onPayment: (event) => {
    console.log(`[payment] ${event.amountSats} sats | hash: ${event.paymentHash}`)
  },
  onRequest: (event) => {
    const auth = event.authenticated ? 'L402' : 'free'
    console.log(`[${auth}] ${event.endpoint} | -${event.satsDeducted} sats | ${event.latencyMs}ms`)
  },
})

app.use('/*', booth)

const port = parseInt(process.env.PORT ?? '3000', 10)
serve({ fetch: app.fetch, port }, () => {
  console.log(`routing proxy listening on :${port}`)
})
```

Key changes:
- Extract `backend` variable so it's shared between `invoiceStatus()` and `tollBooth()`
- Add `hono/cors` middleware with `exposeHeaders: ['WWW-Authenticate', 'X-Coverage']`
- Mount `invoiceStatus(backend)` before `tollBooth` middleware (so it's not gated by L402)

**Step 2: Verify toll-booth dependencies include hono/cors**

Hono ships with `cors` middleware built-in — no additional install needed. Verify:

Run: `cd /Users/darren/WebstormProjects/toll-booth && node -e "require.resolve('hono/cors')" 2>/dev/null && echo 'OK' || echo 'Missing'`

Expected: OK (hono includes cors middleware).

**Step 3: Commit**

```bash
cd /Users/darren/WebstormProjects/toll-booth
git add examples/valhalla-proxy/server.ts
git commit -m "feat: add invoice-status endpoint and CORS to valhalla-proxy"
```

---

## Task 9: Interactive demo — HTML structure

**Files:**
- Modify: `rendezvous-kit/docs/index.html`

**Step 1: Replace overlay with interactive sidebar content**

The sidebar (`<aside id="panel">`) currently has one set of controls for Showcase. We need to:

1. Wrap existing Showcase controls in a `<div id="showcase-panel">` container
2. Add a new `<div id="interactive-panel" class="hidden">` with interactive controls
3. Remove the overlay div (lines 97-106)
4. The pipeline and results sections are shared between both modes — keep them outside the mode-specific wrappers

Replace the entire `<aside id="panel">` content and remove the overlay:

```html
    <aside id="panel">
      <!-- Showcase-only controls -->
      <section id="showcase-panel" class="controls">
        <div class="control-group">
          <label for="scenario-picker">Scenario</label>
          <select id="scenario-picker">
            <option value="bristol">Bristol Meetup</option>
            <option value="london">London Spread</option>
            <option value="edinburgh">Edinburgh Walk</option>
            <option value="east-midlands">East Midlands Drive</option>
            <option value="severn-estuary">Severn Estuary</option>
            <option value="lake-district">Lake District Cycle</option>
            <option value="thames-estuary">Thames Estuary</option>
            <option value="manchester">Manchester Group</option>
          </select>
        </div>
        <div class="control-group">
          <span class="control-group-label">Transport</span>
          <div id="mode-display" class="mode-badge"></div>
        </div>
        <div class="control-group">
          <label for="fairness-picker">Fairness strategy</label>
          <select id="fairness-picker">
            <option value="min_max">min_max</option>
            <option value="min_total">min_total</option>
            <option value="min_variance">min_variance</option>
          </select>
          <span id="fairness-desc" class="control-hint">Minimise worst-case travel time</span>
        </div>
      </section>

      <!-- Interactive-only controls -->
      <section id="interactive-panel" class="controls hidden">
        <div class="control-group">
          <span class="control-group-label">Participants</span>
          <p class="control-hint">Click the map to place 2–5 markers</p>
          <div id="participant-list"></div>
        </div>
        <div class="control-group">
          <span class="control-group-label">Transport</span>
          <div class="mode-buttons" id="mode-buttons">
            <button class="mode-btn active" data-mode="drive">🚗 Drive</button>
            <button class="mode-btn" data-mode="cycle">🚲 Cycle</button>
            <button class="mode-btn" data-mode="walk">🚶 Walk</button>
          </div>
        </div>
        <div class="control-group">
          <label for="time-slider">Time budget</label>
          <div class="slider-row">
            <input type="range" id="time-slider" min="5" max="60" value="15" step="5">
            <span id="time-value">15 min</span>
          </div>
        </div>
        <div class="control-group">
          <span class="control-group-label">Venue types</span>
          <div class="venue-checkboxes" id="venue-checkboxes">
            <label><input type="checkbox" value="cafe" checked> Cafe</label>
            <label><input type="checkbox" value="restaurant"> Restaurant</label>
            <label><input type="checkbox" value="park"> Park</label>
            <label><input type="checkbox" value="pub" checked> Pub</label>
          </div>
        </div>
        <button id="btn-find" class="btn-find" disabled>Find rendezvous</button>
        <button id="btn-clear" class="btn-clear">Clear all</button>
        <div id="interactive-error" class="error-message hidden"></div>
        <div id="payment-panel" class="payment-panel hidden"></div>
        <div class="control-group">
          <label for="interactive-fairness">Fairness strategy</label>
          <select id="interactive-fairness">
            <option value="min_max">min_max</option>
            <option value="min_total">min_total</option>
            <option value="min_variance">min_variance</option>
          </select>
          <span id="interactive-fairness-desc" class="control-hint">Minimise worst-case travel time</span>
        </div>
      </section>

      <section class="pipeline">
        <h3>Pipeline</h3>
        <div class="pipeline-steps">
          <div class="step" id="step-isochrones">
            <span class="step-icon">○</span>
            <span class="step-label">Isochrones</span>
            <span class="step-count"></span>
          </div>
          <div class="step" id="step-intersection">
            <span class="step-icon">○</span>
            <span class="step-label">Intersection</span>
            <span class="step-count"></span>
          </div>
          <div class="step" id="step-venues">
            <span class="step-icon">○</span>
            <span class="step-label">Venues</span>
            <span class="step-count"></span>
          </div>
          <div class="step" id="step-scored">
            <span class="step-icon">○</span>
            <span class="step-label">Scored</span>
          </div>
        </div>
      </section>

      <section class="results">
        <h3>Results</h3>
        <div id="results-list"></div>
      </section>
    </aside>
```

Remove the overlay div entirely (delete lines 97-106 of the original).

**Step 2: Verify in browser**

Open `rendezvous-kit/docs/index.html` in a browser. Showcase tab should work as before. Interactive tab should show the new controls (empty participant list, mode buttons, slider, checkboxes, disabled Find button).

**Step 3: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add docs/index.html
git commit -m "feat: replace Interactive overlay with sidebar controls"
```

---

## Task 10: Interactive demo — CSS styles

**Files:**
- Modify: `rendezvous-kit/docs/style.css`

**Step 1: Replace overlay styles with interactive control styles**

Remove the overlay CSS (lines 498-558 approximately — the `.overlay`, `.overlay.hidden`, `.overlay-content`, `.overlay-content h2/p`, `.overlay-subtext`, `.overlay-link`, `.overlay-back` rules).

Add new styles for interactive controls:

```css
/* --- Interactive controls --- */
.mode-buttons {
  display: flex;
  gap: 4px;
}

.mode-btn {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 8px 4px;
  cursor: pointer;
  font-family: var(--font);
  font-size: 13px;
  border-radius: 4px;
  transition: all 0.2s;
}

.mode-btn:hover { border-color: var(--text-muted); }
.mode-btn.active {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
  font-weight: 600;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-row input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
  background: transparent;
}

.slider-row span {
  min-width: 50px;
  text-align: right;
  font-size: 14px;
  color: var(--text);
  font-weight: 600;
}

.venue-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.venue-checkboxes label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}

.venue-checkboxes input[type="checkbox"] {
  accent-color: var(--accent);
}

#participant-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.participant-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-card);
  border-radius: 4px;
  border: 1px solid var(--border);
  font-size: 13px;
}

.participant-chip .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.participant-chip .label { flex: 1; }

.participant-chip .remove {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  font-family: var(--font);
  transition: color 0.2s;
}

.participant-chip .remove:hover { color: var(--venue); }

.btn-find {
  width: 100%;
  padding: 12px;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 4px;
  font-family: var(--font);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-find:hover:not(:disabled) { background: var(--accent-hover); }
.btn-find:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-clear {
  width: 100%;
  padding: 8px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: var(--font);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  border-color: var(--text-muted);
  color: var(--text);
}

.error-message {
  padding: 10px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 4px;
  color: var(--venue);
  font-size: 13px;
  line-height: 1.4;
}

/* --- Payment panel --- */
.payment-panel {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--accent);
  border-radius: 6px;
  text-align: center;
}

.payment-panel h4 {
  color: var(--accent);
  font-size: 14px;
  margin-bottom: 12px;
}

.payment-panel .qr-container {
  background: #fff;
  padding: 12px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 12px;
}

.payment-panel .qr-container svg {
  display: block;
}

.payment-panel .amount {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.payment-panel .copy-btn {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 6px 16px;
  border-radius: 4px;
  font-family: var(--font);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.payment-panel .copy-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.payment-panel .status {
  font-size: 12px;
  color: var(--text-dim);
}

.payment-panel .cancel-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-family: var(--font);
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;
  text-decoration: underline;
}

.payment-panel .cancel-btn:hover { color: var(--text); }

.payment-panel.paid {
  border-color: var(--score);
  animation: flash-paid 1s ease-out;
}

@keyframes flash-paid {
  0% { background: rgba(128, 255, 128, 0.2); }
  100% { background: var(--bg-card); }
}

/* --- Route layers (clickable polylines) --- */
.route-popup {
  font-family: var(--font);
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.route-popup .leg {
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}

.route-popup .leg:last-child { border-bottom: none; }
```

**Step 2: Verify in browser**

Open the demo page. Interactive controls should be styled matching the dark theme. Buttons, sliders, and checkboxes should look consistent.

**Step 3: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add docs/style.css
git commit -m "feat: add interactive mode and payment panel CSS styles"
```

---

## Task 11: Interactive demo — JS core (tab switching + state)

**Files:**
- Modify: `rendezvous-kit/docs/demo.js`

This is the largest task. We'll add the interactive mode logic in several sub-steps, all committed together at the end.

**Step 1: Add ESM import and state variables**

At the top of `demo.js` (line 1), change the opening comment and add the import:

```javascript
// demo.js — rendezvous-kit interactive demo
// Uses global maplibregl from CDN script tag

import { ValhallaEngine, ValhallaError, intersectPolygonsAll, searchVenues }
  from 'https://esm.sh/rendezvous-kit@1.10.0'

import qrcode from 'https://esm.sh/qrcode-generator@1.4.4'
```

After the existing state variables (after line 13), add interactive state:

```javascript
// --- Interactive mode state ---
let interactiveMode = false
let interactiveParticipants = [] // { lat, lon, label, marker }
let interactiveEngine = null     // ValhallaEngine instance
let interactiveResults = null    // results from last interactive run
let selectedMode = 'drive'
let selectedTime = 15
let routeLayers = []             // track added route layer IDs for cleanup
let paymentPollTimer = null      // setInterval ID for payment polling
const PARTICIPANT_LABELS = ['A', 'B', 'C', 'D', 'E']
const VALHALLA_URL = 'https://routing.trotters.cc'
const L402_STORAGE_KEY = 'rendezvous-l402'
```

**Step 2: Rewrite tab switching logic**

Replace the existing tab switching code in `init()` (around lines 87-98) with:

```javascript
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      const isInteractive = tab.dataset.tab === 'interactive'
      switchMode(isInteractive)
    })
  })
```

Add the `switchMode` function after `init()`:

```javascript
function switchMode(interactive) {
  interactiveMode = interactive
  const showcasePanel = document.getElementById('showcase-panel')
  const interactivePanel = document.getElementById('interactive-panel')

  if (interactive) {
    showcasePanel.classList.add('hidden')
    interactivePanel.classList.remove('hidden')
    clearMap()
    resetPipeline()
    document.getElementById('results-list').innerHTML = ''
    // Enable click-to-place
    map.getCanvas().style.cursor = 'crosshair'
  } else {
    interactivePanel.classList.add('hidden')
    showcasePanel.classList.remove('hidden')
    clearInteractiveState()
    map.getCanvas().style.cursor = ''
    // Reload current scenario
    const picker = document.getElementById('scenario-picker')
    loadScenario(picker.value)
  }
}

function clearInteractiveState() {
  interactiveParticipants.forEach(p => p.marker.remove())
  interactiveParticipants = []
  interactiveResults = null
  clearRouteLayers()
  clearMap()
  resetPipeline()
  updateParticipantList()
  updateFindButton()
  hideError()
  hidePayment()
}
```

**Step 3: Add click-to-place participant markers**

Add a map click handler in `init()`, after the existing `map.on('click', () => clearSelection())`:

```javascript
  // Interactive: click to place participants
  map.on('click', (e) => {
    if (!interactiveMode) {
      clearSelection()
      return
    }
    if (interactiveParticipants.length >= 5) return // max 5

    const { lng, lat } = e.lngLat
    const index = interactiveParticipants.length
    const label = PARTICIPANT_LABELS[index]
    const colour = COLOURS[index]

    const el = document.createElement('div')
    el.className = 'marker-participant'
    el.style.background = colour
    el.style.boxShadow = `0 0 10px ${colour}`
    el.style.color = colour
    el.title = label

    const labelEl = document.createElement('span')
    labelEl.className = 'participant-label'
    labelEl.textContent = label
    labelEl.style.color = colour
    el.appendChild(labelEl)

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(map)

    marker.on('dragend', () => {
      const pos = marker.getLngLat()
      const p = interactiveParticipants.find(p => p.marker === marker)
      if (p) { p.lat = pos.lat; p.lon = pos.lng }
    })

    interactiveParticipants.push({ lat, lon: lng, label, marker })
    updateParticipantList()
    updateFindButton()
  })
```

Remove the standalone `map.on('click', () => clearSelection())` line (it's now integrated into the handler above).

**Step 4: Add participant list and control helpers**

```javascript
function updateParticipantList() {
  const list = document.getElementById('participant-list')
  if (!list) return
  list.innerHTML = interactiveParticipants.map((p, i) => `
    <div class="participant-chip">
      <span class="dot" style="background: ${COLOURS[i]}"></span>
      <span class="label">${esc(p.label)} (${p.lat.toFixed(3)}, ${p.lon.toFixed(3)})</span>
      <button class="remove" data-index="${i}" title="Remove">&times;</button>
    </div>
  `).join('')

  list.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      removeParticipant(parseInt(btn.dataset.index))
    })
  })
}

function removeParticipant(index) {
  const removed = interactiveParticipants.splice(index, 1)
  removed[0]?.marker.remove()
  // Re-label remaining participants
  interactiveParticipants.forEach((p, i) => {
    p.label = PARTICIPANT_LABELS[i]
    const el = p.marker.getElement()
    el.style.background = COLOURS[i]
    el.style.boxShadow = `0 0 10px ${COLOURS[i]}`
    el.style.color = COLOURS[i]
    el.querySelector('.participant-label').textContent = PARTICIPANT_LABELS[i]
    el.querySelector('.participant-label').style.color = COLOURS[i]
  })
  updateParticipantList()
  updateFindButton()
}

function updateFindButton() {
  const btn = document.getElementById('btn-find')
  if (btn) btn.disabled = interactiveParticipants.length < 2
}

function showError(message) {
  const el = document.getElementById('interactive-error')
  if (!el) return
  el.textContent = message
  el.classList.remove('hidden')
}

function hideError() {
  const el = document.getElementById('interactive-error')
  if (el) el.classList.add('hidden')
}

function hidePayment() {
  const panel = document.getElementById('payment-panel')
  if (panel) panel.classList.add('hidden')
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer)
    paymentPollTimer = null
  }
}
```

**Step 5: Wire up interactive controls in init()**

Add to `init()`, after the tab switching code:

```javascript
  // Interactive controls
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      selectedMode = btn.dataset.mode
    })
  })

  document.getElementById('time-slider')?.addEventListener('input', (e) => {
    selectedTime = parseInt(e.target.value)
    document.getElementById('time-value').textContent = `${selectedTime} min`
  })

  document.getElementById('btn-find')?.addEventListener('click', () => runInteractive())
  document.getElementById('btn-clear')?.addEventListener('click', () => clearInteractiveState())

  // Interactive fairness picker
  document.getElementById('interactive-fairness')?.addEventListener('change', (e) => {
    currentFairness = e.target.value
    const desc = document.getElementById('interactive-fairness-desc')
    if (desc) desc.textContent = FAIRNESS_DESCRIPTIONS[currentFairness] ?? ''
    if (interactiveResults) {
      clearSelection()
      displayInteractiveResults()
    }
  })

  // Restore L402 token from localStorage
  try {
    const stored = localStorage.getItem(L402_STORAGE_KEY)
    if (stored) {
      const token = JSON.parse(stored)
      interactiveEngine = new ValhallaEngine({
        baseUrl: VALHALLA_URL,
        headers: { Authorization: `L402 ${token.macaroon}:${token.preimage}` },
      })
    }
  } catch { /* ignore */ }

  if (!interactiveEngine) {
    interactiveEngine = new ValhallaEngine({ baseUrl: VALHALLA_URL })
  }
```

**Step 6: Verify in browser**

Open the demo page. Clicking Interactive tab should show controls, clicking the map should place draggable markers (up to 5), participant list should update, Find button should enable with 2+ participants.

**Step 7: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add docs/demo.js
git commit -m "feat: interactive mode — tab switching, click-to-place markers, controls"
```

---

## Task 12: Interactive demo — live pipeline

**Files:**
- Modify: `rendezvous-kit/docs/demo.js`

**Step 1: Implement the decomposed interactive pipeline**

Add the `runInteractive()` function:

```javascript
async function runInteractive() {
  if (interactiveParticipants.length < 2) return

  const thisAnimation = ++animationId
  hideError()
  hidePayment()
  clearMap()
  clearRouteLayers()
  resetPipeline()

  // Re-add participant markers (clearMap removed them)
  interactiveParticipants.forEach(p => p.marker.addTo(map))

  const participants = interactiveParticipants.map(p => ({
    lat: p.lat, lon: p.lon, label: p.label,
  }))
  const venueTypes = getSelectedVenueTypes()

  if (venueTypes.length === 0) {
    showError('Select at least one venue type.')
    return
  }

  const btn = document.getElementById('btn-find')
  btn.disabled = true
  btn.textContent = 'Computing...'

  try {
    // Step 1: Isochrones
    const isochrones = []
    for (let i = 0; i < participants.length; i++) {
      if (animationId !== thisAnimation) return

      let iso
      try {
        iso = await interactiveEngine.computeIsochrone(participants[i], selectedMode, selectedTime)
      } catch (err) {
        if (err instanceof ValhallaError && err.status === 402) {
          await handlePaymentRequired(err, thisAnimation, i)
          return
        }
        throw err
      }
      isochrones.push(iso)
      addIsochrone(i, iso.polygon)
      markStep('isochrones', i + 1, participants.length)
      await delay(150)
    }
    if (animationId !== thisAnimation) return

    // Step 2: Intersection
    const polygons = isochrones.map(iso => iso.polygon)
    const components = intersectPolygonsAll(polygons)
    if (components.length === 0) {
      markStep('intersection')
      showError('No overlapping area found — try increasing the time budget or moving participants closer.')
      resetFindButton()
      return
    }
    addIntersection(components)
    markStep('intersection', components.length > 1 ? components.length : undefined)
    await delay(200)
    if (animationId !== thisAnimation) return

    // Step 3: Venues
    const searchRegion = components.length === 1
      ? components[0]
      : envelopePolygon(components)
    let venues
    try {
      venues = await searchVenues(searchRegion, venueTypes)
    } catch {
      showError('Venue search failed — try again.')
      resetFindButton()
      return
    }
    if (venues.length === 0) {
      markStep('venues', 0)
      showError('No venues found in the intersection area — try different venue types or a larger time budget.')
      resetFindButton()
      return
    }
    markStep('venues', venues.length)
    await delay(200)
    if (animationId !== thisAnimation) return

    // Step 4: Route matrix for travel times
    let matrix
    try {
      const venuePoints = venues.map(v => ({ lat: v.lat, lon: v.lon }))
      matrix = await interactiveEngine.computeRouteMatrix(participants, venuePoints, selectedMode)
    } catch (err) {
      if (err instanceof ValhallaError && err.status === 402) {
        await handlePaymentRequired(err, thisAnimation, -1)
        return
      }
      throw err
    }

    // Score venues
    const suggestions = []
    for (let vi = 0; vi < venues.length; vi++) {
      const venue = venues[vi]
      const travelTimes = {}
      const times = []
      let reachable = true

      for (let pi = 0; pi < participants.length; pi++) {
        const entry = matrix.entries.find(
          e => e.originIndex === pi && e.destinationIndex === vi
        )
        const duration = entry?.durationMinutes ?? -1
        if (duration < 0 || duration > selectedTime) {
          reachable = false
          break
        }
        travelTimes[participants[pi].label] = Math.round(duration * 10) / 10
        times.push(duration)
      }

      if (!reachable) continue
      const fairnessScore = computeFairness(times, currentFairness)
      suggestions.push({ venue, travelTimes, fairnessScore })
    }

    suggestions.sort((a, b) => a.fairnessScore - b.fairnessScore)
    const topResults = suggestions.slice(0, 5)

    // Build a currentScenario-like object for displayResults reuse
    interactiveResults = {
      participants,
      mode: selectedMode,
      maxTimeMinutes: selectedTime,
      venueTypes,
      isochrones: isochrones.map(iso => iso.polygon),
      intersection: components,
      venues: topResults.map(s => ({
        name: s.venue.name,
        lat: s.venue.lat,
        lon: s.venue.lon,
        travelTimes: s.travelTimes,
      })),
    }
    currentScenario = interactiveResults

    addVenueMarkers(interactiveResults.venues)
    markStep('scored')
    displayResults()

    // Fit map
    fitToScenario(interactiveResults)

    // Update code panel
    updateCodePanel(interactiveResults)

  } catch (err) {
    console.error('Interactive pipeline error:', err)
    if (err instanceof ValhallaError) {
      showError(`Routing error (${err.status}): ${err.message}`)
    } else {
      showError('Routing service unavailable — check your connection.')
    }
  } finally {
    resetFindButton()
  }
}

function getSelectedVenueTypes() {
  const checks = document.querySelectorAll('#venue-checkboxes input:checked')
  return Array.from(checks).map(c => c.value)
}

function resetFindButton() {
  const btn = document.getElementById('btn-find')
  if (btn) {
    btn.disabled = interactiveParticipants.length < 2
    btn.textContent = 'Find rendezvous'
  }
}

function envelopePolygon(components) {
  let minLon = Infinity, minLat = Infinity
  let maxLon = -Infinity, maxLat = -Infinity
  for (const p of components) {
    for (const coord of p.coordinates[0]) {
      if (coord[0] < minLon) minLon = coord[0]
      if (coord[1] < minLat) minLat = coord[1]
      if (coord[0] > maxLon) maxLon = coord[0]
      if (coord[1] > maxLat) maxLat = coord[1]
    }
  }
  return {
    type: 'Polygon',
    coordinates: [[[minLon, minLat], [maxLon, minLat], [maxLon, maxLat], [minLon, maxLat], [minLon, minLat]]],
  }
}

function displayInteractiveResults() {
  if (!interactiveResults) return
  currentScenario = interactiveResults
  displayResults()
  updateVenueRanks()
}
```

**Step 2: Verify in browser**

Open the demo, switch to Interactive, place 2-3 markers near Bristol, pick Drive + 15min + cafe, click Find rendezvous. Should see:
- Isochrones appearing one by one
- Intersection flash
- Venue markers appearing
- Results in sidebar
- Code panel updates

If free tier is exhausted, should show a 402 error (payment flow comes next task).

**Step 3: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add docs/demo.js
git commit -m "feat: interactive mode — live decomposed pipeline with Valhalla"
```

---

## Task 13: Interactive demo — L402 payment flow

**Files:**
- Modify: `rendezvous-kit/docs/demo.js`

**Step 1: Implement payment detection and QR display**

Add the `handlePaymentRequired()` function and helpers:

```javascript
async function handlePaymentRequired(err, expectedAnimation, failedStep) {
  let paymentData
  try {
    paymentData = JSON.parse(err.body)
  } catch {
    showError('Payment required but could not parse invoice.')
    resetFindButton()
    return
  }

  const { invoice, macaroon, payment_hash, amount_sats } = paymentData
  if (!invoice || !macaroon || !payment_hash) {
    showError('Payment required but response is missing data.')
    resetFindButton()
    return
  }

  showPaymentUI(invoice, macaroon, payment_hash, amount_sats, expectedAnimation)
}

function showPaymentUI(bolt11, macaroon, paymentHash, amountSats, expectedAnimation) {
  const panel = document.getElementById('payment-panel')
  if (!panel) return

  // Generate QR code
  const qr = qrcode(0, 'L')
  qr.addData(bolt11.toUpperCase())  // BOLT11 in uppercase for alphanumeric QR mode (smaller)
  qr.make()

  panel.innerHTML = `
    <h4>Lightning Payment</h4>
    <p class="amount">${amountSats} sats</p>
    <div class="qr-container">${qr.createSvgTag({ cellSize: 4, margin: 0 })}</div>
    <br>
    <button class="copy-btn" id="copy-invoice">Copy invoice</button>
    <p class="status" id="payment-status">Waiting for payment...</p>
    <button class="cancel-btn" id="cancel-payment">Cancel</button>
  `
  panel.classList.remove('hidden')
  panel.classList.remove('paid')

  // Copy button
  document.getElementById('copy-invoice')?.addEventListener('click', () => {
    navigator.clipboard.writeText(bolt11).then(() => {
      document.getElementById('copy-invoice').textContent = 'Copied!'
      setTimeout(() => {
        const btn = document.getElementById('copy-invoice')
        if (btn) btn.textContent = 'Copy invoice'
      }, 2000)
    })
  })

  // Cancel button
  document.getElementById('cancel-payment')?.addEventListener('click', () => {
    hidePayment()
    resetFindButton()
    resetPipeline()
  })

  // Start polling
  pollForPayment(paymentHash, macaroon, expectedAnimation)
}

function pollForPayment(paymentHash, macaroon, expectedAnimation) {
  if (paymentPollTimer) clearInterval(paymentPollTimer)

  paymentPollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${VALHALLA_URL}/invoice-status/${paymentHash}`)
      if (!res.ok) return // silent retry
      const status = await res.json()

      if (status.paid && status.preimage) {
        clearInterval(paymentPollTimer)
        paymentPollTimer = null

        // Store token
        const token = { macaroon, preimage: status.preimage }
        localStorage.setItem(L402_STORAGE_KEY, JSON.stringify(token))

        // Create authenticated engine
        interactiveEngine = new ValhallaEngine({
          baseUrl: VALHALLA_URL,
          headers: { Authorization: `L402 ${macaroon}:${status.preimage}` },
        })

        // Flash "Paid!" and hide
        const panel = document.getElementById('payment-panel')
        const statusEl = document.getElementById('payment-status')
        if (statusEl) statusEl.textContent = 'Paid!'
        if (panel) panel.classList.add('paid')

        setTimeout(() => {
          hidePayment()
          // Re-run the pipeline with the authenticated engine
          if (animationId === expectedAnimation || expectedAnimation === animationId) {
            runInteractive()
          }
        }, 1500)
      }
    } catch {
      // Silent retry — polling continues
    }
  }, 3000)
}
```

**Step 2: Verify in browser**

This is hard to test without actually exhausting the free tier. To verify the UI:
1. Temporarily change `VALHALLA_URL` to an invalid URL to trigger an error
2. Or wait until free tier is exhausted and verify the payment panel appears

**Step 3: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add docs/demo.js
git commit -m "feat: interactive mode — L402 payment flow with QR code and polling"
```

---

## Task 14: Interactive demo — route display

**Files:**
- Modify: `rendezvous-kit/docs/demo.js`

**Step 1: Add route display functions**

```javascript
function clearRouteLayers() {
  for (const id of routeLayers) {
    try { map.removeLayer(id) } catch { /* may not exist */ }
    try { map.removeSource(id) } catch { /* may not exist */ }
  }
  routeLayers = []
  // Remove any open popups
  document.querySelectorAll('.maplibregl-popup').forEach(el => el.remove())
}

async function showRoutesForVenue(venue) {
  clearRouteLayers()
  if (!interactiveMode && !currentScenario?.routes) return

  const participants = interactiveMode
    ? interactiveParticipants.map(p => ({ lat: p.lat, lon: p.lon, label: p.label }))
    : currentScenario.participants

  if (interactiveMode) {
    // Live route computation
    for (let i = 0; i < participants.length; i++) {
      try {
        const route = await interactiveEngine.computeRoute(
          participants[i],
          { lat: venue.lat, lon: venue.lon },
          interactiveMode ? selectedMode : currentScenario.mode,
        )
        addRouteLayer(i, route)
      } catch (err) {
        if (err instanceof ValhallaError && err.status === 402) {
          showError('Daily free limit reached (10 requests). Try again tomorrow or self-host Valhalla.')
          return
        }
        console.error(`Route computation failed for ${participants[i].label}:`, err)
      }
    }
  } else if (currentScenario?.routes) {
    // Pre-baked routes from scenario JSON
    for (let i = 0; i < participants.length; i++) {
      const routeData = currentScenario.routes[participants[i].label]
      if (routeData) {
        addRouteLayer(i, {
          geometry: routeData.geometry,
          legs: routeData.legs,
        })
      }
    }
  }
}

function addRouteLayer(participantIndex, route) {
  const sourceId = `demo-route-${participantIndex}`
  const layerId = `demo-route-${participantIndex}-line`
  const colour = COLOURS[participantIndex % COLOURS.length]

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: route.geometry,
      properties: { participantIndex, legs: JSON.stringify(route.legs ?? []) },
    },
  })

  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': colour,
      'line-width': 4,
      'line-dasharray': [2, 1],
      'line-opacity': 0.9,
    },
  })

  routeLayers.push(sourceId, layerId)

  // Click route to show directions popup
  map.on('click', layerId, (e) => {
    const legs = JSON.parse(e.features[0].properties.legs || '[]')
    if (legs.length === 0) return

    const html = `<div class="route-popup">${
      legs.map(l => `<div class="leg">${esc(l.instruction)} (${l.distanceKm.toFixed(1)} km, ${l.durationMinutes} min)</div>`).join('')
    }</div>`

    new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map)
  })

  // Cursor pointer on hover
  map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = interactiveMode ? 'crosshair' : ''
  })
}
```

**Step 2: Wire routes into venue selection**

Update the `selectVenue()` function. After the existing code that highlights markers and flies to the venue, add:

```javascript
  // Show routes to this venue
  const venue = venueMarkers.find(vm => vm.venue.name === name)?.venue
  if (venue) {
    showRoutesForVenue(venue)
  }
```

Also update `clearSelection()` to clear routes:

```javascript
function clearSelection() {
  document.querySelectorAll('.result-card.selected').forEach(c => c.classList.remove('selected'))
  for (const { marker } of venueMarkers) {
    marker.getElement().classList.remove('selected')
  }
  clearParticipantHighlight()
  clearRouteLayers()
}
```

**Step 3: Verify in browser**

In Interactive mode: run a search, click a result card → routes should appear as dashed coloured lines. Click the route line → popup with directions. Click another result → old routes clear, new ones appear.

**Step 4: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add docs/demo.js
git commit -m "feat: on-demand route display with clickable turn-by-turn popups"
```

---

## Task 15: Regenerate Showcase scenario data

**Files:**
- Create: `rendezvous-kit/docs/regenerate-scenarios.js`
- Modify: `rendezvous-kit/docs/scenarios/*.json` (all 8 scenarios)

**Step 1: Create the regeneration script**

Create `rendezvous-kit/docs/regenerate-scenarios.js`:

```javascript
#!/usr/bin/env node
// Regenerates scenario JSON files using live Valhalla routing data.
// Usage: node regenerate-scenarios.js
//
// Requires: rendezvous-kit built locally (uses ../dist/)
// Calls: routing.trotters.cc (free tier — 10 requests/day per IP)
// WARNING: Each scenario uses N isochrones + 1 matrix + N routes = ~2N+1 requests.
//          Running all 8 scenarios will exceed the free tier.
//          Use an L402 token or run against a local Valhalla instance.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Import from local build (not npm — we need the latest with computeRoute)
const __dirname = dirname(fileURLToPath(import.meta.url))
const rkPath = join(__dirname, '..', 'dist', 'index.js')
const { ValhallaEngine, intersectPolygonsAll, searchVenues } = await import(rkPath)

const VALHALLA_URL = process.env.VALHALLA_URL ?? 'https://routing.trotters.cc'
const AUTH_HEADER = process.env.L402_TOKEN  // Optional: 'macaroon:preimage'

const headers = AUTH_HEADER ? { Authorization: `L402 ${AUTH_HEADER}` } : {}
const engine = new ValhallaEngine({ baseUrl: VALHALLA_URL, headers })

const scenariosDir = join(__dirname, 'scenarios')
const files = readdirSync(scenariosDir).filter(f => f.endsWith('.json'))

async function regenerateScenario(filename) {
  const filepath = join(scenariosDir, filename)
  const scenario = JSON.parse(readFileSync(filepath, 'utf-8'))

  console.log(`\n--- ${scenario.name} (${filename}) ---`)
  console.log(`  Participants: ${scenario.participants.length}`)
  console.log(`  Mode: ${scenario.mode}, Time: ${scenario.maxTimeMinutes} min`)

  // Step 1: Isochrones
  const isochrones = []
  for (const p of scenario.participants) {
    console.log(`  Computing isochrone for ${p.label}...`)
    const iso = await engine.computeIsochrone(p, scenario.mode, scenario.maxTimeMinutes)
    isochrones.push(iso.polygon)
    await delay(500) // Rate limiting courtesy
  }
  scenario.isochrones = isochrones

  // Step 2: Intersection
  const components = intersectPolygonsAll(isochrones)
  if (components.length === 0) {
    console.log('  WARNING: No intersection found!')
    scenario.intersection = []
    scenario.venues = []
    writeFileSync(filepath, JSON.stringify(scenario, null, 2) + '\n')
    return
  }
  scenario.intersection = components
  console.log(`  Intersection: ${components.length} component(s)`)

  // Step 3: Venues
  const searchRegion = components.length === 1 ? components[0] : envelopePolygon(components)
  let venues = await searchVenues(searchRegion, scenario.venueTypes)
  console.log(`  Venues found: ${venues.length}`)

  if (venues.length === 0) {
    scenario.venues = []
    writeFileSync(filepath, JSON.stringify(scenario, null, 2) + '\n')
    return
  }

  // Step 4: Route matrix
  console.log('  Computing route matrix...')
  const venuePoints = venues.map(v => ({ lat: v.lat, lon: v.lon }))
  const matrix = await engine.computeRouteMatrix(scenario.participants, venuePoints, scenario.mode)
  await delay(500)

  // Score and rank
  const scored = []
  for (let vi = 0; vi < venues.length; vi++) {
    const travelTimes = {}
    const times = []
    let reachable = true

    for (let pi = 0; pi < scenario.participants.length; pi++) {
      const entry = matrix.entries.find(e => e.originIndex === pi && e.destinationIndex === vi)
      const duration = entry?.durationMinutes ?? -1
      if (duration < 0 || duration > scenario.maxTimeMinutes) { reachable = false; break }
      travelTimes[scenario.participants[pi].label] = Math.round(duration * 10) / 10
      times.push(duration)
    }

    if (!reachable) continue
    const score = Math.max(...times) // min_max default
    scored.push({ venue: venues[vi], travelTimes, score })
  }

  scored.sort((a, b) => a.score - b.score)
  const topVenues = scored.slice(0, 5)

  scenario.venues = topVenues.map(s => ({
    name: s.venue.name,
    lat: s.venue.lat,
    lon: s.venue.lon,
    travelTimes: s.travelTimes,
  }))
  console.log(`  Top venues: ${scenario.venues.map(v => v.name).join(', ')}`)

  // Step 5: Routes to #1 venue
  if (topVenues.length > 0) {
    const bestVenue = topVenues[0].venue
    const routes = {}
    for (const p of scenario.participants) {
      console.log(`  Computing route ${p.label} → ${bestVenue.name}...`)
      try {
        const route = await engine.computeRoute(p, bestVenue, scenario.mode)
        routes[p.label] = {
          geometry: route.geometry,
          legs: route.legs,
        }
        await delay(500)
      } catch (err) {
        console.error(`  Route failed for ${p.label}: ${err.message}`)
      }
    }
    scenario.routes = routes
  }

  writeFileSync(filepath, JSON.stringify(scenario, null, 2) + '\n')
  console.log(`  Written: ${filepath}`)
}

function envelopePolygon(components) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  for (const p of components) {
    for (const coord of p.coordinates[0]) {
      if (coord[0] < minLon) minLon = coord[0]
      if (coord[1] < minLat) minLat = coord[1]
      if (coord[0] > maxLon) maxLon = coord[0]
      if (coord[1] > maxLat) maxLat = coord[1]
    }
  }
  return { type: 'Polygon', coordinates: [[[minLon, minLat], [maxLon, minLat], [maxLon, maxLat], [minLon, maxLat], [minLon, minLat]]] }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Run
console.log(`Valhalla URL: ${VALHALLA_URL}`)
console.log(`Auth: ${AUTH_HEADER ? 'L402 token provided' : 'no token (free tier)'}`)
console.log(`Scenarios: ${files.join(', ')}`)

for (const file of files) {
  try {
    await regenerateScenario(file)
  } catch (err) {
    console.error(`FAILED: ${file} — ${err.message}`)
    if (err.message?.includes('402')) {
      console.error('Free tier exhausted. Provide L402_TOKEN env var or use a local Valhalla instance.')
      process.exit(1)
    }
  }
}

console.log('\nDone!')
```

**Step 2: Build rendezvous-kit (needed by the script)**

Run: `cd /Users/darren/WebstormProjects/rendezvous-kit && npm run build`

**Step 3: Run the script (requires Valhalla credits or local instance)**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit/docs

# Option A: With L402 token
L402_TOKEN='macaroon:preimage' node regenerate-scenarios.js

# Option B: Against local Valhalla
VALHALLA_URL='http://localhost:8002' node regenerate-scenarios.js

# Option C: Free tier (will only do ~1-2 scenarios before 402)
node regenerate-scenarios.js
```

Note: Running all 8 scenarios requires approximately 60-80 Valhalla requests. Use an L402 token or local instance.

**Step 4: Verify the regenerated data**

Open the demo, Showcase tab. Each scenario should show updated isochrone shapes that match real road networks. Clicking a venue result should show routes (if routes were baked in).

**Step 5: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add docs/regenerate-scenarios.js docs/scenarios/
git commit -m "feat: regenerate scenario data with real Valhalla responses and route geometries"
```

---

## Task 16: Final integration and code panel update

**Files:**
- Modify: `rendezvous-kit/docs/demo.js`

**Step 1: Update code panel for interactive mode**

The `updateCodePanel()` function should show the code with the live Valhalla URL when in interactive mode:

Find the `updateCodePanel` function and update the engine URL:

```javascript
function updateCodePanel(s) {
  const participantLines = s.participants
    .map(p => `    { lat: ${p.lat}, lon: ${p.lon}, label: '${p.label}' },`)
    .join('\n')

  const engineUrl = interactiveMode ? VALHALLA_URL : 'https://valhalla.example.com'

  const code = `import { findRendezvous, ValhallaEngine } from 'rendezvous-kit'

const engine = new ValhallaEngine({ baseUrl: '${engineUrl}' })

const results = await findRendezvous(engine, {
  participants: [
${participantLines}
  ],
  mode: '${s.mode}',
  maxTimeMinutes: ${s.maxTimeMinutes},
  venueTypes: ${JSON.stringify(s.venueTypes)},
  fairness: '${currentFairness}',
})

console.log(results)
// → ${s.venues.length} ranked venue suggestions with travel times`

  document.getElementById('code-content').textContent = code
}
```

**Step 2: Verify full flow end-to-end**

1. Open demo, Showcase works as before
2. Switch to Interactive, place 3 markers near Bristol
3. Pick Drive, 15 min, cafe + pub
4. Click Find rendezvous → pipeline animates, results appear
5. Click a result → routes appear as dashed lines
6. Click a route line → directions popup
7. Change fairness strategy → results re-rank without re-fetching
8. Clear all → resets
9. Code panel shows correct code for both modes
10. Switch back to Showcase → works as before

**Step 3: Commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit
git add docs/demo.js
git commit -m "feat: update code panel for interactive mode and final integration"
```

---

## Task 17: Final verification and cleanup

**Step 1: Run full test suites**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit && npx vitest run
cd /Users/darren/WebstormProjects/toll-booth && npx vitest run
```

Expected: ALL PASS in both repos.

**Step 2: Type check**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit && npx tsc --noEmit
cd /Users/darren/WebstormProjects/toll-booth && npx tsc --noEmit
```

Expected: No errors.

**Step 3: Verify the demo loads without console errors**

Open `rendezvous-kit/docs/index.html` in browser, check DevTools console. There should be no errors on load. The esm.sh import of `rendezvous-kit@1.10.0` should resolve successfully (requires Task 5 publish to have completed).

**Step 4: Push all repos**

```bash
cd /Users/darren/WebstormProjects/rendezvous-kit && git push
cd /Users/darren/WebstormProjects/toll-booth && git push
```

After pushing rendezvous-kit, the GitHub Pages deployment will go live with the interactive demo.
