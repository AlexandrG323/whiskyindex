import type { ReactNode } from 'react'

interface LoaderProps {
  children: ReactNode
  /**
   * Float over already-rendered content instead of taking up space. Used when
   * refreshing data that is still on screen, so nothing shifts underneath.
   */
  overlay?: boolean
}

export function Loader({ children, overlay = false }: LoaderProps) {
  return (
    <div className={`loader${overlay ? ' loader--overlay' : ''}`} role="status">
      <img src="/icons/jameson.png" alt="" className="loader-bottle" />
      <p className="loader-text">{children}</p>
    </div>
  )
}
