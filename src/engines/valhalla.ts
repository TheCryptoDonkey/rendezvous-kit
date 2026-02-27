import type {
  RoutingEngine, Isochrone, RouteMatrix, MatrixEntry,
  TransportMode, LatLon, GeoJSONPolygon,
} from '../types.js'

const COSTING: Record<TransportMode, string> = {
  drive: 'auto',
  cycle: 'bicycle',
  walk: 'pedestrian',
  public_transit: 'multimodal',
}

export class ValhallaEngine implements RoutingEngine {
  readonly name = 'Valhalla'
  private readonly baseUrl: string

  constructor(config: { baseUrl: string }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
  }

  async computeIsochrone(
    origin: LatLon,
    mode: TransportMode,
    timeMinutes: number
  ): Promise<Isochrone> {
    const body = {
      locations: [{ lat: origin.lat, lon: origin.lon }],
      costing: COSTING[mode],
      contours: [{ time: timeMinutes }],
      polygons: true,
    }

    const res = await fetch(`${this.baseUrl}/isochrone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Valhalla isochrone error: ${res.status} ${res.statusText} — ${text}`)
    }

    const data = (await res.json()) as {
      features: Array<{ geometry: GeoJSONPolygon }>
    }

    if (!data.features?.length) {
      throw new Error('Valhalla returned no isochrone features')
    }

    return {
      origin,
      mode,
      timeMinutes,
      polygon: data.features[0].geometry,
    }
  }

  async computeRouteMatrix(
    origins: LatLon[],
    destinations: LatLon[],
    mode: TransportMode
  ): Promise<RouteMatrix> {
    const body = {
      sources: origins.map((c) => ({ lat: c.lat, lon: c.lon })),
      targets: destinations.map((c) => ({ lat: c.lat, lon: c.lon })),
      costing: COSTING[mode],
    }

    const res = await fetch(`${this.baseUrl}/sources_to_targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Valhalla matrix error: ${res.status} ${res.statusText} — ${text}`)
    }

    const data = (await res.json()) as {
      sources_to_targets: Array<Array<{ time: number; distance: number }>>
    }

    const entries: MatrixEntry[] = []
    for (let oi = 0; oi < origins.length; oi++) {
      for (let di = 0; di < destinations.length; di++) {
        const cell = data.sources_to_targets[oi][di]
        entries.push({
          originIndex: oi,
          destinationIndex: di,
          durationMinutes: cell.time < 0 ? -1 : cell.time / 60,
          distanceKm: cell.distance < 0 ? -1 : cell.distance,
        })
      }
    }

    return { origins, destinations, entries }
  }
}
