import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // Стандартный список продуктов (виден без авторизации)
  @Get('products')
  getProducts() {
    return this.appService.getDefaultProducts();
  }

  // Стандартный набор акций (2007)
  @Get('stocks')
  getStocks() {
    return this.appService.getDefaultStocks();
  }
}
