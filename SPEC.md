# Whisky Index

> **Бутылка или Портфель?**

## MVP

### Основная идея

Показать, что было выгоднее за выбранный период:

- купить акции;
- купить продукты;
- или сравнить их покупательную способность.

Все расчёты выполняются по годовым данным за последние **30 лет**.

---

# Пользовательский сценарий

1. Пользователь открывает сайт без авторизации.
2. Загружается стандартный набор акций.
3. Загружается стандартная продуктовая корзина.
4. По умолчанию выбран 2007 год.
5. Пользователь может:
   - изменить диапазон лет;
   - выбрать интересующие акции;
   - изменить состав продуктовой корзины.
6. Сайт отображает:
   - стоимость корзины по годам;
   - стоимость выбранных акций;
   - изменение стоимости в процентах;
   - сравнительную статистику.

---

# Стандартные акции

### Российские

- Газпром
- Сбербанк
- Лукойл
- Норникель
- Роснефть
- АвтоВАЗ

### Американские

- Apple
- Google
- McDonald's
- Philip Morris
- S&P 500

---

# Стандартная корзина

- Jameson 0.7
- Coca-Cola 2L
- Сосиски
- Пельмени
- Jacobs
- Доширак
- Огурцы
- Активированный уголь
- Боржоми
- Картофель
- Winston
- Копчёная колбаса
- Майонез

---

# Пример результата

## 2007 → 2026

| Объект | Рост |
|---------|------:|
| Apple | +2500% |
| Газпром | +420% |
| Сбербанк | +860% |
| Продуктовая корзина | +2000% |

Дополнительно отображается:

- разница доходности;
- сколько продуктовых корзин можно было купить;
- сколько бутылок Jameson можно было купить.

---

# Технологический стек

## Frontend

- React
- TypeScript

## Backend

- NestJS
- TypeScript

## Database

- PostgreSQL

---

# Источники данных

## Российские акции

Источник:

- MOEX ISS API

Используются:

- месячные свечи;
- вычисляется средняя цена за год.

---

## Американские акции

Источник:

- Yahoo Finance

Используются:

- месячные свечи;
- вычисляется средняя цена за год.

---

## Продукты

Источник данных определяется отдельно.

В базе хранится средняя цена продукта за каждый год.

---

# Архитектура

```text
  Client (FE)
       │
       │  GET /stocks, /history
       ▼
    Backend API
       │
       ├─ cache hit ──────────────────► PostgreSQL
       │                                 (stocks, stock_prices,
       │                                  image_url, coverage)
       │
       └─ cache miss / custom symbol
                 │
                 ▼
          Import Service  ──►  MOEX ISS / Yahoo Finance
                 │
                 │  monthly candles → avg price / year
                 │  logo URL, metadata
                 ▼
           PostgreSQL  (write once, serve many)
```

## Стратегия загрузки данных

Два режима:

| Режим | Когда | Поведение |
|-------|--------|-----------|
| **Curated** | Стандартный набор (`is_curated = true`) | Импортируется при деплое / по cron; всегда готов к отдаче из БД |
| **On-demand** | Пользователь добавляет свою акцию | Первый запрос → импорт из внешнего API → запись в БД → последующие запросы только из БД |

Правила:

- Backend **не** ходит во внешние API на каждый пользовательский запрос.
- При cache miss Backend запускает импорт, сохраняет результат в PostgreSQL и помечает акцию `import_status = ready`.
- Повторные запросы (включая историю цен и `image_url`) обслуживаются **только** из PostgreSQL.
- Пока импорт идёт, API возвращает `202 Accepted` + `importStatus: importing` (FE показывает skeleton / spinner).
- Curated-акции обновляются фоновым cron (например, раз в сутки), on-demand — по TTL или вручную.

```text
GET /stocks/{id}/history
        │
        ├─ stock_prices есть для диапазона? ──yes──► ответ из БД
        │
        └─ no ──► Import Service ──► MOEX/Yahoo ──► stock_prices + coverage ──► ответ
```

---

# API

## Products

### Получить корзину

```http
GET /api/v1/products/cart
```

### Query

```text
year=2007
currency=rub|usd
```

### Response

```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Jameson 0.7",
    "imageUrl": "https://cdn.example.com/products/jameson.png",
    "price": 850,
    "currency": "RUB"
  }
]
```

---

## Получить список продуктов

```http
GET /api/v1/products
```

---

## История продукта

```http
GET /api/v1/products/{id}/history
```

### Query

```text
from=1995
to=2025
currency=rub|usd
```

---

# Stocks

## Получить список акций

```http
GET /api/v1/stocks
```

### Query

```text
year=2007
currency=rub|usd
curated_only=true   # опционально: только стандартный набор
```

### Response

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "symbol": "AAPL",
    "companyName": "Apple",
    "imageUrl": "https://cdn.example.com/logos/AAPL.png",
    "nativeCurrency": "USD",
    "displayCurrency": "RUB",
    "price": 320.5,
    "importStatus": "ready"
  }
]
```

`imageUrl` — URL логотипа компании для отображения на FE (хранится в БД, не запрашивается у клиента напрямую у MOEX/Yahoo).

---

## Получить одну акцию

```http
GET /api/v1/stocks/{id}
```

### Response

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "symbol": "AAPL",
  "companyName": "Apple",
  "imageUrl": "https://cdn.example.com/logos/AAPL.png",
  "exchange": "NASDAQ",
  "nativeCurrency": "USD",
  "importStatus": "ready",
  "coverage": {
    "from": 1995,
    "to": 2026
  }
}
```

---

## Добавить / разрешить акцию (on-demand)

Первый вызов для неизвестного тикера создаёт запись в `stocks` и запускает lazy-import.

```http
POST /api/v1/stocks/resolve
```

### Request

```json
{
  "symbol": "TSLA",
  "exchange": "NASDAQ"
}
```

### Response

`200 OK` — данные уже в кеше:

```json
{
  "id": "...",
  "symbol": "TSLA",
  "importStatus": "ready",
  "imageUrl": "https://cdn.example.com/logos/TSLA.png"
}
```

`202 Accepted` — импорт запущен:

```json
{
  "id": "...",
  "symbol": "TSLA",
  "importStatus": "importing"
}
```

Клиент опрашивает `GET /api/v1/stocks/{id}` до `importStatus = ready`.

---

## История акции

```http
GET /api/v1/stocks/{id}/history
```

### Query

```text
from=1995
to=2025
currency=rub|usd
```

### Response

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "symbol": "AAPL",
  "imageUrl": "https://cdn.example.com/logos/AAPL.png",
  "nativeCurrency": "USD",
  "displayCurrency": "RUB",
  "importStatus": "ready",
  "prices": [
    {
      "year": 2007,
      "amount": 320.5,
      "nativeAmount": 12.5
    },
    {
      "year": 2008,
      "amount": 355.2,
      "nativeAmount": 14.8
    }
  ]
}
```

`amount` — цена в `displayCurrency`; `nativeAmount` — исходная цена в валюте листинга.

Если данных ещё нет: `202` + `importStatus: importing`. Если импорт не удался: `424` + `importStatus: failed`.

---

## История нескольких акций

```http
POST /api/v1/stocks/history
```

### Request

```json
{
  "ids": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  ],
  "from": 2007,
  "to": 2026,
  "currency": "rub"
}
```

Для акций без кеша Backend ставит их в очередь импорта; в ответе у каждой серии свой `importStatus`.

---

# Analytics

## Сравнение корзины и акций

```http
GET /api/v1/compare
```

### Query

```text
from=2007
to=2026
currency=rub|usd
stockIds=uuid,uuid   # опционально: только выбранные акции
```

---

## Сравнение конкретной акции

```http
GET /api/v1/compare/{id}
```

### Query

```text
from=2007
to=2026
currency=rub|usd
```

Ответ:

- рост акции;
- рост корзины;
- разница;
- сколько корзин можно было купить;
- сколько бутылок Jameson можно было купить.

---

# Главная страница

## API Flow

При открытии сайта:

1. Получить список акций

```http
GET /api/v1/stocks
```

2. Получить продуктовую корзину

```http
GET /api/v1/products/cart?year=2007
```

3. Получить цены акций за 2007 год

```http
GET /api/v1/stocks?year=2007
```

4. Получить стоимость корзины за 2007 год

```http
GET /api/v1/products/cart?year=2007
```

5. Получить историю главной акции

```http
GET /api/v1/stocks/{id}/history?from=2007&to=2026&currency=rub
```

---

# База данных

## stocks

Справочник акций.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | PK, стабильный идентификатор для API |
| symbol | varchar | Тикер (AAPL, GAZP) |
| company_name | varchar | Название компании |
| country | varchar | Страна листинга |
| exchange | varchar | Биржа (MOEX, NASDAQ) |
| source | varchar | `moex` \| `yahoo` — скрыт от клиента |
| image_url | text | URL логотипа для FE; заполняется при импорте, кешируется в БД |
| native_currency | char(3) | Валюта листинга: `RUB` \| `USD` |
| is_curated | boolean | `true` — стандартный набор MVP |
| is_active | boolean | Активна ли бумага |
| import_status | varchar | `pending` \| `importing` \| `ready` \| `failed` |
| import_error | text | Последняя ошибка импорта (если `failed`) |
| prices_cached_at | timestamptz | Когда последний раз загружена история цен |
| image_cached_at | timestamptz | Когда последний раз обновлён `image_url` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Ограничения:** `UNIQUE (symbol, exchange)`.

Логотип: при первом импорте Import Service получает URL (MOEX/Yahoo/внутренний CDN) и сохраняет в `image_url`. FE всегда читает URL из API, не строит его сам.

---

## stock_prices

Средняя цена акции за год **в нативной валюте листинга**.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | |
| stock_id | uuid | FK → stocks |
| year | smallint | |
| average_price | numeric(18,6) | Цена в `stocks.native_currency` |
| currency | char(3) | Дублирует `native_currency` для явности |
| imported_at | timestamptz | Когда строка попала в кеш |

**Ограничения:** `UNIQUE (stock_id, year)`.

Конвертация в RUB/USD для UI — на чтении через `exchange_rates`, не перезаписывает нативную цену.

---

## stock_data_coverage

Покрытие кеша по годам (для lazy-load и валидации диапазона на FE).

| Поле | Тип |
|------|-----|
| stock_id | uuid |
| year | smallint |
| has_price | boolean |
| imported_at | timestamptz |

**Ограничения:** `PRIMARY KEY (stock_id, year)`.

---

## products

Справочник продуктов.

| Поле | Тип |
|------|-----|
| id | uuid |
| name | varchar |
| category | varchar |
| image_url | text |

---

## product_prices

Средняя цена продукта за год.

| Поле | Тип |
|------|-----|
| id | uuid |
| product_id | uuid |
| year | smallint |
| average_price | numeric(18,6) |
| currency | char(3) | По умолчанию `RUB` |

**Ограничения:** `UNIQUE (product_id, year)`.

---

## exchange_rates

Среднегодовой курс валют.

| Поле | Тип |
|------|-----|
| year | smallint |
| base_currency | char(3) | Например `USD` |
| quote_currency | char(3) | Например `RUB` |
| rate | numeric(18,8) | 1 base = rate quote |
| source | varchar | |

**Ограничения:** `PRIMARY KEY (year, base_currency, quote_currency)`.

При отсутствии курса за год API возвращает ошибку `FX_RATE_MISSING` — FE не показывает сконвертированную цену.

---

# Принципы

- **Curated-акции** импортируются заранее (деплой / cron); **custom-акции** — lazy-load при первом запросе, затем только из БД.
- Повторные пользовательские запросы обслуживаются **только** из PostgreSQL.
- Внешние API (MOEX, Yahoo Finance) вызываются Import Service, не контроллерами API.
- Источник данных скрыт от клиента.
- Цены в БД хранятся в **нативной валюте** листинга; `currency` в query задаёт валюту отображения.
- Все значения по умолчанию возвращаются в рублях (`displayCurrency: RUB`).
- В каждом денежном ответе API возвращает `nativeCurrency`, `displayCurrency` и при конвертации — `nativeAmount` рядом с `amount`.
- `image_url` акций хранится в БД и отдаётся как `imageUrl` — FE не зависит от внешних logo-API.
- Все вычисления — по средним годовым ценам из месячных свечей.
- Сравнение доходности (`/compare`) считает рост в **одной** `displayCurrency` для всех серий в ответе.