import { PriceInfo } from './PriceInfo'

interface BasketCardProps {
  image: string
  year: number
  startPrice: number
  currentPrice: number
  growthPercent: number
}

export function BasketCard({
  image,
  year,
  startPrice,
  currentPrice,
  growthPercent,
}: BasketCardProps) {
  return (
    <article className="comparison-card">
      <h2>Корзина скуфа</h2>

      <img src={image} alt="Корзина скуфа" className="basket-image" />

      <PriceInfo
        year={year}
        startPrice={startPrice}
        currentPrice={currentPrice}
        growthPercent={growthPercent}
      />
    </article>
  )
}
