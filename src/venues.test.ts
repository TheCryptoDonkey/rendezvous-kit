import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchVenues } from './venues.js'
import type { GeoJSONPolygon } from './types.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('searchVenues', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries Overpass API for venues within a bounding box', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 123, lat: 51.42, lon: -2.55, tags: { name: 'Chew Valley Lake', leisure: 'park' } },
          { type: 'node', id: 456, lat: 51.41, lon: -2.53, tags: { name: 'Blagdon Lake', leisure: 'park' } },
        ]
      })
    })

    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    const venues = await searchVenues(polygon, ['park'])

    expect(venues).toHaveLength(2)
    expect(venues[0].name).toBe('Chew Valley Lake')
    expect(venues[0].venueType).toBe('park')
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('returns empty array when no venues found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] })
    })

    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    const venues = await searchVenues(polygon, ['cafe'])
    expect(venues).toHaveLength(0)
  })
})
