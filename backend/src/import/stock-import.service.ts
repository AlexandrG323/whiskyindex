import { Inject, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common'
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
 *
 * Порядок реализации (домашка):
 * A. MoexClient.fetchMonthlyCandles + YahooClient.fetchMonthlyCandles
 * B. averageByYear() — чистая функция, можно покрыть простым ручным тестом
 * C. persistYearlyPrices() — INSERT в Postgres
 * D. importStockById() — склейка всего + статусы
 * E. Подключить вызов из StocksService (history / resolve) при cache miss
 */
@Injectable()
export class StockImportService {
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
    _stockId: string,
    _fromYear = 2007,
    _toYear = new Date().getFullYear(),
  ): Promise<void> {
    void this.pool
    void this.moex
    void this.yahoo
    throw new NotImplementedException(
      'StockImportService.importStockById — склей клиенты + запись в БД (см. HOMEWORK.md)',
    )
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
  averageByYear(_candles: MonthlyCandle[], _currency: 'RUB' | 'USD'): YearlyAveragePrice[] {
    throw new NotImplementedException('averageByYear — чистая агрегация без сети и БД')
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
  async persistYearlyPrices(_stockId: string, _yearly: YearlyAveragePrice[]): Promise<void> {
    void this.pool
    throw new NotImplementedException('persistYearlyPrices — UPSERT в stock_prices / coverage')
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
