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

  @ApiPropertyOptional({
    example: 650,
    nullable: true,
    description: 'null когда товара ещё не было в продаже в этом году',
  })
  price!: number | null

  @ApiProperty({
    example: 'actual',
    enum: ['actual', 'not_yet', 'unavailable'],
    description:
      'actual — цена за год; not_yet — товар появился позже (Доширак с 2005), в сумму корзины не входит; ' +
      'unavailable — данных за год нет',
  })
  priceStatus!: 'actual' | 'not_yet' | 'unavailable'

  @ApiPropertyOptional({
    example: 2005,
    nullable: true,
    description: 'Год появления товара на российском рынке, если он позже начала шкалы',
  })
  availableFrom!: number | null

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

  @ApiPropertyOptional({
    example: '/icons/jameson.png',
    nullable: true,
    type: String,
  })
  imageUrl!: string | null
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

  @ApiPropertyOptional({
    example: 320.5,
    nullable: true,
    description: 'null когда цены за год нет: акция ещё не торговалась или данных нет',
  })
  price!: number | null

  @ApiProperty({
    example: 'actual',
    enum: ['actual', 'carried', 'not_listed', 'unavailable'],
    description:
      'actual — цена за запрошенный год; carried — перенесена из priceYear (делистинг или пропуск); ' +
      'not_listed — год раньше первой сделки; unavailable — данных нет вообще',
  })
  priceStatus!: 'actual' | 'carried' | 'not_listed' | 'unavailable'

  @ApiPropertyOptional({
    example: 2018,
    nullable: true,
    description: 'Год, из которого фактически взята цена. Равен запрошенному при actual',
  })
  priceYear!: number | null

  @ApiPropertyOptional({
    example: 2008,
    nullable: true,
    description: 'Первый год с ценой (для PM — 2008: IPO в марте 2008)',
  })
  listedFrom!: number | null

  @ApiPropertyOptional({
    example: 2018,
    nullable: true,
    description: 'Последний год с ценой (для AVAZ — 2018: делистинг)',
  })
  listedTo!: number | null

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

/** Purchasing-power snapshot at one end of the period */
export class PurchasingPowerDto {
  @ApiProperty({
    example: 4.2,
    description: 'How many Jameson bottles one share buys (stockPrice / jamesonPrice)',
  })
  whiskyBottlesPerShare!: number

  @ApiProperty({
    example: 2.1,
    description: 'How many shares one full cart costs (cartPrice / stockPrice)',
  })
  sharesPerCart!: number
}

/** Price range + growth for cart total */
export class CartPriceRangeDto {
  @ApiProperty({ example: 3200.5, description: 'Cart total at from year' })
  priceFrom!: number

  @ApiProperty({ example: 9800.0, description: 'Cart total at to year' })
  priceTo!: number

  @ApiProperty({
    example: 206.1,
    description: '((priceTo - priceFrom) / priceFrom) * 100',
  })
  growthPercent!: number
}

/** Price range + growth for Jameson (or named product) */
export class ProductPriceRangeDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222001' })
  id!: string

  @ApiProperty({ example: 'Виски Jameson 0.7' })
  name!: string

  @ApiProperty({ example: 650 })
  priceFrom!: number

  @ApiProperty({ example: 2399 })
  priceTo!: number

  @ApiProperty({ example: 269.08 })
  growthPercent!: number
}

/** Price range + growth for one stock */
export class StockPriceRangeDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111001' })
  id!: string

  @ApiProperty({ example: 'GAZP' })
  symbol!: string

  @ApiProperty({ example: 'Газпром' })
  companyName!: string

  @ApiPropertyOptional({ example: null, nullable: true, type: String })
  imageUrl!: string | null

  @ApiProperty({
    example: 2007,
    description: 'Year used for priceFrom (requested from, or nearest available after import)',
  })
  priceFromYear!: number

  @ApiProperty({
    example: 2026,
    description: 'Year used for priceTo (requested to, or nearest available after import)',
  })
  priceToYear!: number

  @ApiProperty({ example: 280.5 })
  priceFrom!: number

  @ApiProperty({ example: 155.2 })
  priceTo!: number

  @ApiProperty({ example: -44.67 })
  growthPercent!: number
}

/** Stock with purchasing-power ratios (overview list item) */
export class StockCompareItemDto extends StockPriceRangeDto {
  @ApiProperty({ type: PurchasingPowerDto })
  atFrom!: PurchasingPowerDto

  @ApiProperty({ type: PurchasingPowerDto })
  atTo!: PurchasingPowerDto
}

/** Multi-stock overview: GET /v1/analytics/compare */
export class CompareCartAndStocksDto {
  @ApiProperty({ example: 2007 })
  from!: number

  @ApiProperty({ example: 2026 })
  to!: number

  @ApiProperty({ example: 'RUB', enum: ['RUB', 'USD'] })
  currency!: 'RUB' | 'USD'

  @ApiProperty({ type: CartPriceRangeDto })
  cart!: CartPriceRangeDto

  @ApiProperty({ type: ProductPriceRangeDto })
  jameson!: ProductPriceRangeDto

  @ApiProperty({ type: StockCompareItemDto, isArray: true })
  stocks!: StockCompareItemDto[]
}

/** One stock deep-dive: GET /v1/analytics/compare/:id */
export class CompareCartToStockByIdDto {
  @ApiProperty({ example: 2007 })
  from!: number

  @ApiProperty({ example: 2026 })
  to!: number

  @ApiProperty({
    example: 'RUB',
    enum: ['RUB', 'USD'],
    description: 'Валюта всех денежных значений в ответе',
  })
  currency!: 'RUB' | 'USD'

  @ApiProperty({ type: StockPriceRangeDto })
  stock!: StockPriceRangeDto

  @ApiProperty({ type: CartPriceRangeDto })
  cart!: CartPriceRangeDto

  @ApiProperty({ type: ProductPriceRangeDto })
  jameson!: ProductPriceRangeDto

  @ApiProperty({ type: PurchasingPowerDto })
  atFrom!: PurchasingPowerDto

  @ApiProperty({ type: PurchasingPowerDto })
  atTo!: PurchasingPowerDto
}
