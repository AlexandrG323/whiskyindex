import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { AboutPage } from './pages/AboutPage'
import { CartPage } from './pages/CartPage'
import { ComparePage } from './pages/ComparePage'
import { HomePage } from './pages/HomePage'
import { StocksPage } from './pages/StocksPage'

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

export default function App() {
  const { pathname } = useLocation()
  const showHeaderYear = pathname !== '/compare'

  const [year, setYear] = useState(DEFAULT_YEAR)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

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
        <>
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
          {exchangeRate && <p className="muted">$1 = {exchangeRate}₽</p>}
        </>
      )}
    </header>
  )

  return (
    <Routes>
      <Route element={<AppLayout header={header} />}>
        <Route path="/" element={<HomePage year={year} toYear={MAX_YEAR} />} />
        <Route path="/cart" element={<CartPage year={year} />} />
        <Route path="/stocks" element={<StocksPage year={year} />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
    </Routes>
  )
}
