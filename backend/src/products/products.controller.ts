import { Controller, Get } from '@nestjs/common'
import { ProductsService } from './products.service'

/**
 * Products API surface (SPEC.md → GET /api/v1/products/...).
 * Controllers here are the place to implement product endpoints.
 */
@Controller('v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /api/v1/products/cart?year=&currency=
   * Default product basket for the comparison UI.
   */
  @Get('cart')
  getCart(): never {
    // TODO: parse year / currency query params, then delegate
    return this.productsService.getCart()
  }
}
