import { describe, expect, it } from 'vitest'
import {
  buildIgnoredExternalGameLinkKeySet,
  hasIgnoredExternalGameLink,
} from '../src/services/provider-link-ignore'

describe('provider link ignore keys', () => {
  it('matches ignored links by game, provider and external id', () => {
    const ignoredLinks = buildIgnoredExternalGameLinkKeySet([
      {
        gameId: 'game-1',
        provider: 'STEAM',
        externalId: '620',
      },
    ])

    expect(
      hasIgnoredExternalGameLink(ignoredLinks, {
        gameId: 'game-1',
        provider: 'STEAM',
        externalId: '620',
      }),
    ).toBe(true)
  })

  it('does not ignore the same source for another local game', () => {
    const ignoredLinks = buildIgnoredExternalGameLinkKeySet([
      {
        gameId: 'game-1',
        provider: 'STEAM',
        externalId: '620',
      },
    ])

    expect(
      hasIgnoredExternalGameLink(ignoredLinks, {
        gameId: 'game-2',
        provider: 'STEAM',
        externalId: '620',
      }),
    ).toBe(false)
  })
})
