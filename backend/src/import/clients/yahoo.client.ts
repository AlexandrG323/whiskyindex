import { Injectable, NotImplementedException } from '@nestjs/common'
import type { MonthlyCandle } from '../types'

/**
 * Клиент Yahoo Finance (US: AAPL, TSLA, …).
 *
 * Yahoo не всегда даёт официальный «простой» публичный API; для учебного проекта
 * удобен chart endpoint (неофициальный, но широко используемый):
 *
 *   https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}
 *     ?period1={unixFrom}&period2={unixTo}&interval=1mo
 *
 * SYMBOL:
 * - обычные акции: AAPL, TSLA, GOOGL
 * - индекс S&P 500 в seed как SPX → на Yahoo это чаще `^GSPC` (сделай маппинг)
 *
 * Как вызвать:
 *
 *   const period1 = Math.floor(Date.UTC(fromYear, 0, 1) / 1000)
 *   const period2 = Math.floor(Date.UTC(toYear, 11, 31) / 1000)
 *   const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1mo`
 *   const res = await fetch(url, {
 *     headers: {
 *       // Yahoo иногда режет запросы без User-Agent
 *       'User-Agent': 'Mozilla/5.0 (compatible; WhiskyIndex/0.1; +local-dev)',
 *     },
 *   })
 *   if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`)
 *   const json = await res.json()
 *
 * Где лежат цены в JSON:
 *   json.chart.result[0].timestamp[]          — unix seconds
 *   json.chart.result[0].indicators.quote[0]  — open/high/low/close массивы
 *
 * Что может пойти не так:
 * - 429 Too Many Requests — слишком частые запросы; добавь паузу / не крути в цикле без sleep
 * - 401/403 — часто из‑за отсутствия User-Agent или блокировки региона
 * - chart.result === null — тикер не найден (опечатка / wrong symbol)
 * - split/dividend adjustments — для MVP бери close «как есть»
 * - Часовой пояс / DST — для годовой средней не критично; бери год из UTC date
 *
 * Проверка руками:
 *   curl -s -A 'Mozilla/5.0' "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?period1=1577836800&period2=1609459200&interval=1mo" | head
 */
@Injectable()
export class YahooClient {
  /**
   * TODO: скачать месячные свечи для Yahoo-символа за [fromYear, toYear].
   *
   * Шаги:
   * 1. Замапь внутренний symbol → Yahoo ticker (SPX → ^GSPC)
   * 2. Построй URL с period1/period2/interval=1mo
   * 3. fetch с User-Agent → json
   * 4. Склей timestamp + quote → MonthlyCandle[]
   */
  async fetchMonthlyCandles(
    _symbol: string,
    _fromYear: number,
    _toYear: number,
  ): Promise<MonthlyCandle[]> {
    throw new NotImplementedException(
      'YahooClient.fetchMonthlyCandles — реализуй fetch к query1.finance.yahoo.com (см. yahoo.client.ts)',
    )
  }
}
