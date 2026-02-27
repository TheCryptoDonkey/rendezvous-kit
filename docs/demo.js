// demo.js — rendezvous-kit interactive demo
// Uses global maplibregl from CDN script tag

const COLOURS = ['#ff44ff', '#00e5ff', '#00ff88', '#ffaa00', '#aa55ff']
const INTERSECTION_COLOUR = '#ffffff'

let map
let currentScenario = null
let currentFairness = 'min_max'
let participantMarkers = [] // { marker, index } — linked to isochrone layers
let venueMarkers = [] // { marker, venue } — kept separate for rank updates
let selectedParticipant = null // index of currently highlighted participant
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

const FAIRNESS_DESCRIPTIONS = {
  min_max: 'Minimise worst-case travel time',
  min_total: 'Minimise total travel for the group',
  min_variance: 'Equalise travel times across everyone',
}

function updateFairnessDesc() {
  const el = document.getElementById('fairness-desc')
  el.textContent = FAIRNESS_DESCRIPTIONS[currentFairness] ?? ''
  el.classList.remove('flash')
  // Force reflow to retrigger animation
  void el.offsetWidth
  el.classList.add('flash')
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
  map.on('click', () => clearSelection())

  // Scenario picker
  document.getElementById('scenario-picker').addEventListener('change', (e) => {
    loadScenario(e.target.value)
  })

  // Fairness strategy picker
  document.getElementById('fairness-picker').addEventListener('change', (e) => {
    currentFairness = e.target.value
    updateFairnessDesc()
    if (currentScenario) {
      clearSelection()
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
  participantMarkers.forEach(pm => pm.marker.remove())
  participantMarkers = []
  selectedParticipant = null
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

function addIntersection(polygons) {
  for (let i = 0; i < polygons.length; i++) {
    const id = `demo-intersection-${i}`

    map.addSource(id, {
      type: 'geojson',
      data: { type: 'Feature', geometry: polygons[i], properties: {} },
    })

    map.addLayer({
      id: `${id}-fill`,
      type: 'fill',
      source: id,
      paint: { 'fill-color': INTERSECTION_COLOUR, 'fill-opacity': 0.06 },
    })

    map.addLayer({
      id: `${id}-line`,
      type: 'line',
      source: id,
      paint: {
        'line-color': INTERSECTION_COLOUR,
        'line-width': 1.5,
        'line-opacity': 0.3,
      },
    })
  }
}

function addParticipantMarkers(participants) {
  participants.forEach((p, i) => {
    const colour = COLOURS[i % COLOURS.length]
    const el = document.createElement('div')
    el.className = 'marker-participant'
    el.style.background = colour
    el.style.boxShadow = `0 0 10px ${colour}`
    el.style.color = colour
    el.title = p.label

    // Permanent name label
    const label = document.createElement('span')
    label.className = 'participant-label'
    label.textContent = p.label
    label.style.color = colour
    el.appendChild(label)

    // Click to highlight this participant's isochrone
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      selectParticipant(i)
    })

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([p.lon, p.lat])
      .addTo(map)

    participantMarkers.push({ marker, index: i })
  })
}

function addVenueMarkers(venues) {
  venues.forEach(v => {
    const el = document.createElement('div')
    el.className = 'marker-venue'
    el.title = v.name

    // Rank number
    const num = document.createElement('span')
    num.className = 'venue-num'
    el.appendChild(num)

    // Floating name label (visible only on #1)
    const label = document.createElement('span')
    label.className = 'venue-label'
    label.textContent = v.name
    el.appendChild(label)

    // Click marker → highlight result card in sidebar
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      selectVenue(v.name)
    })

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([v.lon, v.lat])
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
    el.querySelector('.venue-num').textContent = String(rank)
  }
}

// --- Selection: map ↔ sidebar linking ---

function selectVenue(name) {
  clearParticipantHighlight()

  // Highlight the result card in the sidebar
  document.querySelectorAll('.result-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.venue === name)
  })

  // Highlight the marker on the map and fly to it
  for (const { marker, venue } of venueMarkers) {
    const el = marker.getElement()
    const match = venue.name === name
    el.classList.toggle('selected', match)
    if (match) {
      map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 13), duration: 600 })
    }
  }
}

function selectParticipant(index) {
  clearSelection()

  // Toggle — click same participant again to deselect
  if (selectedParticipant === index) {
    clearParticipantHighlight()
    return
  }
  selectedParticipant = index

  // Highlight the marker
  for (const pm of participantMarkers) {
    pm.marker.getElement().classList.toggle('selected', pm.index === index)
  }

  // Brighten this participant's isochrone, dim the others
  const s = currentScenario
  for (let i = 0; i < s.isochrones.length; i++) {
    const id = `demo-iso-${i}`
    if (i === index) {
      map.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.25)
      map.setPaintProperty(`${id}-line`, 'line-opacity', 1)
      map.setPaintProperty(`${id}-line`, 'line-width', 3)
    } else {
      map.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.04)
      map.setPaintProperty(`${id}-line`, 'line-opacity', 0.3)
      map.setPaintProperty(`${id}-line`, 'line-width', 1)
    }
  }
}

function clearParticipantHighlight() {
  selectedParticipant = null
  for (const pm of participantMarkers) {
    pm.marker.getElement().classList.remove('selected')
  }
  // Restore all isochrones to default opacity
  const s = currentScenario
  if (!s) return
  for (let i = 0; i < s.isochrones.length; i++) {
    const id = `demo-iso-${i}`
    try {
      map.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.12)
      map.setPaintProperty(`${id}-line`, 'line-opacity', 0.8)
      map.setPaintProperty(`${id}-line`, 'line-width', 2)
    } catch (_) { /* layer may not exist yet during animation */ }
  }
}

function clearSelection() {
  document.querySelectorAll('.result-card.selected').forEach(c => c.classList.remove('selected'))
  for (const { marker } of venueMarkers) {
    marker.getElement().classList.remove('selected')
  }
  clearParticipantHighlight()
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
  markStep('intersection', s.intersection.length > 1 ? s.intersection.length : undefined)
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

function highlightClass(times, name, strategy) {
  const vals = Object.values(times)
  const t = times[name]
  switch (strategy) {
    case 'min_max':
      return t === Math.max(...vals) ? 'time-hot' : ''
    case 'min_variance': {
      const min = Math.min(...vals)
      const max = Math.max(...vals)
      return t === max ? 'time-hot' : t === min ? 'time-cool' : ''
    }
    default:
      return ''
  }
}

function scoreLabel(strategy) {
  switch (strategy) {
    case 'min_max': return 'Worst'
    case 'min_total': return 'Total'
    case 'min_variance': return 'Spread'
    default: return 'Score'
  }
}

function scoreUnit(strategy) {
  return strategy === 'min_variance' ? '' : ' min'
}

function displayResults() {
  const s = currentScenario
  const scored = s.venues
    .map(v => ({
      ...v,
      score: computeFairness(Object.values(v.travelTimes), currentFairness),
    }))
    .sort((a, b) => a.score - b.score)

  const label = scoreLabel(currentFairness)
  const unit = scoreUnit(currentFairness)

  const list = document.getElementById('results-list')
  list.innerHTML = scored.map((v, i) => `
    <div class="result-card" data-venue="${esc(v.name)}">
      <div class="result-rank">${i + 1}</div>
      <div class="result-info">
        <div class="result-name">${esc(v.name)}</div>
        <div class="result-times">
          ${Object.entries(v.travelTimes).map(([name, t]) =>
            `<span class="${highlightClass(v.travelTimes, name, currentFairness)}">${esc(name)}: ${t}min</span>`
          ).join(' ')}
        </div>
        <div class="result-score">${label}: ${v.score.toFixed(1)}${unit}</div>
      </div>
    </div>
  `).join('')

  // Click result card → highlight marker on map and fly to it
  list.querySelectorAll('.result-card[data-venue]').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.venue
      selectVenue(name)
    })
  })

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

  // Include intersection extents
  for (const inter of s.intersection) {
    for (const coord of inter.coordinates[0]) {
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
