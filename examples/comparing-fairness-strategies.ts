/**
 * Compare fairness strategies — see how min_max, min_total, and min_variance
 * produce different rankings for the same participants and venues.
 *
 * Prerequisites:
 *   npm install rendezvous-kit
 *   A running Valhalla instance (or swap engine)
 *
 * Run:
 *   npx tsx examples/comparing-fairness-strategies.ts
 */
import { findRendezvous } from 'rendezvous-kit'
import { ValhallaEngine } from 'rendezvous-kit/engines/valhalla'
import type { FairnessStrategy } from 'rendezvous-kit'

const engine = new ValhallaEngine({ baseUrl: 'http://localhost:8002' })

const participants = [
  { lat: 51.5074, lon: -0.1278, label: 'Alice' },   // London
  { lat: 51.4545, lon: -2.5879, label: 'Bob' },      // Bristol
  { lat: 52.4862, lon: -1.8904, label: 'Carol' },    // Birmingham
]

const strategies: FairnessStrategy[] = ['min_max', 'min_total', 'min_variance']

for (const fairness of strategies) {
  console.log(`\n=== Strategy: ${fairness} ===\n`)

  const suggestions = await findRendezvous(engine, {
    participants,
    mode: 'drive',
    maxTimeMinutes: 90,
    venueTypes: ['cafe', 'pub'],
    fairness,
    limit: 3,
  })

  if (suggestions.length === 0) {
    console.log('No results — try increasing maxTimeMinutes.')
    continue
  }

  for (const s of suggestions) {
    const times = Object.entries(s.travelTimes)
      .map(([who, mins]) => `${who}: ${mins} min`)
      .join(', ')
    console.log(`  ${s.venue.name} — score: ${s.fairnessScore.toFixed(1)}, ${times}`)
  }
}
