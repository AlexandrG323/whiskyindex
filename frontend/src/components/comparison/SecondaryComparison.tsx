import './comparison.css'
import { stockInvestmentRange, stockLogoUrl } from './comparisonUtils'
import type { CompareStock } from './HeroComparison'
import { StockCard } from './StockCard'
import { WhiskyCard } from './WhiskyCard'

export type JamesonCompare = {
  name: string
  priceFrom: number
  priceTo: number
  growthPercent: number
}

interface SecondaryComparisonProps {
  fromYear: number
  currency: 'RUB' | 'USD'
  jameson: JamesonCompare
  worstStock: CompareStock
  worstHistoryPrices: { year: number; amount: number }[]
}

export function SecondaryComparison({
  fromYear,
  currency,
  jameson,
  worstStock,
  worstHistoryPrices,
}: SecondaryComparisonProps) {
  const investment = stockInvestmentRange(worstStock)

  return (
    <section
      className="comparison-row comparison-row--secondary"
      aria-label="Виски и худший рост акций"
    >
      <WhiskyCard
        name={jameson.name}
        year={fromYear}
        startPrice={jameson.priceFrom}
        currentPrice={jameson.priceTo}
        growthPercent={jameson.growthPercent}
        currency={currency}
      />

      <StockCard
        companyName={worstStock.companyName}
        heading={`Худший рост: ${worstStock.companyName}`}
        imageUrl={stockLogoUrl(worstStock)}
        fromYear={worstStock.priceFromYear}
        toYear={worstStock.priceToYear}
        startPrice={investment.from}
        currentPrice={investment.to}
        growthPercent={worstStock.growthPercent}
        historyPrices={worstHistoryPrices}
        currency={currency}
      />
    </section>
  )
}
