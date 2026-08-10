import { PriceInfo } from './PriceInfo'
import { StockTrendChart } from './StockTrendChart'

interface StockCardProps {
  companyName: string
  heading?: string
  imageUrl: string
  fromYear: number
  toYear: number
  startPrice: number
  currentPrice: number
  growthPercent: number
  historyPrices: { year: number; amount: number }[]
  currency?: 'RUB' | 'USD'
}

export function StockCard({
  companyName,
  heading,
  imageUrl,
  fromYear,
  toYear,
  startPrice,
  currentPrice,
  growthPercent,
  historyPrices,
  currency = 'RUB',
}: StockCardProps) {
  return (
    <article className="comparison-card">
      <header className="stock-header">
        <h2>{heading ?? `Лучший рост: ${companyName}`}</h2>
        <img src={imageUrl} alt={companyName} className="company-logo" />
      </header>

      <div className="comparison-card-body">
        <PriceInfo
          year={fromYear}
          startPrice={startPrice}
          currentPrice={currentPrice}
          growthPercent={growthPercent}
          variant="investment"
          currency={currency}
        />

        <StockTrendChart prices={historyPrices} fromYear={fromYear} toYear={toYear} />
      </div>
    </article>
  )
}
