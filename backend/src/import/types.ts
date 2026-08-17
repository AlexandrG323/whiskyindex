/** Одна годовая средняя цена после агрегации месячных свечей. */
export type YearlyAveragePrice = {
  year: number
  /** Split-adjusted price — what one share cost that year. This is displayed. */
  averagePrice: number
  /**
   * Same year on a total-return basis: dividends reinvested. Kept for growth
   * and percentage maths later; never shown as a price, because it is not one.
   * Exxon's 2007 share price was $83.83 while its total-return value is $43.13.
   * null for MOEX, which publishes no usable dividend history for this period.
   */
  totalReturnPrice: number | null
  currency: string
}

/** Месячная свеча (OHLC) — сырые данные с биржи. */
export type MonthlyCandle = {
  /** Начало месяца, ISO date `YYYY-MM-DD` */
  date: string
  open: number
  high: number
  low: number
  /** Split-adjusted close — the actual traded price. */
  close: number
  /** Total-return close (dividends reinvested). Absent where unavailable. */
  adjClose?: number
}

export type StockSource = 'moex' | 'yahoo'

export type CandleFetchResult = {
  candles: MonthlyCandle[]
  /** Issuer name from the venue, when it sent one. */
  companyName: string | null
  /** Venue quote currency (Yahoo `meta.currency`), when present. */
  currency: string | null
}
