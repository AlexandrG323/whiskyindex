import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common'
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { MAX_YEAR, MIN_YEAR, parseYear } from '../common/years'
import {
  ResolveStockDto,
  ResolveStockQueryDto,
  ResolveStockQueryResponseDto,
  ResolveStockResponseDto,
  StockDetailDto,
  StockHistoryDto,
  StocksBatchHistoryRequestDto,
  StockYearlyPriceDto,
} from '../dto/common.dto'
import { StockQueryService } from './stock-query.service'
import { StocksService } from './stocks.service'

/**
 * Stocks API (SPEC.md → /api/v1/stocks/...).
 * Порядок роутов важен: сначала статичные пути (resolve, resolve-query, history), потом :id.
 */
@ApiTags('stocks')
@Controller('v1/stocks')
export class StocksController {
  constructor(
    private readonly stocksService: StocksService,
    private readonly stockQuery: StockQueryService,
  ) {}

  /**
   * GET /api/v1/stocks?year=&currency=&curated_only=
   * Default stocks list for the comparison UI.
   */
  @Get()
  @ApiOperation({
    summary: 'Список акций за год',
    description:
      'Цены из stock_prices (после Import). Seed больше не кладёт фейковые цены — см. import/HOMEWORK.md.',
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
    const parsedYear = parseYear(year)
    return this.stocksService.getDefaultStocks(
      parsedYear,
      currency === 'usd' ? 'usd' : 'rub',
      curatedOnly === 'true' || curatedOnly === '1',
    )
  }

  /**
   * POST /api/v1/stocks/resolve
   * Найти акцию; если нет — создать + импорт (домашка, HOMEWORK.md сценарий B).
   */
  @Post('resolve')
  @ApiOperation({
    summary: 'Найти / разрешить акцию по тикеру',
    description:
      'Сейчас только SELECT. TODO: INSERT + StockImportService (TSLA). См. import/HOMEWORK.md.',
  })
  @ApiBody({ type: ResolveStockDto })
  @ApiOkResponse({ type: ResolveStockResponseDto })
  @ApiAcceptedResponse({ type: ResolveStockResponseDto })
  resolve(@Body() body: ResolveStockDto): Promise<ResolveStockResponseDto> {
    return this.stocksService.resolve(body)
  }

  /**
   * POST /api/v1/stocks/resolve-query
   * Free-form description → ranked ticker candidates → first listing with quotes.
   */
  @Post('resolve-query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Разрешить акцию по свободному описанию',
    description:
      'LLM возвращает кандидатов с вероятностью; котировки проверяются без записи неудачных тикеров.',
  })
  @ApiBody({ type: ResolveStockQueryDto })
  @ApiOkResponse({ type: ResolveStockQueryResponseDto })
  resolveQuery(@Body() body: ResolveStockQueryDto): Promise<ResolveStockQueryResponseDto> {
    return this.stockQuery.resolveQuery(body)
  }

  /**
   * POST /api/v1/stocks/history
   * История сразу для нескольких акций.
   */
  @Post('history')
  @ApiOperation({
    summary: 'История цен нескольких акций',
    description: 'Делегирует в getHistory по каждому id (после import — из БД).',
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
    description:
      'Читает stock_prices. TODO cache miss → StockImportService (HOMEWORK.md сценарий A/C).',
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
    const parsedFrom = parseYear(from, MIN_YEAR)
    const parsedTo = parseYear(to, MAX_YEAR)
    return this.stocksService.getHistory(
      id,
      parsedFrom,
      parsedTo,
      currency === 'usd' ? 'usd' : 'rub',
    )
  }

  /**
   * GET /api/v1/stocks/{id}/logo
   *
   * Serves a logo fetched at resolve time. Curated stocks do not use this —
   * their logos are bundled files that nginx serves directly, which is both
   * faster and one less moving part. Declared before :id so it is not
   * swallowed by it.
   */
  @Get(':id/logo')
  @ApiOperation({
    summary: 'Логотип акции',
    description:
      'Байты из stock_logos (загружены при resolve). У curated-акций logo — статический файл, этот эндпоинт им не нужен.',
  })
  @ApiParam({ name: 'id', example: '11111111-1111-4111-8111-111111111007' })
  @ApiProduces('image/png', 'image/jpeg', 'image/webp')
  @ApiOkResponse({ description: 'Изображение логотипа' })
  async getLogo(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const logo = await this.stocksService.getLogo(id)
    if (!logo) {
      throw new NotFoundException(`No stored logo for stock "${id}"`)
    }
    res.set({
      'Content-Type': logo.contentType,
      'Cache-Control': 'public, max-age=604800, must-revalidate',
      // Third-party bytes served from our origin: never let a browser
      // reinterpret them as anything but the image type we validated.
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    })
    return new StreamableFile(logo.bytes)
  }

  /**
   * GET /api/v1/stocks/{id}
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Одна акция + coverage',
    description: 'Работает без цен (coverage=null) — удобно поллить importStatus после resolve.',
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
