import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('имеет role=status и aria-busy для доступности', () => {
    render(<LoadingSpinner />)
    const el = document.querySelector('[role="status"]')
    expect(el).toBeTruthy()
    expect(el?.getAttribute('aria-busy')).toBe('true')
    expect(el?.className).toMatch(/animate-spin/)
  })

  it('применяет классы размера sm', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    expect(container.firstElementChild?.className).toMatch(/w-4 h-4/)
  })

  it('добавляет className', () => {
    const { container } = render(<LoadingSpinner className="extra-class" />)
    expect(container.firstElementChild?.className).toMatch(/extra-class/)
  })
})
