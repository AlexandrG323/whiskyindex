import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string
}

export class ProductYearlyPriceDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222001' })
  id!: string

  @ApiProperty({ example: 'Виски Jameson 0.7' })
  name!: string

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    type: String,
  })
  imageUrl!: string | null

  @ApiProperty({ example: 650 })
  price!: number

  @ApiProperty({ example: 'RUB', enum: ['RUB', 'USD'] })
  currency!: 'RUB' | 'USD'
}

export class ProductHistoryPricePointDto {
  @ApiProperty({ example: 2007 })
  year!: number

  @ApiProperty({ example: 650, description: 'Average price in the requested currency' })
  amount!: number
}

export class ProductHistoryDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222001' })
  id!: string

  @ApiProperty({ example: 'Виски Jameson 0.7' })
  name!: string

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    type: String,
  })
  imageUrl!: string | null

  @ApiProperty({ example: 'RUB', enum: ['RUB', 'USD'] })
  currency!: 'RUB' | 'USD'

  @ApiProperty({ type: ProductHistoryPricePointDto, isArray: true })
  prices!: ProductHistoryPricePointDto[]
}

export class ProductDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222001' })
  id!: string

  @ApiProperty({ example: 'Виски Jameson 0.7' })
  name!: string
}

/** Элемент списка акций (SPEC → GET /api/v1/stocks) */
export class StockYearlyPriceDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111007' })
  id!: string

  @ApiProperty({ example: 'AAPL' })
  symbol!: string

  @ApiProperty({ example: 'Apple' })
  companyName!: string

  @ApiPropertyOptional({ example: null, nullable: true, type: String })
  imageUrl!: string | null

  @ApiProperty({ example: 'USD', enum: ['RUB', 'USD'] })
  nativeCurrency!: 'RUB' | 'USD'

  @ApiProperty({ example: 'RUB', enum: ['RUB', 'USD'] })
  displayCurrency!: 'RUB' | 'USD'

  @ApiProperty({ example: 320.5 })
  price!: number

  @ApiProperty({
    example: 'ready',
    enum: ['pending', 'importing', 'ready', 'failed'],
  })
  importStatus!: 'pending' | 'importing' | 'ready' | 'failed'
}

export class StockCoverageDto {
  @ApiProperty({ example: 2007 })
  from!: number

  @ApiProperty({ example: 2026 })
  to!: number
}

/** Одна акция без цены за год (SPEC → GET /api/v1/stocks/{id}) */
export class StockDetailDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111007' })
  id!: string

  @ApiProperty({ example: 'AAPL' })
  symbol!: string

  @ApiProperty({ example: 'Apple' })
  companyName!: string

  @ApiPropertyOptional({ example: null, nullable: true, type: String })
  imageUrl!: string | null

  @ApiProperty({ example: 'NASDAQ' })
  exchange!: string

  @ApiProperty({ example: 'USD', enum: ['RUB', 'USD'] })
  nativeCurrency!: 'RUB' | 'USD'

  @ApiProperty({
    example: 'ready',
    enum: ['pending', 'importing', 'ready', 'failed'],
  })
  importStatus!: 'pending' | 'importing' | 'ready' | 'failed'

  /** null пока цены ещё не импортированы (import_status = pending/importing) */
  @ApiPropertyOptional({ type: StockCoverageDto, nullable: true })
  coverage!: StockCoverageDto | null
}

export class ResolveStockDto {
  @ApiProperty({ example: 'TSLA' })
  symbol!: string

  @ApiProperty({ example: 'NASDAQ' })
  exchange!: string
}

export class ResolveStockResponseDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111099' })
  id!: string

  @ApiProperty({ example: 'TSLA' })
  symbol!: string

  @ApiProperty({
    example: 'importing',
    enum: ['pending', 'importing', 'ready', 'failed'],
  })
  importStatus!: 'pending' | 'importing' | 'ready' | 'failed'

  @ApiPropertyOptional({ example: null, nullable: true, type: String })
  imageUrl?: string | null
}

export class StockHistoryPricePointDto {
  @ApiProperty({ example: 2007 })
  year!: number

  @ApiProperty({
    example: 320.5,
    description: 'Цена в displayCurrency (после конвертации)',
  })
  amount!: number

  @ApiProperty({
    example: 12.5,
    description: 'Исходная цена в nativeCurrency листинга',
  })
  nativeAmount!: number
}

/** История одной акции (SPEC → GET /api/v1/stocks/{id}/history) */
export class StockHistoryDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111007' })
  id!: string

  @ApiProperty({ example: 'AAPL' })
  symbol!: string

  @ApiPropertyOptional({ example: null, nullable: true, type: String })
  imageUrl!: string | null

  @ApiProperty({ example: 'USD', enum: ['RUB', 'USD'] })
  nativeCurrency!: 'RUB' | 'USD'

  @ApiProperty({ example: 'RUB', enum: ['RUB', 'USD'] })
  displayCurrency!: 'RUB' | 'USD'

  @ApiProperty({
    example: 'ready',
    enum: ['pending', 'importing', 'ready', 'failed'],
  })
  importStatus!: 'pending' | 'importing' | 'ready' | 'failed'

  @ApiProperty({ type: StockHistoryPricePointDto, isArray: true })
  prices!: StockHistoryPricePointDto[]
}

export class StocksBatchHistoryRequestDto {
  @ApiProperty({
    type: [String],
    example: ['11111111-1111-4111-8111-111111111007', '11111111-1111-4111-8111-111111111001'],
  })
  ids!: string[]

  @ApiProperty({ example: 2007 })
  from!: number

  @ApiProperty({ example: 2026 })
  to!: number

  @ApiProperty({ example: 'rub', enum: ['rub', 'usd'] })
  currency!: 'rub' | 'usd'
}

export class CompareCartAndStocksDto {
  @ApiProperty({ type: ProductYearlyPriceDto, isArray: true })
  cart!: ProductYearlyPriceDto[]

  @ApiProperty({ type: StockYearlyPriceDto, isArray: true })
  stocks!: StockYearlyPriceDto[]
}
