import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddCustomStockDialog } from '../components/compare/AddCustomStockDialog'
import {
  EquivalentsPanel,
  pickTopGrowthStock,
  RankingRow,
} from '../components/compare/ComparePanels'
import { GrowthChart } from '../components/compare/GrowthChart'
import { HorizontalScroller } from '../components/compare/HorizontalScroller'
import { type StockAddedNotice, StockAddedToast } from '../components/compare/StockAddedToast'
import { ALL_EXCHANGES, type SkippedStock, StockPicker } from '../components/compare/StockPicker'
import { formatMoney } from '../components/comparison/comparisonUtils'
import type { CompareStock } from '../components/comparison/HeroComparison'
import { Loader } from '../components/ui/Loader'
import { Select } from '../components/ui/Select'
import { getJson, postJson } from '../lib/api'
import type { Currency } from '../lib/currency'
import {
  type CustomStock,
  customStockIds,
  listingKey,
  loadCustomStocks,
  removeCustomStock,
  replaceCustomStocks,
  saveCustomStock,
} from '../lib/customStocks'
import '../components/compare/compare.css'
import '../components/comparison/comparison.css'

const MIN_YEAR = 1998
const MAX_YEAR = 2026
const DEFAULT_FROM = 2007
const DEFAULT_TO = 2026
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)

/** One-tap spans people actually reach for, all running to the present. */
const PERIOD_PRESETS = [
  { label: 'С 1998', from: 1998 },
  { label: 'С 2007', from: 2007 },
  { label: 'С Крыма', from: 2014 },
  { label: 'С Ковида', from: 2020 },
  { label: 'СВО', from: 2022 },
  { label: 'За год', from: MAX_YEAR - 1 },
]

type CompareResponse = {
  from: number
  to: number
  currency: 'RUB' | 'USD'
  cart: { priceFrom: number; priceTo: number; growthPercent: number }
  stocks: CompareStock[]
  skipped: SkippedStock[]
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

/** 1 год / 2 года / 5 лет — Russian needs three forms, not two. */
function yearsLabel(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} год`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} года`
  return `${count} лет`
}

function stocksForExchange(stocks: CompareStock[], exchange: string) {
  if (exchange === ALL_EXCHANGES) return stocks
  return stocks.filter((stock) => stock.exchange === exchange)
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

interface ComparePageProps {
  currency: Currency
}

export function ComparePage({ currency }: ComparePageProps) {
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
  const [customStocks, setCustomStocks] = useState<CustomStock[]>(loadCustomStocks)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [exchangeFilter, setExchangeFilter] = useState(ALL_EXCHANGES)
  const [equivalentStockId, setEquivalentStockId] = useState<string | null>(null)
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null)
  const [pinnedProductId, setPinnedProductId] = useState<string | null>(null)
  const [addedNotice, setAddedNotice] = useState<StockAddedNotice | null>(null)
  const dismissAddedNotice = useCallback(() => setAddedNotice(null), [])
  const customIdsKey = customStockIds(customStocks).join(',')
  const customIdSet = useMemo(() => new Set(customStockIds(customStocks)), [customStocks])

  const setFromYear = (year: number) => {
    setFrom(year)
    if (year >= to) setTo(Math.min(MAX_YEAR, year + 1))
  }

  const setToYear = (year: number) => {
    setTo(year)
    if (year <= from) setFrom(Math.max(MIN_YEAR, year - 1))
  }

  // Presets set both ends at once, so they bypass the clamping the individual
  // setters do for each other.
  const applyPreset = (fromYear: number) => {
    setFrom(fromYear)
    setTo(MAX_YEAR)
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

    const compareUrlPromise = (async () => {
      const base = `/api/v1/analytics/compare?from=${from}&to=${to}&currency=${currency}`
      if (!customIdsKey) return base
      const curated = await getJson<{ id: string }[]>(
        `/api/v1/stocks?year=${to}&currency=${currency}&curated_only=true`,
      )
      const ids = [...new Set([...curated.map((s) => s.id), ...customIdsKey.split(',')])]
      return `${base}&stockIds=${ids.join(',')}`
    })()

    Promise.all([
      compareUrlPromise.then((url) => getJson<CompareResponse>(url)),
      getJson<CartProduct[]>(`/api/v1/products/cart?year=${from}&currency=${currency}`),
      getJson<CartProduct[]>(`/api/v1/products/cart?year=${to}&currency=${currency}`),
    ])
      .then(async ([data, cartFrom, cartTo]) => {
        if (cancelled) return

        setCompare({ ...data, skipped: data.skipped ?? [] })
        setCartProducts(mergeCartProducts(cartFrom, cartTo))
        setCustomStocks((prev) => {
          const known = new Set([
            ...data.stocks.map((stock) => stock.id),
            ...(data.skipped ?? []).map((stock) => stock.id),
          ])
          const kept = prev.filter((stock) => known.has(stock.id))
          return kept.length === prev.length ? prev : replaceCustomStocks(kept)
        })
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
          currency,
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
  }, [from, to, customIdsKey, currency])

  const customNames = useMemo(
    () =>
      new Map(
        customStocks.flatMap((stock) =>
          stock.customName ? [[stock.id, stock.customName] as const] : [],
        ),
      ),
    [customStocks],
  )

  const displayStocks = useMemo(() => {
    if (!compare) return []
    if (customNames.size === 0) return compare.stocks
    return compare.stocks.map((stock) => {
      const customName = customNames.get(stock.id)
      return customName ? { ...stock, companyName: customName } : stock
    })
  }, [compare, customNames])

  const displaySkipped = useMemo(() => {
    if (!compare) return []
    if (customNames.size === 0) return compare.skipped ?? []
    return (compare.skipped ?? []).map((stock) => {
      const customName = customNames.get(stock.id)
      return customName ? { ...stock, companyName: customName } : stock
    })
  }, [compare, customNames])

  const visibleStocks = useMemo(
    () => stocksForExchange(displayStocks, exchangeFilter),
    [displayStocks, exchangeFilter],
  )

  const selectedStocks = useMemo(
    () => visibleStocks.filter((s) => selectedIds.has(s.id)),
    [visibleStocks, selectedIds],
  )

  useEffect(() => {
    if (exchangeFilter === ALL_EXCHANGES) return
    const listed = displayStocks.some((stock) => stock.exchange === exchangeFilter)
    const skipped = displaySkipped.some((stock) => stock.exchange === exchangeFilter)
    if (listed || skipped) return
    setExchangeFilter(ALL_EXCHANGES)
  }, [displayStocks, displaySkipped, exchangeFilter])

  const existingListings = useMemo(() => {
    const listings = new Set<string>()
    for (const stock of customStocks) listings.add(listingKey(stock.symbol, stock.exchange))
    return listings
  }, [customStocks])

  const existingIds = useMemo(() => {
    const ids = new Set<string>(customIdSet)
    for (const stock of displayStocks) ids.add(stock.id)
    for (const stock of displaySkipped) ids.add(stock.id)
    return ids
  }, [customIdSet, displayStocks, displaySkipped])

  const bestStock = useMemo(() => pickTopGrowthStock(selectedStocks), [selectedStocks])
  const equivalentStock =
    selectedStocks.find((stock) => stock.id === equivalentStockId) ?? bestStock

  const fromOptions = useMemo(
    () => YEARS.map((y) => ({ value: y, label: String(y), disabled: y >= to })),
    [to],
  )
  const toOptions = useMemo(
    () => YEARS.map((y) => ({ value: y, label: String(y), disabled: y <= from })),
    [from],
  )

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

  // Doubles as "select all": once the visible list is empty the button's only
  // useful job is putting those rows back. Hidden exchanges keep their state.
  const resetSelection = () => {
    setSelectedIds((prev) => {
      const anyVisibleSelected = visibleStocks.some((stock) => prev.has(stock.id))
      if (anyVisibleSelected) {
        const next = new Set(prev)
        for (const stock of visibleStocks) next.delete(stock.id)
        return next
      }
      const next = new Set(prev)
      for (const stock of visibleStocks) next.add(stock.id)
      return next
    })
  }

  const applyExchangeFilter = (exchange: string) => {
    setExchangeFilter(exchange)
    setSelectedIds(new Set(stocksForExchange(displayStocks, exchange).map((stock) => stock.id)))
  }

  return (
    <div className={`compare-page${loading ? ' is-loading' : ''}`}>
      <header className="page-intro">
        <h2>Что было выгоднее?</h2>
        <p className="page-intro-lead">
          Выберите период и бумаги — увидите, как они росли против корзины скуфа и на что хватило бы
          вложений сегодня.
        </p>
      </header>

      <div className="compare-period">
        <span className="compare-period-label">Выберите период</span>

        <div className="compare-period-controls">
          <div className="compare-year-block">
            <Select
              value={from}
              options={fromOptions}
              onChange={setFromYear}
              ariaLabel="Год начала периода"
            />
            <p className="compare-year-rate">
              {fromRate !== null ? `$1 = ${fromRate}₽` : '$1 = —'}
            </p>
          </div>

          <span className="compare-period-arrow" aria-hidden="true">
            →
          </span>

          <div className="compare-year-block">
            <Select
              value={to}
              options={toOptions}
              onChange={setToYear}
              ariaLabel="Год окончания периода"
            />
            <p className="compare-year-rate">{toRate !== null ? `$1 = ${toRate}₽` : '$1 = —'}</p>
          </div>
        </div>

        <p className="compare-period-span">{yearsLabel(to - from)}</p>

        <div className="compare-presets">
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`compare-preset${
                from === preset.from && to === MAX_YEAR ? ' is-active' : ''
              }`}
              onClick={() => applyPreset(preset.from)}
              title={`${preset.from}–${MAX_YEAR}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">Не удалось загрузить сравнение: {error}</p>}

      {loading && !compare && (
        <Loader>
          Считаем корзину и акции за {from}–{to}…
        </Loader>
      )}

      {compare && !bestStock && selectedStocks.length === 0 && (
        <p className="notice">Отметьте хотя бы одну акцию в списке.</p>
      )}

      {compare && (
        <div className="compare-main-grid">
          <StockPicker
            stocks={displayStocks}
            selectedIds={selectedIds}
            onToggle={toggleStock}
            onReset={resetSelection}
            exchange={exchangeFilter}
            onExchangeChange={applyExchangeFilter}
            onAdd={() => setDialogOpen(true)}
            customIds={customIdSet}
            skipped={displaySkipped}
            fromYear={from}
            toYear={to}
            onRemoveCustom={(id) => {
              setCustomStocks(removeCustomStock(id))
              setSelectedIds((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
              })
            }}
          />

          <GrowthChart
            fromYear={compare.from}
            toYear={compare.to}
            cartFrom={compare.cart.priceFrom}
            cartTo={compare.cart.priceTo}
            stocks={selectedStocks}
            histories={chartHistories}
            currency={compare.currency}
            onDeselectStock={toggleStock}
          />

          <EquivalentsPanel
            stocks={selectedStocks}
            selectedId={equivalentStock?.id ?? null}
            onSelect={setEquivalentStockId}
            cartPriceFrom={compare.cart.priceFrom}
            cartPriceTo={compare.cart.priceTo}
            currency={compare.currency}
            products={cartProducts.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.priceTo,
            }))}
          />
        </div>
      )}

      {compare && selectedStocks.length > 0 && (
        <RankingRow
          stocks={selectedStocks}
          cartGrowthPercent={compare.cart.growthPercent}
          currency={compare.currency}
          cartFrom={compare.cart.priceFrom}
          cartTo={compare.cart.priceTo}
        />
      )}

      {cartProducts.length > 0 && (
        <section className="basket-section" aria-label="Состав корзины">
          <h3>
            Корзина скуфа: как выросла за период?{' '}
            <span className="muted">
              {from}–{to}
            </span>
          </h3>
          <HorizontalScroller trackClassName="basket-strip" label="корзину">
            {cartProducts.map((p) => {
              const revealed = (pinnedProductId ?? hoveredProductId) === p.id
              const showChange = revealed && p.priceFrom !== null && p.priceTo !== null
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`basket-strip-item${p.priceTo === null ? ' card-muted' : ''}`}
                  onPointerEnter={() => setHoveredProductId(p.id)}
                  onPointerLeave={() =>
                    setHoveredProductId((current) => (current === p.id ? null : current))
                  }
                  onClick={() => setPinnedProductId((current) => (current === p.id ? null : p.id))}
                >
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt="" width={56} height={56} loading="lazy" />
                  )}
                  <span className="name">{p.name}</span>
                  {showChange ? (
                    <span className="price-change">
                      {formatMoney(p.priceFrom as number, p.currency)}
                      <span aria-hidden="true"> → </span>
                      {formatMoney(p.priceTo as number, p.currency)}
                    </span>
                  ) : p.priceTo !== null ? (
                    <span className="price">{formatMoney(p.priceTo, p.currency)}</span>
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
                </button>
              )
            })}
          </HorizontalScroller>
        </section>
      )}

      <AddCustomStockDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        existingListings={existingListings}
        existingIds={existingIds}
        onAdded={(stock, notice) => {
          setCustomStocks(saveCustomStock(stock))
          setSelectedIds((prev) => new Set(prev).add(stock.id))
          setAddedNotice(notice)
        }}
      />
      <StockAddedToast notice={addedNotice} onDismiss={dismissAddedNotice} />
    </div>
  )
}
