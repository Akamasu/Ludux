import { describe, expect, it } from 'vitest'
import { buildProviderSyncActivity } from '../src/services/provider-sync-activity'
import type { ExternalProviderDefinition } from '../src/types/settings'

const providers: ExternalProviderDefinition[] = [
  {
    provider: 'EPIC',
    label: 'Epic Games',
    description: 'Epic',
    capabilities: [],
  },
  {
    provider: 'STEAM',
    label: 'Steam',
    description: 'Steam',
    capabilities: [],
  },
]

function syncRecord({
  id,
  provider,
  status,
  updatedAt,
}: {
  id: string
  provider: string
  status: string
  updatedAt: string
}) {
  const date = new Date(updatedAt)

  return {
    id,
    provider,
    status,
    message: `${provider} ${status}`,
    lastSync: status === 'SYNCED' ? date : null,
    createdAt: date,
    updatedAt: date,
  }
}

describe('provider sync activity', () => {
  it('hides stale running events when a newer final state exists', () => {
    const activity = buildProviderSyncActivity(
      [
        syncRecord({
          id: 'epic-done',
          provider: 'EPIC',
          status: 'SYNCED',
          updatedAt: '2026-07-22T17:37:20.000Z',
        }),
        syncRecord({
          id: 'epic-start',
          provider: 'EPIC',
          status: 'SYNCING',
          updatedAt: '2026-07-22T17:37:00.000Z',
        }),
      ],
      providers,
    )

    expect(activity).toHaveLength(1)
    expect(activity[0]).toMatchObject({
      id: 'epic-done',
      providerLabel: 'Epic Games',
      status: 'SYNCED',
    })
  })

  it('prefers a final state over a running event at the same timestamp', () => {
    const timestamp = '2026-07-22T17:37:00.000Z'
    const activity = buildProviderSyncActivity(
      [
        syncRecord({
          id: 'epic-start',
          provider: 'EPIC',
          status: 'SYNCING',
          updatedAt: timestamp,
        }),
        syncRecord({
          id: 'epic-done',
          provider: 'EPIC',
          status: 'SYNCED',
          updatedAt: timestamp,
        }),
      ],
      providers,
    )

    expect(activity.map((item) => item.id)).toEqual(['epic-done'])
  })

  it('keeps the current running event when it is the latest provider state', () => {
    const activity = buildProviderSyncActivity(
      [
        syncRecord({
          id: 'steam-start',
          provider: 'STEAM',
          status: 'SYNCING',
          updatedAt: '2026-07-22T17:38:00.000Z',
        }),
        syncRecord({
          id: 'steam-done',
          provider: 'STEAM',
          status: 'SYNCED',
          updatedAt: '2026-07-22T17:37:00.000Z',
        }),
      ],
      providers,
    )

    expect(activity.map((item) => item.id)).toEqual(['steam-start', 'steam-done'])
  })
})
