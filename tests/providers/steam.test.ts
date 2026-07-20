import { describe, expect, it, vi } from 'vitest'
import {
  createSteamAppDetailsUrl,
  createSteamAchievementSchemaUrl,
  createSteamDlcForAppUrl,
  createSteamOwnedGamesUrl,
  createSteamPlayerAchievementsUrl,
  fetchSteamAppDetails,
  fetchSteamAchievements,
  fetchSteamOwnedGames,
  fetchSteamDlcCatalog,
  hasDatedSteamPlaytime,
  mergeSteamAchievements,
  mergeSteamAppDetails,
  mergeSteamGames,
  normalizeSteamId,
  parseSteamAppDetails,
  parseSteamAppManifest,
  parseSteamAchievementSchema,
  parseSteamDlcForApp,
  parseSteamKeyValues,
  parseSteamLocalAppCategories,
  parseSteamLibraryFolders,
  parseSteamLocalConfigApps,
  parseSteamOwnedGames,
  parseSteamPlayerAchievements,
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

  it('builds a Steam Store appdetails URL', () => {
    const url = createSteamAppDetailsUrl(620)

    expect(url).toContain('/api/appdetails')
    expect(url).toContain('appids=620')
    expect(url).toContain('filters=basic')
    expect(url).toContain('short_description')
    expect(url).toContain('release_date')
    expect(url).toContain('dlc')
    expect(url).toContain('l=french')
  })

  it('builds a Steam Store DLC catalog URL', () => {
    const url = createSteamDlcForAppUrl(620)

    expect(url).toContain('/api/dlcforapp/')
    expect(url).toContain('appid=620')
    expect(url).toContain('l=french')
    expect(url).toContain('cc=FR')
  })

  it('builds Steam achievements URLs with normalized credentials', () => {
    const schemaUrl = createSteamAchievementSchemaUrl(' key ', 620)
    const playerUrl = createSteamPlayerAchievementsUrl(
      ' key ',
      ' 76561198000000000 ',
      620,
    )

    expect(schemaUrl).toContain('/ISteamUserStats/GetSchemaForGame/v2/')
    expect(schemaUrl).toContain('key=key')
    expect(schemaUrl).toContain('appid=620')
    expect(schemaUrl).toContain('l=french')
    expect(playerUrl).toContain('/ISteamUserStats/GetPlayerAchievements/v1/')
    expect(playerUrl).toContain('steamid=76561198000000000')
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

  it('normalizes Steam Store appdetails payloads', () => {
    expect(
      parseSteamAppDetails({
        '620': {
          success: true,
          data: {
            name: 'Portal 2',
            header_image: 'https://shared.akamai.steamstatic.com/header.jpg',
            short_description: 'Un jeu de puzzle en cooperation.',
            developers: ['Valve Software'],
            publishers: ['Valve'],
            website: 'https://www.thinkwithportals.com/',
            dlc: [1234, '5678'],
            release_date: {
              date: 'Apr 18, 2011',
            },
          },
        },
        '10': {
          success: false,
        },
      }),
    ).toEqual([
      {
        appid: 620,
        title: 'Portal 2',
        coverUrl: 'https://shared.akamai.steamstatic.com/header.jpg',
        description: 'Un jeu de puzzle en cooperation.',
        developer: 'Valve Software',
        dlcAppIds: [1234, 5678],
        publisher: 'Valve',
        releaseDate: '2011-04-18T00:00:00.000Z',
        website: 'https://www.thinkwithportals.com/',
      },
    ])
  })

  it('normalizes Steam Store DLC catalog payloads', () => {
    expect(
      parseSteamDlcForApp({
        status: 1,
        dlc: [
          {
            id: 1234,
            name: 'Portal 2 - Test Chambers',
            header_image: 'https://shared.akamai.steamstatic.com/dlc.jpg',
            description: '<p>Nouvelles salles de test.</p>',
            release_date: 'May 1, 2011',
          },
        ],
      }),
    ).toEqual([
      {
        appid: 1234,
        title: 'Portal 2 - Test Chambers',
        coverUrl: 'https://shared.akamai.steamstatic.com/dlc.jpg',
        description: 'Nouvelles salles de test.',
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: '2011-05-01T00:00:00.000Z',
        website: null,
      },
    ])
  })

  it('replaces legacy Steam cover URLs with Steam Store details', () => {
    expect(
      mergeSteamAppDetails(
        [
          {
            appid: 620,
            title: 'Portal 2',
            coverUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/620/header.jpg',
            iconUrl: null,
            playtimeForeverMinutes: 0,
            lastPlayedAt: null,
          },
        ],
        [
          {
            appid: 620,
            title: 'Portal 2',
            coverUrl: 'https://shared.akamai.steamstatic.com/header.jpg',
            description: null,
            developer: null,
            dlcAppIds: [],
            publisher: null,
            releaseDate: null,
            website: null,
          },
        ],
      ),
    ).toEqual([
      expect.objectContaining({
        appid: 620,
        coverUrl: 'https://shared.akamai.steamstatic.com/header.jpg',
      }),
    ])
  })

  it('normalizes and merges Steam achievements', () => {
    const schemaAchievements = parseSteamAchievementSchema({
      game: {
        availableGameStats: {
          achievements: [
            {
              name: 'ACH_WIN_ONE_GAME',
              displayName: 'Gagner une partie',
              description: 'Terminer une partie complete.',
              icon: 'https://example.com/icon.jpg',
            },
          ],
        },
      },
    })
    const playerAchievements = parseSteamPlayerAchievements({
      playerstats: {
        success: true,
        achievements: [
          {
            apiname: 'ACH_WIN_ONE_GAME',
            achieved: 1,
            unlocktime: 1_700_000_000,
          },
        ],
      },
    })

    expect(mergeSteamAchievements(schemaAchievements, playerAchievements)).toEqual([
      {
        externalId: 'ACH_WIN_ONE_GAME',
        name: 'Gagner une partie',
        description: 'Terminer une partie complete.',
        iconUrl: 'https://example.com/icon.jpg',
        unlocked: true,
        unlockDate: '2023-11-14T22:13:20.000Z',
      },
    ])
  })

  it('requires a Steam last played date before creating a dated play session', () => {
    expect(
      hasDatedSteamPlaytime({
        lastPlayedAt: '2026-07-19T22:19:07.000Z',
        playtimeForeverMinutes: 120,
      }),
    ).toBe(true)

    expect(
      hasDatedSteamPlaytime({
        lastPlayedAt: null,
        playtimeForeverMinutes: 120,
      }),
    ).toBe(false)

    expect(
      hasDatedSteamPlaytime({
        lastPlayedAt: '2026-07-19T22:19:07.000Z',
        playtimeForeverMinutes: 0,
      }),
    ).toBe(false)
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
      lastPlayedAt: null,
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

  it('parses Steam library categories from shared config', () => {
    expect(
      parseSteamLocalAppCategories(`
        "UserRoamingConfigStore"
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
                    "tags"
                    {
                      "0" "FPS"
                      "1" "Soirees"
                    }
                  }
                  "620"
                  {
                    "tags"
                    {
                      "0" "Puzzle"
                    }
                  }
                }
              }
            }
          }
        }
      `),
    ).toEqual([
      {
        appid: 620,
        categories: ['Puzzle'],
      },
      {
        appid: 730,
        categories: ['FPS', 'Soirees'],
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
      [
        {
          appid: 730,
          categories: ['FPS', 'Soirees'],
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
        categories: ['FPS', 'Soirees'],
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
    ).rejects.toThrow('Vérifiez la clé API Steam')
  })

  it('fetches Steam Store appdetails', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            '620': {
              success: true,
              data: {
                name: 'Portal 2',
                header_image: 'https://shared.akamai.steamstatic.com/header.jpg',
                dlc: [],
              },
            },
          }),
        ),
    )

    await expect(
      fetchSteamAppDetails({
        appids: [620],
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toEqual([
      {
        appid: 620,
        title: 'Portal 2',
        coverUrl: 'https://shared.akamai.steamstatic.com/header.jpg',
        description: null,
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: null,
        website: null,
      },
    ])
  })

  it('prefers the Steam DLC catalog endpoint before Store fallback', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toContain('/api/dlcforapp/')

      return new Response(
        JSON.stringify({
          status: 1,
          dlc: [
            {
              id: 1234,
              name: 'Portal 2 - Test Chambers',
              header_image: 'https://shared.akamai.steamstatic.com/dlc.jpg',
              description: '<p>Nouvelles salles de test.</p>',
              release_date: 'May 1, 2011',
            },
          ],
        }),
      )
    })

    await expect(
      fetchSteamDlcCatalog({
        appid: 620,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toEqual([
      {
        appid: 1234,
        title: 'Portal 2 - Test Chambers',
        coverUrl: 'https://shared.akamai.steamstatic.com/dlc.jpg',
        description: 'Nouvelles salles de test.',
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: '2011-05-01T00:00:00.000Z',
        website: null,
      },
    ])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('fetches a Steam DLC catalog with partial detail fallback', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const urlValue = String(url)

      if (urlValue.includes('appids=620')) {
        return new Response(
          JSON.stringify({
            '620': {
              success: true,
              data: {
                name: 'Portal 2',
                dlc: [1234, 5678],
              },
            },
          }),
        )
      }

      if (urlValue.includes('appids=1234')) {
        return new Response(
          JSON.stringify({
            '1234': {
              success: true,
              data: {
                name: 'Portal 2 - Test Chambers',
                header_image: 'https://shared.akamai.steamstatic.com/dlc.jpg',
                release_date: {
                  date: 'May 1, 2011',
                },
              },
            },
          }),
        )
      }

      return new Response(null, { status: 500 })
    })

    await expect(
      fetchSteamDlcCatalog({
        appid: 620,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toEqual([
      {
        appid: 1234,
        title: 'Portal 2 - Test Chambers',
        coverUrl: 'https://shared.akamai.steamstatic.com/dlc.jpg',
        description: null,
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: '2011-05-01T00:00:00.000Z',
        website: null,
      },
      {
        appid: 5678,
        title: 'Steam DLC 5678',
        coverUrl: null,
        description: null,
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: null,
        website: null,
      },
    ])
  })

  it('fetches Steam achievements from schema and player endpoints', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const urlValue = String(url)

      if (urlValue.includes('GetSchemaForGame')) {
        return new Response(
          JSON.stringify({
            game: {
              availableGameStats: {
                achievements: [
                  {
                    name: 'ACH_WIN_ONE_GAME',
                    displayName: 'Gagner une partie',
                    description: 'Terminer une partie complete.',
                    icon: 'https://example.com/icon.jpg',
                  },
                ],
              },
            },
          }),
        )
      }

      return new Response(
        JSON.stringify({
          playerstats: {
            success: true,
            achievements: [
              {
                apiname: 'ACH_WIN_ONE_GAME',
                achieved: 1,
                unlocktime: 1_700_000_000,
              },
            ],
          },
        }),
      )
    })

    await expect(
      fetchSteamAchievements({
        apiKey: 'key',
        appid: 620,
        steamId: '76561198000000000',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        externalId: 'ACH_WIN_ONE_GAME',
        name: 'Gagner une partie',
        unlocked: true,
      }),
    ])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('keeps Steam achievement schema when player achievements are unavailable', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const urlValue = String(url)

      if (urlValue.includes('GetPlayerAchievements')) {
        return new Response(null, { status: 403 })
      }

      return new Response(
        JSON.stringify({
          game: {
            availableGameStats: {
              achievements: [
                {
                  name: 'ACH_WIN_ONE_GAME',
                  displayName: 'Gagner une partie',
                },
              ],
            },
          },
        }),
      )
    })

    await expect(
      fetchSteamAchievements({
        apiKey: 'key',
        appid: 620,
        steamId: '76561198000000000',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        externalId: 'ACH_WIN_ONE_GAME',
        unlocked: false,
      }),
    ])
  })
})
