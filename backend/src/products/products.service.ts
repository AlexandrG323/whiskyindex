import { Injectable, NotImplementedException } from '@nestjs/common'

/**
 * Product catalog & cart — implementation TBD.
 * Spec: SPEC.md → API → Products
 */
@Injectable()
export class ProductsService {
  /** Default basket for year + currency. */
  getCart(): never {
    // TODO: load from Postgres (year default 2007, currency rub|usd)
    throw new NotImplementedException('GET /api/v1/products/cart — not implemented yet')
  }
}
