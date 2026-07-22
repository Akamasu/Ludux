import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  detectEpicLocalPlatform,
  detectGogLocalPlatform,
  parseEpicLauncherCacheFile,
  parseEpicLauncherInstalledDatabase,
  parseEpicManagedApp,
  parseEpicManifest,
  parseGogGameInfo,
  readEpicLocalLibrary,
  readGogLocalLibrary,
} from '../../src/providers/local-platforms'

const originalProgramData = process.env['PROGRAMDATA']
const originalLocalAppData = process.env['LOCALAPPDATA']
const originalEpicManifestPaths = process.env['LUDUX_EPIC_MANIFEST_PATHS']
const originalEpicManagedAppPaths = process.env['LUDUX_EPIC_MANAGED_APP_PATHS']
const originalEpicWebcachePaths = process.env['LUDUX_EPIC_WEBCACHE_PATHS']
const originalGogDbPath = process.env['LUDUX_GOG_GALAXY_DB_PATH']
const originalGogLibraryPaths = process.env['LUDUX_GOG_LIBRARY_PATHS']
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
  restoreEnv('PROGRAMDATA', originalProgramData)
  restoreEnv('LOCALAPPDATA', originalLocalAppData)
  restoreEnv('LUDUX_EPIC_MANIFEST_PATHS', originalEpicManifestPaths)
  restoreEnv('LUDUX_EPIC_MANAGED_APP_PATHS', originalEpicManagedAppPaths)
  restoreEnv('LUDUX_EPIC_WEBCACHE_PATHS', originalEpicWebcachePaths)
  restoreEnv('LUDUX_GOG_GALAXY_DB_PATH', originalGogDbPath)
  restoreEnv('LUDUX_GOG_LIBRARY_PATHS', originalGogLibraryPaths)

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

    await expect(detectEpicLocalPlatform()).resolves.toMatchObject({
      provider: 'EPIC',
      detected: true,
      manifestCount: 1,
      libraryPaths: [manifestDirectory],
      rootPaths: [installLocation],
    })

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
      externalId: '292030',
      installPath: 'D:\\GOG Games\\The Witcher 3',
      manifestPath: 'D:\\GOG Games\\The Witcher 3\\goggame-292030.info',
      title: 'The Witcher 3: Wild Hunt',
    })
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
