# Claude Usage Widget

A macOS menubar widget that displays your Claude AI usage stats -- current session percentage, weekly limits, and extra usage spending -- updated every 60 seconds via the Claude OAuth API.

![screenshot](screenshot.png)

## Features

- Lives in the macOS menubar tray for at-a-glance usage stats
- Pulls live data from the Claude usage API (session %, weekly limit, extra spend)
- Color-coded progress bars (green/yellow/red) based on usage level
- Configurable refresh interval (default 60 seconds)
- Desktop notifications when usage crosses a configurable threshold
- Automatically refreshes expired OAuth tokens via the Claude API

## Prerequisites

- macOS (Keychain dependency -- see note below)
- Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and logged in (this writes the OAuth credentials to your macOS Keychain that the widget reads)

## Install and Run

```bash
git clone https://github.com/youruser/claude-usage-widget.git
cd claude-usage-widget
npm install
npm start
```

## How It Works

The widget reads Claude Code's OAuth tokens from the macOS Keychain, then polls an undocumented Claude usage API endpoint on a regular interval. When tokens expire, it automatically refreshes them using the stored refresh token. All data stays local -- nothing is sent anywhere except the Claude API.

## Settings

Click the gear icon in the widget window to configure:

- **Refresh interval** -- how often to poll the API
- **Notifications** -- enable/disable desktop notifications
- **Usage threshold** -- the percentage at which notifications fire

## Platform Note

This widget is macOS-only. It depends on the macOS Keychain to read OAuth credentials written by Claude Code. It will not work on Windows or Linux without significant changes.

## Disclaimer

This widget uses an undocumented Claude API endpoint for usage data. Anthropic could change or remove this endpoint at any time without notice, which would break the widget.

## License

MIT
