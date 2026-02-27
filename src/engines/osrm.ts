import type {
  RoutingEngine, Isochrone, RouteMatrix, MatrixEntry,
  TransportMode, LatLon,
} from '../types.js'

const PROFILE: Record<TransportMode, string> = {
  drive: 'car',
  cycle: 'bike',
  walk: 'foot',
  public_transit: 'car',
}

export class OsrmEngine implements RoutingEngine {
  readonly name = 'OSRM'
  private readonly baseUrl: string

  constructor(config: { baseUrl: string }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
  }

  computeIsochrone(): Promise<Isochrone> {
    throw new Error(
      'OSRM does not support isochrone computation. Use Valhalla, ORS, or GraphHopper instead.'
    )
  }

  async computeRouteMatrix(
    origins: LatLon[],
    destinations: LatLon[],
    mode: TransportMode
  ): Promise<RouteMatrix> {
    const profile = PROFILE[mode]
    const allCoords = [...origins, ...destinations]
      .map((c) => `${c.lon},${c.lat}`)
      .join(';')
    const sources = origins.map((_, i) => i).join(';')
    const dests = destinations.map((_, i) => origins.length + i).join(';')

    const res = await fetch(
      `${this.baseUrl}/table/v1/${profile}/${allCoords}?sources=${sources}&destinations=${dests}&annotations=duration,distance`
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`OSRM matrix error: ${res.status} — ${text}`)
    }

    // OSRM returns durations in seconds, distances in metres
    const data = (await res.json()) as {
      durations: (number | null)[][]
      distances: (number | null)[][]
    }

    const entries: MatrixEntry[] = []
    for (let oi = 0; oi < origins.length; oi++) {
      for (let di = 0; di < destinations.length; di++) {
        const dur = data.durations[oi][di]
        const dist = data.distances[oi][di]
        entries.push({
          originIndex: oi,
          destinationIndex: di,
          // OSRM returns seconds; convert to minutes
          durationMinutes: dur == null || dur < 0 ? -1 : dur / 60,
          // OSRM returns metres; convert to km
          distanceKm: dist == null || dist < 0 ? -1 : dist / 1000,
        })
      }
    }

    return { origins, destinations, entries }
  }
}
