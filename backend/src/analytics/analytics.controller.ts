import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { CompareCartAndStocksDto, CompareCartToStockByIdDto } from '../dto/common.dto'
import { AnalyticsService } from './analytics.service'

/**
 * Analytics API surface (SPEC.md → GET /api/v1/analytics/...).
 * Controllers here are the place to implement analytics endpoints.
 */
@ApiTags('analytics')
@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('compare')
  @ApiOperation({ summary: 'Compare cart and stocks' })
  @ApiQuery({ name: 'from', required: false, type: Number, example: 2007 })
  @ApiQuery({ name: 'to', required: false, type: Number, example: 2026 })
  @ApiQuery({ name: 'currency', required: false, enum: ['rub', 'usd'], example: 'rub' })
  @ApiQuery({
    name: 'stockIds',
    required: false,
    type: [String],
    example: ['11111111-1111-4111-8111-111111111006', '11111111-1111-4111-8111-111111111007'],
  })
  @ApiOkResponse({ type: CompareCartAndStocksDto })
  compareCartAndStocks(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('currency') currency?: 'rub' | 'usd',
    @Query('stockIds') stockIds?: string[],
  ): Promise<CompareCartAndStocksDto> {
    console.log('from', from)
    console.log('to', to)
    console.log('currency', currency)
    console.log('stockIds', stockIds)
    const parsedFromYear = from ? Number(from) : 2007
    const parsedToYear = to ? Number(to) : 2026
    return this.analyticsService.compareCartAndStocks(
      parsedFromYear,
      parsedToYear,
      currency === 'usd' ? 'usd' : 'rub',
      stockIds ?? [],
    )
  }

  @Get('compare/:id')
  @ApiOperation({ summary: 'Compare cart with one stock by id' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '11111111-1111-4111-8111-111111111006',
  })
  @ApiOkResponse({ type: CompareCartToStockByIdDto })
  compareCartToStockById(
    @Param('id') id: string,
    @Query('currency') currency?: 'rub' | 'usd',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<CompareCartToStockByIdDto> {
    console.log('id', id)
    console.log('currency', currency)
    console.log('from', from)
    console.log('to', to)
    const parsedFromYear = from ? Number(from) : 2007
    const parsedToYear = to ? Number(to) : 2026
    return this.analyticsService.compareCartToStockById(
      id,
      currency === 'usd' ? 'usd' : 'rub',
      parsedFromYear,
      parsedToYear,
    )
  }
}
