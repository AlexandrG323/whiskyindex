import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Pool } from 'pg'
import { PG_POOL } from '../database/database.constants'
import type {
  ResolveStockDto,
  ResolveStockResponseDto,
  StockDetailDto,
  StockHistoryDto,
  StocksBatchHistoryRequestDto,
  StockYearlyPriceDto,
} from '../dto/common.dto'
import { StockImportService } from '../import/stock-import.service'

/**
 * Stocks читают Postgres. Внешние API — только через StockImportService
 * (см. backend/src/import/HOMEWORK.md).
 *
 * TODO (домашка — cache miss):
 * - getHistory / getDefaultStocks: если цен нет → stockImport.importStockById(id)
 *   затем либо подождать ready, либо вернуть 202 + importing (HttpException / @Res)
 * - resolve: если тикера нет → INSERT в stocks → importStockById → вернуть id + status
 */
@Injectable()
export class StocksService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly stockImport: StockImportService,
  ) {}

  async getDefaultStocks(
    year = 2007,
    currency: 'rub' | 'usd' = 'rub',
    curatedOnly = true,
  ): Promise<StockYearlyPriceDto[]> {
    const displayCurrency = currency === 'rub' ? 'RUB' : 'USD'

    const whereClause = curatedOnly ? 'WHERE s.is_curated = true' : ''

    const { rows: stocks } = await this.pool.query(
      `
      SELECT
        s.id,
        s.symbol,
        s.company_name,
        s.country,
        s.exchange,
        s.source,
        s.native_currency,
        s.import_status,
        s.image_url,
        sp.average_price
      FROM stocks AS s
      LEFT JOIN stock_prices AS sp
        ON sp.stock_id = s.id AND sp.year = $1
      ${whereClause}
      ORDER BY s.symbol ASC
      `,
      [year],
    )

    if (stocks.length === 0) {
      return []
    }

    // Проверяем, есть ли акции без загруженной цены за этот год
    const missingPriceStocks = stocks.filter((s) => s.average_price === null)

    // Если есть акции без цены — запускаем импорт для каждой
    if (missingPriceStocks.length > 0) {
      for (const stock of missingPriceStocks) {
        try {
          await this.stockImport.importStockById(stock.id, year, year)
        } catch {
          // Игнорируем ошибки отдельного импорта, чтобы отдавать то, что загрузилось
        }
      }

      // Перезапрашиваем данные из БД после импорта
      const retryResult = await this.pool.query(
        `
        SELECT
          s.id,
          s.symbol,
          s.company_name,
          s.country,
          s.exchange,
          s.source,
          s.native_currency,
          s.import_status,
          s.image_url,
          sp.average_price
        FROM stocks AS s
        LEFT JOIN stock_prices AS sp
          ON sp.stock_id = s.id AND sp.year = $1
        ${whereClause}
        ORDER BY s.symbol ASC
        `,
        [year],
      )

      stocks.splice(0, stocks.length, ...retryResult.rows)
    }

    // Достаем курсы валют
    const { rows: rateRows } = await this.pool.query(
      `
      SELECT year, rate
      FROM exchange_rates
      WHERE year = $1
        AND base_currency = 'USD'
        AND quote_currency = 'RUB'
      `,
      [year],
    )

    const fxRate = rateRows.length > 0 ? Number(rateRows[0].rate) : 1

    return stocks.map((row) => {
      const nativeAmount = row.average_price !== null ? Number(row.average_price) : null
      let amount = nativeAmount

      if (nativeAmount !== null && row.native_currency !== displayCurrency) {
        amount = row.native_currency === 'USD' ? nativeAmount * fxRate : nativeAmount / fxRate
      }

      return {
        id: row.id,
        symbol: row.symbol,
        companyName: row.company_name,
        country: row.country,
        exchange: row.exchange,
        source: row.source,
        nativeCurrency: row.native_currency,
        displayCurrency,

        importStatus: row.import_status,
        imageUrl: row.image_url,
        price: amount !== null ? Number(amount.toFixed(2)) : 0,
      }
    })
  }

  async getById(id: string): Promise<StockDetailDto> {
    // LEFT JOIN: акция видна даже без цен (poll importStatus после resolve)
    const { rows } = await this.pool.query(
      `
        SELECT
          s.id,
          s.symbol,
          s.company_name,
          s.image_url,
          s.exchange,
          s.native_currency,
          s.import_status,
          MIN(sp.year) AS coverage_from,
          MAX(sp.year) AS coverage_to
        FROM stocks AS s
        LEFT JOIN stock_prices AS sp
          ON sp.stock_id = s.id
        WHERE s.id = $1
        GROUP BY
          s.id,
          s.symbol,
          s.company_name,
          s.image_url,
          s.exchange,
          s.native_currency,
          s.import_status
      `,
      [id],
    )

    if (rows.length === 0) {
      throw new NotFoundException(`Stock with id "${id}" not found`)
    }

    const [row] = rows

    return {
      id: row.id,
      symbol: row.symbol,
      companyName: row.company_name,
      imageUrl: row.image_url,
      exchange: row.exchange,
      nativeCurrency: row.native_currency,
      importStatus: row.import_status,
      coverage:
        row.coverage_from === null || row.coverage_to === null
          ? null
          : {
              from: Number(row.coverage_from),
              to: Number(row.coverage_to),
            },
    }
  }

  async getHistory(
    id: string,
    from = 2007,
    to = 2026,
    currency: 'rub' | 'usd' = 'rub',
  ): Promise<StockHistoryDto> {
    const displayCurrency = currency === 'rub' ? 'RUB' : 'USD'

    let { rows } = await this.pool.query(
      `
        SELECT
          s.id,
          s.symbol,
          s.image_url,
          s.native_currency,
          s.import_status,
          sp.year,
          sp.average_price
        FROM stocks AS s
        JOIN stock_prices AS sp
          ON sp.stock_id = s.id
        WHERE
          s.id = $1
          AND sp.year BETWEEN $2 AND $3
        ORDER BY sp.year ASC
      `,
      [id, from, to],
    )

    // CACHE MISS: Запускаем импорт, если строк в БД пока нет

    const existingYears = rows.map((row) => Number(row.year))

    const expectedYearsCount = to - from + 1

    const hasCompleteHistory = existingYears.length === expectedYearsCount

    if (!hasCompleteHistory) {
      // Проверяем, существует ли акция вообще
      await this.getById(id)

      // Импортируем синхронно
      await this.stockImport.importStockById(id, from, to)

      // Повторяем выборку после успешного импорта
      const retryResult = await this.pool.query(
        `
          SELECT
            s.id,
            s.symbol,
            s.image_url,
            s.native_currency,
            s.import_status,
            sp.year,
            sp.average_price
          FROM stocks AS s
          JOIN stock_prices AS sp
            ON sp.stock_id = s.id
          WHERE
            s.id = $1
            AND sp.year BETWEEN $2 AND $3
          ORDER BY sp.year ASC
        `,
        [id, from, to],
      )

      rows = retryResult.rows
    }

    if (rows.length === 0) {
      throw new NotFoundException(`No history for stock "${id}" between ${from}-${to}.`)
    }

    const [firstRow] = rows

    let exchangeRates = new Map<number, number>()

    if (firstRow.native_currency !== displayCurrency) {
      const { rows: rateRows } = await this.pool.query(
        `
          SELECT year, rate
          FROM exchange_rates
          WHERE year BETWEEN $1 AND $2
            AND base_currency = 'USD'
            AND quote_currency = 'RUB'
        `,
        [from, to],
      )

      exchangeRates = new Map(rateRows.map((row) => [Number(row.year), Number(row.rate)]))
    }

    return {
      id: firstRow.id,
      symbol: firstRow.symbol,
      imageUrl: firstRow.image_url,
      nativeCurrency: firstRow.native_currency,
      displayCurrency,
      importStatus: firstRow.import_status,
      prices: rows.map((row) => {
        const nativeAmount = Number(row.average_price)

        let amount = nativeAmount

        if (row.native_currency !== displayCurrency) {
          const rate = exchangeRates.get(Number(row.year))

          if (!rate) {
            throw new NotFoundException(`Exchange rate for ${row.year} not found`)
          }

          amount = row.native_currency === 'USD' ? nativeAmount * rate : nativeAmount / rate
        }

        return {
          year: Number(row.year),
          nativeAmount,
          amount,
        }
      }),
    }
  }

  async getBatchHistory(body: StocksBatchHistoryRequestDto): Promise<StockHistoryDto[]> {
    const { ids, from, to, currency } = body

    return Promise.all(ids.map((id) => this.getHistory(id, from, to, currency)))
  }

  async resolve(body: ResolveStockDto): Promise<ResolveStockResponseDto> {
    const symbol = body.symbol.trim().toUpperCase()
    const exchange = body.exchange.trim().toUpperCase()

    let { rows } = await this.pool.query(
      `
        SELECT id, symbol, import_status, image_url
        FROM stocks
        WHERE symbol = $1 AND exchange = $2
        LIMIT 1
      `,
      [symbol, exchange],
    )

    // Если акции нет в базе — создаем запись и запускаем импорт
    if (rows.length === 0) {
      const source = exchange === 'MOEX' || exchange === 'TQBR' ? 'moex' : 'yahoo'
      const nativeCurrency = source === 'moex' ? 'RUB' : 'USD'

      const insertResult = await this.pool.query(
        `
        INSERT INTO stocks (symbol, company_name, country, exchange, source, native_currency, import_status)
        VALUES ($1, $1, $2, $3, $4, $5, 'pending')
        RETURNING id, symbol, import_status, image_url
        `,
        [symbol, source === 'moex' ? 'Russia' : 'USA', exchange, source, nativeCurrency],
      )

      rows = insertResult.rows
      const newStock = rows[0]

      // Запускаем импорт для новой акции
      await this.stockImport.importStockById(newStock.id)

      // Запрашиваем обновленный статус
      const updated = await this.pool.query(
        `SELECT id, symbol, import_status, image_url FROM stocks WHERE id = $1`,
        [newStock.id],
      )
      rows = updated.rows
    }

    const [row] = rows

    return {
      id: row.id,
      symbol: row.symbol,
      importStatus: row.import_status,
      imageUrl: row.image_url,
    }
  }
}
