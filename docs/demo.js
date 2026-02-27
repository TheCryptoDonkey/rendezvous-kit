// demo.js — rendezvous-kit interactive demo
// Uses global maplibregl from CDN script tag

const COLOURS = ['#ff44ff', '#00e5ff', '#00ff88', '#ffaa00', '#aa55ff']
const INTERSECTION_COLOUR = '#ffd700'

let map
let currentScenario = null
let currentFairness = 'min_max'
let markers = []
let venueMarkers = [] // { marker, venue } — kept separate for rank updates
let animationId = 0 // incremented on each load to cancel stale animations

// --- Helpers ---

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// --- Fairness scoring (mirrors rendezvous.ts logic) ---

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

// --- Initialisation ---

function init() {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [-2.59, 51.45],
    zoom: 12,
  })

  map.on('load', () => loadScenario('bristol'))

  // Scenario picker
  document.getElementById('scenario-picker').addEventListener('change', (e) => {
    loadScenario(e.target.value)
  })

  // Fairness strategy picker
  document.getElementById('fairness-picker').addEventListener('change', (e) => {
    currentFairness = e.target.value
    if (currentScenario) {
      displayResults()
      updateCodePanel(currentScenario)
    }
  })

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      const overlay = document.getElementById('interactive-overlay')
      if (tab.dataset.tab === 'interactive') {
        overlay.classList.remove('hidden')
      } else {
        overlay.classList.add('hidden')
      }
    })
  })
}

// --- Scenario loading ---

async function loadScenario(name) {
  const thisAnimation = ++animationId

  const res = await fetch(`scenarios/${name}.json`)
  if (!res.ok) {
    document.getElementById('results-list').innerHTML =
      `<div class="result-card"><div class="result-info">Failed to load scenario: ${name}</div></div>`
    return
  }
  currentScenario = await res.json()

  // Update transport mode display
  const modeIcons = { drive: '🚗', cycle: '🚲', walk: '🚶', public_transit: '🚌' }
  document.getElementById('mode-display').textContent =
    modeIcons[currentScenario.mode] ?? currentScenario.mode

  // Reset and animate
  resetPipeline()
  clearMap()
  await animatePipeline(thisAnimation)
}

// --- Map layer management ---

function clearMap() {
  // Remove markers
  markers.forEach(m => m.remove())
  markers = []
  venueMarkers.forEach(vm => vm.marker.remove())
  venueMarkers = []

  // Remove demo layers and sources
  const style = map.getStyle()
  if (!style) return

  style.layers
    .filter(l => l.id.startsWith('demo-'))
    .forEach(l => map.removeLayer(l.id))

  Object.keys(style.sources)
    .filter(s => s.startsWith('demo-'))
    .forEach(s => map.removeSource(s))
}

function addIsochrone(index, polygon) {
  const id = `demo-iso-${index}`
  const colour = COLOURS[index % COLOURS.length]

  map.addSource(id, {
    type: 'geojson',
    data: { type: 'Feature', geometry: polygon, properties: {} },
  })

  map.addLayer({
    id: `${id}-fill`,
    type: 'fill',
    source: id,
    paint: { 'fill-color': colour, 'fill-opacity': 0.12 },
  })

  map.addLayer({
    id: `${id}-line`,
    type: 'line',
    source: id,
    paint: { 'line-color': colour, 'line-width': 2, 'line-opacity': 0.8 },
  })
}

function addIntersection(polygon) {
  const id = 'demo-intersection'

  map.addSource(id, {
    type: 'geojson',
    data: { type: 'Feature', geometry: polygon, properties: {} },
  })

  map.addLayer({
    id: `${id}-fill`,
    type: 'fill',
    source: id,
    paint: { 'fill-color': INTERSECTION_COLOUR, 'fill-opacity': 0.2 },
  })

  map.addLayer({
    id: `${id}-line`,
    type: 'line',
    source: id,
    paint: {
      'line-color': INTERSECTION_COLOUR,
      'line-width': 3,
      'line-opacity': 0.9,
      'line-dasharray': [2, 1],
    },
  })
}

function addParticipantMarkers(participants) {
  participants.forEach((p, i) => {
    const colour = COLOURS[i % COLOURS.length]
    const el = document.createElement('div')
    el.className = 'marker-participant'
    el.style.background = colour
    el.style.boxShadow = `0 0 8px ${colour}`
    el.title = p.label

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([p.lon, p.lat])
      .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(`<b>${esc(p.label)}</b>`))
      .addTo(map)

    markers.push(marker)
  })
}

function addVenueMarkers(venues) {
  venues.forEach(v => {
    const el = document.createElement('div')
    el.className = 'marker-venue'
    el.title = v.name

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([v.lon, v.lat])
      .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(
        `<b>${esc(v.name)}</b><br><small>${esc(v.venueType)}</small>`,
      ))
      .addTo(map)

    venueMarkers.push({ marker, venue: v })
  })
}

function updateVenueRanks() {
  const scored = currentScenario.venues
    .map(v => ({
      name: v.name,
      score: computeFairness(Object.values(v.travelTimes), currentFairness),
    }))
    .sort((a, b) => a.score - b.score)

  const rankByName = new Map(scored.map((v, i) => [v.name, i + 1]))

  for (const { marker, venue } of venueMarkers) {
    const rank = rankByName.get(venue.name) ?? 99
    const el = marker.getElement()
    el.dataset.rank = String(rank)
    el.textContent = String(rank)
  }
}

// --- Pipeline animation ---

function resetPipeline() {
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('done')
    step.querySelector('.step-icon').textContent = '○'
    const count = step.querySelector('.step-count')
    if (count) count.textContent = ''
  })
  document.getElementById('results-list').innerHTML = ''
}

function markStep(name, count, total) {
  const step = document.getElementById(`step-${name}`)
  step.classList.add('done')
  step.querySelector('.step-icon').textContent = '✓'
  const countEl = step.querySelector('.step-count')
  if (countEl && count != null) {
    countEl.textContent = total ? `(${count}/${total})` : `(${count})`
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function animatePipeline(expectedId) {
  const s = currentScenario

  // Show participant markers first
  addParticipantMarkers(s.participants)
  await delay(300)
  if (animationId !== expectedId) return

  // Isochrones — staggered
  for (let i = 0; i < s.isochrones.length; i++) {
    addIsochrone(i, s.isochrones[i])
    markStep('isochrones', i + 1, s.isochrones.length)
    await delay(250)
    if (animationId !== expectedId) return
  }
  await delay(300)
  if (animationId !== expectedId) return

  // Intersection
  addIntersection(s.intersection)
  markStep('intersection')
  await delay(300)
  if (animationId !== expectedId) return

  // Venues
  addVenueMarkers(s.venues)
  markStep('venues', s.venues.length)
  await delay(300)
  if (animationId !== expectedId) return

  // Score and display results
  displayResults()
  markStep('scored')

  // Fit map to show everything
  fitToScenario(s)

  // Update code panel
  updateCodePanel(s)
}

// --- Results panel ---

function displayResults() {
  const s = currentScenario
  const scored = s.venues
    .map(v => ({
      ...v,
      score: computeFairness(Object.values(v.travelTimes), currentFairness),
    }))
    .sort((a, b) => a.score - b.score)

  const list = document.getElementById('results-list')
  list.innerHTML = scored.map((v, i) => `
    <div class="result-card">
      <div class="result-rank">${i + 1}</div>
      <div class="result-info">
        <div class="result-name">${esc(v.name)}</div>
        <div class="result-times">
          ${Object.entries(v.travelTimes).map(([name, t]) =>
            `<span>${esc(name)}: ${t}min</span>`
          ).join(' ')}
        </div>
        <div class="result-score">Score: ${v.score.toFixed(1)}</div>
      </div>
    </div>
  `).join('')

  updateVenueRanks()
}

// --- Fit map bounds ---

function fitToScenario(s) {
  const bounds = new maplibregl.LngLatBounds()
  s.participants.forEach(p => bounds.extend([p.lon, p.lat]))
  s.venues.forEach(v => bounds.extend([v.lon, v.lat]))

  // Also include isochrone extents for a good view
  for (const iso of s.isochrones) {
    for (const coord of iso.coordinates[0]) {
      bounds.extend(coord)
    }
  }

  map.fitBounds(bounds, { padding: 60, duration: 800 })
}

// --- Code panel ---

function updateCodePanel(s) {
  const participantLines = s.participants
    .map(p => `    { lat: ${p.lat}, lon: ${p.lon}, label: '${p.label}' },`)
    .join('\n')

  const code = `import { findRendezvous, ValhallaEngine } from 'rendezvous-kit'

const engine = new ValhallaEngine('https://valhalla.example.com')

const results = await findRendezvous(engine, {
  participants: [
${participantLines}
  ],
  mode: '${s.mode}',
  maxTimeMinutes: ${s.maxTimeMinutes},
  venueTypes: ${JSON.stringify(s.venueTypes)},
  fairness: '${currentFairness}',
})

console.log(results)
// → ${s.venues.length} ranked venue suggestions with travel times`

  document.getElementById('code-content').textContent = code
}

// --- Start ---

init()
