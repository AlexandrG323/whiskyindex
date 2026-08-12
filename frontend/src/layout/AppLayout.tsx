import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'

interface AppLayoutProps {
  header: ReactNode
}

export function AppLayout({ header }: AppLayoutProps) {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Navigating is an implicit "done with the menu". pathname is the trigger,
  // not a value the effect reads, which is why biome cannot see the need.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    // The drawer covers the page; scrolling what is behind it reads as a bug.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  const closeMenu = () => {
    setMenuOpen(false)
    toggleRef.current?.focus()
  }

  return (
    <div className="app-layout">
      <div className="app-sticky-chrome">
        <Sidebar open={menuOpen} onClose={closeMenu} />
        <div className="app-sticky-header">
          <div className="app-topbar">
            <button
              ref={toggleRef}
              type="button"
              className="nav-toggle"
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={menuOpen}
              aria-controls="app-sidebar"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="nav-toggle-bars" aria-hidden="true" />
            </button>
            {header}
          </div>
        </div>
      </div>
      <main className="app-content page-body">
        <Outlet />
      </main>
    </div>
  )
}
