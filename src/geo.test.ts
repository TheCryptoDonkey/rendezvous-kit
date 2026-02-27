import { describe, it, expect } from 'vitest'
import {
  intersectPolygons,
  boundingBox,
  centroid,
  polygonArea,
  getDestinationPoint,
  circleToPolygon,
} from './geo.js'
import { pointInPolygon } from 'geohash-kit/coverage'
import type { GeoJSONPolygon } from './types.js'

// Two overlapping squares
const squareA: GeoJSONPolygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
}
const squareB: GeoJSONPolygon = {
  type: 'Polygon',
  coordinates: [[[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]],
}

// L-shaped concave polygon
const lShape: GeoJSONPolygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [10, 0], [10, 5], [5, 5], [5, 10], [0, 10], [0, 0]]],
}

describe('boundingBox', () => {
  it('computes bbox of square', () => {
    const bbox = boundingBox(squareA)
    expect(bbox).toEqual({ minLon: 0, minLat: 0, maxLon: 10, maxLat: 10 })
  })
})

describe('centroid', () => {
  it('computes centroid of square', () => {
    const c = centroid(squareA)
    expect(c.lon).toBeCloseTo(5, 5)
    expect(c.lat).toBeCloseTo(5, 5)
  })
})

describe('polygonArea', () => {
  it('returns positive area for valid polygon', () => {
    expect(polygonArea(squareA)).toBeGreaterThan(0)
  })

  it('L-shape has less area than full square', () => {
    expect(polygonArea(lShape)).toBeLessThan(polygonArea(squareA))
  })
})

describe('intersectPolygons', () => {
  it('returns the intersection of two overlapping squares', () => {
    const result = intersectPolygons([squareA, squareB])
    expect(result).not.toBeNull()
    expect(result!.type).toBe('Polygon')

    // Intersection should be roughly centred at (7.5, 7.5)
    const c = centroid(result!)
    expect(c.lon).toBeCloseTo(7.5, 1)
    expect(c.lat).toBeCloseTo(7.5, 1)
  })

  it('returns null for non-overlapping polygons', () => {
    const far: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[100, 100], [110, 100], [110, 110], [100, 110], [100, 100]]],
    }
    expect(intersectPolygons([squareA, far])).toBeNull()
  })

  it('returns the single polygon when only one is provided', () => {
    const result = intersectPolygons([squareA])
    expect(result).not.toBeNull()
  })

  it('returns null for empty input', () => {
    expect(intersectPolygons([])).toBeNull()
  })

  it('handles three overlapping polygons', () => {
    const squareC: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[3, 3], [8, 3], [8, 8], [3, 8], [3, 3]]],
    }
    const result = intersectPolygons([squareA, squareB, squareC])
    expect(result).not.toBeNull()
    // Intersection of A ∩ B ∩ C = (5,5)→(8,5)→(8,8)→(5,8)
    const c = centroid(result!)
    expect(c.lon).toBeCloseTo(6.5, 1)
    expect(c.lat).toBeCloseTo(6.5, 1)
  })
})

describe('geohash-kit pointInPolygon integration', () => {
  it('works with our GeoJSONPolygon type', () => {
    // pointInPolygon from geohash-kit takes ([lon, lat], ring: [number, number][])
    // Extract the outer ring (minus closing vertex) to pass as the polygon vertices
    const ringA = squareA.coordinates[0] as [number, number][]
    expect(pointInPolygon([5, 5], ringA)).toBe(true)
    expect(pointInPolygon([15, 15], ringA)).toBe(false)
  })
})

// --- getDestinationPoint ---

describe('getDestinationPoint', () => {
  it('returns the same point for zero distance', () => {
    const [lon, lat] = getDestinationPoint([-1.5, 53.8], 0, 90)
    expect(lon).toBeCloseTo(-1.5, 8)
    expect(lat).toBeCloseTo(53.8, 8)
  })

  it('moves north correctly', () => {
    const [lon, lat] = getDestinationPoint([0, 0], 1000, 0)
    expect(lon).toBeCloseTo(0, 4)
    expect(lat).toBeGreaterThan(0)
    expect(lat).toBeCloseTo(0.008993, 3)
  })

  it('moves east correctly', () => {
    const [lon, lat] = getDestinationPoint([0, 0], 1000, 90)
    expect(lon).toBeGreaterThan(0)
    expect(lon).toBeCloseTo(0.008993, 3)
    expect(lat).toBeCloseTo(0, 4)
  })

  it('throws on NaN input', () => {
    expect(() => getDestinationPoint([NaN, 53], 1000, 0)).toThrow(RangeError)
    expect(() => getDestinationPoint([0, 0], NaN, 0)).toThrow(RangeError)
    expect(() => getDestinationPoint([0, 0], 1000, NaN)).toThrow(RangeError)
  })

  it('throws on negative distance', () => {
    expect(() => getDestinationPoint([0, 0], -100, 0)).toThrow(RangeError)
  })
})

// --- circleToPolygon ---

describe('circleToPolygon', () => {
  it('returns a valid GeoJSON Polygon', () => {
    const result = circleToPolygon([-1.5, 53.8], 5000)
    expect(result.type).toBe('Polygon')
    expect(result.coordinates).toHaveLength(1)
    const ring = result.coordinates[0]
    expect(ring.length).toBe(65) // 64 segments + closing vertex
    expect(ring[0]).toEqual(ring[ring.length - 1])
  })

  it('produces points at roughly the correct distance', () => {
    const centre: [number, number] = [-1.5, 53.8]
    const radiusMetres = 10_000
    const result = circleToPolygon(centre, radiusMetres, 32)
    const ring = result.coordinates[0]

    for (let i = 0; i < 32; i += 8) {
      const [pLon, pLat] = ring[i]
      const toRad = (d: number) => (d * Math.PI) / 180
      const dLat = toRad(pLat - centre[1])
      const dLon = toRad(pLon - centre[0])
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(centre[1])) * Math.cos(toRad(pLat)) * Math.sin(dLon / 2) ** 2
      const dist = 2 * 6_371_008.8 * Math.asin(Math.sqrt(a))
      expect(dist).toBeCloseTo(radiusMetres, -2)
    }
  })

  it('respects custom segment count', () => {
    const result = circleToPolygon([0, 0], 1000, 8)
    expect(result.coordinates[0]).toHaveLength(9)
  })

  it('throws on invalid centre', () => {
    expect(() => circleToPolygon([NaN, 53], 1000)).toThrow(RangeError)
    expect(() => circleToPolygon([Infinity, 0], 1000)).toThrow(RangeError)
  })

  it('throws on invalid radius', () => {
    expect(() => circleToPolygon([0, 0], 0)).toThrow(RangeError)
    expect(() => circleToPolygon([0, 0], -100)).toThrow(RangeError)
    expect(() => circleToPolygon([0, 0], NaN)).toThrow(RangeError)
  })

  it('throws on too few segments', () => {
    expect(() => circleToPolygon([0, 0], 1000, 2)).toThrow(RangeError)
  })
})
