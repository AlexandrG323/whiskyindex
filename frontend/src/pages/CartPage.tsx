/** TODO (домашка): пока достаточно заголовка «Корзина скуфа». */
import { useEffect, useState } from 'react'

type CartProduct = {
  id: string
  name: string
  imageUrl: string | null
  price: number | null
  priceStatus: 'actual' | 'not_yet' | 'unavailable'
  availableFrom: number | null
  currency: 'RUB' | 'USD'
}

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
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

interface CartPageProps {
  year: number
}

export function CartPage({ year }: CartPageProps) {
  const [products, setProducts] = useState<CartProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setLoading(true)
    getJson<CartProduct[]>(`/api/v1/products/cart?year=${year}`)
      .then((cart) => {
        if (!cancelled) setProducts(cart)
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

  const available = products.filter((p) => p.price !== null)
  const cartTotal = available.reduce((sum, p) => sum + (p.price ?? 0), 0)
  const missing = products.length - available.length

  return (
    <div className={loading ? 'is-loading' : undefined}>
      {error && <p className="error">Не удалось загрузить данные: {error}</p>}

      {loading && products.length === 0 && (
        <p className="loading">
          <span className="spinner" aria-hidden="true" />
          Загружаем корзину за {year}…
        </p>
      )}

      <section>
        <h2>
          Корзина скуфа <span className="muted">{year}</span>
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
    </div>
  )
}
