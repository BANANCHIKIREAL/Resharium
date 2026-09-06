const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getPendingAuthUrl: () => ipcRenderer.invoke('get-pending-auth-url'),
  clearPendingAuthUrl: () => ipcRenderer.invoke('clear-pending-auth-url'),
  getUpdateState: () => ipcRenderer.invoke('updater-get-state'),
  checkForUpdates: () => ipcRenderer.invoke('updater-check'),
  downloadUpdate: () => ipcRenderer.invoke('updater-download'),
  installUpdate: () => ipcRenderer.invoke('updater-install'),
  onUpdateState: (callback) => {
    const handler = (_event, state) => callback(state)
    ipcRenderer.on('updater-state', handler)
    return () => ipcRenderer.removeListener('updater-state', handler)
  },
  onAuthCallback: (callback) => {
    const handler = (_event, url) => callback(url)
    ipcRenderer.on('auth-callback', handler)
    return () => ipcRenderer.removeListener('auth-callback', handler)
  },
})
