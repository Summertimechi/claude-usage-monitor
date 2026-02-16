# Claude Usage Monitor

A desktop menubar app for **macOS**, **Windows**, and **Linux** that shows your Claude AI usage in real time.

Track your current session percentage, weekly limits, and extra usage spending — updated every 60 seconds via the Claude OAuth API.

## Platform Support

| Platform | Tray Location | Credential Storage |
|----------|--------------|-------------------|
| **macOS** | Menu bar (top right) | macOS Keychain (`Claude Code-credentials`) |
| **Windows** | System tray (bottom right) | `%USERPROFILE%\.claude\.credentials.json` |
| **Linux** | System tray | `~/.claude/.credentials.json` |

## Features

- Lives in your menu bar / system tray for at-a-glance usage monitoring
- Pulls live data from the Claude usage API (session %, weekly limit, extra spend)
- Color-coded progress bars (green / amber / red) based on usage level
- Configurable refresh interval (default 60 seconds)
- Desktop notifications when usage crosses a configurable threshold
- Automatically refreshes expired OAuth tokens
- All data stays local on your machine

## Prerequisites

- **Node.js 18+**
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** installed and logged in — the monitor reads the OAuth credentials that Claude Code stores on your system

## Quick Start

```bash
git clone https://github.com/Summertimechi/claude-usage-monitor.git
cd claude-usage-monitor
npm install
npm start
```

## How It Works

The app reads Claude Code's OAuth tokens from your system's credential store, then polls an undocumented Claude usage API endpoint on a regular interval. When tokens expire, it automatically refreshes them using the stored refresh token. No data leaves your machine.

## Settings

Click the gear icon to configure:

- **Refresh interval** — how often to poll the API (seconds)
- **Notifications** — enable/disable desktop alerts
- **Usage threshold** — the percentage at which notifications fire

## Disclaimer

This app uses an undocumented Claude API endpoint for usage data. Anthropic could change or remove this endpoint at any time without notice, which would break the monitor.

## License

MIT
