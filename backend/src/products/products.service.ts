import { Injectable } from '@nestjs/common'

export interface ProductYearlyPriceDto {
  id: string
  name: string
  yearlyPrice: number
  currency: string
}

@Injectable()
export class ProductsService {
  getCart(): ProductYearlyPriceDto {
    return {
      id: `prod-${Math.floor(Math.random() * 1000)}`,
      name: '*',
      yearlyPrice: Math.floor(Math.random() * 5000) + 1000,
      currency: 'rub',
    }
  }
}
