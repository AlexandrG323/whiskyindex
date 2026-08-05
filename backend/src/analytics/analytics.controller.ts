import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { CompareCartAndStocksDto, CompareCartToStockByIdDto } from '../dto/common.dto'
import { AnalyticsService } from './analytics.service'

@ApiTags('analytics')
@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('compare')
  @ApiOperation({
    summary: 'Compare cart and stocks purchasing power over a year range',
  })
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
    @Query('stockIds') stockIds?: string | string[],
  ): Promise<CompareCartAndStocksDto> {
    const parsedFromYear = from ? Number(from) : 2007
    const parsedToYear = to ? Number(to) : 2026
    const ids = stockIds === undefined ? [] : Array.isArray(stockIds) ? stockIds : [stockIds]
    return this.analyticsService.compareCartAndStocks(
      parsedFromYear,
      parsedToYear,
      currency === 'usd' ? 'usd' : 'rub',
      ids,
    )
  }

  @Get('compare/:id')
  @ApiOperation({ summary: 'Compare cart with one stock by id (fun purchasing-power stats)' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '11111111-1111-4111-8111-111111111006',
  })
  @ApiQuery({ name: 'from', required: false, type: Number, example: 2007 })
  @ApiQuery({ name: 'to', required: false, type: Number, example: 2026 })
  @ApiQuery({ name: 'currency', required: false, enum: ['rub', 'usd'], example: 'rub' })
  @ApiOkResponse({ type: CompareCartToStockByIdDto })
  compareCartToStockById(
    @Param('id') id: string,
    @Query('currency') currency?: 'rub' | 'usd',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<CompareCartToStockByIdDto> {
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
