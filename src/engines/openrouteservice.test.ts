import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenRouteServiceEngine } from './openrouteservice.js'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('OpenRouteServiceEngine', () => {
  let engine: OpenRouteServiceEngine

  beforeEach(() => {
    engine = new OpenRouteServiceEngine({ apiKey: 'test-key' })
    vi.clearAllMocks()
  })

  describe('computeIsochrone', () => {
    it('calls the ORS isochrone API and returns a polygon', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[[-2.6, 51.4], [-2.5, 51.4], [-2.5, 51.5], [-2.6, 51.5], [-2.6, 51.4]]]
            },
            properties: { value: 1800 }
          }]
        })
      })

      const result = await engine.computeIsochrone(
        { lat: 51.4545, lon: -2.5879 },
        'drive',
        30
      )

      expect(result.polygon.type).toBe('Polygon')
      expect(result.timeMinutes).toBe(30)
      expect(result.mode).toBe('drive')
      expect(mockFetch).toHaveBeenCalledOnce()

      // Verify API URL and params
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('openrouteservice.org')
      expect(options.headers['Authorization']).toBe('test-key')
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Rate limit exceeded'
      })

      await expect(
        engine.computeIsochrone({ lat: 51.4545, lon: -2.5879 }, 'drive', 30)
      ).rejects.toThrow()
    })
  })

  describe('computeRouteMatrix', () => {
    it('returns -1 for unreachable pairs (null from ORS)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[600, null], [null, 600]],
          distances: [[5000, null], [null, 5000]],
        }),
      })

      const origins = [{ lat: 51.45, lon: -2.59 }]
      const destinations = [
        { lat: 51.45, lon: -2.59 },
        { lat: 55.0, lon: 0.0 },
      ]

      const result = await engine.computeRouteMatrix(origins, destinations, 'drive')

      const reachable = result.entries.find(e => e.destinationIndex === 0)!
      expect(reachable.durationMinutes).toBeCloseTo(10, 1) // 600s = 10min

      const unreachable = result.entries.find(e => e.destinationIndex === 1)!
      expect(unreachable.durationMinutes).toBe(-1)
      expect(unreachable.distanceKm).toBe(-1)
    })

    it('calls the ORS matrix API and returns durations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[0, 1200, 1800], [1200, 0, 900], [1800, 900, 0]],
          distances: [[0, 15000, 25000], [15000, 0, 12000], [25000, 12000, 0]]
        })
      })

      const origins = [
        { lat: 51.4545, lon: -2.5879, label: 'Bristol' },
        { lat: 51.3758, lon: -2.3599, label: 'Bath' },
        { lat: 51.3460, lon: -2.9770, label: 'Weston' },
      ]

      const result = await engine.computeRouteMatrix(origins, origins, 'drive')

      expect(result.entries).toHaveLength(9)
      // Bristol→Bath should be ~20 min (1200 seconds)
      const bristolToBath = result.entries.find(
        e => e.originIndex === 0 && e.destinationIndex === 1
      )
      expect(bristolToBath?.durationMinutes).toBeCloseTo(20, 0)
    })
  })
})
