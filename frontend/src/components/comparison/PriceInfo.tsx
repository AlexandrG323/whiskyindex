interface PriceInfoProps {
  year: number
  startPrice: number
  currentPrice: number
  growthPercent: number
}

export function PriceInfo({ year, startPrice, currentPrice, growthPercent }: PriceInfoProps) {
  return (
    <div className="price-info">
      <div>
        <span>В {year} году</span>
        <h3>{startPrice.toLocaleString()} ₽</h3>
      </div>

      <div>
        <span>Сегодня</span>
        <h3>{currentPrice.toLocaleString()} ₽</h3>
      </div>

      <div>
        <span>Рост</span>

        <h3 className="growth">+{growthPercent}%</h3>
      </div>
    </div>
  )
}
