import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const REQUEST_TIMEOUT_MS = 20_000

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant'
  content?: string | null
}

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: OpenRouterMessage
  }>
  error?: {
    message?: string
  }
}

@Injectable()
export class OpenRouterClient {
  private readonly logger = new Logger(OpenRouterClient.name)

  constructor(private readonly config: ConfigService) {}

  getApiKey(): string | undefined {
    const key = this.config.get<string>('OPENROUTER_API_KEY')?.trim()
    return key || undefined
  }

  async chatJson(system: string, user: string): Promise<unknown> {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      throw new ServiceUnavailableException('Поиск по описанию недоступен. Укажите тикер вручную.')
    }

    const model = this.config.get<string>('OPENROUTER_MODEL')?.trim() || DEFAULT_MODEL
    const abort = AbortSignal.timeout(REQUEST_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        signal: abort,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/whiskyindex',
          'X-Title': 'whiskyindex',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 400,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      })
    } catch (err: unknown) {
      this.logger.error(`OpenRouter request failed: ${errorMessage(err)}`)
      throw new ServiceUnavailableException(
        'Не удалось обратиться к модели. Попробуйте ещё раз или укажите тикер.',
      )
    }

    const raw = await res.text()
    if (!res.ok) {
      this.logger.error(`OpenRouter HTTP ${res.status}`)
      throw new ServiceUnavailableException(
        'Не удалось обратиться к модели. Попробуйте ещё раз или укажите тикер.',
      )
    }

    let payload: OpenRouterChatResponse
    try {
      payload = JSON.parse(raw) as OpenRouterChatResponse
    } catch {
      throw new ServiceUnavailableException(
        'Модель вернула некорректный ответ. Попробуйте ещё раз или укажите тикер.',
      )
    }

    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      this.logger.error(`OpenRouter empty content: ${payload.error?.message ?? 'no choices'}`)
      throw new ServiceUnavailableException(
        'Модель вернула пустой ответ. Попробуйте ещё раз или укажите тикер.',
      )
    }

    return parseJsonContent(content)
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim()
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(unfenced)
  } catch {
    throw new ServiceUnavailableException(
      'Модель вернула некорректный ответ. Попробуйте ещё раз или укажите тикер.',
    )
  }
}
