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

export function intersectPolygonsAll(
  polygons: GeoJSONPolygon[]
): GeoJSONPolygon[] {
  if (polygons.length === 0) return []
  if (polygons.length === 1) return [polygons[0]]

  let components: Point[][] = [ensureCCW(polygonToRing(polygons[0]))]
  if (components[0].length === 0) return []

  for (let i = 1; i < polygons.length; i++) {
    const clip = ensureCCW(polygonToRing(polygons[i]))
    if (clip.length === 0) return []

    const newComponents: Point[][] = []
    for (const component of components) {
      if (bboxOverlap(ringBBox(component), ringBBox(clip))) {
        newComponents.push(...clipRingsAll(component, clip))
      }
    }
    if (newComponents.length === 0) return []
    components = newComponents
  }

  return components.filter(ring => ring.length >= 3).map(ringToPolygon)
}

export function intersectPolygons(
  polygons: GeoJSONPolygon[]
): GeoJSONPolygon | null {
  const all = intersectPolygonsAll(polygons)
  if (all.length === 0) return null
  if (all.length === 1) return all[0]

  // Pick largest by area (backward compat)
  let best = all[0]
  let bestArea = polygonArea(best)
  for (let i = 1; i < all.length; i++) {
    const a = polygonArea(all[i])
    if (a > bestArea) { best = all[i]; bestArea = a }
  }
  return best
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

// --- Concave polygon clipping helpers ---

function signedArea2(ring: Point[]): number {
  let sum = 0
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length
    sum += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1]
  }
  return sum
}

function ensureCCW(ring: Point[]): Point[] {
  if (ring.length < 3) return ring
  return signedArea2(ring) < 0 ? [...ring].reverse() : ring
}

function isConvex(ring: Point[]): boolean {
  const n = ring.length
  if (n < 3) return false
  let pos = 0, neg = 0
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], c = ring[(i + 2) % n]
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
    if (cross > 0) pos++
    else if (cross < 0) neg++
  }
  return pos === 0 || neg === 0
}

function clipRingsAll(subject: Point[], clip: Point[]): Point[][] {
  if (isConvex(clip)) {
    const result = sutherlandHodgman(subject, clip)
    return result.length >= 3 ? [result] : []
  }
  if (isConvex(subject)) {
    const result = sutherlandHodgman(clip, subject)
    return result.length >= 3 ? [result] : []
  }
  return intersectViaTriangulation(subject, clip)
}

function intersectViaTriangulation(subject: Point[], clip: Point[]): Point[][] {
  const triangles = earClipTriangulate(clip)
  const pieces: Point[][] = []
  for (const tri of triangles) {
    const result = sutherlandHodgman(subject, tri)
    if (result.length >= 3) pieces.push(result)
  }
  if (pieces.length === 0) return []
  if (pieces.length === 1) return [pieces[0]]
  return mergePieces(pieces)
}

function earClipTriangulate(ring: Point[]): Point[][] {
  const ccw = signedArea2(ring) > 0
  const pts = [...ring]
  const triangles: Point[][] = []
  let safety = pts.length * pts.length

  while (pts.length > 3 && safety-- > 0) {
    let earFound = false
    for (let i = 0; i < pts.length; i++) {
      const pi = (i + pts.length - 1) % pts.length
      const ni = (i + 1) % pts.length
      const prev = pts[pi], curr = pts[i], next = pts[ni]

      const cross = (curr[0] - prev[0]) * (next[1] - prev[1])
                   - (curr[1] - prev[1]) * (next[0] - prev[0])
      if (ccw ? cross <= 0 : cross >= 0) continue

      let isEar = true
      for (let j = 0; j < pts.length; j++) {
        if (j === pi || j === i || j === ni) continue
        if (ptInTriangle(pts[j], prev, curr, next)) { isEar = false; break }
      }
      if (isEar) {
        triangles.push([prev, curr, next])
        pts.splice(i, 1)
        earFound = true
        break
      }
    }
    if (!earFound) break
  }
  if (pts.length === 3) triangles.push([pts[0], pts[1], pts[2]])
  return triangles
}

function ptInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const d1 = triCross(p, a, b)
  const d2 = triCross(p, b, c)
  const d3 = triCross(p, c, a)
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
}

function triCross(p1: Point, p2: Point, p3: Point): number {
  return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
}

function mergePieces(pieces: Point[][]): Point[][] {
  const EPS = 1e-9
  const ptEq = (a: Point, b: Point) =>
    Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS

  // Collect all directed edges
  interface DEdge { from: Point; to: Point }
  const all: DEdge[] = []
  for (const piece of pieces) {
    for (let i = 0; i < piece.length; i++) {
      all.push({ from: piece[i], to: piece[(i + 1) % piece.length] })
    }
  }

  // Internal edges appear in both directions — remove them
  const paired = new Set<number>()
  for (let i = 0; i < all.length; i++) {
    if (paired.has(i)) continue
    for (let j = i + 1; j < all.length; j++) {
      if (paired.has(j)) continue
      if (ptEq(all[i].from, all[j].to) && ptEq(all[i].to, all[j].from)) {
        paired.add(i)
        paired.add(j)
        break
      }
    }
  }
  const boundary = all.filter((_, i) => !paired.has(i))
  if (boundary.length === 0) return []

  // Chain boundary edges into loops (may be multiple disconnected components)
  const used = new Set<number>()
  const loops: Point[][] = []

  for (let start = 0; start < boundary.length; start++) {
    if (used.has(start)) continue

    const loop: Point[] = [boundary[start].from]
    let cur = boundary[start].to
    used.add(start)

    for (let iter = 0; iter < boundary.length; iter++) {
      let found = false
      for (let i = 0; i < boundary.length; i++) {
        if (used.has(i)) continue
        if (ptEq(boundary[i].from, cur)) {
          loop.push(cur)
          cur = boundary[i].to
          used.add(i)
          found = true
          break
        }
      }
      if (!found) break
    }
    if (loop.length >= 3) loops.push(loop)
  }

  return loops
}

// --- Geodesic utilities ---

const EARTH_RADIUS_METRES = 6_371_008.8

/**
 * Compute the destination point given a start [lon, lat], distance in metres,
 * and bearing in degrees (0 = north, 90 = east). Uses the Haversine formula.
 */
export function getDestinationPoint(
  start: [number, number],
  distanceMetres: number,
  bearingDeg: number,
): [number, number] {
  if (!Number.isFinite(start[0]) || !Number.isFinite(start[1])) {
    throw new RangeError(`Invalid start coordinate: [${start[0]}, ${start[1]}]`)
  }
  if (!Number.isFinite(distanceMetres) || distanceMetres < 0) {
    throw new RangeError(`Invalid distance: ${distanceMetres}`)
  }
  if (!Number.isFinite(bearingDeg)) {
    throw new RangeError(`Invalid bearing: ${bearingDeg}`)
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI

  const lat1 = toRad(start[1])
  const lon1 = toRad(start[0])
  const bearing = toRad(bearingDeg)
  const angularDist = distanceMetres / EARTH_RADIUS_METRES

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist) +
      Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
      Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2),
    )

  return [toDeg(lon2), toDeg(lat2)]
}

/**
 * Approximate a circle on the Earth's surface as a GeoJSON Polygon.
 *
 * Uses the Haversine destination-point formula to project `segments` evenly
 * spaced points around the centre at the given radius. Returns a closed
 * GeoJSON Polygon (first coordinate === last coordinate per RFC 7946).
 *
 * @param centre  [lon, lat] of circle centre
 * @param radiusMetres  radius in metres
 * @param segments  number of polygon vertices (default 64)
 * @returns GeoJSON Polygon geometry
 */
export function circleToPolygon(
  centre: [number, number],
  radiusMetres: number,
  segments = 64,
): GeoJSONPolygon {
  if (!Number.isFinite(centre[0]) || !Number.isFinite(centre[1])) {
    throw new RangeError(`Invalid centre coordinate: [${centre[0]}, ${centre[1]}]`)
  }
  if (!Number.isFinite(radiusMetres) || radiusMetres <= 0) {
    throw new RangeError(`Invalid radius: ${radiusMetres}`)
  }
  if (!Number.isFinite(segments) || segments < 3) {
    throw new RangeError(`Invalid segments: ${segments} (minimum 3)`)
  }

  const coords: number[][] = []
  for (let i = 0; i < segments; i++) {
    const bearingDeg = (360 * i) / segments
    coords.push(getDestinationPoint(centre, radiusMetres, bearingDeg))
  }
  // Close the ring per RFC 7946
  coords.push(coords[0])

  return { type: 'Polygon', coordinates: [coords] }
}
