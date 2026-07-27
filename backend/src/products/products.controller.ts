import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { ProductHistoryDto, ProductYearlyPriceDto } from '../dto/common.dto'
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
    description: 'Returns seeded basket products with yearly average prices from Postgres.',
  })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2007 })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['rub', 'usd'],
    example: 'rub',
  })
  @ApiOkResponse({ type: ProductYearlyPriceDto, isArray: true })
  getCart(
    @Query('year') year?: string,
    @Query('currency') currency?: 'rub' | 'usd',
  ): Promise<ProductYearlyPriceDto[]> {
    const parsedYear = year ? Number(year) : 2007
    return this.productsService.getCart(
      Number.isFinite(parsedYear) ? parsedYear : 2007,
      currency === 'usd' ? 'usd' : 'rub',
    )
  }

  /**
   * GET /api/v1/products/{id}/history?from=&to=&currency=
   * Yearly price series for one product (SQL only — see ProductsService.getHistory).
   */
  @Get(':id/history')
  @ApiOperation({
    summary: 'Product price history',
    description:
      'Returns yearly average prices for one product in a year range. SQL only — no external APIs.',
  })
  @ApiParam({
    name: 'id',
    example: '22222222-2222-4222-8222-222222222001',
    description: 'Product UUID from seed (e.g. Jameson)',
  })
  @ApiQuery({ name: 'from', required: false, type: Number, example: 2007 })
  @ApiQuery({ name: 'to', required: false, type: Number, example: 2026 })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['rub', 'usd'],
    example: 'rub',
  })
  @ApiOkResponse({ type: ProductHistoryDto })
  getHistory(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('currency') currency?: 'rub' | 'usd',
  ): Promise<ProductHistoryDto> {
    const parsedFrom = from ? Number(from) : 2007
    const parsedTo = to ? Number(to) : 2026
    return this.productsService.getHistory(
      id,
      Number.isFinite(parsedFrom) ? parsedFrom : 2007,
      Number.isFinite(parsedTo) ? parsedTo : 2026,
      currency === 'usd' ? 'usd' : 'rub',
    )
  }
}
