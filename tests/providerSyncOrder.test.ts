import { describe, expect, it } from 'vitest'
import { sortConfiguredSyncProviders } from '../src/services/provider-sync-order'

describe('provider sync order', () => {
  it('imports library providers before metadata enrichment providers', () => {
    expect(
      sortConfiguredSyncProviders(['IGDB', 'RAWG', 'GOG', 'EPIC', 'STEAM']),
    ).toEqual(['STEAM', 'EPIC', 'GOG', 'RAWG', 'IGDB'])
  })

  it('keeps each provider only once', () => {
    expect(
      sortConfiguredSyncProviders(['RAWG', 'STEAM', 'RAWG', 'IGDB', 'STEAM']),
    ).toEqual(['STEAM', 'RAWG', 'IGDB'])
  })
})
