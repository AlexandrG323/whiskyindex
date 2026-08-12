/**
 * TODO (домашка): общий каркас приложения.
 * См. frontend/HOMEWORK.md.
 *
 * Нужно:
 * - слева <Sidebar />
 * - справа сверху существующий header (.masthead из App.tsx)
 * - справа ниже — <Outlet /> из react-router-dom (сюда рендерятся страницы)
 */
import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'

interface AppLayoutProps {
  header: ReactNode
}

export function AppLayout({ header }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <div className="app-sticky-chrome">
        <Sidebar />
        <div className="app-sticky-header">{header}</div>
      </div>
      <main className="app-content page-body">
        <Outlet />
      </main>
    </div>
  )
}
