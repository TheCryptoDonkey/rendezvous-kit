// demo.js — rendezvous-kit interactive demo
// Uses global maplibregl from CDN script tag

import { ValhallaEngine, ValhallaError, intersectPolygonsAll, searchVenues }
  from 'https://esm.sh/rendezvous-kit@1.10.0'

import qrcode from 'https://esm.sh/qrcode-generator@1.4.4'

const COLOURS = ['#ff44ff', '#00e5ff', '#00ff88', '#ffaa00', '#aa55ff']
const INTERSECTION_COLOUR = '#ffffff'

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
let routeLayers = []              // track route layers for cleanup: { layerId, handlers: { click, mouseenter, mouseleave } }
let routePopup = null             // active route popup
let paymentPollTimer = null       // setInterval ID
const PARTICIPANT_LABELS = ['A', 'B', 'C', 'D', 'E']
const VALHALLA_URL = 'https://routing.trotters.cc'
const L402_STORAGE_KEY = 'rendezvous-l402'

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
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [-2.59, 51.45],
    zoom: 12,
  })

  map.on('load', () => loadScenario('bristol'))

  // Map click — interactive mode adds markers, showcase mode clears selection
  map.on('click', (e) => {
    if (interactiveMode) {
      if (interactiveParticipants.length < 5) {
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

  // Restore L402 token and create engine
  interactiveEngine = createEngine()
}

// --- Mode switching ---

function switchMode(isInteractive) {
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
  resetFindButton()
}

// --- Interactive controls helpers ---

function getSelectedVenueTypes() {
  const checkboxes = document.querySelectorAll('.venue-checkboxes input[type="checkbox"]')
  const types = []
  checkboxes.forEach(cb => {
    if (cb.checked) types.push(cb.value)
  })
  return types
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

  try {
    // Step 1: Compute isochrones
    const isochrones = []
    for (let i = 0; i < interactiveParticipants.length; i++) {
      if (animationId !== thisAnimation) return
      const p = interactiveParticipants[i]
      const iso = await interactiveEngine.computeIsochrone(
        { lat: p.lat, lon: p.lon },
        selectedMode,
        selectedTime
      )
      isochrones.push(iso.polygon)
      addIsochrone(i, iso.polygon)
      markStep('isochrones', i + 1, interactiveParticipants.length)
    }

    if (animationId !== thisAnimation) return

    // Step 2: Intersect polygons
    const intersection = intersectPolygonsAll(isochrones)
    if (intersection.length === 0) {
      showError('No common reachable area found. Try increasing the time budget or moving participants closer together.')
      resetFindButton()
      return
    }
    addIntersection(intersection)
    markStep('intersection', intersection.length > 1 ? intersection.length : undefined)

    if (animationId !== thisAnimation) return

    // Step 3: Search venues
    const searchArea = envelopePolygon(intersection)
    const venues = await searchVenues(searchArea, venueTypes)

    if (venues.length === 0) {
      showError('No venues found in the overlap area. Try different venue types or a larger time budget.')
      resetFindButton()
      return
    }
    markStep('venues', venues.length)

    if (animationId !== thisAnimation) return

    // Step 4: Compute route matrix for travel times
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
      // Filter out venues with unreachable travel times
      return Object.values(v.travelTimes).every(t => t >= 0)
    })

    if (scoredVenues.length === 0) {
      showError('All venues have unreachable routes. Try a larger time budget.')
      resetFindButton()
      return
    }

    // Build scenario-compatible object for displayResults
    currentScenario = {
      participants: origins,
      isochrones,
      intersection,
      venues: scoredVenues,
      mode: selectedMode,
      maxTimeMinutes: selectedTime,
      venueTypes,
    }
    interactiveResults = currentScenario

    addVenueMarkers(scoredVenues)
    displayResults()
    markStep('scored')

    // Fit map
    fitToScenario(currentScenario)

    // Update code panel
    updateInteractiveCodePanel()

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
}

function showPaymentUI(bolt11, macaroon, paymentHash, amountSats) {
  const panel = document.getElementById('payment-panel')
  panel.classList.remove('hidden', 'paid')

  // Generate QR code
  const qr = qrcode(0, 'L')
  qr.addData(bolt11.toUpperCase())
  qr.make()
  const qrSvg = qr.createSvgTag({ cellSize: 4, margin: 2 })

  panel.innerHTML = `
    <h4>Lightning Payment Required</h4>
    <div class="amount">${amountSats != null ? esc(String(amountSats)) + ' sats' : 'Amount in invoice'}</div>
    <div class="qr-container">${qrSvg}</div>
    <button class="copy-btn">Copy invoice</button>
    <button class="cancel-btn">Cancel</button>
    <div class="status">Waiting for payment...</div>
  `

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
    try { map.removeLayer(layerId) } catch (_) { /* already removed */ }
  }

  // Remove corresponding sources
  for (const { layerId } of routeLayers) {
    const sourceId = layerId.replace(/-line$/, '')
    try { map.removeSource(sourceId) } catch (_) { /* already removed */ }
  }

  routeLayers = []
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

    const html = `<div class="route-popup">
      <div class="leg">
        <span class="leg-dot" style="background:${colour}"></span>
        <span class="leg-info"><strong>${esc(label)}</strong><br>${mins} min &middot; ${km} km</span>
      </div>
    </div>`

    if (routePopup) routePopup.remove()
    routePopup = new maplibregl.Popup({ closeOnClick: true, className: 'route-popup-container' })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map)
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

  if (interactiveMode && interactiveEngine) {
    // Live route computation
    const promises = interactiveParticipants.map((p, i) =>
      interactiveEngine.computeRoute(
        { lat: p.lat, lon: p.lon },
        { lat: venue.lat, lon: venue.lon },
        selectedMode
      ).then(route => ({ index: i, route }))
        .catch(err => {
          console.error(`Route computation failed for participant ${p.label}:`, err)
          return null
        })
    )

    const results = await Promise.all(promises)
    for (const result of results) {
      if (result) {
        addRouteLayer(result.index, result.route)
      }
    }
  } else if (currentScenario?.routes) {
    // Pre-baked routes from scenario
    const venueRoutes = currentScenario.routes[venue.name]
    if (venueRoutes) {
      venueRoutes.forEach((route, i) => {
        if (route) addRouteLayer(i, route)
      })
    }
  }
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
  const isoCount = s.isochrones ? s.isochrones.length : 0
  for (let i = 0; i < isoCount; i++) {
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
  clearRouteLayers()
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
