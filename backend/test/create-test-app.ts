import type { INestApplication } from '@nestjs/common'
import { ExpressAdapter } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { StockImportService } from '../src/import/stock-import.service'

/**
 * Full AppModule against local Postgres, with import stubbed so e2e never
 * calls MOEX / Yahoo. Caller must `await app.close()` in afterAll so the
 * pg pool is destroyed and Jest can exit.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StockImportService)
    .useValue({
      importStockById: async () => undefined,
    })
    .compile()

  // Pass ExpressAdapter explicitly: Nest's dynamic require of
  // @nestjs/platform-express fails under Jest in this npm workspace.
  const app = moduleRef.createNestApplication(new ExpressAdapter(), { logger: false })
  app.setGlobalPrefix('api')
  await app.init()
  return app
}
