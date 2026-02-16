const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getUsage: () => ipcRenderer.invoke('get-usage'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getLastFetch: () => ipcRenderer.invoke('get-last-fetch'),
  getSessionStatus: () => ipcRenderer.invoke('get-session-status'),

  refreshNow: () => ipcRenderer.send('refresh-now'),
  updateSettings: (settings) => ipcRenderer.send('update-settings', settings),

  onUsageData: (callback) => ipcRenderer.on('usage-data', (_, data) => callback(data)),
  onSessionStatus: (callback) => ipcRenderer.on('session-status', (_, status) => callback(status)),
  onLastFetch: (callback) => ipcRenderer.on('last-fetch', (_, ts) => callback(ts)),
  onError: (callback) => ipcRenderer.on('error', (_, msg) => callback(msg)),
});
