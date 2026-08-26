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

## Тесты

Нужен локальный Postgres (`docker compose up -d db` из корня; `npm run db:seed`,
если том пустой) и `DATABASE_URL` в `backend/.env`. E2e поднимает Nest и ходит
в HTTP; `StockImportService` заглушен — MOEX / Yahoo не вызываются.

```bash
npm test            # unit + e2e
npm run test:unit   # src/**/*.spec.ts (без БД)
npm run test:e2e    # backend/test/*.e2e-spec.ts
```

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
| GET | `/api/v1/analytics/compare` | Корзина vs акции: рост и purchasing power |
| GET | `/api/v1/analytics/compare/:id` | Одна акция vs корзина / Jameson |

## Import (домашка)

Скелет: `src/import/` — клиенты MOEX/Yahoo + `StockImportService`.
Подробный гайд и сценарии тестов (Apple, TSLA, SBER): **`src/import/HOMEWORK.md`**.

Seed кладёт только справочник curated-акций (`import_status=pending`), **без** `stock_prices`.
После `npm run db:seed` старые синтетические цены удаляются.

## Дальше по плану

- [x] Реализовать Import Service (MOEX + Yahoo) — см. HOMEWORK.md
- [x] Эндпоинт сравнения корзины vs портфель за диапазон лет
- [x] Пересчёт динамики (%) + purchasing power (бутылки / акции на корзину)
