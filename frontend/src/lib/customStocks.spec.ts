import { beforeEach, describe, expect, it } from 'vitest'
import { listingKey, loadCustomStocks, removeCustomStock, saveCustomStock } from './customStocks'

const STORAGE_KEY = 'whiskyindex:customStocks'

const aapl = { id: 'uuid-aapl', symbol: 'AAPL', exchange: 'NASDAQ' }
const gazp = { id: 'uuid-gazp', symbol: 'GAZP', exchange: 'MOEX' }

describe('listingKey', () => {
  it('uppercases and trims symbol and exchange', () => {
    expect(listingKey(' aapl ', ' nasdaq ')).toBe('AAPL|NASDAQ')
  })
})

describe('custom stock storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a saved listing', () => {
    expect(saveCustomStock(aapl)).toEqual([])
    expect(loadCustomStocks()).toEqual([])
  })

  it('ignores a duplicate id or listing', () => {
    saveCustomStock(aapl)
    expect(saveCustomStock(aapl)).toEqual([aapl])
    expect(saveCustomStock({ id: 'other', symbol: 'aapl', exchange: 'nasdaq' })).toEqual([aapl])
  })

  it('drops invalid JSON and malformed entries', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(loadCustomStocks()).toEqual([])

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([aapl, { foo: 1 }, { id: '', symbol: 'X', exchange: 'Y' }, gazp]),
    )
    expect(loadCustomStocks()).toEqual([aapl, gazp])
  })

  it('removes by id', () => {
    saveCustomStock(aapl)
    saveCustomStock(gazp)
    expect(removeCustomStock(aapl.id)).toEqual([gazp])
    expect(loadCustomStocks()).toEqual([gazp])
  })
})
