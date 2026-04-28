import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import HomePage from './HomePage'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}))

function renderHome() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('HomePage (лендинг)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          quote: { text: 'Тестовая цитата для UI', author: 'Автор теста' },
        }),
      }),
    )
  })

  it('показывает главный заголовок и блок возможностей', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 1, name: /Tournament Manager/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Возможности платформы/i })).toBeInTheDocument()
  })

  it('показывает секцию форматов турниров', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: /Поддерживаемые форматы/i })).toBeInTheDocument()
    expect(screen.getByText(/Single Elimination/i)).toBeInTheDocument()
  })

  it('после загрузки цитаты показывает текст и автора', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Тестовая цитата для UI/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Автор теста/i)).toBeInTheDocument()
  })

  it('при ошибке fetch показывает сообщение об ошибке', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Не удалось загрузить цитату/i)).toBeInTheDocument()
    })
  })
})
