# Whisky Index — Бутылка или Портфель?

Сравни, что оказалось выгоднее за последние ~30 лет: собрать **потребительскую корзину**
(виски, кола, сосиски, кофе...) или вложиться в **портфель акций** (Газпром, Сбербанк,
Apple, S&P 500...).

> _"В 2007-м бутылка Jameson стоила X рублей. А если бы ты вместо неё купил акцию Apple?"_

## Идея / MVP

- Пользователь открывает сайт **без авторизации** и сразу видит:
  - стандартный набор акций (на 2007): Газпром, Сбербанк, Лукойл, Норникель, Роснефть,
    АвтоВАЗ, Apple, Google, McDonald's, S&P 500, Philip Morris и тд.
  - стандартный список продуктов: виски Jameson 0.7, кола 2 л, сосиски, пельмени, кофе
    Jacobs (банка), Доширак, огурцы, активированный уголь, Боржоми, картошка, сигареты
    Winston, копчёная колбаса, майонез.
- Можно выбрать **диапазон лет**.
- Статистика: сколько стоила продуктовая корзина в эти годы + динамика акций.
- Пример вывода: **2007 vs 2026 — акции в рублях +2500%, продукты +2000%**, плюс разбивка
  по каждой акции и продукту.

## Архитектура (монорепозиторий)

```
whiskyindex/
├── package.json     # npm workspaces + Biome / Husky / lint-staged
├── biome.json       # lint + format (единый конфиг)
├── .husky/          # pre-commit / pre-push
├── frontend/        # React (TypeScript, Vite) — UI, графики, сравнение
├── backend/         # NestJS (TypeScript) — API, цены продуктов из БД, данные об акциях
├── db/              # Postgres schema + demo seed (init on first boot)
├── docker-compose.yml  # Postgres + API + frontend
└── README.md
```

### Стек

| Слой      | Технология                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | React + TypeScript (Vite)                                          |
| Backend   | NestJS + TypeScript                                                |
| Database  | PostgreSQL                                                         |
| Lint/format | Biome                                                              |
| Git hooks | Husky + lint-staged                                                |
| Внешние   | MOEX ISS (RU) + Yahoo Finance (US) — Import Service               |

## Быстрый старт (Docker)

Поднимает Postgres, API и frontend одной командой:

```bash
cp .env.example .env
docker compose up --build
```

Открой **http://localhost:5173** (UI; `/api` проксируется на backend).
OpenAPI / Swagger UI: **http://localhost:3000/api/docs** (или через UI: **http://localhost:5173/api/docs**).
API напрямую: **http://localhost:3000/api**.

На первом старте Postgres применяет схему и демо-сид из `db/init/`
(справочник акций без цен, продукты + цены, курсы USD/RUB). Цены акций
подтягиваются Import Service из MOEX / Yahoo — см. `backend/src/import/HOMEWORK.md`.
Если том `pgdata` уже есть — пересид: `./db/seed.sh` (или `docker compose down -v && docker compose up --build`).

## Локальная разработка (npm + только Postgres в Docker)

```bash
# 1. Установка зависимостей (из корня монорепо)
#    prepare → husky: ставит Git hooks (pre-commit / pre-push)
npm install

# Проверка, что hooks подключены (должно быть .husky/_):
#   git config --get core.hooksPath

# Если hooks не сработали (редко) — переустановить вручную:
#   npx husky

# 2. Поднять только Postgres (+ схема/сид на пустом томе)
cp .env.example .env
docker compose up -d db
# если том уже был — накатить демо-данные:
npm run db:seed

# 3. Backend
cd backend
cp .env.example .env
npm run start:dev        # http://localhost:3000

# 4. Frontend (в другом терминале, из корня)
cd frontend
npm run dev              # http://localhost:5173
```

Подробности — в `frontend/README.md` и `backend/README.md`.

## Lint & hooks

После `npm install` из корня Husky включает hooks автоматически (`prepare`).

| Hook | Когда | Что делает |
| ---- | ----- | ---------- |
| **pre-commit** | `git commit` | `lint-staged` → Biome по staged-файлам; ошибки и warnings блокируют commit |
| **pre-push** | `git push` | `npm run check` (полный lint + typecheck); блокирует push |

Из корня вручную:

```bash
npm run lint        # Biome: ошибки и warnings блокируют
npm run lint:fix   # автофиксы
npm run typecheck   # tsc --noEmit в frontend и backend
npm run check       # lint + typecheck (то же, что pre-push)
```

Обойти hooks можно только явно (`git commit --no-verify` / `HUSKY=0`) — так делать не стоит.

## Статус

Продукты и SQL-эндпоинты stocks готовы. Цены акций: seed только метаданные;
интеграция MOEX/Yahoo — домашка в `backend/src/import/HOMEWORK.md`.
