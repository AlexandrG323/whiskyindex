import { PriceInfo } from './PriceInfo'

interface StockCardProps {
  companyName: string
  imageUrl: string
  year: number
  startPrice: number
  currentPrice: number
  growthPercent: number
}

export function StockCard({
  companyName,
  imageUrl,
  year,
  startPrice,
  currentPrice,
  growthPercent,
}: StockCardProps) {
  return (
    <article className="comparison-card">
      <header className="stock-header">
        <h2>{companyName}</h2>

        <img src={imageUrl} alt={companyName} className="company-logo" />
      </header>

      <PriceInfo
        year={year}
        startPrice={startPrice}
        currentPrice={currentPrice}
        growthPercent={growthPercent}
      />
    </article>
  )
}
