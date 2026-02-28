import type {
  RoutingEngine, Isochrone, RouteMatrix, RouteGeometry, MatrixEntry,
  TransportMode, LatLon, GeoJSONPolygon, RouteLeg,
} from '../types.js'

/**
 * Error thrown by ValhallaEngine when the server returns a non-200 response.
 * Includes the HTTP status code and response body for error handling
 * (e.g. detecting 402 Payment Required for L402 flows).
 */
export class ValhallaError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message)
    this.name = 'ValhallaError'
  }
}

/** Decode a polyline encoded with precision 6 (Valhalla default) into [lon, lat] pairs. */
function decodePolyline6(encoded: string): number[][] {
  const coordinates: number[][] = []
  let index = 0
  let lat = 0
  let lon = 0
  const factor = 1e6

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lon += (result & 1) ? ~(result >> 1) : (result >> 1)

    coordinates.push([lon / factor, lat / factor])
  }

  return coordinates
}

const COSTING: Record<TransportMode, string> = {
  drive: 'auto',
  cycle: 'bicycle',
  walk: 'pedestrian',
  public_transit: 'multimodal',
}

/**
 * Valhalla routing engine adapter.
 *
 * Requires a self-hosted Valhalla instance — no API key needed.
 * Supports isochrone computation and route matrices.
 *
 * @example
 * ```typescript
 * const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })
 * ```
 */
export class ValhallaEngine implements RoutingEngine {
  readonly name = 'Valhalla'
  private readonly baseUrl: string
  private readonly extraHeaders: Record<string, string>

  constructor(config: { baseUrl: string; headers?: Record<string, string> }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.extraHeaders = config.headers ?? {}
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
      headers: { 'Content-Type': 'application/json', ...this.extraHeaders },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ValhallaError(`Valhalla isochrone error: ${res.status} ${res.statusText} — ${text}`, res.status, text)
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
      headers: { 'Content-Type': 'application/json', ...this.extraHeaders },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ValhallaError(`Valhalla matrix error: ${res.status} ${res.statusText} — ${text}`, res.status, text)
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
          // Valhalla returns distance in km (unlike ORS which returns metres)
          distanceKm: cell.distance < 0 ? -1 : cell.distance,
        })
      }
    }

    return { origins, destinations, entries }
  }

  async computeRoute(
    origin: LatLon,
    destination: LatLon,
    mode: TransportMode
  ): Promise<RouteGeometry> {
    const body = {
      locations: [
        { lat: origin.lat, lon: origin.lon },
        { lat: destination.lat, lon: destination.lon },
      ],
      costing: COSTING[mode],
      directions_type: 'maneuvers',
    }

    const res = await fetch(`${this.baseUrl}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.extraHeaders },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ValhallaError(`Valhalla route error: ${res.status} ${res.statusText} — ${text}`, res.status, text)
    }

    const data = (await res.json()) as {
      trip: {
        summary: { time: number; length: number }
        legs: Array<{
          shape: string
          maneuvers: Array<{
            instruction: string
            length: number
            time: number
            type?: number
            street_names?: string[]
            begin_street_names?: string[]
            verbal_pre_transition_instruction?: string
            toll?: boolean
            highway?: boolean
            ferry?: boolean
            rough?: boolean
            gate?: boolean
            bearing_before?: number
            bearing_after?: number
            begin_shape_index?: number
            end_shape_index?: number
          }>
        }>
      }
    }

    const tripLeg = data.trip.legs[0]
    const coordinates = decodePolyline6(tripLeg.shape)

    const legs: RouteLeg[] = tripLeg.maneuvers.map((m) => ({
      instruction: m.instruction,
      distanceKm: m.length,
      durationMinutes: m.time / 60,
      type: m.type,
      streetNames: m.street_names?.length ? m.street_names : undefined,
      beginStreetNames: m.begin_street_names?.length ? m.begin_street_names : undefined,
      verbalInstruction: m.verbal_pre_transition_instruction || undefined,
      toll: m.toll || undefined,
      highway: m.highway || undefined,
      ferry: m.ferry || undefined,
      rough: m.rough || undefined,
      gate: m.gate || undefined,
      bearingBefore: m.bearing_before,
      bearingAfter: m.bearing_after,
      beginShapeIndex: m.begin_shape_index,
      endShapeIndex: m.end_shape_index,
    }))

    return {
      origin,
      destination,
      mode,
      durationMinutes: data.trip.summary.time / 60,
      distanceKm: data.trip.summary.length,
      geometry: {
        type: 'LineString',
        coordinates,
      },
      legs,
    }
  }
}
