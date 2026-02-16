const { execSync } = require('child_process');
const https = require('https');

const KEYCHAIN_SERVICE = 'Claude Code-credentials';
const OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token';

function readKeychain() {
  const raw = execSync(
    `security find-generic-password -s "${KEYCHAIN_SERVICE}" -w`,
    { encoding: 'utf8', timeout: 5000 }
  ).trim();
  return JSON.parse(raw);
}

function writeKeychain(creds) {
  const json = JSON.stringify(creds);
  try {
    execSync(`security delete-generic-password -s "${KEYCHAIN_SERVICE}"`, { stdio: 'ignore' });
  } catch { /* may not exist */ }
  execSync(
    `security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "claude-code" -w "${json.replace(/"/g, '\\"')}" -U`,
    { stdio: 'ignore' }
  );
}

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          reject(new Error(`Invalid JSON from ${url}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function refreshToken(refreshToken) {
  const body = JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: OAUTH_CLIENT_ID,
  });

  const resp = await httpRequest(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, body);

  if (resp.status !== 200 || !resp.data.access_token) {
    throw new Error('Token refresh failed: ' + JSON.stringify(resp.data));
  }

  return resp.data;
}

async function fetchUsage() {
  const creds = readKeychain();
  const oauth = creds.claudeAiOauth;

  if (!oauth || !oauth.accessToken) {
    throw new Error('No OAuth credentials found. Run Claude Code and log in first.');
  }

  // Try with current token
  let resp = await httpRequest(USAGE_URL, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + oauth.accessToken,
      'anthropic-beta': 'oauth-2025-04-20',
      'Content-Type': 'application/json',
    },
  });

  // If expired, refresh and retry
  if (resp.status === 401 && oauth.refreshToken) {
    console.log('Token expired, refreshing...');
    const newTokens = await refreshToken(oauth.refreshToken);

    // Update keychain with new tokens
    oauth.accessToken = newTokens.access_token;
    oauth.refreshToken = newTokens.refresh_token;
    oauth.expiresAt = Date.now() + (newTokens.expires_in * 1000);
    writeKeychain(creds);
    console.log('Token refreshed, expires in', newTokens.expires_in, 'seconds');

    // Retry with new token
    resp = await httpRequest(USAGE_URL, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + newTokens.access_token,
        'anthropic-beta': 'oauth-2025-04-20',
        'Content-Type': 'application/json',
      },
    });
  }

  if (resp.status !== 200) {
    throw new Error('Usage API returned ' + resp.status + ': ' + JSON.stringify(resp.data));
  }

  return normalizeUsageData(resp.data);
}

// Convert API response to the widget's data format
function normalizeUsageData(raw) {
  const data = {
    timestamp: new Date().toISOString(),
    planUsage: {
      currentSession: null,
      weeklyLimits: { allModels: null, sonnetOnly: null },
    },
    extraUsage: null,
  };

  if (raw.five_hour) {
    data.planUsage.currentSession = {
      percent: Math.round(raw.five_hour.utilization),
      resetTime: formatResetTime(raw.five_hour.resets_at),
    };
  }

  if (raw.seven_day) {
    data.planUsage.weeklyLimits.allModels = {
      percent: Math.round(raw.seven_day.utilization),
      resetTime: formatResetTime(raw.seven_day.resets_at),
    };
  }

  if (raw.seven_day_sonnet) {
    data.planUsage.weeklyLimits.sonnetOnly = {
      percent: Math.round(raw.seven_day_sonnet.utilization),
      resetTime: formatResetTime(raw.seven_day_sonnet.resets_at),
    };
  }

  if (raw.extra_usage) {
    const spent = raw.extra_usage.used_credits / 100;
    const limit = raw.extra_usage.monthly_limit / 100;
    data.extraUsage = {
      spent: '$' + spent.toFixed(2),
      percent: Math.round(raw.extra_usage.utilization),
      monthlyLimit: '$' + Math.round(limit),
    };
  }

  return data;
}

function formatResetTime(isoString) {
  if (!isoString) return null;
  const diff = new Date(isoString) - new Date();
  if (diff <= 0) return '0 min';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
  if (hours > 0) return `${hours} hr`;
  return `${mins} min`;
}

module.exports = { fetchUsage };
