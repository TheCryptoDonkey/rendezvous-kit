// demo.js — rendezvous-kit interactive demo
// Uses global maplibregl from CDN script tag

import { ValhallaEngine, ValhallaError, intersectPolygonsAll, searchVenues }
  from 'https://esm.sh/rendezvous-kit@1.20.1'

// QR code library — loaded dynamically to avoid CJS→ESM breakage at module init
let _QRCode = null
const _qrReady = import('https://esm.sh/qrcode@1.5.4')
  .then(mod => { _QRCode = mod.default || mod })
  .catch(e => console.warn('QR library failed to load:', e))

const COLOURS = ['#ff44ff', '#00e5ff', '#00ff88', '#ffaa00', '#aa55ff']
const INTERSECTION_COLOUR = '#4488ff'

let map
let currentScenario = null
let currentFairness = 'min_max'
let participantMarkers = [] // { marker, index } — linked to isochrone layers
let venueMarkers = [] // { marker, venue } — kept separate for rank updates
let selectedParticipant = null // index of currently highlighted participant
let animationId = 0 // incremented on each load to cancel stale animations

// --- Interactive mode state ---
let interactiveMode = false
let interactiveParticipants = []  // { lat, lon, label, marker }
let interactiveEngine = null      // ValhallaEngine instance
let interactiveResults = null     // results from last interactive run
let selectedMode = 'drive'
let selectedTime = 15
let selectedStrategy = 'auto' // 'auto' | 'hull' | 'isochrone'
let routeLayers = []              // track route layers for cleanup: { layerId, handlers: { click, mouseenter, mouseleave } }
let routePopup = null             // active route popup
let currentRoutes = new Map()     // participantIndex → RouteGeometry (for directions display)
let routeGeneration = 0           // incremented on each venue selection to discard stale route results
let paymentPollTimer = null       // setInterval ID
const PARTICIPANT_LABELS = ['A', 'B', 'C', 'D', 'E']
const VALHALLA_URL = 'https://routing.trotters.cc'
const OVERPASS_URL = 'https://overpass.trotters.cc/api/interpreter'
const L402_STORAGE_KEY = 'rendezvous-l402'

// --- Bottom sheet state (mobile) ---
const SHEET_PEEK = 72     // px from bottom
const SHEET_HALF = 0.5    // fraction of viewport
const SHEET_FULL = 0.9    // fraction of viewport
let sheetState = 'half'   // 'peek' | 'half' | 'full'
let sheetEl = null        // set in init()
let isMobile = false      // updated on resize

// --- Manoeuvre type → SVG icon map ---
// Valhalla type values: https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/
const MANOEUVRE_ICONS = {
  // Start / destination
  1: `<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="5" fill="currentColor"/></svg>`,
  2: `<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="5" fill="currentColor"/></svg>`,
  3: `<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="5" fill="currentColor"/></svg>`,
  4: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1a5 5 0 0 0-5 5c0 4 5 9 5 9s5-5 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="currentColor"/></svg>`,
  5: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1a5 5 0 0 0-5 5c0 4 5 9 5 9s5-5 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="currentColor"/></svg>`,
  6: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1a5 5 0 0 0-5 5c0 4 5 9 5 9s5-5 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="currentColor"/></svg>`,
  // Straight
  8: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 2v12M8 2l-3 3M8 2l3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Slight right
  9: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M6 14V6l5-3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 3l3 0 0 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Right
  10: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 4v4a4 4 0 0 0 4 4h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8l3 4-3 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Sharp right
  11: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 3v11l7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 10V7H8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // U-turn right
  12: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M5 14V6a3 3 0 0 1 6 0v8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10l3 4 3-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // U-turn left
  13: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M11 14V6a3 3 0 0 0-6 0v8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10l-3 4-3-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Sharp left
  14: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M12 3v11L5 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10V7h3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Left
  15: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M12 4v4a4 4 0 0 1-4 4H4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 8l-3 4 3 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Slight left
  16: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M10 14V6L5 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 3l-3 0 0 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Ramp straight / right / left
  17: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 2v12M8 2l-3 3M8 2l3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2"/></svg>`,
  18: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 4v4a4 4 0 0 0 4 4h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2"/><path d="M9 8l3 4-3 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  19: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M12 4v4a4 4 0 0 1-4 4H4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2"/><path d="M7 8l-3 4 3 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Merge
  25: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 14l4-6 4-6M12 14l-4-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Roundabout enter / exit
  26: `<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 11v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.8 9.8l1.5 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  27: `<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 11v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 2l-2 2M8 2l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Ferry enter / exit
  28: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 10c1-1 2-1 3 0s2 1 3 0 2-1 3 0M4 6l4-4 4 4M8 2v7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  29: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 10c1-1 2-1 3 0s2 1 3 0 2-1 3 0M4 6l4-4 4 4M8 2v7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Merge right / left
  37: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 14l4-6 4-6M12 14l-4-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  38: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M12 14l-4-6-4-6M4 14l4-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
}

// Fallback icon for unknown manoeuvre types
const MANOEUVRE_ICON_DEFAULT = `<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="3" fill="currentColor"/></svg>`

function getManoeuvreIcon(type) {
  if (type == null) return MANOEUVRE_ICON_DEFAULT
  return MANOEUVRE_ICONS[type] ?? MANOEUVRE_ICON_DEFAULT
}

function renderBadges(leg) {
  const badges = []
  if (leg.toll) badges.push('<span class="step-badge badge-toll">TOLL</span>')
  if (leg.highway) badges.push('<span class="step-badge badge-highway">MOTORWAY</span>')
  if (leg.ferry) badges.push('<span class="step-badge badge-ferry">FERRY</span>')
  if (leg.rough) badges.push('<span class="step-badge badge-rough">UNPAVED</span>')
  if (leg.gate) badges.push('<span class="step-badge badge-gate">GATE</span>')
  return badges.length ? `<div class="step-badges">${badges.join('')}</div>` : ''
}

const THEME_KEY = 'rendezvous-theme'
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

// --- Credit balance tracking ---
// The fetch interceptor lives in index.html (classic script, runs before modules).
// It calls window._creditUpdate when it sees X-Credit-Balance or X-Free-Remaining.

window._creditUpdate = function (type, remaining) {
  const el = document.getElementById('credit-balance')
  if (!el) return
  if (type === 'sats') {
    el.textContent = `⚡ ${remaining} sats`
    el.className = remaining <= 0 ? 'credit-badge depleted' : 'credit-badge paid'
  } else {
    el.textContent = `Free: ${remaining} left`
    el.className = remaining <= 0 ? 'credit-badge depleted' : 'credit-badge'
  }
}

// --- Version badge (fetched from npm, always in sync) ---

fetch('https://registry.npmjs.org/rendezvous-kit/latest')
  .then(r => r.json())
  .then(d => {
    const el = document.getElementById('version-badge')
    if (el && d.version) el.textContent = `v${d.version}`
  })
  .catch(() => {}) // silent — badge stays empty if offline

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

function updateInteractiveFairnessDesc() {
  const el = document.getElementById('interactive-fairness-desc')
  el.textContent = FAIRNESS_DESCRIPTIONS[currentFairness] ?? ''
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
}

// --- Initialisation ---

function createEngine() {
  const stored = localStorage.getItem(L402_STORAGE_KEY)
  const headers = {}
  if (stored) {
    try {
      const { macaroon, preimage } = JSON.parse(stored)
      headers['Authorization'] = `L402 ${macaroon}:${preimage}`
    } catch (_) { /* ignore corrupt storage */ }
  }
  return new ValhallaEngine({ baseUrl: VALHALLA_URL, headers })
}

function init() {
  const savedTheme = localStorage.getItem(THEME_KEY)
  const mapStyle = savedTheme === 'light' ? LIGHT_STYLE : DARK_STYLE

  map = new maplibregl.Map({
    container: 'map',
    style: mapStyle,
    center: [-2.59, 51.45],
    zoom: 12,
  })
  window._map = map  // Expose for demo recording

  map.on('load', () => {
    switchMode(true)
    // Centre on user's location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!interactiveResults && interactiveParticipants.length === 0) {
            map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 13, duration: 1200 })
          }
        },
        () => {}, // silently ignore denial
        { timeout: 5000 }
      )
    }
  })

  // Map click — interactive mode adds markers, showcase mode clears selection
  map.on('click', (e) => {
    if (interactiveMode) {
      // Don't add participants while results are displayed — must Clear first
      if (!interactiveResults && interactiveParticipants.length < 5) {
        addInteractiveParticipant(e.lngLat.lat, e.lngLat.lng)
      }
    } else {
      clearSelection()
    }
  })

  // Scenario picker
  document.getElementById('scenario-picker').addEventListener('change', (e) => {
    loadScenario(e.target.value)
  })

  // Fairness strategy picker (showcase)
  document.getElementById('fairness-picker').addEventListener('change', (e) => {
    currentFairness = e.target.value
    updateFairnessDesc()
    if (currentScenario) {
      clearSelection()
      displayResults()
      updateCodePanel(currentScenario)
    }
  })

  // Fairness strategy picker (interactive)
  document.getElementById('interactive-fairness').addEventListener('change', (e) => {
    currentFairness = e.target.value
    updateInteractiveFairnessDesc()
    if (interactiveResults) {
      clearSelection()
      displayResults()
      updateInteractiveCodePanel()
    }
  })

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      switchMode(tab.dataset.tab === 'interactive')
    })
  })

  // --- Interactive controls ---

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      selectedMode = btn.dataset.mode
    })
  })

  // Strategy buttons
  document.querySelectorAll('.strategy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.strategy-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      selectedStrategy = btn.dataset.strategy
    })
  })

  // Venue type chips
  document.querySelectorAll('.venue-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active')
    })
  })

  // Time slider
  const slider = document.getElementById('time-slider')
  const timeValue = document.getElementById('time-value')
  slider.addEventListener('input', () => {
    selectedTime = parseInt(slider.value, 10)
    timeValue.textContent = `${selectedTime} min`
  })

  // Find button
  document.getElementById('btn-find').addEventListener('click', () => {
    runInteractive()
  })

  // Clear button
  document.getElementById('btn-clear').addEventListener('click', () => {
    clearInteractive()
  })

  // Theme toggle
  initTheme()
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme)

  // Restore L402 token and create engine
  interactiveEngine = createEngine()

  // Initialise bottom sheet for mobile
  initSheet()
}

// --- Theme ---

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light') applyTheme('light')
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme
  const next = current === 'light' ? 'dark' : 'light'
  applyTheme(next)
  localStorage.setItem(THEME_KEY, next)
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : ''
  document.getElementById('theme-toggle').textContent = theme === 'light' ? '🌙' : '☀️'

  // Switch map base style
  if (map) {
    const style = theme === 'light' ? LIGHT_STYLE : DARK_STYLE
    const center = map.getCenter()
    const zoom = map.getZoom()

    // Cancel running animations and clear ALL markers before setStyle
    // (setStyle removes layers/sources but NOT marker DOM elements)
    animationId++
    participantMarkers.forEach(pm => pm.marker.remove())
    participantMarkers = []
    venueMarkers.forEach(vm => vm.marker.remove())
    venueMarkers = []
    // Also clear interactive participant markers (stored separately)
    interactiveParticipants.forEach(p => { if (p.marker) p.marker.remove() })
    selectedParticipant = null
    clearRouteLayers()
    resetPipeline()

    const savedScenario = currentScenario

    map.setStyle(style)

    // Wait for the new style to be fully loaded before re-adding layers
    function waitAndRender() {
      if (!map.isStyleLoaded()) {
        requestAnimationFrame(waitAndRender)
        return
      }
      map.setCenter(center)
      map.setZoom(zoom)
      if (savedScenario) {
        currentScenario = savedScenario
        const thisAnimation = ++animationId
        reRenderScenario(thisAnimation)
      }
    }
    requestAnimationFrame(waitAndRender)
  }
}

/** Re-add all scenario layers instantly (no animation) after a style swap. */
function reRenderScenario(expectedId) {
  const s = currentScenario
  if (!s) return

  // Participants
  if (interactiveMode && interactiveParticipants.length) {
    // Re-create interactive participant markers (draggable)
    interactiveParticipants.forEach((p, i) => {
      const colour = COLOURS[i % COLOURS.length]
      const el = document.createElement('div')
      el.className = 'marker-participant'
      el.style.background = colour
      el.style.boxShadow = `0 0 10px ${colour}`
      el.style.color = colour
      const label = document.createElement('span')
      label.className = 'participant-label'
      label.textContent = p.label
      label.style.color = colour
      el.appendChild(label)
      el.addEventListener('click', (e) => e.stopPropagation())
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([p.lon, p.lat])
        .addTo(map)
      // Old marker was already removed in applyTheme
      p.marker = marker
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        p.lat = lngLat.lat
        p.lon = lngLat.lng
      })
    })
  } else if (s.participants) {
    addParticipantMarkers(s.participants)
  }

  if (animationId !== expectedId) return

  // Isochrones
  if (s.isochrones) {
    s.isochrones.forEach((iso, i) => addIsochrone(i, iso))
    markStep('isochrones', s.isochrones.length, s.isochrones.length)
  }

  if (animationId !== expectedId) return

  // Intersection
  if (s.intersection) {
    const allIntersection = s.intersection.filter(p => polygonArea(p) > 0.0001)
    const largestArea = allIntersection.length > 0
      ? Math.max(...allIntersection.map(polygonArea))
      : 0
    const intersection = largestArea > 0
      ? allIntersection.filter(p => polygonArea(p) >= largestArea * 0.1)
      : allIntersection
    addIntersection(intersection)
    markStep('intersection', intersection.length > 1 ? intersection.length : undefined)
  }

  if (animationId !== expectedId) return

  // Venues
  if (s.venues) {
    addVenueMarkers(s.venues)
    markStep('venues', s.venues.length)
    displayResults()
    markStep('scored')
  }
}

// --- Mode switching ---

function switchMode(isInteractive) {
  ++animationId  // Cancel any in-flight showcase animation
  interactiveMode = isInteractive

  const showcasePanel = document.getElementById('showcase-panel')
  const interactivePanel = document.getElementById('interactive-panel')

  if (isInteractive) {
    showcasePanel.classList.add('hidden')
    interactivePanel.classList.remove('hidden')
    clearMap()
    clearRouteLayers()
    resetPipeline()
    currentScenario = null
    interactiveResults = null
    map.getCanvas().style.cursor = 'crosshair'
    document.getElementById('code-content').textContent = ''
    if (isMobile) setSheetState('half')
    // Sync interactive fairness picker to current value
    document.getElementById('interactive-fairness').value = currentFairness
  } else {
    interactivePanel.classList.add('hidden')
    showcasePanel.classList.remove('hidden')
    clearInteractive()
    map.getCanvas().style.cursor = ''
    // Sync showcase fairness picker to current value
    document.getElementById('fairness-picker').value = currentFairness
    // Reload current scenario
    const picker = document.getElementById('scenario-picker')
    loadScenario(picker.value)
    if (isMobile) setSheetState('half')
  }
}

// --- Interactive participant management ---

function addInteractiveParticipant(lat, lon) {
  const index = interactiveParticipants.length
  const label = PARTICIPANT_LABELS[index]
  const colour = COLOURS[index % COLOURS.length]

  // Create draggable marker
  const el = document.createElement('div')
  el.className = 'marker-participant'
  el.style.background = colour
  el.style.boxShadow = `0 0 10px ${colour}`
  el.style.color = colour
  el.title = label

  const labelSpan = document.createElement('span')
  labelSpan.className = 'participant-label'
  labelSpan.textContent = label
  labelSpan.style.color = colour
  el.appendChild(labelSpan)

  el.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  const marker = new maplibregl.Marker({ element: el, draggable: true })
    .setLngLat([lon, lat])
    .addTo(map)

  const participant = { lat, lon, label, marker }
  interactiveParticipants.push(participant)

  // Update coordinates on drag end
  marker.on('dragend', () => {
    const lngLat = marker.getLngLat()
    participant.lat = lngLat.lat
    participant.lon = lngLat.lng
  })

  updateParticipantList()
  updateFindButton()
  hideError()
  // Drop sheet to peek so map is maximised for placing markers
  if (isMobile) setSheetState('peek')
}

function removeParticipant(index) {
  // Remove the marker from the map
  interactiveParticipants[index].marker.remove()
  interactiveParticipants.splice(index, 1)

  // Re-label remaining participants
  interactiveParticipants.forEach((p, i) => {
    p.label = PARTICIPANT_LABELS[i]
    const colour = COLOURS[i % COLOURS.length]
    const el = p.marker.getElement()
    el.style.background = colour
    el.style.boxShadow = `0 0 10px ${colour}`
    el.style.color = colour
    el.title = p.label
    const labelSpan = el.querySelector('.participant-label')
    labelSpan.textContent = p.label
    labelSpan.style.color = colour
  })

  updateParticipantList()
  updateFindButton()
}

function updateParticipantList() {
  const container = document.getElementById('participant-list')

  if (interactiveParticipants.length === 0) {
    container.innerHTML = '<span class="control-hint">Click the map to place 2\u20135 markers</span>'
    return
  }

  container.innerHTML = interactiveParticipants.map((p, i) => {
    const colour = COLOURS[i % COLOURS.length]
    return `<span class="participant-chip">
      <span class="chip-dot" style="background:${colour}"></span>
      ${esc(p.label)}
      <button class="chip-remove" data-index="${i}">\u00d7</button>
    </span>`
  }).join('')

  // Wire remove buttons
  container.querySelectorAll('.chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      removeParticipant(parseInt(btn.dataset.index, 10))
    })
  })
}

function updateFindButton() {
  const btn = document.getElementById('btn-find')
  btn.disabled = interactiveParticipants.length < 2
}

function clearInteractive() {
  // Remove participant markers
  interactiveParticipants.forEach(p => p.marker.remove())
  interactiveParticipants = []

  // Cancel any payment polling
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer)
    paymentPollTimer = null
  }

  // Clear map layers
  clearMap()
  clearRouteLayers()
  resetPipeline()

  // Reset UI
  interactiveResults = null
  currentScenario = null
  updateParticipantList()
  updateFindButton()
  hideError()
  document.getElementById('payment-panel').classList.add('hidden')
  document.getElementById('code-content').textContent = ''
  if (isMobile) setSheetState('half')
  resetFindButton()
}

// --- Interactive controls helpers ---

function getSelectedVenueTypes() {
  const chips = document.querySelectorAll('.venue-chip.active')
  return Array.from(chips).map(chip => chip.dataset.venue)
}

function resetFindButton() {
  const btn = document.getElementById('btn-find')
  btn.textContent = 'Find rendezvous'
  btn.disabled = interactiveParticipants.length < 2
}

function showError(msg) {
  const el = document.getElementById('interactive-error')
  el.textContent = msg
  el.classList.remove('hidden')
}

function hideError() {
  const el = document.getElementById('interactive-error')
  el.textContent = ''
  el.classList.add('hidden')
}

// --- Live interactive pipeline ---

function polygonArea(polygon) {
  // Shoelace formula for polygon area (absolute value)
  const ring = polygon.coordinates[0]
  if (!ring || ring.length < 4) return 0
  let area = 0
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return Math.abs(area) / 2
}

function pointInPolygon(lon, lat, polygon) {
  // Ray-casting algorithm
  const ring = polygon.coordinates[0]
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if (((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

function pointInAnyPolygon(lon, lat, polygons) {
  return polygons.some(p => pointInPolygon(lon, lat, p))
}

function envelopePolygon(polygons) {
  // Merge all polygon coordinates into a single bounding polygon
  // Used for venue search area when intersection is valid
  if (polygons.length === 1) return polygons[0]

  // Use convex hull of all intersection polygons
  const allCoords = []
  for (const p of polygons) {
    for (const ring of p.coordinates) {
      for (const coord of ring) {
        allCoords.push(coord)
      }
    }
  }

  // Simple bounding box as polygon
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  for (const [lon, lat] of allCoords) {
    if (lon < minLon) minLon = lon
    if (lat < minLat) minLat = lat
    if (lon > maxLon) maxLon = lon
    if (lat > maxLat) maxLat = lat
  }

  return {
    type: 'Polygon',
    coordinates: [[
      [minLon, minLat],
      [maxLon, minLat],
      [maxLon, maxLat],
      [minLon, maxLat],
      [minLon, minLat],
    ]]
  }
}

async function runInteractive() {
  // Validate
  if (interactiveParticipants.length < 2) {
    showError('Place at least 2 participants on the map.')
    return
  }

  const venueTypes = getSelectedVenueTypes()
  if (venueTypes.length === 0) {
    showError('Select at least one venue type.')
    return
  }

  hideError()

  // Disable find button
  const findBtn = document.getElementById('btn-find')
  findBtn.disabled = true
  findBtn.textContent = 'Computing...'

  // Cancel stale animations
  const thisAnimation = ++animationId

  // Clear previous results
  clearMap()
  clearRouteLayers()
  resetPipeline()
  interactiveResults = null
  currentScenario = null

  // Re-add participant markers (clearMap removed all markers)
  interactiveParticipants.forEach((p, i) => {
    const colour = COLOURS[i % COLOURS.length]
    const el = document.createElement('div')
    el.className = 'marker-participant'
    el.style.background = colour
    el.style.boxShadow = `0 0 10px ${colour}`
    el.style.color = colour
    el.title = p.label

    const labelSpan = document.createElement('span')
    labelSpan.className = 'participant-label'
    labelSpan.textContent = p.label
    labelSpan.style.color = colour
    el.appendChild(labelSpan)

    el.addEventListener('click', (e) => {
      e.stopPropagation()
    })

    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([p.lon, p.lat])
      .addTo(map)

    // Update old marker reference
    p.marker.remove()
    p.marker = marker

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat()
      p.lat = lngLat.lat
      p.lon = lngLat.lng
    })
  })

  const showIso = document.getElementById('show-isochrones')?.checked ?? true
  const strategy = selectedStrategy === 'auto'
    ? hullChooseStrategy(interactiveParticipants, selectedMode, selectedTime)
    : selectedStrategy

  try {
    if (strategy === 'hull') {
      // === Hull fast-path ===

      // 1. Draw hull immediately
      const hull = computeSearchHullDemo(interactiveParticipants, selectedMode, selectedTime)
      addHullOutline(hull)
      markStep('hull', 1, 1)

      // 2. Search venues in hull bounding box
      const hullPoly = { type: 'Polygon', coordinates: [[...hull, hull[0]]] }
      const rawVenues = await searchVenues(hullPoly, venueTypes, OVERPASS_URL)

      if (rawVenues.length === 0) {
        showError('No venues found in the search area. Try different venue types or a larger time budget.')
        resetFindButton()
        return
      }

      if (animationId !== thisAnimation) return

      // 3. Route matrix
      if (rawVenues.length > 50) rawVenues.length = 50
      const origins = interactiveParticipants.map(p => ({ lat: p.lat, lon: p.lon, label: p.label }))
      const destinations = rawVenues.map(v => ({ lat: v.lat, lon: v.lon }))
      const matrix = await interactiveEngine.computeRouteMatrix(origins, destinations, selectedMode)

      if (animationId !== thisAnimation) return

      // 4. Score and filter
      const allScored = rawVenues.map((v, vi) => {
        const travelTimes = {}
        for (let oi = 0; oi < origins.length; oi++) {
          const entry = matrix.entries.find(e => e.originIndex === oi && e.destinationIndex === vi)
          const minutes = entry ? Math.round(entry.durationMinutes * 10) / 10 : -1
          travelTimes[origins[oi].label] = minutes
        }
        return { name: v.name, lat: v.lat, lon: v.lon, venueType: v.venueType, travelTimes }
      })
      const scoredVenues = allScored.filter(v => {
        const times = Object.values(v.travelTimes)
        return times.every(t => t > 0 && t <= selectedTime)
      })

      if (scoredVenues.length === 0) {
        showError('All venues are beyond the time budget. Try increasing it.')
        resetFindButton()
        return
      }

      scoredVenues.sort((a, b) => {
        const timesA = Object.values(a.travelTimes)
        const timesB = Object.values(b.travelTimes)
        return Math.max(...timesA) - Math.max(...timesB)
      })
      const topVenues = scoredVenues.slice(0, 5)

      // Display results
      currentScenario = {
        participants: origins,
        isochrones: [], // No isochrones computed yet
        intersection: [],
        venues: topVenues,
        mode: selectedMode,
        maxTimeMinutes: selectedTime,
        venueTypes,
      }
      interactiveResults = currentScenario

      addVenueMarkers(topVenues)
      markStep('venues', topVenues.length)
      displayResults()
      markStep('scored')
      if (isMobile) setSheetState('full')
      fitToScenario(currentScenario)
      updateInteractiveCodePanel()

      // 5. Background isochrone reveal (if toggle is on)
      if (showIso) {
        const isoPromises = interactiveParticipants.map((p) =>
          interactiveEngine.computeIsochrone(
            { lat: p.lat, lon: p.lon },
            selectedMode,
            selectedTime,
          )
        )

        try {
          const isochrones = await Promise.all(isoPromises)
          if (animationId !== thisAnimation) return

          // Stagger reveal
          for (let i = 0; i < isochrones.length; i++) {
            await delay(250)
            if (animationId !== thisAnimation) return
            addIsochrone(i, isochrones[i].polygon)
            markStep('isochrones', i + 1, isochrones.length)
          }

          // Update scenario with isochrones for later use
          currentScenario.isochrones = isochrones.map(iso => iso.polygon)

          // Fade out hull after last isochrone
          await delay(300)
          if (animationId !== thisAnimation) return
          fadeOutHull()
        } catch (isoErr) {
          // Isochrones are display-only — don't fail the whole pipeline
          console.warn('Background isochrone fetch failed:', isoErr)
        }
      }

    } else {
      // === Existing isochrone pipeline ===

      // Step 1: Compute isochrones (parallel for speed)
      let isoCompleted = 0
      const isoPromises = interactiveParticipants.map((p, i) =>
        interactiveEngine.computeIsochrone(
          { lat: p.lat, lon: p.lon },
          selectedMode,
          selectedTime
        ).then(iso => {
          isoCompleted++
          addIsochrone(i, iso.polygon)
          markStep('isochrones', isoCompleted, interactiveParticipants.length)
          return iso.polygon
        })
      )
      const isochrones = await Promise.all(isoPromises)

      if (animationId !== thisAnimation) return

      // Step 2: Intersect polygons
      const rawIntersection = intersectPolygonsAll(isochrones)
      // Filter out degenerate polygon fragments (slivers from clipping)
      const allIntersection = rawIntersection.filter(p => polygonArea(p) > 0.0001)
      if (allIntersection.length === 0) {
        showError('No common reachable area found. Try increasing the time budget or moving participants closer together.')
        resetFindButton()
        return
      }
      // Only keep substantial intersection polygons (>= 10% of the largest area).
      // Thin slivers along road corridors confuse the map and produce misleading venues.
      const largestArea = Math.max(...allIntersection.map(polygonArea))
      const intersection = allIntersection.filter(p => polygonArea(p) >= largestArea * 0.1)
      addIntersection(intersection)
      markStep('intersection', intersection.length > 1 ? intersection.length : undefined)

      if (animationId !== thisAnimation) return

      // Step 3: Search venues within the bounding box, then filter to those inside the intersection
      const searchArea = envelopePolygon(intersection)
      const rawVenues = await searchVenues(searchArea, venueTypes, OVERPASS_URL)
      const venues = rawVenues.filter(v => pointInAnyPolygon(v.lon, v.lat, intersection))

      if (venues.length === 0) {
        showError('No venues found in the overlap area. Try different venue types or a larger time budget.')
        resetFindButton()
        return
      }
      markStep('venues')

      if (animationId !== thisAnimation) return

      // Step 4: Compute route matrix for travel times
      // Cap venues to avoid exceeding Valhalla's max locations limit (2500).
      // We only keep the top 5 after scoring, so 50 candidates is more than enough.
      if (venues.length > 50) venues.length = 50
      const origins = interactiveParticipants.map(p => ({ lat: p.lat, lon: p.lon, label: p.label }))
      const destinations = venues.map(v => ({ lat: v.lat, lon: v.lon }))
      const matrix = await interactiveEngine.computeRouteMatrix(origins, destinations, selectedMode)

      if (animationId !== thisAnimation) return

      // Step 5: Score venues
      const scoredVenues = venues.map((v, vi) => {
        const travelTimes = {}
        for (let oi = 0; oi < origins.length; oi++) {
          const entry = matrix.entries.find(e => e.originIndex === oi && e.destinationIndex === vi)
          const minutes = entry ? Math.round(entry.durationMinutes * 10) / 10 : -1
          travelTimes[origins[oi].label] = minutes
        }
        return {
          name: v.name,
          lat: v.lat,
          lon: v.lon,
          venueType: v.venueType,
          travelTimes,
        }
      }).filter(v => {
        // Filter out venues with unreachable or zero travel times
        const times = Object.values(v.travelTimes)
        return times.every(t => t > 0)
      })

      if (scoredVenues.length === 0) {
        showError('All venues have unreachable routes. Try a larger time budget.')
        resetFindButton()
        return
      }

      // Sort by current fairness strategy and keep top 5
      scoredVenues.sort((a, b) => {
        const timesA = Object.values(a.travelTimes)
        const timesB = Object.values(b.travelTimes)
        return Math.max(...timesA) - Math.max(...timesB)
      })
      const topVenues = scoredVenues.slice(0, 5)

      // Build scenario-compatible object for displayResults
      currentScenario = {
        participants: origins,
        isochrones,
        intersection,
        venues: topVenues,
        mode: selectedMode,
        maxTimeMinutes: selectedTime,
        venueTypes,
      }
      interactiveResults = currentScenario

      addVenueMarkers(topVenues)
      markStep('venues', topVenues.length)
      displayResults()
      markStep('scored')
      if (isMobile) setSheetState('full')

      // Fit map
      fitToScenario(currentScenario)

      // Update code panel
      updateInteractiveCodePanel()
    }

  } catch (err) {
    if (err instanceof ValhallaError && err.status === 402) {
      handlePaymentRequired(err)
      return
    }
    console.error('Interactive pipeline error:', err)
    showError(`Error: ${err.message}`)
  } finally {
    if (animationId === thisAnimation) {
      resetFindButton()
    }
  }
}

// --- L402 payment flow ---

function handlePaymentRequired(err) {
  let paymentData
  try {
    paymentData = JSON.parse(err.body)
  } catch (_) {
    showError('Payment required but could not parse payment details.')
    resetFindButton()
    return
  }

  const { invoice, macaroon, payment_hash, amount_sats } = paymentData

  if (!invoice || !macaroon || !payment_hash) {
    showError('Payment required but response is missing required fields.')
    resetFindButton()
    return
  }

  showPaymentUI(invoice, macaroon, payment_hash, amount_sats)
  if (isMobile) setSheetState('full')
}

function qrFallbackHtml(bolt11) {
  return `<a href="lightning:${esc(bolt11)}" class="qr-fallback-link">
    <div class="qr-fallback">${esc(bolt11)}</div>
  </a>`
}

function showPaymentUI(bolt11, macaroon, paymentHash, amountSats) {
  const panel = document.getElementById('payment-panel')
  panel.classList.remove('hidden', 'paid')

  panel.innerHTML = `
    <h4>Lightning Payment Required</h4>
    <div class="amount">${amountSats != null ? esc(String(amountSats)) + ' sats' : 'Amount in invoice'}</div>
    <div class="qr-placeholder"><div class="qr-loading" style="padding:20px;color:var(--text-dim);font-size:13px;">Generating QR...</div></div>
    <a href="lightning:${esc(bolt11)}" class="wallet-btn">Open in wallet</a>
    <button class="copy-btn">Copy invoice</button>
    <button class="cancel-btn">Cancel</button>
    <div class="status">Waiting for payment...</div>
  `

  // Render QR asynchronously after panel is shown
  const renderQR = async () => {
    await _qrReady
    const container = panel.querySelector('.qr-placeholder')
    if (!container) return

    if (_QRCode && _QRCode.toString) {
      try {
        const svg = await _QRCode.toString(bolt11.toUpperCase(), {
          type: 'svg',
          width: 280,
          errorCorrectionLevel: 'L',
          margin: 2,
        })
        container.innerHTML = `<a href="lightning:${esc(bolt11)}" class="qr-link"><div class="qr-container">${svg}</div></a>`
      } catch (e) {
        console.warn('QR generation failed:', e)
        container.innerHTML = qrFallbackHtml(bolt11)
      }
    } else {
      container.innerHTML = qrFallbackHtml(bolt11)
    }
  }
  renderQR()

  // Scroll payment panel into view on mobile
  requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))

  // Copy button
  panel.querySelector('.copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(bolt11).then(() => {
      panel.querySelector('.copy-btn').textContent = 'Copied!'
      setTimeout(() => {
        const copyBtn = panel.querySelector('.copy-btn')
        if (copyBtn) copyBtn.textContent = 'Copy invoice'
      }, 2000)
    }).catch(() => {
      // Fallback: select text
      const ta = document.createElement('textarea')
      ta.value = bolt11
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      panel.querySelector('.copy-btn').textContent = 'Copied!'
    })
  })

  // Cancel button
  panel.querySelector('.cancel-btn').addEventListener('click', () => {
    cancelPayment()
  })

  // Start polling
  pollForPayment(paymentHash, macaroon)
}

function pollForPayment(paymentHash, macaroon) {
  if (paymentPollTimer) clearInterval(paymentPollTimer)

  paymentPollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${VALHALLA_URL}/invoice-status/${paymentHash}`)
      if (!res.ok) return // silent retry

      const data = await res.json()
      if (data.paid && data.preimage) {
        // Payment confirmed!
        clearInterval(paymentPollTimer)
        paymentPollTimer = null

        // Store L402 token
        localStorage.setItem(L402_STORAGE_KEY, JSON.stringify({
          macaroon,
          preimage: data.preimage,
        }))

        // Create authenticated engine
        interactiveEngine = createEngine()

        // Flash paid animation
        const panel = document.getElementById('payment-panel')
        const statusEl = panel.querySelector('.status')
        if (statusEl) statusEl.textContent = 'Paid!'
        panel.classList.add('paid')

        // Hide after animation
        setTimeout(() => {
          panel.classList.add('hidden')
          // Re-run the pipeline
          runInteractive()
        }, 1200)
      }
    } catch (_) {
      // Silent retry on network errors
    }
  }, 3000)
}

function cancelPayment() {
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer)
    paymentPollTimer = null
  }
  document.getElementById('payment-panel').classList.add('hidden')
  resetFindButton()
  resetPipeline()
}

// --- Bottom sheet (mobile) ---

function initSheet() {
  sheetEl = document.getElementById('panel')
  const handle = document.getElementById('sheet-handle')
  if (!handle || !sheetEl) return

  checkMobile()
  window.addEventListener('resize', checkMobile)

  let startY = 0
  let startTranslate = 0
  let dragging = false

  handle.addEventListener('touchstart', (e) => {
    if (!isMobile) return
    dragging = true
    startY = e.touches[0].clientY
    startTranslate = getCurrentTranslateY()
    sheetEl.style.transition = 'none'
  }, { passive: true })

  handle.addEventListener('touchmove', (e) => {
    if (!dragging || !isMobile) return
    e.preventDefault()
    const dy = e.touches[0].clientY - startY
    const newY = Math.max(0, startTranslate + dy)
    sheetEl.style.transform = `translateY(${newY}px)`
  }, { passive: false })

  handle.addEventListener('touchend', () => {
    if (!dragging || !isMobile) return
    dragging = false
    sheetEl.style.transition = ''
    snapSheet()
  })

  // Also handle mouse for testing in desktop devtools
  handle.addEventListener('mousedown', (e) => {
    if (!isMobile) return
    dragging = true
    startY = e.clientY
    startTranslate = getCurrentTranslateY()
    sheetEl.style.transition = 'none'

    const onMove = (e) => {
      if (!dragging) return
      const dy = e.clientY - startY
      const newY = Math.max(0, startTranslate + dy)
      sheetEl.style.transform = `translateY(${newY}px)`
    }

    const onUp = () => {
      dragging = false
      sheetEl.style.transition = ''
      snapSheet()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  })
}

function checkMobile() {
  isMobile = window.innerWidth <= 768
  if (isMobile) {
    setSheetState(sheetState)
  } else {
    // Desktop: clear any transforms
    if (sheetEl) sheetEl.style.transform = ''
  }
}

function getCurrentTranslateY() {
  if (!sheetEl) return 0
  const transform = getComputedStyle(sheetEl).transform
  if (transform === 'none') return 0
  const matrix = new DOMMatrix(transform)
  return matrix.m42
}

function getSheetTranslateY(state) {
  const vh = window.innerHeight
  switch (state) {
    case 'peek': return vh - SHEET_PEEK
    case 'half': return vh * (1 - SHEET_HALF)
    case 'full': return vh * (1 - SHEET_FULL)
    default: return vh * (1 - SHEET_HALF)
  }
}

function snapSheet() {
  const currentY = getCurrentTranslateY()
  const peekY = getSheetTranslateY('peek')
  const halfY = getSheetTranslateY('half')
  const fullY = getSheetTranslateY('full')

  // Find nearest snap point
  const distances = [
    { state: 'full', dist: Math.abs(currentY - fullY) },
    { state: 'half', dist: Math.abs(currentY - halfY) },
    { state: 'peek', dist: Math.abs(currentY - peekY) },
  ]
  distances.sort((a, b) => a.dist - b.dist)
  setSheetState(distances[0].state)
}

function setSheetState(state) {
  if (!isMobile || !sheetEl) return
  sheetState = state
  const y = getSheetTranslateY(state)
  sheetEl.style.transform = `translateY(${y}px)`
}

// --- Route display ---

function clearRouteLayers() {
  // Close any route popup
  if (routePopup) {
    routePopup.remove()
    routePopup = null
  }

  // Remove route layers and sources
  const style = map.getStyle()
  if (!style) return

  for (const { layerId, handlers } of routeLayers) {
    map.off('click', layerId, handlers.click)
    map.off('mouseenter', layerId, handlers.mouseenter)
    map.off('mouseleave', layerId, handlers.mouseleave)
    if (map.getLayer(layerId)) map.removeLayer(layerId)
  }

  // Remove corresponding sources
  for (const { layerId } of routeLayers) {
    const sourceId = layerId.replace(/-line$/, '')
    if (map.getSource(sourceId)) map.removeSource(sourceId)
  }

  routeLayers = []
  currentRoutes.clear()
}

// --- Hull visualisation ---
// TODO: import from rendezvous-kit once published with hull support

const HULL_COLOUR = '#4fc3f7'

// Approximate speeds for hull buffer calculation (km/h)
const HULL_SPEED_KMH = { drive: 50, cycle: 15, walk: 5, public_transit: 30 }
const HULL_EARTH_RADIUS_KM = 6371.0088

function hullConvexHull(points) {
  if (points.length === 0) return []
  const seen = new Set()
  const unique = []
  for (const p of points) {
    const key = `${p[0]},${p[1]}`
    if (!seen.has(key)) { seen.add(key); unique.push(p) }
  }
  if (unique.length < 3) return unique
  unique.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  function cross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  }
  const lower = []
  for (const p of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper = []
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop(); upper.pop()
  return [...lower, ...upper]
}

function hullBuffer(hull, distanceKm) {
  if (hull.length === 0 || distanceKm === 0) return hull.map(p => [...p])
  let cx = 0, cy = 0
  for (const [x, y] of hull) { cx += x; cy += y }
  cx /= hull.length; cy /= hull.length
  const degToRad = Math.PI / 180
  return hull.map(([x, y]) => {
    const dx = x - cx, dy = y - cy
    const dist = Math.hypot(dx, dy)
    if (dist === 0) return [x, y]
    const latRad = cy * degToRad
    const kmPerDegLon = (Math.PI / 180) * HULL_EARTH_RADIUS_KM * Math.cos(latRad)
    const kmPerDegLat = (Math.PI / 180) * HULL_EARTH_RADIUS_KM
    const bearing = Math.atan2(dx * kmPerDegLon, dy * kmPerDegLat)
    const offsetLon = (distanceKm * Math.sin(bearing)) / kmPerDegLon
    const offsetLat = (distanceKm * Math.cos(bearing)) / kmPerDegLat
    return [x + offsetLon, y + offsetLat]
  })
}

function computeSearchHullDemo(participants, mode, maxTimeMinutes) {
  const points = participants.map(p => [p.lon, p.lat])
  const hull = hullConvexHull(points)
  // Buffer should be a small margin, not the full travel radius
  const hullDiameter = hullMaxPairwiseDist(hull.length >= 2 ? hull : points)
  const travelRadius = (HULL_SPEED_KMH[mode] || 50) * (maxTimeMinutes / 60)
  const bufferKm = Math.min(hullDiameter * 0.3, travelRadius * 0.3)
  return hullBuffer(hull, bufferKm)
}

function hullMaxPairwiseDist(points) {
  let maxDist = 0
  const degToRad = Math.PI / 180
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dLon = (points[j][0] - points[i][0]) * degToRad
      const dLat = (points[j][1] - points[i][1]) * degToRad
      const lat1 = points[i][1] * degToRad
      const lat2 = points[j][1] * degToRad
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
      const d = 2 * HULL_EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      if (d > maxDist) maxDist = d
    }
  }
  return maxDist
}

function hullChooseStrategy(participants, mode, maxTimeMinutes) {
  const points = participants.map(p => [p.lon, p.lat])
  const hull = hullConvexHull(points)
  if (hull.length < 3) {
    // Degenerate: use max pairwise distance vs travel radius
    let maxDist = 0
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const dLat = (participants[j].lat - participants[i].lat) * Math.PI / 180
        const dLon = (participants[j].lon - participants[i].lon) * Math.PI / 180
        const a = Math.sin(dLat/2)**2 + Math.cos(participants[i].lat * Math.PI / 180) * Math.cos(participants[j].lat * Math.PI / 180) * Math.sin(dLon/2)**2
        const d = 2 * HULL_EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        if (d > maxDist) maxDist = d
      }
    }
    const radiusKm = (HULL_SPEED_KMH[mode] || 50) * (maxTimeMinutes / 60)
    return maxDist < radiusKm ? 'hull' : 'isochrone'
  }
  // Approximate hull area using shoelace (in degrees², good enough for comparison)
  let area = 0
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length
    area += hull[i][0] * hull[j][1] - hull[j][0] * hull[i][1]
  }
  area = Math.abs(area) / 2
  // Convert to approximate km² using latitude-corrected degrees
  const avgLat = hull.reduce((s, p) => s + p[1], 0) / hull.length
  const kmPerDegLon = (Math.PI / 180) * HULL_EARTH_RADIUS_KM * Math.cos(avgLat * Math.PI / 180)
  const kmPerDegLat = (Math.PI / 180) * HULL_EARTH_RADIUS_KM
  const areaKm2 = area * kmPerDegLon * kmPerDegLat
  const radiusKm = (HULL_SPEED_KMH[mode] || 50) * (maxTimeMinutes / 60)
  const maxAreaKm2 = Math.PI * radiusKm * radiusKm
  return areaKm2 < maxAreaKm2 * 0.5 ? 'hull' : 'isochrone'
}

function addHullOutline(hull) {
  const coordinates = [...hull, hull[0]]
  map.addSource('demo-hull', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coordinates] },
      properties: {},
    },
  })
  map.addLayer({
    id: 'demo-hull-fill',
    type: 'fill',
    source: 'demo-hull',
    paint: { 'fill-color': HULL_COLOUR, 'fill-opacity': 0.06 },
  })
  map.addLayer({
    id: 'demo-hull-line',
    type: 'line',
    source: 'demo-hull',
    paint: {
      'line-color': HULL_COLOUR,
      'line-width': 2,
      'line-dasharray': [4, 4],
      'line-opacity': 0.7,
    },
  })
}

function fadeOutHull() {
  if (!map.getLayer('demo-hull-fill')) return
  let opacity = 0.06
  const interval = setInterval(() => {
    opacity -= 0.002
    if (opacity <= 0) {
      clearInterval(interval)
      removeHull()
      return
    }
    if (map.getLayer('demo-hull-fill')) {
      map.setPaintProperty('demo-hull-fill', 'fill-opacity', opacity)
    }
    if (map.getLayer('demo-hull-line')) {
      map.setPaintProperty('demo-hull-line', 'line-opacity', opacity * 10)
    }
  }, 20)
}

function removeHull() {
  for (const id of ['demo-hull-fill', 'demo-hull-line']) {
    if (map.getLayer(id)) map.removeLayer(id)
  }
  if (map.getSource('demo-hull')) map.removeSource('demo-hull')
}

function addRouteLayer(participantIndex, route) {
  const colour = COLOURS[participantIndex % COLOURS.length]
  const sourceId = `demo-route-${participantIndex}-${Date.now()}`
  const layerId = `${sourceId}-line`

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: route.geometry,
      properties: {
        participantIndex,
        durationMinutes: route.durationMinutes,
        distanceKm: route.distanceKm,
      },
    },
  })

  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': colour,
      'line-width': 3,
      'line-opacity': 0.8,
      'line-dasharray': [2, 2],
    },
  })

  // Named handler references so they can be removed in clearRouteLayers()
  const clickHandler = (e) => {
    e.originalEvent.stopPropagation()

    const label = interactiveMode
      ? interactiveParticipants[participantIndex]?.label ?? PARTICIPANT_LABELS[participantIndex]
      : currentScenario?.participants[participantIndex]?.label ?? PARTICIPANT_LABELS[participantIndex]

    const mins = route.durationMinutes.toFixed(1)
    const km = route.distanceKm.toFixed(1)

    let legsHtml = ''
    if (route.legs && route.legs.length > 0) {
      let cumKm = 0
      legsHtml = '<ol class="route-popup-legs">' + route.legs.map((leg, i) => {
        cumKm += leg.distanceKm
        const icon = getManoeuvreIcon(leg.type)
        const instruction = (leg.verbalInstruction && leg.verbalInstruction.length > leg.instruction.length)
          ? leg.verbalInstruction : leg.instruction
        const badges = renderBadges(leg)
        const streets = leg.streetNames ? `<div class="popup-streets">${esc(leg.streetNames.join(' / '))}</div>` : ''
        return `<li class="route-popup-step">
          <span class="popup-icon">${icon}</span>
          <div class="popup-step-content">
            <div class="popup-instruction">${esc(instruction)}</div>
            ${streets}
            ${badges}
            <div class="popup-meta">${leg.distanceKm.toFixed(2)} km · ${leg.durationMinutes.toFixed(1)} min — ${cumKm.toFixed(1)} of ${km} km</div>
          </div>
        </li>`
      }).join('') + '</ol>'
    }

    const html = `<div class="route-popup">
      <div class="route-popup-header">
        <span class="leg-dot" style="background:${colour}"></span>
        <span class="leg-info"><strong>${esc(label)}</strong> · ${mins} min · ${km} km</span>
      </div>
      ${legsHtml}
    </div>`

    if (routePopup) routePopup.remove()
    document.getElementById('map').classList.add('popup-open')
    routePopup = new maplibregl.Popup({ closeOnClick: true, className: 'route-popup-container' })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map)
    routePopup.on('close', () => {
      document.getElementById('map').classList.remove('popup-open')
    })
  }

  const mouseenterHandler = () => {
    map.getCanvas().style.cursor = 'pointer'
  }

  const mouseleaveHandler = () => {
    map.getCanvas().style.cursor = interactiveMode ? 'crosshair' : ''
  }

  // Click handler for directions popup
  map.on('click', layerId, clickHandler)

  // Cursor change on hover
  map.on('mouseenter', layerId, mouseenterHandler)
  map.on('mouseleave', layerId, mouseleaveHandler)

  routeLayers.push({ layerId, handlers: { click: clickHandler, mouseenter: mouseenterHandler, mouseleave: mouseleaveHandler } })
}

async function showRoutesForVenue(venue) {
  clearRouteLayers()
  const thisRoute = ++routeGeneration

  if (interactiveMode && interactiveEngine) {
    // Live route computation
    let firstPaymentErr = null
    const promises = interactiveParticipants.map((p, i) =>
      interactiveEngine.computeRoute(
        { lat: p.lat, lon: p.lon },
        { lat: venue.lat, lon: venue.lon },
        selectedMode
      ).then(route => ({ index: i, route }))
        .catch(err => {
          if (err instanceof ValhallaError && err.status === 402 && !firstPaymentErr) {
            firstPaymentErr = err
          }
          return null
        })
    )

    const results = await Promise.all(promises)
    if (routeGeneration !== thisRoute) return // stale — user selected a different venue
    if (firstPaymentErr) {
      handlePaymentRequired(firstPaymentErr)
      return
    }
    currentRoutes.clear()
    for (const result of results) {
      if (result) {
        addRouteLayer(result.index, result.route)
        currentRoutes.set(result.index, result.route)
      }
    }
    renderDirections()
  } else if (currentScenario?.routes) {
    // Pre-baked routes from scenario
    currentRoutes.clear()
    const venueRoutes = currentScenario.routes[venue.name]
    if (venueRoutes) {
      venueRoutes.forEach((route, i) => {
        if (route) {
          addRouteLayer(i, route)
          currentRoutes.set(i, route)
        }
      })
    }
    renderDirections()
  }
}

// --- Scenario loading ---

async function loadScenario(name) {
  const thisAnimation = ++animationId

  const res = await fetch(`scenarios/${name}.json`)
  if (!res.ok) {
    document.getElementById('results-list').innerHTML =
      `<div class="result-card"><div class="result-info">Failed to load scenario: ${esc(name)}</div></div>`
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
  clearRouteLayers()
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
      paint: { 'fill-color': INTERSECTION_COLOUR, 'fill-opacity': 0.12 },
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
  if (!currentScenario?.venues) return
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
  let matchedVenue = null
  for (const { marker, venue } of venueMarkers) {
    const el = marker.getElement()
    const match = venue.name === name
    el.classList.toggle('selected', match)
    if (match) {
      map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 13), duration: 600 })
      matchedVenue = venue
    }
  }

  // Show routes to this venue
  if (matchedVenue) {
    showRoutesForVenue(matchedVenue)
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
  if (!s) return
  const isoCount = s.isochrones ? s.isochrones.length : 0
  for (let i = 0; i < isoCount; i++) {
    const id = `demo-iso-${i}`
    if (i === index) {
      map.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.25)
    } else {
      map.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.04)
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
  const isoCount = s.isochrones ? s.isochrones.length : 0
  for (let i = 0; i < isoCount; i++) {
    const id = `demo-iso-${i}`
    try {
      map.setPaintProperty(`${id}-fill`, 'fill-opacity', 0.12)
    } catch (_) { /* layer may not exist yet during animation */ }
  }
}

function clearSelection() {
  document.querySelectorAll('.result-card.selected').forEach(c => c.classList.remove('selected'))
  for (const { marker } of venueMarkers) {
    marker.getElement().classList.remove('selected')
  }
  clearParticipantHighlight()
  clearRouteLayers()
  document.querySelectorAll('.directions-section').forEach(el => el.remove())
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

  // Intersection — apply the same relative-area filter as interactive mode
  // to discard degenerate slivers that show up as white lines
  const allIntersection = s.intersection.filter(p => polygonArea(p) > 0.0001)
  const largestArea = allIntersection.length > 0
    ? Math.max(...allIntersection.map(polygonArea))
    : 0
  const intersection = largestArea > 0
    ? allIntersection.filter(p => polygonArea(p) >= largestArea * 0.1)
    : allIntersection
  addIntersection(intersection)
  markStep('intersection', intersection.length > 1 ? intersection.length : undefined)
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

function renderDirections() {
  // Remove any existing directions sections
  document.querySelectorAll('.directions-section').forEach(el => el.remove())

  if (currentRoutes.size === 0) return

  // Find the selected result card
  const selectedCard = document.querySelector('.result-card.selected')
  if (!selectedCard) return

  // Build directions HTML
  const participants = interactiveMode
    ? interactiveParticipants
    : (currentScenario?.participants ?? [])

  // Enrich result-times spans with ride distance from computed routes
  const timeSpans = selectedCard.querySelectorAll('.result-times span')
  for (const span of timeSpans) {
    const text = span.textContent
    // Match "Label: Xmin" and append distance
    for (const [index, route] of currentRoutes) {
      const label = participants[index]?.label ?? PARTICIPANT_LABELS[index]
      if (text.startsWith(label + ':') && !text.includes('km')) {
        span.textContent = `${label}: ${route.durationMinutes.toFixed(1)}min / ${route.distanceKm.toFixed(1)}km`
      }
    }
  }

  const section = document.createElement('div')
  section.className = 'directions-section'

  for (const [index, route] of currentRoutes) {
    const label = participants[index]?.label ?? PARTICIPANT_LABELS[index]
    const colour = COLOURS[index % COLOURS.length]
    const hasLegs = route.legs && route.legs.length > 0

    const block = document.createElement('div')
    block.className = 'directions-block'

    const header = document.createElement('button')
    header.className = 'directions-header'
    header.innerHTML = `
      <span class="directions-dot" style="background:${colour}"></span>
      <span class="directions-label">${esc(label)}</span>
      <span class="directions-summary">${route.durationMinutes.toFixed(1)} min · ${route.distanceKm.toFixed(1)} km</span>
      <span class="directions-toggle">${hasLegs ? '▶' : ''}</span>
    `

    block.appendChild(header)

    if (hasLegs) {
      const body = document.createElement('div')
      body.className = 'directions-body collapsed'

      const timeline = document.createElement('div')
      timeline.className = 'directions-timeline'
      timeline.style.setProperty('--route-colour', colour)

      let cumulativeKm = 0
      let cumulativeMin = 0

      route.legs.forEach((leg, i) => {
        cumulativeKm += leg.distanceKm
        cumulativeMin += leg.durationMinutes

        const step = document.createElement('div')
        step.className = 'directions-step'

        const stepNum = i + 1
        const icon = getManoeuvreIcon(leg.type)

        // Instruction: prefer verbalInstruction if available and longer
        const instructionText = (leg.verbalInstruction && leg.verbalInstruction.length > leg.instruction.length)
          ? leg.verbalInstruction
          : leg.instruction

        // Street names (only show if not already present in the instruction)
        let streetsHtml = ''
        const names = leg.streetNames ?? leg.beginStreetNames
        if (names && names.length > 0) {
          const joined = names.join(' / ')
          if (!instructionText.includes(joined) && !names.every(n => instructionText.includes(n))) {
            streetsHtml = `<div class="step-streets">${esc(joined)}</div>`
          }
        }

        // Badges
        const badgesHtml = renderBadges(leg)

        // Progress line
        const progressHtml = `<div class="step-meta">
          ${leg.distanceKm.toFixed(2)} km · ${leg.durationMinutes.toFixed(1)} min
          <span class="step-progress">${cumulativeKm.toFixed(1)} of ${route.distanceKm.toFixed(1)} km</span>
        </div>`

        step.innerHTML = `
          <div class="step-marker">
            <span class="step-number">${stepNum}</span>
          </div>
          <div class="step-icon">${icon}</div>
          <div class="step-content">
            <div class="step-instruction">${esc(instructionText)}</div>
            ${streetsHtml}
            ${badgesHtml}
            ${progressHtml}
          </div>
        `

        timeline.appendChild(step)
      })

      body.appendChild(timeline)
      block.appendChild(body)

      header.addEventListener('click', (e) => {
        e.stopPropagation()
        const isCollapsed = body.classList.contains('collapsed')
        body.classList.toggle('collapsed')
        header.querySelector('.directions-toggle').textContent = isCollapsed ? '▼' : '▶'
      })
    }

    section.appendChild(block)
  }

  // Append directions section inside the selected result card
  selectedCard.appendChild(section)

  // Scroll directions into view on mobile so ride distance is visible
  requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

function displayResults() {
  const s = currentScenario
  if (!s || !s.venues) return
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

function updateInteractiveCodePanel() {
  if (!interactiveResults) return

  const s = interactiveResults
  const participantLines = interactiveParticipants
    .map(p => `    { lat: ${p.lat.toFixed(5)}, lon: ${p.lon.toFixed(5)}, label: '${p.label}' },`)
    .join('\n')

  const code = `import { findRendezvous, ValhallaEngine } from 'rendezvous-kit'

const engine = new ValhallaEngine('${VALHALLA_URL}')

const results = await findRendezvous(engine, {
  participants: [
${participantLines}
  ],
  mode: '${selectedMode}',
  maxTimeMinutes: ${selectedTime},
  venueTypes: ${JSON.stringify(getSelectedVenueTypes())},
  fairness: '${currentFairness}',
})

console.log(results)
// → ${s.venues.length} ranked venue suggestions with travel times`

  document.getElementById('code-content').textContent = code
}

// --- Start ---

init()
