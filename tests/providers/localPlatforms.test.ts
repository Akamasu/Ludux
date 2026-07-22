import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  detectEpicLocalPlatform,
  detectGogLocalPlatform,
} from '../../src/providers/local-platforms'

const originalProgramData = process.env['PROGRAMDATA']
const originalEpicManifestPaths = process.env['LUDUX_EPIC_MANIFEST_PATHS']
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

afterEach(async () => {
  restoreEnv('PROGRAMDATA', originalProgramData)
  restoreEnv('LUDUX_EPIC_MANIFEST_PATHS', originalEpicManifestPaths)
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
    process.env['LUDUX_EPIC_MANIFEST_PATHS'] = ''

    await expect(detectEpicLocalPlatform()).resolves.toMatchObject({
      provider: 'EPIC',
      detected: true,
      manifestCount: 1,
      libraryPaths: [manifestDirectory],
      rootPaths: [installLocation],
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
    await writeFile(join(gameDirectory, 'goggame-292030.info'), '{}')
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
  })
})
