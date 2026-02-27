import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GraphHopperEngine } from './graphhopper.js'
import type { GeoJSONPolygon } from '../types.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => mockFetch.mockReset())

describe('GraphHopperEngine', () => {
  const engine = new GraphHopperEngine({ baseUrl: 'http://localhost:8989' })

  describe('computeIsochrone', () => {
    it('sends GET to /isochrone with correct query params', async () => {
      const mockPoly: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          polygons: [{ geometry: mockPoly }],
        }),
      })

      const result = await engine.computeIsochrone(
        { lat: 51.4545, lon: -2.5879 }, 'drive', 30
      )

      expect(result.polygon.type).toBe('Polygon')
      expect(result.origin).toEqual({ lat: 51.4545, lon: -2.5879 })
      expect(result.mode).toBe('drive')
      expect(result.timeMinutes).toBe(30)

      const [url, init] = mockFetch.mock.calls[0]
      expect(init).toBeUndefined()
      const parsed = new URL(url as string)
      expect(parsed.pathname).toBe('/isochrone')
      expect(parsed.searchParams.get('point')).toBe('51.4545,-2.5879')
      expect(parsed.searchParams.get('time_limit')).toBe('1800') // 30 * 60
      expect(parsed.searchParams.get('profile')).toBe('car')
    })

    it('maps transport modes to correct GraphHopper profiles', async () => {
      const mockPoly: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      }

      for (const [mode, expectedProfile] of [
        ['cycle', 'bike'],
        ['walk', 'foot'],
        ['public_transit', 'car'],
      ] as const) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ polygons: [{ geometry: mockPoly }] }),
        })

        await engine.computeIsochrone({ lat: 51, lon: -2 }, mode, 15)

        const [url] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
        const parsed = new URL(url as string)
        expect(parsed.searchParams.get('profile')).toBe(expectedProfile)
      }
    })

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 400, statusText: 'Bad Request',
        text: async () => 'Invalid point',
      })

      await expect(
        engine.computeIsochrone({ lat: 51, lon: -2 }, 'drive', 30)
      ).rejects.toThrow('GraphHopper isochrone error: 400')
    })
  })

  describe('computeRouteMatrix', () => {
    it('sends POST to /matrix with correct body and converts units', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          times: [[600, 1200]],
          distances: [[5000, 10000]],
        }),
      })

      const result = await engine.computeRouteMatrix(
        [{ lat: 51, lon: -2 }],
        [{ lat: 51.1, lon: -2.1 }, { lat: 51.2, lon: -2.2 }],
        'drive'
      )

      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].durationMinutes).toBe(10) // 600s / 60
      expect(result.entries[1].durationMinutes).toBe(20) // 1200s / 60

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:8989/matrix')
      expect((init as RequestInit).method).toBe('POST')
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.profile).toBe('car')
      expect(body.from_points).toEqual([[-2, 51]])
      expect(body.to_points).toEqual([[-2.1, 51.1], [-2.2, 51.2]])
      expect(body.out_arrays).toContain('times')
      expect(body.out_arrays).toContain('distances')
    })

    it('converts distances from metres to kilometres', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          times: [[300]],
          distances: [[2500]],
        }),
      })

      const result = await engine.computeRouteMatrix(
        [{ lat: 51, lon: -2 }],
        [{ lat: 51.05, lon: -2.05 }],
        'walk'
      )

      expect(result.entries[0].distanceKm).toBeCloseTo(2.5) // 2500m / 1000
    })

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 503, statusText: 'Service Unavailable',
        text: async () => 'GraphHopper is unavailable',
      })

      await expect(
        engine.computeRouteMatrix([{ lat: 51, lon: -2 }], [{ lat: 51.1, lon: -2.1 }], 'drive')
      ).rejects.toThrow('GraphHopper matrix error: 503')
    })
  })

  describe('API key support', () => {
    it('appends key query param to isochrone request when provided', async () => {
      const engineWithKey = new GraphHopperEngine({
        baseUrl: 'http://localhost:8989',
        apiKey: 'test-key-123',
      })

      const mockPoly: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ polygons: [{ geometry: mockPoly }] }),
      })

      await engineWithKey.computeIsochrone({ lat: 51, lon: -2 }, 'drive', 15)

      const [url] = mockFetch.mock.calls[0]
      const parsed = new URL(url as string)
      expect(parsed.searchParams.get('key')).toBe('test-key-123')
    })

    it('appends key query param to matrix request when provided', async () => {
      const engineWithKey = new GraphHopperEngine({
        baseUrl: 'http://localhost:8989',
        apiKey: 'test-key-123',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          times: [[300]],
          distances: [[2500]],
        }),
      })

      await engineWithKey.computeRouteMatrix(
        [{ lat: 51, lon: -2 }],
        [{ lat: 51.05, lon: -2.05 }],
        'drive'
      )

      const [url] = mockFetch.mock.calls[0]
      const parsed = new URL(url as string)
      expect(parsed.searchParams.get('key')).toBe('test-key-123')
    })
  })

  describe('name', () => {
    it('has readonly name "GraphHopper"', () => {
      expect(engine.name).toBe('GraphHopper')
    })
  })
})
