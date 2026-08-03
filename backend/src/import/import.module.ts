import { Module } from '@nestjs/common'
import { MoexClient } from './clients/moex.client'
import { YahooClient } from './clients/yahoo.client'
import { StockImportService } from './stock-import.service'

@Module({
  providers: [MoexClient, YahooClient, StockImportService],
  exports: [StockImportService],
})
export class ImportModule {}
