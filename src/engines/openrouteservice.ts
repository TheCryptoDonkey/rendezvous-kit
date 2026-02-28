import type { RoutingEngine, Isochrone, RouteMatrix, RouteGeometry, LatLon, TransportMode } from '../types.js'

const ORS_BASE = 'https://api.openrouteservice.org'

const MODE_MAP: Record<TransportMode, string> = {
  drive: 'driving-car',
  cycle: 'cycling-regular',
  walk: 'foot-walking',
  public_transit: 'driving-car', // ORS doesn't support public transit; fallback to driving
}

/** Constructor options for the OpenRouteService engine adapter. */
export interface OpenRouteServiceOptions {
  /** ORS API key (required — obtain from https://openrouteservice.org/dev). */
  apiKey: string
  /** Base URL override. Defaults to the public ORS API (`https://api.openrouteservice.org`). */
  baseUrl?: string
}

/**
 * OpenRouteService routing engine adapter.
 *
 * Requires an API key from https://openrouteservice.org/dev.
 * Supports isochrone computation and route matrices.
 * Note: ORS does not support `public_transit` mode — falls back to driving.
 *
 * @example
 * ```typescript
 * const engine = new OpenRouteServiceEngine({ apiKey: 'your-key' })
 * ```
 */
export class OpenRouteServiceEngine implements RoutingEngine {
  readonly name = 'OpenRouteService'
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(options: OpenRouteServiceOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl ?? ORS_BASE
  }

  async computeIsochrone(origin: LatLon, mode: TransportMode, timeMinutes: number): Promise<Isochrone> {
    const profile = MODE_MAP[mode]
    const body = {
      locations: [[origin.lon, origin.lat]],
      range: [timeMinutes * 60],
      range_type: 'time',
    }

    const response = await fetch(`${this.baseUrl}/v2/isochrones/${profile}`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`ORS isochrone API error ${response.status}: ${text}`)
    }

    const data = await response.json() as {
      features: Array<{ geometry: { type: 'Polygon'; coordinates: number[][][] } }>
    }

    if (!data.features?.length) {
      throw new Error('ORS returned no isochrone features')
    }

    return {
      origin,
      mode,
      timeMinutes,
      polygon: data.features[0].geometry,
    }
  }

  async computeRouteMatrix(origins: LatLon[], destinations: LatLon[], mode: TransportMode): Promise<RouteMatrix> {
    const profile = MODE_MAP[mode]
    const allLocations = [...origins, ...destinations]
    const body = {
      locations: allLocations.map(p => [p.lon, p.lat]),
      sources: origins.map((_, i) => i),
      destinations: destinations.map((_, i) => i + origins.length),
      metrics: ['duration', 'distance'],
    }

    const response = await fetch(`${this.baseUrl}/v2/matrix/${profile}`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`ORS matrix API error ${response.status}: ${text}`)
    }

    const data = await response.json() as {
      durations: (number | null)[][]
      distances: (number | null)[][]
    }

    const entries = []
    for (let oi = 0; oi < origins.length; oi++) {
      for (let di = 0; di < destinations.length; di++) {
        const dur = data.durations[oi][di]
        const dist = data.distances[oi][di]
        entries.push({
          originIndex: oi,
          destinationIndex: di,
          durationMinutes: dur == null || dur < 0 ? -1 : dur / 60,
          distanceKm: dist == null || dist < 0 ? -1 : dist / 1000,
        })
      }
    }

    return { origins, destinations, entries }
  }

  async computeRoute(_origin: LatLon, _destination: LatLon, _mode: TransportMode): Promise<RouteGeometry> {
    throw new Error('computeRoute is not yet implemented for OpenRouteService')
  }
}
