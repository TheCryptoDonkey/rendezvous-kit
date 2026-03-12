import type { RoutingEngine, RendezvousOptions, RendezvousSuggestion, LatLon, GeoJSONPolygon, FairnessStrategy, TransportMode, VenueType, Venue, RouteMatrix, MatrixEntry } from './types.js'
import { searchVenues } from './venues.js'
import { intersectPolygonsAll, polygonArea, boundingBox } from './geo.js'
import { chooseStrategy, computeSearchHull } from './hull.js'

/**
 * Find optimal meeting points for N participants using isochrone intersection.
 *
 * Algorithm:
 * 1. Compute isochrones for each participant
 * 2. Intersect isochrone polygons
 * 3. Search for venues within the intersection
 * 4. Compute route matrix from all participants to all candidate venues
 * 5. Score venues by fairness strategy
 * 6. Return ranked suggestions
 */
export async function findRendezvous(
  engine: RoutingEngine,
  options: RendezvousOptions,
): Promise<RendezvousSuggestion[]> {
  const { participants, mode, maxTimeMinutes, venueTypes, fairness = 'min_max', limit: rawLimit = 5, strategy: requestedStrategy = 'auto' } = options
  const limit = Math.max(1, Math.min(50, Math.round(rawLimit)))

  if (participants.length < 2) {
    throw new RangeError('findRendezvous requires at least 2 participants')
  }
  if (participants.length > 100) {
    throw new RangeError('findRendezvous supports at most 100 participants')
  }

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i]
    if (!Number.isFinite(p.lat) || p.lat < -90 || p.lat > 90) {
      throw new RangeError(`Invalid latitude for participant ${i}: ${p.lat}`)
    }
    if (!Number.isFinite(p.lon) || p.lon < -180 || p.lon > 180) {
      throw new RangeError(`Invalid longitude for participant ${i}: ${p.lon}`)
    }
  }

  if (!Number.isFinite(maxTimeMinutes) || maxTimeMinutes <= 0) {
    throw new RangeError(`Invalid maxTimeMinutes: ${maxTimeMinutes}`)
  }

  // Resolve pipeline strategy
  const strategy = requestedStrategy === 'auto'
    ? chooseStrategy(participants, mode, maxTimeMinutes)
    : requestedStrategy

  if (strategy === 'hull') {
    return findRendezvousHull(engine, participants, mode, maxTimeMinutes, venueTypes, fairness, limit)
  }

  // Step 1: Compute isochrones for each participant
  const isochrones = await Promise.all(
    participants.map(p => engine.computeIsochrone(p, mode, maxTimeMinutes))
  )

  // Step 2: Intersect isochrone polygons (preserving all disconnected components)
  const components = intersectPolygonsAll(isochrones.map(iso => iso.polygon))
  if (components.length === 0) {
    return [] // No overlap — participants are too far apart
  }

  // Step 3: Search for venues across all intersection components
  const searchRegion = components.length === 1 ? components[0] : envelopePolygon(components)
  let venues = await searchVenues(searchRegion, venueTypes)
  if (venues.length === 0) {
    const c = weightedCentroid(components)
    venues = [{
      name: 'Meeting point',
      lat: c.lat,
      lon: c.lon,
      venueType: 'centroid',
    }]
  }

  // Step 4: Compute route matrix from participants to candidate venues
  const venuePoints: LatLon[] = venues.map(v => ({ lat: v.lat, lon: v.lon }))
  const matrix = await engine.computeRouteMatrix(participants, venuePoints, mode)

  // Step 5–6: Score, sort, and return
  return scoreVenues(venues, participants, matrix, maxTimeMinutes, fairness, 'isochrone', limit)
}

async function findRendezvousHull(
  engine: RoutingEngine,
  participants: LatLon[],
  mode: TransportMode,
  maxTimeMinutes: number,
  venueTypes: VenueType[],
  fairness: FairnessStrategy,
  limit: number,
): Promise<RendezvousSuggestion[]> {
  // 1. Compute buffered hull
  const bufferedHull = computeSearchHull(participants, mode, maxTimeMinutes)

  // 2. Search venues in hull
  const searchPoly: GeoJSONPolygon = {
    type: 'Polygon',
    coordinates: [[...bufferedHull, bufferedHull[0]]],
  }
  let venues = await searchVenues(searchPoly, venueTypes)

  if (venues.length === 0) {
    // Fallback: use centroid of hull
    let cx = 0, cy = 0
    for (const [lon, lat] of bufferedHull) { cx += lon; cy += lat }
    cx /= bufferedHull.length
    cy /= bufferedHull.length
    venues = [{
      name: 'Meeting point',
      lat: cy,
      lon: cx,
      venueType: 'other',
    }]
  }

  // 3. Route matrix
  const venuePoints: LatLon[] = venues.map(v => ({ lat: v.lat, lon: v.lon }))
  const matrix = await engine.computeRouteMatrix(participants, venuePoints, mode)

  // 4. Score, sort, and return
  return scoreVenues(venues, participants, matrix, maxTimeMinutes, fairness, 'hull', limit)
}

function scoreVenues(
  venues: Venue[],
  participants: LatLon[],
  matrix: RouteMatrix,
  maxTimeMinutes: number,
  fairness: FairnessStrategy,
  strategy: 'hull' | 'isochrone',
  limit: number,
): RendezvousSuggestion[] {
  // Pre-index matrix for O(1) lookup instead of O(n) scan per venue×participant
  const indexed = new Map<string, MatrixEntry>()
  for (const e of matrix.entries) indexed.set(`${e.originIndex}:${e.destinationIndex}`, e)

  const suggestions: RendezvousSuggestion[] = []

  for (let vi = 0; vi < venues.length; vi++) {
    const travelTimes: Record<string, number> = {}
    const times: number[] = []
    let reachable = true

    for (let pi = 0; pi < participants.length; pi++) {
      const entry = indexed.get(`${pi}:${vi}`)
      const duration = entry?.durationMinutes ?? -1
      if (duration < 0 || duration > maxTimeMinutes) {
        reachable = false
        break
      }
      const label = participants[pi].label ?? `participant_${pi}`
      travelTimes[label] = Math.round(duration * 10) / 10
      times.push(duration)
    }

    if (!reachable) continue

    suggestions.push({
      venue: venues[vi],
      travelTimes,
      fairnessScore: computeFairnessScore(times, fairness),
      metadata: { strategy },
    })
  }

  suggestions.sort((a, b) => a.fairnessScore - b.fairnessScore)
  return suggestions.slice(0, limit)
}

function envelopePolygon(polygons: GeoJSONPolygon[]): GeoJSONPolygon {
  let minLon = Infinity, minLat = Infinity
  let maxLon = -Infinity, maxLat = -Infinity
  for (const p of polygons) {
    const bb = boundingBox(p)
    if (bb.minLon < minLon) minLon = bb.minLon
    if (bb.minLat < minLat) minLat = bb.minLat
    if (bb.maxLon > maxLon) maxLon = bb.maxLon
    if (bb.maxLat > maxLat) maxLat = bb.maxLat
  }
  return {
    type: 'Polygon',
    coordinates: [[[minLon, minLat], [maxLon, minLat], [maxLon, maxLat], [minLon, maxLat], [minLon, minLat]]],
  }
}

function weightedCentroid(polygons: GeoJSONPolygon[]): { lat: number; lon: number } {
  if (polygons.length === 0) return { lat: 0, lon: 0 }

  let totalArea = 0
  let sumLon = 0
  let sumLat = 0
  for (const p of polygons) {
    const area = polygonArea(p)
    const ring = p.coordinates[0]
    const n = ring.length - 1
    if (n <= 0) continue
    let cLon = 0, cLat = 0
    for (let i = 0; i < n; i++) {
      cLon += ring[i][0]
      cLat += ring[i][1]
    }
    sumLon += (cLon / n) * area
    sumLat += (cLat / n) * area
    totalArea += area
  }
  if (totalArea === 0) {
    // Fallback: unweighted average of centroids
    let lon = 0, lat = 0
    let count = 0
    for (const p of polygons) {
      const ring = p.coordinates[0]
      const n = ring.length - 1
      if (n <= 0) continue
      let cLon = 0, cLat = 0
      for (let i = 0; i < n; i++) { cLon += ring[i][0]; cLat += ring[i][1] }
      lon += cLon / n; lat += cLat / n
      count++
    }
    if (count === 0) return { lat: 0, lon: 0 }
    return { lon: lon / count, lat: lat / count }
  }
  return { lon: sumLon / totalArea, lat: sumLat / totalArea }
}

function computeFairnessScore(times: number[], strategy: FairnessStrategy): number {
  switch (strategy) {
    case 'min_max':
      return Math.max(...times)
    case 'min_total':
      return times.reduce((sum, t) => sum + t, 0)
    case 'min_variance': {
      const mean = times.reduce((sum, t) => sum + t, 0) / times.length
      return Math.sqrt(times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length)
    }
    default:
      return Math.max(...times)
  }
}
