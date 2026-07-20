import { describe, expect, it, vi } from 'vitest'
import {
  createSteamOwnedGamesUrl,
  fetchSteamOwnedGames,
  mergeSteamGames,
  normalizeSteamId,
  parseSteamAppManifest,
  parseSteamKeyValues,
  parseSteamLibraryFolders,
  parseSteamLocalConfigApps,
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

  it('parses local Steam library folders', () => {
    expect(
      parseSteamLibraryFolders(`
        "libraryfolders"
        {
          "0"
          {
            "path" "C:\\\\Program Files (x86)\\\\Steam"
          }
          "1"
          {
            "path" "E:\\\\SteamLibrary"
          }
        }
      `),
    ).toEqual(['C:\\Program Files (x86)\\Steam', 'E:\\SteamLibrary'])
  })

  it('preserves single backslashes in local Steam paths', () => {
    expect(
      parseSteamLibraryFolders(String.raw`
        "libraryfolders"
        {
          "0"
          {
            "path" "C:\Program Files (x86)\Steam"
          }
          "1"
          {
            "path" "E:\SteamLibrary"
          }
        }
      `),
    ).toEqual(['C:\\Program Files (x86)\\Steam', 'E:\\SteamLibrary'])
  })

  it('accepts empty values from local Steam files', () => {
    expect(
      parseSteamKeyValues(`
        "AppState"
        {
          "appid" "1245620"
          "name" "ELDEN RING"
          "UserConfig"
          {
            "language" ""
          }
        }
      `),
    ).toMatchObject({
      AppState: {
        UserConfig: {
          language: '',
        },
      },
    })
  })

  it('parses app manifests from local Steam libraries', () => {
    expect(
      parseSteamAppManifest(
        `
          "AppState"
          {
            "appid" "1245620"
            "name" "ELDEN RING"
            "installdir" "ELDEN RING"
            "LastUpdated" "1784199579"
            "LastPlayed" "1784499547"
            "SizeOnDisk" "71087081872"
            "LastOwner" "76561198299460314"
          }
        `,
        'E:\\SteamLibrary',
      ),
    ).toMatchObject({
      appid: 1245620,
      title: 'ELDEN RING',
      coverUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
      installed: true,
      installPath: 'E:\\SteamLibrary\\steamapps\\common\\ELDEN RING',
      lastPlayedAt: '2026-07-19T22:19:07.000Z',
      lastUpdatedAt: '2026-07-16T10:59:39.000Z',
      ownerSteamId: '76561198299460314',
      sizeOnDiskBytes: 71_087_081_872,
    })
  })

  it('parses local Steam app activity data', () => {
    expect(
      parseSteamLocalConfigApps(`
        "UserLocalConfigStore"
        {
          "Software"
          {
            "Valve"
            {
              "Steam"
              {
                "apps"
                {
                  "730"
                  {
                    "LastPlayed" "1764031083"
                    "Playtime" "14885"
                  }
                }
              }
            }
          }
        }
      `),
    ).toEqual([
      {
        appid: 730,
        lastPlayedAt: '2025-11-25T00:38:03.000Z',
        playtimeForeverMinutes: 14885,
      },
    ])
  })

  it('merges web API games with fresher local Steam data', () => {
    const mergedGames = mergeSteamGames(
      [
        {
          appid: 730,
          title: 'Counter-Strike 2',
          coverUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
          iconUrl: 'https://example.com/icon.jpg',
          playtimeForeverMinutes: 100,
          lastPlayedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      [
        {
          appid: 730,
          title: 'Counter-Strike 2',
          coverUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
          iconUrl: null,
          installed: true,
          installPath: 'C:\\Steam\\steamapps\\common\\Counter-Strike Global Offensive',
          lastPlayedAt: '2026-01-01T00:00:00.000Z',
          lastUpdatedAt: '2026-01-02T00:00:00.000Z',
          ownerSteamId: '76561198000000000',
          playtimeForeverMinutes: 0,
          sizeOnDiskBytes: 10,
        },
      ],
      [
        {
          appid: 730,
          lastPlayedAt: '2026-02-01T00:00:00.000Z',
          playtimeForeverMinutes: 200,
        },
      ],
    )

    expect(mergedGames).toEqual([
      expect.objectContaining({
        appid: 730,
        iconUrl: 'https://example.com/icon.jpg',
        installed: true,
        lastPlayedAt: '2026-02-01T00:00:00.000Z',
        playtimeForeverMinutes: 200,
      }),
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
