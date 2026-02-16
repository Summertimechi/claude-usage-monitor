const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const { createTray } = require('./tray');
const { fetchUsage } = require('../api/oauth');
const store = require('../shared/store');
const config = require('../shared/config');
const { checkAndNotify } = require('./notifications');
const { getSettings, updateSettings } = require('./settings');

let popupWindow = null;
let refreshTimer = null;
let isQuitting = false;

// Prevent crashes from killing the app
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// Single instance lock — prevent duplicate tray icons
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  try {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.show();
      popupWindow.focus();
    }
  } catch { /* ignore */ }
});

app.on('ready', async () => {
  if (!gotLock) return;

  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  popupWindow = createPopupWindow();
  createTray(popupWindow);
  setupIPC();

  // Send cached data once renderer is ready
  popupWindow.webContents.on('did-finish-load', () => {
    const cached = store.get('cachedUsage');
    if (cached) {
      sendToRenderer('usage-data', cached);
      const lastFetch = store.get('lastFetchTimestamp');
      if (lastFetch) sendToRenderer('last-fetch', lastFetch);
    }
    sendToRenderer('session-status', { active: true });
  });

  await doFetch();
  startRefreshTimer();
});

async function doFetch() {
  if (isQuitting) return;

  try {
    console.log('Fetching usage via OAuth API...');
    const data = await fetchUsage();
    store.set('cachedUsage', data);
    store.set('lastFetchTimestamp', Date.now());

    const history = store.get('usageHistory') || [];
    history.push({ timestamp: Date.now(), data });
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    store.set('usageHistory', history.filter(h => h.timestamp > cutoff));

    sendToRenderer('usage-data', data);
    sendToRenderer('last-fetch', Date.now());
    sendToRenderer('session-status', { active: true });

    const pu = data.planUsage || {};
    console.log('Usage:',
      'session=' + (pu.currentSession?.percent ?? '?') + '%',
      'all=' + (pu.weeklyLimits?.allModels?.percent ?? '?') + '%',
      'sonnet=' + (pu.weeklyLimits?.sonnetOnly?.percent ?? '?') + '%',
      data.extraUsage ? 'extra=' + data.extraUsage.spent + '/' + data.extraUsage.monthlyLimit : ''
    );

    checkAndNotify(data, getSettings());
  } catch (err) {
    if (isQuitting) return;
    console.error('Fetch failed:', err.message);
    sendToRenderer('error', err.message);
  }
}

function startRefreshTimer() {
  if (refreshTimer) clearInterval(refreshTimer);
  const interval = store.get('settings.refreshIntervalMs') || config.REFRESH_INTERVAL_MS;
  refreshTimer = setInterval(doFetch, interval);
  console.log('Refresh timer set to', Math.round(interval / 1000), 'seconds');
}

function createPopupWindow() {
  const win = new BrowserWindow({
    width: config.WIDGET_WIDTH,
    height: config.WIDGET_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  win.on('blur', () => {
    if (!win.isDestroyed()) win.hide();
  });

  return win;
}

function sendToRenderer(channel, data) {
  try {
    if (popupWindow && !popupWindow.isDestroyed() && popupWindow.webContents) {
      popupWindow.webContents.send(channel, data);
    }
  } catch { /* window destroyed */ }
}

function setupIPC() {
  ipcMain.handle('get-usage', () => store.get('cachedUsage'));
  ipcMain.handle('get-settings', () => getSettings());
  ipcMain.handle('get-last-fetch', () => store.get('lastFetchTimestamp'));
  ipcMain.handle('get-session-status', () => ({ active: true }));

  ipcMain.on('refresh-now', async () => { await doFetch(); });
  ipcMain.on('update-settings', (event, newSettings) => {
    updateSettings(newSettings);
    startRefreshTimer();
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
});

app.on('window-all-closed', (e) => {
  if (!isQuitting) e.preventDefault();
});
