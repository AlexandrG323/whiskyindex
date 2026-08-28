import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'

function renderSidebar(path = '/', currency: 'rub' | 'usd' = 'rub') {
  const onCurrencyChange = vi.fn()
  const onClose = vi.fn()
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar
        open={false}
        onClose={onClose}
        currency={currency}
        onCurrencyChange={onCurrencyChange}
      />
    </MemoryRouter>,
  )
  return { onCurrencyChange, onClose }
}

describe('Sidebar', () => {
  it('renders the section links with the expected paths', () => {
    renderSidebar()

    expect(screen.getByRole('link', { name: /главная/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /корзина скуфа/i })).toHaveAttribute('href', '/cart')
    expect(screen.getByRole('link', { name: /акции/i })).toHaveAttribute('href', '/stocks')
    expect(screen.getByRole('link', { name: /сравнение/i })).toHaveAttribute('href', '/compare')
    expect(screen.getByRole('link', { name: /о проекте/i })).toHaveAttribute('href', '/about')
  })

  it('marks the current route active and does not treat home as a prefix match', () => {
    renderSidebar('/cart')

    expect(screen.getByRole('link', { name: /корзина скуфа/i })).toHaveClass('active')
    expect(screen.getByRole('link', { name: /главная/i })).not.toHaveClass('active')
  })

  it('presses the selected currency and reports a switch', async () => {
    const user = userEvent.setup()
    const { onCurrencyChange } = renderSidebar('/', 'rub')

    expect(screen.getByRole('button', { name: /rub/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /usd/i })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: /usd/i }))
    expect(onCurrencyChange).toHaveBeenCalledWith('usd')
  })
})
