import { useEffect, useMemo, useState } from 'react'
import {
  EquivalentsPanel,
  pickTopGrowthStock,
  RankingRow,
} from '../components/compare/ComparePanels'
import { GrowthChart } from '../components/compare/GrowthChart'
import { HorizontalScroller } from '../components/compare/HorizontalScroller'
import { StockPicker } from '../components/compare/StockPicker'
import type { CompareStock } from '../components/comparison/HeroComparison'
import '../components/compare/compare.css'
import '../components/comparison/comparison.css'

const MIN_YEAR = 1998
const MAX_YEAR = 2026
const DEFAULT_FROM = 2007
const DEFAULT_TO = 2026
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)

type CompareResponse = {
  from: number
  to: number
  currency: 'RUB' | 'USD'
  cart: { priceFrom: number; priceTo: number; growthPercent: number }
  stocks: CompareStock[]
}

type CartProduct = {
  id: string
  name: string
  imageUrl: string | null
  price: number | null
  currency: 'RUB' | 'USD'
}

type CartProductChange = CartProduct & {
  priceFrom: number | null
  priceTo: number | null
  growthPercent: number | null
}

type StockHistoryResponse = {
  id: string
  prices: { year: number; amount: number }[]
}

function formatGrowth(value: number) {
  const rounded = Math.round(value)
  const sign = rounded >= 0 ? '+' : ''
  return `${sign}${rounded.toLocaleString('ru-RU')}%`
}

function productGrowthPercent(priceFrom: number | null, priceTo: number | null): number | null {
  if (priceFrom === null || priceTo === null || priceFrom === 0) return null
  return ((priceTo - priceFrom) / priceFrom) * 100
}

function mergeCartProducts(fromCart: CartProduct[], toCart: CartProduct[]): CartProductChange[] {
  const fromById = new Map(fromCart.map((p) => [p.id, p]))
  return toCart.map((toProduct) => {
    const fromProduct = fromById.get(toProduct.id)
    const priceFrom = fromProduct?.price ?? null
    const priceTo = toProduct.price
    return {
      ...toProduct,
      priceFrom,
      priceTo,
      growthPercent: productGrowthPercent(priceFrom, priceTo),
    }
  })
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${url} → ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

export function ComparePage() {
  const [from, setFrom] = useState(DEFAULT_FROM)
  const [to, setTo] = useState(DEFAULT_TO)

  const [compare, setCompare] = useState<CompareResponse | null>(null)
  const [histories, setHistories] = useState<StockHistoryResponse[]>([])
  const [cartProducts, setCartProducts] = useState<CartProductChange[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [fromRate, setFromRate] = useState<number | null>(null)
  const [toRate, setToRate] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const setFromYear = (year: number) => {
    setFrom(year)
    if (year >= to) setTo(Math.min(MAX_YEAR, year + 1))
  }

  const setToYear = (year: number) => {
    setTo(year)
    if (year <= from) setFrom(Math.max(MIN_YEAR, year - 1))
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getJson<number>(`/api/v1/analytics/exchange-rate?year=${from}`).catch(() => null),
      getJson<number>(`/api/v1/analytics/exchange-rate?year=${to}`).catch(() => null),
    ]).then(([fromValue, toValue]) => {
      if (cancelled) return
      setFromRate(fromValue)
      setToRate(toValue)
    })

    return () => {
      cancelled = true
    }
  }, [from, to])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const compareUrl = `/api/v1/analytics/compare?from=${from}&to=${to}&currency=rub`

    Promise.all([
      getJson<CompareResponse>(compareUrl),
      getJson<CartProduct[]>(`/api/v1/products/cart?year=${from}`),
      getJson<CartProduct[]>(`/api/v1/products/cart?year=${to}`),
    ])
      .then(async ([data, cartFrom, cartTo]) => {
        if (cancelled) return

        setCompare(data)
        setCartProducts(mergeCartProducts(cartFrom, cartTo))
        setSelectedIds((prev) => {
          if (prev.size === 0) {
            return new Set(data.stocks.map((s) => s.id))
          }
          const next = new Set<string>()
          for (const stock of data.stocks) {
            if (prev.has(stock.id)) next.add(stock.id)
          }
          return next.size > 0 ? next : new Set(data.stocks.map((s) => s.id))
        })

        if (data.stocks.length === 0) {
          setHistories([])
          return
        }

        const batch = await postJson<StockHistoryResponse[]>('/api/v1/stocks/history', {
          ids: data.stocks.map((s) => s.id),
          from,
          to,
          currency: 'rub',
        })
        if (!cancelled) setHistories(batch)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setCompare(null)
          setCartProducts([])
          setHistories([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [from, to])

  const selectedStocks = useMemo(() => {
    if (!compare) return []
    return compare.stocks.filter((s) => selectedIds.has(s.id))
  }, [compare, selectedIds])

  const bestStock = useMemo(() => pickTopGrowthStock(selectedStocks), [selectedStocks])

  const chartHistories = useMemo(
    () =>
      histories.map((h) => ({
        id: h.id,
        label: h.id,
        color: '#fff',
        prices: h.prices,
      })),
    [histories],
  )

  const toggleStock = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const resetSelection = () => setSelectedIds(new Set())

  return (
    <div className={`compare-page${loading ? ' is-loading' : ''}`}>
      <header className="compare-intro">
        <h2>Что было выгоднее?</h2>
        <p>Сравните стоимость корзины скуфа с ростом акций за выбранный период.</p>
      </header>

      <div className="compare-period">
        <span className="compare-period-label">Выберите период</span>
        <div className="compare-period-controls">
          <div className="compare-year-block">
            <label className="compare-year-field">
              От
              <select value={from} onChange={(e) => setFromYear(Number(e.target.value))}>
                {YEARS.map((y) => (
                  <option key={y} value={y} disabled={y >= to}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <p className="compare-year-rate">
              {fromRate !== null ? `$1 = ${fromRate}₽` : '$1 = —'}
            </p>
          </div>
          <span className="compare-period-arrow" aria-hidden="true">
            →
          </span>
          <div className="compare-year-block">
            <label className="compare-year-field">
              До
              <select value={to} onChange={(e) => setToYear(Number(e.target.value))}>
                {YEARS.map((y) => (
                  <option key={y} value={y} disabled={y <= from}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <p className="compare-year-rate">{toRate !== null ? `$1 = ${toRate}₽` : '$1 = —'}</p>
          </div>
        </div>
      </div>

      {error && <p className="error">Не удалось загрузить сравнение: {error}</p>}

      {loading && !compare && (
        <p className="loading">
          <span className="spinner" aria-hidden="true" />
          Считаем корзину и акции за {from}–{to}…
        </p>
      )}

      {compare && !bestStock && selectedIds.size === 0 && (
        <p className="notice">Отметьте хотя бы одну акцию в списке.</p>
      )}

      {compare && (
        <div className="compare-main-grid">
          <StockPicker
            stocks={compare.stocks}
            selectedIds={selectedIds}
            onToggle={toggleStock}
            onReset={resetSelection}
          />

          <GrowthChart
            fromYear={compare.from}
            toYear={compare.to}
            cartFrom={compare.cart.priceFrom}
            cartTo={compare.cart.priceTo}
            stocks={selectedStocks}
            histories={chartHistories}
          />

          {bestStock ? (
            <EquivalentsPanel
              stock={bestStock}
              products={cartProducts.map((p) => ({
                id: p.id,
                name: p.name,
                price: p.priceTo,
              }))}
            />
          ) : (
            <aside className="compare-panel">
              <div className="compare-panel-header">
                <h3>На что хватило бы сегодня?</h3>
              </div>
              <p className="muted">Выберите акцию, чтобы посчитать эквиваленты.</p>
            </aside>
          )}
        </div>
      )}

      {compare && selectedStocks.length > 0 && (
        <RankingRow stocks={selectedStocks} cartGrowthPercent={compare.cart.growthPercent} />
      )}

      {cartProducts.length > 0 && (
        <section className="basket-section" aria-label="Состав корзины">
          <h3>Корзина скуфа: что внутри?</h3>
          <HorizontalScroller trackClassName="basket-strip" label="корзину">
            {cartProducts.map((p) => (
              <div
                key={p.id}
                className={`basket-strip-item${p.priceTo === null ? ' card-muted' : ''}`}
              >
                {p.imageUrl && (
                  <img src={p.imageUrl} alt="" width={56} height={56} loading="lazy" />
                )}
                <span className="name">{p.name}</span>
                {p.priceTo !== null ? (
                  <span className="price">{money(p.priceTo, p.currency)}</span>
                ) : (
                  <span className="price muted-price">нет данных</span>
                )}
                {p.growthPercent !== null ? (
                  <span
                    className={`basket-growth ${
                      p.growthPercent >= 0 ? 'growth' : 'growth-negative'
                    }`}
                  >
                    {formatGrowth(p.growthPercent)}
                  </span>
                ) : (
                  <span className="basket-growth muted-price">—</span>
                )}
              </div>
            ))}
          </HorizontalScroller>
        </section>
      )}
    </div>
  )
}
