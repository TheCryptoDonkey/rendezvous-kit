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

  it('rejects venue types with injection characters', async () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    await expect(() => searchVenues(polygon, ['cafe"]["name"](50,-1,52,1);node["amenity"="']))
      .rejects.toThrow('Invalid venue type')
  })

  it('accepts valid custom venue types', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] })
    })

    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    const venues = await searchVenues(polygon, ['cinema'])
    expect(venues).toHaveLength(0)
  })

  it('fails over to second endpoint on error', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }),
      })

    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    const venues = await searchVenues(polygon, ['cafe'])
    expect(venues).toHaveLength(0)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('rejects non-http overpassUrl', async () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    await expect(searchVenues(polygon, ['cafe'], 'ftp://evil.com/api'))
      .rejects.toThrow('must use http or https')
  })

  it('rejects file:// overpassUrl', async () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    await expect(searchVenues(polygon, ['cafe'], 'file:///etc/passwd'))
      .rejects.toThrow('must use http or https')
  })

  it('clamps resultLimit to 1000 max', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] })
    })

    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    await searchVenues(polygon, ['cafe'], undefined, 99999)

    const [, init] = mockFetch.mock.calls[0]
    const body = (init as RequestInit).body as string
    const query = decodeURIComponent(body.replace('data=', ''))
    expect(query).toContain('out center 1000;')
  })

  it('clamps resultLimit to 1 min', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] })
    })

    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    await searchVenues(polygon, ['cafe'], undefined, -5)

    const [, init] = mockFetch.mock.calls[0]
    const body = (init as RequestInit).body as string
    const query = decodeURIComponent(body.replace('data=', ''))
    expect(query).toContain('out center 1;')
  })

  it('rejects more than 20 venue types', async () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    const tooMany = Array.from({ length: 21 }, (_, i) => `type${i}`)
    await expect(searchVenues(polygon, tooMany))
      .rejects.toThrow('Too many venue types')
  })

  it('uses configurable result limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] })
    })

    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-2.7, 51.3], [-2.3, 51.3], [-2.3, 51.5], [-2.7, 51.5], [-2.7, 51.3]]]
    }

    await searchVenues(polygon, ['cafe'], undefined, 50)

    const [, init] = mockFetch.mock.calls[0]
    const body = (init as RequestInit).body as string
    const query = decodeURIComponent(body.replace('data=', ''))
    expect(query).toContain('out center 50;')
  })
})
