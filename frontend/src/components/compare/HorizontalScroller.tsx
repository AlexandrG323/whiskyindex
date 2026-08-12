import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

interface HorizontalScrollerProps {
  children: ReactNode
  className?: string
  trackClassName: string
  label: string
}

export function HorizontalScroller({
  children,
  className,
  trackClassName,
  label,
}: HorizontalScrollerProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(maxScroll - el.scrollLeft > 2)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })

    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(el)

    const mutationObserver = new MutationObserver(updateScrollState)
    mutationObserver.observe(el, { childList: true, subtree: true })

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [updateScrollState])

  const scrollByDir = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    const amount = Math.max(180, Math.floor(el.clientWidth * 0.7))
    el.scrollBy({ left: dir * amount, behavior: 'smooth' })
  }

  // Fades mirror the arrows: shown only on the side that still has content,
  // so a fully-scrolled (or unscrollable) list has no stray shadow.
  const fade =
    canScrollLeft && canScrollRight
      ? ' h-scroller--fade-both'
      : canScrollLeft
        ? ' h-scroller--fade-left'
        : canScrollRight
          ? ' h-scroller--fade-right'
          : ''

  return (
    <div className={`h-scroller${className ? ` ${className}` : ''}${fade}`}>
      <button
        type="button"
        className="h-scroller-btn h-scroller-btn--left"
        aria-label={`Прокрутить ${label} влево`}
        disabled={!canScrollLeft}
        onClick={() => scrollByDir(-1)}
      >
        ‹
      </button>

      <div ref={trackRef} className={`h-scroller-track ${trackClassName}`}>
        {children}
      </div>

      <button
        type="button"
        className="h-scroller-btn h-scroller-btn--right"
        aria-label={`Прокрутить ${label} вправо`}
        disabled={!canScrollRight}
        onClick={() => scrollByDir(1)}
      >
        ›
      </button>
    </div>
  )
}
