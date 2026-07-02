import { Injectable } from '@nestjs/common';

// TODO: заменить статические списки на данные из Postgres и внешнего API котировок.
@Injectable()
export class AppService {
  getDefaultProducts() {
    return [
      { id: 'jameson', name: 'Виски Jameson 0.7' },
      { id: 'cola', name: 'Кола 2 литра' },
      { id: 'sausages', name: 'Сосиски' },
      { id: 'pelmeni', name: 'Пельмени' },
      { id: 'jacobs', name: 'Банка кофе Jacobs' },
      { id: 'doshirak', name: 'Доширак' },
      { id: 'cucumbers', name: 'Огурцы' },
      { id: 'charcoal', name: 'Активированный уголь' },
      { id: 'borjomi', name: 'Боржоми' },
      { id: 'potato', name: 'Картошка' },
      { id: 'winston', name: 'Сигареты Winston' },
      { id: 'sausage_smoked', name: 'Копчёная колбаса' },
      { id: 'mayo', name: 'Майонез' },
    ];
  }

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
    ];
  }
}
