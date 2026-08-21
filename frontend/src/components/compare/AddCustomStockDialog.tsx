import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { fetchJson } from '../../lib/api'
import { type CustomStock, listingKey } from '../../lib/customStocks'
import type { StockAddedNotice } from './StockAddedToast'

const POPULAR_EXCHANGES = ['MOEX', 'NASDAQ', 'NYSE', 'LSE'] as const

const POLL_MS = 1500
const POLL_ATTEMPTS = 40

type DialogMode = 'query' | 'ticker'
type ImportStatus = 'pending' | 'importing' | 'ready' | 'failed'

type ResolveResponse = {
  id: string
  symbol: string
  importStatus: ImportStatus
  imageUrl?: string | null
}

type StockDetail = {
  id: string
  symbol: string
  exchange: string
  importStatus: ImportStatus
  companyName: string
  imageUrl: string | null
}

type QueryCandidate = {
  symbol: string
  exchange: string
  companyName: string
  confidence: number
  reason: string
}

type QueryTried = {
  symbol: string
  exchange: string
  available: boolean
  firstYear: number | null
  lastYear: number | null
}

type QueryResponse = {
  resolved: {
    id: string
    symbol: string
    exchange: string
    importStatus: ImportStatus
    companyName?: string
  } | null
  candidates: QueryCandidate[]
  tried: QueryTried[]
}

interface AddCustomStockDialogProps {
  open: boolean
  onClose: () => void
  onAdded: (stock: CustomStock, notice: StockAddedNotice) => void
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

async function loadReadyDetail(
  id: string,
  importStatus: ImportStatus,
  signal: AbortSignal,
): Promise<StockDetail> {
  if (importStatus === 'failed') {
    throw new Error('Не удалось загрузить котировки для этого тикера.')
  }
  if (importStatus !== 'ready') {
    return waitUntilReady(id, signal)
  }
  return fetchJson<StockDetail>(`/api/v1/stocks/${id}`, { signal })
}

function coverageLabel(firstYear: number | null, lastYear: number | null) {
  if (firstYear === null || lastYear === null) return null
  if (firstYear === lastYear) return String(firstYear)
  return `${firstYear}–${lastYear}`
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
  const queryId = useId()

  const queryRef = useRef<HTMLInputElement>(null)
  const tickerRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<DialogMode>('query')
  const [query, setQuery] = useState('')
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState('')
  const [customName, setCustomName] = useState('')
  const [exchangeOpen, setExchangeOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<QueryCandidate[]>([])
  const [tried, setTried] = useState<QueryTried[]>([])

  const suggestions = useMemo(() => {
    const next = exchange.trim().toUpperCase()
    if (!next) return [...POPULAR_EXCHANGES]
    return POPULAR_EXCHANGES.filter((name) => name.includes(next))
  }, [exchange])

  const triedByListing = useMemo(() => {
    const map = new Map<string, QueryTried>()
    for (const item of tried) {
      map.set(listingKey(item.symbol, item.exchange), item)
    }
    return map
  }, [tried])

  useEffect(() => {
    if (open) return
    setMode('query')
    setQuery('')
    setSymbol('')
    setExchange('')
    setCustomName('')
    setExchangeOpen(false)
    setSubmitting(false)
    setStatus(null)
    setError(null)
    setCandidates([])
    setTried([])
  }, [open])

  useLayoutEffect(() => {
    if (!open || mode !== 'query') return
    queryRef.current?.focus()
  }, [open, mode])

  useEffect(() => {
    if (!open || submitting) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitting, onClose])

  if (!open) return null

  const switchMode = (next: DialogMode) => {
    if (submitting || next === mode) return
    setMode(next)
    setError(null)
    setStatus(null)
    setCandidates([])
    setTried([])
    requestAnimationFrame(() => {
      if (next === 'query') queryRef.current?.focus()
      else tickerRef.current?.focus()
    })
  }

  const finishAdded = (detail: StockDetail, fallbackName?: string) => {
    const name = customName.trim() || fallbackName?.trim() || detail.companyName.trim() || ''
    const displayName = name || detail.symbol
    onAdded(
      {
        id: detail.id,
        symbol: detail.symbol,
        exchange: detail.exchange,
        ...(name ? { customName: name } : {}),
      },
      {
        name: displayName,
        symbol: detail.symbol,
        exchange: detail.exchange,
        imageUrl: detail.imageUrl,
      },
    )
    onClose()
  }

  const addListing = async (
    nextSymbol: string,
    nextExchange: string,
    signal: AbortSignal,
    fallbackName?: string,
  ) => {
    if (existingListings.has(listingKey(nextSymbol, nextExchange))) {
      throw new Error(`Акция ${nextSymbol} на ${nextExchange} уже в списке.`)
    }

    setSubmitting(true)
    setError(null)
    setStatus(`Добавляем ${nextSymbol}…`)

    const resolved = await fetchJson<ResolveResponse>('/api/v1/stocks/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: nextSymbol, exchange: nextExchange }),
      signal,
    })

    if (existingIds.has(resolved.id)) {
      throw new Error(`Акция ${nextSymbol} на ${nextExchange} уже в списке.`)
    }

    const detail = await loadReadyDetail(resolved.id, resolved.importStatus, signal)
    finishAdded(detail, fallbackName)
  }

  const submitTicker = async (signal: AbortSignal) => {
    const nextSymbol = symbol.trim().toUpperCase()
    const nextExchange = exchange.trim().toUpperCase()
    if (!nextSymbol || !nextExchange) {
      setError('Укажите тикер и биржу.')
      return
    }
    await addListing(nextSymbol, nextExchange, signal)
  }

  const catchSubmit = (cause: unknown) => {
    if (cause instanceof DOMException && cause.name === 'AbortError') return
    const message = cause instanceof Error ? cause.message : String(cause)
    setError(
      message.includes('→') ? 'Не удалось добавить акцию. Проверьте тикер и биржу.' : message,
    )
    setStatus(null)
    setSubmitting(false)
  }

  const submitQuery = async (signal: AbortSignal) => {
    const nextQuery = query.trim()
    if (!nextQuery) {
      setError('Опишите компанию или акцию.')
      return
    }

    setSubmitting(true)
    setError(null)
    setCandidates([])
    setTried([])
    setStatus('Ищем кандидатов…')
    const probeHint = window.setTimeout(() => setStatus('Проверяем котировки…'), 4000)

    let result: QueryResponse
    try {
      result = await fetchJson<QueryResponse>('/api/v1/stocks/resolve-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: nextQuery,
          exclude: [...existingListings],
        }),
        signal,
      })
    } finally {
      window.clearTimeout(probeHint)
    }

    setCandidates(result.candidates)
    setTried(result.tried)

    const resolved = result.resolved
    if (!resolved) {
      throw new Error(
        result.candidates.length > 0
          ? 'Нет котировок на MOEX и Yahoo по этим тикерам. Укажите тикер вручную.'
          : 'Не удалось найти акцию по этому описанию. Попробуйте иначе или укажите тикер.',
      )
    }

    if (
      existingIds.has(resolved.id) ||
      existingListings.has(listingKey(resolved.symbol, resolved.exchange))
    ) {
      throw new Error(`Акция ${resolved.symbol} на ${resolved.exchange} уже в списке.`)
    }
    if (resolved.importStatus === 'failed') {
      throw new Error('Не удалось загрузить котировки для этого тикера.')
    }

    setStatus(`Добавляем ${resolved.symbol}…`)
    const detail = await loadReadyDetail(resolved.id, resolved.importStatus, signal)
    finishAdded(detail, resolved.companyName)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const abort = new AbortController()
    try {
      if (mode === 'query') await submitQuery(abort.signal)
      else await submitTicker(abort.signal)
    } catch (cause: unknown) {
      catchSubmit(cause)
    }
  }

  const pickCandidate = async (candidate: QueryCandidate) => {
    if (submitting) return
    const abort = new AbortController()
    try {
      await addListing(candidate.symbol, candidate.exchange, abort.signal, candidate.companyName)
    } catch (cause: unknown) {
      catchSubmit(cause)
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

        <fieldset className="stock-dialog-mode" disabled={submitting}>
          <legend className="stock-dialog-mode-label">Как искать</legend>
          <div className="stock-dialog-mode-buttons">
            <button
              type="button"
              aria-pressed={mode === 'query'}
              onClick={() => switchMode('query')}
            >
              Описание
            </button>
            <button
              type="button"
              aria-pressed={mode === 'ticker'}
              onClick={() => switchMode('ticker')}
            >
              Тикер
            </button>
          </div>
        </fieldset>

        <p className="stock-dialog-lead">
          {mode === 'query'
            ? 'Опишите компанию своими словами — найдём тикер сами.'
            : 'Тикер и биржа — как на биржевом терминале.'}
        </p>

        {mode === 'query' ? (
          <label className="stock-dialog-field" htmlFor={queryId}>
            Описание
            <input
              ref={queryRef}
              id={queryId}
              name="query"
              type="text"
              autoComplete="off"
              spellCheck={true}
              maxLength={200}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="автоваз"
              disabled={submitting}
            />
          </label>
        ) : (
          <>
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
          </>
        )}

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

        {status && <p className="stock-dialog-status">{status}</p>}
        {error && <p className="stock-dialog-error">{error}</p>}

        {candidates.length > 0 && (
          <ul className="stock-dialog-candidates">
            {candidates.map((candidate) => {
              const key = listingKey(candidate.symbol, candidate.exchange)
              const probe = triedByListing.get(key)
              const available = probe?.available === true
              const years =
                probe?.available === true ? coverageLabel(probe.firstYear, probe.lastYear) : null
              return (
                <li key={key} data-available={available ? 'yes' : 'no'}>
                  {available ? (
                    <button
                      type="button"
                      className="stock-dialog-chip"
                      disabled={submitting}
                      onClick={() => pickCandidate(candidate)}
                    >
                      <span className="stock-dialog-chip-listing">
                        {candidate.symbol} · {candidate.exchange}
                      </span>
                      {years && <span className="stock-dialog-chip-years">{years}</span>}
                    </button>
                  ) : (
                    <>
                      <span>
                        {candidate.symbol} · {candidate.exchange}
                      </span>
                      <span>нет котировок на MOEX/Yahoo</span>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}

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
            {submitting ? (mode === 'query' ? 'Ищем…' : 'Добавляем…') : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  )
}
