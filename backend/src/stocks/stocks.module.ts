import { Module } from '@nestjs/common'
import { ImportModule } from '../import/import.module'
import { StockLogoService } from './stock-logo.service'
import { StocksController } from './stocks.controller'
import { StocksService } from './stocks.service'

@Module({
  imports: [ImportModule],
  controllers: [StocksController],
  providers: [StocksService, StockLogoService],
  exports: [StocksService, StockLogoService],
})
export class StocksModule {}
