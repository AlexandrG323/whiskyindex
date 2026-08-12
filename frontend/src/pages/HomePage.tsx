import { useEffect, useState } from 'react'
import { pickTopGrowthStock, pickWorstGrowthStock } from '../components/comparison/comparisonUtils'
import { type CompareStock, HeroComparison } from '../components/comparison/HeroComparison'
import { SecondaryComparison } from '../components/comparison/SecondaryComparison'
import { Loader } from '../components/ui/Loader'
import { getJson } from '../lib/api'

const DEFAULT_TO_YEAR = 2026

type CompareResponse = {
  from: number
  to: number
  currency: 'RUB' | 'USD'
  cart: { priceFrom: number; priceTo: number; growthPercent: number }
  jameson: {
    name: string
    priceFrom: number
    priceTo: number
    growthPercent: number
  }
  stocks: CompareStock[]
}

type StockHistoryResponse = {
  prices: { year: number; amount: number }[]
}

function stockHistoryUrl(stock: CompareStock) {
  return `/api/v1/stocks/${stock.id}/history?from=${stock.priceFromYear}&to=${stock.priceToYear}&currency=rub`
}

interface HomePageProps {
  year: number
  toYear?: number
}

export function HomePage({ year, toYear = DEFAULT_TO_YEAR }: HomePageProps) {
  const [compare, setCompare] = useState<CompareResponse | null>(null)
  const [heroStock, setHeroStock] = useState<CompareStock | null>(null)
  const [worstStock, setWorstStock] = useState<CompareStock | null>(null)
  const [historyPrices, setHistoryPrices] = useState<{ year: number; amount: number }[]>([])
  const [worstHistoryPrices, setWorstHistoryPrices] = useState<{ year: number; amount: number }[]>(
    [],
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setLoading(true)
    // Previous year's cards deliberately stay mounted while the new year
    // loads — clearing them here collapsed the page and shoved the intro down.

    const compareUrl = `/api/v1/analytics/compare?from=${year}&to=${toYear}&currency=rub`

    getJson<CompareResponse>(compareUrl)
      .then(async (data) => {
        if (cancelled) return

        const best = pickTopGrowthStock(data.stocks)
        const worst = pickWorstGrowthStock(data.stocks)

        if (!best || !worst) {
          throw new Error('Нет данных по акциям для сравнения')
        }

        setCompare(data)
        setHeroStock(best)
        setWorstStock(worst)

        const [heroHistory, worstHistory] = await Promise.all([
          getJson<StockHistoryResponse>(stockHistoryUrl(best)),
          getJson<StockHistoryResponse>(stockHistoryUrl(worst)),
        ])
        if (!cancelled) {
          setHistoryPrices(heroHistory.prices)
          setWorstHistoryPrices(worstHistory.prices)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setCompare(null)
          setHeroStock(null)
          setWorstStock(null)
          setHistoryPrices([])
          setWorstHistoryPrices([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [year, toYear])

  return (
    <div className={loading ? 'is-loading' : undefined}>
      <header className="page-intro">
        <h2>Корзина скуфа против акций</h2>
        <p className="page-intro-lead">
          С {year} по {toYear} год: сколько стоила корзина повседневных покупок и что за это время
          сделали акции.
        </p>
      </header>

      {error && <p className="error">Не удалось загрузить сравнение: {error}</p>}

      {loading && !compare && (
        <div className="hero-comparison-skeleton" aria-busy="true">
          <Loader>
            Считаем корзину и акции за {year}–{toYear}…
          </Loader>
        </div>
      )}

      {compare && heroStock && (
        <div className="loader-host">
          <div className="comparison-stack">
            <HeroComparison
              fromYear={compare.from}
              currency={compare.currency}
              cartFrom={compare.cart.priceFrom}
              cartTo={compare.cart.priceTo}
              cartGrowthPercent={compare.cart.growthPercent}
              stock={heroStock}
              historyPrices={historyPrices}
            />

            {worstStock && (
              <SecondaryComparison
                fromYear={compare.from}
                currency={compare.currency}
                jameson={compare.jameson}
                worstStock={worstStock}
                worstHistoryPrices={worstHistoryPrices}
              />
            )}
          </div>

          {loading && (
            <Loader overlay>
              Считаем за {year}–{toYear}…
            </Loader>
          )}
        </div>
      )}
    </div>
  )
}
