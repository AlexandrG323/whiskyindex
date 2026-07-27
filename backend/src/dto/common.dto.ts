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

export class StockDto {
  @ApiProperty({ example: 'AAPL' })
  ticker!: string

  @ApiProperty({ example: 'Apple' })
  name!: string
}
