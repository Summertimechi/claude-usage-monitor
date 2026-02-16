const sessionIndicator = document.getElementById('session-indicator');
const lastFetchEl = document.getElementById('last-fetch');
const loadingEl = document.getElementById('loading');
const usageDisplay = document.getElementById('usage-display');
const errorDisplay = document.getElementById('error-display');
const settingsPanel = document.getElementById('settings-panel');

// Button handlers
document.getElementById('btn-refresh').addEventListener('click', () => {
  window.api.refreshNow();
  loadingEl.style.display = 'block';
  loadingEl.textContent = 'Refreshing...';
});

document.getElementById('btn-settings').addEventListener('click', async () => {
  const settings = await window.api.getSettings();
  populateSettingsForm(settings);
  settingsPanel.style.display = 'flex';
});

document.getElementById('btn-cancel-settings').addEventListener('click', () => {
  settingsPanel.style.display = 'none';
});

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const newSettings = {
    refreshIntervalMs: parseInt(document.getElementById('input-interval').value) * 1000,
    launchOnStartup: document.getElementById('input-startup').checked,
    notificationsEnabled: document.getElementById('input-notifications').checked,
    notificationThresholdPercent: parseInt(document.getElementById('input-threshold').value),
  };
  window.api.updateSettings(newSettings);
  settingsPanel.style.display = 'none';
});

// Listen for push updates from main process
window.api.onUsageData((data) => {
  loadingEl.style.display = 'none';
  errorDisplay.style.display = 'none';
  usageDisplay.style.display = 'block';
  renderUsageData(data);
});

window.api.onSessionStatus((status) => {
  sessionIndicator.className = 'indicator ' + (status.active ? 'active' : 'expired');
});

window.api.onLastFetch((timestamp) => {
  lastFetchEl.textContent = 'Last updated: ' + formatTimestamp(timestamp);
});

window.api.onError((msg) => {
  loadingEl.style.display = 'none';
  errorDisplay.style.display = 'block';
  errorDisplay.textContent = 'Error: ' + msg;
});

// Rendering
function renderUsageData(data) {
  const pu = data.planUsage;
  if (!pu) {
    usageDisplay.innerHTML = '<p class="no-data">No usage data available.</p>';
    return;
  }

  let html = '';

  // --- Current Session ---
  if (pu.currentSession) {
    html += renderMeterCard('Current session', pu.currentSession.percent, pu.currentSession.resetTime);
  }

  // --- Weekly Limits ---
  const wl = pu.weeklyLimits || {};
  if (wl.allModels || wl.sonnetOnly) {
    html += '<div class="usage-card">';
    html += '<div class="card-header">Weekly limits</div>';
    if (wl.allModels) {
      html += renderMeterRow('All models', wl.allModels.percent, wl.allModels.resetTime);
    }
    if (wl.sonnetOnly) {
      html += renderMeterRow('Sonnet only', wl.sonnetOnly.percent, wl.sonnetOnly.resetTime);
    }
    html += '</div>';
  }

  // --- Extra Usage ---
  const ex = data.extraUsage;
  if (ex) {
    html += '<div class="usage-card extra-usage-card">';
    html += '<div class="card-header">Extra usage</div>';
    html += '<div class="spending-row">';
    html += `<span class="spent-amount">${escapeHTML(ex.spent || '--')}</span>`;
    html += '<span class="spent-label">spent</span>';
    if (ex.monthlyLimit) {
      html += `<span class="limit-badge">of ${escapeHTML(ex.monthlyLimit)}</span>`;
    }
    html += '</div>';
    if (ex.percent !== null && ex.percent !== undefined) {
      const colorClass = getColorClass(ex.percent);
      html += `<div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill ${colorClass}" style="width: ${ex.percent}%"></div>
        </div>
        <span class="progress-pct">${ex.percent}%</span>
      </div>`;
    }
    html += '</div>';
  }

  if (!html) {
    html = '<p class="no-data">No usage data available.</p>';
  }

  usageDisplay.innerHTML = html;
}

function renderMeterCard(label, percent, resetTime) {
  const colorClass = getColorClass(percent);
  let html = '<div class="usage-card">';
  html += `<div class="card-header">${escapeHTML(label)}</div>`;
  if (percent !== null && percent !== undefined) {
    html += `<div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill ${colorClass}" style="width: ${percent}%"></div>
      </div>
      <span class="progress-pct">${percent}%</span>
    </div>`;
  }
  if (resetTime) {
    html += `<div class="reset-time">Resets in ${escapeHTML(resetTime)}</div>`;
  }
  html += '</div>';
  return html;
}

function renderMeterRow(label, percent, resetTime) {
  const colorClass = getColorClass(percent);
  let html = '<div class="meter-row">';
  html += `<div class="meter-label">${escapeHTML(label)}</div>`;
  if (percent !== null && percent !== undefined) {
    html += `<div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill ${colorClass}" style="width: ${percent}%"></div>
      </div>
      <span class="progress-pct">${percent}%</span>
    </div>`;
  }
  if (resetTime) {
    html += `<div class="reset-time">Resets in ${escapeHTML(resetTime)}</div>`;
  }
  html += '</div>';
  return html;
}

function getColorClass(percent) {
  if (percent === null || percent === undefined) return '';
  if (percent >= 90) return 'danger';
  if (percent >= 70) return 'warning';
  return '';
}

function populateSettingsForm(settings) {
  document.getElementById('input-interval').value = Math.round((settings.refreshIntervalMs || 60000) / 1000);
  document.getElementById('input-startup').checked = settings.launchOnStartup || false;
  document.getElementById('input-notifications').checked = settings.notificationsEnabled !== false;
  document.getElementById('input-threshold').value = settings.notificationThresholdPercent || 80;
}

function formatTimestamp(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Load initial data
(async () => {
  const cached = await window.api.getUsage();
  if (cached) {
    renderUsageData(cached);
    loadingEl.style.display = 'none';
    usageDisplay.style.display = 'block';
  }
  const lastFetch = await window.api.getLastFetch();
  if (lastFetch) {
    lastFetchEl.textContent = 'Last updated: ' + formatTimestamp(lastFetch);
  }
  sessionIndicator.className = 'indicator active';
})();
