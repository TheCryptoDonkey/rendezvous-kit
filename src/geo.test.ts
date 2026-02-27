import { describe, it, expect } from 'vitest'
import {
  intersectPolygons,
  boundingBox,
  centroid,
  polygonArea,
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
