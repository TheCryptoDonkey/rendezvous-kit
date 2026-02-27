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
})
