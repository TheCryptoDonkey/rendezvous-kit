import { convexHull } from 'geohash-kit/coverage'
import { polygonArea } from './geo.js'
import type { LatLon, TransportMode, GeoJSONPolygon } from './types.js'

/** Approximate average speeds by transport mode (km/h). */
export const SPEED_KMH: Record<TransportMode, number> = {
  drive: 50,
  cycle: 15,
  walk: 5,
  public_transit: 30,
}

const EARTH_RADIUS_KM = 6371.0088
const DEG_TO_RAD = Math.PI / 180

/**
 * Expand a convex hull outward by a distance in kilometres.
 * Each vertex is pushed radially away from the centroid.
 */
export function bufferHull(
  hull: [number, number][],
  distanceKm: number,
): [number, number][] {
  if (hull.length === 0 || distanceKm === 0) return hull.map(p => [...p] as [number, number])

  // Compute centroid
  let cx = 0, cy = 0
  for (const [x, y] of hull) { cx += x; cy += y }
  cx /= hull.length
  cy /= hull.length

  return hull.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const dist = Math.hypot(dx, dy)
    if (dist === 0) return [x, y] as [number, number]

    // Convert km offset to approximate degrees
    const latRad = cy * DEG_TO_RAD
    const kmPerDegLon = (Math.PI / 180) * EARTH_RADIUS_KM * Math.cos(latRad)
    const kmPerDegLat = (Math.PI / 180) * EARTH_RADIUS_KM

    const bearing = Math.atan2(dx * kmPerDegLon, dy * kmPerDegLat)
    const offsetLon = (distanceKm * Math.sin(bearing)) / kmPerDegLon
    const offsetLat = (distanceKm * Math.cos(bearing)) / kmPerDegLat

    return [x + offsetLon, y + offsetLat] as [number, number]
  })
}

/** Compute the maximum pairwise distance in km between [lon, lat] points. */
function maxPairwiseDistanceKm(points: [number, number][]): number {
  let maxDist = 0
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dLon = (points[j][0] - points[i][0]) * DEG_TO_RAD
      const dLat = (points[j][1] - points[i][1]) * DEG_TO_RAD
      const lat1 = points[i][1] * DEG_TO_RAD
      const lat2 = points[j][1] * DEG_TO_RAD
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const dist = EARTH_RADIUS_KM * c
      if (dist > maxDist) maxDist = dist
    }
  }
  return maxDist
}

/**
 * Decide whether to use hull or isochrone strategy based on
 * participant spread relative to travel budget.
 */
export function chooseStrategy(
  participants: LatLon[],
  mode: TransportMode,
  maxTimeMinutes: number,
): 'hull' | 'isochrone' {
  const points: [number, number][] = participants.map(p => [p.lon, p.lat])
  const hull = convexHull(points)

  // Max theoretical travel radius
  const speedKmH = SPEED_KMH[mode]
  const radiusKm = speedKmH * (maxTimeMinutes / 60)

  // For degenerate hulls (< 3 points), compare max pairwise distance to travel radius
  if (hull.length < 3) {
    const maxDistKm = maxPairwiseDistanceKm(hull)
    return maxDistKm < radiusKm ? 'hull' : 'isochrone'
  }

  // Hull area in m² (polygonArea uses Shoelace with flat-Earth projection)
  const hullPoly: GeoJSONPolygon = {
    type: 'Polygon',
    coordinates: [[...hull, hull[0]]],
  }
  const hullAreaM2 = polygonArea(hullPoly)
  const maxAreaM2 = Math.PI * (radiusKm * 1000) ** 2

  // If hull area is less than 50% of max theoretical area, hull path is efficient
  const threshold = 0.5
  return hullAreaM2 < maxAreaM2 * threshold ? 'hull' : 'isochrone'
}

/**
 * Compute a buffered convex hull from participant locations.
 * Buffer distance derived from transport mode and time budget.
 */
export function computeSearchHull(
  participants: LatLon[],
  mode: TransportMode,
  maxTimeMinutes: number,
): [number, number][] {
  const points: [number, number][] = participants.map(p => [p.lon, p.lat])
  const hull = convexHull(points)
  const speedKmH = SPEED_KMH[mode]
  const bufferKm = speedKmH * (maxTimeMinutes / 60) * 1.2
  return bufferHull(hull, bufferKm)
}
