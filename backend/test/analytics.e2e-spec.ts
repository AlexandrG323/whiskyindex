import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from './create-test-app'

const JAMESON_ID = '22222222-2222-4222-8222-222222222001'

describe('analytics API', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/v1/analytics/exchange-rate?year=2007 returns a number', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/exchange-rate')
      .query({ year: 2007 })
    expect(res.status).toBe(200)
    // Nest returns a raw JSON number; SuperAgent only puts objects on res.body.
    const rate = JSON.parse(res.text) as number
    expect(typeof rate).toBe('number')
    expect(rate).toBeGreaterThan(0)
  })

  it('GET /api/v1/analytics/compare returns cart and Jameson when import is stubbed', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/analytics/compare').query({
      from: 2007,
      to: 2026,
      currency: 'rub',
    })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        from: 2007,
        to: 2026,
        currency: 'RUB',
        cart: expect.objectContaining({
          priceFrom: expect.any(Number),
          priceTo: expect.any(Number),
        }),
        jameson: expect.objectContaining({
          id: JAMESON_ID,
          priceFrom: expect.any(Number),
          priceTo: expect.any(Number),
        }),
      }),
    )
    expect(Array.isArray(res.body.stocks)).toBe(true)
    expect(Array.isArray(res.body.skipped)).toBe(true)
  })

  it('GET /api/v1/analytics/compare returns 400 for an inverted year range', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/analytics/compare').query({
      from: 2026,
      to: 2007,
    })
    expect(res.status).toBe(400)
  })
})
