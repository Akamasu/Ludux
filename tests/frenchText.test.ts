import { describe, expect, it } from 'vitest'
import {
  isLikelyEnglishText,
  isLikelyFrenchText,
  shouldPreferFrenchText,
} from '../src/utils/frenchText'

describe('french text helpers', () => {
  it('detects common French and English catalogue descriptions', () => {
    expect(
      isLikelyFrenchText(
        'Explorez un monde ouvert avec des joueurs et découvrez votre aventure.',
      ),
    ).toBe(true)
    expect(
      isLikelyEnglishText(
        'Explore a beautiful open world with players and your friends.',
      ),
    ).toBe(true)
  })

  it('prefers a French candidate over an English description', () => {
    expect(
      shouldPreferFrenchText(
        'Explore a beautiful open world with players and your friends.',
        'Explorez un monde ouvert avec des joueurs et votre équipe.',
      ),
    ).toBe(true)
    expect(
      shouldPreferFrenchText(
        'Explorez déjà un monde ouvert avec des joueurs.',
        'Explorez un monde ouvert avec des joueurs et votre équipe.',
      ),
    ).toBe(false)
  })
})
