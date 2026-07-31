import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import {
  ResolveStockDto,
  ResolveStockResponseDto,
  StockDetailDto,
  StockHistoryDto,
  StocksBatchHistoryRequestDto,
  StockYearlyPriceDto,
} from '../dto/common.dto'
import { StocksService } from './stocks.service'

/**
 * Stocks API (SPEC.md → /api/v1/stocks/...).
 * Порядок роутов важен: сначала статичные пути (resolve, history), потом :id.
 */
@ApiTags('stocks')
@Controller('v1/stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  /**
   * GET /api/v1/stocks?year=&currency=&curated_only=
   * Default stocks list for the comparison UI.
   */
  @Get()
  @ApiOperation({
    summary: 'Список акций за год',
    description: 'Returns seeded stocks with yearly average prices from Postgres.',
  })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2007 })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['rub', 'usd'],
    example: 'rub',
  })
  @ApiQuery({
    name: 'curated_only',
    required: false,
    type: Boolean,
    example: true,
  })
  @ApiOkResponse({ type: StockYearlyPriceDto, isArray: true })
  list(
    @Query('year') year?: string,
    @Query('currency') currency?: 'rub' | 'usd',
    @Query('curated_only') curatedOnly?: string,
  ): Promise<StockYearlyPriceDto[]> {
    const parsedYear = year ? Number(year) : 2007
    return this.stocksService.getDefaultStocks(
      Number.isFinite(parsedYear) ? parsedYear : 2007,
      currency === 'usd' ? 'usd' : 'rub',
      curatedOnly === 'true' || curatedOnly === '1',
    )
  }

  /**
   * POST /api/v1/stocks/resolve
   * Найти акцию по symbol+exchange (упрощённо — только БД).
   */
  @Post('resolve')
  @ApiOperation({
    summary: 'Найти / разрешить акцию по тикеру',
    description: 'Скелет. SQL-поиск в stocks; внешний импорт — позже.',
  })
  @ApiBody({ type: ResolveStockDto })
  @ApiOkResponse({ type: ResolveStockResponseDto })
  @ApiAcceptedResponse({ type: ResolveStockResponseDto })
  resolve(@Body() body: ResolveStockDto): Promise<ResolveStockResponseDto> {
    return this.stocksService.resolve(body)
  }

  /**
   * POST /api/v1/stocks/history
   * История сразу для нескольких акций.
   */
  @Post('history')
  @ApiOperation({
    summary: 'История цен нескольких акций',
    description: 'Скелет. Сначала реализуй GET :id/history, потом переиспользуй.',
  })
  @ApiBody({ type: StocksBatchHistoryRequestDto })
  @ApiOkResponse({ type: StockHistoryDto, isArray: true })
  getBatchHistory(@Body() body: StocksBatchHistoryRequestDto): Promise<StockHistoryDto[]> {
    return this.stocksService.getBatchHistory(body)
  }

  /**
   * GET /api/v1/stocks/{id}/history?from=&to=&currency=
   */
  @Get(':id/history')
  @ApiOperation({
    summary: 'История цен одной акции',
    description: 'Скелет. SQL по stock_prices + exchange_rates (как products history).',
  })
  @ApiParam({
    name: 'id',
    example: '11111111-1111-4111-8111-111111111007',
  })
  @ApiQuery({ name: 'from', required: false, type: Number, example: 2007 })
  @ApiQuery({ name: 'to', required: false, type: Number, example: 2026 })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['rub', 'usd'],
    example: 'rub',
  })
  @ApiOkResponse({ type: StockHistoryDto })
  getHistory(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('currency') currency?: 'rub' | 'usd',
  ): Promise<StockHistoryDto> {
    const parsedFrom = from ? Number(from) : 2007
    const parsedTo = to ? Number(to) : 2026
    return this.stocksService.getHistory(
      id,
      Number.isFinite(parsedFrom) ? parsedFrom : 2007,
      Number.isFinite(parsedTo) ? parsedTo : 2026,
      currency === 'usd' ? 'usd' : 'rub',
    )
  }

  /**
   * GET /api/v1/stocks/{id}
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Одна акция + coverage',
    description: 'Скелет. SELECT из stocks + MIN/MAX года из stock_data_coverage.',
  })
  @ApiParam({
    name: 'id',
    example: '11111111-1111-4111-8111-111111111007',
  })
  @ApiOkResponse({ type: StockDetailDto })
  getById(@Param('id') id: string): Promise<StockDetailDto> {
    return this.stocksService.getById(id)
  }
}
