import { describe, expect, it } from 'vitest'
import {
  filterProvidersDueForAutoSync,
  sortConfiguredSyncProviders,
} from '../src/services/provider-sync-order'

describe('provider sync order', () => {
  it('imports library providers before metadata enrichment providers', () => {
    expect(
      sortConfiguredSyncProviders([
        'IGDB',
        'BATTLENET',
        'RAWG',
        'GOG',
        'UBISOFT',
        'EPIC',
        'EA_APP',
        'STEAM',
      ]),
    ).toEqual([
      'STEAM',
      'EPIC',
      'EA_APP',
      'UBISOFT',
      'BATTLENET',
      'GOG',
      'RAWG',
      'IGDB',
    ])
  })

  it('keeps each provider only once', () => {
    expect(
      sortConfiguredSyncProviders(['RAWG', 'STEAM', 'RAWG', 'IGDB', 'STEAM']),
    ).toEqual(['STEAM', 'RAWG', 'IGDB'])
  })

  it('skips sources that were synchronized inside the freshness interval', () => {
    const now = new Date('2026-07-26T12:00:00.000Z')

    expect(
      filterProvidersDueForAutoSync(
        ['STEAM', 'EPIC', 'RAWG'],
        [
          {
            provider: 'STEAM',
            lastSync: new Date('2026-07-26T11:30:00.000Z'),
          },
          {
            provider: 'EPIC',
            lastSync: new Date('2026-07-26T09:59:59.000Z'),
          },
        ],
        120 * 60_000,
        now,
      ),
    ).toEqual(['EPIC', 'RAWG'])
  })

  it('uses the newest successful timestamp for each source', () => {
    const now = new Date('2026-07-26T12:00:00.000Z')

    expect(
      filterProvidersDueForAutoSync(
        ['STEAM'],
        [
          {
            provider: 'STEAM',
            lastSync: new Date('2026-07-26T08:00:00.000Z'),
          },
          {
            provider: 'STEAM',
            lastSync: new Date('2026-07-26T11:45:00.000Z'),
          },
        ],
        120 * 60_000,
        now,
      ),
    ).toEqual([])
  })
})
