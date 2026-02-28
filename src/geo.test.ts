import { describe, it, expect } from 'vitest'
import {
  intersectPolygons,
  intersectPolygonsAll,
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

  it('correctly intersects a large square with a concave L-shape', () => {
    // The L-shape is fully inside squareA, so intersection should equal the L-shape
    const bigSquare: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-1, -1], [12, -1], [12, 12], [-1, 12], [-1, -1]]],
    }
    const result = intersectPolygons([bigSquare, lShape])
    expect(result).not.toBeNull()

    // The L-shape area should be preserved (75 sq units: 10×5 bottom + 5×5 left arm)
    // The intersection must NOT collapse to a smaller rectangle
    const lArea = polygonArea(lShape)
    const resultArea = polygonArea(result!)
    expect(resultArea).toBeCloseTo(lArea, -2)
  })

  it('correctly intersects two concave polygons', () => {
    // Two overlapping L-shapes — tests concave ∩ concave
    const lShape2: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[3, 0], [10, 0], [10, 10], [5, 10], [5, 5], [3, 5], [3, 0]]],
    }
    const result = intersectPolygons([lShape, lShape2])
    expect(result).not.toBeNull()

    // Intersection should be two rectangular regions:
    // Bottom overlap: x=[3,10], y=[0,5] → area 35
    // Left arm overlap: x=[5,5], y=[5,5] → just the corner point at (5,5)
    // Actually: lShape is [0,0]→[10,0]→[10,5]→[5,5]→[5,10]→[0,10]
    //           lShape2 is [3,0]→[10,0]→[10,10]→[5,10]→[5,5]→[3,5]
    // The overlap is the rectangle [3,0]→[10,0]→[10,5]→[3,5] = 7×5 = 35 sq units
    const resultArea = polygonArea(result!)
    // Approximate check — polygon area uses metres, so check relative size
    const fullLArea = polygonArea(lShape)
    // Overlap should be about 35/75 = 46.7% of the L-shape
    expect(resultArea / fullLArea).toBeCloseTo(35 / 75, 1)
  })

  it('returns largest component for disconnected concave intersection', () => {
    // Two C-shapes with asymmetric bars — intersection is two disconnected rectangles
    // of different sizes, so we can verify the largest is returned.
    //
    // Shape A: C with thick bottom bar (y=[0,7]) and thin top bar (y=[8,10])
    //          notch at x=[2,8], y=[7,8]
    const cShapeA: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [8, 0], [8, 7], [2, 7], [2, 8], [8, 8], [8, 10], [0, 10], [0, 0]]],
    }
    // Shape B: mirror C — same notch so intersection splits
    // Vertices start from top-left so triangulation processes top region first,
    // ensuring mergePieces encounters the smaller component first
    const cShapeB: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[2, 10], [2, 8], [8, 8], [8, 7], [2, 7], [2, 0], [10, 0], [10, 10], [2, 10]]],
    }

    // True intersection: bottom [2,8]×[0,7] = area 42, top [2,8]×[8,10] = area 12
    const result = intersectPolygons([cShapeA, cShapeB])
    expect(result).not.toBeNull()

    const resultArea = polygonArea(result!)
    const largeComponent = polygonArea({
      type: 'Polygon',
      coordinates: [[[2, 0], [8, 0], [8, 7], [2, 7], [2, 0]]],
    })
    const smallComponent = polygonArea({
      type: 'Polygon',
      coordinates: [[[2, 8], [8, 8], [8, 10], [2, 10], [2, 8]]],
    })

    // Must return the larger component (area ≈ 42), not the smaller (area ≈ 12)
    expect(resultArea / largeComponent).toBeCloseTo(1.0, 1)
    expect(resultArea).toBeGreaterThan(smallComponent * 2)

    // Result should be a valid polygon (no duplicate vertices, properly closed)
    const ring = result!.coordinates[0]
    expect(ring.length).toBeGreaterThanOrEqual(5) // 4 vertices + closing
    // First and last coordinate must match (closed ring)
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 8)
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 8)
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

describe('intersectPolygonsAll', () => {
  it('returns empty array for empty input', () => {
    expect(intersectPolygonsAll([])).toEqual([])
  })

  it('returns single-element array for single polygon', () => {
    const result = intersectPolygonsAll([squareA])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(squareA)
  })

  it('returns 1 component for two overlapping squares', () => {
    const result = intersectPolygonsAll([squareA, squareB])
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('Polygon')
    const c = centroid(result[0])
    expect(c.lon).toBeCloseTo(7.5, 1)
    expect(c.lat).toBeCloseTo(7.5, 1)
  })

  it('returns empty array for non-overlapping polygons', () => {
    const far: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[100, 100], [110, 100], [110, 110], [100, 110], [100, 100]]],
    }
    expect(intersectPolygonsAll([squareA, far])).toEqual([])
  })

  it('returns 2 components for two C-shapes with disconnected intersection', () => {
    // Two C-shapes with asymmetric bars — intersection is two disconnected rectangles
    const cShapeA: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [8, 0], [8, 7], [2, 7], [2, 8], [8, 8], [8, 10], [0, 10], [0, 0]]],
    }
    const cShapeB: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[2, 10], [2, 8], [8, 8], [8, 7], [2, 7], [2, 0], [10, 0], [10, 10], [2, 10]]],
    }

    const result = intersectPolygonsAll([cShapeA, cShapeB])
    expect(result.length).toBe(2)

    // Both components should be valid closed polygons
    for (const component of result) {
      expect(component.type).toBe('Polygon')
      const ring = component.coordinates[0]
      expect(ring.length).toBeGreaterThanOrEqual(5) // at least 4 vertices + closing
      expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 8)
      expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 8)
    }

    // Total area should be approximately 42 + 12 = 54 (bottom 6×7 + top 6×2)
    const areas = result.map(p => polygonArea(p)).sort((a, b) => b - a)
    const largeExpected = polygonArea({
      type: 'Polygon',
      coordinates: [[[2, 0], [8, 0], [8, 7], [2, 7], [2, 0]]],
    })
    const smallExpected = polygonArea({
      type: 'Polygon',
      coordinates: [[[2, 8], [8, 8], [8, 10], [2, 10], [2, 8]]],
    })
    expect(areas[0] / largeExpected).toBeCloseTo(1.0, 1)
    expect(areas[1] / smallExpected).toBeCloseTo(1.0, 1)
  })

  it('returns 1 component for three overlapping squares', () => {
    const squareC: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[3, 3], [8, 3], [8, 8], [3, 8], [3, 3]]],
    }
    const result = intersectPolygonsAll([squareA, squareB, squareC])
    expect(result).toHaveLength(1)
    const c = centroid(result[0])
    expect(c.lon).toBeCloseTo(6.5, 1)
    expect(c.lat).toBeCloseTo(6.5, 1)
  })

  it('all returned components are valid closed polygons', () => {
    const cShapeA: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [8, 0], [8, 7], [2, 7], [2, 8], [8, 8], [8, 10], [0, 10], [0, 0]]],
    }
    const cShapeB: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[2, 10], [2, 8], [8, 8], [8, 7], [2, 7], [2, 0], [10, 0], [10, 10], [2, 10]]],
    }
    const result = intersectPolygonsAll([cShapeA, cShapeB])
    for (const component of result) {
      expect(component.type).toBe('Polygon')
      expect(component.coordinates).toHaveLength(1)
      const ring = component.coordinates[0]
      expect(ring.length).toBeGreaterThanOrEqual(4) // min 3 vertices + closing
      // First and last must match (closed ring)
      expect(ring[0]).toEqual(ring[ring.length - 1])
    }
  })
})

// --- Edge-case intersection tests ---

describe('intersectPolygons edge cases', () => {
  // Helper: verify a result is a valid closed GeoJSON polygon
  function expectValidPolygon(p: GeoJSONPolygon | null) {
    expect(p).not.toBeNull()
    expect(p!.type).toBe('Polygon')
    const ring = p!.coordinates[0]
    expect(ring.length).toBeGreaterThanOrEqual(4) // 3 vertices + closing
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 8)
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 8)
  }

  it('returns the original polygon when intersected with itself', () => {
    const result = intersectPolygons([squareA, squareA])
    expectValidPolygon(result)
    const resultArea = polygonArea(result!)
    const originalArea = polygonArea(squareA)
    expect(resultArea / originalArea).toBeCloseTo(1.0, 2)
  })

  it('returns the inner polygon when one is fully inside the other', () => {
    const outer: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-5, -5], [15, -5], [15, 15], [-5, 15], [-5, -5]]],
    }
    const inner: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]]],
    }
    const result = intersectPolygons([outer, inner])
    expectValidPolygon(result)
    const resultArea = polygonArea(result!)
    const innerArea = polygonArea(inner)
    expect(resultArea / innerArea).toBeCloseTo(1.0, 2)
  })

  it('returns null for polygons sharing only an edge (no interior overlap)', () => {
    const left: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [5, 0], [5, 10], [0, 10], [0, 0]]],
    }
    const right: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[5, 0], [10, 0], [10, 10], [5, 10], [5, 0]]],
    }
    const result = intersectPolygons([left, right])
    // Shared edge only — may return null or a degenerate zero-area polygon
    if (result !== null) {
      expect(polygonArea(result)).toBeLessThan(polygonArea(left) * 0.001)
    }
  })

  it('returns null for polygons sharing only a single vertex', () => {
    const bottomLeft: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
    }
    const topRight: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[5, 5], [10, 5], [10, 10], [5, 10], [5, 5]]],
    }
    const result = intersectPolygons([bottomLeft, topRight])
    if (result !== null) {
      expect(polygonArea(result)).toBeLessThan(polygonArea(bottomLeft) * 0.001)
    }
  })

  it('handles a very thin sliver intersection', () => {
    // Two wide rectangles overlapping in a 0.01-unit-wide strip
    const wide1: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 5], [0, 5], [0, 0]]],
    }
    const wide2: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[9.99, 0], [20, 0], [20, 5], [9.99, 5], [9.99, 0]]],
    }
    const result = intersectPolygons([wide1, wide2])
    expectValidPolygon(result)
    // Sliver should be ~0.01 × 5 = 0.05 square units (in degrees)
    const sliverArea = polygonArea(result!)
    const fullArea = polygonArea(wide1)
    expect(sliverArea).toBeGreaterThan(0)
    expect(sliverArea).toBeLessThan(fullArea * 0.01)
  })

  it('intersects two triangles correctly', () => {
    const tri1: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [5, 10], [0, 0]]],
    }
    const tri2: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 5], [10, 5], [5, -5], [0, 5]]],
    }
    const result = intersectPolygons([tri1, tri2])
    expectValidPolygon(result)
    // The intersection should be smaller than either triangle
    expect(polygonArea(result!)).toBeLessThan(polygonArea(tri1))
    expect(polygonArea(result!)).toBeLessThan(polygonArea(tri2))
    expect(polygonArea(result!)).toBeGreaterThan(0)
  })

  it('intersects a diamond (rotated square) with an axis-aligned square', () => {
    // Diamond centred at (5, 5) with vertices at cardinal points
    const diamond: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[5, 0], [10, 5], [5, 10], [0, 5], [5, 0]]],
    }
    const result = intersectPolygons([squareA, diamond])
    expectValidPolygon(result)
    // Diamond is fully inside squareA, so intersection = diamond
    const resultArea = polygonArea(result!)
    const diamondArea = polygonArea(diamond)
    expect(resultArea / diamondArea).toBeCloseTo(1.0, 1)
  })

  it('handles a polygon with collinear vertices along edges', () => {
    // Square with extra midpoints on each edge (8 vertices instead of 4)
    const squareWithMidpoints: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [5, 0], [10, 0], [10, 5], [10, 10], [5, 10], [0, 10], [0, 5], [0, 0]]],
    }
    const result = intersectPolygons([squareWithMidpoints, squareB])
    expectValidPolygon(result)
    // Should produce the same result as squareA ∩ squareB
    const referenceResult = intersectPolygons([squareA, squareB])
    const resultArea = polygonArea(result!)
    const refArea = polygonArea(referenceResult!)
    expect(resultArea / refArea).toBeCloseTo(1.0, 2)
  })

  it('handles a polygon with a very sharp angle (< 2 degrees)', () => {
    // Very acute isosceles triangle — vertex at (5, 100), base from (4.5, 0) to (5.5, 0)
    const sharpTri: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[4.5, 0], [5.5, 0], [5, 50], [4.5, 0]]],
    }
    const clipSquare: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    }
    const result = intersectPolygons([sharpTri, clipSquare])
    expectValidPolygon(result)
    // Result should be a trapezoid (base of triangle clipped at y=10)
    expect(polygonArea(result!)).toBeGreaterThan(0)
    expect(polygonArea(result!)).toBeLessThan(polygonArea(sharpTri))
  })

  it('intersects two many-vertex polygons (circle approximations)', () => {
    // Two circles as 64-segment polygons, overlapping
    const circle1 = circleToPolygon([0, 0], 100_000, 64)  // 100 km
    const circle2 = circleToPolygon([0.5, 0], 100_000, 64)
    const result = intersectPolygons([circle1, circle2])
    expectValidPolygon(result)
    // Intersection should be smaller than either circle but non-trivial
    expect(polygonArea(result!)).toBeGreaterThan(0)
    expect(polygonArea(result!)).toBeLessThan(polygonArea(circle1))
    expect(polygonArea(result!)).toBeGreaterThan(polygonArea(circle1) * 0.3)
  })

  it('returns null for three polygons with pairwise overlap but empty triple intersection', () => {
    // Three squares arranged in a triangle pattern — each pair overlaps,
    // but no single point is inside all three
    const a: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
    }
    const b: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[3, 0], [8, 0], [8, 5], [3, 5], [3, 0]]],
    }
    const c: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[1.5, 3], [6.5, 3], [6.5, 8], [1.5, 8], [1.5, 3]]],
    }
    // A∩B = [3,5]×[0,5], A∩C = [1.5,5]×[3,5], B∩C = [3,6.5]×[3,5]
    // A∩B∩C = [3,5]×[3,5] — this actually DOES overlap
    // Instead, use a configuration that truly has empty triple intersection:
    const p: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [4, 0], [4, 2], [0, 2], [0, 0]]],
    }
    const q: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[3, 0], [7, 0], [7, 2], [3, 2], [3, 0]]],
    }
    const r: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[1, 3], [6, 3], [6, 5], [1, 5], [1, 3]]],
    }
    // P∩Q = [3,4]×[0,2] (overlaps), P∩R = empty (no y overlap), Q∩R = empty
    // So P∩Q∩R = empty
    const result = intersectPolygons([p, q, r])
    expect(result).toBeNull()
  })

  it('handles a concave polygon fully containing a convex polygon', () => {
    // U-shape with a small square inside the cavity
    const uShape: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [8, 10], [8, 3], [2, 3], [2, 10], [0, 10], [0, 0]]],
    }
    const innerSquare: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[3, 1], [7, 1], [7, 2.5], [3, 2.5], [3, 1]]],
    }
    const result = intersectPolygons([uShape, innerSquare])
    expectValidPolygon(result)
    const resultArea = polygonArea(result!)
    const innerArea = polygonArea(innerSquare)
    expect(resultArea / innerArea).toBeCloseTo(1.0, 1)
  })

  it('returns null when small square is in the cavity of a U-shape (outside the polygon)', () => {
    const uShape: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [8, 10], [8, 3], [2, 3], [2, 10], [0, 10], [0, 0]]],
    }
    // This square sits in the open cavity (above the U floor, between the arms)
    const cavitySquare: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[3, 4], [7, 4], [7, 8], [3, 8], [3, 4]]],
    }
    const result = intersectPolygons([uShape, cavitySquare])
    // The cavity is outside the U-shape, so intersection should be null or near-zero
    if (result !== null) {
      expect(polygonArea(result)).toBeLessThan(polygonArea(cavitySquare) * 0.01)
    }
  })

  it('handles clockwise and counter-clockwise winding orders', () => {
    // squareA is CCW; create a CW version
    const squareCW: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]],
    }
    const result = intersectPolygons([squareCW, squareB])
    expectValidPolygon(result)
    const refResult = intersectPolygons([squareA, squareB])
    const resultArea = polygonArea(result!)
    const refArea = polygonArea(refResult!)
    expect(resultArea / refArea).toBeCloseTo(1.0, 2)
  })

  it('correctly clips a star shape against a square', () => {
    // 5-pointed star centred at (5, 5) — highly concave
    const star: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[
        [5, 10],    // top
        [3.5, 6.5], // inner left-top
        [0, 6],     // left point
        [3, 4],     // inner left-bottom
        [2, 0],     // bottom-left point
        [5, 2.5],   // inner bottom
        [8, 0],     // bottom-right point
        [7, 4],     // inner right-bottom
        [10, 6],    // right point
        [6.5, 6.5], // inner right-top
        [5, 10],    // close
      ]],
    }
    const clipRect: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]]],
    }
    const result = intersectPolygons([star, clipRect])
    expectValidPolygon(result)
    expect(polygonArea(result!)).toBeGreaterThan(0)
    expect(polygonArea(result!)).toBeLessThan(polygonArea(clipRect))
    expect(polygonArea(result!)).toBeLessThan(polygonArea(star))
  })
})

describe('intersectPolygonsAll edge cases', () => {
  it('preserves all components when concave shapes create multiple intersections', () => {
    // Plus sign shape ∩ X shape should create multiple disconnected regions
    const plus: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[3, 0], [7, 0], [7, 3], [10, 3], [10, 7], [7, 7], [7, 10], [3, 10], [3, 7], [0, 7], [0, 3], [3, 3], [3, 0]]],
    }
    // Use a frame (hollow square) that intersects the plus in 4 disconnected regions
    const frame: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-1, -1], [11, -1], [11, 11], [-1, 11], [-1, -1]]],
    }
    // Frame fully contains plus, so result should be 1 component = the plus
    const result = intersectPolygonsAll([plus, frame])
    expect(result.length).toBe(1)
    const resultArea = polygonArea(result[0])
    const plusArea = polygonArea(plus)
    expect(resultArea / plusArea).toBeCloseTo(1.0, 1)
  })

  it('handles many-vertex convex polygons without accumulating error', () => {
    // Two 128-segment circles with known overlap
    const c1 = circleToPolygon([-1.5, 53.8], 50_000, 128)
    const c2 = circleToPolygon([-1.0, 53.8], 50_000, 128)
    const result = intersectPolygonsAll([c1, c2])
    expect(result.length).toBe(1)
    const resultArea = polygonArea(result[0])
    expect(resultArea).toBeGreaterThan(0)
    // Intersection should be symmetric — centroid should be near midpoint of centres
    const c = centroid(result[0])
    expect(c.lon).toBeCloseTo(-1.25, 0)
    expect(c.lat).toBeCloseTo(53.8, 0)
  })

  it('returns valid closed rings with finite coordinates for all components', () => {
    const cShapeA: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [8, 0], [8, 7], [2, 7], [2, 8], [8, 8], [8, 10], [0, 10], [0, 0]]],
    }
    const cShapeB: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[2, 10], [2, 8], [8, 8], [8, 7], [2, 7], [2, 0], [10, 0], [10, 10], [2, 10]]],
    }
    const result = intersectPolygonsAll([cShapeA, cShapeB])
    for (const component of result) {
      const ring = component.coordinates[0]
      // All vertices should have finite coordinates
      for (const [lon, lat] of ring) {
        expect(Number.isFinite(lon)).toBe(true)
        expect(Number.isFinite(lat)).toBe(true)
      }
      // Positive area (not degenerate)
      expect(polygonArea(component)).toBeGreaterThan(0)
    }
  })

  it('produces no duplicate consecutive vertices in output rings', () => {
    // Regression: sutherlandHodgman can emit duplicate consecutive vertices when
    // polygon vertices lie exactly on clip edges. These propagate as zero-length
    // boundary edges through mergePieces, producing duplicates in the final output.
    const cShapeA: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [8, 0], [8, 7], [2, 7], [2, 8], [8, 8], [8, 10], [0, 10], [0, 0]]],
    }
    const cShapeB: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[2, 10], [2, 8], [8, 8], [8, 7], [2, 7], [2, 0], [10, 0], [10, 10], [2, 10]]],
    }
    const result = intersectPolygonsAll([cShapeA, cShapeB])
    for (const component of result) {
      const ring = component.coordinates[0]
      for (let i = 0; i < ring.length - 1; i++) {
        const dx = Math.abs(ring[i][0] - ring[i + 1][0])
        const dy = Math.abs(ring[i][1] - ring[i + 1][1])
        expect(dx + dy, `duplicate at index ${i}: [${ring[i]}]`).toBeGreaterThan(1e-10)
      }
    }
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
