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
    const { cart, jameson } = await this.loadCartAndJameson(from, to, currency)

    const ids =
      stockIds.length > 0
        ? stockIds
        : (await this.stocks.getDefaultStocks(to, currency, true)).map((s) => s.id)

    // Parallel: each stock ensures its own import if history is incomplete
    const settled = await Promise.allSettled(
      ids.map((id) => this.buildStockCompareItem(id, from, to, currency)),
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
          reason,
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
      await this.loadCartAndJameson(stockRange.priceFromYear, stockRange.priceToYear, currency)

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

  private async loadCartAndJameson(from: number, to: number, currency: 'rub' | 'usd') {
    const [cartItemsFrom, cartItemsTo] = await Promise.all([
      this.products.getCart(from, currency),
      this.products.getCart(to, currency),
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
  ): Promise<StockCompareItemDto> {
    const [displayEnds, rubEnds] = await Promise.all([
      this.stocks.getEndpointPrices(id, from, to, currency),
      currency === 'usd'
        ? this.stocks.getEndpointPrices(id, from, to, 'rub')
        : Promise.resolve(null),
    ])

    const [displayBasket, rubBasket] = await Promise.all([
      this.loadCartAndJameson(displayEnds.fromYear, displayEnds.toYear, currency),
      rubEnds
        ? this.loadCartAndJameson(rubEnds.fromYear, rubEnds.toYear, 'rub')
        : Promise.resolve(null),
    ])

    const range = this.toStockPriceRange(displayEnds)

    const whiskyEnds = rubEnds ?? displayEnds
    const whiskyBasket = rubBasket ?? displayBasket

    return {
      ...range,
      atFrom: this.purchasingPower(
        displayEnds.priceFrom,
        displayBasket.cartFrom,
        displayBasket.jamesonFrom,
      ),
      atTo: this.purchasingPower(
        displayEnds.priceTo,
        displayBasket.cartTo,
        displayBasket.jamesonTo,
      ),
      whiskyShare: this.roundRatio(
        this.whiskyShare(
          whiskyEnds.priceFrom,
          whiskyEnds.priceTo,
          whiskyBasket.cartFrom,
          whiskyBasket.jamesonTo,
        ),
      ),
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

  private toStockPriceRange(
    endpoints: Awaited<ReturnType<StocksService['getEndpointPrices']>>,
  ): StockPriceRangeDto {
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

  /** Cart-sized P&L in today’s Jameson bottles. Uses unrounded prices. */
  private whiskyShare(
    priceFrom: number,
    priceTo: number,
    cartFrom: number,
    jamesonTo: number,
  ): number {
    if (priceFrom === 0 || jamesonTo <= 0) return 0
    const shares = cartFrom / priceFrom
    return (shares * (priceTo - priceFrom)) / jamesonTo
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
