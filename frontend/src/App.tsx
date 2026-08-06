import { useEffect, useState } from 'react'

/** Matches ProductYearlyPriceDto — GET /api/v1/products/cart */
type CartProduct = {
  id: string
  name: string
  imageUrl: string | null
  price: number | null
  priceStatus: 'actual' | 'not_yet' | 'unavailable'
  availableFrom: number | null
  currency: 'RUB' | 'USD'
}

/** Matches StockYearlyPriceDto — GET /api/v1/stocks */
type Stock = {
  id: string
  symbol: string
  companyName: string
  imageUrl: string | null
  price: number | null
  priceStatus: 'actual' | 'carried' | 'not_listed' | 'unavailable'
  priceYear: number | null
  listedFrom: number | null
  listedTo: number | null
  displayCurrency: 'RUB' | 'USD'
  importStatus: 'pending' | 'importing' | 'ready' | 'failed'
}

// 1998 is the ruble denomination — before it prices are in millions of old
// rubles. 2007 stays the default: it is the first year the whole curated
// stock set has real data (every Russian share starts 2006 or later).
const MIN_YEAR = 1998
const MAX_YEAR = 2026
const DEFAULT_YEAR = 2007
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${url} → ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

function money(amount: number, currency: 'RUB' | 'USD') {
  const digits = Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    // Either both kopecks or none: "12,90 ₽" not "12,9 ₽", but "1 442 ₽"
    // rather than "1 442,00 ₽". A half-filled kopeck column reads as a bug.
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

/**
 * A stock with no price for the selected year is not automatically an error.
 * "Не торговалась" (listed later) and a carried-forward delisting price are
 * facts about the company, and reading either as a failed import misleads.
 */
function StockPrice({ stock }: { stock: Stock }) {
  if (stock.priceStatus === 'not_listed') {
    return (
      <span className="price muted-price">
        не торговалась
        {stock.listedFrom !== null && <small>с {stock.listedFrom}</small>}
      </span>
    )
  }

  if (stock.price === null) {
    return <span className="price muted-price">нет данных</span>
  }

  return (
    <span className="price">
      {money(stock.price, stock.displayCurrency)}
      {stock.priceStatus === 'carried' && stock.priceYear !== null && (
        <small>
          {stock.listedTo === stock.priceYear ? 'делистинг' : 'цена'} {stock.priceYear}
        </small>
      )}
    </span>
  )
}

export default function App() {
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [products, setProducts] = useState<CartProduct[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [error, setError] = useState<string | null>(null)
  // A cold year blocks server-side while prices import from MOEX/Yahoo, which
  // can take seconds. Without this the page just sat empty and looked broken.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setLoading(true)
    Promise.all([
      getJson<CartProduct[]>(`/api/v1/products/cart?year=${year}`),
      getJson<Stock[]>(`/api/v1/stocks?year=${year}`),
    ])
      .then(([cart, listed]) => {
        // A slow year's response must not overwrite a newer selection.
        if (cancelled) return
        setProducts(cart)
        // Priced stocks first; the ones that were not trading yet sink to the
        // bottom instead of interrupting the list alphabetically.
        setStocks(
          [...listed].sort((a, b) => {
            const rank = (s: Stock) => (s.price === null ? 1 : 0)
            return rank(a) - rank(b) || a.symbol.localeCompare(b.symbol)
          }),
        )
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [year])

  // Products that did not exist yet are excluded rather than counted as zero.
  const available = products.filter((p) => p.price !== null)
  const cartTotal = available.reduce((sum, p) => sum + (p.price ?? 0), 0)
  const missing = products.length - available.length

  return (
    <main className={loading ? 'is-loading' : undefined}>
      <header className="masthead">
        <img src="/icons/logo.webp" alt="" width={48} height={48} />
        <div>
          <h1>Whisky Index</h1>
          <p className="muted">Бутылка или портфель?</p>
        </div>
        <label className="year-picker">
          Год
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <p className="error">Не удалось загрузить данные: {error}</p>}

      {loading && products.length === 0 && stocks.length === 0 && (
        <p className="loading">
          <span className="spinner" aria-hidden="true" />
          Загружаем цены за {year}… первый год импортируется с MOEX и Yahoo
        </p>
      )}

      <section>
        <h2>
          Корзина скуфа <span className="muted">({year})</span>
        </h2>
        <ul className="grid">
          {products.map((p) => (
            <li key={p.id} className={p.price === null ? 'card card-muted' : 'card'}>
              {p.imageUrl && <img src={p.imageUrl} alt="" width={72} height={72} loading="lazy" />}
              <span className="name">{p.name}</span>
              {p.price !== null ? (
                <span className="price">{money(p.price, p.currency)}</span>
              ) : (
                <span className="price muted-price">
                  {p.priceStatus === 'not_yet' ? 'ещё не продавался' : 'нет данных'}
                  {p.availableFrom !== null && <small>с {p.availableFrom}</small>}
                </span>
              )}
            </li>
          ))}
        </ul>
        {available.length > 0 && (
          <p className="total">
            Итого: <strong>{money(cartTotal, available[0].currency)}</strong>
            {missing > 0 && <small> — {missing} поз. ещё не в продаже</small>}
          </p>
        )}
      </section>

      <section>
        <h2>
          Акции <span className="muted">({year})</span>
        </h2>
        <ul className="rows">
          {stocks.map((s) => (
            <li key={s.id}>
              {s.imageUrl ? (
                <img src={s.imageUrl} alt="" width={28} height={28} loading="lazy" />
              ) : (
                <span className="logo-placeholder">{s.symbol.slice(0, 2)}</span>
              )}
              <span className="symbol">{s.symbol}</span>
              <span>{s.companyName}</span>
              <StockPrice stock={s} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
