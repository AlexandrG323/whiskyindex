import { PriceInfo } from './PriceInfo'

interface WhiskyCardProps {
  name: string
  year: number
  startPrice: number
  currentPrice: number
  growthPercent: number
  currency?: 'RUB' | 'USD'
}

export function WhiskyCard({
  name,
  year,
  startPrice,
  currentPrice,
  growthPercent,
  currency = 'RUB',
}: WhiskyCardProps) {
  return (
    <article className="comparison-card">
      <h2>{name}</h2>

      <div className="comparison-card-body">
        <PriceInfo
          year={year}
          startPrice={startPrice}
          currentPrice={currentPrice}
          growthPercent={growthPercent}
          currency={currency}
        />

        <img src="/icons/jameson.png" alt={name} className="product-image" />
      </div>
    </article>
  )
}
