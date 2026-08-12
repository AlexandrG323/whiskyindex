import type { ReactNode } from 'react'

/**
 * 16px stroke icons drawn in currentColor so they inherit button state.
 * Kept inline rather than as assets — there are only a handful and they must
 * recolour on hover/disabled. Always decorative: every button that uses one
 * carries its own aria-label.
 */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function ResetIcon() {
  return (
    <Glyph>
      <path d="M2.6 8a5.4 5.4 0 1 0 1.7-3.9L1.8 6.4" />
      <path d="M1.6 2.6v4h4" />
    </Glyph>
  )
}

export function SelectAllIcon() {
  return (
    <Glyph>
      <path d="M1.6 8.4 4.3 11 9.2 4.2" />
      <path d="M6.8 10.9 8.9 13 14.4 5.4" />
    </Glyph>
  )
}

export function SortIcon() {
  return (
    <Glyph>
      <path d="M4 2.8v10.4" />
      <path d="M1.7 10.9 4 13.2l2.3-2.3" />
      <path d="M9.2 4.2h5.1" />
      <path d="M9.2 8h4" />
      <path d="M9.2 11.8h2.9" />
    </Glyph>
  )
}

export function AddIcon() {
  return (
    <Glyph>
      <path d="M8 3.2v9.6" />
      <path d="M3.2 8h9.6" />
    </Glyph>
  )
}
