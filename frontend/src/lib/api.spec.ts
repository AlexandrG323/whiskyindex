import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchJson, getJson } from './api'

let seq = 0

function uniqueUrl() {
  seq += 1
  return `/api/v1/fixture-${seq}`
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('getJson', () => {
  it('caches a successful GET so the second call does not hit fetch', async () => {
    const url = uniqueUrl()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getJson(url)).resolves.toEqual({ ok: true })
    await expect(getJson(url)).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not remember a failed request, so a retry can succeed', async () => {
    const url = uniqueUrl()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'boom' }, 500))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getJson(url)).rejects.toThrow('boom')
    await expect(getJson(url)).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('fetchJson', () => {
  it('does not cache, so the same URL is fetched every time', async () => {
    const url = uniqueUrl()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ n: 1 }))
      .mockResolvedValueOnce(jsonResponse({ n: 2 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchJson(url)).resolves.toEqual({ n: 1 })
    await expect(fetchJson(url)).resolves.toEqual({ n: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
