import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Pool } from 'pg'
import { PG_POOL } from '../database/database.constants'
import { ProductYearlyPriceDto } from '../dto/common.dto'

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
}
