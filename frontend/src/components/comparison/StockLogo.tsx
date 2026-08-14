import { useState } from 'react'

interface StockLogoProps {
  symbol: string
  src: string | null | undefined
  size: number
  className?: string
}

/**
 * Curated tickers ship a bundled file; resolved ones may have no logo at all
 * (FMP 404 / HTML error page). Never invent `/icons/stocks/{symbol}.svg` —
 * that path only exists for the seed set, and a broken img is worse than
 * initials.
 */
export function StockLogo({ symbol, src, size, className }: StockLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = src != null && failedSrc === src

  if (!src || failed) {
    return (
      <span
        className={className ? `${className} stock-logo-fallback` : 'stock-logo-fallback'}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {symbol.slice(0, 2)}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={className}
      onError={() => setFailedSrc(src)}
    />
  )
}
