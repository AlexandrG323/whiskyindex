import './comparison.css'
import { BasketCard } from './BasketCard'
import { stockInvestmentRange, stockLogoUrl } from './comparisonUtils'
import { StockCard } from './StockCard'

export type CompareStock = {
  id: string
  symbol: string
  companyName: string
  imageUrl: string | null
  priceFromYear: number
  priceToYear: number
  priceFrom: number
  priceTo: number
  growthPercent: number
  atFrom: { sharesPerCart: number }
}

interface HeroComparisonProps {
  fromYear: number
  currency: 'RUB' | 'USD'
  cartFrom: number
  cartTo: number
  cartGrowthPercent: number
  stock: CompareStock
  historyPrices: { year: number; amount: number }[]
}

export function HeroComparison({
  fromYear,
  currency,
  cartFrom,
  cartTo,
  cartGrowthPercent,
  stock,
  historyPrices,
}: HeroComparisonProps) {
  const investment = stockInvestmentRange(stock)

  return (
    <section className="comparison-row" aria-label="Корзина и лучшая акция">
      <BasketCard
        image="/icons/cart.png"
        year={fromYear}
        startPrice={cartFrom}
        currentPrice={cartTo}
        growthPercent={cartGrowthPercent}
        currency={currency}
      />

      <StockCard
        companyName={stock.companyName}
        imageUrl={stockLogoUrl(stock)}
        fromYear={stock.priceFromYear}
        toYear={stock.priceToYear}
        startPrice={investment.from}
        currentPrice={investment.to}
        growthPercent={stock.growthPercent}
        historyPrices={historyPrices}
        currency={currency}
      />
    </section>
  )
}
