import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('объединяет классы и отбрасывает ложные значения', () => {
    expect(cn('px-2', false && 'hidden', 'py-1')).toBe('px-2 py-1')
  })

  it('разрешает конфликты tailwind-merge', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
