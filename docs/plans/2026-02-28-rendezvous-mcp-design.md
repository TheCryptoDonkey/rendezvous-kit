# rendezvous-mcp Design

## Goal

Standalone MCP server that exposes rendezvous-kit's meeting-point capabilities as AI-usable tools. Any AI host (Claude Desktop, Cursor, etc.) can find fair meeting points, score venues, compute routes, and explore reachable areas — zero config required.

## Architecture

The AI host orchestrates the meeting-point workflow. Rather than exposing a monolithic pipeline, `rendezvous-mcp` provides decomposed tools that the AI chains together with its own reasoning.

```
User: "Find a good pub for 3 of us"
  │
  ▼
AI host (Claude Desktop / Cursor / etc.)
  │
  ├─ knows venues from training data
  │  OR calls search_venues tool (Overpass)
  │
  ├─► score_venues tool
  │     → sources_to_targets matrix via Valhalla
  │     → fairness-ranked results
  │
  ├─► get_directions tool (optional)
  │     → turn-by-turn route for chosen venue
  │
  └─► AI presents results with reasoning
      "The Railway Arms is best — 12 min for Alice,
       14 min for Bob, 11 min for Charlie"
```

The AI IS the pipeline orchestrator. It decides whether to use its own venue knowledge, call `search_venues`, or accept user-provided venues. This is more powerful than a fixed pipeline because the AI injects reasoning between steps — filtering by preferences, explaining trade-offs, suggesting alternatives.

## Tools

### `score_venues`

The core tool. Takes participant locations and candidate venue locations, computes travel times via Valhalla's `sources_to_targets` matrix API, returns fairness-ranked results.

```
Input:
  participants: [{ lat, lon, label }]     2-10 people
  venues: [{ lat, lon, name, type? }]     1-50 candidates
  transport_mode: drive | cycle | walk
  fairness: min_max | min_total | min_variance

Output:
  ranked_venues: [{
    name, lat, lon, type,
    travel_times: { "Alice": 12, "Bob": 14, "Charlie": 11 },
    fairness_score: 0.87
  }]
```

Single API call for all participant-to-venue pairs. This is the unique value proposition — no other MCP server does fairness-scored meeting points.

### `search_venues`

Overpass venue search within a geographic area. The AI calls this when it doesn't know local venues or wants comprehensive OSM coverage (rural areas, niche venue types).

```
Input:
  lat, lon            centre point
  radius_km           search radius (default 5)
  venue_types         ['pub', 'cafe', 'restaurant', 'park', ...]

Output:
  venues: [{ name, lat, lon, type, osm_id }]
```

### `get_isochrone`

"What can I reach in N minutes?" Returns a reachable-area polygon.

```
Input:
  lat, lon            starting point
  transport_mode      drive | cycle | walk
  time_minutes        max travel time

Output:
  polygon             GeoJSON polygon of reachable area
  area_km2            approximate area
```

### `get_directions`

Route from A to B with distance, duration, and turn-by-turn steps.

```
Input:
  from: { lat, lon }
  to: { lat, lon }
  transport_mode      drive | cycle | walk

Output:
  distance_km, duration_minutes
  steps: [{ instruction, distance_km, duration_minutes }]
  geometry            GeoJSON LineString
```

## Routing

Defaults to `routing.trotters.cc` — a hosted Valhalla instance behind toll-booth (L402 Lightning payments).

- **Free tier:** 10 requests/day per IP, zero config needed
- **Paid tier:** L402 authentication, pay-per-request in sats
- **Self-hosted:** override with `VALHALLA_URL` env var

### L402 payment flow

When free tier is exhausted and routing.trotters.cc returns 402:

1. Tool handler catches the 402, extracts bolt11 invoice and payment_hash
2. Returns structured result to the AI:
   ```json
   {
     "status": "payment_required",
     "message": "Free tier exhausted. Pay 1000 sats to continue.",
     "invoice": "lnbc1000n1p...",
     "payment_url": "https://routing.trotters.cc/invoice-status/<hash>",
     "amount_sats": 1000
   }
   ```
3. AI presents this to the user with the invoice string
4. User pays from their Lightning wallet, then asks AI to retry
5. Tool stores the macaroon and preimage in memory, uses L402 auth for subsequent requests
6. Credits carry across requests until exhausted

## Package structure

```
rendezvous-mcp/
  src/
    index.ts              MCP server setup, tool registration
    tools/
      score-venues.ts     score_venues handler
      search-venues.ts    search_venues handler
      directions.ts       get_directions handler
      isochrone.ts        get_isochrone handler
    routing.ts            Valhalla client (shared, L402-aware)
    l402.ts               L402 auth, macaroon/preimage storage
  package.json            bin: rendezvous-mcp
```

## Configuration

Environment variables, all optional:

```
VALHALLA_URL      routing engine (default: https://routing.trotters.cc)
OVERPASS_URL      venue search (default: public Overpass endpoints)
TRANSPORT         stdio (default) or sse
```

## Installation

```bash
npx rendezvous-mcp                                      # zero config
VALHALLA_URL=http://localhost:8002 npx rendezvous-mcp    # self-hosted Valhalla
```

Claude Desktop config:

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

## trott-mcp integration

trott-mcp adds rendezvous-mcp as a dependency and re-exports the tools:

```typescript
import { registerRendezvousTools } from 'rendezvous-mcp'
registerRendezvousTools(server)
```

This gives trott-mcp's AI chat access to meeting-point tools alongside TROTT lifecycle tools. The AI can naturally chain workflows:

1. **score_venues** → find the best pub for 3 people
2. **create_task** (TROTT) → book rides for each participant to the chosen venue
3. **get_directions** → provide turn-by-turn to anyone not getting a ride

## Monetisation

Two revenue streams:

1. **Routing via routing.trotters.cc** — free tier for discovery, L402 sats for power users. Every rendezvous-mcp user generates routing revenue by default.
2. **Trotters platform integration** — premium flow where finding a venue leads to booking rides via TROTT. The upsell path from "where to meet" to "how to get there".

## Dependencies

- `rendezvous-kit` — isochrone intersection, venue search, route matrix, scoring
- `@modelcontextprotocol/sdk` — MCP server framework
- No TROTT/Nostr dependency in the standalone package

## Testing

- Unit tests for each tool handler (mock Valhalla responses)
- Integration test: full score_venues flow with mock routing server
- L402 flow test: 402 response handling, payment retry
