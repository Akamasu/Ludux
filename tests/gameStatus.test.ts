import { describe, expect, it } from 'vitest'
import {
  GAME_STATUS_LABELS,
  GAME_STATUS_VALUES,
} from '../src/types/game'

describe('game statuses', () => {
  it('exposes the utility status with its French label', () => {
    expect(GAME_STATUS_VALUES).toContain('UTILITY')
    expect(GAME_STATUS_LABELS.UTILITY).toBe('Outil / application')
  })
})
