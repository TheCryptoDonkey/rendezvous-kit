/** Transport mode for routing calculations. */
export type TransportMode = 'drive' | 'cycle' | 'walk' | 'public_transit'

/** Fairness strategy for rendezvous scoring. */
export type FairnessStrategy = 'min_max' | 'min_total' | 'min_variance'

/** A point with coordinates and optional label. */
export interface LatLon {
  lat: number
  lon: number
  label?: string
}

/** GeoJSON Polygon geometry. */
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

/** Result of an isochrone computation. */
export interface Isochrone {
  origin: LatLon
  mode: TransportMode
  timeMinutes: number
  polygon: GeoJSONPolygon
}

/** A single cell in a route matrix. */
export interface MatrixEntry {
  originIndex: number
  destinationIndex: number
  durationMinutes: number
  distanceKm: number
}

/** Result of a route matrix computation. */
export interface RouteMatrix {
  origins: LatLon[]
  destinations: LatLon[]
  entries: MatrixEntry[]
}

/** Venue type for filtering. */
export type VenueType = 'park' | 'cafe' | 'restaurant' | 'service_station' | 'library' | 'pub' | 'playground' | 'community_centre' | string

/** A venue found within the rendezvous zone. */
export interface Venue {
  name: string
  lat: number
  lon: number
  venueType: VenueType
  osmId?: string
}

/** Options for rendezvous calculation. */
export interface RendezvousOptions {
  participants: LatLon[]
  mode: TransportMode
  maxTimeMinutes: number
  venueTypes: VenueType[]
  fairness?: FairnessStrategy
  limit?: number
}

/** A ranked rendezvous suggestion. */
export interface RendezvousSuggestion {
  venue: Venue
  travelTimes: Record<string, number>
  fairnessScore: number
}

/**
 * Engine-agnostic routing interface.
 * Implementations wrap specific routing APIs (Valhalla, OpenRouteService, etc.).
 */
export interface RoutingEngine {
  /** Human-readable engine name (e.g., "OpenRouteService", "Valhalla"). */
  readonly name: string

  /** Compute an isochrone polygon from an origin. */
  computeIsochrone(origin: LatLon, mode: TransportMode, timeMinutes: number): Promise<Isochrone>

  /** Compute a travel time/distance matrix between origins and destinations. */
  computeRouteMatrix(origins: LatLon[], destinations: LatLon[], mode: TransportMode): Promise<RouteMatrix>
}
