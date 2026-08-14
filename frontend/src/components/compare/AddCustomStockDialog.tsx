import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { fetchJson } from '../../lib/api'
import { type CustomStock, listingKey } from '../../lib/customStocks'

const POPULAR_EXCHANGES = ['MOEX', 'NASDAQ', 'NYSE', 'LSE'] as const

const POLL_MS = 1500
const POLL_ATTEMPTS = 40

type ImportStatus = 'pending' | 'importing' | 'ready' | 'failed'

type ResolveResponse = {
  id: string
  symbol: string
  importStatus: ImportStatus
}

type StockDetail = {
  id: string
  symbol: string
  exchange: string
  importStatus: ImportStatus
}

interface AddCustomStockDialogProps {
  open: boolean
  onClose: () => void
  onAdded: (stock: CustomStock) => void
  /** Listings already in the picker, keyed as SYMBOL|EXCHANGE. */
  existingListings: ReadonlySet<string>
  /** Stock ids already shown (curated + custom) — same listing resolves to the same id. */
  existingIds: ReadonlySet<string>
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitUntilReady(id: string, signal: AbortSignal): Promise<StockDetail> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const detail = await fetchJson<StockDetail>(`/api/v1/stocks/${id}`, { signal })
    if (detail.importStatus === 'ready') return detail
    if (detail.importStatus === 'failed') {
      throw new Error('Не удалось загрузить котировки для этого тикера.')
    }
    await sleep(POLL_MS)
  }
  throw new Error('Импорт занимает слишком много времени. Попробуйте позже.')
}

export function AddCustomStockDialog({
  open,
  onClose,
  onAdded,
  existingListings,
  existingIds,
}: AddCustomStockDialogProps) {
  const titleId = useId()
  const tickerId = useId()
  const exchangeId = useId()
  const nameId = useId()

  const tickerRef = useRef<HTMLInputElement>(null)
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState('')
  const [customName, setCustomName] = useState('')
  const [exchangeOpen, setExchangeOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestions = useMemo(() => {
    const query = exchange.trim().toUpperCase()
    if (!query) return [...POPULAR_EXCHANGES]
    return POPULAR_EXCHANGES.filter((name) => name.includes(query))
  }, [exchange])

  useEffect(() => {
    if (!open) return
    setSymbol('')
    setExchange('')
    setCustomName('')
    setExchangeOpen(false)
    setSubmitting(false)
    setError(null)
    const frame = requestAnimationFrame(() => tickerRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open || submitting) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitting, onClose])

  if (!open) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextSymbol = symbol.trim().toUpperCase()
    const nextExchange = exchange.trim().toUpperCase()
    if (!nextSymbol || !nextExchange) {
      setError('Укажите тикер и биржу.')
      return
    }
    if (existingListings.has(listingKey(nextSymbol, nextExchange))) {
      setError(`Акция ${nextSymbol} на ${nextExchange} уже в списке.`)
      return
    }

    setSubmitting(true)
    setError(null)
    const abort = new AbortController()

    try {
      const resolved = await fetchJson<ResolveResponse>('/api/v1/stocks/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: nextSymbol, exchange: nextExchange }),
        signal: abort.signal,
      })

      if (existingIds.has(resolved.id)) {
        throw new Error(`Акция ${nextSymbol} на ${nextExchange} уже в списке.`)
      }

      if (resolved.importStatus === 'failed') {
        throw new Error('Не удалось загрузить котировки для этого тикера.')
      }

      if (resolved.importStatus !== 'ready') {
        await waitUntilReady(resolved.id, abort.signal)
      }

      const name = customName.trim()
      onAdded({
        id: resolved.id,
        symbol: resolved.symbol,
        exchange: nextExchange,
        ...(name ? { customName: name } : {}),
      })
      onClose()
    } catch (cause: unknown) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(
        message.includes('→') ? 'Не удалось добавить акцию. Проверьте тикер и биржу.' : message,
      )
      setSubmitting(false)
    }
  }

  return (
    <div
      className="stock-dialog-backdrop"
      onPointerDown={(event) => {
        if (submitting) return
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        className="stock-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
      >
        <h3 id={titleId}>Добавить свою акцию</h3>
        <p className="stock-dialog-lead">Тикер и биржа — как на биржевом терминале.</p>

        <label className="stock-dialog-field" htmlFor={tickerId}>
          Тикер
          <input
            ref={tickerRef}
            id={tickerId}
            name="symbol"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="SBER"
            disabled={submitting}
          />
        </label>

        <label className="stock-dialog-field" htmlFor={exchangeId}>
          Биржа
          <input
            id={exchangeId}
            name="exchange"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={exchange}
            onChange={(event) => {
              setExchange(event.target.value.toUpperCase())
              setExchangeOpen(true)
            }}
            onFocus={() => setExchangeOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setExchangeOpen(false), 120)
            }}
            placeholder="MOEX"
            disabled={submitting}
          />
          {exchangeOpen && suggestions.length > 0 && (
            <ul className="stock-dialog-suggestions">
              {suggestions.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setExchange(name)
                      setExchangeOpen(false)
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>

        <label className="stock-dialog-field" htmlFor={nameId}>
          <span className="stock-dialog-field-label">
            Название <span className="stock-dialog-optional">необязательно</span>
          </span>
          <input
            id={nameId}
            name="customName"
            type="text"
            autoComplete="off"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="Сбербанк"
            disabled={submitting}
          />
        </label>

        {error && <p className="stock-dialog-error">{error}</p>}

        <div className="stock-dialog-actions">
          <button
            type="button"
            className="stock-dialog-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Отмена
          </button>
          <button type="submit" className="stock-dialog-submit" disabled={submitting}>
            {submitting ? 'Добавляем…' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  )
}
