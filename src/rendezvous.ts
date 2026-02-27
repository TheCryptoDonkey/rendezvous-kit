import type { RoutingEngine, RendezvousOptions, RendezvousSuggestion, LatLon, GeoJSONPolygon } from './types.js'
import { searchVenues } from './venues.js'

/**
 * Find optimal meeting points for N participants using isochrone intersection.
 *
 * Algorithm:
 * 1. Compute isochrones for each participant
 * 2. Intersect isochrone bounding boxes (simplified — full polygon intersection is deferred)
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

  // Step 2: Intersect bounding boxes (simplified approach)
  const intersection = intersectBBoxes(isochrones.map(iso => iso.polygon))
  if (!intersection) {
    return [] // No overlap — participants are too far apart
  }

  // Step 3: Search for venues within the intersection
  const venues = await searchVenues(intersection, venueTypes)
  if (venues.length === 0) {
    return []
  }

  // Step 4: Compute route matrix from participants to candidate venues
  const venuePoints: LatLon[] = venues.map(v => ({ lat: v.lat, lon: v.lon }))
  const matrix = await engine.computeRouteMatrix(participants, venuePoints, mode)

  // Step 5: Score venues
  const suggestions: RendezvousSuggestion[] = venues.map((venue, vi) => {
    const travelTimes: Record<string, number> = {}
    const times: number[] = []

    for (let pi = 0; pi < participants.length; pi++) {
      const entry = matrix.entries.find(
        e => e.originIndex === pi && e.destinationIndex === vi
      )
      const duration = entry?.durationMinutes ?? Infinity
      const label = participants[pi].label ?? `participant_${pi}`
      travelTimes[label] = Math.round(duration * 10) / 10
      times.push(duration)
    }

    const fairnessScore = computeFairnessScore(times, fairness)

    return { venue, travelTimes, fairnessScore }
  })

  // Step 6: Sort by fairness score and return top N
  suggestions.sort((a, b) => a.fairnessScore - b.fairnessScore)
  return suggestions.slice(0, limit)
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

function intersectBBoxes(polygons: GeoJSONPolygon[]): GeoJSONPolygon | null {
  let south = -90, west = -180, north = 90, east = 180

  for (const polygon of polygons) {
    const coords = polygon.coordinates[0]
    let pSouth = Infinity, pWest = Infinity, pNorth = -Infinity, pEast = -Infinity
    for (const [lon, lat] of coords) {
      if (lat < pSouth) pSouth = lat
      if (lat > pNorth) pNorth = lat
      if (lon < pWest) pWest = lon
      if (lon > pEast) pEast = lon
    }
    south = Math.max(south, pSouth)
    west = Math.max(west, pWest)
    north = Math.min(north, pNorth)
    east = Math.min(east, pEast)
  }

  if (south >= north || west >= east) return null

  return {
    type: 'Polygon',
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]]
  }
}
