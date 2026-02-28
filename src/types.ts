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

/** GeoJSON LineString geometry. */
export interface GeoJSONLineString {
  type: 'LineString'
  coordinates: number[][]
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

/**
 * Common Valhalla manoeuvre type values.
 * See https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/
 */
export const ManoeuvreType = {
  kNone: 0,
  kStart: 1,
  kStartRight: 2,
  kStartLeft: 3,
  kDestination: 4,
  kDestinationRight: 5,
  kDestinationLeft: 6,
  kStraight: 8,
  kSlightRight: 9,
  kRight: 10,
  kSharpRight: 11,
  kUturnRight: 12,
  kUturnLeft: 13,
  kSharpLeft: 14,
  kLeft: 15,
  kSlightLeft: 16,
  kRampStraight: 17,
  kRampRight: 18,
  kRampLeft: 19,
  kExitRight: 20,
  kExitLeft: 21,
  kStayStraight: 22,
  kStayRight: 23,
  kStayLeft: 24,
  kMerge: 25,
  kRoundaboutEnter: 26,
  kRoundaboutExit: 27,
  kFerryEnter: 28,
  kFerryExit: 29,
  kTransit: 30,
  kTransitTransfer: 31,
  kTransitRemainOn: 32,
  kTransitConnectionStart: 33,
  kTransitConnectionTransfer: 34,
  kTransitConnectionDestination: 35,
  kPostTransitConnectionDestination: 36,
  kMergeRight: 37,
  kMergeLeft: 38,
} as const

/** A single manoeuvre in a route. */
export interface RouteLeg {
  instruction: string
  distanceKm: number
  durationMinutes: number
  /** Valhalla manoeuvre type (0-38). See ManoeuvreType const. */
  type?: number
  /** Street names along this manoeuvre. */
  streetNames?: string[]
  /** Street names at the transition point (if different from streetNames). */
  beginStreetNames?: string[]
  /** Natural-language verbal instruction (more detailed than instruction). */
  verbalInstruction?: string
  /** Road is a toll road. */
  toll?: boolean
  /** Road is a motorway/highway. */
  highway?: boolean
  /** Manoeuvre involves a ferry. */
  ferry?: boolean
  /** Road surface is unpaved/rough. */
  rough?: boolean
  /** Manoeuvre passes through a gate. */
  gate?: boolean
  /** Compass bearing (degrees) entering the manoeuvre. */
  bearingBefore?: number
  /** Compass bearing (degrees) leaving the manoeuvre. */
  bearingAfter?: number
  /** Index into RouteGeometry.geometry.coordinates where this manoeuvre starts. */
  beginShapeIndex?: number
  /** Index into RouteGeometry.geometry.coordinates where this manoeuvre ends. */
  endShapeIndex?: number
}

/** Result of a single route computation. */
export interface RouteGeometry {
  origin: LatLon
  destination: LatLon
  mode: TransportMode
  durationMinutes: number
  distanceKm: number
  geometry: GeoJSONLineString
  legs?: RouteLeg[]
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

  /** Compute a route between two points, returning the polyline and optional turn-by-turn legs. */
  computeRoute(origin: LatLon, destination: LatLon, mode: TransportMode): Promise<RouteGeometry>
}
