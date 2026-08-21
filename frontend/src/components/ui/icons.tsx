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

export function FilterIcon() {
  return (
    <Glyph>
      <path d="M2.4 3.4h11.2L9.2 8.6v4l-2.4 1.2V8.6z" />
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

export function RemoveIcon() {
  return (
    <Glyph>
      <path d="M4 4l8 8" />
      <path d="M12 4l-8 8" />
    </Glyph>
  )
}

export function SearchIcon() {
  return (
    <Glyph>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2 13.6 13.6" />
    </Glyph>
  )
}

export function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
    </svg>
  )
}
