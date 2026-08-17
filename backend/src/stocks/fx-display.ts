/**
 * Convert a listing-currency amount into the UI currency (USD or RUB)
 * by pivoting through USD. Missing rates return null — never 1.
 *
 * nativeUsdByCcyYear: ISO code → year → USD per 1 native unit (e.g. MNT→USD).
 * usdRubByYear: year → RUB per 1 USD (seeded CBR series).
 */
export function convertToDisplay(
  nativeAmount: number,
  nativeCurrency: string,
  displayCurrency: 'RUB' | 'USD',
  year: number,
  usdRubByYear: Map<number, number>,
  nativeUsdByCcyYear: Map<string, Map<number, number>>,
): number | null {
  const native = nativeCurrency.trim().toUpperCase()
  if (native === displayCurrency) return nativeAmount

  const usd = toUsd(nativeAmount, native, year, usdRubByYear, nativeUsdByCcyYear)
  if (usd === null) return null
  if (displayCurrency === 'USD') return usd

  const usdRub = usdRubByYear.get(year)
  if (!usdRub) return null
  return usd * usdRub
}

function toUsd(
  nativeAmount: number,
  native: string,
  year: number,
  usdRubByYear: Map<number, number>,
  nativeUsdByCcyYear: Map<string, Map<number, number>>,
): number | null {
  if (native === 'USD') return nativeAmount
  if (native === 'RUB') {
    const usdRub = usdRubByYear.get(year)
    return usdRub ? nativeAmount / usdRub : null
  }
  const rate = nativeUsdByCcyYear.get(native)?.get(year)
  return rate ? nativeAmount * rate : null
}

export function currenciesNeedingUsdPair(
  natives: Iterable<string>,
  displayCurrency: 'RUB' | 'USD',
): string[] {
  const needed = new Set<string>()
  for (const raw of natives) {
    const native = raw.trim().toUpperCase()
    if (native === displayCurrency || native === 'USD' || native === 'RUB') continue
    needed.add(native)
  }
  return [...needed]
}
