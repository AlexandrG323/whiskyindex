import { BasketCard } from './BasketCard'
import { ComparisonBadge } from './ComparisonBadge'
import { StockCard } from './StockCard'

interface HeroComparisonProps {
  year: number
}

export function HeroComparison({ year }: HeroComparisonProps) {
  return (
    <section className="hero-comparison">
      <BasketCard
        image="/icons/cart.png"
        year={year}
        startPrice={3450}
        currentPrice={72620}
        growthPercent={2103}
      />

      <ComparisonBadge />

      <StockCard
        companyName="Apple"
        imageUrl="https://logo.clearbit.com/apple.com"
        year={year}
        startPrice={3450}
        currentPrice={149182}
        growthPercent={2547}
      />
    </section>
  )
}
