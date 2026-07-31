#!/usr/bin/env sh
# Apply schema + seed to the running Docker Postgres (idempotent).
# Usage (from repo root, with db up): ./db/seed.sh

set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${ROOT}/docker-compose.yml"
INIT_DIR="${ROOT}/db/init"

POSTGRES_USER="${POSTGRES_USER:-whisky}"
POSTGRES_DB="${POSTGRES_DB:-whiskyindex}"

echo "Waiting for whiskyindex_db..."
docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null

echo "Applying schema..."
docker compose -f "$COMPOSE_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <"$INIT_DIR/01_schema.sql"

echo "Seeding demo data (clears stock_prices; curated stocks stay pending)..."
docker compose -f "$COMPOSE_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <"$INIT_DIR/02_seed.sql"

echo "Seeding historical product prices..."
docker compose -f "$COMPOSE_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <"$INIT_DIR/03_product_prices.sql"

echo "Done. Sample counts:"
docker compose -f "$COMPOSE_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT
     (SELECT count(*) FROM stocks WHERE is_curated) AS curated_stocks,
     (SELECT count(*) FROM stock_prices) AS stock_prices,
     (SELECT count(*) FROM products) AS products,
     (SELECT count(*) FROM product_prices) AS product_prices,
     (SELECT count(*) FROM exchange_rates) AS fx_rates;"
