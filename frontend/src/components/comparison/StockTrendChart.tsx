interface StockTrendChartProps {
  prices: { year: number; amount: number }[]
  fromYear: number
  toYear: number
}

export function StockTrendChart({ prices, fromYear, toYear }: StockTrendChartProps) {
  if (prices.length < 2) {
    return <div className="stock-trend-chart stock-trend-chart--empty" aria-hidden="true" />
  }

  const width = 280
  const height = 140
  const padX = 8
  const padY = 12

  const amounts = prices.map((p) => p.amount)
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)
  const span = max - min || 1

  const points = prices.map((p, i) => {
    const x = padX + (i / (prices.length - 1)) * (width - padX * 2)
    const y = padY + (1 - (p.amount - min) / span) * (height - padY * 2)
    return `${x},${y}`
  })

  const line = points.join(' ')
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`
  const chartTitle = `График цены с ${fromYear} по ${toYear}`

  return (
    <figure className="stock-trend-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={chartTitle}
      >
        <title>{chartTitle}</title>
        <defs>
          <linearGradient id="stockTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffb23d" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffb23d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#stockTrendFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#ffb23d"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <figcaption className="stock-trend-chart__years">
        <span>{fromYear}</span>
        <span>{toYear}</span>
      </figcaption>
    </figure>
  )
}
