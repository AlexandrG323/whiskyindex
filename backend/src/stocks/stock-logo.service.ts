import { Inject, Injectable, Logger } from '@nestjs/common'
import type { Pool } from 'pg'
import { PG_POOL } from '../database/database.constants'

export type StoredLogo = {
  contentType: string
  bytes: Buffer
}

/** Keyless and ticker-addressable, which is what a runtime lookup needs. */
const SOURCE_URL = (symbol: string) =>
  `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`

/**
 * Raster only, deliberately. An SVG served from our own origin executes script
 * in that origin when opened directly, and this content comes from a third
 * party — so we never store one, however the upstream labels it.
 */
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const FETCH_TIMEOUT_MS = 5_000
const MAX_BYTES = 512 * 1024

@Injectable()
export class StockLogoService {
  private readonly logger = new Logger(StockLogoService.name)

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getLogo(stockId: string): Promise<StoredLogo | null> {
    const { rows } = await this.pool.query<{ content_type: string; bytes: Buffer }>(
      `SELECT content_type, bytes FROM stock_logos WHERE stock_id = $1`,
      [stockId],
    )
    if (rows.length === 0) {
      return null
    }
    return { contentType: rows[0].content_type, bytes: rows[0].bytes }
  }

  /**
   * Best-effort logo fetch for a newly resolved ticker.
   *
   * Never throws: a stock without a logo is a perfectly good stock, and this
   * runs inside resolve, where an upstream outage must not fail the request.
   * Returns the URL to store in stocks.image_url, or null.
   *
   * FMP indexes US tickers only. Looking up MOEX `T` returns AT&T's logo —
   * skip that venue rather than attach the wrong issuer.
   */
  async fetchAndStore(
    stockId: string,
    symbol: string,
    source: 'moex' | 'yahoo' = 'yahoo',
  ): Promise<string | null> {
    if (source === 'moex') {
      this.logger.log(`Skipping US logo lookup for MOEX ${symbol}`)
      try {
        await this.pool.query(`DELETE FROM stock_logos WHERE stock_id = $1`, [stockId])
        await this.pool.query(
          `UPDATE stocks SET image_url = NULL, image_cached_at = NULL WHERE id = $1`,
          [stockId],
        )
      } catch (err) {
        this.logger.warn(`Failed to clear logo for MOEX ${symbol}: ${(err as Error).message}`)
      }
      return null
    }

    try {
      const res = await fetch(SOURCE_URL(symbol), {
        headers: { 'User-Agent': 'WhiskyIndex/0.1' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!res.ok) {
        this.logger.log(`No logo for ${symbol}: HTTP ${res.status}`)
        return null
      }

      // Unknown tickers come back as an HTML error page, not a 404.
      const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim()
      if (!ALLOWED_TYPES.has(contentType)) {
        this.logger.log(`No logo for ${symbol}: unusable content-type "${contentType}"`)
        return null
      }

      const bytes = Buffer.from(await res.arrayBuffer())
      if (bytes.length === 0 || bytes.length > MAX_BYTES) {
        this.logger.warn(`Rejected logo for ${symbol}: ${bytes.length} bytes`)
        return null
      }

      const url = `/api/v1/stocks/${stockId}/logo`
      await this.pool.query(
        `
        INSERT INTO stock_logos (stock_id, content_type, bytes, source)
        VALUES ($1, $2, $3, 'fmp')
        ON CONFLICT (stock_id) DO UPDATE SET
          content_type = EXCLUDED.content_type,
          bytes = EXCLUDED.bytes,
          source = EXCLUDED.source,
          fetched_at = now()
        `,
        [stockId, contentType, bytes],
      )
      await this.pool.query(
        `UPDATE stocks SET image_url = $2, image_cached_at = now() WHERE id = $1`,
        [stockId, url],
      )

      this.logger.log(`Stored ${bytes.length}B ${contentType} logo for ${symbol}`)
      return url
    } catch (err) {
      this.logger.warn(`Logo fetch failed for ${symbol}: ${(err as Error).message}`)
      return null
    }
  }
}
