/**
 * Basic usage — find a fair meeting point for three people.
 *
 * Prerequisites:
 *   npm install rendezvous-kit
 *   A running Valhalla instance (or swap for OpenRouteServiceEngine with an API key)
 *
 * Run:
 *   npx tsx examples/basic-usage.ts
 */
import { findRendezvous } from 'rendezvous-kit'
import { ValhallaEngine } from 'rendezvous-kit/engines/valhalla'

const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })

const suggestions = await findRendezvous(engine, {
  participants: [
    { lat: 51.5074, lon: -0.1278, label: 'Alice' },   // London
    { lat: 51.4545, lon: -2.5879, label: 'Bob' },      // Bristol
    { lat: 52.4862, lon: -1.8904, label: 'Carol' },    // Birmingham
  ],
  mode: 'drive',
  maxTimeMinutes: 90,
  venueTypes: ['cafe', 'restaurant'],
  fairness: 'min_max',   // minimise the worst-case travel time
  limit: 5,
})

if (suggestions.length === 0) {
  console.log('No overlap — participants are too far apart for the given time budget.')
} else {
  for (const s of suggestions) {
    console.log(`${s.venue.name} (${s.venue.venueType})`)
    console.log(`  Fairness score: ${s.fairnessScore.toFixed(1)} min`)
    console.log('  Travel times:', s.travelTimes)
    console.log()
  }
}
