import { describe, expect, it, vi } from 'vitest'
import {
  createSteamOwnedGamesUrl,
  fetchSteamOwnedGames,
  normalizeSteamId,
  parseSteamOwnedGames,
} from '../../src/providers/steam'

describe('steam provider', () => {
  it('validates SteamID64 values', () => {
    expect(normalizeSteamId(' 76561198000000000 ')).toBe('76561198000000000')
    expect(() => normalizeSteamId('steam-user')).toThrow('SteamID64 invalide')
    expect(() => normalizeSteamId('7656119')).toThrow('SteamID64 invalide')
  })

  it('builds a GetOwnedGames URL with normalized credentials', () => {
    const url = createSteamOwnedGamesUrl(' key ', ' 76561198000000000 ')

    expect(url).toContain('/IPlayerService/GetOwnedGames/v1/')
    expect(url).toContain('key=key')
    expect(url).toContain('steamid=76561198000000000')
    expect(url).toContain('include_appinfo=1')
    expect(url).toContain('include_played_free_games=1')
  })

  it('normalizes owned games payloads', () => {
    const result = parseSteamOwnedGames({
      response: {
        game_count: 2,
        games: [
          {
            appid: 620,
            name: ' Portal 2 ',
            playtime_forever: 123.4,
            rtime_last_played: 1_700_000_000,
            img_icon_url: 'abc',
          },
          {
            appid: 10,
            playtime_forever: 20,
          },
        ],
      },
    })

    expect(result.totalCount).toBe(2)
    expect(result.games).toEqual([
      {
        appid: 620,
        title: 'Portal 2',
        coverUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/620/header.jpg',
        iconUrl:
          'https://media.steampowered.com/steamcommunity/public/images/apps/620/abc.jpg',
        playtimeForeverMinutes: 123,
        lastPlayedAt: '2023-11-14T22:13:20.000Z',
      },
    ])
  })

  it('maps Steam HTTP errors to readable messages', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 403 }))

    await expect(
      fetchSteamOwnedGames({
        apiKey: 'key',
        steamId: '76561198000000000',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow('Verifiez la cle API Steam')
  })
})
