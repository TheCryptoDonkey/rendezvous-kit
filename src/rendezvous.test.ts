import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findRendezvous } from './rendezvous.js'
import type { RoutingEngine, Isochrone, RouteMatrix, LatLon, GeoJSONPolygon } from './types.js'

// Mock venue search
vi.mock('./venues.js', () => ({
  searchVenues: vi.fn().mockResolvedValue([
    { name: 'Chew Valley Lake', lat: 51.35, lon: -2.62, venueType: 'park', osmId: 'node/123' },
    { name: 'Blagdon Lake', lat: 51.34, lon: -2.56, venueType: 'park', osmId: 'node/456' },
  ])
}))

function createMockEngine(): RoutingEngine {
  const isoPolygon: GeoJSONPolygon = {
    type: 'Polygon',
    coordinates: [[[-3.0, 51.2], [-2.0, 51.2], [-2.0, 51.6], [-3.0, 51.6], [-3.0, 51.2]]]
  }

  return {
    name: 'MockEngine',
    computeIsochrone: vi.fn().mockResolvedValue({
      origin: { lat: 51.45, lon: -2.59 },
      mode: 'drive',
      timeMinutes: 30,
      polygon: isoPolygon,
    } satisfies Isochrone),
    computeRouteMatrix: vi.fn().mockResolvedValue({
      origins: [],
      destinations: [],
      entries: [
        { originIndex: 0, destinationIndex: 0, durationMinutes: 18, distanceKm: 15 },
        { originIndex: 0, destinationIndex: 1, durationMinutes: 20, distanceKm: 18 },
        { originIndex: 1, destinationIndex: 0, durationMinutes: 22, distanceKm: 20 },
        { originIndex: 1, destinationIndex: 1, durationMinutes: 25, distanceKm: 22 },
        { originIndex: 2, destinationIndex: 0, durationMinutes: 25, distanceKm: 24 },
        { originIndex: 2, destinationIndex: 1, durationMinutes: 23, distanceKm: 21 },
      ],
    } satisfies RouteMatrix),
  }
}

describe('findRendezvous', () => {
  it('returns ranked venue suggestions', async () => {
    const engine = createMockEngine()
    const participants: LatLon[] = [
      { lat: 51.4545, lon: -2.5879, label: 'Bristol' },
      { lat: 51.3758, lon: -2.3599, label: 'Bath' },
      { lat: 51.3460, lon: -2.9770, label: 'Weston' },
    ]

    const result = await findRendezvous(engine, {
      participants,
      mode: 'drive',
      maxTimeMinutes: 30,
      venueTypes: ['park'],
      fairness: 'min_max',
    })

    expect(result).toHaveLength(2)
    expect(result[0].venue.name).toBeDefined()
    expect(result[0].travelTimes).toBeDefined()
    expect(result[0].fairnessScore).toBeDefined()
    // With min_max, the venue with the lowest maximum travel time should be first
    expect(result[0].fairnessScore).toBeLessThanOrEqual(result[1].fairnessScore)
  })

  it('throws if fewer than 2 participants', async () => {
    const engine = createMockEngine()
    await expect(
      findRendezvous(engine, {
        participants: [{ lat: 51.45, lon: -2.59 }],
        mode: 'drive',
        maxTimeMinutes: 30,
        venueTypes: ['park'],
      })
    ).rejects.toThrow()
  })

  it('filters out venues with unreachable participants (-1 sentinel)', async () => {
    const engine = createMockEngine()

    // Override matrix: venue 0 has one unreachable participant (-1),
    // venue 1 is reachable by all but with longer times
    vi.mocked(engine.computeRouteMatrix).mockResolvedValueOnce({
      origins: [],
      destinations: [],
      entries: [
        // Venue 0: participant 0 can reach (5 min), participant 1 cannot (-1)
        { originIndex: 0, destinationIndex: 0, durationMinutes: 5, distanceKm: 4 },
        { originIndex: 1, destinationIndex: 0, durationMinutes: -1, distanceKm: -1 },
        // Venue 1: both can reach (13 min each)
        { originIndex: 0, destinationIndex: 1, durationMinutes: 13, distanceKm: 10 },
        { originIndex: 1, destinationIndex: 1, durationMinutes: 13, distanceKm: 10 },
      ],
    })

    const result = await findRendezvous(engine, {
      participants: [
        { lat: 51.45, lon: -2.59, label: 'Alice' },
        { lat: 51.38, lon: -2.36, label: 'Bob' },
      ],
      mode: 'drive',
      maxTimeMinutes: 30,
      venueTypes: ['cafe'],
      fairness: 'min_max',
    })

    // Venue 0 should be excluded (unreachable for Bob)
    // Only venue 1 should appear
    expect(result).toHaveLength(1)
    expect(result[0].venue.name).toBe('Blagdon Lake')
  })

  it('filters out venues where any participant exceeds maxTimeMinutes', async () => {
    const engine = createMockEngine()

    // Override matrix: venue 0 has durations [45, 35] (both over 30),
    // venue 1 has durations [25, 28] (both under 30)
    vi.mocked(engine.computeRouteMatrix).mockResolvedValueOnce({
      origins: [],
      destinations: [],
      entries: [
        { originIndex: 0, destinationIndex: 0, durationMinutes: 45, distanceKm: 40 },
        { originIndex: 1, destinationIndex: 0, durationMinutes: 35, distanceKm: 30 },
        { originIndex: 0, destinationIndex: 1, durationMinutes: 25, distanceKm: 20 },
        { originIndex: 1, destinationIndex: 1, durationMinutes: 28, distanceKm: 24 },
      ],
    })

    const result = await findRendezvous(engine, {
      participants: [
        { lat: 51.45, lon: -2.59, label: 'Alice' },
        { lat: 51.38, lon: -2.36, label: 'Bob' },
      ],
      mode: 'drive',
      maxTimeMinutes: 30,
      venueTypes: ['cafe'],
      fairness: 'min_max',
    })

    // Venue 0 should be excluded (Alice 45 > 30, Bob 35 > 30)
    // Only venue 1 should appear (Alice 25, Bob 28 — both under 30)
    expect(result).toHaveLength(1)
    expect(result[0].venue.name).toBe('Blagdon Lake')
  })

  it('returns centroid fallback when no venues found', async () => {
    // Need to override the searchVenues mock for this test
    const { searchVenues } = await import('./venues.js')
    const mockSearch = vi.mocked(searchVenues)
    mockSearch.mockResolvedValueOnce([])

    const engine = createMockEngine()
    const participants: LatLon[] = [
      { lat: 51.4545, lon: -2.5879, label: 'Bristol' },
      { lat: 51.3758, lon: -2.3599, label: 'Bath' },
    ]

    const result = await findRendezvous(engine, {
      participants,
      mode: 'drive',
      maxTimeMinutes: 30,
      venueTypes: ['cafe'],
    })

    expect(result).toHaveLength(1)
    expect(result[0].venue.name).toBe('Meeting point')
  })

  it('searches venues across multi-component intersection using envelope bbox', async () => {
    const { searchVenues } = await import('./venues.js')
    const mockSearch = vi.mocked(searchVenues)
    mockSearch.mockResolvedValueOnce([
      { name: 'Island Cafe', lat: 51.35, lon: -2.60, venueType: 'cafe', osmId: 'node/789' },
    ])

    // Two C-shaped isochrones that produce disconnected intersection components
    const cShapeA: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-3.0, 51.0], [-2.2, 51.0], [-2.2, 51.4], [-2.6, 51.4], [-2.6, 51.5], [-2.2, 51.5], [-2.2, 51.7], [-3.0, 51.7], [-3.0, 51.0]]],
    }
    const cShapeB: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.6, 51.7], [-2.6, 51.5], [-2.2, 51.5], [-2.2, 51.4], [-2.6, 51.4], [-2.6, 51.0], [-2.0, 51.0], [-2.0, 51.7], [-2.6, 51.7]]],
    }

    const engine = createMockEngine()
    // Return different C-shaped isochrones for different participants
    vi.mocked(engine.computeIsochrone)
      .mockResolvedValueOnce({ origin: { lat: 51.3, lon: -2.8 }, mode: 'drive', timeMinutes: 30, polygon: cShapeA })
      .mockResolvedValueOnce({ origin: { lat: 51.3, lon: -2.1 }, mode: 'drive', timeMinutes: 30, polygon: cShapeB })

    vi.mocked(engine.computeRouteMatrix).mockResolvedValueOnce({
      origins: [],
      destinations: [],
      entries: [
        { originIndex: 0, destinationIndex: 0, durationMinutes: 15, distanceKm: 12 },
        { originIndex: 1, destinationIndex: 0, durationMinutes: 18, distanceKm: 14 },
      ],
    })

    const result = await findRendezvous(engine, {
      participants: [
        { lat: 51.3, lon: -2.8, label: 'West' },
        { lat: 51.3, lon: -2.1, label: 'East' },
      ],
      mode: 'drive',
      maxTimeMinutes: 30,
      venueTypes: ['cafe'],
    })

    // Verify searchVenues was called with a polygon (envelope) covering both components
    expect(mockSearch).toHaveBeenCalled()
    const searchPolygon = mockSearch.mock.calls[mockSearch.mock.calls.length - 1][0] as GeoJSONPolygon
    expect(searchPolygon.type).toBe('Polygon')
    // The envelope should cover the full extent of both C-shape intersections
    const ring = searchPolygon.coordinates[0]
    const lons = ring.map(c => c[0])
    const lats = ring.map(c => c[1])
    expect(Math.min(...lons)).toBeLessThanOrEqual(-2.6)
    expect(Math.max(...lons)).toBeGreaterThanOrEqual(-2.2)
    expect(Math.min(...lats)).toBeLessThanOrEqual(51.0)
    expect(Math.max(...lats)).toBeGreaterThanOrEqual(51.7)

    expect(result).toHaveLength(1)
    expect(result[0].venue.name).toBe('Island Cafe')
  })

  it('uses area-weighted centroid across components when no venues found', async () => {
    const { searchVenues } = await import('./venues.js')
    const mockSearch = vi.mocked(searchVenues)
    mockSearch.mockResolvedValueOnce([])

    // Two non-adjacent rectangles acting as isochrone intersection components
    const rectA: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-3.0, 51.0], [-2.5, 51.0], [-2.5, 51.2], [-3.0, 51.2], [-3.0, 51.0]]],
    }
    const rectB: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.3, 51.0], [-2.0, 51.0], [-2.0, 51.2], [-2.3, 51.2], [-2.3, 51.0]]],
    }

    const engine = createMockEngine()
    // Both participants get the same broad isochrone that covers both rects
    const broadIso: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-3.1, 50.9], [-1.9, 50.9], [-1.9, 51.3], [-3.1, 51.3], [-3.1, 50.9]]],
    }
    vi.mocked(engine.computeIsochrone)
      .mockResolvedValueOnce({ origin: { lat: 51.1, lon: -2.8 }, mode: 'drive', timeMinutes: 30, polygon: broadIso })
      .mockResolvedValueOnce({ origin: { lat: 51.1, lon: -2.1 }, mode: 'drive', timeMinutes: 30, polygon: broadIso })

    vi.mocked(engine.computeRouteMatrix).mockResolvedValueOnce({
      origins: [],
      destinations: [],
      entries: [
        { originIndex: 0, destinationIndex: 0, durationMinutes: 20, distanceKm: 15 },
        { originIndex: 1, destinationIndex: 0, durationMinutes: 22, distanceKm: 17 },
      ],
    })

    const result = await findRendezvous(engine, {
      participants: [
        { lat: 51.1, lon: -2.8, label: 'West' },
        { lat: 51.1, lon: -2.1, label: 'East' },
      ],
      mode: 'drive',
      maxTimeMinutes: 30,
      venueTypes: ['cafe'],
    })

    // Should get centroid fallback
    expect(result).toHaveLength(1)
    expect(result[0].venue.name).toBe('Meeting point')
    // Centroid should be within the overall extent of the broad isochrone intersection
    expect(result[0].venue.lat).toBeGreaterThan(50.9)
    expect(result[0].venue.lat).toBeLessThan(51.3)
    expect(result[0].venue.lon).toBeGreaterThan(-3.1)
    expect(result[0].venue.lon).toBeLessThan(-1.9)
  })
})
