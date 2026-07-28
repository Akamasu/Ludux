const { app } = require('electron')
const { readFile } = require('node:fs/promises')
const { join } = require('node:path')

app
  .whenReady()
  .then(async () => {
    const mainBuildPath = join(__dirname, '..', 'out', 'main', 'main.js')
    const mainBuild = await readFile(mainBuildPath, 'utf8')

    if (
      /import\s*\{[^}]*\bautoUpdater\b[^}]*\}\s*from\s*["']electron-updater["']/.test(
        mainBuild,
      )
    ) {
      throw new Error(
        'The main build still uses an incompatible named electron-updater import.',
      )
    }

    const updaterPackage = require('electron-updater')

    if (!updaterPackage.autoUpdater) {
      throw new Error('electron-updater did not expose autoUpdater through CommonJS.')
    }

    console.log('electron updater ok (CommonJS bridge verified)')
    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
