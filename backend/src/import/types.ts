/** Одна годовая средняя цена после агрегации месячных свечей. */
export type YearlyAveragePrice = {
  year: number
  averagePrice: number
  currency: 'RUB' | 'USD'
}

/** Месячная свеча (OHLC) — сырые данные с биржи. */
export type MonthlyCandle = {
  /** Начало месяца, ISO date `YYYY-MM-DD` */
  date: string
  open: number
  high: number
  low: number
  close: number
}

export type StockSource = 'moex' | 'yahoo'
