import { describe, expect, it } from 'vitest'
import {
  formatGameDescription,
  isGameDescriptionHeading,
} from '../src/renderer/utils/gameDescription'
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

describe('formatGameDescription', () => {
  it('returns no blocks for empty descriptions', () => {
    expect(formatGameDescription(null)).toEqual([])
    expect(formatGameDescription('   ')).toEqual([])
  })

  it('separates catalogue headings glued to the previous sentence', () => {
    expect(
      formatGameDescription(
        'Explore the wilderness!KEY FEATURES: Hunt alone or with friends.',
      ),
    ).toEqual([
      'Explore the wilderness!',
      'KEY FEATURES:',
      'Hunt alone or with friends.',
    ])
    expect(isGameDescriptionHeading('KEY FEATURES:')).toBe(true)
  })

  it('breaks very long catalogue blocks into readable paragraphs', () => {
    const blocks = formatGameDescription('A calm sentence. '.repeat(90))

    expect(blocks.length).toBeGreaterThan(1)
    expect(blocks.every((block) => block.length <= 620)).toBe(true)
  })
})
