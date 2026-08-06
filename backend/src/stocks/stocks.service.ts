import { Inject, Injectable, NotFoundException, RequestTimeoutException } from '@nestjs/common'
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
import { StockLogoService, type StoredLogo } from './stock-logo.service'

/** Шкала лет приложения — та же, что в seed и в UI. */
const MIN_YEAR = 2007
const MAX_YEAR = 2026

type StockYearRow = {
  id: string
  symbol: string
  company_name: string
  country: string
  exchange: string
  source: string
  native_currency: 'RUB' | 'USD'
  import_status: 'pending' | 'importing' | 'ready' | 'failed'
  image_url: string | null
  prices_cached_at: Date | null
  first_year: number | null
  last_year: number | null
  exact_price: string | null
  prev_price: string | null
  prev_year: number | null
}

/**
 * Why a stock has no price for a given year — three very different facts that
 * were previously all rendered as "failed":
 *
 * - `not_listed`  the year predates the first trade. Philip Morris spun out of
 *                 Altria in March 2008, so 2007 is not a failure, it is a
 *                 company that did not exist. There is no price to show.
 * - `carried`     the year is past the last trade, or falls in a gap. АвтоВАЗ
 *                 was delisted in 2018 at ~12 RUB; holding it through 2026
 *                 leaves you with that final price, so carry it forward rather
 *                 than showing nothing.
 * - `unavailable` we genuinely have no data — a real import failure.
 */
function resolveYearPrice(
  row: StockYearRow,
  year: number,
): {
  price: number | null
  status: 'actual' | 'carried' | 'not_listed' | 'unavailable'
  priceYear: number | null
} {
  if (row.exact_price !== null) {
    return { price: Number(row.exact_price), status: 'actual', priceYear: year }
  }
  // Checked before the carry-forward: a year earlier than everything we hold
  // has no earlier price to inherit anyway, but being explicit keeps the
  // "did not exist yet" case from ever being reported as missing data.
  if (row.first_year !== null && year < Number(row.first_year)) {
    return { price: null, status: 'not_listed', priceYear: null }
  }
  if (row.prev_price !== null) {
    return {
      price: Number(row.prev_price),
      status: 'carried',
      priceYear: row.prev_year === null ? null : Number(row.prev_year),
    }
  }
  return { price: null, status: 'unavailable', priceYear: null }
}

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
    private readonly stockLogo: StockLogoService,
  ) {}

  /** Bytes for GET /v1/stocks/:id/logo. Null when the ticker has none stored. */
  getLogo(stockId: string): Promise<StoredLogo | null> {
    return this.stockLogo.getLogo(stockId)
  }

  async getDefaultStocks(
    year = 2007,
    currency: 'rub' | 'usd' = 'rub',
    curatedOnly = true,
  ): Promise<StockYearlyPriceDto[]> {
    const displayCurrency = currency === 'rub' ? 'RUB' : 'USD'

    const whereClause = curatedOnly ? 'WHERE s.is_curated = true' : ''

    let stocks = await this.queryStocksForYear(whereClause, year)
    if (stocks.length === 0) {
      return []
    }

    // Импортируем один раз на всю шкалу лет, а не по году за запрос. Годовой
    // импорт перезапускался на каждый запрос для акции, у которой цены за этот
    // год не будет никогда (PM в 2007) — и каждый раз падал. prices_cached_at
    // ставится по завершении импорта и служит признаком "уже пробовали".
    const needImport = stocks.filter(
      (s) => s.prices_cached_at === null && s.import_status !== 'importing',
    )
    if (needImport.length > 0) {
      for (const stock of needImport) {
        try {
          await this.stockImport.importStockById(stock.id, MIN_YEAR, MAX_YEAR)
        } catch {
          // Импорт одной акции не должен ломать выдачу остальных
        }
      }
      stocks = await this.queryStocksForYear(whereClause, year)
    }

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
      const resolved = resolveYearPrice(row, year)
      let amount = resolved.price

      if (amount !== null && row.native_currency !== displayCurrency) {
        amount = row.native_currency === 'USD' ? amount * fxRate : amount / fxRate
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
        price: amount !== null ? Number(amount.toFixed(2)) : null,
        priceStatus: resolved.status,
        priceYear: resolved.priceYear,
        listedFrom: row.first_year === null ? null : Number(row.first_year),
        listedTo: row.last_year === null ? null : Number(row.last_year),
      }
    })
  }

  /**
   * One row per stock with everything needed to resolve a price for `year`:
   * the exact price if present, the coverage bounds, and the nearest earlier
   * price to fall back on.
   */
  private async queryStocksForYear(whereClause: string, year: number): Promise<StockYearRow[]> {
    const { rows } = await this.pool.query<StockYearRow>(
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
        s.prices_cached_at,
        cov.first_year,
        cov.last_year,
        exact.average_price AS exact_price,
        prev.average_price AS prev_price,
        prev.year AS prev_year
      FROM stocks AS s
      LEFT JOIN LATERAL (
        SELECT MIN(year) AS first_year, MAX(year) AS last_year
        FROM stock_prices WHERE stock_id = s.id
      ) AS cov ON true
      LEFT JOIN stock_prices AS exact
        ON exact.stock_id = s.id AND exact.year = $1
      LEFT JOIN LATERAL (
        SELECT average_price, year
        FROM stock_prices
        WHERE stock_id = s.id AND year <= $1
        ORDER BY year DESC
        LIMIT 1
      ) AS prev ON true
      ${whereClause}
      ORDER BY s.symbol ASC
      `,
      [year],
    )
    return rows
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

  /**
   * Prices at the ends of [from, to] for analytics.
   *
   * - Full cache (every year present) → read-only, no external fetch
   * - Gaps / missing endpoints → StockImportService fills the range, then re-read
   * - If exact from/to still missing after import (IPO later, delisting, etc.)
   *   → nearest available years inside the range
   */
  async getEndpointPrices(
    id: string,
    from = 2007,
    to = 2026,
    currency: 'rub' | 'usd' = 'rub',
  ): Promise<{
    id: string
    symbol: string
    companyName: string
    imageUrl: string | null
    fromYear: number
    toYear: number
    priceFrom: number
    priceTo: number
    importStatus: 'pending' | 'importing' | 'ready' | 'failed'
  }> {
    const displayCurrency = currency === 'rub' ? 'RUB' : 'USD'
    const detail = await this.getById(id)

    let rows = await this.queryYearlyNativePrices(id, from, to)
    const expectedYears = to - from + 1
    const hasCompleteHistory = rows.length === expectedYears

    if (!hasCompleteHistory) {
      await this.ensureImported(id, from, to)
      rows = await this.queryYearlyNativePrices(id, from, to)
    }

    if (rows.length === 0) {
      throw new NotFoundException(`No history for stock "${id}" between ${from}-${to}.`)
    }

    const sorted = rows
      .map((row) => ({ year: Number(row.year), nativeAmount: Number(row.average_price) }))
      .sort((a, b) => a.year - b.year)

    const fromPoint = sorted.find((p) => p.year === from) ?? sorted[0]
    const toCandidates = sorted.filter((p) => p.year >= fromPoint.year)
    const toPoint = toCandidates.find((p) => p.year === to) ?? toCandidates[toCandidates.length - 1]

    if (!fromPoint || !toPoint || fromPoint.year >= toPoint.year) {
      throw new NotFoundException(
        `Stock "${id}" needs at least two distinct years with prices in ${from}-${to}`,
      )
    }

    const nativeCurrency = rows[0].native_currency as 'RUB' | 'USD'
    const priceFrom = await this.toDisplayAmount(
      fromPoint.nativeAmount,
      nativeCurrency,
      displayCurrency,
      fromPoint.year,
    )
    const priceTo = await this.toDisplayAmount(
      toPoint.nativeAmount,
      nativeCurrency,
      displayCurrency,
      toPoint.year,
    )

    const statusRow = await this.pool.query<{
      import_status: 'pending' | 'importing' | 'ready' | 'failed'
    }>(`SELECT import_status FROM stocks WHERE id = $1`, [id])

    return {
      id: detail.id,
      symbol: detail.symbol,
      companyName: detail.companyName,
      imageUrl: detail.imageUrl,
      fromYear: fromPoint.year,
      toYear: toPoint.year,
      priceFrom,
      priceTo,
      importStatus: statusRow.rows[0]?.import_status ?? detail.importStatus,
    }
  }

  private async queryYearlyNativePrices(id: string, from: number, to: number) {
    const { rows } = await this.pool.query<{
      year: number
      average_price: string
      native_currency: string
    }>(
      `
        SELECT sp.year, sp.average_price, s.native_currency
        FROM stocks AS s
        JOIN stock_prices AS sp ON sp.stock_id = s.id
        WHERE s.id = $1 AND sp.year BETWEEN $2 AND $3
        ORDER BY sp.year ASC
      `,
      [id, from, to],
    )
    return rows
  }

  /** Import range; if another request is already importing, wait then retry if still incomplete. */
  private async ensureImported(id: string, from: number, to: number): Promise<void> {
    const expectedYears = to - from + 1

    const { rows: statusRows } = await this.pool.query<{ import_status: string }>(
      `SELECT import_status FROM stocks WHERE id = $1`,
      [id],
    )
    const status = statusRows[0]?.import_status

    if (status === 'importing') {
      await this.waitUntilImportSettled(id)
    }

    const cached = await this.queryYearlyNativePrices(id, from, to)
    if (cached.length === expectedYears) {
      return
    }

    await this.stockImport.importStockById(id, from, to)

    // importStockById returns early if a race flipped status to importing
    const { rows: afterRows } = await this.pool.query<{ import_status: string }>(
      `SELECT import_status FROM stocks WHERE id = $1`,
      [id],
    )
    if (afterRows[0]?.import_status === 'importing') {
      await this.waitUntilImportSettled(id)
    }
  }

  private async waitUntilImportSettled(id: string, timeoutMs = 60_000): Promise<void> {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      const { rows } = await this.pool.query<{ import_status: string }>(
        `SELECT import_status FROM stocks WHERE id = $1`,
        [id],
      )
      const status = rows[0]?.import_status
      if (status === 'ready' || status === 'failed') {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new RequestTimeoutException(`Timed out waiting for stock "${id}" import to finish`)
  }

  private async toDisplayAmount(
    nativeAmount: number,
    nativeCurrency: 'RUB' | 'USD',
    displayCurrency: 'RUB' | 'USD',
    year: number,
  ): Promise<number> {
    if (nativeCurrency === displayCurrency) {
      return nativeAmount
    }

    const { rows } = await this.pool.query<{ rate: string }>(
      `
        SELECT rate
        FROM exchange_rates
        WHERE year = $1
          AND base_currency = 'USD'
          AND quote_currency = 'RUB'
      `,
      [year],
    )
    if (rows.length === 0) {
      throw new NotFoundException(`Exchange rate for ${year} not found`)
    }
    const rate = Number(rows[0].rate)
    return nativeCurrency === 'USD' ? nativeAmount * rate : nativeAmount / rate
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

      // Логотип: best-effort, не влияет на импорт цен. Сервис не бросает —
      // акция без логотипа полностью работоспособна.
      await this.stockLogo.fetchAndStore(newStock.id, symbol)

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
