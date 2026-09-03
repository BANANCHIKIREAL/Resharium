const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getPendingAuthUrl: () => ipcRenderer.invoke('get-pending-auth-url'),
  clearPendingAuthUrl: () => ipcRenderer.invoke('clear-pending-auth-url'),
  onAuthCallback: (callback) => {
    const handler = (_event, url) => callback(url)
    ipcRenderer.on('auth-callback', handler)
    return () => ipcRenderer.removeListener('auth-callback', handler)
  },
})
