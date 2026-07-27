import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Pool } from 'pg'
import { PG_POOL } from '../database/database.constants'
import { ProductHistoryDto, ProductYearlyPriceDto } from '../dto/common.dto'

type CartRow = {
  id: string
  name: string
  image_url: string | null
  price: string
  currency: 'RUB' | 'USD'
}

@Injectable()
export class ProductsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}
  async getCart(year = 2007, currency: 'rub' | 'usd' = 'rub'): Promise<ProductYearlyPriceDto[]> {
    const targetCurrency = currency === 'usd' ? 'USD' : 'RUB'
    const { rows } = await this.pool.query<CartRow>(
      `
      SELECT
        p.id,
        p.name,
        p.image_url,
        CASE
          WHEN $2::text = 'USD' THEN round(pp.average_price / er.rate, 6)
          ELSE pp.average_price
        END AS price,
        $2::text AS currency
      FROM products p
      JOIN product_prices pp
        ON pp.product_id = p.id
       AND pp.year = $1
      LEFT JOIN exchange_rates er
        ON er.year = $1
       AND er.base_currency = 'USD'
       AND er.quote_currency = 'RUB'
      WHERE $2::text = 'RUB' OR er.rate IS NOT NULL
      ORDER BY p.name
      `,
      [year, targetCurrency],
    )
    if (rows.length === 0) {
      throw new NotFoundException(
        `No product prices found for year ${year}` +
          (targetCurrency === 'USD' ? ' (or missing USD/RUB rate)' : ''),
      )
    }
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      price: Number(row.price),
      currency: row.currency,
    }))
  }

  /**
   * Price history for one product over a year range.
   *
   * Hints (copy patterns from getCart above):
   * 1. SELECT from `products` JOIN `product_prices` WHERE product id = $1
   *    AND year BETWEEN $2 AND $3
   * 2. Convert RUB → USD with `exchange_rates` the same way getCart does
   * 3. ORDER BY year ASC
   * 4. If the product does not exist or has no prices → throw NotFoundException
   * 5. Return ProductHistoryDto: { id, name, imageUrl, currency, prices: [{ year, amount }] }
   *
   * Try: GET /api/v1/products/22222222-2222-4222-8222-222222222001/history?from=2007&to=2010
   */
  async getHistory(
    id: string,
    from = 2007,
    to = 2026,
    currency: 'rub' | 'usd' = 'rub',
  ): Promise<ProductHistoryDto> {
    const targetCurrency = currency === 'usd' ? 'USD' : 'RUB'

    type HistoryRow = {
      id: string
      name: string
      image_url: string | null
      year: number
      price: string
      currency: 'RUB' | 'USD'
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid UUID')
    }

    const { rows } = await this.pool.query<HistoryRow>(
      `
      SELECT
        p.id,
        p.name,
        p.image_url,
        pp.year,
        CASE
          WHEN $4::text = 'USD' THEN round(pp.average_price / er.rate, 6)
          ELSE pp.average_price
        END AS price,
        $4::text AS currency
      FROM products p
      JOIN product_prices pp
        ON pp.product_id = p.id
       AND pp.year BETWEEN $2 AND $3
      LEFT JOIN exchange_rates er
        ON er.year = pp.year
       AND er.base_currency = 'USD'
       AND er.quote_currency = 'RUB'
      WHERE p.id = $1
        AND ($4::text = 'RUB' OR er.rate IS NOT NULL)
      ORDER BY pp.year ASC
      `,
      [id, from, to, targetCurrency],
    )

    if (rows.length === 0) {
      throw new NotFoundException(
        `Product with id "${id}" not found or has no prices for period ${from}-${to}`,
      )
    }

    const [firstRow] = rows

    return {
      id: firstRow.id,
      name: firstRow.name,
      imageUrl: firstRow.image_url,
      currency: firstRow.currency,
      prices: rows.map((row) => ({
        year: row.year,
        amount: Number(row.price),
      })),
    }
  }
}
