import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { StockDto } from '../dto/common.dto'
import { StocksService } from './stocks.service'

/**
 * Stocks API surface (SPEC.md → GET /api/v1/stocks/...).
 * Controllers here are the place to implement stocks endpoints.
 */
@ApiTags('stocks')
@Controller('v1/stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('stocks')
  @ApiOperation({ summary: 'Default stock set for 2007 (no auth)' })
  @ApiOkResponse({ type: StockDto, isArray: true })
  getStocks(): StockDto[] {
    return this.stocksService.getDefaultStocks()
  }
}
