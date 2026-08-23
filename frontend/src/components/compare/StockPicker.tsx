import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CompareStock } from '../comparison/HeroComparison'
import { StockLogo } from '../comparison/StockLogo'
import { IconMenu } from '../ui/IconMenu'
import {
  AddIcon,
  FilterIcon,
  RemoveIcon,
  ResetIcon,
  SearchIcon,
  SelectAllIcon,
  SortIcon,
} from '../ui/icons'

export type StockSort = 'alpha' | 'growth'

const SORT_OPTIONS: { value: StockSort; label: string }[] = [
  { value: 'alpha', label: 'По алфавиту' },
  { value: 'growth', label: 'По росту' },
]

export const ALL_EXCHANGES = 'all'

function matchesStockQuery(
  stock: { companyName: string; symbol: string; exchange: string },
  needle: string,
) {
  const haystack = `${stock.companyName} ${stock.symbol} ${stock.exchange}`.toLocaleLowerCase('ru')
  return haystack.includes(needle)
}

export type SkippedStock = {
  id: string
  symbol: string
  companyName: string
  exchange: string
  imageUrl: string | null
  coverage: { from: number; to: number } | null
}

interface StockPickerProps {
  stocks: CompareStock[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  /** Clears the selection, or restores all of it when nothing is selected. */
  onReset: () => void
  exchange: string
  onExchangeChange: (exchange: string) => void
  /** Opens the add-custom-stock dialog. Disabled until wired up. */
  onAdd?: () => void
  /** Ids the current browser added; those rows get a hover-only remove control. */
  customIds?: Set<string>
  onRemoveCustom?: (id: string) => void
  skipped?: SkippedStock[]
  fromYear: number
  toYear: number
}

export function StockPicker({
  stocks,
  selectedIds,
  onToggle,
  onReset,
  exchange,
  onExchangeChange,
  onAdd,
  customIds,
  onRemoveCustom,
  skipped = [],
  fromYear,
  toYear,
}: StockPickerProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [thumb, setThumb] = useState({ top: 0, height: 40 })
  const [sort, setSort] = useState<StockSort>('alpha')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const exchangeOptions = useMemo(() => {
    const names = [
      ...new Set([...stocks, ...skipped].map((stock) => stock.exchange).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b))
    return [
      { value: ALL_EXCHANGES, label: 'Все биржи' },
      ...names.map((name) => ({ value: name, label: name })),
    ]
  }, [stocks, skipped])

  const sortedStocks = useMemo(() => {
    const copy =
      exchange === ALL_EXCHANGES
        ? [...stocks]
        : stocks.filter((stock) => stock.exchange === exchange)
    if (sort === 'growth') {
      return copy.sort((a, b) => b.growthPercent - a.growthPercent)
    }
    return copy.sort((a, b) => a.companyName.localeCompare(b.companyName, 'ru'))
  }, [stocks, sort, exchange])

  const visibleSkipped = useMemo(() => {
    if (exchange === ALL_EXCHANGES) return skipped
    return skipped.filter((stock) => stock.exchange === exchange)
  }, [skipped, exchange])

  const needle = query.trim().toLocaleLowerCase('ru')
  const listedStocks = useMemo(() => {
    if (!needle) return sortedStocks
    return sortedStocks.filter((stock) => matchesStockQuery(stock, needle))
  }, [sortedStocks, needle])

  const listedSkipped = useMemo(() => {
    if (!needle) return visibleSkipped
    return visibleSkipped.filter((stock) => matchesStockQuery(stock, needle))
  }, [visibleSkipped, needle])

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!searchOpen) return
    searchInputRef.current?.focus()
  }, [searchOpen])

  const selectedVisibleCount = sortedStocks.reduce(
    (count, stock) => count + (selectedIds.has(stock.id) ? 1 : 0),
    0,
  )
  const noneSelected = selectedVisibleCount === 0

  const updateThumb = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= 0 || clientHeight <= 0) return

    const height = Math.max(28, (clientHeight / scrollHeight) * clientHeight)
    const maxTop = Math.max(0, clientHeight - height)
    const top =
      scrollHeight <= clientHeight ? 0 : (scrollTop / (scrollHeight - clientHeight)) * maxTop

    setThumb((prev) => (prev.top === top && prev.height === height ? prev : { top, height }))
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return

    updateThumb()
    const resizeObserver = new ResizeObserver(updateThumb)
    resizeObserver.observe(el)

    const mutationObserver = new MutationObserver(updateThumb)
    mutationObserver.observe(el, { childList: true, subtree: true })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [updateThumb])

  const onThumbDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = listRef.current
    if (!el) return

    const track = event.currentTarget.parentElement
    if (!track) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const startY = event.clientY
    const startTop = thumb.top
    const trackHeight = track.clientHeight
    const maxTop = Math.max(0, trackHeight - thumb.height)
    const maxScroll = el.scrollHeight - el.clientHeight

    const onMove = (moveEvent: PointerEvent) => {
      const nextTop = Math.min(maxTop, Math.max(0, startTop + (moveEvent.clientY - startY)))
      el.scrollTop = maxTop === 0 ? 0 : (nextTop / maxTop) * maxScroll
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <aside className="compare-panel" aria-label="Выбор акций">
      <div className="compare-panel-header">
        <h3>Акции для сравнения: {selectedVisibleCount}</h3>
      </div>

      <div className="stock-picker-scroll">
        <ul ref={listRef} className="stock-picker" onScroll={updateThumb}>
          {listedStocks.map((stock) => {
            const checked = selectedIds.has(stock.id)
            const isCustom = customIds?.has(stock.id) === true
            return (
              <li key={stock.id}>
                <label
                  className={`stock-picker-item${isCustom && onRemoveCustom ? ' has-remove' : ''}`}
                >
                  <StockLogo symbol={stock.symbol} src={stock.imageUrl} size={24} />
                  <span className="stock-picker-name">{stock.companyName}</span>
                  {isCustom && onRemoveCustom && (
                    <button
                      type="button"
                      className="stock-picker-remove"
                      aria-label={`Удалить ${stock.companyName}`}
                      title="Удалить"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onRemoveCustom(stock.id)
                      }}
                    >
                      <RemoveIcon />
                    </button>
                  )}
                  <input type="checkbox" checked={checked} onChange={() => onToggle(stock.id)} />
                </label>
              </li>
            )
          })}
          {listedSkipped.map((stock) => {
            const isCustom = customIds?.has(stock.id) === true
            const coverage =
              stock.coverage !== null ? `есть ${stock.coverage.from}–${stock.coverage.to}` : null
            return (
              <li key={`skipped-${stock.id}`}>
                <div
                  className={`stock-picker-item is-skipped${
                    isCustom && onRemoveCustom ? ' has-remove' : ''
                  }`}
                >
                  <StockLogo symbol={stock.symbol} src={stock.imageUrl} size={24} />
                  <span className="stock-picker-copy">
                    <span className="stock-picker-name">{stock.companyName}</span>
                    <span className="stock-picker-skip">
                      нет данных за {fromYear}–{toYear}
                      {coverage ? ` · ${coverage}` : ''}
                    </span>
                  </span>
                  {isCustom && onRemoveCustom && (
                    <button
                      type="button"
                      className="stock-picker-remove"
                      aria-label={`Удалить ${stock.companyName}`}
                      title="Удалить"
                      onClick={() => onRemoveCustom(stock.id)}
                    >
                      <RemoveIcon />
                    </button>
                  )}
                  <input type="checkbox" disabled checked={false} readOnly />
                </div>
              </li>
            )
          })}
          {listedStocks.length === 0 && listedSkipped.length === 0 && (
            <li className="stock-picker-empty">
              {needle ? 'Ничего не найдено' : 'Нет акций в списке'}
            </li>
          )}
        </ul>

        <div className="stock-picker-scrollbar" aria-hidden="true">
          <div
            className="stock-picker-scrollbar-thumb"
            style={{ top: thumb.top, height: thumb.height }}
            onPointerDown={onThumbDrag}
          />
        </div>
      </div>

      {/* Below the list rather than in the title row — three buttons there
          squeezed the heading onto two lines. */}
      <div className={`picker-tools${searchOpen ? ' is-searching' : ''}`}>
        {searchOpen ? (
          <>
            <label className="picker-search">
              <SearchIcon />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeSearch()
                }}
                placeholder="Найти в списке"
                aria-label="Найти акцию в списке"
                autoComplete="off"
                enterKeyHint="search"
              />
            </label>
            <button
              type="button"
              className="icon-btn"
              onClick={closeSearch}
              aria-label="Закрыть поиск"
              title="Закрыть поиск"
            >
              <RemoveIcon />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Найти в списке"
              title="Найти в списке"
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onReset}
              aria-label={noneSelected ? 'Выбрать все' : 'Сбросить все'}
              title={noneSelected ? 'Выбрать все' : 'Сбросить все'}
            >
              {noneSelected ? <SelectAllIcon /> : <ResetIcon />}
            </button>

            <IconMenu
              icon={<SortIcon />}
              ariaLabel="Сортировка"
              value={sort}
              options={SORT_OPTIONS}
              onChange={setSort}
              align="start"
            />

            <IconMenu
              icon={<FilterIcon />}
              ariaLabel={exchange === ALL_EXCHANGES ? 'Фильтр по бирже' : `Биржа: ${exchange}`}
              value={exchange}
              options={exchangeOptions}
              onChange={onExchangeChange}
              align="start"
              active={exchange !== ALL_EXCHANGES}
            />

            <button
              type="button"
              className="icon-btn picker-add-btn"
              onClick={onAdd}
              disabled={!onAdd}
              title={onAdd ? 'Добавить свою акцию' : 'Добавить свою акцию — скоро'}
            >
              <AddIcon />
              Добавить
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
