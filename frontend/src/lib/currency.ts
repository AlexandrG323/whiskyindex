export type Currency = 'rub' | 'usd'

const STORAGE_KEY = 'whiskyindex:currency'

export function loadCurrency(): Currency {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'usd' || stored === 'rub') return stored
  } catch {
    // Private mode — fall through to default.
  }
  return 'rub'
}

export function saveCurrency(currency: Currency) {
  try {
    localStorage.setItem(STORAGE_KEY, currency)
  } catch {
    // Private mode / quota — keep the in-memory choice for this session.
  }
}
