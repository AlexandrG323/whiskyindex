import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Главная', end: true },
  { to: '/cart', label: 'Корзина скуфа' },
  { to: '/stocks', label: 'Акции' },
  { to: '/compare', label: 'Сравнение' },
  { to: '/about', label: 'О проекте' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
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
      </aside>
    </>
  )
}
