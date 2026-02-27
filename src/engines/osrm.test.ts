import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OsrmEngine } from './osrm.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => mockFetch.mockReset())

describe('OsrmEngine', () => {
  const engine = new OsrmEngine({ baseUrl: 'http://localhost:5000' })

  describe('name', () => {
    it('has readonly name "OSRM"', () => {
      expect(engine.name).toBe('OSRM')
    })
  })

  describe('computeIsochrone', () => {
    it('throws with a clear message explaining OSRM does not support isochrones', () => {
      expect(() =>
        engine.computeIsochrone({ lat: 51, lon: -2 }, 'drive', 30)
      ).toThrow(
        'OSRM does not support isochrone computation. Use Valhalla, ORS, or GraphHopper instead.'
      )
    })
  })

  describe('computeRouteMatrix', () => {
    it('sends GET to /table/v1/{profile}/{coords} with correct query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[600, 1200]],
          distances: [[5000, 10000]],
        }),
      })

      await engine.computeRouteMatrix(
        [{ lat: 51, lon: -2 }],
        [{ lat: 51.1, lon: -2.1 }, { lat: 51.2, lon: -2.2 }],
        'drive'
      )

      const [url, init] = mockFetch.mock.calls[0]
      expect(init).toBeUndefined()
      const parsed = new URL(url as string)
      expect(parsed.pathname).toBe('/table/v1/car/-2,51;-2.1,51.1;-2.2,51.2')
      expect(parsed.searchParams.get('sources')).toBe('0')
      expect(parsed.searchParams.get('destinations')).toBe('1;2')
      expect(parsed.searchParams.get('annotations')).toBe('duration,distance')
    })

    it('converts seconds to minutes and metres to kilometres', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[600, 1200]],
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
    })

    it('converts distances from metres to kilometres correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[300]],
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

    it('maps negative values to -1 sentinel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[-1]],
          distances: [[-1]],
        }),
      })

      const result = await engine.computeRouteMatrix(
        [{ lat: 51, lon: -2 }],
        [{ lat: 52, lon: -1 }],
        'drive'
      )

      expect(result.entries[0].durationMinutes).toBe(-1)
      expect(result.entries[0].distanceKm).toBe(-1)
    })

    it('maps null values to -1 sentinel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[null]],
          distances: [[null]],
        }),
      })

      const result = await engine.computeRouteMatrix(
        [{ lat: 51, lon: -2 }],
        [{ lat: 52, lon: -1 }],
        'drive'
      )

      expect(result.entries[0].durationMinutes).toBe(-1)
      expect(result.entries[0].distanceKm).toBe(-1)
    })

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 400, statusText: 'Bad Request',
        text: async () => 'Bad query',
      })

      await expect(
        engine.computeRouteMatrix([{ lat: 51, lon: -2 }], [{ lat: 51.1, lon: -2.1 }], 'drive')
      ).rejects.toThrow('OSRM matrix error: 400')
    })

    it('maps transport modes to correct OSRM profiles', async () => {
      for (const [mode, expectedProfile] of [
        ['drive', 'car'],
        ['cycle', 'bike'],
        ['walk', 'foot'],
        ['public_transit', 'car'],
      ] as const) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ durations: [[300]], distances: [[1000]] }),
        })

        await engine.computeRouteMatrix(
          [{ lat: 51, lon: -2 }],
          [{ lat: 51.05, lon: -2.05 }],
          mode
        )

        const [url] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
        const parsed = new URL(url as string)
        expect(parsed.pathname).toContain(`/table/v1/${expectedProfile}/`)
      }
    })

    it('returns correct originIndex and destinationIndex for multi-origin matrix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          durations: [[300, 600], [900, 1200]],
          distances: [[1000, 2000], [3000, 4000]],
        }),
      })

      const result = await engine.computeRouteMatrix(
        [{ lat: 51, lon: -2 }, { lat: 51.1, lon: -2.1 }],
        [{ lat: 51.2, lon: -2.2 }, { lat: 51.3, lon: -2.3 }],
        'drive'
      )

      expect(result.entries).toHaveLength(4)
      expect(result.entries[0].originIndex).toBe(0)
      expect(result.entries[0].destinationIndex).toBe(0)
      expect(result.entries[1].originIndex).toBe(0)
      expect(result.entries[1].destinationIndex).toBe(1)
      expect(result.entries[2].originIndex).toBe(1)
      expect(result.entries[2].destinationIndex).toBe(0)
      expect(result.entries[3].originIndex).toBe(1)
      expect(result.entries[3].destinationIndex).toBe(1)
    })
  })
})
