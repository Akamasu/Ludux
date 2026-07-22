import { describe, expect, it } from 'vitest'
import {
  createSteamDlcDisplayName,
  filterSteamDlcCatalogDuplicates,
  findMergeableSteamDlc,
  hasResolvedSteamDlcName,
  isSteamDlcFallbackName,
  mergeSteamDlcBundleDuplicates,
} from '../src/services/steam-dlc.service'

describe('steam DLC helpers', () => {
  it('recognizes unresolved Steam DLC fallback names', () => {
    expect(isSteamDlcFallbackName('Steam DLC 2778590')).toBe(true)
    expect(isSteamDlcFallbackName('Steam DLC 2778590', 2778590)).toBe(true)
    expect(isSteamDlcFallbackName('Steam DLC 2778590', 2778580)).toBe(false)
    expect(isSteamDlcFallbackName('ELDEN RING Shadow of the Erdtree')).toBe(false)
  })

  it('keeps a fallback display name only when Steam has no title', () => {
    expect(
      createSteamDlcDisplayName({
        appid: 2778590,
        title: null,
        coverUrl: null,
        description: null,
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: null,
        website: null,
      }),
    ).toBe('Steam DLC 2778590')
    expect(
      hasResolvedSteamDlcName({
        appid: 2778590,
        title: 'Steam DLC 2778590',
        coverUrl: null,
        description: null,
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: null,
        website: null,
      }),
    ).toBe(false)
  })

  it('matches existing fallback DLCs to resolved Steam catalog entries', () => {
    expect(
      findMergeableSteamDlc(
        [
          {
            id: 'dlc-1',
            name: 'Steam DLC 2778590',
            provider: 'STEAM',
            externalId: '2778590',
          },
        ],
        {
          appid: 2778590,
          title: 'ELDEN RING Shadow of the Erdtree Premium Bundle',
          coverUrl: null,
          description: null,
          developer: null,
          dlcAppIds: [],
          publisher: null,
          releaseDate: null,
          website: null,
        },
      )?.id,
    ).toBe('dlc-1')
  })

  it('filters premium bundle duplicates from Steam DLC catalogs', () => {
    const catalog = [
      {
        appid: 2778580,
        title: 'ELDEN RING Shadow of the Erdtree',
        coverUrl: null,
        description: null,
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: null,
        website: null,
      },
      {
        appid: 2778590,
        title: 'ELDEN RING Shadow of the Erdtree Premium Bundle',
        coverUrl: null,
        description: null,
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: null,
        website: null,
      },
    ]

    expect(filterSteamDlcCatalogDuplicates(catalog).map((dlc) => dlc.appid)).toEqual([
      2778580,
    ])
  })

  it('merges visible bundle duplicates into the base DLC item', () => {
    expect(
      mergeSteamDlcBundleDuplicates([
        {
          name: 'ELDEN RING Shadow of the Erdtree',
          owned: false,
          completed: false,
          releaseDate: null,
        },
        {
          name: 'ELDEN RING Shadow of the Erdtree Premium Bundle',
          owned: true,
          completed: false,
          releaseDate: '2024-06-20T22:00:29.000Z',
        },
      ]),
    ).toEqual([
      {
        name: 'ELDEN RING Shadow of the Erdtree',
        owned: true,
        completed: false,
        releaseDate: '2024-06-20T22:00:29.000Z',
      },
    ])
  })
})
