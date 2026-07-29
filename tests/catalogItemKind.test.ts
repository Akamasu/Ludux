import { describe, expect, it } from 'vitest'
import { detectCatalogItemKind } from '../src/utils/catalogItemKind'

describe('catalog item kind detection', () => {
  it('recognizes explicit Steam and Epic software metadata', () => {
    expect(detectCatalogItemKind({ applicationType: 'software' })).toBe(
      'UTILITY',
    )
    expect(detectCatalogItemKind({ categories: ['applications'] })).toBe(
      'UTILITY',
    )
  })

  it('recognizes the French Steam tools collection', () => {
    expect(
      detectCatalogItemKind({ categories: ['OUTILS & LOGICIEL'] }),
    ).toBe('UTILITY')
  })

  it('keeps explicit games separate and leaves ambiguous items unchanged', () => {
    expect(detectCatalogItemKind({ applicationType: 'game' })).toBe('GAME')
    expect(detectCatalogItemKind({ categories: ['Simulation'] })).toBe(
      'UNKNOWN',
    )
  })
})
