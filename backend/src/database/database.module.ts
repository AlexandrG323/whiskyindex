import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Pool } from 'pg'
import { PG_POOL } from './database.constants'

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DATABASE_URL')
        if (!connectionString) {
          throw new Error('DATABASE_URL is not set')
        }
        return new Pool({ connectionString })
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end()
  }
}
