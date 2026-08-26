import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from './create-test-app'

const APPLE_ID = '11111111-1111-4111-8111-111111111007'
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

describe('stocks API', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/v1/stocks/:id returns Apple metadata without importing', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/stocks/${APPLE_ID}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        id: APPLE_ID,
        symbol: 'AAPL',
        companyName: 'Apple',
        exchange: 'NASDAQ',
      }),
    )
  })

  it('GET /api/v1/stocks/:id returns 404 for an unknown stock', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/stocks/${UNKNOWN_ID}`)
    expect(res.status).toBe(404)
  })

  it('GET /api/v1/stocks returns curated symbols without calling MOEX/Yahoo', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/stocks').query({
      year: 2007,
      currency: 'rub',
      curated_only: 'true',
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const symbols = res.body.map((row: { symbol: string }) => row.symbol)
    expect(symbols).toEqual(expect.arrayContaining(['AAPL', 'SBER', 'GAZP']))
  })
})
