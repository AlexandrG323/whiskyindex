interface PriceInfoProps {
  year: number
  startPrice: number
  currentPrice: number
  growthPercent: number
  variant?: 'basket' | 'investment'
  currency?: 'RUB' | 'USD'
}

function formatMoney(amount: number, currency: 'RUB' | 'USD') {
  const digits = Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

function formatGrowth(value: number) {
  const rounded = Math.round(value)
  const sign = rounded >= 0 ? '+' : ''
  return `${sign}${rounded.toLocaleString('ru-RU')}%`
}

export function PriceInfo({
  year,
  startPrice,
  currentPrice,
  growthPercent,
  variant = 'basket',
  currency = 'RUB',
}: PriceInfoProps) {
  const startLabel = variant === 'investment' ? `Вложено в ${year}` : `В ${year} году`

  return (
    <div className="price-info">
      <div>
        <span>{startLabel}</span>
        <h3>{formatMoney(startPrice, currency)}</h3>
      </div>

      <div>
        <span>Сегодня</span>
        <h3>{formatMoney(currentPrice, currency)}</h3>
      </div>

      <div>
        <span>Рост</span>
        <h3 className={growthPercent >= 0 ? 'growth' : 'growth-negative'}>
          {formatGrowth(growthPercent)}
        </h3>
      </div>
    </div>
  )
}
