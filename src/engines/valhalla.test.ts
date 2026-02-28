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

  describe('computeRoute', () => {
    // Encoded polyline6 for [[-2.5879, 51.4545], [-2.5, 51.5]]
    const mockShape = 'gapcaBvn}|CwzwAwtjD'

    const mockRouteResponse = {
      trip: {
        summary: { time: 720, length: 8.5 },
        legs: [{
          shape: mockShape,
          maneuvers: [
            {
              instruction: 'Head north on A38',
              length: 5.2,
              time: 420,
              type: 1,
              street_names: ['A38'],
              bearing_before: 0,
              bearing_after: 10,
              begin_shape_index: 0,
              end_shape_index: 1,
            },
            {
              instruction: 'Turn right onto M32',
              length: 3.3,
              time: 300,
              type: 10,
              street_names: ['M32'],
              bearing_before: 10,
              bearing_after: 90,
              begin_shape_index: 1,
              end_shape_index: 2,
            },
          ],
        }],
      },
    }

    it('sends POST to /route and returns parsed route geometry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      })

      const origin = { lat: 51.4545, lon: -2.5879 }
      const destination = { lat: 51.5, lon: -2.5 }
      const result = await engine.computeRoute(origin, destination, 'drive')

      // Verify request
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:8002/route')
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.costing).toBe('auto')
      expect(body.directions_type).toBe('maneuvers')
      expect(body.locations).toEqual([
        { lat: 51.4545, lon: -2.5879 },
        { lat: 51.5, lon: -2.5 },
      ])

      // Verify response parsing
      expect(result.origin).toEqual(origin)
      expect(result.destination).toEqual(destination)
      expect(result.mode).toBe('drive')
      expect(result.durationMinutes).toBe(12) // 720s / 60
      expect(result.distanceKm).toBe(8.5)
      expect(result.geometry.type).toBe('LineString')
      // polyline6 decodes to [lon, lat] pairs (GeoJSON standard)
      expect(result.geometry.coordinates).toEqual([
        [-2.5879, 51.4545],
        [-2.5, 51.5],
      ])
    })

    it('returns manoeuvres as legs with converted units', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      })

      const result = await engine.computeRoute(
        { lat: 51.4545, lon: -2.5879 },
        { lat: 51.5, lon: -2.5 },
        'drive'
      )

      expect(result.legs).toHaveLength(2)
      expect(result.legs![0]).toEqual({
        instruction: 'Head north on A38',
        distanceKm: 5.2,
        durationMinutes: 7, // 420s / 60
        type: 1,
        streetNames: ['A38'],
        beginStreetNames: undefined,
        verbalInstruction: undefined,
        toll: undefined,
        highway: undefined,
        ferry: undefined,
        rough: undefined,
        gate: undefined,
        bearingBefore: 0,
        bearingAfter: 10,
        beginShapeIndex: 0,
        endShapeIndex: 1,
      })
      expect(result.legs![1]).toEqual({
        instruction: 'Turn right onto M32',
        distanceKm: 3.3,
        durationMinutes: 5, // 300s / 60
        type: 10,
        streetNames: ['M32'],
        beginStreetNames: undefined,
        verbalInstruction: undefined,
        toll: undefined,
        highway: undefined,
        ferry: undefined,
        rough: undefined,
        gate: undefined,
        bearingBefore: 10,
        bearingAfter: 90,
        beginShapeIndex: 1,
        endShapeIndex: 2,
      })
    })

    it('uses correct costing for cycle mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      })

      await engine.computeRoute(
        { lat: 51.4545, lon: -2.5879 },
        { lat: 51.5, lon: -2.5 },
        'cycle'
      )

      const [, init] = mockFetch.mock.calls[0]
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.costing).toBe('bicycle')
    })

    it('throws ValhallaError on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 400, statusText: 'Bad Request',
        text: async () => '{"error":"No route found"}',
      })

      try {
        await engine.computeRoute(
          { lat: 51.4545, lon: -2.5879 },
          { lat: 51.5, lon: -2.5 },
          'drive'
        )
        expect.fail('Expected ValhallaError')
      } catch (err) {
        expect(err).toBeInstanceOf(ValhallaError)
        const ve = err as ValhallaError
        expect(ve.status).toBe(400)
        expect(ve.body).toBe('{"error":"No route found"}')
      }
    })

    it('sends custom headers with route requests', async () => {
      const customEngine = new ValhallaEngine({
        baseUrl: 'http://localhost:8002',
        headers: { 'X-Api-Key': 'route-key' },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRouteResponse,
      })

      await customEngine.computeRoute(
        { lat: 51.4545, lon: -2.5879 },
        { lat: 51.5, lon: -2.5 },
        'drive'
      )

      const [, init] = mockFetch.mock.calls[0]
      const headers = (init as RequestInit).headers as Record<string, string>
      expect(headers['X-Api-Key']).toBe('route-key')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('preserves fractional minutes without rounding', async () => {
      const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })

      const localFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          trip: {
            summary: { time: 425, length: 3.7 },
            legs: [{
              shape: '_p~iF~ps|U_ulLnnqC',
              maneuvers: [{
                instruction: 'Head north.',
                length: 3.7,
                time: 425,
              }],
            }],
          },
        }),
      })
      vi.stubGlobal('fetch', localFetch)

      const result = await engine.computeRoute(
        { lat: 51.456, lon: -2.626 },
        { lat: 51.461, lon: -2.588 },
        'drive',
      )

      expect(result.durationMinutes).toBeCloseTo(7.0833, 3)
      expect(result.legs![0].durationMinutes).toBeCloseTo(7.0833, 3)

      // Restore the outer mockFetch (unstubAllGlobals removes all stubs)
      vi.unstubAllGlobals()
      vi.stubGlobal('fetch', mockFetch)
    })

    it('maps enriched manoeuvre fields to RouteLeg', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            summary: { time: 900, length: 12.0 },
            legs: [{
              shape: mockShape,
              maneuvers: [
                {
                  instruction: 'Head north on A38.',
                  length: 5.2,
                  time: 420,
                  type: 1,
                  street_names: ['A38'],
                  begin_street_names: ['Park Street'],
                  verbal_pre_transition_instruction: 'Head north on A38 for 5 kilometres.',
                  toll: false,
                  highway: true,
                  ferry: false,
                  rough: false,
                  gate: false,
                  bearing_before: 0,
                  bearing_after: 15,
                  begin_shape_index: 0,
                  end_shape_index: 1,
                },
                {
                  instruction: 'Take the ferry to Aust.',
                  length: 6.8,
                  time: 480,
                  type: 28,
                  street_names: [],
                  verbal_pre_transition_instruction: 'Take the ferry to Aust.',
                  toll: true,
                  highway: false,
                  ferry: true,
                  rough: false,
                  gate: true,
                  bearing_before: 15,
                  bearing_after: 350,
                  begin_shape_index: 1,
                  end_shape_index: 2,
                },
              ],
            }],
          },
        }),
      })

      const result = await engine.computeRoute(
        { lat: 51.4545, lon: -2.5879 },
        { lat: 51.5, lon: -2.5 },
        'drive'
      )

      expect(result.legs).toHaveLength(2)

      // First leg: highway, no toll
      const leg0 = result.legs![0]
      expect(leg0.type).toBe(1)
      expect(leg0.streetNames).toEqual(['A38'])
      expect(leg0.beginStreetNames).toEqual(['Park Street'])
      expect(leg0.verbalInstruction).toBe('Head north on A38 for 5 kilometres.')
      expect(leg0.toll).toBeUndefined()       // false → omitted
      expect(leg0.highway).toBe(true)
      expect(leg0.ferry).toBeUndefined()       // false → omitted
      expect(leg0.rough).toBeUndefined()       // false → omitted
      expect(leg0.gate).toBeUndefined()        // false → omitted
      expect(leg0.bearingBefore).toBe(0)
      expect(leg0.bearingAfter).toBe(15)
      expect(leg0.beginShapeIndex).toBe(0)
      expect(leg0.endShapeIndex).toBe(1)

      // Second leg: toll + ferry + gate
      const leg1 = result.legs![1]
      expect(leg1.type).toBe(28)
      expect(leg1.toll).toBe(true)
      expect(leg1.ferry).toBe(true)
      expect(leg1.gate).toBe(true)
      expect(leg1.highway).toBeUndefined()     // false → omitted
    })

    it('omits streetNames when Valhalla returns empty array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            summary: { time: 60, length: 1.0 },
            legs: [{
              shape: mockShape,
              maneuvers: [{
                instruction: 'Head north.',
                length: 1.0,
                time: 60,
                type: 1,
                street_names: [],
                begin_shape_index: 0,
                end_shape_index: 1,
              }],
            }],
          },
        }),
      })

      const result = await engine.computeRoute(
        { lat: 51.4545, lon: -2.5879 },
        { lat: 51.5, lon: -2.5 },
        'drive'
      )

      expect(result.legs![0].streetNames).toBeUndefined()
    })
  })
})
