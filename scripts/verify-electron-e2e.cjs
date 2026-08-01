const { _electron: electron } = require('playwright')
const { mkdtemp, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { performance } = require('node:perf_hooks')

const projectDirectory = join(__dirname, '..')
const testPackagedApplication = process.argv.includes('--packaged')
const packagedExecutable = join(
  projectDirectory,
  'release',
  'win-unpacked',
  'Ludux.exe',
)

function elapsedSince(startedAt) {
  return Math.round(performance.now() - startedAt)
}

async function openView(window, title, heading) {
  const startedAt = performance.now()
  await window.locator(`button[title="${title}"]`).click()
  await window.getByRole('heading', { name: heading, exact: true }).waitFor()
  return elapsedSince(startedAt)
}

async function run() {
  const testDirectory = await mkdtemp(join(tmpdir(), 'ludux-e2e-'))
  const userDataDirectory = join(testDirectory, 'profile')
  const rendererErrors = []
  let electronApp = null

  try {
    const launchStartedAt = performance.now()
    electronApp = await electron.launch({
      ...(testPackagedApplication
        ? { executablePath: packagedExecutable }
        : { args: [projectDirectory] }),
      cwd: projectDirectory,
      env: {
        ...process.env,
        LUDUX_CONNECT_URL: '',
        LUDUX_E2E: '1',
        LUDUX_E2E_USER_DATA_DIR: userDataDirectory,
      },
      timeout: 30_000,
    })

    const window = await electronApp.firstWindow({ timeout: 30_000 })
    window.on('pageerror', (error) => rendererErrors.push(`pageerror: ${error.message}`))
    window.on('console', (message) => {
      if (message.type() === 'error') {
        rendererErrors.push(`console: ${message.text()}`)
      }
    })

    await window.waitForLoadState('domcontentloaded')
    await window.getByRole('button', { name: 'Entrer dans Ludux', exact: true }).waitFor({
      state: 'visible',
      timeout: 20_000,
    })
    const firstUsableMs = elapsedSince(launchStartedAt)

    const preloadReady = await window.evaluate(
      () =>
        typeof window.ludux?.settings.getOverview === 'function' &&
        typeof window.ludux?.games.list === 'function',
    )

    if (!preloadReady) {
      throw new Error('The Electron preload API is unavailable.')
    }

    await window.getByRole('button', { name: 'Entrer dans Ludux', exact: true }).click()
    await window.locator('nav[aria-label="Navigation principale"]').waitFor()
    await window.getByRole('heading', { name: 'Bienvenue dans Ludux', exact: true }).waitFor()

    const libraryMs = await openView(window, 'Bibliothèque', 'Vos jeux')
    const settingsMs = await openView(window, 'Paramètres', 'Paramètres')

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setSize(800, 600)
    })
    await window.waitForTimeout(250)

    const responsiveLayout = await window.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }))
    const appMetrics = await electronApp.evaluate(({ app }) =>
      app.getAppMetrics().map((metric) => ({
        cpuPercent: metric.cpu.percentCPUUsage,
        memoryKb: metric.memory.workingSetSize,
        type: metric.type,
      })),
    )

    if (firstUsableMs > 20_000) {
      throw new Error(`The first usable screen took ${firstUsableMs} ms.`)
    }

    if (libraryMs > 5_000 || settingsMs > 5_000) {
      throw new Error(`Navigation is too slow (${libraryMs} ms / ${settingsMs} ms).`)
    }

    if (responsiveLayout.scrollWidth > responsiveLayout.clientWidth + 1) {
      throw new Error(
        `The compact layout overflows horizontally (${responsiveLayout.scrollWidth}px).`,
      )
    }

    if (rendererErrors.length > 0) {
      throw new Error(`Renderer errors detected:\n${rendererErrors.join('\n')}`)
    }

    const rendererMemoryKb = appMetrics
      .filter((metric) => metric.type === 'Tab')
      .reduce((total, metric) => total + metric.memoryKb, 0)

    const targetLabel = testPackagedApplication ? 'packaged electron' : 'electron'
    console.log(
      `${targetLabel} e2e ok (usable ${firstUsableMs} ms, library ${libraryMs} ms, settings ${settingsMs} ms, renderer ${Math.round(rendererMemoryKb / 1024)} MB)`,
    )
  } finally {
    await electronApp?.close().catch(() => undefined)
    await rm(testDirectory, { recursive: true, force: true })
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
