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
  ('11111111-1111-4111-8111-111111111001', 'GAZP',  'Газпром',        'RU', 'MOEX',   'moex',  '/icons/stocks/gazp.svg',  'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111002', 'SBER',  'Сбербанк',       'RU', 'MOEX',   'moex',  '/icons/stocks/sber.svg',  'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111003', 'LKOH',  'Лукойл',         'RU', 'MOEX',   'moex',  '/icons/stocks/lkoh.svg',  'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111004', 'GMKN',  'Норникель',      'RU', 'MOEX',   'moex',  '/icons/stocks/gmkn.png',  'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111005', 'ROSN',  'Роснефть',       'RU', 'MOEX',   'moex',  '/icons/stocks/rosn.svg',  'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111006', 'AVAZ',  'АвтоВАЗ',        'RU', 'MOEX',   'moex',  '/icons/stocks/avaz.png',  'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111007', 'AAPL',  'Apple',          'US', 'NASDAQ', 'yahoo', '/icons/stocks/aapl.svg',  'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111008', 'GOOGL', 'Google',         'US', 'NASDAQ', 'yahoo', '/icons/stocks/googl.svg', 'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111009', 'MCD',   'McDonald''s',    'US', 'NYSE',   'yahoo', '/icons/stocks/mcd.svg',   'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111010', 'SPX',   'S&P 500',        'US', 'INDEX',  'yahoo', '/icons/stocks/spx.svg',   'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111011', 'PM',    'Philip Morris',  'US', 'NYSE',   'yahoo', '/icons/stocks/pm.svg',    'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111012', 'XOM',   'Exxon Mobil',    'US', 'NYSE',   'yahoo', '/icons/stocks/xom.svg',   'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111013', 'CVX',   'Chevron',        'US', 'NYSE',   'yahoo', '/icons/stocks/cvx.svg',   'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111014', 'MSFT',  'Microsoft',      'US', 'NASDAQ', 'yahoo', '/icons/stocks/msft.svg',  'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111015', 'AMZN',  'Amazon',         'US', 'NASDAQ', 'yahoo', '/icons/stocks/amzn.svg',  'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111016', 'IMOEX', 'Индекс МосБиржи','RU', 'INDEX',  'moex',  '/icons/stocks/imoex.svg', 'RUB', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111017', 'NVDA',  'NVIDIA',         'US', 'NASDAQ', 'yahoo', '/icons/stocks/nvda.svg',  'USD', true, true, 'pending', NULL, NULL),
  ('11111111-1111-4111-8111-111111111018', 'TSLA',  'Tesla',          'US', 'NASDAQ', 'yahoo', '/icons/stocks/tsla.svg',  'USD', true, true, 'pending', NULL, NULL)
ON CONFLICT (symbol, exchange) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  country = EXCLUDED.country,
  source = EXCLUDED.source,
  -- Curated logos are bundled assets, so the seed is their source of truth and
  -- re-seeding must refresh them. Only rows listed above are touched; a logo
  -- fetched at resolve time for some other ticker is never overwritten.
  image_url = EXCLUDED.image_url,
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
-- image_url is a root-relative path, not an absolute URL: the SPA and the API
-- are served from one origin in both dev (Vite) and prod (nginx), so these
-- resolve as-is with no per-environment config. Files: frontend/public/icons/
INSERT INTO products (id, name, category, image_url, available_from) VALUES
  ('22222222-2222-4222-8222-222222222001', 'Виски Jameson 0.7 л',          'alcohol',  '/icons/jameson.png',   NULL),
  ('22222222-2222-4222-8222-222222222002', 'Кола 2 литра',                 'drinks',   '/icons/cola.png',      NULL),
  ('22222222-2222-4222-8222-222222222003', 'Сосиски 1 кг',                 'meat',     '/icons/sosiski.png',   NULL),
  ('22222222-2222-4222-8222-222222222004', 'Пельмени 800 г',               'frozen',   '/icons/pelmeni.png',   NULL),
  ('22222222-2222-4222-8222-222222222005', 'Кофе Jacobs 190 г',            'grocery',  '/icons/jacobs.png',    NULL),
  ('22222222-2222-4222-8222-222222222006', 'Доширак',                      'grocery',  '/icons/doshirak.png',  2005),
  ('22222222-2222-4222-8222-222222222007', 'Огурцы 680 г',                 'produce',  '/icons/ogurtsy.png',   NULL),
  ('22222222-2222-4222-8222-222222222008', 'Активированный уголь 10 таб.', 'pharmacy', '/icons/ugol.png',      NULL),
  ('22222222-2222-4222-8222-222222222009', 'Боржоми 0.5 л',                'drinks',   '/icons/borjomi.png',   NULL),
  ('22222222-2222-4222-8222-222222222010', 'Картошка 1 кг',                'produce',  '/icons/kartoshka.png', NULL),
  ('22222222-2222-4222-8222-222222222011', 'Сигареты Winston',             'tobacco',  '/icons/winston.png',   NULL),
  ('22222222-2222-4222-8222-222222222012', 'Копчёная колбаса 1 кг',        'meat',     '/icons/kolbasa.png',   NULL),
  ('22222222-2222-4222-8222-222222222013', 'Майонез 630 г',                'grocery',  '/icons/mayonez.png',   NULL),
  ('22222222-2222-4222-8222-222222222014', 'Жигулёвское 0.45 л',           'alcohol',  '/icons/beer.png',      NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  available_from = EXCLUDED.available_from;

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
    (1998,  9.71000000),
    (1999, 24.62000000),
    (2000, 28.13000000),
    (2001, 29.17000000),
    (2002, 31.35000000),
    (2003, 30.69000000),
    (2004, 28.81000000),
    (2005, 28.28000000),
    (2006, 27.19000000),
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
