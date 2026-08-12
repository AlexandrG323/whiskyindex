import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

interface IconMenuProps<T extends string> {
  icon: ReactNode
  ariaLabel: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  align?: 'start' | 'end'
}

/**
 * Icon button that opens a small single-choice menu. Shares the `.select-*`
 * styling so it reads as the same control family as Select, but its trigger is
 * an icon rather than the current value.
 */
export function IconMenu<T extends string>({
  icon,
  ariaLabel,
  value,
  options,
  onChange,
  align = 'end',
}: IconMenuProps<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const current = options.findIndex((o) => o.value === value)
    setActiveIndex(current >= 0 ? current : 0)
  }, [open, options, value])

  const commit = (index: number) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
  }

  // Focus stays on the trigger — see the note in Select.tsx.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((i) => (i + 1) % options.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((i) => (i - 1 + options.length) % options.length)
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
    <div ref={rootRef} className={`icon-menu${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="icon-btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${id}-${activeIndex}` : undefined}
        title={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        {icon}
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
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={option.value === value}
              data-active={index === activeIndex}
              className={`select-option${option.value === value ? ' is-selected' : ''}`}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => commit(index)}
              onPointerEnter={() => setActiveIndex(index)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
