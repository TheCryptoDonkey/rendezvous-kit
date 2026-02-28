import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ValhallaEngine, ValhallaError } from './valhalla.js'
import type { GeoJSONPolygon } from '../types.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => mockFetch.mockReset())

describe('ValhallaEngine', () => {
  const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })

  describe('computeIsochrone', () => {
    it('sends POST to /isochrone with correct body', async () => {
      const mockPoly: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: mockPoly, properties: {} }],
        }),
      })

      const result = await engine.computeIsochrone(
        { lat: 51.4545, lon: -2.5879 }, 'drive', 30
      )

      expect(result.polygon.type).toBe('Polygon')

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:8002/isochrone')
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.costing).toBe('auto')
      expect(body.contours[0].time).toBe(30)
      expect(body.polygons).toBe(true)
    })

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 500, statusText: 'Error',
        text: async () => 'Internal error',
      })

      await expect(
        engine.computeIsochrone({ lat: 51, lon: -2 }, 'drive', 30)
      ).rejects.toThrow()
    })
  })

  describe('computeRouteMatrix', () => {
    it('sends POST to /sources_to_targets and converts units', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sources_to_targets: [
            [{ time: 600, distance: 5.0 }, { time: 1200, distance: 10.0 }],
          ],
        }),
      })

      const result = await engine.computeRouteMatrix(
        [{ lat: 51, lon: -2 }],
        [{ lat: 51.1, lon: -2.1 }, { lat: 51.2, lon: -2.2 }],
        'drive'
      )

      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].durationMinutes).toBe(10) // 600s / 60
      expect(result.entries[0].distanceKm).toBe(5.0) // Valhalla returns km natively
    })

    it('throws ValhallaError on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 503, statusText: 'Service Unavailable',
        text: async () => 'Valhalla is unavailable',
      })

      try {
        await engine.computeRouteMatrix([{ lat: 51, lon: -2 }], [{ lat: 51.1, lon: -2.1 }], 'drive')
        expect.fail('Expected ValhallaError')
      } catch (err) {
        expect(err).toBeInstanceOf(ValhallaError)
        const ve = err as ValhallaError
        expect(ve.status).toBe(503)
        expect(ve.body).toBe('Valhalla is unavailable')
      }
    })
  })

  describe('ValhallaError', () => {
    it('has correct name, status, body, and message', () => {
      const err = new ValhallaError('test message', 422, '{"error":"bad input"}')
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(ValhallaError)
      expect(err.name).toBe('ValhallaError')
      expect(err.message).toBe('test message')
      expect(err.status).toBe(422)
      expect(err.body).toBe('{"error":"bad input"}')
    })
  })

  describe('custom headers', () => {
    it('sends custom headers with isochrone requests', async () => {
      const customEngine = new ValhallaEngine({
        baseUrl: 'http://localhost:8002',
        headers: { 'X-Api-Key': 'secret-key', 'Authorization': 'Bearer tok123' },
      })

      const mockPoly: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: mockPoly, properties: {} }],
        }),
      })

      await customEngine.computeIsochrone({ lat: 51, lon: -2 }, 'drive', 30)

      const [, init] = mockFetch.mock.calls[0]
      const headers = (init as RequestInit).headers as Record<string, string>
      expect(headers['X-Api-Key']).toBe('secret-key')
      expect(headers['Authorization']).toBe('Bearer tok123')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('sends custom headers with matrix requests', async () => {
      const customEngine = new ValhallaEngine({
        baseUrl: 'http://localhost:8002',
        headers: { 'X-Api-Key': 'matrix-key' },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sources_to_targets: [[{ time: 600, distance: 5.0 }]],
        }),
      })

      await customEngine.computeRouteMatrix(
        [{ lat: 51, lon: -2 }],
        [{ lat: 51.1, lon: -2.1 }],
        'drive'
      )

      const [, init] = mockFetch.mock.calls[0]
      const headers = (init as RequestInit).headers as Record<string, string>
      expect(headers['X-Api-Key']).toBe('matrix-key')
    })
  })

  describe('typed error throwing', () => {
    it('throws ValhallaError with status and body on isochrone failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 400, statusText: 'Bad Request',
        text: async () => '{"error":"No costing provided"}',
      })

      try {
        await engine.computeIsochrone({ lat: 51, lon: -2 }, 'drive', 30)
        expect.fail('Expected ValhallaError')
      } catch (err) {
        expect(err).toBeInstanceOf(ValhallaError)
        const ve = err as ValhallaError
        expect(ve.status).toBe(400)
        expect(ve.body).toBe('{"error":"No costing provided"}')
      }
    })
  })
})
