import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Pool } from 'pg'
import { PG_POOL } from '../database/database.constants'
import {
  CartPriceRangeDto,
  CompareCartAndStocksDto,
  CompareCartToStockByIdDto,
  ProductPriceRangeDto,
  ProductYearlyPriceDto,
  PurchasingPowerDto,
  StockCompareItemDto,
  StockPriceRangeDto,
  StockSkippedDto,
} from '../dto/common.dto'
import { ProductsService } from '../products/products.service'
import { StocksService } from '../stocks/stocks.service'

/** Seed UUID for Виски Jameson 0.7 */
const JAMESON_PRODUCT_ID = '22222222-2222-4222-8222-222222222001'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type EndpointPrices = Awaited<ReturnType<StocksService['getEndpointPrices']>>

/** Request-scoped readers so N stocks do not re-read the same basket/rate. */
type CartLoader = (year: number, currency: 'rub' | 'usd') => Promise<ProductYearlyPriceDto[]>
type RateLoader = (year: number) => Promise<number | null>

type BasketTotals = { cartFrom: number; cartTo: number; jamesonFrom: number; jamesonTo: number }

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly products: ProductsService,
    private readonly stocks: StocksService,
  ) {}

  async compareCartAndStocks(
    from: number,
    to: number,
    currency: 'rub' | 'usd',
    stockIds: string[],
  ): Promise<CompareCartAndStocksDto> {
    this.assertYearRange(from, to)

    const displayCurrency = currency === 'usd' ? 'USD' : 'RUB'

    // Every stock re-derives the same basket for the same years. Memoise the
    // per-year cart (and USD/RUB rate) for the lifetime of this request so N
    // stocks cost one basket read instead of N+1.
    const loadCart = this.cartLoader()
    const loadRate = this.rateLoader()

    const { cart, jameson } = await this.loadCartAndJameson(from, to, currency, loadCart)

    const ids =
      stockIds.length > 0
        ? stockIds
        : (await this.stocks.getDefaultStocks(to, currency, true)).map((s) => s.id)

    // Parallel: each stock ensures its own import if history is incomplete
    const settled = await Promise.allSettled(
      ids.map((id) => this.buildStockCompareItem(id, from, to, currency, loadCart, loadRate)),
    )

    const stocks: StockCompareItemDto[] = []
    const skipped: StockSkippedDto[] = []
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]
      if (result.status === 'fulfilled') {
        stocks.push(result.value)
        continue
      }

      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      this.logger.warn(`Skipping stock ${ids[i]} in compare overview: ${reason}`)

      try {
        const detail = await this.stocks.getById(ids[i])
        skipped.push({
          id: detail.id,
          symbol: detail.symbol,
          companyName: detail.companyName,
          exchange: detail.exchange,
          imageUrl: detail.imageUrl,
          coverage: detail.coverage,
        })
      } catch {
        // Unknown id — nothing to show in the picker.
      }
    }

    return {
      from,
      to,
      currency: displayCurrency,
      cart,
      jameson,
      stocks,
      skipped,
    }
  }

  async compareCartToStockById(
    id: string,
    currency: 'rub' | 'usd',
    from: number,
    to: number,
  ): Promise<CompareCartToStockByIdDto> {
    this.assertYearRange(from, to)
    if (!UUID_RE.test(id)) {
      throw new BadRequestException('Invalid stock UUID')
    }

    const displayCurrency = currency === 'usd' ? 'USD' : 'RUB'

    // Import/fill stock first — actual years may differ from requested from/to
    const stockRange = await this.buildStockPriceRange(id, from, to, currency)

    const { cart, jameson, cartFrom, cartTo, jamesonFrom, jamesonTo } =
      await this.loadCartAndJameson(
        stockRange.priceFromYear,
        stockRange.priceToYear,
        currency,
        this.cartLoader(),
      )

    const atFrom = this.purchasingPower(stockRange.priceFrom, cartFrom, jamesonFrom)
    const atTo = this.purchasingPower(stockRange.priceTo, cartTo, jamesonTo)

    return {
      from,
      to,
      currency: displayCurrency,
      stock: stockRange,
      cart,
      jameson,
      atFrom,
      atTo,
    }
  }

  private assertYearRange(from: number, to: number): void {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
      throw new BadRequestException(`Invalid year range: from=${from}, to=${to}`)
    }
  }

  private async loadCartAndJameson(
    from: number,
    to: number,
    currency: 'rub' | 'usd',
    loadCart: CartLoader,
  ) {
    const [cartItemsFrom, cartItemsTo] = await Promise.all([
      loadCart(from, currency),
      loadCart(to, currency),
    ])

    const cartFrom = this.sumCart(cartItemsFrom)
    const cartTo = this.sumCart(cartItemsTo)
    const cart: CartPriceRangeDto = {
      priceFrom: this.roundMoney(cartFrom),
      priceTo: this.roundMoney(cartTo),
      growthPercent: this.growthPercent(cartFrom, cartTo),
    }

    const jamesonItemFrom = cartItemsFrom.find((p) => p.id === JAMESON_PRODUCT_ID)
    const jamesonItemTo = cartItemsTo.find((p) => p.id === JAMESON_PRODUCT_ID)
    if (!jamesonItemFrom || !jamesonItemTo) {
      throw new NotFoundException(
        `Jameson product (${JAMESON_PRODUCT_ID}) missing from cart for ${from}-${to}`,
      )
    }

    // Jameson anchors every ratio in this endpoint, so a null price is fatal
    // here in a way it is not for the basket as a whole.
    const jamesonFrom = jamesonItemFrom.price
    const jamesonTo = jamesonItemTo.price
    if (jamesonFrom === null || jamesonTo === null) {
      throw new NotFoundException(
        `Jameson has no price for ${from} or ${to}; cannot compute purchasing power`,
      )
    }
    const jameson: ProductPriceRangeDto = {
      id: jamesonItemFrom.id,
      name: jamesonItemFrom.name,
      priceFrom: this.roundMoney(jamesonFrom),
      priceTo: this.roundMoney(jamesonTo),
      growthPercent: this.growthPercent(jamesonFrom, jamesonTo),
    }

    return { cart, jameson, cartFrom, cartTo, jamesonFrom, jamesonTo }
  }

  private async buildStockCompareItem(
    id: string,
    from: number,
    to: number,
    currency: 'rub' | 'usd',
    loadCart: CartLoader,
    loadRate: RateLoader,
  ): Promise<StockCompareItemDto> {
    const ends = await this.stocks.getEndpointPrices(id, from, to, currency)
    const basket = await this.loadCartAndJameson(ends.fromYear, ends.toYear, currency, loadCart)
    const range = this.toStockPriceRange(ends)

    return {
      ...range,
      atFrom: this.purchasingPower(ends.priceFrom, basket.cartFrom, basket.jamesonFrom),
      atTo: this.purchasingPower(ends.priceTo, basket.cartTo, basket.jamesonTo),
      whiskyShare: this.roundRatio(await this.whiskyShare(ends, basket, currency, loadRate)),
    }
  }

  /**
   * Ensures stock prices for [from, to] via StocksService (import on gaps),
   * then builds the price-range DTO. Works for full cache and partial history.
   */
  private async buildStockPriceRange(
    id: string,
    from: number,
    to: number,
    currency: 'rub' | 'usd',
  ): Promise<StockPriceRangeDto> {
    const endpoints = await this.stocks.getEndpointPrices(id, from, to, currency)
    return this.toStockPriceRange(endpoints)
  }

  private toStockPriceRange(endpoints: EndpointPrices): StockPriceRangeDto {
    return {
      id: endpoints.id,
      symbol: endpoints.symbol,
      companyName: endpoints.companyName,
      exchange: endpoints.exchange,
      imageUrl: endpoints.imageUrl,
      priceFromYear: endpoints.fromYear,
      priceToYear: endpoints.toYear,
      priceFrom: this.roundMoney(endpoints.priceFrom),
      priceTo: this.roundMoney(endpoints.priceTo),
      growthPercent: this.growthPercent(endpoints.priceFrom, endpoints.priceTo),
    }
  }

  /**
   * Cart-sized P&L in today’s Jameson bottles, always in RUB so the count does
   * not move when the UI currency does. Uses unrounded prices.
   *
   * In USD mode the readouts are scaled back to RUB with each endpoint year’s
   * USD/RUB rate rather than re-running the whole comparison in RUB: every
   * conversion in `convertToDisplay` is one per-year scalar, so the round trip
   * is exact, and a NASDAQ stock no longer needs FX it did not need to render.
   * A missing rate degrades this one label to the display currency instead of
   * rejecting the stock outright.
   */
  private async whiskyShare(
    ends: EndpointPrices,
    basket: BasketTotals,
    currency: 'rub' | 'usd',
    loadRate: RateLoader,
  ): Promise<number> {
    let { priceFrom, priceTo } = ends
    let { cartFrom, jamesonTo } = basket

    if (currency === 'usd') {
      const [rateFrom, rateTo] = await Promise.all([loadRate(ends.fromYear), loadRate(ends.toYear)])
      if (rateFrom === null || rateTo === null) {
        this.logger.warn(
          `No USD/RUB rate for ${ends.fromYear}/${ends.toYear}; whisky index for ${ends.symbol} stays in USD`,
        )
      } else {
        priceFrom *= rateFrom
        priceTo *= rateTo
        cartFrom *= rateFrom
        jamesonTo *= rateTo
      }
    }

    if (priceFrom === 0 || jamesonTo <= 0) return 0
    const shares = cartFrom / priceFrom
    return (shares * (priceTo - priceFrom)) / jamesonTo
  }

  /** Per-year cart reader, memoised for one request. */
  private cartLoader(): CartLoader {
    const cache = new Map<string, Promise<ProductYearlyPriceDto[]>>()
    return (year, currency) => {
      const key = `${year}|${currency}`
      let hit = cache.get(key)
      if (!hit) {
        hit = this.products.getCart(year, currency)
        cache.set(key, hit)
      }
      return hit
    }
  }

  /** Per-year USD/RUB reader, memoised for one request. Missing rate → null. */
  private rateLoader(): RateLoader {
    const cache = new Map<number, Promise<number | null>>()
    return (year) => {
      let hit = cache.get(year)
      if (!hit) {
        hit = this.exchangeRateByYear(year).catch(() => null)
        cache.set(year, hit)
      }
      return hit
    }
  }

  async exchangeRateByYear(year: number): Promise<number> {
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
      throw new NotFoundException(`Exchange rate for ${year} was not found`)
    }

    return Number(rows[0].rate)
  }

  private purchasingPower(
    stockPrice: number,
    cartPrice: number,
    jamesonPrice: number,
  ): PurchasingPowerDto {
    return {
      whiskyBottlesPerShare: this.roundRatio(jamesonPrice === 0 ? 0 : stockPrice / jamesonPrice),
      sharesPerCart: this.roundRatio(stockPrice === 0 ? 0 : cartPrice / stockPrice),
    }
  }

  /**
   * Basket total for a year. Items with no price are skipped rather than
   * counted as zero — a product that did not exist yet (Доширак before 2005)
   * must not drag the basket down and invent deflation.
   */
  private sumCart(items: ProductYearlyPriceDto[]): number {
    return items.reduce((sum, item) => sum + (item.price ?? 0), 0)
  }

  private growthPercent(priceFrom: number, priceTo: number): number {
    if (priceFrom === 0) {
      return 0
    }
    return this.roundRatio(((priceTo - priceFrom) / priceFrom) * 100)
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100
  }

  private roundRatio(value: number): number {
    return Math.round(value * 10000) / 10000
  }
}
