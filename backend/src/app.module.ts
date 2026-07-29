import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './database/database.module'
import { ProductsModule } from './products/products.module'
import { StocksModule } from './stocks/stocks.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, ProductsModule, StocksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
