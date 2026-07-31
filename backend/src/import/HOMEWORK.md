# Домашка: Import Service (MOEX + Yahoo Finance)

Задание на выходные. SQL-эндпоинты stocks уже работают — теперь учимся
**вызывать сторонние HTTP API**, парсить JSON и класть результат в Postgres.

Читай параллельно: `SPEC.md` (раздел «Источники данных» + «Стратегия загрузки»),
файлы в этой папке (`moex.client.ts`, `yahoo.client.ts`, `stock-import.service.ts`).

---

## Шаг 0 — почистить локальную БД (сделай первым делом!)

В старом seed лежали **рандомные/синтетические** цены акций. Если у тебя уже крутился
Postgres с тем сидом, в таблице `stock_prices` сейчас мусор. Его нужно снести **до**
работы над Import — иначе будешь отлаживать «фейковые» цифры и думать, что Yahoo/MOEX
уже работают.

Из **корня репозитория** (Postgres должен быть запущен: `docker compose up --build`):

```bash
# Пересидит БД: DELETE stock_prices + stock_data_coverage,
# curated-акции → import_status = pending (метаданные остаются)
npm run db:seed
```

Проверка, что цен больше нет:

```bash
docker compose exec -T db \
  psql -U whisky -d whiskyindex -c \
  "SELECT
     (SELECT count(*) FROM stock_prices) AS stock_prices,
     (SELECT count(*) FROM stock_data_coverage) AS coverage,
     (SELECT count(*) FROM stocks WHERE import_status = 'pending') AS pending_stocks;"
```

Ожидание: `stock_prices = 0`, `coverage = 0`, `pending_stocks` ≈ 11.

Если `npm run db:seed` недоступен / что-то пошло не так — руками:

```bash
docker compose exec -T db \
  psql -U whisky -d whiskyindex -c "
    DELETE FROM stock_data_coverage;
    DELETE FROM stock_prices;
    UPDATE stocks
       SET import_status = 'pending',
           prices_cached_at = NULL,
           import_error = NULL,
           updated_at = now();
  "
```

Только после этого переходи к коду и сценариям ниже.

---

## Зачем это нужно

Сейчас в seed лежат только **метаданные** curated-акций (`AAPL`, `SBER`, …) со статусом
`import_status = pending`. Цен в `stock_prices` **нет**.

Пока Import не реализован, эти запросы вернут **404** (нечего JOIN-ить):

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:3000/api/v1/stocks?year=2007&currency=rub&curated_only=true"
# → 404

curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:3000/api/v1/stocks/11111111-1111-4111-8111-111111111007/history?from=2007&to=2010&currency=usd"
# → 404  (AAPL из seed, цен ещё нет)
```

После импорта цены появляются в БД, и те же SQL-эндпоинты начинают отдавать данные.
Повторные запросы **не** должны снова ходить в Yahoo/MOEX (cache hit).

---

## Что реализовать (чеклист)

### 1. `MoexClient.fetchMonthlyCandles` (российские бумаги)

- HTTP GET к ISS MOEX, `interval=31` (или 30, месяц)
- Пример URL есть в комментарии класса
- Распарси `candles.columns` + `candles.data` → `MonthlyCandle[]`
- Сначала проверь URL через `curl` в терминале (см. ниже)

### 2. `YahooClient.fetchMonthlyCandles` (US)

- HTTP GET к chart API, `interval=1mo`
- Обязательно передай `User-Agent`
- Маппинг: внутренний `SPX` → Yahoo `^GSPC`
- Распарси `timestamp` + `indicators.quote[0]` → `MonthlyCandle[]`

### 3. `StockImportService.averageByYear`

- Группируй свечи по календарному году → среднее `close` (или OHLC/4)
- Без сети и без БД — удобно отладить отдельно

### 4. `StockImportService.persistYearlyPrices`

- UPSERT в `stock_prices` и `stock_data_coverage`
- Желательно в транзакции

### 5. `StockImportService.importStockById`

- Статусы: `importing` → скачать → сохранить → `ready`
- Ошибка → `failed` + `import_error`

### 6. Подключить к `StocksService` (TODO в сервисе)

- **history**: нет строк в `stock_prices` за диапазон → запусти `importStockById`, верни 202 + `importing` (или дождись готовности — для MVP синхронный await тоже ок, но SPEC предпочитает 202 + poll)
- **resolve**: если акции нет в БД — INSERT (source по exchange: MOEX→moex, иначе yahoo) → запусти импорт → верни `{ id, symbol, importStatus }`
- **list**: опционально — для curated без цен запусти импорт фоном; пока можно оставить 404 и импортировать через history/resolve

---

## Как устроен вызов внешнего API (кратко)

```text
твой код
  → fetch(url)          // HTTP-запрос
  → res.ok?             // 200–299 ок, иначе ошибка
  → res.json()          // тело → объект JS
  → достань нужные поля // у каждого API своя «форма» JSON
  → преврати в MonthlyCandle[]
```

Типичные ошибки новичка:

| Симптом | Причина | Что сделать |
|--------|---------|-------------|
| `TypeError: fetch failed` | нет сети / DNS / Docker без интернета | проверь `curl` с хоста; в Docker нужен доступ наружу |
| HTTP 403 / 429 (Yahoo) | антибот / rate limit | User-Agent, пауза между запросами, не долби в цикле |
| HTTP 200, но пустой массив | неверный board/тикер (MOEX) или symbol (Yahoo) | сверь тикер на сайте биржи; для S&P используй `^GSPC` |
| `undefined` при парсинге | другая структура JSON / опечатка в пути | `console.log(Object.keys(json))`, смотри реальный ответ |
| Цены есть, list всё ещё 404 | импорт в другой year / currency join | проверь `SELECT * FROM stock_prices WHERE stock_id = …` |
| Статус завис в `importing` | упало без `catch` / не обновил статус | в `finally`/`catch` всегда пиши `failed` |

---

## Сценарии тестирования

Перед тестами **обязательно** выполни [Шаг 0](#шаг-0--почистить-локальную-бд-сделай-первым-делом)
(`npm run db:seed`), иначе в ответах могут быть старые синтетические цены.

```bash
# из корня репо
docker compose up -d db
npm run db:seed          # очистит мусорные stock_prices; curated → pending
cd backend && npm run start:dev
```

Проверь, что цен нет:

```bash
docker compose exec -T db \
  psql -U whisky -d whiskyindex -c "SELECT count(*) FROM stock_prices;"
# → 0
```

### Сценарий A — default акция Apple (Yahoo)

1. Импортируй AAPL (id из seed):
   - либо вызови свой метод `importStockById('11111111-1111-4111-8111-111111111007')`
     (временно из временного эндпоинта / скрипта / через resolve+history — как удобнее),
   - либо после проводки в `getHistory`: запроси history и дождись импорта.
2. В БД должны появиться строки:
   ```sql
   SELECT year, average_price, currency
   FROM stock_prices
   WHERE stock_id = '11111111-1111-4111-8111-111111111007'
   ORDER BY year;
   ```
3. API:
   ```bash
   curl -s "http://localhost:3000/api/v1/stocks/11111111-1111-4111-8111-111111111007"
   # importStatus: ready, coverage.from/to заполнены

   curl -s "http://localhost:3000/api/v1/stocks/11111111-1111-4111-8111-111111111007/history?from=2015&to=2020&currency=usd"
   # prices[] с year/amount/nativeAmount

   curl -s "http://localhost:3000/api/v1/stocks?year=2018&currency=usd&curated_only=true"
   # в списке есть AAPL с реалистичной ценой (не «синтетика» из старого seed)
   ```
4. Повторный history **не** должен снова бить Yahoo (посмотри логи — второго fetch быть не должно).

### Сценарий B — новая акция через resolve (TSLA, Yahoo)

1. До resolve TSLA в таблице нет:
   ```sql
   SELECT * FROM stocks WHERE symbol = 'TSLA';
   ```
2. Создай / найди:
   ```bash
   curl -s -X POST "http://localhost:3000/api/v1/stocks/resolve" \
     -H 'Content-Type: application/json' \
     -d '{"symbol":"TSLA","exchange":"NASDAQ"}'
   ```
   Ожидание по SPEC:
   - `202` + `importStatus: "importing"` **или** сразу `200` + `ready`, если импорт синхронный (для домашки синхронный await допустим).
3. Поллинг:
   ```bash
   curl -s "http://localhost:3000/api/v1/stocks/<id-из-ответа>"
   # пока importing → потом ready
   ```
4. History:
   ```bash
   curl -s "http://localhost:3000/api/v1/stocks/<id>/history?from=2015&to=2024&currency=usd"
   ```
5. Повторный resolve того же TSLA → **тот же id**, без дубликата (`UNIQUE (symbol, exchange)`).

### Сценарий C — российская акция (MOEX), например SBER

```bash
# id Сбера из seed:
# 11111111-1111-4111-8111-111111111002

curl -s "http://localhost:3000/api/v1/stocks/11111111-1111-4111-8111-111111111002/history?from=2018&to=2023&currency=rub"
```

Цены должны быть в RUB порядка сотен–тысяч, не «как у Apple в долларах».

### Сценарий D — ошибка / несуществующий тикер

```bash
curl -s -X POST "http://localhost:3000/api/v1/stocks/resolve" \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"ZZZZNOPE","exchange":"NASDAQ"}'
```

Ожидание: `importStatus: failed` (или 404), в `stocks.import_error` текст ошибки.
Не оставляй статус вечно в `importing`.

---

## Ручная проверка API до кода (обязательно!)

```bash
# MOEX — месячные свечи Сбера за 2020
curl -s "https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/SBER/candles.json?from=2020-01-01&till=2020-12-31&interval=31" | head -c 500

# Yahoo — месячные свечи Apple
curl -s -A 'Mozilla/5.0' \
  "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?period1=1577836800&period2=1609459200&interval=1mo" | head -c 500
```

Если curl с твоей машины не работает — чинить сеть/VPN **до** написания Nest-кода.

---

## Критерии «готово»

- [ ] Локальная БД почищена (Шаг 0): `stock_prices = 0` до первого импорта
- [ ] `MoexClient` и `YahooClient` реально ходят в сеть и возвращают свечи
- [ ] `importStockById('…AAPL…')` заполняет `stock_prices`
- [ ] Сценарий A (Apple) проходит
- [ ] Сценарий B (TSLA resolve) проходит
- [ ] Сценарий C (SBER / MOEX) проходит
- [ ] Повторный запрос history не делает лишний HTTP (cache hit)
- [ ] Ошибка импорта → `failed`, не вечный `importing`
- [ ] `npm run check` проходит
- [ ] Открой PR с короткой записью: какие URL использовал, синхронный импорт или 202+poll

Удачи. Если Stuck > 30 минут на парсинге JSON — залогируй кусок ответа и разберись с формой данных, не гадай.
