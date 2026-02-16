const { Notification } = require('electron');

function checkAndNotify(usageData, settings) {
  if (!settings || !settings.notificationsEnabled) return;

  const threshold = settings.notificationThresholdPercent || 80;

  // Check all usage meters against threshold
  const meters = [];

  if (usageData.planUsage) {
    const pu = usageData.planUsage;
    if (pu.currentSession && pu.currentSession.percent != null) {
      meters.push({ label: 'Current session', percent: pu.currentSession.percent });
    }
    if (pu.weeklyLimits) {
      if (pu.weeklyLimits.allModels && pu.weeklyLimits.allModels.percent != null) {
        meters.push({ label: 'Weekly (all models)', percent: pu.weeklyLimits.allModels.percent });
      }
      if (pu.weeklyLimits.sonnetOnly && pu.weeklyLimits.sonnetOnly.percent != null) {
        meters.push({ label: 'Weekly (Sonnet)', percent: pu.weeklyLimits.sonnetOnly.percent });
      }
    }
  }

  if (usageData.extraUsage && usageData.extraUsage.percent != null) {
    meters.push({ label: 'Extra usage spending', percent: usageData.extraUsage.percent });
  }

  // Find the highest usage that exceeds threshold
  const exceeding = meters.filter(m => m.percent >= threshold);
  if (exceeding.length > 0) {
    const worst = exceeding.reduce((a, b) => a.percent > b.percent ? a : b);
    new Notification({
      title: 'Claude Usage Alert',
      body: `${worst.label} at ${Math.round(worst.percent)}% \u2014 approaching limit`,
    }).show();
  }
}

module.exports = { checkAndNotify };
