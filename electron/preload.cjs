const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getPendingAuthUrl: () => ipcRenderer.invoke('get-pending-auth-url'),
  clearPendingAuthUrl: () => ipcRenderer.invoke('clear-pending-auth-url'),
  getDesktopSettings: () => ipcRenderer.invoke('desktop-settings-get'),
  setMinimizeShortcut: (shortcut) => ipcRenderer.invoke('minimize-shortcut-set', shortcut),
  setAdBlockEnabled: (enabled) => ipcRenderer.invoke('adblock-set', enabled),
  setShortcutCapture: (active) => ipcRenderer.invoke('shortcut-capture', active),
  onAuthCallback: (callback) => {
    const handler = (_event, url) => callback(url)
    ipcRenderer.on('auth-callback', handler)
    return () => ipcRenderer.removeListener('auth-callback', handler)
  },
})
