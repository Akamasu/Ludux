import { BrowserWindow, ipcMain } from 'electron'

function getSenderWindow(event: Electron.IpcMainInvokeEvent) {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerWindowHandlers() {
  ipcMain.handle('window:minimize', (event) => {
    getSenderWindow(event)?.minimize()
  })

  ipcMain.handle('window:toggleMaximize', (event) => {
    const window = getSenderWindow(event)

    if (!window) {
      return
    }

    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.handle('window:close', (event) => {
    getSenderWindow(event)?.close()
  })
}
