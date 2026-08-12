import { useEffect, useMemo, useRef, useState } from 'react'
import type { CompareStock } from '../comparison/HeroComparison'

export type HistorySeries = {
  id: string
  label: string
  color: string
  prices: { year: number; amount: number }[]
}

interface GrowthChartProps {
  fromYear: number
  toYear: number
  cartFrom: number
  cartTo: number
  stocks: CompareStock[]
  histories: HistorySeries[]
}

const STOCK_COLORS = [
  '#57d163',
  '#5b8def',
  '#c084fc',
  '#f472b6',
  '#38bdf8',
  '#a3e635',
  '#fb923c',
  '#f87171',
  '#2dd4bf',
  '#eab308',
]

function toGrowthSeries(
  prices: { year: number; amount: number }[],
  baselineYear: number,
): { year: number; growth: number }[] {
  if (prices.length === 0) return []
  const sorted = [...prices].sort((a, b) => a.year - b.year)
  const baseline = sorted.find((p) => p.year >= baselineYear)?.amount ?? sorted[0].amount
  if (baseline === 0) return []
  return sorted.map((p) => ({
    year: p.year,
    growth: ((p.amount - baseline) / baseline) * 100,
  }))
}

/** How many series the tooltip lists before collapsing the rest into a count. */
const TOOLTIP_LIMIT = 6

function formatPercent(value: number) {
  const rounded = Math.round(value)
  return `${rounded >= 0 ? '+' : ''}${rounded.toLocaleString('ru-RU')}%`
}

function formatAxisPercent(value: number) {
  const rounded = Math.round(value)
  const sign = rounded > 0 ? '+' : ''
  const abs = Math.abs(rounded)

  if (abs >= 1_000_000) {
    return `${sign}${(rounded / 1_000_000).toFixed(1)}M%`
  }
  if (abs >= 10_000) {
    return `${sign}${(rounded / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k%`
  }
  return `${sign}${rounded}%`
}

export function GrowthChart({
  fromYear,
  toYear,
  cartFrom,
  cartTo,
  stocks,
  histories,
}: GrowthChartProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 640, height: 280 })
  const [hoverYear, setHoverYear] = useState<number | null>(null)

  const series = useMemo(() => {
    const yearSpan = Math.max(toYear - fromYear, 1)
    const cartPrices = Array.from({ length: yearSpan + 1 }, (_, i) => {
      const year = fromYear + i
      const t = i / yearSpan
      return { year, amount: cartFrom + (cartTo - cartFrom) * t }
    })

    const cartSeries: HistorySeries = {
      id: 'cart',
      label: 'Корзина',
      color: '#e9922e',
      prices: cartPrices,
    }

    const stockSeries = stocks.map((stock, index) => {
      const history = histories.find((h) => h.id === stock.id)
      return {
        id: stock.id,
        label: stock.companyName,
        color: STOCK_COLORS[index % STOCK_COLORS.length],
        prices: history?.prices ?? [
          { year: stock.priceFromYear, amount: stock.priceFrom },
          { year: stock.priceToYear, amount: stock.priceTo },
        ],
      }
    })

    return [cartSeries, ...stockSeries]
  }, [cartFrom, cartTo, fromYear, toYear, histories, stocks])

  const growthLines = useMemo(() => {
    return series
      .map((s) => ({
        ...s,
        points: toGrowthSeries(s.prices, fromYear).filter(
          (p) => p.year >= fromYear && p.year <= toYear,
        ),
      }))
      .filter((s) => s.points.length >= 2)
      .sort((a, b) => {
        const aGrowth = a.points[a.points.length - 1]?.growth ?? 0
        const bGrowth = b.points[b.points.length - 1]?.growth ?? 0
        return bGrowth - aGrowth
      })
  }, [series, fromYear, toYear])

  const hasChart = growthLines.length > 0

  useEffect(() => {
    if (!hasChart) return
    const el = frameRef.current
    if (!el) return

    const update = (width: number, height: number) => {
      const nextWidth = Math.max(240, Math.floor(width))
      const nextHeight = Math.max(180, Math.floor(height))
      setSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight },
      )
    }

    update(el.clientWidth, el.clientHeight)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      update(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasChart])

  const { width, height } = size

  const allGrowth = growthLines.flatMap((s) => s.points.map((p) => p.growth))
  const minG = allGrowth.length ? Math.min(...allGrowth, 0) : 0
  const maxG = allGrowth.length ? Math.max(...allGrowth, 0) : 100
  const spanG = maxG - minG || 1
  const yTicks = [minG, minG + spanG / 2, maxG]
  const tickLabels = yTicks.map(formatAxisPercent)
  const longestLabel = Math.max(...tickLabels.map((label) => label.length), 4)
  const leftPad = Math.min(72, Math.max(36, Math.ceil(longestLabel * 6.2) + 8))
  const pad = { top: 16, right: 12, bottom: 28, left: leftPad }

  const xFor = (year: number) =>
    pad.left + ((year - fromYear) / Math.max(toYear - fromYear, 1)) * (width - pad.left - pad.right)
  const yFor = (growth: number) =>
    pad.top + (1 - (growth - minG) / spanG) * (height - pad.top - pad.bottom)

  /** Map a client x to the nearest year on the axis. */
  const pickYear = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    // The SVG is drawn at `width` user units but laid out at rect.width CSS px.
    const x = (clientX - rect.left) * (width / rect.width)
    const span = Math.max(toYear - fromYear, 1)
    const raw = fromYear + ((x - pad.left) / (width - pad.left - pad.right)) * span
    setHoverYear(Math.min(toYear, Math.max(fromYear, Math.round(raw))))
  }

  const readouts =
    hoverYear === null
      ? []
      : growthLines
          .flatMap((line) => {
            const point = line.points.find((p) => p.year === hoverYear)
            return point
              ? [{ id: line.id, label: line.label, color: line.color, growth: point.growth }]
              : []
          })
          .sort((a, b) => b.growth - a.growth)

  const hoverX = hoverYear === null ? 0 : xFor(hoverYear)
  // Flip the tooltip to whichever side has room instead of measuring it.
  const tooltipOnLeft = hoverX > width / 2

  return (
    <section className="compare-panel growth-chart-panel" aria-label="Динамика роста">
      <div className="compare-panel-header">
        <h3>Динамика роста: корзина vs акции</h3>
      </div>

      {!hasChart ? (
        <p className="muted">Выберите акции, чтобы увидеть график.</p>
      ) : (
        <div className="growth-chart-body">
          <div className="growth-chart-frame" ref={frameRef}>
            <svg
              ref={svgRef}
              className="growth-chart-svg"
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`Рост с ${fromYear} по ${toYear}`}
              // Move-to-inspect for mice; tap-to-inspect for touch, where
              // reacting to every move would fight the page scroll.
              onPointerMove={(e) => e.pointerType === 'mouse' && pickYear(e.clientX)}
              onPointerDown={(e) => pickYear(e.clientX)}
              onPointerLeave={() => setHoverYear(null)}
            >
              {yTicks.map((tick, index) => (
                <g key={tick}>
                  <line
                    x1={pad.left}
                    x2={width - pad.right}
                    y1={yFor(tick)}
                    y2={yFor(tick)}
                    stroke="#2a2d33"
                    strokeWidth={1}
                  />
                  <text
                    x={pad.left - 6}
                    y={yFor(tick) + 3}
                    textAnchor="end"
                    fill="#91919c"
                    fontSize={9}
                  >
                    {tickLabels[index]}
                  </text>
                </g>
              ))}

              <text x={pad.left} y={height - 8} fill="#91919c" fontSize={9}>
                {fromYear}
              </text>
              <text
                x={width - pad.right}
                y={height - 8}
                textAnchor="end"
                fill="#91919c"
                fontSize={9}
              >
                {toYear}
              </text>

              {growthLines.map((line) => {
                const d = line.points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.year)} ${yFor(p.growth)}`)
                  .join(' ')
                return (
                  <path
                    key={line.id}
                    d={d}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={line.id === 'cart' ? 2.5 : 2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )
              })}

              {hoverYear !== null && readouts.length > 0 && (
                <g pointerEvents="none">
                  <line
                    x1={hoverX}
                    x2={hoverX}
                    y1={pad.top}
                    y2={height - pad.bottom}
                    stroke="#5a5d66"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  {readouts.map((r) => (
                    <circle
                      key={r.id}
                      cx={hoverX}
                      cy={yFor(r.growth)}
                      r={3}
                      fill={r.color}
                      stroke="#0b0b0d"
                      strokeWidth={1.5}
                    />
                  ))}
                </g>
              )}
            </svg>

            {hoverYear !== null && readouts.length > 0 && (
              <div
                className="growth-chart-tooltip"
                style={
                  tooltipOnLeft
                    ? { right: `${((width - hoverX) / width) * 100}%`, marginRight: '0.6rem' }
                    : { left: `${(hoverX / width) * 100}%`, marginLeft: '0.6rem' }
                }
                aria-hidden="true"
              >
                <p className="growth-chart-tooltip-year">{hoverYear}</p>
                <ul>
                  {readouts.slice(0, TOOLTIP_LIMIT).map((r) => (
                    <li key={r.id}>
                      <span className="growth-chart-swatch" style={{ background: r.color }} />
                      <span className="growth-chart-tooltip-label">{r.label}</span>
                      <span className="growth-chart-tooltip-value">{formatPercent(r.growth)}</span>
                    </li>
                  ))}
                </ul>
                {readouts.length > TOOLTIP_LIMIT && (
                  <p className="growth-chart-tooltip-more">
                    и ещё {readouts.length - TOOLTIP_LIMIT}
                  </p>
                )}
              </div>
            )}
          </div>

          <ul className="growth-chart-legend">
            {growthLines.map((line) => (
              <li key={line.id}>
                <span className="growth-chart-swatch" style={{ background: line.color }} />
                {line.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
