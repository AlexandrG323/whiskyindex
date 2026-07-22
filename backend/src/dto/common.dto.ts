import { ApiProperty } from '@nestjs/swagger'

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string
}

export class ProductYearlyPriceDto {
  @ApiProperty({ example: 'prod-42' })
  id!: string

  @ApiProperty({ example: 'Виски Jameson 0.7' })
  name!: string

  @ApiProperty({ example: 1850 })
  yearlyPrice!: number

  @ApiProperty({ example: 'rub', enum: ['rub', 'usd'] })
  currency!: string
}

export class ProductDto {
  @ApiProperty({ example: 'jameson' })
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
