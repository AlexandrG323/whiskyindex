import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { stockLogoUrl } from '../comparison/comparisonUtils'
import type { CompareStock } from '../comparison/HeroComparison'
import { IconMenu } from '../ui/IconMenu'
import { AddIcon, ResetIcon, SelectAllIcon, SortIcon } from '../ui/icons'

export type StockSort = 'alpha' | 'growth'

const SORT_OPTIONS: { value: StockSort; label: string }[] = [
  { value: 'alpha', label: 'По алфавиту' },
  { value: 'growth', label: 'По росту' },
]

interface StockPickerProps {
  stocks: CompareStock[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  /** Clears the selection, or restores all of it when nothing is selected. */
  onReset: () => void
  /** Opens the add-custom-stock dialog. Disabled until wired up. */
  onAdd?: () => void
}

export function StockPicker({ stocks, selectedIds, onToggle, onReset, onAdd }: StockPickerProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const [thumb, setThumb] = useState({ top: 0, height: 40 })
  const [sort, setSort] = useState<StockSort>('alpha')

  const noneSelected = selectedIds.size === 0

  const sortedStocks = useMemo(() => {
    const copy = [...stocks]
    if (sort === 'growth') {
      return copy.sort((a, b) => b.growthPercent - a.growthPercent)
    }
    return copy.sort((a, b) => a.companyName.localeCompare(b.companyName, 'ru'))
  }, [stocks, sort])

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
        <h3>Акции для сравнения: {selectedIds.size}</h3>
      </div>

      <div className="stock-picker-scroll">
        <ul ref={listRef} className="stock-picker" onScroll={updateThumb}>
          {sortedStocks.map((stock) => {
            const checked = selectedIds.has(stock.id)
            const logo = stockLogoUrl(stock)
            return (
              <li key={stock.id}>
                <label className="stock-picker-item">
                  {stock.imageUrl || logo ? (
                    <img src={logo} alt="" width={24} height={24} loading="lazy" />
                  ) : (
                    <span className="stock-picker-fallback">{stock.symbol.slice(0, 2)}</span>
                  )}
                  <span>{stock.companyName}</span>
                  <input type="checkbox" checked={checked} onChange={() => onToggle(stock.id)} />
                </label>
              </li>
            )
          })}
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
      <div className="picker-tools">
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

        <button
          type="button"
          className="icon-btn"
          onClick={onAdd}
          disabled={!onAdd}
          aria-label="Добавить свою акцию"
          title={onAdd ? 'Добавить свою акцию' : 'Добавить свою акцию — скоро'}
        >
          <AddIcon />
        </button>
      </div>
    </aside>
  )
}
