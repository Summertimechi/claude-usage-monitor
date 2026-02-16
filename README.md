# Claude Usage Monitor

A desktop menubar app that displays your Claude AI usage stats -- current session percentage, weekly limits, and extra usage spending -- updated every 60 seconds via the Claude OAuth API.

Works on macOS, Windows, and Linux.

![screenshot](screenshot.png)

## Features

- Lives in the system tray/menubar for at-a-glance usage monitoring
- Pulls live data from the Claude usage API (session %, weekly limit, extra spend)
- Color-coded progress bars (green/amber/red) based on usage level
- Configurable refresh interval (default 60 seconds)
- Desktop notifications when usage crosses a configurable threshold
- Automatically refreshes expired OAuth tokens

## Prerequisites

- Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and logged in (the widget reads the OAuth credentials that Claude Code stores)

## Install and Run

```bash
git clone https://github.com/Summertimechi/claude-usage-monitor.git
cd claude-usage-monitor
npm install
npm start
```

## How It Works

The app reads Claude Code's OAuth tokens from your system's credential store, then polls an undocumented Claude usage API endpoint on a regular interval. When tokens expire, it automatically refreshes them using the stored refresh token. All data stays local.

**Credential storage by platform:**

| Platform | Storage |
|----------|---------|
| macOS | Keychain (`Claude Code-credentials`) |
| Windows | `%USERPROFILE%\.claude\.credentials.json` |
| Linux | `~/.claude/.credentials.json` |

## Settings

Click the gear icon to configure:

- **Refresh interval** -- how often to poll the API (seconds)
- **Notifications** -- enable/disable desktop alerts
- **Usage threshold** -- the percentage at which notifications fire

## Disclaimer

This app uses an undocumented Claude API endpoint for usage data. Anthropic could change or remove this endpoint at any time without notice, which would break the monitor.

## License

MIT
