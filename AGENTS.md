# Whisky Index

npm-workspace monorepo. Compare a consumer basket (whisky, cola, …) vs a stock portfolio over yearly data since 1998. Public site, no auth.

Product intent and API/DB contract: `SPEC.md`. Human setup: `README.md`.

## Layout

| Path | Role |
| --- | --- |
| `frontend/` | React 18 + TypeScript + Vite. Pages under `src/pages/`, shared fetch in `src/lib/api.ts`. |
| `backend/` | NestJS + TypeScript. Modules: `products`, `stocks`, `analytics`, `import`. |
| `db/init/` | Postgres schema + demo seed (applied on first empty volume). |
| `biome.json` | Lint + format for the whole repo. |

API prefix is `/api` (`backend/src/main.ts`). Versioned routes live under `/api/v1/...`. OpenAPI: `/api/docs`.

Frontend always calls **relative** `/api/...`. Vite (and Vercel) proxy that to the backend — do not hardcode API hosts.

## Commands (repo root)

```bash
npm install
npm run lint          # Biome; errors and warnings fail
npm run lint:fix
npm run typecheck     # tsc --noEmit in both workspaces
npm run check         # lint:fix + typecheck (same as pre-push)
npm run db:seed       # re-apply schema + seed (needs Postgres up)
```

Local run: Postgres via `docker compose up -d db`, then `npm run start:dev` in `backend/` and `npm run dev` in `frontend/`. Full stack: `docker compose up --build` (UI `:5173`, API `:3000`).

Do not skip Husky (`--no-verify` / `HUSKY=0`).

## Conventions

- TypeScript throughout. Match existing file style: single quotes, no unnecessary semicolons, 2-space indent, 100-char lines (Biome).
- Functional React components. Colocate page CSS next to the page/component that owns it.
- Nest: one module per domain (`*.module.ts` / `*.controller.ts` / `*.service.ts`). DTOs in `backend/src/dto/`. Use `@nestjs/swagger` on public endpoints.
- SQL is the source of truth for schema. Change `db/init/*.sql` (and `db/seed.sh` if needed); do not invent tables or columns.
- Year range is `1998–2026`, default `2007` — keep `backend/src/common/years.ts` and the frontend `App.tsx` constants in sync. 1998 is the ruble redenomination; do not back-fill pre-listing prices.
- Historical figures do not change in a session: prefer `getJson` / `postJson` in `frontend/src/lib/api.ts`. Use `fetchJson` only when the same URL’s status can change (resolve/poll).
- Product copy and UI strings are Russian; code, comments, and commit messages are English.

## Do not

- Add auth, user accounts, or a CSS framework unless asked.
- Store secrets in the repo. Copy `.env.example` / `backend/.env.example`; never commit `.env`.
- Serve curated logos from the API — they live in `frontend/public/icons/`. Resolved-ticker logos go through `GET /api/v1/stocks/:id/logo` (bytes in Postgres).
- Invent stock/product prices. Seed has product prices + stock metadata; share prices come from the import service (MOEX RU, Yahoo US).
