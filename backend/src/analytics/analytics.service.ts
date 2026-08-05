import { Injectable } from '@nestjs/common'
//import type { Pool } from 'pg'
//import { PG_POOL } from '../database/database.constants'
import { CompareCartAndStocksDto, CompareCartToStockByIdDto } from '../dto/common.dto'
//import { StockImportService } from '../import/stock-import.service'

@Injectable()
export class AnalyticsService {
  /*constructor(
    @Inject(PG_POOL)
    rivate readonly pool: Pool,
    private readonly stockImport: StockImportService,
  ) {}*/

  async compareCartAndStocks(
    from: number,
    to: number,
    currency: 'rub' | 'usd',
    stockIds: string[],
  ): Promise<CompareCartAndStocksDto> {
    console.log(from)
    console.log(to)
    console.log(currency)
    console.log(stockIds)
    return {
      stocks: [],
      cart: [],
    }
  }

  async compareCartToStockById(
    id: string,
    currency: 'rub' | 'usd',
    from: number,
    to: number,
  ): Promise<CompareCartToStockByIdDto> {
    console.log(from)
    console.log(to)
    console.log(currency)
    console.log(id)
    return {
      stockGrowthPercent: 0,
      cartGrowthPercent: 0,
      differencePercent: 0,
      stockPrice: 0,
      cartPrice: 0,
      jamesonPrice: 0,
      currency: 'RUB',
    }
  }
}
