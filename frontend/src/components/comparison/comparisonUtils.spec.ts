import { describe, expect, it } from 'vitest'
import {
  formatMoney,
  formatWhiskyIndex,
  pickTopGrowthStock,
  pickWorstGrowthStock,
  stockProfit,
} from './comparisonUtils'
import type { CompareStock } from './HeroComparison'

function stock(overrides: Partial<CompareStock> & Pick<CompareStock, 'id'>): CompareStock {
  return {
    symbol: 'AAPL',
    companyName: 'Apple',
    exchange: 'NASDAQ',
    imageUrl: null,
    priceFromYear: 2007,
    priceToYear: 2026,
    priceFrom: 10,
    priceTo: 20,
    growthPercent: 100,
    atFrom: { sharesPerCart: 1 },
    whiskyShare: 0,
    cartAtFrom: 100,
    ...overrides,
  }
}

describe('pickTopGrowthStock', () => {
  it('returns undefined for an empty list', () => {
    expect(pickTopGrowthStock([])).toBeUndefined()
  })

  it('returns the stock with the highest growthPercent', () => {
    const winner = stock({ id: 'best', growthPercent: 80 })
    const stocks = [
      stock({ id: 'ok', growthPercent: 10 }),
      winner,
      stock({ id: 'mid', growthPercent: 40 }),
    ]
    expect(pickTopGrowthStock(stocks)).toBe(winner)
  })
})

describe('pickWorstGrowthStock', () => {
  it('returns the stock with the lowest growthPercent', () => {
    const loser = stock({ id: 'worst', growthPercent: -20 })
    const stocks = [stock({ id: 'ok', growthPercent: 10 }), loser]
    expect(pickWorstGrowthStock(stocks)).toBe(loser)
  })
})

describe('formatMoney', () => {
  it('formats cheap rubles with two fraction digits and a ruble sign', () => {
    expect(formatMoney(99.5, 'RUB')).toMatch(/99/)
    expect(formatMoney(99.5, 'RUB')).toMatch(/₽/)
  })

  it('drops fraction digits for rubles of 100 and above', () => {
    expect(formatMoney(1500.9, 'RUB')).toMatch(/1[\s\u00a0\u202f]?501/)
    expect(formatMoney(1500.9, 'RUB')).not.toMatch(/,/)
  })
})

describe('formatWhiskyIndex', () => {
  it('uses the drop / glass copy for fractions under one bottle', () => {
    expect(formatWhiskyIndex(0)).toBe('ни капли')
    expect(formatWhiskyIndex(0.05)).toBe('на пару капель')
    expect(formatWhiskyIndex(-0.05)).toBe('минус пару капель')
    expect(formatWhiskyIndex(0.5)).toBe('на стакан')
  })

  it('declines whole bottles and prefixes losses', () => {
    expect(formatWhiskyIndex(1)).toBe('1 вискарь')
    expect(formatWhiskyIndex(3)).toBe('3 вискаря')
    expect(formatWhiskyIndex(11)).toBe('11 вискарей')
    expect(formatWhiskyIndex(-2)).toBe('минус 2 вискаря')
  })
})

describe('stockProfit', () => {
  it('is cart-sized P&L from growth percent', () => {
    expect(stockProfit(stock({ id: 's', cartAtFrom: 200, growthPercent: 50 }))).toBe(100)
  })
})
