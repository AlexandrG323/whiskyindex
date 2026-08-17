import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import type { Currency } from '../lib/currency'

const LINKS = [
  { to: '/', label: 'Главная', end: true },
  { to: '/cart', label: 'Корзина скуфа' },
  { to: '/stocks', label: 'Акции' },
  { to: '/compare', label: 'Сравнение' },
  { to: '/about', label: 'О проекте' },
]

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'rub', label: '₽ RUB' },
  { value: 'usd', label: '$ USD' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
}

export function Sidebar({ open, onClose, currency, onCurrencyChange }: SidebarProps) {
  const navRef = useRef<HTMLElement>(null)

  // Only fires in drawer mode — on desktop the sidebar is a rail and `open`
  // never flips. Deferred a frame because the drawer is `visibility: hidden`
  // until the class lands, and focus() is a no-op on a hidden element.
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      navRef.current?.querySelector('a')?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  return (
    <>
      <div className={`nav-scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside id="app-sidebar" className={`sidebar${open ? ' is-open' : ''}`}>
        <div className="sidebar-banner">
          <img src="/icons/banner.webp" alt="Banner" />
        </div>

        <nav ref={navRef} className="sidebar-nav">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="currency-switcher">
          <div className="currency-switcher-toggle">
            {CURRENCIES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={currency === option.value}
                className={currency === option.value ? 'is-active' : undefined}
                onClick={() => onCurrencyChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
