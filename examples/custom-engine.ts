/**
 * Implement a custom routing engine.
 *
 * This example shows how to implement the RoutingEngine interface with a mock
 * engine, which is useful for testing or when wrapping a proprietary API.
 *
 * Run:
 *   npx tsx examples/custom-engine.ts
 */
import { findRendezvous } from 'rendezvous-kit'
import type { RoutingEngine, LatLon, TransportMode, Isochrone, RouteMatrix, RouteGeometry, MatrixEntry } from 'rendezvous-kit'
import { circleToPolygon } from 'rendezvous-kit/geo'

/**
 * A mock engine that generates circular isochrones and straight-line travel times.
 * Replace the method bodies with calls to your actual routing API.
 */
class MockEngine implements RoutingEngine {
  readonly name = 'MockEngine'

  async computeIsochrone(origin: LatLon, mode: TransportMode, timeMinutes: number): Promise<Isochrone> {
    // Approximate reachable area as a circle. Real engines return road-network-shaped polygons.
    const speedKmh = mode === 'drive' ? 80 : mode === 'cycle' ? 20 : 5
    const radiusMetres = (speedKmh * timeMinutes / 60) * 1000

    return {
      origin,
      mode,
      timeMinutes,
      polygon: circleToPolygon([origin.lon, origin.lat], radiusMetres),
    }
  }

  async computeRouteMatrix(origins: LatLon[], destinations: LatLon[], mode: TransportMode): Promise<RouteMatrix> {
    const speedKmh = mode === 'drive' ? 80 : mode === 'cycle' ? 20 : 5
    const entries: MatrixEntry[] = []

    for (let oi = 0; oi < origins.length; oi++) {
      for (let di = 0; di < destinations.length; di++) {
        const distKm = haversineKm(origins[oi], destinations[di])
        entries.push({
          originIndex: oi,
          destinationIndex: di,
          durationMinutes: (distKm / speedKmh) * 60,
          distanceKm: distKm,
        })
      }
    }

    return { origins, destinations, entries }
  }

  async computeRoute(_origin: LatLon, _destination: LatLon, _mode: TransportMode): Promise<RouteGeometry> {
    throw new Error('computeRoute not implemented in MockEngine')
  }
}

function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lon - a.lon) * Math.PI / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLon = Math.sin(dLon / 2)
  const h = sinLat * sinLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLon * sinLon
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// --- Run it ---

const engine = new MockEngine()

const suggestions = await findRendezvous(engine, {
  participants: [
    { lat: 51.5074, lon: -0.1278, label: 'Alice' },
    { lat: 51.4545, lon: -2.5879, label: 'Bob' },
  ],
  mode: 'drive',
  maxTimeMinutes: 60,
  venueTypes: ['cafe'],
  limit: 3,
})

console.log(`Found ${suggestions.length} suggestion(s) using ${engine.name}:`)
for (const s of suggestions) {
  console.log(`  ${s.venue.name} — score: ${s.fairnessScore.toFixed(1)} min`)
  console.log('    Travel times:', s.travelTimes)
}
