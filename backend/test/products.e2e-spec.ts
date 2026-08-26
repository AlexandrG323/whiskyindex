import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from './create-test-app'

const JAMESON_ID = '22222222-2222-4222-8222-222222222001'
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

describe('products API', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/v1/products/list includes Jameson', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/products/list')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: JAMESON_ID,
          name: expect.stringContaining('Jameson'),
        }),
      ]),
    )
  })

  it('GET /api/v1/products/cart?year=2007 returns priced items', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/products/cart').query({
      year: 2007,
      currency: 'rub',
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)

    const jameson = res.body.find((row: { id: string }) => row.id === JAMESON_ID)
    expect(jameson).toEqual(
      expect.objectContaining({
        id: JAMESON_ID,
        currency: 'RUB',
        priceStatus: 'actual',
      }),
    )
    expect(typeof jameson.price).toBe('number')
  })

  it('GET /api/v1/products/:id/history returns Jameson yearly prices', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/products/${JAMESON_ID}/history`)
      .query({ from: 2007, to: 2010, currency: 'rub' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        id: JAMESON_ID,
        currency: 'RUB',
      }),
    )
    expect(Array.isArray(res.body.prices)).toBe(true)
    expect(res.body.prices.length).toBeGreaterThan(0)
    expect(res.body.prices[0]).toEqual(
      expect.objectContaining({
        year: expect.any(Number),
        amount: expect.any(Number),
      }),
    )
  })

  it('GET /api/v1/products/:id/history returns 400 for an invalid UUID', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/products/not-a-uuid/history')
    expect(res.status).toBe(400)
  })

  it('GET /api/v1/products/:id/history returns 404 for an unknown product', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/products/${UNKNOWN_ID}/history`)
    expect(res.status).toBe(404)
  })
})
