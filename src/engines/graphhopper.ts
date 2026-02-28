import type {
  RoutingEngine, Isochrone, RouteMatrix, RouteGeometry, MatrixEntry,
  TransportMode, LatLon, GeoJSONPolygon,
} from '../types.js'

const PROFILE: Record<TransportMode, string> = {
  drive: 'car',
  cycle: 'bike',
  walk: 'foot',
  public_transit: 'car',
}

/**
 * GraphHopper routing engine adapter.
 *
 * Works with self-hosted or cloud GraphHopper instances.
 * API key is optional for self-hosted deployments.
 * Note: GraphHopper does not natively support `public_transit` — falls back to driving.
 *
 * @example
 * ```typescript
 * const engine = new GraphHopperEngine({ baseUrl: 'http://localhost:8989' })
 * ```
 */
export class GraphHopperEngine implements RoutingEngine {
  readonly name = 'GraphHopper'
  private readonly baseUrl: string
  private readonly apiKey?: string

  constructor(config: { baseUrl: string; apiKey?: string }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey
  }

  private params(extra: Record<string, string>): string {
    const p = new URLSearchParams(extra)
    if (this.apiKey) p.set('key', this.apiKey)
    return p.toString()
  }

  async computeIsochrone(
    origin: LatLon,
    mode: TransportMode,
    timeMinutes: number
  ): Promise<Isochrone> {
    const qs = this.params({
      point: `${origin.lat},${origin.lon}`,
      time_limit: String(timeMinutes * 60),
      profile: PROFILE[mode],
    })

    const res = await fetch(`${this.baseUrl}/isochrone?${qs}`)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`GraphHopper isochrone error: ${res.status} — ${text}`)
    }

    const data = (await res.json()) as { polygons: Array<{ geometry: GeoJSONPolygon }> }
    if (!data.polygons?.length) throw new Error('GraphHopper returned no polygons')

    return { origin, mode, timeMinutes, polygon: data.polygons[0].geometry }
  }

  async computeRouteMatrix(
    origins: LatLon[],
    destinations: LatLon[],
    mode: TransportMode
  ): Promise<RouteMatrix> {
    const body = {
      from_points: origins.map((c) => [c.lon, c.lat]),
      to_points: destinations.map((c) => [c.lon, c.lat]),
      profile: PROFILE[mode],
      out_arrays: ['times', 'distances'],
    }

    const qs = this.params({})
    const url = qs ? `${this.baseUrl}/matrix?${qs}` : `${this.baseUrl}/matrix`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`GraphHopper matrix error: ${res.status} — ${text}`)
    }

    // GraphHopper returns times in seconds, distances in metres
    const data = (await res.json()) as { times: number[][]; distances: number[][] }
    const entries: MatrixEntry[] = []

    for (let oi = 0; oi < origins.length; oi++) {
      for (let di = 0; di < destinations.length; di++) {
        entries.push({
          originIndex: oi,
          destinationIndex: di,
          durationMinutes: data.times[oi][di] < 0 ? -1 : data.times[oi][di] / 60,
          // GraphHopper returns distances in metres
          distanceKm: data.distances[oi][di] < 0 ? -1 : data.distances[oi][di] / 1000,
        })
      }
    }

    return { origins, destinations, entries }
  }

  async computeRoute(): Promise<RouteGeometry> {
    throw new Error('computeRoute is not yet implemented for GraphHopper')
  }
}
