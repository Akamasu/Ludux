import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createEpicCandidateLibraryPaths,
  createGogCandidateLibraryPaths,
  detectBattleNetLocalPlatform,
  detectEaAppLocalPlatform,
  detectEpicLocalPlatform,
  detectGogLocalPlatform,
  parseEaInstallRegistry,
  parseEpicLauncherCacheFile,
  parseEpicLauncherInstalledDatabase,
  parseEpicManagedApp,
  parseEpicManifest,
  parseBattleNetConfig,
  parseGogGalaxyAchievementRows,
  parseGogGalaxyDlcRows,
  parseGogGalaxyLibraryRows,
  parseGogGameInfo,
  parseGogRegistryGames,
  parseUbisoftInstallRegistry,
  readBattleNetLocalLibrary,
  readEaAppLocalLibrary,
  readEpicLocalLibrary,
  readGogLocalLibrary,
} from '../../src/providers/local-platforms'

const originalAppData = process.env['APPDATA']
const originalProgramData = process.env['PROGRAMDATA']
const originalLocalAppData = process.env['LOCALAPPDATA']
const originalEpicManifestPaths = process.env['LUDUX_EPIC_MANIFEST_PATHS']
const originalEpicLibraryPaths = process.env['LUDUX_EPIC_LIBRARY_PATHS']
const originalEpicManagedAppPaths = process.env['LUDUX_EPIC_MANAGED_APP_PATHS']
const originalEpicWebcachePaths = process.env['LUDUX_EPIC_WEBCACHE_PATHS']
const originalGogDbPath = process.env['LUDUX_GOG_GALAXY_DB_PATH']
const originalGogLibraryPaths = process.env['LUDUX_GOG_LIBRARY_PATHS']
const originalGogRegistryPaths = process.env['LUDUX_GOG_REGISTRY_PATHS']
const originalEaAppPaths = process.env['LUDUX_EA_APP_PATHS']
const originalEaLibraryPaths = process.env['LUDUX_EA_LIBRARY_PATHS']
const originalEaRegistryPaths = process.env['LUDUX_EA_REGISTRY_PATHS']
const originalBattleNetPaths = process.env['LUDUX_BATTLENET_PATHS']
const originalBattleNetLibraryPaths =
  process.env['LUDUX_BATTLENET_LIBRARY_PATHS']
const tempRoots: string[] = []

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

async function createTempRoot() {
  const root = await mkdtemp(join(tmpdir(), 'ludux-platforms-'))
  tempRoots.push(root)
  return root
}

function createEpicCacheField(field: string, value: Buffer | string | true) {
  const marker = Buffer.concat([
    Buffer.from([0x22, Buffer.byteLength(field)]),
    Buffer.from(field),
  ])

  if (value === true) {
    return Buffer.concat([marker, Buffer.from('T')])
  }

  if (Buffer.isBuffer(value)) {
    return Buffer.concat([marker, value])
  }

  const text = Buffer.from(value, 'utf8')

  return Buffer.concat([marker, Buffer.from([text.byteLength]), text])
}

function createEpicCacheRecord(fields: Array<[string, Buffer | string | true]>) {
  return Buffer.concat(fields.map(([field, value]) => createEpicCacheField(field, value)))
}

afterEach(async () => {
  restoreEnv('APPDATA', originalAppData)
  restoreEnv('PROGRAMDATA', originalProgramData)
  restoreEnv('LOCALAPPDATA', originalLocalAppData)
  restoreEnv('LUDUX_EPIC_MANIFEST_PATHS', originalEpicManifestPaths)
  restoreEnv('LUDUX_EPIC_LIBRARY_PATHS', originalEpicLibraryPaths)
  restoreEnv('LUDUX_EPIC_MANAGED_APP_PATHS', originalEpicManagedAppPaths)
  restoreEnv('LUDUX_EPIC_WEBCACHE_PATHS', originalEpicWebcachePaths)
  restoreEnv('LUDUX_GOG_GALAXY_DB_PATH', originalGogDbPath)
  restoreEnv('LUDUX_GOG_LIBRARY_PATHS', originalGogLibraryPaths)
  restoreEnv('LUDUX_GOG_REGISTRY_PATHS', originalGogRegistryPaths)
  restoreEnv('LUDUX_EA_APP_PATHS', originalEaAppPaths)
  restoreEnv('LUDUX_EA_LIBRARY_PATHS', originalEaLibraryPaths)
  restoreEnv('LUDUX_EA_REGISTRY_PATHS', originalEaRegistryPaths)
  restoreEnv('LUDUX_BATTLENET_PATHS', originalBattleNetPaths)
  restoreEnv(
    'LUDUX_BATTLENET_LIBRARY_PATHS',
    originalBattleNetLibraryPaths,
  )

  await Promise.all(
    tempRoots.splice(0).map((root) =>
      rm(root, {
        force: true,
        recursive: true,
      }),
    ),
  )
})

describe('local platform detection', () => {
  it('includes configured Epic library roots in local detection', async () => {
    const root = await createTempRoot()
    const epicLibrary = join(root, 'Epic Games')
    await mkdir(epicLibrary, {
      recursive: true,
    })
    process.env['PROGRAMDATA'] = root
    process.env['LOCALAPPDATA'] = root
    process.env['LUDUX_EPIC_LIBRARY_PATHS'] = epicLibrary
    process.env['LUDUX_EPIC_MANIFEST_PATHS'] = ''
    process.env['LUDUX_EPIC_MANAGED_APP_PATHS'] = ''
    process.env['LUDUX_EPIC_WEBCACHE_PATHS'] = ''

    const library = await readEpicLocalLibrary()

    expect(library.libraryPaths).toContain(epicLibrary)

    const detection = await detectEpicLocalPlatform()

    expect(detection).toMatchObject({
      provider: 'EPIC',
      detected: true,
      manifestCount: 0,
    })
    expect(detection.libraryPaths).toContain(epicLibrary)
  })

  it('creates broad Windows candidates for GOG libraries', () => {
    process.env['LUDUX_GOG_LIBRARY_PATHS'] = 'X:\\Custom GOG'

    const paths = createGogCandidateLibraryPaths()

    expect(paths).toContain('X:\\Custom GOG')

    if (process.platform === 'win32') {
      expect(paths).toContain('E:\\GOG Games')
      expect(paths).toContain('E:\\Games\\GOG Galaxy')
    }
  })

  it('creates configurable Epic library candidates', () => {
    process.env['LUDUX_EPIC_LIBRARY_PATHS'] = 'X:\\Epic'

    const paths = createEpicCandidateLibraryPaths()

    expect(paths).toContain('X:\\Epic')

    if (process.platform === 'win32') {
      expect(paths).toContain('E:\\Epic Games')
      expect(paths).toContain('E:\\Games\\Epic')
    }
  })

  it('parses Epic manifests into installed games', () => {
    expect(
      parseEpicManifest(
        JSON.stringify({
          AppName: 'AlanWake2',
          CatalogItemId: 'catalog-alan-wake-2',
          DisplayName: 'Alan Wake 2',
          InstallLocation: 'D:\\Epic\\AlanWake2',
        }),
        'C:\\ProgramData\\Epic\\manifest.item',
      ),
    ).toEqual({
      acquiredAt: null,
      coverUrl: null,
      externalId: 'catalog-alan-wake-2',
      installPath: 'D:\\Epic\\AlanWake2',
      manifestPath: 'C:\\ProgramData\\Epic\\manifest.item',
      source: 'manifest',
      title: 'Alan Wake 2',
    })
  })

  it('parses the Epic launcher installed database', () => {
    expect(
      parseEpicLauncherInstalledDatabase(
        JSON.stringify({
          InstallationList: [
            {
              AppName: 'AlanWake2',
              CatalogItemId: 'catalog-alan-wake-2',
              DisplayName: 'Alan Wake 2',
              InstallLocation: 'D:\\Epic\\AlanWake2',
            },
          ],
        }),
        'C:\\ProgramData\\Epic\\LauncherInstalled.dat',
      ),
    ).toEqual([
      expect.objectContaining({
        externalId: 'catalog-alan-wake-2',
        installPath: 'D:\\Epic\\AlanWake2',
        source: 'launcher-installation',
        title: 'Alan Wake 2',
      }),
    ])
  })

  it('parses Epic managed app files with clean third-party titles', () => {
    expect(
      parseEpicManagedApp(
        JSON.stringify({
          AppName: 'StarWarsBattlefrontII',
          CatalogID: 'catalog-star-wars-battlefront-2',
          Title: 'STAR WARS™ Battlefront™ II: Celebration Edition',
        }),
        'C:\\ProgramData\\Epic\\ThirPartyManagedApps\\battlefront.json',
      ),
    ).toEqual(
      expect.objectContaining({
        externalId: 'catalog-star-wars-battlefront-2',
        source: 'managed-app',
        title: 'STAR WARS™ Battlefront™ II: Celebration Edition',
      }),
    )
  })

  it('reads UTF-16 Epic managed app files from local detection', async () => {
    const root = await createTempRoot()
    const managedAppDirectory = join(
      root,
      'Epic',
      'EpicGamesLauncher',
      'Data',
      'ThirPartyManagedApps',
    )
    await mkdir(managedAppDirectory, {
      recursive: true,
    })
    await writeFile(
      join(managedAppDirectory, 'sims.json'),
      Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from(
          JSON.stringify({
            AppName: 'huddle',
            CatalogID: 'catalog-sims-4',
            Title: 'Les Sims™ 4',
          }),
          'utf16le',
        ),
      ]),
    )
    process.env['PROGRAMDATA'] = root
    process.env['LOCALAPPDATA'] = root
    process.env['LUDUX_EPIC_MANIFEST_PATHS'] = ''
    process.env['LUDUX_EPIC_MANAGED_APP_PATHS'] = ''
    process.env['LUDUX_EPIC_WEBCACHE_PATHS'] = ''

    await expect(readEpicLocalLibrary()).resolves.toMatchObject({
      games: [
        expect.objectContaining({
          externalId: 'catalog-sims-4',
          source: 'managed-app',
          title: 'Les Sims™ 4',
        }),
      ],
      manifestCount: 1,
    })
  })

  it('parses owned Epic games from the launcher webcache', () => {
    const cache = createEpicCacheRecord([
      ['catalogItemId', 'catalog-alan-wake-2'],
      ['namespace', 'remedy'],
      ['appName', 'AlanWake2'],
      ['acquisitionDate', '2024-01-02T00:00:00.000Z'],
      ['title', 'Alan Wake 2'],
      ['url', 'https://cdn1.epicgames.com/alan-wide.jpg'],
      ['url', 'https://cdn1.epicgames.com/alan-tall-1200x1600.jpg'],
      ['path', 'store'],
      ['path', 'games'],
      ['owned', true],
    ])

    expect(parseEpicLauncherCacheFile(cache, 'webcache')).toEqual([
      expect.objectContaining({
        acquiredAt: '2024-01-02T00:00:00.000Z',
        coverUrl: 'https://cdn1.epicgames.com/alan-tall-1200x1600.jpg',
        externalId: 'catalog-alan-wake-2',
        source: 'launcher-cache',
        title: 'Alan Wake 2',
      }),
    ])
  })

  it('ignores Epic cache entries that are add-ons instead of games', () => {
    const cache = createEpicCacheRecord([
      ['catalogItemId', 'ark-crystal-isles'],
      ['namespace', 'ark'],
      ['appName', 'ArkCrystalIslesDLC'],
      ['title', 'ARK: Crystal Isles Expansion Map'],
      ['path', 'store'],
      ['path', 'games'],
      ['path', 'addons'],
      ['owned', true],
    ])

    expect(parseEpicLauncherCacheFile(cache, 'webcache')).toEqual([])
  })

  it('detects Epic manifests and install locations', async () => {
    const root = await createTempRoot()
    const manifestDirectory = join(root, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests')
    const installLocation = join(root, 'Games', 'Epic', 'Alan Wake 2')
    await mkdir(manifestDirectory, {
      recursive: true,
    })
    await writeFile(
      join(manifestDirectory, 'alanwake2.item'),
      JSON.stringify({
        DisplayName: 'Alan Wake 2',
        InstallLocation: installLocation,
      }),
    )
    process.env['PROGRAMDATA'] = root
    process.env['LOCALAPPDATA'] = root
    process.env['LUDUX_EPIC_MANIFEST_PATHS'] = ''
    process.env['LUDUX_EPIC_MANAGED_APP_PATHS'] = ''
    process.env['LUDUX_EPIC_WEBCACHE_PATHS'] = ''

    const detection = await detectEpicLocalPlatform()

    expect(detection).toMatchObject({
      provider: 'EPIC',
      detected: true,
      manifestCount: 1,
      rootPaths: [installLocation],
    })
    expect(detection.libraryPaths).toContain(manifestDirectory)

    await expect(readEpicLocalLibrary()).resolves.toMatchObject({
      manifestCount: 1,
      games: [
        expect.objectContaining({
          title: 'Alan Wake 2',
          installPath: installLocation,
        }),
      ],
    })
  })

  it('parses GOG game info files into installed games', () => {
    expect(
      parseGogGameInfo(
        JSON.stringify({
          gameId: '292030',
          name: 'The Witcher 3: Wild Hunt',
        }),
        'D:\\GOG Games\\The Witcher 3\\goggame-292030.info',
        'D:\\GOG Games\\The Witcher 3',
      ),
    ).toEqual({
      coverUrl: null,
      externalId: '292030',
      installPath: 'D:\\GOG Games\\The Witcher 3',
      lastPlayedAt: null,
      manifestPath: 'D:\\GOG Games\\The Witcher 3\\goggame-292030.info',
      ownedAt: null,
      playtimeMinutes: 0,
      title: 'The Witcher 3: Wild Hunt',
    })
  })

  it('parses installed GOG games from the Windows registry', () => {
    const registryOutput = String.raw`
HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\GOG.com\Games\1202885143
    gameName    REG_SZ    Tomb Raider: Anniversary
    gameID    REG_SZ    1202885143
    path    REG_SZ    E:\Games\Tomb Raider Anniversary
    INSTALLDATE    REG_SZ    2026-07-23 14:22:25

HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\GOG.com\Games\invalid
    gameID    REG_SZ    invalid
    path    REG_SZ    E:\Games\Unknown
`

    expect(parseGogRegistryGames(registryOutput)).toEqual([
      {
        coverUrl: null,
        externalId: '1202885143',
        installPath: 'E:\\Games\\Tomb Raider Anniversary',
        lastPlayedAt: null,
        manifestPath:
          'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\Games\\1202885143',
        ownedAt: '2026-07-23T14:22:25.000Z',
        playtimeMinutes: 0,
        title: 'Tomb Raider: Anniversary',
      },
    ])
  })

  it('parses installed EA games from the Windows registry', () => {
    const registryOutput = String.raw`
HKEY_LOCAL_MACHINE\SOFTWARE\EA Games\Battlefield 6
    DisplayName    REG_SZ    Battlefield 6
    Install Dir    REG_SZ    E:/EA Games/Battlefield 6/

HKEY_LOCAL_MACHINE\SOFTWARE\EA Games\Uninstalled
    DisplayName    REG_SZ    Ancien jeu
`

    expect(parseEaInstallRegistry(registryOutput)).toEqual([
      {
        title: 'Battlefield 6',
        installPath: 'E:\\EA Games\\Battlefield 6\\',
        registryPath:
          'HKEY_LOCAL_MACHINE\\SOFTWARE\\EA Games\\Battlefield 6',
      },
    ])
  })

  it('imports only EA games whose installation directory still exists', async () => {
    const root = await createTempRoot()
    const installData = join(root, 'EA Desktop', 'InstallData')
    const library = join(root, 'EA Games')
    const apexInstall = join(library, 'Apex')
    const apexManifest = join(
      installData,
      'Apex',
      'base-Origin.SFT.50.0000848',
      'map.eacrc',
    )
    const staleManifest = join(
      installData,
      'Ancien jeu',
      'base-Origin.SFT.50.0000999',
      'map.eacrc',
    )
    await mkdir(apexInstall, {
      recursive: true,
    })
    await mkdir(join(apexManifest, '..'), {
      recursive: true,
    })
    await mkdir(join(staleManifest, '..'), {
      recursive: true,
    })
    await writeFile(apexManifest, 'manifest')
    await writeFile(staleManifest, 'manifest')
    process.env['PROGRAMDATA'] = root
    process.env['LUDUX_EA_APP_PATHS'] = ''
    process.env['LUDUX_EA_LIBRARY_PATHS'] = library
    process.env['LUDUX_EA_REGISTRY_PATHS'] = ''

    await expect(readEaAppLocalLibrary()).resolves.toMatchObject({
      games: [
        {
          externalId: 'Origin.SFT.50.0000848',
          installPath: apexInstall,
          manifestPath: apexManifest,
          title: 'Apex',
        },
      ],
      sourceCount: 2,
    })

    await expect(detectEaAppLocalPlatform()).resolves.toMatchObject({
      provider: 'EA_APP',
      detected: true,
      manifestCount: 1,
    })
  })

  it('parses Ubisoft Connect installations from the Windows registry', () => {
    const registryOutput = String.raw`
HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs\1803
    Language    REG_SZ    fr-FR
    InstallDir    REG_SZ    E:/Games/Far Cry 5/
`

    expect(parseUbisoftInstallRegistry(registryOutput)).toEqual([
      {
        externalId: '1803',
        installPath: 'E:\\Games\\Far Cry 5\\',
        registryPath:
          'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\1803',
      },
    ])
  })

  it('reads Battle.net products without retaining account information', () => {
    expect(
      parseBattleNetConfig(
        JSON.stringify({
          Client: {
            Install: {
              DefaultInstallPath: 'D:\\Games',
            },
          },
          installation: {
            Path: 'C:\\Program Files (x86)\\Battle.net',
          },
          Games: {
            battle_net: {
              ServerUid: 'battle.net',
            },
            hs_beta: {
              LastActioned: '1726423092',
            },
          },
        }),
      ),
    ).toEqual({
      clientPath: 'C:\\Program Files (x86)\\Battle.net',
      defaultInstallPath: 'D:\\Games',
      productIds: ['hs_beta'],
    })
  })

  it('imports Battle.net products only when a game marker exists', async () => {
    const root = await createTempRoot()
    const battleConfigDirectory = join(root, 'Battle.net')
    const library = join(root, 'Games')
    const hearthstoneInstall = join(library, 'Hearthstone')
    const manifestPath = join(hearthstoneInstall, '.build.info')
    await mkdir(battleConfigDirectory, {
      recursive: true,
    })
    await mkdir(hearthstoneInstall, {
      recursive: true,
    })
    await writeFile(
      join(battleConfigDirectory, 'Battle.net.config'),
      JSON.stringify({
        Client: {
          Install: {
            DefaultInstallPath: library,
          },
        },
        Games: {
          battle_net: {},
          hs_beta: {
            LastActioned: '1726423092',
          },
          wow: {
            LastActioned: '1726423093',
          },
        },
      }),
    )
    await writeFile(manifestPath, 'build')
    process.env['APPDATA'] = root
    process.env['LOCALAPPDATA'] = root
    process.env['LUDUX_BATTLENET_PATHS'] = ''
    process.env['LUDUX_BATTLENET_LIBRARY_PATHS'] = library

    await expect(readBattleNetLocalLibrary()).resolves.toMatchObject({
      games: [
        {
          externalId: 'hs_beta',
          installPath: hearthstoneInstall,
          manifestPath,
          title: 'Hearthstone',
        },
      ],
      sourceCount: 2,
    })

    await expect(detectBattleNetLocalPlatform()).resolves.toMatchObject({
      provider: 'BATTLENET',
      detected: true,
      manifestCount: 1,
    })
  })

  it('parses owned GOG Galaxy games and ignores DLC entries', () => {
    expect(
      parseGogGalaxyLibraryRows(
        [
          {
            releaseKey: 'gog_1423049311',
            titleJson: JSON.stringify({ title: 'Cyberpunk 2077' }),
            imagesJson: JSON.stringify({
              verticalCover: 'https://images.gog.com/cyberpunk.webp',
            }),
            dlcKeysJson: JSON.stringify({
              dlcs: ['gog_1256837418'],
            }),
            installationPath: 'C:\\GOG Games\\Cyberpunk 2077',
            minutesInGame: 125,
            lastPlayedDate: '2026-07-22 21:15:00',
            purchaseDate: null,
            addedDate: '2024-12-08 12:16:56',
            isDlc: 0,
          },
          {
            releaseKey: 'gog_1256837418',
            titleJson: JSON.stringify({
              title: 'Cyberpunk 2077: Phantom Liberty',
            }),
            imagesJson: null,
            installationPath: null,
            minutesInGame: 0,
            lastPlayedDate: null,
            purchaseDate: null,
            addedDate: null,
            isDlc: 1,
          },
        ],
        'C:\\ProgramData\\GOG.com\\Galaxy\\storage\\galaxy-2.0.db',
      ),
    ).toEqual([
      {
        coverUrl: 'https://images.gog.com/cyberpunk.webp',
        externalId: '1423049311',
        installPath: 'C:\\GOG Games\\Cyberpunk 2077',
        lastPlayedAt: '2026-07-22T21:15:00.000Z',
        manifestPath:
          'C:\\ProgramData\\GOG.com\\Galaxy\\storage\\galaxy-2.0.db#gog_1423049311',
        ownedAt: '2024-12-08T12:16:56.000Z',
        playtimeMinutes: 125,
        title: 'Cyberpunk 2077',
      },
    ])
  })

  it('parses GOG Galaxy DLC ownership without exposing numeric placeholders', () => {
    expect(
      parseGogGalaxyDlcRows([
        {
          releaseKey: 'gog_1256837418',
          titleJson: JSON.stringify({
            title: 'Cyberpunk 2077: Phantom Liberty',
          }),
          purchaseDate: '2024-01-12 18:30:00',
          addedDate: null,
          isOwned: 1,
        },
        {
          releaseKey: 'gog_999',
          titleJson: null,
          purchaseDate: null,
          addedDate: null,
          isOwned: 0,
        },
      ]),
    ).toEqual([
      {
        externalId: '1256837418',
        title: 'Cyberpunk 2077: Phantom Liberty',
        owned: true,
        ownedAt: '2024-01-12T18:30:00.000Z',
      },
    ])
  })

  it('prefers localized GOG achievement data and keeps unlock dates', () => {
    expect(
      parseGogGalaxyAchievementRows([
        {
          gameReleaseKey: 'gog_1423049311',
          apikey: 'ACH_THE_FOOL',
          name: 'Le Fou',
          description: 'Devenir mercenaire.',
          iconUrl: 'https://images.gog.com/the-fool.jpg',
          isUnlocked: 1,
          unlockTime: '2026-07-20 22:10:00',
        },
      ]),
    ).toEqual([
      {
        gameReleaseKey: 'gog_1423049311',
        externalId: 'ACH_THE_FOOL',
        name: 'Le Fou',
        description: 'Devenir mercenaire.',
        iconUrl: 'https://images.gog.com/the-fool.jpg',
        unlocked: true,
        unlockDate: '2026-07-20T22:10:00.000Z',
      },
    ])
  })

  it('detects GOG Galaxy data and game info files', async () => {
    const root = await createTempRoot()
    const gogLibrary = join(root, 'GOG Games')
    const gameDirectory = join(gogLibrary, 'The Witcher 3')
    const databasePath = join(root, 'galaxy-2.0.db')
    await mkdir(gameDirectory, {
      recursive: true,
    })
    await writeFile(
      join(gameDirectory, 'goggame-292030.info'),
      JSON.stringify({
        gameId: '292030',
        name: 'The Witcher 3: Wild Hunt',
      }),
    )
    await writeFile(databasePath, '')
    process.env['PROGRAMDATA'] = root
    process.env['LUDUX_GOG_LIBRARY_PATHS'] = gogLibrary
    process.env['LUDUX_GOG_GALAXY_DB_PATH'] = databasePath
    process.env['LUDUX_GOG_REGISTRY_PATHS'] = ''

    const detection = await detectGogLocalPlatform()

    expect(detection).toMatchObject({
      provider: 'GOG',
      detected: true,
      manifestCount: 1,
    })
    expect(detection.libraryPaths).toContain(gogLibrary)
    expect(detection.configPaths).toContain(databasePath)

    await expect(readGogLocalLibrary()).resolves.toMatchObject({
      games: [
        expect.objectContaining({
          externalId: '292030',
          installPath: gameDirectory,
          title: 'The Witcher 3: Wild Hunt',
        }),
      ],
      manifestCount: 1,
    })
  })
})
