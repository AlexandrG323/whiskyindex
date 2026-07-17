-- Demo seed data for local Docker / easy start.
-- Idempotent: safe to re-run. Numbers are approximate fixtures, not live market data.

BEGIN;

-- ---------------------------------------------------------------------------
-- Curated stocks (fixed UUIDs for stable local references)
-- ---------------------------------------------------------------------------
INSERT INTO stocks (
  id, symbol, company_name, country, exchange, source, image_url,
  native_currency, is_curated, is_active, import_status, prices_cached_at, image_cached_at
) VALUES
  ('11111111-1111-4111-8111-111111111001', 'GAZP',  'Газпром',        'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111002', 'SBER',  'Сбербанк',       'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111003', 'LKOH',  'Лукойл',         'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111004', 'GMKN',  'Норникель',      'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111005', 'ROSN',  'Роснефть',       'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111006', 'AVAZ',  'АвтоВАЗ',        'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111007', 'AAPL',  'Apple',          'US', 'NASDAQ', 'yahoo', NULL, 'USD', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111008', 'GOOGL', 'Google',         'US', 'NASDAQ', 'yahoo', NULL, 'USD', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111009', 'MCD',   'McDonald''s',    'US', 'NYSE',   'yahoo', NULL, 'USD', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111010', 'SPX',   'S&P 500',        'US', 'INDEX',  'yahoo', NULL, 'USD', true, true, 'ready', now(), now()),
  ('11111111-1111-4111-8111-111111111011', 'PM',    'Philip Morris',  'US', 'NYSE',   'yahoo', NULL, 'USD', true, true, 'ready', now(), now())
ON CONFLICT (symbol, exchange) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  country = EXCLUDED.country,
  source = EXCLUDED.source,
  native_currency = EXCLUDED.native_currency,
  is_curated = EXCLUDED.is_curated,
  is_active = EXCLUDED.is_active,
  import_status = EXCLUDED.import_status,
  prices_cached_at = EXCLUDED.prices_cached_at,
  updated_at = now();

-- Yearly stock prices 2007–2026 (synthetic growth from a 2007 base)
WITH bases (stock_id, base_price, annual_growth) AS (
  VALUES
    ('11111111-1111-4111-8111-111111111001'::uuid, 280.000000, 0.045),  -- GAZP RUB
    ('11111111-1111-4111-8111-111111111002'::uuid,  95.000000, 0.080),  -- SBER
    ('11111111-1111-4111-8111-111111111003'::uuid, 1800.000000, 0.070), -- LKOH
    ('11111111-1111-4111-8111-111111111004'::uuid, 4500.000000, 0.060), -- GMKN
    ('11111111-1111-4111-8111-111111111005'::uuid, 210.000000, 0.055),  -- ROSN
    ('11111111-1111-4111-8111-111111111006'::uuid,  28.000000, 0.020),  -- AVAZ
    ('11111111-1111-4111-8111-111111111007'::uuid,  12.500000, 0.180),  -- AAPL USD
    ('11111111-1111-4111-8111-111111111008'::uuid,  16.000000, 0.140),  -- GOOGL
    ('11111111-1111-4111-8111-111111111009'::uuid,  50.000000, 0.090),  -- MCD
    ('11111111-1111-4111-8111-111111111010'::uuid, 1470.000000, 0.080), -- SPX
    ('11111111-1111-4111-8111-111111111011'::uuid,  45.000000, 0.070)   -- PM
),
years AS (
  SELECT generate_series(2007, 2026) AS year
),
currency_map AS (
  SELECT id AS stock_id, native_currency
  FROM stocks
  WHERE id IN (SELECT stock_id FROM bases)
)
INSERT INTO stock_prices (stock_id, year, average_price, currency, imported_at)
SELECT
  b.stock_id,
  y.year,
  round((b.base_price * power(1 + b.annual_growth, y.year - 2007))::numeric, 6),
  c.native_currency,
  now()
FROM bases b
CROSS JOIN years y
JOIN currency_map c ON c.stock_id = b.stock_id
ON CONFLICT (stock_id, year) DO UPDATE SET
  average_price = EXCLUDED.average_price,
  currency = EXCLUDED.currency,
  imported_at = EXCLUDED.imported_at;

INSERT INTO stock_data_coverage (stock_id, year, has_price, imported_at)
SELECT stock_id, year, true, imported_at
FROM stock_prices
WHERE stock_id IN (
  SELECT id FROM stocks WHERE is_curated
)
ON CONFLICT (stock_id, year) DO UPDATE SET
  has_price = EXCLUDED.has_price,
  imported_at = EXCLUDED.imported_at;

-- ---------------------------------------------------------------------------
-- Products (fixed UUIDs)
-- ---------------------------------------------------------------------------
INSERT INTO products (id, name, category, image_url) VALUES
  ('22222222-2222-4222-8222-222222222001', 'Виски Jameson 0.7',        'alcohol',   NULL),
  ('22222222-2222-4222-8222-222222222002', 'Кола 2 литра',             'drinks',    NULL),
  ('22222222-2222-4222-8222-222222222003', 'Сосиски',                  'meat',      NULL),
  ('22222222-2222-4222-8222-222222222004', 'Пельмени',                 'frozen',    NULL),
  ('22222222-2222-4222-8222-222222222005', 'Банка кофе Jacobs',        'grocery',   NULL),
  ('22222222-2222-4222-8222-222222222006', 'Доширак',                  'grocery',   NULL),
  ('22222222-2222-4222-8222-222222222007', 'Огурцы',                   'produce',   NULL),
  ('22222222-2222-4222-8222-222222222008', 'Активированный уголь',     'pharmacy',  NULL),
  ('22222222-2222-4222-8222-222222222009', 'Боржоми',                  'drinks',    NULL),
  ('22222222-2222-4222-8222-222222222010', 'Картошка',                 'produce',   NULL),
  ('22222222-2222-4222-8222-222222222011', 'Сигареты Winston',         'tobacco',   NULL),
  ('22222222-2222-4222-8222-222222222012', 'Копчёная колбаса',         'meat',      NULL),
  ('22222222-2222-4222-8222-222222222013', 'Майонез',                  'grocery',   NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url;

-- Product prices 2007–2026 in RUB (synthetic inflation ~8%/yr)
WITH bases (product_id, base_price) AS (
  VALUES
    ('22222222-2222-4222-8222-222222222001'::uuid, 650.00),   -- Jameson
    ('22222222-2222-4222-8222-222222222002'::uuid,  45.00),   -- Cola
    ('22222222-2222-4222-8222-222222222003'::uuid,  90.00),   -- Sausages
    ('22222222-2222-4222-8222-222222222004'::uuid, 110.00),   -- Pelmeni
    ('22222222-2222-4222-8222-222222222005'::uuid, 180.00),   -- Jacobs
    ('22222222-2222-4222-8222-222222222006'::uuid,  18.00),   -- Doshirak
    ('22222222-2222-4222-8222-222222222007'::uuid,  40.00),   -- Cucumbers
    ('22222222-2222-4222-8222-222222222008'::uuid,  25.00),   -- Charcoal
    ('22222222-2222-4222-8222-222222222009'::uuid,  55.00),   -- Borjomi
    ('22222222-2222-4222-8222-222222222010'::uuid,  20.00),   -- Potato
    ('22222222-2222-4222-8222-222222222011'::uuid,  50.00),   -- Winston
    ('22222222-2222-4222-8222-222222222012'::uuid, 220.00),   -- Smoked sausage
    ('22222222-2222-4222-8222-222222222013'::uuid,  35.00)    -- Mayo
),
years AS (
  SELECT generate_series(2007, 2026) AS year
)
INSERT INTO product_prices (product_id, year, average_price, currency)
SELECT
  b.product_id,
  y.year,
  round((b.base_price * power(1.08, y.year - 2007))::numeric, 6),
  'RUB'
FROM bases b
CROSS JOIN years y
ON CONFLICT (product_id, year) DO UPDATE SET
  average_price = EXCLUDED.average_price,
  currency = EXCLUDED.currency;

-- ---------------------------------------------------------------------------
-- USD/RUB average yearly rates (approximate fixtures)
-- ---------------------------------------------------------------------------
INSERT INTO exchange_rates (year, base_currency, quote_currency, rate, source)
SELECT
  year,
  'USD',
  'RUB',
  rate,
  'seed'
FROM (
  VALUES
    (2007, 25.58000000),
    (2008, 24.85000000),
    (2009, 31.72000000),
    (2010, 30.37000000),
    (2011, 29.39000000),
    (2012, 31.09000000),
    (2013, 31.85000000),
    (2014, 38.42000000),
    (2015, 60.96000000),
    (2016, 67.03000000),
    (2017, 58.35000000),
    (2018, 62.71000000),
    (2019, 64.62000000),
    (2020, 72.15000000),
    (2021, 73.65000000),
    (2022, 68.55000000),
    (2023, 84.70000000),
    (2024, 92.50000000),
    (2025, 95.00000000),
    (2026, 98.00000000)
) AS t(year, rate)
ON CONFLICT (year, base_currency, quote_currency) DO UPDATE SET
  rate = EXCLUDED.rate,
  source = EXCLUDED.source;

-- Inverse RUB→USD for convenience
INSERT INTO exchange_rates (year, base_currency, quote_currency, rate, source)
SELECT year, 'RUB', 'USD', round((1 / rate)::numeric, 8), 'seed'
FROM exchange_rates
WHERE base_currency = 'USD' AND quote_currency = 'RUB'
ON CONFLICT (year, base_currency, quote_currency) DO UPDATE SET
  rate = EXCLUDED.rate,
  source = EXCLUDED.source;

COMMIT;
