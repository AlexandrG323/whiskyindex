import { useEffect, useState } from 'react'

/** Matches ProductYearlyPriceDto — GET /api/v1/products/cart */
type CartProduct = {
  id: string
  name: string
  imageUrl: string | null
  price: number
  currency: 'RUB' | 'USD'
}

/** Matches StockYearlyPriceDto — GET /api/v1/stocks */
type Stock = {
  id: string
  symbol: string
  companyName: string
  imageUrl: string | null
  price: number
  displayCurrency: 'RUB' | 'USD'
  importStatus: 'pending' | 'importing' | 'ready' | 'failed'
}

const YEAR = 2007

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${url} → ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

function money(amount: number, currency: 'RUB' | 'USD') {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function App() {
  const [products, setProducts] = useState<CartProduct[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getJson<CartProduct[]>(`/api/v1/products/cart?year=${YEAR}`),
      getJson<Stock[]>(`/api/v1/stocks?year=${YEAR}`),
    ])
      .then(([cart, listed]) => {
        setProducts(cart)
        setStocks(listed)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const cartTotal = products.reduce((sum, p) => sum + p.price, 0)

  return (
    <main>
      <header className="masthead">
        <img src="/icons/logo.webp" alt="" width={48} height={48} />
        <div>
          <h1>Whisky Index</h1>
          <p className="muted">Бутылка или портфель?</p>
        </div>
      </header>

      {error && <p className="error">Не удалось загрузить данные: {error}</p>}

      <section>
        <h2>
          Корзина скуфа <span className="muted">({YEAR})</span>
        </h2>
        <ul className="grid">
          {products.map((p) => (
            <li key={p.id} className="card">
              {p.imageUrl && <img src={p.imageUrl} alt="" width={72} height={72} loading="lazy" />}
              <span className="name">{p.name}</span>
              <span className="price">{money(p.price, p.currency)}</span>
            </li>
          ))}
        </ul>
        {products.length > 0 && (
          <p className="total">
            Итого: <strong>{money(cartTotal, products[0].currency)}</strong>
          </p>
        )}
      </section>

      <section>
        <h2>
          Акции <span className="muted">({YEAR})</span>
        </h2>
        <ul className="rows">
          {stocks.map((s) => (
            <li key={s.id}>
              <span className="symbol">{s.symbol}</span>
              <span>{s.companyName}</span>
              <span className="price">
                {s.importStatus === 'ready' ? money(s.price, s.displayCurrency) : s.importStatus}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
