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
