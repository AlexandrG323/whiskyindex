const STORAGE_KEY = 'whiskyindex:customStocks'

export type CustomStock = {
  id: string
  symbol: string
  exchange: string
  /** Optional display name, local to this browser. */
  customName?: string
}

/** Identity of a listing — same ticker can trade on more than one exchange. */
export function listingKey(symbol: string, exchange: string) {
  return `${symbol.trim().toUpperCase()}|${exchange.trim().toUpperCase()}`
}

function isCustomStock(value: unknown): value is CustomStock {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  if (
    typeof entry.id !== 'string' ||
    entry.id.length === 0 ||
    typeof entry.symbol !== 'string' ||
    typeof entry.exchange !== 'string'
  ) {
    return false
  }
  if (entry.customName !== undefined && typeof entry.customName !== 'string') return false
  return true
}

function dedupe(entries: CustomStock[]): CustomStock[] {
  const seenIds = new Set<string>()
  const seenListings = new Set<string>()
  const result: CustomStock[] = []
  for (const entry of entries) {
    const key = listingKey(entry.symbol, entry.exchange)
    if (seenIds.has(entry.id) || seenListings.has(key)) continue
    seenIds.add(entry.id)
    seenListings.add(key)
    result.push(entry)
  }
  return result
}

export function loadCustomStocks(): CustomStock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return dedupe(parsed.filter(isCustomStock))
  } catch {
    return []
  }
}

export function saveCustomStock(entry: CustomStock): CustomStock[] {
  const current = loadCustomStocks()
  const key = listingKey(entry.symbol, entry.exchange)
  if (
    current.some(
      (stock) => stock.id === entry.id || listingKey(stock.symbol, stock.exchange) === key,
    )
  ) {
    return current
  }
  const next = [...current, entry]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode / quota — keep the in-memory list for this session.
  }
  return next
}

export function customStockIds(stocks = loadCustomStocks()): string[] {
  return stocks.map((stock) => stock.id)
}

export function removeCustomStock(id: string): CustomStock[] {
  const next = loadCustomStocks().filter((stock) => stock.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode / quota — keep the in-memory list for this session.
  }
  return next
}

export function replaceCustomStocks(entries: CustomStock[]): CustomStock[] {
  const next = dedupe(entries)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode / quota — keep the in-memory list for this session.
  }
  return next
}
