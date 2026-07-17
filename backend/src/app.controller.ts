import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AppService } from './app.service'
import { HealthResponseDto, ProductDto, StockDto } from './dto/common.dto'

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ type: HealthResponseDto })
  health(): HealthResponseDto {
    return { status: 'ok' }
  }

  @Get('products')
  @ApiOperation({ summary: 'Default product basket (no auth)' })
  @ApiOkResponse({ type: ProductDto, isArray: true })
  getProducts(): ProductDto[] {
    return this.appService.getDefaultProducts()
  }

  @Get('stocks')
  @ApiOperation({ summary: 'Default stock set for 2007 (no auth)' })
  @ApiOkResponse({ type: StockDto, isArray: true })
  getStocks(): StockDto[] {
    return this.appService.getDefaultStocks()
  }
}
