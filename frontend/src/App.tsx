import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Select } from './components/ui/Select'
import { AppLayout } from './layout/AppLayout'
import { getJson } from './lib/api'
import { type Currency, loadCurrency, saveCurrency } from './lib/currency'
import { AboutPage } from './pages/AboutPage'
import { CartPage } from './pages/CartPage'
import { ComparePage } from './pages/ComparePage'
import { HomePage } from './pages/HomePage'
import { StocksPage } from './pages/StocksPage'

const MIN_YEAR = 1998
const MAX_YEAR = 2026
const DEFAULT_YEAR = 2007
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)
const YEAR_OPTIONS = YEARS.map((y) => ({ value: y, label: String(y) }))

export default function App() {
  const { pathname } = useLocation()
  const showHeaderYear = pathname !== '/compare'

  const [year, setYear] = useState(DEFAULT_YEAR)
  const [currency, setCurrencyState] = useState<Currency>(loadCurrency)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  const setCurrency = (next: Currency) => {
    setCurrencyState(next)
    saveCurrency(next)
  }

  useEffect(() => {
    if (!showHeaderYear) return

    let cancelled = false
    getJson<number>(`/api/v1/analytics/exchange-rate?year=${year}`)
      .then((rate) => {
        if (!cancelled) setExchangeRate(rate)
      })
      .catch(() => {
        if (!cancelled) setExchangeRate(null)
      })
    return () => {
      cancelled = true
    }
  }, [year, showHeaderYear])

  const header = (
    <header className="masthead">
      <img src="/icons/logo.webp" alt="" width={48} height={48} />
      <div>
        <h1>Whisky Index</h1>
        <p className="muted">Бутылка или портфель?</p>
      </div>
      {showHeaderYear && (
        <div className="year-picker">
          <span className="year-picker-label">Год</span>
          <Select
            value={year}
            options={YEAR_OPTIONS}
            onChange={setYear}
            ariaLabel="Год"
            align="end"
          />
          {exchangeRate && <p className="muted year-picker-rate">$1 = {exchangeRate}₽</p>}
        </div>
      )}
    </header>
  )

  return (
    <Routes>
      <Route
        element={<AppLayout header={header} currency={currency} onCurrencyChange={setCurrency} />}
      >
        <Route path="/" element={<HomePage year={year} toYear={MAX_YEAR} currency={currency} />} />
        <Route path="/cart" element={<CartPage year={year} currency={currency} />} />
        <Route path="/stocks" element={<StocksPage year={year} currency={currency} />} />
        <Route path="/compare" element={<ComparePage currency={currency} />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  )
}
