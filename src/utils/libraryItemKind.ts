import type { GameStatus } from '../types/game'

export function isUtilityStatus(status: GameStatus) {
  return status === 'UTILITY'
}

export function countLibraryItemKinds(
  items: Array<{ status: GameStatus }>,
) {
  let gamesOwned = 0
  let utilitiesOwned = 0

  for (const item of items) {
    if (isUtilityStatus(item.status)) {
      utilitiesOwned += 1
    } else {
      gamesOwned += 1
    }
  }

  return {
    gamesOwned,
    utilitiesOwned,
  }
}
