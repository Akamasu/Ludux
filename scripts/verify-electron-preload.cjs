const { app, BrowserWindow } = require('electron')
const { existsSync } = require('node:fs')
const { join } = require('node:path')

app
  .whenReady()
  .then(async () => {
    const preload = join(__dirname, '..', 'out', 'preload', 'preload.mjs')

    if (!existsSync(preload)) {
      throw new Error(`Preload build not found: ${preload}`)
    }

    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    await window.loadURL('data:text/html,<html><body>preload smoke</body></html>')

    const hasLuduxApi = await window.webContents.executeJavaScript(
      'typeof window.ludux === "object" && typeof window.ludux.settings?.getOverview === "function"',
    )

    window.close()

    if (!hasLuduxApi) {
      throw new Error('window.ludux was not exposed by the preload script.')
    }

    console.log('electron preload ok (window.ludux exposed)')
    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
