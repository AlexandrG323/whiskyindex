import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { ProductYearlyPriceDto } from '../dto/common.dto'
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
    description: 'Returns a mock cart item for the selected year and currency.',
  })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2007 })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['rub', 'usd'],
    example: 'rub',
  })
  @ApiOkResponse({ type: ProductYearlyPriceDto })
  getCart(
    @Query('year') year?: string,
    @Query('currency') currency?: 'rub' | 'usd',
  ): ProductYearlyPriceDto {
    const parsedYear = year ? Number(year) : 2007
    return this.productsService.getCart(
      Number.isFinite(parsedYear) ? parsedYear : 2007,
      currency === 'usd' ? 'usd' : 'rub',
    )
  }
}
