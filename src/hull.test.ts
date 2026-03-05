import { describe, it, expect } from 'vitest'
import { bufferHull, chooseStrategy, SPEED_KMH } from './hull.js'

describe('SPEED_KMH', () => {
  it('has entries for all transport modes', () => {
    expect(SPEED_KMH.drive).toBe(50)
    expect(SPEED_KMH.cycle).toBe(15)
    expect(SPEED_KMH.walk).toBe(5)
    expect(SPEED_KMH.public_transit).toBe(30)
  })
})

describe('bufferHull', () => {
  const square: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]

  it('returns a polygon with same vertex count as input', () => {
    const result = bufferHull(square, 10)
    expect(result).toHaveLength(square.length)
  })

  it('output vertices are further from centroid than input', () => {
    const result = bufferHull(square, 50)
    const cx = 0.5, cy = 0.5
    for (let i = 0; i < square.length; i++) {
      const dIn = Math.hypot(square[i][0] - cx, square[i][1] - cy)
      const dOut = Math.hypot(result[i][0] - cx, result[i][1] - cy)
      expect(dOut).toBeGreaterThan(dIn)
    }
  })

  it('buffer by 0 returns approximately the original hull', () => {
    const result = bufferHull(square, 0)
    for (let i = 0; i < square.length; i++) {
      expect(result[i][0]).toBeCloseTo(square[i][0], 5)
      expect(result[i][1]).toBeCloseTo(square[i][1], 5)
    }
  })

  it('larger buffer produces vertices further out', () => {
    const small = bufferHull(square, 10)
    const large = bufferHull(square, 100)
    const cx = 0.5, cy = 0.5
    for (let i = 0; i < square.length; i++) {
      const dSmall = Math.hypot(small[i][0] - cx, small[i][1] - cy)
      const dLarge = Math.hypot(large[i][0] - cx, large[i][1] - cy)
      expect(dLarge).toBeGreaterThan(dSmall)
    }
  })
})

describe('chooseStrategy', () => {
  it('returns "hull" for tightly clustered participants', () => {
    const participants = [
      { lat: 51.50, lon: -0.12 },
      { lat: 51.51, lon: -0.11 },
      { lat: 51.505, lon: -0.115 },
    ]
    expect(chooseStrategy(participants, 'drive', 30)).toBe('hull')
  })

  it('returns "isochrone" for widely spread participants', () => {
    const participants = [
      { lat: 51.5, lon: -0.1 },
      { lat: 52.5, lon: -1.9 },
      { lat: 53.5, lon: -2.2 },
    ]
    expect(chooseStrategy(participants, 'drive', 30)).toBe('isochrone')
  })

  it('returns "hull" for walking with nearby participants', () => {
    const participants = [
      { lat: 51.500, lon: -0.120 },
      { lat: 51.504, lon: -0.118 },
    ]
    expect(chooseStrategy(participants, 'walk', 15)).toBe('hull')
  })

  it('returns "isochrone" for walking with far participants', () => {
    const participants = [
      { lat: 51.50, lon: -0.12 },
      { lat: 51.59, lon: -0.12 },
    ]
    expect(chooseStrategy(participants, 'walk', 15)).toBe('isochrone')
  })
})
