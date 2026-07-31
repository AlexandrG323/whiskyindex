-- Demo seed data for local Docker / easy start.
-- Idempotent: safe to re-run.
-- Stock *prices* are NOT seeded — Import Service loads them from MOEX / Yahoo (homework).

BEGIN;

-- ---------------------------------------------------------------------------
-- Wipe synthetic stock prices from older seeds (keep products + FX rates)
-- ---------------------------------------------------------------------------
DELETE FROM stock_data_coverage;
DELETE FROM stock_prices;

-- ---------------------------------------------------------------------------
-- Curated stocks metadata only (fixed UUIDs). import_status = pending until import.
-- ---------------------------------------------------------------------------
INSERT INTO stocks (
  id, symbol, company_name, country, exchange, source, image_url,
  native_currency, is_curated, is_active, import_status, prices_cached_at, image_cached_at
) VALUES
  ('11111111-1111-4111-8111-111111111001', 'GAZP',  'Газпром',        'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111002', 'SBER',  'Сбербанк',       'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111003', 'LKOH',  'Лукойл',         'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111004', 'GMKN',  'Норникель',      'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111005', 'ROSN',  'Роснефть',       'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111006', 'AVAZ',  'АвтоВАЗ',        'RU', 'MOEX',   'moex',  NULL, 'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111007', 'AAPL',  'Apple',          'US', 'NASDAQ', 'yahoo', NULL, 'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111008', 'GOOGL', 'Google',         'US', 'NASDAQ', 'yahoo', NULL, 'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111009', 'MCD',   'McDonald''s',    'US', 'NYSE',   'yahoo', NULL, 'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111010', 'SPX',   'S&P 500',        'US', 'INDEX',  'yahoo', NULL, 'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111011', 'PM',    'Philip Morris',  'US', 'NYSE',   'yahoo', NULL, 'USD', true, true, 'pending', NULL, NULL)
ON CONFLICT (symbol, exchange) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  country = EXCLUDED.country,
  source = EXCLUDED.source,
  native_currency = EXCLUDED.native_currency,
  is_curated = EXCLUDED.is_curated,
  is_active = EXCLUDED.is_active,
  import_status = EXCLUDED.import_status,
  prices_cached_at = EXCLUDED.prices_cached_at,
  image_cached_at = EXCLUDED.image_cached_at,
  updated_at = now();

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

-- Product prices: see 03_product_prices.sql

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
