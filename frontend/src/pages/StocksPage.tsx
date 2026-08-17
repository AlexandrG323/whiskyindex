import { useEffect, useState } from 'react'
import { StockLogo } from '../components/comparison/StockLogo'
import { Loader } from '../components/ui/Loader'
import { getJson } from '../lib/api'
import type { Currency } from '../lib/currency'

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

function money(amount: number, currency: 'RUB' | 'USD') {
  const digits = Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

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

interface StocksPageProps {
  year: number
  currency: Currency
}

export function StocksPage({ year, currency }: StocksPageProps) {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setLoading(true)
    getJson<Stock[]>(`/api/v1/stocks?year=${year}&currency=${currency}`)
      .then((listed) => {
        if (cancelled) return
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
  }, [year, currency])

  return (
    <div className={loading ? 'is-loading' : undefined}>
      {error && <p className="error">Не удалось загрузить данные: {error}</p>}

      {loading && stocks.length === 0 && <Loader>Загружаем акции за {year}…</Loader>}

      <section>
        <h2>
          Акции <span className="muted">{year}</span>
        </h2>
        <ul className="rows">
          {stocks.map((s) => (
            <li key={s.id}>
              <StockLogo symbol={s.symbol} src={s.imageUrl} size={28} />
              <span className="symbol">{s.symbol}</span>
              <span className="company">{s.companyName}</span>
              <StockPrice stock={s} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
