const Store = require('electron-store');

const store = new Store({
  defaults: {
    settings: {
      refreshIntervalMs: 30 * 60 * 1000,
      launchOnStartup: false,
      notificationsEnabled: true,
      notificationThresholdPercent: 80,
    },
    cachedUsage: null,
    usageHistory: [],
    lastFetchTimestamp: null,
    sessionActive: false,
  },
});

module.exports = store;
