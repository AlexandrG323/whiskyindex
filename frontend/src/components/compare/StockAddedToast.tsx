import { useEffect } from 'react'
import { StockLogo } from '../comparison/StockLogo'

export type StockAddedNotice = {
  name: string
  symbol: string
  exchange: string
  imageUrl: string | null
}

const DISMISS_MS = 5200

interface StockAddedToastProps {
  notice: StockAddedNotice | null
  onDismiss: () => void
}

export function StockAddedToast({ notice, onDismiss }: StockAddedToastProps) {
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(onDismiss, DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [notice, onDismiss])

  if (!notice) return null

  return (
    <div className="stock-added-toast" role="status" aria-live="polite">
      <div className="stock-added-toast-logo">
        <StockLogo symbol={notice.symbol} src={notice.imageUrl} size={72} />
      </div>
      <div className="stock-added-toast-copy">
        <p className="stock-added-toast-title">Добавлена акция: {notice.name}</p>
        <p className="stock-added-toast-meta">
          Тикер {notice.symbol} • {notice.exchange}
        </p>
      </div>
      <button
        type="button"
        className="stock-added-toast-close"
        aria-label="Закрыть"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  )
}
