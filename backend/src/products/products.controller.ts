import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ProductsService } from './products.service'

/**
 * Products API surface (SPEC.md → GET /api/v1/products/...).
 * Controllers here are the place to implement product endpoints.
 */
@ApiTags('products')
@Controller('v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /api/v1/products/cart?year=&currency=
   * Default product basket for the comparison UI.
   */
  @Get('cart')
  @ApiOperation({
    summary: 'Product cart for year + currency',
    description: 'Not implemented yet — returns 501.',
  })
  @ApiQuery({ name: 'year', required: false, example: 2007 })
  @ApiQuery({ name: 'currency', required: false, enum: ['rub', 'usd'], example: 'rub' })
  @ApiResponse({ status: 501, description: 'Not implemented yet' })
  getCart(): never {
    // TODO: parse year / currency query params, then delegate
    return this.productsService.getCart()
  }
}
