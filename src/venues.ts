import type { GeoJSONPolygon, Venue, VenueType } from './types.js'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

/** Map VenueType to Overpass tag queries. */
const VENUE_TAG_MAP: Record<string, string> = {
  park: 'leisure=park',
  cafe: 'amenity=cafe',
  restaurant: 'amenity=restaurant',
  service_station: 'amenity=fuel',
  library: 'amenity=library',
  pub: 'amenity=pub',
  playground: 'leisure=playground',
  community_centre: 'amenity=community_centre',
}

function polygonBBox(polygon: GeoJSONPolygon): { south: number; west: number; north: number; east: number } {
  const coords = polygon.coordinates[0]
  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity
  for (const [lon, lat] of coords) {
    if (lat < south) south = lat
    if (lat > north) north = lat
    if (lon < west) west = lon
    if (lon > east) east = lon
  }
  return { south, west, north, east }
}

/**
 * Search for venues within a polygon using the Overpass API.
 * Uses the bounding box of the polygon for the query.
 */
export async function searchVenues(
  polygon: GeoJSONPolygon,
  venueTypes: VenueType[],
  overpassUrl?: string,
): Promise<Venue[]> {
  const bbox = polygonBBox(polygon)
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`

  const tagQueries = venueTypes
    .map(vt => VENUE_TAG_MAP[vt] ?? `amenity=${vt}`)
    .map(tag => {
      const [key, value] = tag.split('=')
      return `node["${key}"="${value}"]["name"](${bboxStr});`
    })
    .join('\n')

  const query = `[out:json][timeout:25];(\n${tagQueries}\n);out body;`

  const response = await fetch(overpassUrl ?? OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Overpass API error ${response.status}: ${text}`)
  }

  const data = await response.json() as {
    elements: Array<{
      type: string
      id: number
      lat: number
      lon: number
      tags: Record<string, string>
    }>
  }

  return data.elements
    .filter(el => el.tags?.name)
    .map(el => ({
      name: el.tags.name,
      lat: el.lat,
      lon: el.lon,
      venueType: inferVenueType(el.tags, venueTypes),
      osmId: `${el.type}/${el.id}`,
    }))
}

function inferVenueType(tags: Record<string, string>, requested: VenueType[]): VenueType {
  for (const vt of requested) {
    const mapping = VENUE_TAG_MAP[vt]
    if (mapping) {
      const [key, value] = mapping.split('=')
      if (tags[key] === value) return vt
    }
  }
  return requested[0] ?? 'unknown'
}
