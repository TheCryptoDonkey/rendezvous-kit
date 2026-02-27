import type { GeoJSONPolygon } from './types.js'

export interface BBox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

export interface Coordinate {
  lat: number
  lon: number
}

export function boundingBox(polygon: GeoJSONPolygon): BBox {
  const ring = polygon.coordinates[0]
  if (!ring || ring.length === 0) {
    return { minLon: 0, minLat: 0, maxLon: 0, maxLat: 0 }
  }

  let minLon = Infinity, minLat = Infinity
  let maxLon = -Infinity, maxLat = -Infinity

  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }

  return { minLon, minLat, maxLon, maxLat }
}

export function centroid(polygon: GeoJSONPolygon): Coordinate {
  const ring = polygon.coordinates[0]
  if (!ring || ring.length < 2) return { lat: 0, lon: 0 }

  const n = ring.length - 1
  let sumLon = 0, sumLat = 0

  for (let i = 0; i < n; i++) {
    sumLon += ring[i][0]
    sumLat += ring[i][1]
  }

  return { lon: sumLon / n, lat: sumLat / n }
}

export function polygonArea(polygon: GeoJSONPolygon): number {
  const ring = polygon.coordinates[0]
  if (!ring || ring.length < 4) return 0

  const c = centroid(polygon)
  const cosLat = Math.cos((c.lat * Math.PI) / 180)
  const mPerDegLat = 111_320
  const mPerDegLon = 111_320 * cosLat

  let area = 0
  const n = ring.length - 1
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const xi = ring[i][0] * mPerDegLon, yi = ring[i][1] * mPerDegLat
    const xj = ring[j][0] * mPerDegLon, yj = ring[j][1] * mPerDegLat
    area += xi * yj - xj * yi
  }

  return Math.abs(area) / 2
}

export function intersectPolygons(
  polygons: GeoJSONPolygon[]
): GeoJSONPolygon | null {
  if (polygons.length === 0) return null
  if (polygons.length === 1) return polygons[0]

  let current = polygonToRing(polygons[0])
  if (current.length === 0) return null

  for (let i = 1; i < polygons.length; i++) {
    const clip = polygonToRing(polygons[i])
    if (clip.length === 0) return null

    if (!bboxOverlap(ringBBox(current), ringBBox(clip))) return null

    current = sutherlandHodgman(current, clip)
    if (current.length === 0) return null
  }

  return ringToPolygon(current)
}

// --- Internal helpers ---

type Point = [number, number]

function polygonToRing(p: GeoJSONPolygon): Point[] {
  const ring = p.coordinates[0]
  if (!ring || ring.length < 4) return []
  return ring.slice(0, -1) as Point[]
}

function ringToPolygon(ring: Point[]): GeoJSONPolygon {
  const closed = [...ring, ring[0]]
  return { type: 'Polygon', coordinates: [closed] }
}

function ringBBox(ring: Point[]): BBox {
  let minLon = Infinity, minLat = Infinity
  let maxLon = -Infinity, maxLat = -Infinity
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return { minLon, minLat, maxLon, maxLat }
}

function bboxOverlap(a: BBox, b: BBox): boolean {
  return a.minLon <= b.maxLon && a.maxLon >= b.minLon &&
         a.minLat <= b.maxLat && a.maxLat >= b.minLat
}

function sutherlandHodgman(subject: Point[], clip: Point[]): Point[] {
  let output = subject

  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) return []

    const input = output
    output = []

    const edgeStart = clip[i]
    const edgeEnd = clip[(i + 1) % clip.length]

    for (let j = 0; j < input.length; j++) {
      const current = input[j]
      const previous = input[(j + input.length - 1) % input.length]

      const currInside = isLeft(edgeStart, edgeEnd, current)
      const prevInside = isLeft(edgeStart, edgeEnd, previous)

      if (currInside) {
        if (!prevInside) {
          const inter = lineIntersection(previous, current, edgeStart, edgeEnd)
          if (inter) output.push(inter)
        }
        output.push(current)
      } else if (prevInside) {
        const inter = lineIntersection(previous, current, edgeStart, edgeEnd)
        if (inter) output.push(inter)
      }
    }
  }

  return output
}

function isLeft(a: Point, b: Point, p: Point): boolean {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0
}

function lineIntersection(
  a1: Point, a2: Point,
  b1: Point, b2: Point
): Point | null {
  const dx1 = a2[0] - a1[0], dy1 = a2[1] - a1[1]
  const dx2 = b2[0] - b1[0], dy2 = b2[1] - b1[1]
  const denom = dx1 * dy2 - dy1 * dx2

  if (Math.abs(denom) < 1e-12) return null

  const t = ((b1[0] - a1[0]) * dy2 - (b1[1] - a1[1]) * dx2) / denom
  return [a1[0] + t * dx1, a1[1] + t * dy1]
}
