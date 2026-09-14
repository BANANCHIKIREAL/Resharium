const { app, BrowserWindow, globalShortcut, ipcMain, session, shell } = require('electron')
const fs = require('fs')
const path = require('path')
const { shouldBlockRequest } = require('./adblock.cjs')

const PROTOCOL = 'resharium'
let mainWindow
let pendingAuthUrl = null
let shortcutCaptureActive = false
let desktopSettingsPath = ''
let desktopSettings = { minimizeShortcut: 'CommandOrControl+Shift+M', adBlockEnabled: true }

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

function configureSourceAdBlock() {
  const sourceSession = session.fromPartition('persist:resharium-sources')
  sourceSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    callback({ cancel: desktopSettings.adBlockEnabled && shouldBlockRequest(details.url, details.resourceType) })
  })
  sourceSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
}

function loadDesktopSettings() {
  desktopSettingsPath = path.join(app.getPath('userData'), 'desktop-settings.json')
  try {
    const stored = JSON.parse(fs.readFileSync(desktopSettingsPath, 'utf8'))
    if (typeof stored.minimizeShortcut === 'string') desktopSettings.minimizeShortcut = stored.minimizeShortcut
    if (typeof stored.adBlockEnabled === 'boolean') desktopSettings.adBlockEnabled = stored.adBlockEnabled
  } catch { /* First launch or an invalid settings file uses safe defaults. */ }
}

function saveDesktopSettings() {
  try {
    fs.mkdirSync(path.dirname(desktopSettingsPath), { recursive: true })
    fs.writeFileSync(desktopSettingsPath, JSON.stringify(desktopSettings), 'utf8')
  } catch (error) {
    console.error('Could not save desktop settings:', error)
  }
}

function minimizeWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()
}

const modifierOnlyShortcuts = new Set(['Control', 'Shift', 'Alt', 'Super'])

function isModifierOnlyShortcut(shortcut) {
  return modifierOnlyShortcuts.has(shortcut)
}

function registerGlobalMinimizeShortcut(shortcut) {
  if (!shortcut || isModifierOnlyShortcut(shortcut)) return true
  try { return globalShortcut.register(shortcut, minimizeWindow) } catch { return false }
}

function setMinimizeShortcut(shortcut, persist = true) {
  const next = typeof shortcut === 'string' ? shortcut.trim() : ''
  const previous = desktopSettings.minimizeShortcut
  if (previous && !isModifierOnlyShortcut(previous) && globalShortcut.isRegistered(previous)) globalShortcut.unregister(previous)
  if (!registerGlobalMinimizeShortcut(next)) {
    registerGlobalMinimizeShortcut(previous)
    return { ok: false, shortcut: previous, error: 'Это сочетание уже занято системой или другой программой' }
  }
  desktopSettings.minimizeShortcut = next
  if (persist) saveDesktopSettings()
  return { ok: true, shortcut: next }
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

  const handleModifierShortcut = (_event, input) => {
    if (shortcutCaptureActive || input.type !== 'keyUp') return
    const pressed = input.key === 'Meta' ? 'Super' : input.key
    if (isModifierOnlyShortcut(desktopSettings.minimizeShortcut) && pressed === desktopSettings.minimizeShortcut) minimizeWindow()
  }
  mainWindow.webContents.on('before-input-event', handleModifierShortcut)
  mainWindow.webContents.on('did-attach-webview', (_event, guestWebContents) => {
    guestWebContents.on('before-input-event', handleModifierShortcut)
  })

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
ipcMain.handle('app-version', () => app.getVersion())
ipcMain.handle('get-pending-auth-url', () => pendingAuthUrl)
ipcMain.handle('clear-pending-auth-url', () => { pendingAuthUrl = null })
ipcMain.handle('desktop-settings-get', () => ({ ...desktopSettings }))
ipcMain.handle('minimize-shortcut-set', (_event, shortcut) => setMinimizeShortcut(shortcut))
ipcMain.handle('adblock-set', (_event, enabled) => {
  desktopSettings.adBlockEnabled = enabled === true
  saveDesktopSettings()
  return desktopSettings.adBlockEnabled
})
ipcMain.handle('shortcut-capture', (_event, active) => {
  shortcutCaptureActive = active === true
  globalShortcut.setSuspended(shortcutCaptureActive)
})

app.whenReady().then(() => {
  loadDesktopSettings()
  configureSourceAdBlock()
  createWindow()
  setMinimizeShortcut(desktopSettings.minimizeShortcut, false)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => globalShortcut.unregisterAll())
