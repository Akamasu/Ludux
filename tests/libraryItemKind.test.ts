import { describe, expect, it } from 'vitest'
import { countLibraryItemKinds } from '../src/utils/libraryItemKind'

describe('library item kinds', () => {
  it('counts games separately from tools and applications', () => {
    expect(
      countLibraryItemKinds([
        { status: 'BACKLOG' },
        { status: 'PLAYING' },
        { status: 'COMPLETED' },
        { status: 'UTILITY' },
        { status: 'UTILITY' },
      ]),
    ).toEqual({
      gamesOwned: 3,
      utilitiesOwned: 2,
    })
  })
})
