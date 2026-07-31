# Whisky Index — Backend (NestJS)

API на NestJS (TypeScript). Цены продуктов — из Postgres. Акции: метаданные в БД,
цены подтягиваются Import Service из **MOEX ISS** (RU) и **Yahoo Finance** (US).

## Запуск

```bash
cp .env.example .env
npm install
npm run start:dev
```

API: `http://localhost:3000/api` · Swagger: `http://localhost:3000/api/docs`.

## Эндпоинты (v1)

| Метод | Путь | Описание |
| ----- | ---- | -------- |
| GET | `/api/health` | Health |
| GET | `/api/v1/products/...` | Корзина / список / история продуктов |
| GET | `/api/v1/stocks` | Список акций за год (из БД после import) |
| GET | `/api/v1/stocks/:id` | Карточка + coverage / importStatus |
| GET | `/api/v1/stocks/:id/history` | История цен |
| POST | `/api/v1/stocks/resolve` | Найти/создать тикер + импорт |
| POST | `/api/v1/stocks/history` | История нескольких акций |

## Import (домашка)

Скелет: `src/import/` — клиенты MOEX/Yahoo + `StockImportService`.
Подробный гайд и сценарии тестов (Apple, TSLA, SBER): **`src/import/HOMEWORK.md`**.

Seed кладёт только справочник curated-акций (`import_status=pending`), **без** `stock_prices`.
После `npm run db:seed` старые синтетические цены удаляются.

## Дальше по плану

- [ ] Реализовать Import Service (MOEX + Yahoo) — см. HOMEWORK.md
- [ ] Эндпоинт сравнения корзины vs портфель за диапазон лет
- [ ] Пересчёт динамики (%)
