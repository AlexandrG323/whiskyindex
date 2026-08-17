/** Yahoo sometimes quotes in minor units (pence, agora, cents). */
const MINOR_UNITS: Record<string, { code: string; scale: number }> = {
  GBp: { code: 'GBP', scale: 100 },
  GBX: { code: 'GBP', scale: 100 },
  GBx: { code: 'GBP', scale: 100 },
  ILA: { code: 'ILS', scale: 100 },
  ZAc: { code: 'ZAR', scale: 100 },
  ZAC: { code: 'ZAR', scale: 100 },
}

export type ListingCurrency = {
  /** ISO 4217 major unit, always uppercase. */
  code: string
  /** Divide venue prices by this to get the major unit (100 for GBp). */
  scale: number
}

export function normalizeListingCurrency(raw: string | null | undefined): ListingCurrency | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const minor = MINOR_UNITS[trimmed]
  if (minor) return minor

  const code = trimmed.toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return null
  return { code, scale: 1 }
}

export function isoCurrency(raw: string): string {
  return raw.trim().toUpperCase()
}
