import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  CartPriceRangeDto,
  CompareCartAndStocksDto,
  CompareCartToStockByIdDto,
  ProductPriceRangeDto,
  ProductYearlyPriceDto,
  PurchasingPowerDto,
  StockCompareItemDto,
  StockPriceRangeDto,
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
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]
      if (result.status === 'fulfilled') {
        stocks.push(result.value)
      } else {
        this.logger.warn(
          `Skipping stock ${ids[i]} in compare overview: ${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          }`,
        )
      }
    }

    return {
      from,
      to,
      currency: displayCurrency,
      cart,
      jameson,
      stocks,
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

    const jamesonFrom = jamesonItemFrom.price
    const jamesonTo = jamesonItemTo.price
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
    const range = await this.buildStockPriceRange(id, from, to, currency)

    // Align cart/Jameson with the years we actually used for the stock
    const { cartFrom, cartTo, jamesonFrom, jamesonTo } = await this.loadCartAndJameson(
      range.priceFromYear,
      range.priceToYear,
      currency,
    )

    return {
      ...range,
      atFrom: this.purchasingPower(range.priceFrom, cartFrom, jamesonFrom),
      atTo: this.purchasingPower(range.priceTo, cartTo, jamesonTo),
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

    return {
      id: endpoints.id,
      symbol: endpoints.symbol,
      companyName: endpoints.companyName,
      imageUrl: endpoints.imageUrl,
      priceFromYear: endpoints.fromYear,
      priceToYear: endpoints.toYear,
      priceFrom: this.roundMoney(endpoints.priceFrom),
      priceTo: this.roundMoney(endpoints.priceTo),
      growthPercent: this.growthPercent(endpoints.priceFrom, endpoints.priceTo),
    }
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

  private sumCart(items: ProductYearlyPriceDto[]): number {
    return items.reduce((sum, item) => sum + item.price, 0)
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
