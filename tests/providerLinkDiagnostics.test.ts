import { describe, expect, it } from 'vitest'
import {
  buildIgnoredGameProviderLink,
  buildGameProviderLink,
  resolveProviderLinkMatchStatus,
} from '../src/services/provider-link-diagnostics'

describe('provider link diagnostics', () => {
  it('accepts close source titles despite punctuation and trademark marks', () => {
    expect(
      resolveProviderLinkMatchStatus(
        'theHunter: Call of the Wild',
        'theHunter: Call of the Wild™',
      ),
    ).toBe('CONFIDENT')
  })

  it('flags distant source titles for manual review', () => {
    expect(resolveProviderLinkMatchStatus('Portal 2', 'Portal Maze 2')).toBe('REVIEW')
  })

  it('accepts a distant source title once the user confirms it', () => {
    expect(
      resolveProviderLinkMatchStatus(
        'Portal 2',
        'Portal Maze 2',
        new Date('2026-07-28T10:30:00.000Z'),
      ),
    ).toBe('CONFIDENT')
  })

  it('builds a complete provider link item', () => {
    expect(
      buildGameProviderLink('Portal 2', {
        id: 'link-1',
        provider: 'STEAM',
        externalId: '620',
        sourceTitle: 'Portal 2',
        sourceCoverUrl: 'https://example.test/portal.jpg',
        lastSyncedAt: new Date('2026-07-23T10:00:00.000Z'),
        matchConfirmedAt: null,
      }),
    ).toMatchObject({
      id: 'link-1',
      label: 'Steam',
      url: 'https://store.steampowered.com/app/620/',
      matchStatus: 'CONFIDENT',
      confirmedByUser: false,
    })
  })

  it('exposes a persistent user-confirmed provider link', () => {
    expect(
      buildGameProviderLink('Portal 2', {
        id: 'link-2',
        provider: 'UBISOFT',
        externalId: 'portal-maze-2',
        sourceTitle: 'Portal Maze 2',
        sourceCoverUrl: null,
        lastSyncedAt: null,
        matchConfirmedAt: new Date('2026-07-28T10:30:00.000Z'),
      }),
    ).toMatchObject({
      label: 'Ubisoft Connect',
      url: 'https://store.ubisoft.com/',
      matchStatus: 'CONFIDENT',
      confirmedByUser: true,
      matchReason: null,
    })
  })

  it('builds a hidden provider link item for the detail page', () => {
    expect(
      buildIgnoredGameProviderLink({
        id: 'ignored-1',
        provider: 'STEAM',
        externalId: '620',
        sourceTitle: 'Portal 2',
        createdAt: new Date('2026-07-23T11:00:00.000Z'),
      }),
    ).toMatchObject({
      id: 'ignored-1',
      label: 'Steam',
      url: 'https://store.steampowered.com/app/620/',
      createdAt: '2026-07-23T11:00:00.000Z',
    })
  })
})
