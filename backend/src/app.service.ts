import { Injectable } from '@nestjs/common'

// TODO: заменить статические списки на данные из Postgres и внешнего API котировок.
@Injectable()
export class AppService {
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
