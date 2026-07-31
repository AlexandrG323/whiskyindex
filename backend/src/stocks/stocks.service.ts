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

@Injectable()
export class StocksService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getDefaultStocks(
    year = 2007,
    currency: 'rub' | 'usd' = 'rub',
    curatedOnly = false,
  ): Promise<StockYearlyPriceDto[]> {
    const displayCurrency = currency === 'rub' ? 'RUB' : 'USD'

    let sql = `
      SELECT
        s.id,
        s.symbol,
        s.company_name,
        s.image_url,
        s.native_currency,
        s.import_status,
        sp.average_price
      FROM stocks s
      JOIN stock_prices sp
        ON sp.stock_id = s.id
      WHERE
        sp.year = $1
        AND s.is_active = true
    `

    if (curatedOnly) {
      sql += ` AND s.is_curated = true`
    }

    const { rows } = await this.pool.query(sql, [year])

    if (rows.length === 0) {
      throw new NotFoundException(`No stocks found for year ${year}`)
    }

    let rate: number | null = null

    if (rows.some((row) => row.native_currency !== displayCurrency)) {
      const exchange = await this.pool.query(
        `
        SELECT rate
        FROM exchange_rates
        WHERE
            year = $1
            AND base_currency = 'USD'
            AND quote_currency = 'RUB'
        `,
        [year],
      )

      if (exchange.rows.length === 0) {
        throw new NotFoundException(`Exchange rate for ${year} not found`)
      }

      rate = Number(exchange.rows[0].rate)
    }

    return rows.map((row) => {
      let price = Number(row.average_price)

      if (row.native_currency !== displayCurrency) {
        if (row.native_currency === 'USD') {
          price *= rate ?? 1
        } else {
          price /= rate ?? 1
        }
      }

      return {
        id: row.id,
        symbol: row.symbol,
        companyName: row.company_name,
        imageUrl: row.image_url,
        nativeCurrency: row.native_currency,
        displayCurrency,
        price,
        importStatus: row.import_status,
      }
    })
  }

  async getById(id: string): Promise<StockDetailDto> {
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
        JOIN stock_prices AS sp
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

    if (row.coverage_from === null || row.coverage_to === null) {
      throw new NotFoundException(`Stock "${row.symbol}" has no historical price data`)
    }

    return {
      id: row.id,
      symbol: row.symbol,
      companyName: row.company_name,
      imageUrl: row.image_url,
      exchange: row.exchange,
      nativeCurrency: row.native_currency,
      importStatus: row.import_status,
      coverage: {
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

    const { rows } = await this.pool.query(
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

    if (rows.length === 0) {
      throw new NotFoundException(`No history found for stock "${id}" between ${from} and ${to}`)
    }

    const [firstRow] = rows

    let exchangeRates = new Map<number, number>()

    if (firstRow.native_currency !== displayCurrency) {
      const { rows: rateRows } = await this.pool.query(
        `
          SELECT
            year,
            rate
          FROM exchange_rates
          WHERE
            year BETWEEN $1 AND $2
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
    const exchange = body.exchange.trim()

    const { rows } = await this.pool.query(
      `
        SELECT
          id,
          symbol,
          import_status,
          image_url
        FROM stocks
        WHERE
          symbol = $1
          AND exchange = $2
        LIMIT 1
      `,
      [symbol, exchange],
    )

    if (rows.length === 0) {
      throw new NotFoundException(`Stock "${symbol}" on exchange "${exchange}" not found`)
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
