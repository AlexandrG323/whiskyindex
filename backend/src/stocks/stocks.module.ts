import { Module } from '@nestjs/common'
import { ImportModule } from '../import/import.module'
import { OpenRouterClient } from './openrouter.client'
import { StockLogoService } from './stock-logo.service'
import { StockQueryService } from './stock-query.service'
import { StocksController } from './stocks.controller'
import { StocksService } from './stocks.service'

@Module({
  imports: [ImportModule],
  controllers: [StocksController],
  providers: [StocksService, StockLogoService, OpenRouterClient, StockQueryService],
  exports: [StocksService, StockLogoService],
})
export class StocksModule {}
