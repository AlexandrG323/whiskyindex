#!/usr/bin/env sh
# Apply schema + seed (idempotent).
# Uses DATABASE_URL from repo-root .env when set (e.g. production Neon);
# otherwise the running Docker Postgres.
# Usage (from repo root): ./db/seed.sh

set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${ROOT}/docker-compose.yml"
INIT_DIR="${ROOT}/db/init"
ENV_FILE="${ROOT}/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-whisky}"
POSTGRES_DB="${POSTGRES_DB:-whiskyindex}"

# stdin is SQL; extra args are forwarded to psql (-c, flags, ...).
run_psql() {
  if [ -n "${DATABASE_URL:-}" ]; then
    docker run --rm -i --entrypoint psql postgres:16-alpine \
      "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"
  else
    docker compose -f "$COMPOSE_FILE" exec -T db \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 "$@"
  fi
}

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Seeding via DATABASE_URL from .env..."
else
  echo "Waiting for whiskyindex_db..."
  docker compose -f "$COMPOSE_FILE" exec -T db \
    pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null
fi

echo "Applying schema..."
run_psql <"$INIT_DIR/01_schema.sql"

echo "Seeding demo data (clears stock_prices; curated stocks stay pending)..."
run_psql <"$INIT_DIR/02_seed.sql"

echo "Seeding historical product prices..."
run_psql <"$INIT_DIR/03_product_prices.sql"

echo "Done. Sample counts:"
run_psql -c \
  "SELECT
     (SELECT count(*) FROM stocks WHERE is_curated) AS curated_stocks,
     (SELECT count(*) FROM stock_prices) AS stock_prices,
     (SELECT count(*) FROM products) AS products,
     (SELECT count(*) FROM product_prices) AS product_prices,
     (SELECT count(*) FROM exchange_rates) AS fx_rates;"
