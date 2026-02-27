import { writeFileSync, mkdirSync } from 'node:fs'
import { intersectPolygons } from '../src/geo.js'
import type { GeoJSONPolygon } from '../src/types.js'

// --- Types ---

interface Participant {
  lat: number
  lon: number
  label: string
}

interface Venue {
  name: string
  lat: number
  lon: number
  venueType: string
  travelTimes: Record<string, number>
}

interface Scenario {
  name: string
  description: string
  participants: Participant[]
  mode: string
  maxTimeMinutes: number
  venueTypes: string[]
  isochrones: GeoJSONPolygon[]
  intersection: GeoJSONPolygon
  venues: Venue[]
}

// --- Helpers ---

/** Generate an approximate isochrone polygon as an irregular circle. */
function generateIsochrone(
  lat: number,
  lon: number,
  radiusKm: number,
  points = 20,
  seed = 0,
): GeoJSONPolygon {
  const ring: number[][] = []
  for (let i = 0; i < points; i++) {
    const angle = (2 * Math.PI * i) / points
    // Deterministic jitter: 0.7–1.3× radius
    const jitter = 0.7 + 0.6 * Math.abs(Math.sin(seed * 13.37 + i * 7.91))
    const r = radiusKm * jitter
    const dLat = (r / 111.32) * Math.cos(angle)
    const dLon = (r / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle)
    ring.push([
      Math.round((lon + dLon) * 1e6) / 1e6,
      Math.round((lat + dLat) * 1e6) / 1e6,
    ])
  }
  ring.reverse() // ensure CCW winding (required by intersectPolygons / Sutherland-Hodgman)
  ring.push(ring[0]) // close
  return { type: 'Polygon', coordinates: [ring] }
}

/** Haversine distance in km. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Estimate travel time in minutes from straight-line distance and mode. */
function estimateTime(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  mode: string,
): number {
  const distKm = haversineKm(fromLat, fromLon, toLat, toLon)
  const speeds: Record<string, number> = {
    drive: 30,
    cycle: 15,
    walk: 4.5,
    public_transit: 20,
  }
  const detours: Record<string, number> = {
    drive: 1.4,
    cycle: 1.3,
    walk: 1.2,
    public_transit: 1.5,
  }
  const speed = speeds[mode] ?? 30
  const detour = detours[mode] ?? 1.4
  return Math.round((distKm * detour / speed) * 60 * 10) / 10
}

function buildVenues(
  raw: Array<{ name: string; lat: number; lon: number; venueType: string }>,
  participants: Participant[],
  mode: string,
): Venue[] {
  return raw.map(v => ({
    ...v,
    travelTimes: Object.fromEntries(
      participants.map(p => [p.label, estimateTime(p.lat, p.lon, v.lat, v.lon, mode)]),
    ),
  }))
}

// --- Bristol Meetup (drive, 15 min) ---

function buildBristol(): Scenario {
  const participants: Participant[] = [
    { lat: 51.4560, lon: -2.6260, label: 'Alice' },
    { lat: 51.4380, lon: -2.5970, label: 'Bob' },
    { lat: 51.4610, lon: -2.5880, label: 'Carol' },
  ]
  const mode = 'drive'
  const radiusKm = 5
  const isochrones = participants.map((p, i) =>
    generateIsochrone(p.lat, p.lon, radiusKm, 20, i + 1),
  )
  const intersection = intersectPolygons(isochrones)
  if (!intersection) throw new Error('Bristol isochrones do not intersect')

  const venues = buildVenues([
    { name: 'The Canteen', lat: 51.4505, lon: -2.5965, venueType: 'cafe' },
    { name: 'Small Bar', lat: 51.4545, lon: -2.5934, venueType: 'pub' },
    { name: "St Nick's Market", lat: 51.4535, lon: -2.5952, venueType: 'cafe' },
    { name: 'Arnolfini', lat: 51.4489, lon: -2.5977, venueType: 'cafe' },
  ], participants, mode)

  return {
    name: 'Bristol Meetup',
    description: '3 friends meeting for coffee in central Bristol',
    participants,
    mode,
    maxTimeMinutes: 15,
    venueTypes: ['cafe', 'pub'],
    isochrones,
    intersection,
    venues,
  }
}

// --- London Spread (public_transit, 30 min) ---

function buildLondon(): Scenario {
  const participants: Participant[] = [
    { lat: 51.4613, lon: -0.1156, label: 'Alice' },
    { lat: 51.5392, lon: -0.1426, label: 'Bob' },
    { lat: 51.4769, lon: -0.0005, label: 'Carol' },
  ]
  const mode = 'public_transit'
  const radiusKm = 12
  const isochrones = participants.map((p, i) =>
    generateIsochrone(p.lat, p.lon, radiusKm, 20, i + 10),
  )
  const intersection = intersectPolygons(isochrones)
  if (!intersection) throw new Error('London isochrones do not intersect')

  const venues = buildVenues([
    { name: 'Borough Market', lat: 51.5055, lon: -0.0910, venueType: 'cafe' },
    { name: 'Tate Modern', lat: 51.5076, lon: -0.0994, venueType: 'cafe' },
    { name: 'The George Inn', lat: 51.5044, lon: -0.0890, venueType: 'pub' },
    { name: 'Flat Iron Square', lat: 51.5030, lon: -0.0965, venueType: 'restaurant' },
  ], participants, mode)

  return {
    name: 'London Spread',
    description: '3 people from Brixton, Camden, and Greenwich meeting via public transit',
    participants,
    mode,
    maxTimeMinutes: 35,
    venueTypes: ['cafe', 'pub', 'restaurant'],
    isochrones,
    intersection,
    venues,
  }
}

// --- Edinburgh Walk (walk, 20 min) ---

function buildEdinburgh(): Scenario {
  const participants: Participant[] = [
    { lat: 55.9620, lon: -3.1950, label: 'Alice' },
    { lat: 55.9595, lon: -3.2117, label: 'Bob' },
  ]
  const mode = 'walk'
  const radiusKm = 1.5
  const isochrones = participants.map((p, i) =>
    generateIsochrone(p.lat, p.lon, radiusKm, 20, i + 20),
  )
  const intersection = intersectPolygons(isochrones)
  if (!intersection) throw new Error('Edinburgh isochrones do not intersect')

  const venues = buildVenues([
    { name: 'Royal Botanic Garden', lat: 55.9652, lon: -3.2082, venueType: 'park' },
    { name: 'Inverleith Park', lat: 55.9668, lon: -3.2108, venueType: 'park' },
    { name: 'The Botanist', lat: 55.9581, lon: -3.2000, venueType: 'pub' },
  ], participants, mode)

  return {
    name: 'Edinburgh Walk',
    description: '2 friends walking to meet between Leith and Stockbridge',
    participants,
    mode,
    maxTimeMinutes: 20,
    venueTypes: ['park', 'pub'],
    isochrones,
    intersection,
    venues,
  }
}

// --- East Midlands Drive (drive, 45 min) ---

function buildEastMidlands(): Scenario {
  const participants: Participant[] = [
    { lat: 52.9225, lon: -1.4746, label: 'Alice' },   // Derby
    { lat: 52.9548, lon: -1.1581, label: 'Bob' },     // Nottingham
    { lat: 52.6369, lon: -1.1398, label: 'Carol' },   // Leicester
  ]
  const mode = 'drive'
  const radiusKm = 35
  const isochrones = participants.map((p, i) =>
    generateIsochrone(p.lat, p.lon, radiusKm, 20, i + 30),
  )
  const intersection = intersectPolygons(isochrones)
  if (!intersection) throw new Error('East Midlands isochrones do not intersect')

  const venues = buildVenues([
    { name: 'Donington Park', lat: 52.8310, lon: -1.3750, venueType: 'park' },
    { name: 'Kegworth Village Cafe', lat: 52.8340, lon: -1.2680, venueType: 'cafe' },
    { name: 'Loughborough Market', lat: 52.7720, lon: -1.2060, venueType: 'cafe' },
    { name: 'East Midlands Gateway', lat: 52.8550, lon: -1.3100, venueType: 'restaurant' },
  ], participants, mode)

  return {
    name: 'East Midlands Drive',
    description: '3 friends from Derby, Nottingham, and Leicester meeting midway',
    participants,
    mode,
    maxTimeMinutes: 60,
    venueTypes: ['cafe', 'restaurant', 'park'],
    isochrones,
    intersection,
    venues,
  }
}

// --- Generate and write ---

mkdirSync('docs/scenarios', { recursive: true })

const scenarios = {
  bristol: buildBristol(),
  london: buildLondon(),
  edinburgh: buildEdinburgh(),
  'east-midlands': buildEastMidlands(),
}

for (const [name, scenario] of Object.entries(scenarios)) {
  const path = `docs/scenarios/${name}.json`
  writeFileSync(path, JSON.stringify(scenario, null, 2) + '\n')
  console.log(`Wrote ${path} (${JSON.stringify(scenario).length} bytes)`)
}

console.log('Done — 4 scenarios generated')
