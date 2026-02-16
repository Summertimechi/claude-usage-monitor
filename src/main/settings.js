const store = require('../shared/store');
const { app } = require('electron');

function getSettings() {
  return store.get('settings');
}

function updateSettings(newSettings) {
  const current = store.get('settings');
  const merged = { ...current, ...newSettings };
  store.set('settings', merged);

  if ('launchOnStartup' in newSettings) {
    app.setLoginItemSettings({
      openAtLogin: newSettings.launchOnStartup,
    });
  }

  return merged;
}

module.exports = { getSettings, updateSettings };
