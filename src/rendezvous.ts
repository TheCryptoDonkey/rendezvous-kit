import type { RoutingEngine, RendezvousOptions, RendezvousSuggestion, LatLon, GeoJSONPolygon } from './types.js'
import { searchVenues } from './venues.js'
import { intersectPolygonsAll, polygonArea, boundingBox } from './geo.js'

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
  const { participants, mode, maxTimeMinutes, venueTypes, fairness = 'min_max', limit = 5 } = options

  if (participants.length < 2) {
    throw new RangeError('findRendezvous requires at least 2 participants')
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

  // Step 5: Score venues (skip any with unreachable participants)
  const suggestions: RendezvousSuggestion[] = []
  for (let vi = 0; vi < venues.length; vi++) {
    const venue = venues[vi]
    const travelTimes: Record<string, number> = {}
    const times: number[] = []
    let reachable = true

    for (let pi = 0; pi < participants.length; pi++) {
      const entry = matrix.entries.find(
        e => e.originIndex === pi && e.destinationIndex === vi
      )
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

    const fairnessScore = computeFairnessScore(times, fairness)
    suggestions.push({ venue, travelTimes, fairnessScore })
  }

  // Step 6: Sort by fairness score and return top N
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
  let totalArea = 0
  let sumLon = 0
  let sumLat = 0
  for (const p of polygons) {
    const area = polygonArea(p)
    const ring = p.coordinates[0]
    const n = ring.length - 1
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
    for (const p of polygons) {
      const ring = p.coordinates[0]
      const n = ring.length - 1
      let cLon = 0, cLat = 0
      for (let i = 0; i < n; i++) { cLon += ring[i][0]; cLat += ring[i][1] }
      lon += cLon / n; lat += cLat / n
    }
    return { lon: lon / polygons.length, lat: lat / polygons.length }
  }
  return { lon: sumLon / totalArea, lat: sumLat / totalArea }
}

function computeFairnessScore(times: number[], strategy: string): number {
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
