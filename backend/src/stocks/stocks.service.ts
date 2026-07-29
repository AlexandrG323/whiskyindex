import { Injectable } from '@nestjs/common'
// import type { Pool } from 'pg'
// import { PG_POOL } from '../database/database.constants'

@Injectable()
export class StocksService {
  //   constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  getDefaultStocks() {
    return [
      { ticker: 'GAZP', name: 'Газпром' },
      { ticker: 'SBER', name: 'Сбербанк' },
      { ticker: 'LKOH', name: 'Лукойл' },
      { ticker: 'GMKN', name: 'Норникель' },
      { ticker: 'ROSN', name: 'Роснефть' },
      { ticker: 'AVAZ', name: 'АвтоВАЗ' },
      { ticker: 'AAPL', name: 'Apple' },
      { ticker: 'GOOGL', name: 'Google' },
      { ticker: 'MCD', name: "McDonald's" },
      { ticker: 'SPX', name: 'S&P 500' },
      { ticker: 'PM', name: 'Philip Morris' },
    ]
  }
}
