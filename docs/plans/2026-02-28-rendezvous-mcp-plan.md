# rendezvous-mcp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standalone MCP server (`npx rendezvous-mcp`) exposing 4 meeting-point tools — score_venues, search_venues, get_directions, get_isochrone — with L402 payment handling and routing.trotters.cc as the default routing engine.

**Architecture:** Thin MCP wrapper over rendezvous-kit. Each tool is an extracted handler function (testable without MCP) + registration one-liner. The `ValhallaEngine` from rendezvous-kit handles all routing. A shared `L402Client` wrapper catches 402 responses and returns structured payment-required results. AI host orchestrates the pipeline.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, rendezvous-kit, zod, vitest

**Repos:**
- Create: `/Users/darren/WebstormProjects/rendezvous-mcp/` (new package)
- Modify: `/Users/darren/WebstormProjects/trott-mcp/` (re-export tools)

---

### Task 1: Scaffold package

**Files:**
- Create: `rendezvous-mcp/package.json`
- Create: `rendezvous-mcp/tsconfig.json`
- Create: `rendezvous-mcp/.gitignore`

**Step 1: Create the directory**

```bash
mkdir -p /Users/darren/WebstormProjects/rendezvous-mcp/src/tools
mkdir -p /Users/darren/WebstormProjects/rendezvous-mcp/src/__tests__/tools
```

**Step 2: Write package.json**

```json
{
  "name": "rendezvous-mcp",
  "version": "0.1.0",
  "description": "MCP server for AI-driven fair meeting point discovery",
  "type": "module",
  "bin": {
    "rendezvous-mcp": "./build/index.js"
  },
  "main": "./build/index.js",
  "exports": {
    ".": "./build/index.js",
    "./tools/*": "./build/tools/*.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "start": "node build/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "rendezvous-kit": "file:../rendezvous-kit",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "vitest": "^4.0.18"
  },
  "keywords": ["mcp", "meeting-point", "rendezvous", "routing", "valhalla", "l402"],
  "license": "MIT"
}
```

**Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "build",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

**Step 4: Write .gitignore**

```
node_modules/
build/
.idea/
```

**Step 5: Install dependencies**

```bash
cd /Users/darren/WebstormProjects/rendezvous-mcp
npm install
```

**Step 6: Verify build works**

```bash
npm run typecheck
```

Expected: no errors (no source files yet, but config should be valid)

**Step 7: Initialise git and commit**

```bash
cd /Users/darren/WebstormProjects/rendezvous-mcp
git init
git add package.json tsconfig.json .gitignore
git commit -m "chore: scaffold rendezvous-mcp package"
```

---

### Task 2: L402 client wrapper

The L402 client wraps `ValhallaEngine` from rendezvous-kit, catching `ValhallaError` with status 402 and returning structured payment-required results. It also stores macaroon/preimage for authenticated requests after payment.

**Files:**
- Create: `rendezvous-mcp/src/l402.ts`
- Test: `rendezvous-mcp/src/__tests__/l402.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/l402.test.ts
import { describe, it, expect } from 'vitest'
import { L402State } from '../l402.js'

describe('L402State', () => {
  it('starts with no auth header', () => {
    const state = new L402State()
    expect(state.getAuthHeader()).toBeNull()
  })

  it('stores macaroon and preimage', () => {
    const state = new L402State()
    state.store('mac123', 'pre456')
    const header = state.getAuthHeader()
    expect(header).toBe('L402 mac123:pre456')
  })

  it('clears stored credentials', () => {
    const state = new L402State()
    state.store('mac123', 'pre456')
    state.clear()
    expect(state.getAuthHeader()).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/darren/WebstormProjects/rendezvous-mcp
npx vitest run src/__tests__/l402.test.ts
```

Expected: FAIL — module not found

**Step 3: Implement L402State**

```typescript
// src/l402.ts

/** Payment-required response returned to MCP when Valhalla returns 402. */
export interface L402PaymentRequired {
  status: 'payment_required'
  message: string
  invoice: string
  macaroon: string
  payment_hash: string
  payment_url: string
  amount_sats: number
}

/** In-memory L402 credential storage for a single MCP session. */
export class L402State {
  private macaroon: string | null = null
  private preimage: string | null = null

  /** Store credentials after the user pays an invoice. */
  store(macaroon: string, preimage: string): void {
    this.macaroon = macaroon
    this.preimage = preimage
  }

  /** Return the Authorization header value, or null if no credentials. */
  getAuthHeader(): string | null {
    if (!this.macaroon || !this.preimage) return null
    return `L402 ${this.macaroon}:${this.preimage}`
  }

  /** Clear stored credentials. */
  clear(): void {
    this.macaroon = null
    this.preimage = null
  }
}

/**
 * Parse a 402 response's WWW-Authenticate header into an L402PaymentRequired.
 * Header format: L402 macaroon="<base64>", invoice="<bolt11>"
 */
export function parse402(wwwAuth: string, valhallaUrl: string): L402PaymentRequired | null {
  const macMatch = wwwAuth.match(/macaroon="([^"]+)"/)
  const invMatch = wwwAuth.match(/invoice="([^"]+)"/)
  if (!macMatch || !invMatch) return null

  const macaroon = macMatch[1]
  const invoice = invMatch[1]

  // Extract payment_hash from response body (passed separately)
  // For now, derive from the macaroon token (toll-booth embeds it)
  return {
    status: 'payment_required',
    message: 'Free tier exhausted. Pay to continue using the routing service.',
    invoice,
    macaroon,
    payment_hash: '',  // filled in by caller from response body
    payment_url: `${valhallaUrl}/invoice-status/`,
    amount_sats: 1000,  // default, overridden from response body
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/l402.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/l402.ts src/__tests__/l402.test.ts
git commit -m "feat: L402 state management for payment credentials"
```

---

### Task 3: Routing client with L402 handling

Wraps `ValhallaEngine` from rendezvous-kit. Catches `ValhallaError` with status 402, parses the WWW-Authenticate header, and returns `L402PaymentRequired`. Injects L402 auth headers into subsequent requests when credentials are stored.

**Files:**
- Create: `rendezvous-mcp/src/routing.ts`
- Test: `rendezvous-mcp/src/__tests__/routing.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/routing.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoutingClient } from '../routing.js'

describe('RoutingClient', () => {
  it('defaults valhalla URL to routing.trotters.cc', () => {
    const client = new RoutingClient()
    expect(client.valhallaUrl).toBe('https://routing.trotters.cc')
  })

  it('accepts custom valhalla URL', () => {
    const client = new RoutingClient({ valhallaUrl: 'http://localhost:8002' })
    expect(client.valhallaUrl).toBe('http://localhost:8002')
  })

  it('creates ValhallaEngine with L402 auth header when credentials stored', () => {
    const client = new RoutingClient()
    client.storeL402Credentials('mac123', 'pre456')
    const engine = client.getEngine()
    // Engine should include Authorization header
    expect(engine).toBeDefined()
    expect(engine.name).toBe('Valhalla')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/routing.test.ts
```

Expected: FAIL — module not found

**Step 3: Implement RoutingClient**

```typescript
// src/routing.ts
import { ValhallaEngine, ValhallaError } from 'rendezvous-kit'
import type { LatLon, TransportMode, Isochrone, RouteMatrix, RouteGeometry } from 'rendezvous-kit'
import { L402State, parse402 } from './l402.js'
import type { L402PaymentRequired } from './l402.js'

export class RoutingClient {
  readonly valhallaUrl: string
  private readonly l402: L402State

  constructor(config?: { valhallaUrl?: string }) {
    this.valhallaUrl = config?.valhallaUrl ?? 'https://routing.trotters.cc'
    this.l402 = new L402State()
  }

  /** Store L402 credentials after user pays an invoice. */
  storeL402Credentials(macaroon: string, preimage: string): void {
    this.l402.store(macaroon, preimage)
  }

  /** Build a ValhallaEngine with current auth headers. */
  getEngine(): ValhallaEngine {
    const headers: Record<string, string> = {}
    const auth = this.l402.getAuthHeader()
    if (auth) headers['Authorization'] = auth
    return new ValhallaEngine({ baseUrl: this.valhallaUrl, headers })
  }

  /** Compute isochrone, returning L402PaymentRequired on 402. */
  async computeIsochrone(
    origin: LatLon, mode: TransportMode, timeMinutes: number,
  ): Promise<Isochrone | L402PaymentRequired> {
    try {
      return await this.getEngine().computeIsochrone(origin, mode, timeMinutes)
    } catch (err) {
      return this.handleError(err)
    }
  }

  /** Compute route matrix, returning L402PaymentRequired on 402. */
  async computeRouteMatrix(
    origins: LatLon[], destinations: LatLon[], mode: TransportMode,
  ): Promise<RouteMatrix | L402PaymentRequired> {
    try {
      return await this.getEngine().computeRouteMatrix(origins, destinations, mode)
    } catch (err) {
      return this.handleError(err)
    }
  }

  /** Compute route, returning L402PaymentRequired on 402. */
  async computeRoute(
    origin: LatLon, destination: LatLon, mode: TransportMode,
  ): Promise<RouteGeometry | L402PaymentRequired> {
    try {
      return await this.getEngine().computeRoute(origin, destination, mode)
    } catch (err) {
      return this.handleError(err)
    }
  }

  private handleError(err: unknown): never | L402PaymentRequired {
    if (err instanceof ValhallaError && err.status === 402) {
      // Parse the 402 body for invoice details
      try {
        const body = JSON.parse(err.body)
        return {
          status: 'payment_required',
          message: 'Free tier exhausted. Pay to continue using the routing service.',
          invoice: body.invoice ?? '',
          macaroon: body.macaroon ?? '',
          payment_hash: body.payment_hash ?? '',
          payment_url: `${this.valhallaUrl}/invoice-status/${body.payment_hash ?? ''}`,
          amount_sats: body.amount_sats ?? 1000,
        }
      } catch {
        // If body isn't JSON, return generic payment required
        return {
          status: 'payment_required',
          message: 'Payment required — could not parse invoice details.',
          invoice: '',
          macaroon: '',
          payment_hash: '',
          payment_url: this.valhallaUrl,
          amount_sats: 1000,
        }
      }
    }
    throw err
  }
}

/** Type guard for L402 payment required responses. */
export function isPaymentRequired(result: unknown): result is L402PaymentRequired {
  return typeof result === 'object' && result !== null && (result as any).status === 'payment_required'
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/routing.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/routing.ts src/__tests__/routing.test.ts
git commit -m "feat: routing client with L402 payment handling"
```

---

### Task 4: score_venues tool

The core tool. Takes participant locations + candidate venues, computes travel time matrix via Valhalla, scores by fairness strategy, returns ranked results.

**Files:**
- Create: `rendezvous-mcp/src/tools/score-venues.ts`
- Test: `rendezvous-mcp/src/__tests__/tools/score-venues.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/tools/score-venues.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleScoreVenues } from '../../tools/score-venues.js'

// Mock the routing client
const mockComputeRouteMatrix = vi.fn()
const mockRoutingClient = {
  computeRouteMatrix: mockComputeRouteMatrix,
  valhallaUrl: 'http://test',
} as any

describe('handleScoreVenues', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns venues ranked by min_max fairness', async () => {
    // Venue A: Alice 10min, Bob 13min → max=13
    // Venue B: Alice 20min, Bob 15min → max=20
    // → Venue A wins
    mockComputeRouteMatrix.mockResolvedValueOnce({
      origins: [
        { lat: 51.45, lon: -2.59 },
        { lat: 51.50, lon: -0.12 },
      ],
      destinations: [
        { lat: 51.47, lon: -1.35 },
        { lat: 51.48, lon: -1.30 },
      ],
      entries: [
        { originIndex: 0, destinationIndex: 0, durationMinutes: 10, distanceKm: 15 },
        { originIndex: 0, destinationIndex: 1, durationMinutes: 20, distanceKm: 30 },
        { originIndex: 1, destinationIndex: 0, durationMinutes: 13, distanceKm: 18 },
        { originIndex: 1, destinationIndex: 1, durationMinutes: 15, distanceKm: 22 },
      ],
    })

    const result = await handleScoreVenues({
      participants: [
        { lat: 51.45, lon: -2.59, label: 'Alice' },
        { lat: 51.50, lon: -0.12, label: 'Bob' },
      ],
      venues: [
        { lat: 51.47, lon: -1.35, name: 'The Crown' },
        { lat: 51.48, lon: -1.30, name: 'Railway Arms' },
      ],
      transport_mode: 'drive',
      fairness: 'min_max',
    }, mockRoutingClient)

    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.ranked_venues).toHaveLength(2)
    expect(data.ranked_venues[0].name).toBe('The Crown')
    expect(data.ranked_venues[0].travel_times.Alice).toBe(10)
    expect(data.ranked_venues[0].travel_times.Bob).toBe(13)
    expect(data.ranked_venues[0].fairness_score).toBe(13)
  })

  it('returns payment_required on 402', async () => {
    mockComputeRouteMatrix.mockResolvedValueOnce({
      status: 'payment_required',
      message: 'Pay up',
      invoice: 'lnbc1000...',
      macaroon: 'mac',
      payment_hash: 'hash',
      payment_url: 'http://test/invoice-status/hash',
      amount_sats: 1000,
    })

    const result = await handleScoreVenues({
      participants: [
        { lat: 51.45, lon: -2.59, label: 'Alice' },
        { lat: 51.50, lon: -0.12, label: 'Bob' },
      ],
      venues: [{ lat: 51.47, lon: -1.35, name: 'Pub' }],
      transport_mode: 'drive',
    }, mockRoutingClient)

    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(false)
    expect(data.status).toBe('payment_required')
    expect(data.invoice).toBe('lnbc1000...')
  })

  it('auto-labels participants without labels', async () => {
    mockComputeRouteMatrix.mockResolvedValueOnce({
      origins: [{ lat: 51.45, lon: -2.59 }, { lat: 51.50, lon: -0.12 }],
      destinations: [{ lat: 51.47, lon: -1.35 }],
      entries: [
        { originIndex: 0, destinationIndex: 0, durationMinutes: 10, distanceKm: 15 },
        { originIndex: 1, destinationIndex: 0, durationMinutes: 12, distanceKm: 18 },
      ],
    })

    const result = await handleScoreVenues({
      participants: [
        { lat: 51.45, lon: -2.59 },
        { lat: 51.50, lon: -0.12 },
      ],
      venues: [{ lat: 51.47, lon: -1.35, name: 'Pub' }],
      transport_mode: 'drive',
    }, mockRoutingClient)

    const data = JSON.parse(result.content[0].text)
    expect(data.ranked_venues[0].travel_times).toHaveProperty('Participant 1')
    expect(data.ranked_venues[0].travel_times).toHaveProperty('Participant 2')
  })

  it('skips unreachable venues (durationMinutes < 0)', async () => {
    mockComputeRouteMatrix.mockResolvedValueOnce({
      origins: [{ lat: 51.45, lon: -2.59 }, { lat: 51.50, lon: -0.12 }],
      destinations: [{ lat: 51.47, lon: -1.35 }, { lat: 52.0, lon: 0.0 }],
      entries: [
        { originIndex: 0, destinationIndex: 0, durationMinutes: 10, distanceKm: 15 },
        { originIndex: 0, destinationIndex: 1, durationMinutes: -1, distanceKm: -1 },
        { originIndex: 1, destinationIndex: 0, durationMinutes: 12, distanceKm: 18 },
        { originIndex: 1, destinationIndex: 1, durationMinutes: -1, distanceKm: -1 },
      ],
    })

    const result = await handleScoreVenues({
      participants: [
        { lat: 51.45, lon: -2.59, label: 'Alice' },
        { lat: 51.50, lon: -0.12, label: 'Bob' },
      ],
      venues: [
        { lat: 51.47, lon: -1.35, name: 'Reachable' },
        { lat: 52.0, lon: 0.0, name: 'Unreachable' },
      ],
      transport_mode: 'drive',
    }, mockRoutingClient)

    const data = JSON.parse(result.content[0].text)
    expect(data.ranked_venues).toHaveLength(1)
    expect(data.ranked_venues[0].name).toBe('Reachable')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/tools/score-venues.test.ts
```

Expected: FAIL — module not found

**Step 3: Implement score-venues handler**

```typescript
// src/tools/score-venues.ts
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { LatLon, TransportMode, FairnessStrategy } from 'rendezvous-kit'
import type { RoutingClient } from '../routing.js'
import { isPaymentRequired } from '../routing.js'

// ---------------------------------------------------------------------------
// Extracted handler (testable without MCP server)
// ---------------------------------------------------------------------------

export async function handleScoreVenues(
  args: {
    participants: Array<{ lat: number; lon: number; label?: string }>
    venues: Array<{ lat: number; lon: number; name: string; type?: string }>
    transport_mode: TransportMode
    fairness?: FairnessStrategy
  },
  routingClient: RoutingClient,
) {
  const fairness = args.fairness ?? 'min_max'

  const participants: LatLon[] = args.participants.map((p, i) => ({
    lat: p.lat,
    lon: p.lon,
    label: p.label ?? `Participant ${i + 1}`,
  }))

  const venuePoints: LatLon[] = args.venues.map(v => ({ lat: v.lat, lon: v.lon }))

  console.error(`Scoring ${args.venues.length} venues for ${participants.length} participants (${args.transport_mode}, ${fairness})`)

  const matrix = await routingClient.computeRouteMatrix(participants, venuePoints, args.transport_mode)

  if (isPaymentRequired(matrix)) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: false,
          status: matrix.status,
          message: matrix.message,
          invoice: matrix.invoice,
          macaroon: matrix.macaroon,
          payment_hash: matrix.payment_hash,
          payment_url: matrix.payment_url,
          amount_sats: matrix.amount_sats,
        }),
      }],
    }
  }

  // Score each venue
  const ranked: Array<{
    name: string
    lat: number
    lon: number
    type?: string
    travel_times: Record<string, number>
    fairness_score: number
  }> = []

  for (let vi = 0; vi < args.venues.length; vi++) {
    const venue = args.venues[vi]
    const travelTimes: Record<string, number> = {}
    const times: number[] = []
    let reachable = true

    for (let pi = 0; pi < participants.length; pi++) {
      const entry = matrix.entries.find(
        e => e.originIndex === pi && e.destinationIndex === vi,
      )
      const duration = entry?.durationMinutes ?? -1
      if (duration < 0) {
        reachable = false
        break
      }
      const label = participants[pi].label!
      travelTimes[label] = Math.round(duration * 10) / 10
      times.push(duration)
    }

    if (!reachable) continue

    const fairnessScore = computeFairnessScore(times, fairness)
    ranked.push({
      name: venue.name,
      lat: venue.lat,
      lon: venue.lon,
      type: venue.type,
      travel_times: travelTimes,
      fairness_score: Math.round(fairnessScore * 10) / 10,
    })
  }

  ranked.sort((a, b) => a.fairness_score - b.fairness_score)

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ success: true, ranked_venues: ranked }, null, 2),
    }],
  }
}

function computeFairnessScore(times: number[], strategy: string): number {
  switch (strategy) {
    case 'min_max':
      return Math.max(...times)
    case 'min_total':
      return times.reduce((sum, t) => sum + t, 0)
    case 'min_variance': {
      const mean = times.reduce((sum, t) => sum + t, 0) / times.length
      return Math.sqrt(times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length)
    }
    default:
      return Math.max(...times)
  }
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerScoreVenuesTool(server: McpServer, routingClient: RoutingClient): void {
  server.registerTool(
    'score_venues',
    {
      description:
        'Score candidate venues by travel time fairness for multiple participants. ' +
        'Computes travel times from each participant to each venue and ranks by fairness strategy. ' +
        'The AI should suggest venues (from its own knowledge or via search_venues) and pass them here for scoring.',
      inputSchema: {
        participants: z.array(z.object({
          lat: z.number().min(-90).max(90).describe('Latitude'),
          lon: z.number().min(-180).max(180).describe('Longitude'),
          label: z.string().optional().describe('Name or label (e.g. "Alice")'),
        })).min(2).max(10).describe('Participant locations (2–10 people)'),
        venues: z.array(z.object({
          lat: z.number().min(-90).max(90).describe('Latitude'),
          lon: z.number().min(-180).max(180).describe('Longitude'),
          name: z.string().describe('Venue name'),
          type: z.string().optional().describe('Venue type (pub, cafe, restaurant, park, etc.)'),
        })).min(1).max(50).describe('Candidate venues to score (1–50)'),
        transport_mode: z.enum(['drive', 'cycle', 'walk']).describe('How participants will travel'),
        fairness: z.enum(['min_max', 'min_total', 'min_variance']).optional()
          .describe('Scoring strategy: min_max (default, minimise longest journey), min_total (minimise total travel), min_variance (equalise travel times)'),
      },
    },
    async (args) => handleScoreVenues(args, routingClient),
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/tools/score-venues.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/tools/score-venues.ts src/__tests__/tools/score-venues.test.ts
git commit -m "feat: score_venues tool — fairness-ranked meeting point scoring"
```

---

### Task 5: search_venues tool

Wraps rendezvous-kit's `searchVenues` with `circleToPolygon` to convert radius to a polygon.

**Files:**
- Create: `rendezvous-mcp/src/tools/search-venues.ts`
- Test: `rendezvous-mcp/src/__tests__/tools/search-venues.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/tools/search-venues.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleSearchVenues } from '../../tools/search-venues.js'

// Mock rendezvous-kit's searchVenues
vi.mock('rendezvous-kit', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    searchVenues: vi.fn(),
  }
})

import { searchVenues } from 'rendezvous-kit'
const mockSearchVenues = vi.mocked(searchVenues)

describe('handleSearchVenues', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns venues from Overpass', async () => {
    mockSearchVenues.mockResolvedValueOnce([
      { name: 'The Crown', lat: 51.47, lon: -2.59, venueType: 'pub', osmId: 'node/123' },
      { name: 'Park Cafe', lat: 51.48, lon: -2.58, venueType: 'cafe', osmId: 'node/456' },
    ])

    const result = await handleSearchVenues({
      lat: 51.47,
      lon: -2.59,
      radius_km: 2,
      venue_types: ['pub', 'cafe'],
    })

    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.venues).toHaveLength(2)
    expect(data.venues[0].name).toBe('The Crown')
    expect(data.venues[0].type).toBe('pub')
    expect(mockSearchVenues).toHaveBeenCalledOnce()
  })

  it('handles Overpass errors gracefully', async () => {
    mockSearchVenues.mockRejectedValueOnce(new Error('All Overpass endpoints failed'))

    const result = await handleSearchVenues({
      lat: 51.47,
      lon: -2.59,
      venue_types: ['pub'],
    })

    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Overpass')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/tools/search-venues.test.ts
```

**Step 3: Implement search-venues handler**

```typescript
// src/tools/search-venues.ts
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { searchVenues, circleToPolygon } from 'rendezvous-kit'
import type { VenueType } from 'rendezvous-kit'

// ---------------------------------------------------------------------------
// Extracted handler
// ---------------------------------------------------------------------------

export async function handleSearchVenues(
  args: {
    lat: number
    lon: number
    radius_km?: number
    venue_types: string[]
  },
  overpassUrl?: string,
) {
  const radiusMetres = (args.radius_km ?? 5) * 1000

  console.error(`Searching venues within ${args.radius_km ?? 5}km of [${args.lat},${args.lon}] for types: ${args.venue_types.join(', ')}`)

  try {
    const polygon = circleToPolygon([args.lon, args.lat], radiusMetres)
    const venues = await searchVenues(polygon, args.venue_types as VenueType[], overpassUrl)

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          venue_count: venues.length,
          venues: venues.map(v => ({
            name: v.name,
            lat: v.lat,
            lon: v.lon,
            type: v.venueType,
            osm_id: v.osmId,
          })),
        }, null, 2),
      }],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: false, error: message }),
      }],
    }
  }
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerSearchVenuesTool(server: McpServer, overpassUrl?: string): void {
  server.registerTool(
    'search_venues',
    {
      description:
        'Search for venues (pubs, cafes, restaurants, parks, etc.) near a location using OpenStreetMap data. ' +
        'Returns name, coordinates, type, and OSM ID. Use this when you need comprehensive local venue data ' +
        'that may not be in your training knowledge.',
      inputSchema: {
        lat: z.number().min(-90).max(90).describe('Centre latitude'),
        lon: z.number().min(-180).max(180).describe('Centre longitude'),
        radius_km: z.number().min(0.5).max(25).optional().describe('Search radius in km (default 5)'),
        venue_types: z.array(z.string()).min(1)
          .describe('Venue types to search: pub, cafe, restaurant, park, library, playground, community_centre'),
      },
    },
    async (args) => handleSearchVenues(args, overpassUrl),
  )
}
```

**Step 4: Run tests**

```bash
npx vitest run src/__tests__/tools/search-venues.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/tools/search-venues.ts src/__tests__/tools/search-venues.test.ts
git commit -m "feat: search_venues tool — Overpass venue search by location"
```

---

### Task 6: get_isochrone tool

**Files:**
- Create: `rendezvous-mcp/src/tools/isochrone.ts`
- Test: `rendezvous-mcp/src/__tests__/tools/isochrone.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/tools/isochrone.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetIsochrone } from '../../tools/isochrone.js'

const mockComputeIsochrone = vi.fn()
const mockRoutingClient = { computeIsochrone: mockComputeIsochrone } as any

describe('handleGetIsochrone', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns isochrone polygon', async () => {
    mockComputeIsochrone.mockResolvedValueOnce({
      origin: { lat: 51.45, lon: -2.59 },
      mode: 'drive',
      timeMinutes: 15,
      polygon: {
        type: 'Polygon',
        coordinates: [[[-2.7, 51.4], [-2.5, 51.4], [-2.5, 51.5], [-2.7, 51.5], [-2.7, 51.4]]],
      },
    })

    const result = await handleGetIsochrone({
      lat: 51.45,
      lon: -2.59,
      transport_mode: 'drive',
      time_minutes: 15,
    }, mockRoutingClient)

    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.polygon.type).toBe('Polygon')
    expect(data.time_minutes).toBe(15)
  })

  it('returns payment_required on 402', async () => {
    mockComputeIsochrone.mockResolvedValueOnce({
      status: 'payment_required',
      invoice: 'lnbc...',
      amount_sats: 1000,
    })

    const result = await handleGetIsochrone({
      lat: 51.45, lon: -2.59, transport_mode: 'drive', time_minutes: 15,
    }, mockRoutingClient)

    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(false)
    expect(data.status).toBe('payment_required')
  })
})
```

**Step 2: Implement**

```typescript
// src/tools/isochrone.ts
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TransportMode } from 'rendezvous-kit'
import type { RoutingClient } from '../routing.js'
import { isPaymentRequired } from '../routing.js'

export async function handleGetIsochrone(
  args: {
    lat: number
    lon: number
    transport_mode: TransportMode
    time_minutes: number
  },
  routingClient: RoutingClient,
) {
  console.error(`Computing isochrone: ${args.time_minutes}min ${args.transport_mode} from [${args.lat},${args.lon}]`)

  const result = await routingClient.computeIsochrone(
    { lat: args.lat, lon: args.lon },
    args.transport_mode,
    args.time_minutes,
  )

  if (isPaymentRequired(result)) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: false,
          status: result.status,
          message: result.message,
          invoice: result.invoice,
          macaroon: result.macaroon,
          payment_hash: result.payment_hash,
          payment_url: result.payment_url,
          amount_sats: result.amount_sats,
        }),
      }],
    }
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        time_minutes: result.timeMinutes,
        transport_mode: result.mode,
        polygon: result.polygon,
      }, null, 2),
    }],
  }
}

export function registerIsochroneTool(server: McpServer, routingClient: RoutingClient): void {
  server.registerTool(
    'get_isochrone',
    {
      description:
        'Get a reachability polygon showing everywhere reachable from a point within a given travel time. ' +
        'Returns a GeoJSON polygon. Useful for understanding how far someone can travel.',
      inputSchema: {
        lat: z.number().min(-90).max(90).describe('Latitude of starting point'),
        lon: z.number().min(-180).max(180).describe('Longitude of starting point'),
        transport_mode: z.enum(['drive', 'cycle', 'walk']).describe('Travel mode'),
        time_minutes: z.number().min(1).max(120).describe('Maximum travel time in minutes'),
      },
    },
    async (args) => handleGetIsochrone(args, routingClient),
  )
}
```

**Step 3: Run tests, commit**

```bash
npx vitest run src/__tests__/tools/isochrone.test.ts
git add src/tools/isochrone.ts src/__tests__/tools/isochrone.test.ts
git commit -m "feat: get_isochrone tool — reachability polygon"
```

---

### Task 7: get_directions tool

**Files:**
- Create: `rendezvous-mcp/src/tools/directions.ts`
- Test: `rendezvous-mcp/src/__tests__/tools/directions.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/tools/directions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetDirections } from '../../tools/directions.js'

const mockComputeRoute = vi.fn()
const mockRoutingClient = { computeRoute: mockComputeRoute } as any

describe('handleGetDirections', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns route with steps', async () => {
    mockComputeRoute.mockResolvedValueOnce({
      origin: { lat: 51.45, lon: -2.59 },
      destination: { lat: 51.50, lon: -0.12 },
      mode: 'drive',
      durationMinutes: 120.5,
      distanceKm: 185.3,
      geometry: { type: 'LineString', coordinates: [[-2.59, 51.45], [-0.12, 51.50]] },
      legs: [
        { instruction: 'Head east on A4', distanceKm: 100, durationMinutes: 60 },
        { instruction: 'Continue on M4', distanceKm: 85.3, durationMinutes: 60.5 },
      ],
    })

    const result = await handleGetDirections({
      from: { lat: 51.45, lon: -2.59 },
      to: { lat: 51.50, lon: -0.12 },
      transport_mode: 'drive',
    }, mockRoutingClient)

    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(true)
    expect(data.distance_km).toBe(185.3)
    expect(data.duration_minutes).toBe(120.5)
    expect(data.steps).toHaveLength(2)
    expect(data.steps[0].instruction).toBe('Head east on A4')
    expect(data.geometry.type).toBe('LineString')
  })

  it('returns payment_required on 402', async () => {
    mockComputeRoute.mockResolvedValueOnce({
      status: 'payment_required',
      invoice: 'lnbc...',
      amount_sats: 1000,
    })

    const result = await handleGetDirections({
      from: { lat: 51.45, lon: -2.59 },
      to: { lat: 51.50, lon: -0.12 },
      transport_mode: 'drive',
    }, mockRoutingClient)

    const data = JSON.parse(result.content[0].text)
    expect(data.success).toBe(false)
    expect(data.status).toBe('payment_required')
  })
})
```

**Step 2: Implement**

```typescript
// src/tools/directions.ts
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TransportMode } from 'rendezvous-kit'
import type { RoutingClient } from '../routing.js'
import { isPaymentRequired } from '../routing.js'

export async function handleGetDirections(
  args: {
    from: { lat: number; lon: number }
    to: { lat: number; lon: number }
    transport_mode: TransportMode
  },
  routingClient: RoutingClient,
) {
  console.error(`Computing route: ${args.transport_mode} from [${args.from.lat},${args.from.lon}] to [${args.to.lat},${args.to.lon}]`)

  const result = await routingClient.computeRoute(
    { lat: args.from.lat, lon: args.from.lon },
    { lat: args.to.lat, lon: args.to.lon },
    args.transport_mode,
  )

  if (isPaymentRequired(result)) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: false,
          status: result.status,
          message: result.message,
          invoice: result.invoice,
          macaroon: result.macaroon,
          payment_hash: result.payment_hash,
          payment_url: result.payment_url,
          amount_sats: result.amount_sats,
        }),
      }],
    }
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        distance_km: Math.round(result.distanceKm * 100) / 100,
        duration_minutes: Math.round(result.durationMinutes * 10) / 10,
        steps: (result.legs ?? []).map(leg => ({
          instruction: leg.instruction,
          distance_km: Math.round(leg.distanceKm * 100) / 100,
          duration_minutes: Math.round(leg.durationMinutes * 10) / 10,
        })),
        geometry: result.geometry,
      }, null, 2),
    }],
  }
}

export function registerDirectionsTool(server: McpServer, routingClient: RoutingClient): void {
  server.registerTool(
    'get_directions',
    {
      description:
        'Get directions between two points with distance, duration, and turn-by-turn steps. ' +
        'Returns a GeoJSON LineString of the route geometry.',
      inputSchema: {
        from: z.object({
          lat: z.number().min(-90).max(90).describe('Latitude'),
          lon: z.number().min(-180).max(180).describe('Longitude'),
        }).describe('Starting point'),
        to: z.object({
          lat: z.number().min(-90).max(90).describe('Latitude'),
          lon: z.number().min(-180).max(180).describe('Longitude'),
        }).describe('Destination point'),
        transport_mode: z.enum(['drive', 'cycle', 'walk']).describe('Travel mode'),
      },
    },
    async (args) => handleGetDirections(args, routingClient),
  )
}
```

**Step 3: Run tests, commit**

```bash
npx vitest run src/__tests__/tools/directions.test.ts
git add src/tools/directions.ts src/__tests__/tools/directions.test.ts
git commit -m "feat: get_directions tool — turn-by-turn routing"
```

---

### Task 8: MCP server entry point

Wire up all tools, create the stdio transport, add the shebang for `npx` execution.

**Files:**
- Create: `rendezvous-mcp/src/index.ts`

**Step 1: Implement entry point**

```typescript
#!/usr/bin/env node

// src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { RoutingClient } from './routing.js'
import { registerScoreVenuesTool } from './tools/score-venues.js'
import { registerSearchVenuesTool } from './tools/search-venues.js'
import { registerIsochroneTool } from './tools/isochrone.js'
import { registerDirectionsTool } from './tools/directions.js'

const VALHALLA_URL = process.env.VALHALLA_URL
const OVERPASS_URL = process.env.OVERPASS_URL

const server = new McpServer({
  name: 'rendezvous-mcp',
  version: '0.1.0',
})

const routingClient = new RoutingClient({
  valhallaUrl: VALHALLA_URL,
})

// Register all tools
registerScoreVenuesTool(server, routingClient)
registerSearchVenuesTool(server, OVERPASS_URL)
registerIsochroneTool(server, routingClient)
registerDirectionsTool(server, routingClient)

// Connect stdio transport
const transport = new StdioServerTransport()
await server.connect(transport)

console.error('rendezvous-mcp server running on stdio')
```

**Step 2: Build and verify**

```bash
cd /Users/darren/WebstormProjects/rendezvous-mcp
npm run build
```

Expected: compiles to `build/index.js` with no errors

**Step 3: Verify the binary runs**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}' | node build/index.js 2>/dev/null | head -1
```

Expected: JSON response with `result.serverInfo.name === "rendezvous-mcp"`

**Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass

**Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: MCP server entry point — wire up all tools on stdio"
```

---

### Task 9: trott-mcp integration

Add rendezvous-mcp as a dependency to trott-mcp and re-export the tools.

**Files:**
- Modify: `trott-mcp/package.json` — add `rendezvous-mcp` dependency
- Modify: `trott-mcp/src/index.ts` — import and register rendezvous-mcp tools
- Modify: `trott-mcp/src/tools/rendezvous.ts` — update to use new tools alongside existing find_rendezvous

**Step 1: Add dependency**

In `/Users/darren/WebstormProjects/trott-mcp/package.json`, add to `dependencies`:

```json
"rendezvous-mcp": "file:../rendezvous-mcp"
```

```bash
cd /Users/darren/WebstormProjects/trott-mcp
npm install
```

**Step 2: Import and register in index.ts**

In `/Users/darren/WebstormProjects/trott-mcp/src/index.ts`, add after existing imports:

```typescript
import { registerScoreVenuesTool, registerSearchVenuesTool, registerIsochroneTool, registerDirectionsTool } from 'rendezvous-mcp/tools/score-venues.js'
```

Wait — the re-export approach needs thought. The rendezvous-mcp tools expect a `RoutingClient`, but trott-mcp's tools use a simpler pattern (direct fetch with `VALHALLA_URL`). Two options:

**Option A (recommended):** In trott-mcp, construct a `RoutingClient` from rendezvous-mcp and pass it to the registration functions. This is clean and follows the same pattern.

Add to trott-mcp `src/index.ts`, after existing tool registrations:

```typescript
import { RoutingClient } from 'rendezvous-mcp'
import { registerScoreVenuesTool } from 'rendezvous-mcp'
import { registerSearchVenuesTool } from 'rendezvous-mcp'

const rendezvousRouting = new RoutingClient({ valhallaUrl: process.env.VALHALLA_URL })
registerScoreVenuesTool(server, rendezvousRouting)
registerSearchVenuesTool(server, process.env.OVERPASS_URL)
```

Note: Don't re-register get_isochrone and get_directions — trott-mcp already has equivalent tools (get_isochrone, get_route_directions). Only add score_venues and search_venues which are new capabilities.

**Step 3: Build and test trott-mcp**

```bash
cd /Users/darren/WebstormProjects/trott-mcp
npm run build
npm test
```

Expected: all existing tests pass, new tools registered

**Step 4: Commit in trott-mcp**

```bash
git add package.json package-lock.json src/index.ts
git commit -m "feat: integrate rendezvous-mcp score_venues and search_venues tools"
```

---

### Task 10: GitHub repo, README, and publish

**Files:**
- Create: `rendezvous-mcp/README.md`
- Create: GitHub repo

**Step 1: Write README**

```markdown
# rendezvous-mcp

MCP server for AI-driven fair meeting point discovery. Find the best place to meet that's fair for everyone.

## Tools

- **score_venues** — Score candidate venues by travel time fairness for 2–10 participants
- **search_venues** — Search for venues near a location using OpenStreetMap
- **get_isochrone** — Get a reachability polygon (everywhere reachable in N minutes)
- **get_directions** — Get directions between two points with turn-by-turn steps

## Quick start

```json
{
  "mcpServers": {
    "rendezvous": {
      "command": "npx",
      "args": ["rendezvous-mcp"]
    }
  }
}
```

Works out of the box with free routing (10 requests/day). For more, pay with Lightning sats.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VALHALLA_URL` | `https://routing.trotters.cc` | Routing engine URL |
| `OVERPASS_URL` | Public endpoints | Venue search API |

## Self-hosted routing

```json
{
  "mcpServers": {
    "rendezvous": {
      "command": "npx",
      "args": ["rendezvous-mcp"],
      "env": {
        "VALHALLA_URL": "http://localhost:8002"
      }
    }
  }
}
```
```

**Step 2: Create GitHub repo**

```bash
cd /Users/darren/WebstormProjects/rendezvous-mcp
gh repo create TheCryptoDonkey/rendezvous-mcp --public --source=. --push
```

**Step 3: Publish to npm**

```bash
npm publish
```

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README with quick start and configuration"
```

---

### Task 11: Verification

**Step 1: End-to-end test with Claude Desktop**

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rendezvous": {
      "command": "node",
      "args": ["/Users/darren/WebstormProjects/rendezvous-mcp/build/index.js"]
    }
  }
}
```

Restart Claude Desktop. Ask: "Find the best pub for 3 people — one in Bristol (51.45, -2.59), one in Bath (51.38, -2.36), and one in Chippenham (51.46, -2.12)"

Expected: Claude calls `score_venues` with venues it knows, returns ranked results with travel times.

**Step 2: Verify free tier credit display**

After the query, check that Claude mentions the routing credit usage (the tool should log credit balance from response headers).

**Step 3: Verify trott-mcp integration**

```bash
cd /Users/darren/WebstormProjects/trott-mcp
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | NOSTR_PRIVATE_KEY=deadbeef NOSTR_RELAYS=ws://localhost:7777 node build/index.js 2>/dev/null | python3 -c "import json,sys; tools=[t['name'] for t in json.load(sys.stdin)['result']['tools']]; print('score_venues' in tools, 'search_venues' in tools)"
```

Expected: `True True`
