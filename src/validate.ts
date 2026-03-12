/** Validate that a string is an HTTP(S) URL. Returns the URL with trailing slash stripped. */
export function validateHttpUrl(url: string, label: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new TypeError(`${label}: invalid URL "${url}"`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError(`${label}: must use http or https, got "${parsed.protocol}"`)
  }
  return url.replace(/\/$/, '')
}

/** Validate and clamp a timeout value in milliseconds. Returns clamped value (1000–120000). */
export function validateTimeout(ms: number | undefined, label: string, defaultMs = 30_000): number {
  const val = ms ?? defaultMs
  if (!Number.isFinite(val) || val <= 0) {
    throw new RangeError(`${label}: timeoutMs must be a positive finite number, got ${val}`)
  }
  return Math.max(1_000, Math.min(120_000, Math.round(val)))
}

/** Truncate a string for use in error messages. */
export function truncateBody(text: string, maxLen = 200): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

/** Parse JSON from a Response, throwing a descriptive error on failure. */
export async function safeJson<T>(res: Response, context: string): Promise<T> {
  try {
    return await res.json() as T
  } catch {
    throw new Error(`${context}: response body is not valid JSON`)
  }
}
