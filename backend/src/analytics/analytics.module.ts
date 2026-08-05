import { Module } from '@nestjs/common'
import { ProductsModule } from '../products/products.module'
import { StocksModule } from '../stocks/stocks.module'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'

@Module({
  imports: [ProductsModule, StocksModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
