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

export function formatMoney(amount: number, currency: 'RUB' | 'USD') {
  const expensiveRubles = currency === 'RUB' && Math.abs(amount) >= 100
  const digits = expensiveRubles || Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

export function stockInvestmentRange(stock: CompareStock) {
  const shares = stock.atFrom.sharesPerCart
  return {
    from: Math.round(shares * stock.priceFrom * 100) / 100,
    to: Math.round(shares * stock.priceTo * 100) / 100,
  }
}

function whiskyWord(count: number) {
  const abs = Math.abs(count) % 100
  const ones = abs % 10
  if (abs >= 11 && abs <= 14) return 'вискарей'
  if (ones === 1) return 'вискарь'
  if (ones >= 2 && ones <= 4) return 'вискаря'
  return 'вискарей'
}

/** Bottles of whisky the stock's cart-sized P&L would buy (or burn) today. */
export function formatWhiskyIndex(share: number): string {
  const lost = share < 0
  const abs = Math.abs(share)
  if (abs < 0.08) return lost ? 'минус пару капель' : 'на пару капель'
  if (abs < 1) return lost ? 'минус стакан' : 'на стакан'

  const count = Math.floor(abs)
  const label = `${count.toLocaleString('ru-RU')} ${whiskyWord(count)}`
  return lost ? `минус ${label}` : label
}
