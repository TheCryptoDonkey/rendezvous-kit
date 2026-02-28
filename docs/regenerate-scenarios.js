#!/usr/bin/env node

// regenerate-scenarios.js — regenerate scenario JSON files using live Valhalla routing data
//
// Usage:
//   node docs/regenerate-scenarios.js
//
// Environment variables:
//   VALHALLA_URL   — Valhalla server URL (default: https://routing.trotters.cc)
//   L402_TOKEN     — L402 auth token as "macaroon:preimage" (optional)
//   SCENARIO       — regenerate only one scenario by filename, e.g. "bristol" (optional)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Import from local build — NOT from npm
const { ValhallaEngine, intersectPolygonsAll, searchVenues } = await import(
  join(__dirname, '..', 'dist', 'index.js')
)

// --- Configuration ---

const VALHALLA_URL = process.env.VALHALLA_URL || 'https://routing.trotters.cc'
const L402_TOKEN = process.env.L402_TOKEN || ''
const SCENARIO_FILTER = process.env.SCENARIO || ''

const RATE_LIMIT_MS = 500

// --- Helpers ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function createEngine() {
  const headers = {}
  if (L402_TOKEN) {
    const sepIdx = L402_TOKEN.indexOf(':')
    if (sepIdx === -1) {
      console.warn('Warning: L402_TOKEN should be "macaroon:preimage" — ignoring malformed value')
    } else {
      const macaroon = L402_TOKEN.slice(0, sepIdx)
      const preimage = L402_TOKEN.slice(sepIdx + 1)
      headers['Authorization'] = `L402 ${macaroon}:${preimage}`
    }
  }
  return new ValhallaEngine({ baseUrl: VALHALLA_URL, headers })
}

function computeFairness(times, strategy) {
  switch (strategy) {
    case 'min_max':
      return Math.max(...times)
    case 'min_total':
      return times.reduce((a, b) => a + b, 0)
    case 'min_variance': {
      const mean = times.reduce((a, b) => a + b, 0) / times.length
      return Math.sqrt(times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length)
    }
    default:
      return Math.max(...times)
  }
}

function envelopePolygon(polygons) {
  if (polygons.length === 1) return polygons[0]

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  for (const p of polygons) {
    for (const ring of p.coordinates) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon
        if (lat < minLat) minLat = lat
        if (lon > maxLon) maxLon = lon
        if (lat > maxLat) maxLat = lat
      }
    }
  }

  return {
    type: 'Polygon',
    coordinates: [[
      [minLon, minLat],
      [maxLon, minLat],
      [maxLon, maxLat],
      [minLon, maxLat],
      [minLon, minLat],
    ]],
  }
}

// --- Main regeneration logic ---

async function regenerateScenario(engine, filePath) {
  const name = basename(filePath, '.json')
  const raw = readFileSync(filePath, 'utf-8')
  const scenario = JSON.parse(raw)

  console.log(`\n=== ${scenario.name} (${name}.json) ===`)
  console.log(`  Participants: ${scenario.participants.map(p => p.label).join(', ')}`)
  console.log(`  Mode: ${scenario.mode}, Time budget: ${scenario.maxTimeMinutes} min`)
  console.log(`  Venue types: ${scenario.venueTypes.join(', ')}`)

  // Step 1: Compute isochrones for each participant
  console.log('  [1/6] Computing isochrones...')
  const isochrones = []
  for (let i = 0; i < scenario.participants.length; i++) {
    const p = scenario.participants[i]
    console.log(`    ${p.label} (${p.lat}, ${p.lon})...`)
    try {
      const iso = await engine.computeIsochrone(
        { lat: p.lat, lon: p.lon },
        scenario.mode,
        scenario.maxTimeMinutes,
      )
      isochrones.push(iso.polygon)
    } catch (err) {
      if (err.status === 402) {
        console.error('\n  ERROR: 402 Payment Required')
        console.error('  Set L402_TOKEN=macaroon:preimage to authenticate requests.')
        console.error('  You can obtain a token by paying the Lightning invoice at the proxy.\n')
        process.exit(1)
      }
      throw err
    }
    await sleep(RATE_LIMIT_MS)
  }
  console.log(`    ${isochrones.length} isochrones computed`)

  // Step 2: Intersect polygons
  console.log('  [2/6] Intersecting polygons...')
  const intersection = intersectPolygonsAll(isochrones)
  if (intersection.length === 0) {
    console.warn('    WARNING: No intersection found — skipping scenario')
    return false
  }
  console.log(`    ${intersection.length} intersection polygon(s)`)

  // Step 3: Search venues within the intersection
  console.log('  [3/6] Searching venues...')
  const searchArea = envelopePolygon(intersection)
  const venues = await searchVenues(searchArea, scenario.venueTypes)
  await sleep(RATE_LIMIT_MS)

  if (venues.length === 0) {
    console.warn('    WARNING: No venues found — skipping scenario')
    return false
  }
  console.log(`    ${venues.length} venues found`)

  // Step 4: Compute route matrix for travel times
  console.log('  [4/6] Computing route matrix...')
  const origins = scenario.participants.map(p => ({ lat: p.lat, lon: p.lon, label: p.label }))
  const destinations = venues.map(v => ({ lat: v.lat, lon: v.lon }))
  const matrix = await engine.computeRouteMatrix(origins, destinations, scenario.mode)
  await sleep(RATE_LIMIT_MS)

  // Step 5: Score venues by min_max fairness and pick top results
  console.log('  [5/6] Scoring venues...')
  const scoredVenues = venues.map((v, vi) => {
    const travelTimes = {}
    const times = []
    let reachable = true

    for (let oi = 0; oi < origins.length; oi++) {
      const entry = matrix.entries.find(e => e.originIndex === oi && e.destinationIndex === vi)
      const minutes = entry ? Math.round(entry.durationMinutes * 10) / 10 : -1
      if (minutes < 0) {
        reachable = false
        break
      }
      travelTimes[origins[oi].label] = minutes
      times.push(minutes)
    }

    if (!reachable) return null

    const score = computeFairness(times, 'min_max')
    return {
      name: v.name,
      lat: v.lat,
      lon: v.lon,
      venueType: v.venueType,
      travelTimes,
      _score: score,
    }
  }).filter(Boolean)

  scoredVenues.sort((a, b) => a._score - b._score)
  const topVenues = scoredVenues.slice(0, 8) // Keep up to 8 venues

  console.log(`    ${scoredVenues.length} reachable venues, keeping top ${topVenues.length}`)

  // Step 6: Compute routes from each participant to the top venue (for route geometries)
  console.log('  [6/6] Computing routes to top venue...')
  const routes = {}

  if (topVenues.length > 0) {
    const bestVenue = topVenues[0]
    const venueRoutes = []

    for (let i = 0; i < scenario.participants.length; i++) {
      const p = scenario.participants[i]
      console.log(`    Route: ${p.label} → ${bestVenue.name}...`)
      try {
        const route = await engine.computeRoute(
          { lat: p.lat, lon: p.lon },
          { lat: bestVenue.lat, lon: bestVenue.lon },
          scenario.mode,
        )
        venueRoutes.push({
          geometry: route.geometry,
          durationMinutes: Math.round(route.durationMinutes * 10) / 10,
          distanceKm: Math.round(route.distanceKm * 10) / 10,
          legs: route.legs?.map(leg => ({
            instruction: leg.instruction,
            distanceKm: Math.round(leg.distanceKm * 1000) / 1000,
            durationMinutes: Math.round(leg.durationMinutes * 10) / 10,
          })) ?? [],
        })
      } catch (err) {
        if (err.status === 402) {
          console.error('\n  ERROR: 402 Payment Required')
          console.error('  Set L402_TOKEN=macaroon:preimage to authenticate requests.')
          process.exit(1)
        }
        console.warn(`    WARNING: Route computation failed for ${p.label}: ${err.message}`)
        venueRoutes.push(null)
      }
      await sleep(RATE_LIMIT_MS)
    }

    routes[bestVenue.name] = venueRoutes
  }

  // Remove internal _score field from output
  const outputVenues = topVenues.map(({ _score, ...rest }) => rest)

  // Build updated scenario JSON, preserving metadata
  const updated = {
    name: scenario.name,
    description: scenario.description,
    participants: scenario.participants,
    mode: scenario.mode,
    maxTimeMinutes: scenario.maxTimeMinutes,
    venueTypes: scenario.venueTypes,
    isochrones,
    intersection,
    venues: outputVenues,
    routes,
  }

  writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n')
  console.log(`  Written: ${filePath}`)
  return true
}

// --- Entry point ---

async function main() {
  console.log('rendezvous-kit scenario regenerator')
  console.log(`Valhalla URL: ${VALHALLA_URL}`)
  console.log(`L402 auth: ${L402_TOKEN ? 'yes' : 'no'}`)

  const engine = createEngine()

  const scenarioDir = join(__dirname, 'scenarios')
  let files = readdirSync(scenarioDir)
    .filter(f => f.endsWith('.json'))
    .sort()

  if (SCENARIO_FILTER) {
    const target = SCENARIO_FILTER.replace(/\.json$/, '') + '.json'
    files = files.filter(f => f === target)
    if (files.length === 0) {
      console.error(`No scenario file matching "${SCENARIO_FILTER}" found in ${scenarioDir}`)
      process.exit(1)
    }
  }

  console.log(`\nScenarios to regenerate: ${files.map(f => f.replace('.json', '')).join(', ')}`)

  let succeeded = 0
  let failed = 0

  for (const file of files) {
    const filePath = join(scenarioDir, file)
    try {
      const ok = await regenerateScenario(engine, filePath)
      if (ok) succeeded++
      else failed++
    } catch (err) {
      console.error(`\n  ERROR processing ${file}: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone: ${succeeded} succeeded, ${failed} failed`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
