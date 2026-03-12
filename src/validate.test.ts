import { describe, it, expect } from 'vitest'
import { validateHttpUrl, validateTimeout, truncateBody, safeJson } from './validate.js'

describe('validateHttpUrl', () => {
  it('accepts valid http URL', () => {
    expect(validateHttpUrl('http://localhost:8002', 'test')).toBe('http://localhost:8002')
  })

  it('accepts valid https URL', () => {
    expect(validateHttpUrl('https://api.example.com', 'test')).toBe('https://api.example.com')
  })

  it('strips trailing slash', () => {
    expect(validateHttpUrl('http://localhost:8002/', 'test')).toBe('http://localhost:8002')
  })

  it('rejects non-http protocols', () => {
    expect(() => validateHttpUrl('ftp://example.com', 'test')).toThrow('must use http or https')
  })

  it('rejects file:// URLs', () => {
    expect(() => validateHttpUrl('file:///etc/passwd', 'test')).toThrow('must use http or https')
  })

  it('rejects invalid URLs', () => {
    expect(() => validateHttpUrl('not a url', 'test')).toThrow('invalid URL')
  })

  it('includes label in error message', () => {
    expect(() => validateHttpUrl('ftp://x', 'MyEngine baseUrl')).toThrow('MyEngine baseUrl')
  })
})

describe('validateTimeout', () => {
  it('returns default when undefined', () => {
    expect(validateTimeout(undefined, 'test')).toBe(30_000)
  })

  it('accepts valid timeout', () => {
    expect(validateTimeout(10_000, 'test')).toBe(10_000)
  })

  it('clamps below minimum to 1000ms', () => {
    expect(validateTimeout(500, 'test')).toBe(1_000)
  })

  it('clamps above maximum to 120000ms', () => {
    expect(validateTimeout(300_000, 'test')).toBe(120_000)
  })

  it('throws for zero', () => {
    expect(() => validateTimeout(0, 'test')).toThrow(RangeError)
  })

  it('throws for negative', () => {
    expect(() => validateTimeout(-1, 'test')).toThrow(RangeError)
  })

  it('throws for NaN', () => {
    expect(() => validateTimeout(NaN, 'test')).toThrow(RangeError)
  })

  it('throws for Infinity', () => {
    expect(() => validateTimeout(Infinity, 'test')).toThrow(RangeError)
  })

  it('respects custom default', () => {
    expect(validateTimeout(undefined, 'test', 15_000)).toBe(15_000)
  })

  it('includes label in error', () => {
    expect(() => validateTimeout(-1, 'MyEngine')).toThrow('MyEngine')
  })
})

describe('truncateBody', () => {
  it('returns short strings unchanged', () => {
    expect(truncateBody('hello')).toBe('hello')
  })

  it('truncates long strings', () => {
    const long = 'x'.repeat(300)
    const result = truncateBody(long)
    expect(result.length).toBe(201) // 200 chars + ellipsis
    expect(result.endsWith('…')).toBe(true)
  })

  it('respects custom maxLen', () => {
    expect(truncateBody('hello world', 5)).toBe('hello…')
  })
})

describe('safeJson', () => {
  it('parses valid JSON response', async () => {
    const response = new Response('{"key": "value"}')
    const result = await safeJson<{ key: string }>(response, 'test')
    expect(result).toEqual({ key: 'value' })
  })

  it('throws descriptive error for non-JSON response', async () => {
    const response = new Response('<html>not json</html>')
    // Consume the body first to simulate a response that fails JSON parsing
    // Actually, Response can only be consumed once, so we need a response
    // whose body is not valid JSON
    const badResponse = new Response('this is not json {{{')
    await expect(safeJson(badResponse, 'MyEngine')).rejects.toThrow('MyEngine: response body is not valid JSON')
  })
})
