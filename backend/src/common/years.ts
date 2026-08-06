/**
 * The app's year scale, in one place — it was previously repeated as a literal
 * in both controllers, both services and the frontend.
 *
 * MIN_YEAR is 1998 because that is the ruble denomination: before it, prices
 * are in millions of pre-1998 rubles and not comparable to anything after.
 *
 * DEFAULT_YEAR stays 2007 deliberately. Only the US stocks and the MOEX index
 * reach back to 1998 — every individual Russian share starts 2006 or later,
 * because MOEX serves candles from the current share issue's registration
 * date. 2007 is the first year where the whole curated set has real data.
 */
export const MIN_YEAR = 1998
export const MAX_YEAR = 2026
export const DEFAULT_YEAR = 2007

/** Parse a query-string year, falling back to DEFAULT_YEAR and clamping to range. */
export function parseYear(raw: string | undefined, fallback: number = DEFAULT_YEAR): number {
  const n = raw === undefined || raw === '' ? Number.NaN : Number(raw)
  if (!Number.isFinite(n)) {
    return fallback
  }
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.trunc(n)))
}
