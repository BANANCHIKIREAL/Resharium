const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')

const PROTOCOL = 'resharium'
let mainWindow
let pendingAuthUrl = null

app.setName('Решариум')

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

function deliverAuthUrl(url) {
  if (!url || !url.startsWith(`${PROTOCOL}://`)) return
  pendingAuthUrl = url
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('auth-callback', url)
  }
}

app.on('second-instance', (_event, argv) => {
  deliverAuthUrl(argv.find((arg) => arg.startsWith(`${PROTOCOL}://`)))
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  deliverAuthUrl(url)
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: '#080910',
    title: 'Решариум',
    icon: path.join(__dirname, '..', 'assets', 'app-icon.png'),
    autoHideMenuBar: true,
    darkTheme: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow.webContents.getURL()
    if (url !== current && /^https?:\/\//i.test(url)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.webContents.once('did-finish-load', () => {
    if (pendingAuthUrl) mainWindow.webContents.send('auth-callback', pendingAuthUrl)
  })
}

ipcMain.handle('open-external', (_event, url) => {
  if (!/^https?:\/\//i.test(url)) throw new Error('Разрешены только безопасные внешние ссылки')
  return shell.openExternal(url)
})
ipcMain.handle('get-pending-auth-url', () => pendingAuthUrl)
ipcMain.handle('clear-pending-auth-url', () => { pendingAuthUrl = null })

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
