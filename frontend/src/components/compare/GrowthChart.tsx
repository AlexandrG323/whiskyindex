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
  const [size, setSize] = useState({ width: 640, height: 280 })

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
              className="growth-chart-svg"
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`Рост с ${fromYear} по ${toYear}`}
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
            </svg>
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
