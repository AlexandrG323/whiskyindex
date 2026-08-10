import type { CompareStock } from './HeroComparison'

export function pickTopGrowthStock(stocks: CompareStock[]): CompareStock | undefined {
  if (stocks.length === 0) return undefined
  return stocks.reduce((best, current) =>
    current.growthPercent > best.growthPercent ? current : best,
  )
}

export function pickWorstGrowthStock(stocks: CompareStock[]): CompareStock | undefined {
  if (stocks.length === 0) return undefined
  return stocks.reduce((worst, current) =>
    current.growthPercent < worst.growthPercent ? current : worst,
  )
}

export function stockInvestmentRange(stock: CompareStock) {
  const shares = stock.atFrom.sharesPerCart
  return {
    from: Math.round(shares * stock.priceFrom * 100) / 100,
    to: Math.round(shares * stock.priceTo * 100) / 100,
  }
}

export function stockLogoUrl(stock: CompareStock) {
  return stock.imageUrl ?? `/icons/stocks/${stock.symbol.toLowerCase()}.svg`
}
