import { Injectable } from '@nestjs/common'
import { ProductYearlyPriceDto } from '../dto/common.dto'

@Injectable()
export class ProductsService {
  getCart(year = 2007, currency: 'rub' | 'usd' = 'rub'): ProductYearlyPriceDto {
    return {
      id: `prod-${Math.floor(Math.random() * 1000)}`,
      name: `* (${year})`,
      yearlyPrice: Math.floor(Math.random() * 5000) + 1000,
      currency,
    }
  }
}
