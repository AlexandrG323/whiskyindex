import { Injectable, Logger } from '@nestjs/common'
import type { MonthlyCandle } from '../types'

type MoexCandlesResponse = {
  candles?: {
    columns: string[]
    data: (number | string)[]
  }
}

/**
 * Клиент MOEX ISS (российские акции: GAZP, SBER, …).
 *
 * Документация: https://iss.moex.com/iss/reference/
 * Ключевой URL (месячные свечи, interval=31):
 *   https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/{SYMBOL}/candles.json
 *     ?from=2007-01-01&till=2026-12-31&interval=31
 *
 * Как вызвать API в Node (без лишних библиотек — есть встроенный fetch):
 *
 *   const url = `https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/${symbol}/candles.json?from=${from}&till=${till}&interval=31`
 *   const res = await fetch(url)
 *   if (!res.ok) throw new Error(`MOEX HTTP ${res.status}`)
 *   const json = await res.json()
 *
 * Формат ответа MOEX: блоки `candles.columns` + `candles.data` (массив массивов).
 * Нужно сопоставить имя колонки → индекс, потом вытащить begin/open/high/low/close.
 *
 * Пагинация: если строк много, в ответе есть cursor / параметр `start=N` —
 * повторяй запросы, пока data не станет пустым.
 *
 * Что может пойти не так:
 * - Тикер не на TQBR (другой board) → пустой candles → попробуй без /boards/TQBR/
 * - AVAZ и старые бумаги могут быть сняты с торгов → пустой ответ (это нормально, пометь failed)
 * - Сеть / таймаут / 5xx → retry 1–2 раза с паузой
 * - SSL / DNS offline → проверь интернет и curl того же URL в терминале
 */
@Injectable()
export class MoexClient {
  private readonly logger = new Logger(MoexClient.name)

  /**
   * Скачать месячные свечи для `symbol` за период [fromYear, toYear].
   *
   * Шаги:
   * 1. Собери URL (см. комментарий класса)
   * 2. fetch → json
   * 3. Распарси candles → MonthlyCandle[]
   * 4. Верни массив (можно пустой, если данных нет)
   *
   * Проверка руками (в терминале):
   *   curl -s "https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/SBER/candles.json?from=2020-01-01&till=2020-12-31&interval=31" | head
   */
  async fetchMonthlyCandles(
    symbol: string,
    fromYear: number,
    toYear: number,
  ): Promise<MonthlyCandle[]> {
    const from = `${fromYear}-01-01`
    const till = `${toYear}-12-31`
    const candles: MonthlyCandle[] = []

    let start = 0
    let hasMore = true

    while (hasMore) {
      const url = `https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/${encodeURIComponent(
        symbol,
      )}/candles.json?from=${from}&till=${till}&interval=31&start=${start}`

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`MOEX API HTTP error ${res.status} for symbol ${symbol}`)
      }

      const json = (await res.json()) as MoexCandlesResponse

      if (!json.candles?.data || json.candles.data.length === 0) {
        hasMore = false
        break
      }

      const { columns, data } = json.candles
      const openIdx = columns.indexOf('open')
      const highIdx = columns.indexOf('high')
      const lowIdx = columns.indexOf('low')
      const closeIdx = columns.indexOf('close')
      const beginIdx = columns.indexOf('begin')

      for (const row of data) {
        const beginDate = String(row[beginIdx]).substring(0, 10)
        candles.push({
          date: beginDate,
          open: Number(row[openIdx]),
          high: Number(row[highIdx]),
          low: Number(row[lowIdx]),
          close: Number(row[closeIdx]),
        })
      }

      start += data.length
      if (data.length < 500) {
        hasMore = false
      }
    }

    this.logger.log(`Fetched ${candles.length} monthly candles from MOEX for ${symbol}`)
    return candles
  }
}
