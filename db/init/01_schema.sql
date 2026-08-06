-- Whisky Index schema (SPEC.md → База данных)
-- Applied on first Postgres start via /docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol varchar(32) NOT NULL,
  company_name varchar(255) NOT NULL,
  country varchar(64) NOT NULL,
  exchange varchar(32) NOT NULL,
  source varchar(16) NOT NULL CHECK (source IN ('moex', 'yahoo')),
  image_url text,
  native_currency char(3) NOT NULL CHECK (native_currency IN ('RUB', 'USD')),
  is_curated boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  import_status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (import_status IN ('pending', 'importing', 'ready', 'failed')),
  import_error text,
  prices_cached_at timestamptz,
  image_cached_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (symbol, exchange)
);

CREATE TABLE IF NOT EXISTS stock_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES stocks (id) ON DELETE CASCADE,
  year smallint NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  average_price numeric(18, 6) NOT NULL CHECK (average_price > 0),
  currency char(3) NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stock_id, year)
);

CREATE TABLE IF NOT EXISTS stock_data_coverage (
  stock_id uuid NOT NULL REFERENCES stocks (id) ON DELETE CASCADE,
  year smallint NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  has_price boolean NOT NULL DEFAULT true,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stock_id, year)
);

-- Logos fetched at resolve time for tickers that are not part of the curated
-- set. Curated logos are bundled files under frontend/public and are served by
-- nginx directly; these cannot be, because the frontend image is built once and
-- is read-only at runtime. Bytes live in Postgres rather than on the API
-- container's filesystem so they survive a restart and are shared if the API is
-- ever scaled out — pgdata is the only persistent volume in the compose file.
CREATE TABLE IF NOT EXISTS stock_logos (
  stock_id uuid PRIMARY KEY REFERENCES stocks (id) ON DELETE CASCADE,
  content_type varchar(64) NOT NULL,
  bytes bytea NOT NULL,
  source varchar(32) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  category varchar(64) NOT NULL,
  image_url text
);

CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  year smallint NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  average_price numeric(18, 6) NOT NULL CHECK (average_price > 0),
  currency char(3) NOT NULL DEFAULT 'RUB',
  UNIQUE (product_id, year)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  year smallint NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  base_currency char(3) NOT NULL,
  quote_currency char(3) NOT NULL,
  rate numeric(18, 8) NOT NULL CHECK (rate > 0),
  source varchar(64) NOT NULL DEFAULT 'seed',
  PRIMARY KEY (year, base_currency, quote_currency)
);

CREATE INDEX IF NOT EXISTS idx_stock_prices_year ON stock_prices (year);
CREATE INDEX IF NOT EXISTS idx_product_prices_year ON product_prices (year);
CREATE INDEX IF NOT EXISTS idx_stocks_curated ON stocks (is_curated) WHERE is_curated;
