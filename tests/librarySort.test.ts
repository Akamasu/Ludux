import { describe, expect, it } from 'vitest'
import { sortLibraryItemsByTitle } from '../src/renderer/utils/librarySort'

describe('library title sorting', () => {
  it('sorts titles from A to Z without mutating the source list', () => {
    const games = [
      { title: 'Été' },
      { title: 'zelda' },
      { title: 'Alan Wake' },
      { title: 'Fallout 10' },
      { title: 'Fallout 2' },
    ]

    expect(sortLibraryItemsByTitle(games).map((game) => game.title)).toEqual([
      'Alan Wake',
      'Été',
      'Fallout 2',
      'Fallout 10',
      'zelda',
    ])
    expect(games[0]?.title).toBe('Été')
  })
})
