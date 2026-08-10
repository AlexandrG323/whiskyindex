/**
 * TODO (домашка): левая панель навигации.
 * См. frontend/HOMEWORK.md и mocks/mock1.png / mock2.png.
 *
 * Нужно:
 * - 6 ссылок (Главная, Корзина скуфа, Акции, Сравнение, История, О проекте)
 * - картинка /icons/banner.webp на всю ширину панели
 * - подсветка активного пункта (удобно через NavLink)
 */
import { NavLink } from 'react-router-dom'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-banner">
        <img src="/icons/banner.webp" alt="Banner" />
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Главная
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : '')}>
          Корзина скуфа
        </NavLink>
        <NavLink to="/stocks" className={({ isActive }) => (isActive ? 'active' : '')}>
          Акции
        </NavLink>
        <NavLink to="/compare" className={({ isActive }) => (isActive ? 'active' : '')}>
          Сравнение
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : '')}>
          История
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
          О проекте
        </NavLink>
      </nav>
    </aside>
  )
}
