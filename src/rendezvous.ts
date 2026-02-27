import type { RoutingEngine, RendezvousOptions, RendezvousSuggestion, LatLon } from './types.js'
import { searchVenues } from './venues.js'
import { intersectPolygons, centroid } from './geo.js'

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

  // Step 2: Intersect isochrone polygons
  const intersection = intersectPolygons(isochrones.map(iso => iso.polygon))
  if (!intersection) {
    return [] // No overlap — participants are too far apart
  }

  // Step 3: Search for venues within the intersection
  let venues = await searchVenues(intersection, venueTypes)
  if (venues.length === 0) {
    const c = centroid(intersection)
    venues = [{
      name: 'Meeting point',
      lat: c.lat,
      lon: c.lon,
      venueType: 'centroid' as any,
    }]
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
