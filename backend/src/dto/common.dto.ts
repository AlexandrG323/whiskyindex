import { ApiProperty } from '@nestjs/swagger'

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string
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
