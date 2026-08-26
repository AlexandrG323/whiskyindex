import { describe, expect, it } from '@jest/globals'
import { DEFAULT_YEAR, MAX_YEAR, MIN_YEAR, parseYear } from './years'

describe('parseYear', () => {
  it('returns DEFAULT_YEAR when the query value is missing', () => {
    expect(parseYear(undefined)).toBe(DEFAULT_YEAR)
  })

  it('returns DEFAULT_YEAR when the query value is empty', () => {
    expect(parseYear('')).toBe(DEFAULT_YEAR)
  })

  it('returns the custom fallback for invalid input', () => {
    expect(parseYear('nope', MAX_YEAR)).toBe(MAX_YEAR)
  })

  it('clamps years below MIN_YEAR', () => {
    expect(parseYear('1990')).toBe(MIN_YEAR)
  })

  it('clamps years above MAX_YEAR', () => {
    expect(parseYear('2099')).toBe(MAX_YEAR)
  })

  it('truncates a finite number to an integer inside the range', () => {
    expect(parseYear('2007.9')).toBe(2007)
  })

  it('truncates a finite number to an integer inside the range, with a comma', () => {
    expect(parseYear('2007,9')).toBe(2007)
  })
})
