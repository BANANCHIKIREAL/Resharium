const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

const PROTOCOL = 'resharium'
let mainWindow
let pendingAuthUrl = null
let updatePromptOpen = false
let updateState = {
  status: app.isPackaged ? 'idle' : 'unsupported',
  currentVersion: app.getVersion(),
}

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

function publishUpdateState(next) {
  updateState = { ...updateState, ...next, currentVersion: app.getVersion() }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater-state', updateState)
  }
}

function checkForUpdates() {
  if (!app.isPackaged) {
    publishUpdateState({ status: 'unsupported', message: 'Проверка обновлений доступна в установленном приложении' })
    return Promise.resolve(updateState)
  }
  if (updateState.status === 'checking' || updateState.status === 'downloading') return Promise.resolve(updateState)
  return autoUpdater.checkForUpdates().then(() => updateState).catch((error) => {
    publishUpdateState({ status: 'error', message: error?.message || 'Не удалось проверить обновления' })
    return updateState
  })
}

function configureUpdater() {
  if (!app.isPackaged) return

  // Updates are opt-in: checking must never download or install anything by itself.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => publishUpdateState({ status: 'checking', message: 'Проверяем обновления…' }))
  autoUpdater.on('update-available', (info) => publishUpdateState({ status: 'available', availableVersion: info.version, progress: 0, message: `Доступна версия ${info.version}` }))
  autoUpdater.on('update-not-available', () => publishUpdateState({ status: 'not-available', availableVersion: undefined, progress: undefined, message: 'Установлена актуальная версия' }))
  autoUpdater.on('download-progress', (progress) => publishUpdateState({ status: 'downloading', progress: Math.round(progress.percent), message: `Загрузка обновления: ${Math.round(progress.percent)}%` }))
  autoUpdater.on('error', (error) => {
    console.error('Updater error:', error)
    publishUpdateState({ status: 'error', progress: undefined, message: 'Не удалось проверить или загрузить обновление' })
  })
  autoUpdater.on('update-downloaded', async (info) => {
    publishUpdateState({ status: 'downloaded', availableVersion: info.version, progress: 100, message: `Версия ${info.version} готова к установке` })
    if (updatePromptOpen) return
    updatePromptOpen = true
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Обновление Решариума',
      message: `Версия ${info.version} загружена`,
      detail: 'Перезапустить приложение сейчас и установить обновление?',
      buttons: ['Перезапустить', 'Позже'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    })
    updatePromptOpen = false
    if (result.response === 0) autoUpdater.quitAndInstall(false, true)
  })

  const firstCheck = setTimeout(() => void checkForUpdates(), 5000)
  firstCheck.unref()
  const periodicCheck = setInterval(() => void checkForUpdates(), 4 * 60 * 60 * 1000)
  periodicCheck.unref()
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
ipcMain.handle('updater-get-state', () => updateState)
ipcMain.handle('updater-check', () => checkForUpdates())
ipcMain.handle('updater-download', () => {
  if (updateState.status !== 'available') return false
  publishUpdateState({ status: 'downloading', progress: 0, message: `Загружается версия ${updateState.availableVersion}` })
  void autoUpdater.downloadUpdate().catch((error) => {
    publishUpdateState({ status: 'error', progress: undefined, message: error?.message || 'Не удалось загрузить обновление' })
  })
  return true
})
ipcMain.handle('updater-install', () => {
  if (updateState.status !== 'downloaded') return false
  autoUpdater.quitAndInstall(false, true)
  return true
})

app.whenReady().then(() => {
  createWindow()
  configureUpdater()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
