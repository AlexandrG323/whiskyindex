import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { Pool } from 'pg'
import { PG_POOL } from '../database/database.constants'
import { MoexClient } from './clients/moex.client'
import { YahooClient } from './clients/yahoo.client'
import type { MonthlyCandle, YearlyAveragePrice } from './types'

type StockRow = {
  id: string
  symbol: string
  source: 'moex' | 'yahoo'
  native_currency: 'RUB' | 'USD'
  import_status: string
}

/**
 * Import Service (SPEC.md → cache miss / resolve).
 *
 * Отвечает за:
 * 1. Выбор клиента по stocks.source (`moex` | `yahoo`)
 * 2. Скачивание месячных свечей
 * 3. Агрегацию в среднюю цену за год
 * 4. Запись в stock_prices + stock_data_coverage
 * 5. Обновление import_status: pending → importing → ready | failed
 *
 * ВАЖНО (SPEC): контроллеры НЕ ходят во внешние API сами — только через этот сервис.
 * Пока импорт идёт, StocksService должен отдавать 202 + importStatus=importing.
 */
@Injectable()
export class StockImportService {
  private readonly logger = new Logger(StockImportService.name)

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly moex: MoexClient,
    private readonly yahoo: YahooClient,
  ) {}

  /**
   * Главная точка входа: импортировать историю для акции по id.
   *
   * Алгоритм:
   * 1. SELECT stock из БД; если нет → NotFoundException
   * 2. UPDATE import_status = 'importing', import_error = NULL
   * 3. Вызови нужный client.fetchMonthlyCandles(symbol, fromYear, toYear)
   *    (по умолчанию fromYear=2007, toYear=текущий год)
   * 4. candles → averageByYear(candles, native_currency)
   * 5. persistYearlyPrices(stockId, yearly)
   * 6. UPDATE import_status = 'ready', prices_cached_at = now()
   * 7. На любой ошибке: UPDATE import_status = 'failed', import_error = message; пробрось ошибку
   *
   * Не стартуй второй импорт, если статус уже `importing` (простая защита от гонок).
   */
  async importStockById(
    stockId: string,
    fromYear = 2007,
    toYear = new Date().getFullYear(),
  ): Promise<void> {
    const stock = await this.getStockOrThrow(stockId)

    if (stock.import_status === 'importing') {
      this.logger.warn(`Import already in progress for stock ${stockId}`)
      return
    }

    await this.pool.query(
      `UPDATE stocks SET import_status = 'importing', import_error = NULL, updated_at = now() WHERE id = $1`,
      [stockId],
    )

    try {
      let candles: MonthlyCandle[] = []
      if (stock.source === 'moex') {
        candles = await this.moex.fetchMonthlyCandles(stock.symbol, fromYear, toYear)
      } else {
        candles = await this.yahoo.fetchMonthlyCandles(stock.symbol, fromYear, toYear)
      }

      const yearlyPrices = this.averageByYear(candles, stock.native_currency)

      await this.persistYearlyPrices(stockId, yearlyPrices)

      await this.pool.query(
        `UPDATE stocks SET import_status = 'ready', prices_cached_at = now(), updated_at = now() WHERE id = $1`,
        [stockId],
      )
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.logger.error(`Import failed for stock ${stockId}: ${errorMessage}`)

      await this.pool.query(
        `UPDATE stocks SET import_status = 'failed', import_error = $2, updated_at = now() WHERE id = $1`,
        [stockId, errorMessage],
      )
      throw err
    }
  }

  /**
   * Средняя цена за год из месячных свечей.
   *
   * Подсказка: для каждого года возьми close всех месяцев этого года и посчитай среднее.
   * (Можно (open+high+low+close)/4 — тоже ок для MVP; главное — одинаково везде.)
   *
   * Пример:
   *   candles за 2020: 12 месяцев → один YearlyAveragePrice { year: 2020, averagePrice, currency }
   */
  averageByYear(candles: MonthlyCandle[], currency: 'RUB' | 'USD'): YearlyAveragePrice[] {
    if (candles.length === 0) return []

    const yearlyMap = new Map<number, number[]>()

    for (const candle of candles) {
      const year = new Date(candle.date).getUTCFullYear()
      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, [])
      }
      yearlyMap.get(year)?.push(candle.close)
    }

    const result: YearlyAveragePrice[] = []

    for (const [year, prices] of yearlyMap.entries()) {
      const sum = prices.reduce((acc, curr) => acc + curr, 0)
      const averagePrice = Number((sum / prices.length).toFixed(6))
      result.push({
        year,
        averagePrice,
        currency,
      })
    }

    return result.sort((a, b) => a.year - b.year)
  }

  /**
   * Записать годовые цены в stock_prices + stock_data_coverage.
   *
   * SQL-подсказки:
   *   INSERT INTO stock_prices (stock_id, year, average_price, currency, imported_at)
   *   VALUES ($1, $2, $3, $4, now())
   *   ON CONFLICT (stock_id, year) DO UPDATE SET
   *     average_price = EXCLUDED.average_price,
   *     currency = EXCLUDED.currency,
   *     imported_at = now();
   *
   *   Аналогично UPSERT в stock_data_coverage (has_price = true).
   *
   * Лучше обернуть в транзакцию: BEGIN … COMMIT (pool.query('BEGIN') …).
   */
  async persistYearlyPrices(stockId: string, yearly: YearlyAveragePrice[]): Promise<void> {
    if (yearly.length === 0) return

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      for (const item of yearly) {
        await client.query(
          `
          INSERT INTO stock_prices (stock_id, year, average_price, currency, imported_at)
          VALUES ($1, $2, $3, $4, now())
          ON CONFLICT (stock_id, year) DO UPDATE SET
            average_price = EXCLUDED.average_price,
            currency = EXCLUDED.currency,
            imported_at = now()
          `,
          [stockId, item.year, item.averagePrice, item.currency],
        )

        await client.query(
          `
          INSERT INTO stock_data_coverage (stock_id, year, has_price, imported_at)
          VALUES ($1, $2, true, now())
          ON CONFLICT (stock_id, year) DO UPDATE SET
            has_price = true,
            imported_at = now()
          `,
          [stockId, item.year],
        )
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  /** Утилита: прочитать акцию (пригодится в importStockById). */
  async getStockOrThrow(stockId: string): Promise<StockRow> {
    const { rows } = await this.pool.query<StockRow>(
      `
      SELECT id, symbol, source, native_currency, import_status
      FROM stocks
      WHERE id = $1
      `,
      [stockId],
    )
    if (rows.length === 0) {
      throw new NotFoundException(`Stock ${stockId} not found`)
    }
    return rows[0]
  }
}
