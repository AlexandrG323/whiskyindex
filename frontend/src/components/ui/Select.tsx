import { useEffect, useId, useRef, useState } from 'react'

export type SelectOption<T extends string | number> = {
  value: T
  label: string
  disabled?: boolean
}

interface SelectProps<T extends string | number> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  /** Accessible name for the control. */
  ariaLabel: string
  /** Which edge the menu lines up with — `end` for triggers near the right. */
  align?: 'start' | 'end'
  className?: string
}

function firstEnabled(options: { disabled?: boolean }[]) {
  const index = options.findIndex((o) => !o.disabled)
  return index === -1 ? 0 : index
}

function lastEnabled(options: { disabled?: boolean }[]) {
  for (let i = options.length - 1; i >= 0; i--) {
    if (!options[i].disabled) return i
  }
  return 0
}

/** Next selectable index in `dir`, wrapping and skipping disabled entries. */
function step(options: { disabled?: boolean }[], from: number, dir: 1 | -1) {
  const n = options.length
  if (n === 0) return from
  for (let i = 1; i <= n; i++) {
    const index = (((from + dir * i) % n) + n) % n
    if (!options[index].disabled) return index
  }
  return from
}

/**
 * Listbox-style select. The native control is unstyleable in Safari (and
 * renders as a system sheet on iOS), so the app draws its own.
 *
 * Focus deliberately never leaves the trigger: the menu is presentational and
 * the current option is announced via aria-activedescendant. Moving focus into
 * the popup is what the ARIA listbox pattern usually does, but it drags in
 * blur races and scroll-on-focus (Safari ignores `preventScroll`), which is
 * what made earlier versions snap shut the instant they opened.
 */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  align = 'start',
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Start from the current value each time it opens.
  useEffect(() => {
    if (!open) return
    const current = options.findIndex((o) => o.value === value)
    setActiveIndex(current >= 0 ? current : firstEnabled(options))
  }, [open, options, value])

  // Scroll the menu by hand: scrollIntoView also scrolls ancestors, including
  // the document, which is both janky and a dismissal trigger.
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    const option = list?.children[activeIndex] as HTMLElement | undefined
    if (!list || !option) return

    const top = option.offsetTop
    const bottom = top + option.offsetHeight
    if (top < list.scrollTop) {
      list.scrollTop = top
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight
    }
  }, [open, activeIndex])

  const commit = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
        event.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((i) => step(options, i, 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((i) => step(options, i, -1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(firstEnabled(options))
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(lastEnabled(options))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(activeIndex)
        break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div
      ref={rootRef}
      className={`select${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${id}-${activeIndex}` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className="select-value">{selected?.label ?? ''}</span>
        <span className="select-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={listRef}
          id={`${id}-list`}
          className={`select-menu select-menu--${align}`}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option, index) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled on the trigger, which keeps focus
            <div
              key={String(option.value)}
              id={`${id}-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              data-active={index === activeIndex}
              className={`select-option${option.value === value ? ' is-selected' : ''}${
                option.disabled ? ' is-disabled' : ''
              }`}
              // Keep the press from moving focus off the trigger.
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => commit(index)}
              onPointerEnter={() => !option.disabled && setActiveIndex(index)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
