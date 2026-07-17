import { describe, expect, it } from 'vitest'
import { formatHours } from '../src/renderer/utils/formatters'

describe('formatHours', () => {
  it('formats empty and short durations', () => {
    expect(formatHours(0)).toBe('0 h')
    expect(formatHours(45)).toBe('45 min')
  })

  it('formats full and partial hours', () => {
    expect(formatHours(120)).toBe('2 h')
    expect(formatHours(135)).toBe('2 h 15 min')
  })
})
