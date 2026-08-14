/**
 * Shared fetch helpers with a session-lifetime response cache.
 *
 * Every figure this app shows is historical — prices for 2007 do not change
 * while the tab is open — so navigating between pages should never re-hit the
 * API for something already loaded. The cache stores the in-flight promise
 * rather than the resolved value, which also collapses duplicate concurrent
 * requests (Home asks for the same exchange rate the masthead just asked for).
 */

const cache = new Map<string, Promise<unknown>>()

function remember<T>(key: string, run: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit) return hit as Promise<T>

  const request = run().catch((error: unknown) => {
    // A failure must not be remembered, or the page can never recover from a
    // blip without a full reload.
    cache.delete(key)
    throw error
  })

  cache.set(key, request)
  return request
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`${url} → ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

export function getJson<T>(url: string): Promise<T> {
  return remember(`GET ${url}`, () => json<T>(url))
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  const payload = JSON.stringify(body)
  return remember(`POST ${url} ${payload}`, () =>
    json<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }),
  )
}

/** Uncached fetch — for resolve/poll, where the same URL's status changes. */
export function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  return json<T>(url, init)
}
