import { Inject, Injectable, NotImplementedException } from '@nestjs/common'
import type { Pool } from 'pg'
import { PG_POOL } from '../database/database.constants'
import type {
  ResolveStockDto,
  ResolveStockResponseDto,
  StockDetailDto,
  StockDto,
  StockHistoryDto,
  StocksBatchHistoryRequestDto,
} from '../dto/common.dto'

@Injectable()
export class StocksService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * GET /api/v1/stocks — список акций с ценой за год.
   *
   * TODO: убрать хардкод ниже и читать из Postgres (как ProductsService.getCart).
   *
   * Подсказки для list из БД:
   * 1. SELECT из `stocks` JOIN `stock_prices` ON year = $1
   * 2. Опционально: WHERE is_curated = true, если curatedOnly
   * 3. Конвертация валюты через `exchange_rates`:
   *    - цена в БД уже в native_currency (RUB или USD)
   *    - если display = native → оставь как есть
   *    - USD→RUB: average_price * rate
   *    - RUB→USD: average_price / rate
   * 4. Верни StockYearlyPriceDto[] (см. SPEC.md и common.dto.ts)
   * 5. Пустой результат → NotFoundException
   *
   * Таблицы: stocks, stock_prices, exchange_rates (db/init/01_schema.sql)
   * Пример id: 11111111-1111-4111-8111-111111111007 (AAPL)
   */
  getDefaultStocks(
    _year = 2007,
    _currency: 'rub' | 'usd' = 'rub',
    _curatedOnly = false,
  ): StockDto[] {
    // TODO: заменить на async + this.pool.query → StockYearlyPriceDto[]
    void this.pool
    void _year
    void _currency
    void _curatedOnly
    return [
      { ticker: 'GAZP', name: 'Газпром' },
      { ticker: 'SBER', name: 'Сбербанк' },
      { ticker: 'LKOH', name: 'Лукойл' },
      { ticker: 'GMKN', name: 'Норникель' },
      { ticker: 'ROSN', name: 'Роснефть' },
      { ticker: 'AVAZ', name: 'АвтоВАЗ' },
      { ticker: 'AAPL', name: 'Apple' },
      { ticker: 'GOOGL', name: 'Google' },
      { ticker: 'MCD', name: "McDonald's" },
      { ticker: 'SPX', name: 'S&P 500' },
      { ticker: 'PM', name: 'Philip Morris' },
    ]
  }

  /**
   * GET /api/v1/stocks/{id} — карточка одной акции + покрытие годов.
   *
   * Подсказки (только SQL, без внешних API):
   * 1. SELECT id, symbol, company_name, image_url, exchange, native_currency, import_status
   *    FROM stocks WHERE id = $1
   * 2. coverage.from / coverage.to = MIN(year) / MAX(year) из stock_data_coverage
   *    (или stock_prices) для этого stock_id
   * 3. Нет строки → NotFoundException
   * 4. Верни StockDetailDto
   *
   * Попробуй: GET /api/v1/stocks/11111111-1111-4111-8111-111111111007
   */
  async getById(_id: string): Promise<StockDetailDto> {
    void this.pool
    throw new NotImplementedException(
      'getById — скелет. SELECT из stocks + MIN/MAX года покрытия (см. комментарий выше)',
    )
  }

  /**
   * GET /api/v1/stocks/{id}/history — цены по годам для одной акции.
   *
   * Подсказки (как ProductsService.getHistory, но у акций есть nativeAmount):
   * 1. JOIN stocks + stock_prices WHERE stock_id = $1 AND year BETWEEN $2 AND $3
   * 2. nativeAmount = sp.average_price (как в БД)
   * 3. amount = конвертация в displayCurrency через exchange_rates
   *    (та же логика, что в TODO для list)
   * 4. ORDER BY year ASC
   * 5. Нет данных → NotFoundException
   * 6. Верни StockHistoryDto: { id, symbol, imageUrl, nativeCurrency, displayCurrency, importStatus, prices }
   *
   * Попробуй:
   * GET /api/v1/stocks/11111111-1111-4111-8111-111111111007/history?from=2007&to=2010&currency=rub
   */
  async getHistory(
    _id: string,
    _from = 2007,
    _to = 2026,
    _currency: 'rub' | 'usd' = 'rub',
  ): Promise<StockHistoryDto> {
    void this.pool
    throw new NotImplementedException(
      'getHistory — скелет. Смотри ProductsService.getHistory и подсказки выше',
    )
  }

  /**
   * POST /api/v1/stocks/history — история сразу для нескольких акций.
   *
   * Подсказки:
   * 1. body.ids — массив UUID; from, to, currency — как в getHistory
   * 2. Для MVP (seed): просто вызови логику getHistory для каждого id
   *    (или один SQL: WHERE stock_id = ANY($1::uuid[]))
   * 3. Верни StockHistoryDto[] — по одному объекту на акцию
   * 4. Акции без цен пока можно пропускать или кидать 404 — на твой выбор, опиши в PR
   *
   * Позже (не сейчас): для акций без кеша — очередь импорта (SPEC Import Service).
   */
  async getBatchHistory(_body: StocksBatchHistoryRequestDto): Promise<StockHistoryDto[]> {
    void this.pool
    throw new NotImplementedException(
      'getBatchHistory — скелет. Сначала сделай getHistory, потом переиспользуй его здесь',
    )
  }

  /**
   * POST /api/v1/stocks/resolve — найти/создать акцию по тикеру.
   *
   * ⚠️ Сложнее остальных: по SPEC нужен lazy-import из MOEX/Yahoo.
   * Для обучения можно сделать упрощённо (только SQL):
   * 1. Ищи в stocks WHERE symbol = $1 AND exchange = $2
   * 2. Если нашли → верни { id, symbol, importStatus, imageUrl } со статусом из БД
   * 3. Если не нашли → пока NotFoundException
   *    (создание + импорт с внешнего API — отдельная задача позже)
   *
   * Полный SPEC: 202 + importStatus=importing, потом клиент поллит GET /stocks/{id}.
   */
  async resolve(_body: ResolveStockDto): Promise<ResolveStockResponseDto> {
    void this.pool
    throw new NotImplementedException(
      'resolve — скелет. Начни с SELECT по symbol+exchange; внешний API пока не трогай',
    )
  }
}
