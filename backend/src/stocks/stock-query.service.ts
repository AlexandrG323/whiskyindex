import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type {
  ResolveQueryStockDto,
  ResolveStockQueryDto,
  ResolveStockQueryResponseDto,
  StockQueryCandidateDto,
  StockQueryTriedDto,
} from '../dto/common.dto'
import { StockImportService } from '../import/stock-import.service'
import { OpenRouterClient } from './openrouter.client'
import { StocksService } from './stocks.service'

const MAX_QUERY_LENGTH = 200
const MAX_CANDIDATES = 5

const SYSTEM_PROMPT = `You map a free-form description of a publicly traded company or stock to ticker candidates.

Return JSON only of the form:
{"candidates":[{"symbol":"SBER","exchange":"MOEX","companyName":"Sberbank","confidence":0.97,"reason":"Largest Russian bank"}]}

Rules:
- Return 3 to 5 candidates, highest confidence first. Always include plausible alternate tickers or venues, not just one guess.
- confidence is a number from 0 to 1.
- For Russian stocks use exchange MOEX (or TQBR) and the ISS ticker WITHOUT a Yahoo suffix (SBER, GAZP, AVAZ — never SBER.ME).
- For every other venue use Yahoo Finance ticker conventions: put the Yahoo suffix IN the symbol (VOD.L, 7203.T, 0700.HK, BMW.DE, RR.L). Exchange is the human venue name (LSE, NASDAQ, NYSE, HKEX, TSE, FRA, and so on).
- MOEX and TQBR are the only exchanges fetched from MOEX ISS; anything else is fetched from Yahoo using the symbol as-is.
- Prefer ordinary shares that are or were publicly listed. Avoid ETFs unless the query asks for a fund.
- If the query is qualitative ("fastest growing British stock"), pick plausible well-known listings and say so in reason.
- Never invent private companies that are not listed.`

@Injectable()
export class StockQueryService {
  private readonly logger = new Logger(StockQueryService.name)

  constructor(
    private readonly openRouter: OpenRouterClient,
    private readonly stockImport: StockImportService,
    private readonly stocksService: StocksService,
  ) {}

  async resolveQuery(body: ResolveStockQueryDto): Promise<ResolveStockQueryResponseDto> {
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    if (!query) {
      throw new BadRequestException('Введите описание компании или акции.')
    }
    if (query.length > MAX_QUERY_LENGTH) {
      throw new BadRequestException(`Описание длиннее ${MAX_QUERY_LENGTH} символов.`)
    }

    const exclude = new Set(
      (body.exclude ?? [])
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    )

    const candidates = parseCandidates(await this.openRouter.chatJson(SYSTEM_PROMPT, query))
    const tried: StockQueryTriedDto[] = []

    for (const candidate of candidates) {
      if (exclude.has(listingKey(candidate.symbol, candidate.exchange))) {
        continue
      }

      const source = sourceFromExchange(candidate.exchange)
      const probe = await this.stockImport.probeSymbol(candidate.symbol, source)
      tried.push({
        symbol: candidate.symbol,
        exchange: candidate.exchange,
        available: probe.available,
      })

      if (!probe.available) {
        continue
      }

      const resolved = await this.stocksService.resolve({
        symbol: candidate.symbol,
        exchange: candidate.exchange,
      })

      if (resolved.importStatus === 'failed') {
        this.logger.warn(
          `Resolve failed after successful probe for ${candidate.symbol} ${candidate.exchange}`,
        )
        continue
      }

      const companyName = probe.companyName || candidate.companyName
      const payload: ResolveQueryStockDto = {
        id: resolved.id,
        symbol: resolved.symbol,
        exchange: candidate.exchange,
        importStatus: resolved.importStatus,
        imageUrl: resolved.imageUrl,
        ...(companyName ? { companyName } : {}),
      }

      return { resolved: payload, candidates, tried }
    }

    return { resolved: null, candidates, tried }
  }
}

function sourceFromExchange(exchange: string): 'moex' | 'yahoo' {
  return exchange === 'MOEX' || exchange === 'TQBR' ? 'moex' : 'yahoo'
}

function listingKey(symbol: string, exchange: string): string {
  return `${symbol}|${exchange}`
}

function parseCandidates(payload: unknown): StockQueryCandidateDto[] {
  if (!payload || typeof payload !== 'object') return []
  const raw = (payload as { candidates?: unknown }).candidates
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const candidates: StockQueryCandidateDto[] = []

  for (const item of raw) {
    const parsed = parseCandidate(item)
    if (!parsed) continue
    const key = listingKey(parsed.symbol, parsed.exchange)
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push(parsed)
    if (candidates.length >= MAX_CANDIDATES) break
  }

  return candidates.sort((a, b) => b.confidence - a.confidence)
}

function parseCandidate(item: unknown): StockQueryCandidateDto | null {
  if (!item || typeof item !== 'object') return null
  const row = item as Record<string, unknown>
  let symbol = typeof row.symbol === 'string' ? row.symbol.trim().toUpperCase() : ''
  const exchange = typeof row.exchange === 'string' ? row.exchange.trim().toUpperCase() : ''
  if (!symbol || !exchange) return null

  if ((exchange === 'MOEX' || exchange === 'TQBR') && symbol.endsWith('.ME')) {
    symbol = symbol.slice(0, -3)
  }

  const companyName = typeof row.companyName === 'string' ? row.companyName.trim() : ''
  const reason = typeof row.reason === 'string' ? row.reason.trim() : ''
  const confidence = clampConfidence(row.confidence)

  return { symbol, exchange, companyName, confidence, reason }
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}
