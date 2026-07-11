# Balance Watch - GNOME Shell Extension

Monitor AI service account balances in your GNOME Shell panel.

![Extension Status](https://img.shields.io/badge/status-active-success)
![GNOME Versions](https://img.shields.io/badge/gnome-46--50-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

## Overview

**Balance Watch** displays real-time credit/balance information from multiple AI service providers directly in the GNOME Shell top panel. Designed for developers and power users who use AI APIs and need to monitor their spending.

### Supported Providers

| Provider | API Endpoint | Auth Method | Balance Unit |
|----------|-------------|-------------|--------------|
| OpenAI | `api.openai.com/v1/usage` | Bearer token | USD |
| Anthropic | `api.anthropic.com/v1/organizations/me/usage` | API key | USD |
| Groq | `api.groq.com/v1/usage` | Bearer token | USD |
| OpenRouter | `openrouter.ai/api/v1/credits` | Bearer token | USD |
| OpenCode Zen | `opencode.ai/zen/v1/balance` | Bearer token | USD |
| PPQ.AI | `api.ppq.ai/credits/balance` | Bearer + credit_id | Credits |
| xAI | `management-api.x.ai/v1/billing/teams/{id}/prepaid/balance` | Bearer (management key) | USD |

## Installation

### Requirements

- GNOME Shell 46, 47, 48, 49, or 50
- libsecret (for secure API key storage)
- GLib with GObject Introspection

### Quick Install

```bash
git clone https://github.com/rossigee/gnome-shell-balance-watch.git
cd gnome-shell-balance-watch
make install
```

### Enable Extension

1. Log out and log back in (or restart GNOME Shell)
2. Open **Extensions** app or search "Extensions" in Activities
3. Enable **Balance Watch**

Alternative: Use Looking Glass (`Alt+F2` → `lg` → Extensions tab) to reload extensions.

## Usage

### Configure Accounts

1. Open extension preferences: `make prefs`
2. Click **+** to add a new account
3. Select provider from dropdown
4. Enter your API key and click **Save to Keyring**
5. Set polling interval (default: 5 minutes)

### Panel Display

The extension displays in your top panel with format: `{Provider} {Balance} {Symbol}`

Example: `OpenAI $12.45`

Click the indicator to see:
- Provider name and current balance
- Error messages (if API fails)
- Settings shortcut

### API Key Setup

API keys are stored securely in GNOME Keyring (not in plain text).

For providers requiring additional IDs:
- **PPQ.AI**: Enter your `credit_id` in settings
- **xAI**: Enter your `team_id` in settings

## Development

### Build from Source

```bash
# Install dependencies
npm install

# Build extension
make build

# Install to local extensions directory
make install
```

### Development Commands

```bash
make dev          # Show all available commands
make build        # Build extension (creates dist/ and build/)
make install      # Install to ~/.local/share/gnome-shell/extensions/
make clean        # Remove build artifacts
make lint         # Run ESLint
make check        # TypeScript type check
make test         # Run unit tests
make logs         # Monitor extension logs
```

### Testing

```bash
# Run unit tests (28 tests covering providers and formatting)
npm test

# Monitor logs
journalctl /usr/bin/gnome-shell -f | grep -i balance
```

### Hot Reload Workflow

1. Edit source files in `src/`
2. Run `make build && make install`
3. Reload extension via:
   - Looking Glass (`Alt+F2` → `lg` → Extensions → Reload)
   - Or log out/in

## Architecture

```
src/
├── extension.ts         # Main entry point, panel indicators
├── ApiService.ts        # HTTP polling with circuit breaker
├── KeyringManager.ts    # GNOME Keyring integration
├── providers/           # Provider implementations
│   ├── BaseProvider.ts  # Abstract base class
│   ├── ProviderOpenAI.ts
│   ├── ProviderAnthropic.ts
│   └── ...              # Other providers
├── prefs/               # GTK4 preferences UI
└── format/              # Balance formatting
```

### Provider Pattern

Each provider implements:
- `getUrl()` - API endpoint URL
- `getMethod()` - GET or POST
- `getHeaders()` - Authentication headers
- `getBody()` - Request body (for POST)
- `parseData()` - Extract balance from response

## Configuration

### GSettings Schema

`org.gnome.shell.extensions.balance-watch`

| Key | Type | Description |
|-----|------|-------------|
| `accounts` | array | Array of account configurations |
| `first-run` | boolean | First run flag |

### Account Configuration

```json
{
  "id": "uuid-string",
  "provider": "openai",
  "label": "My Account",
  "interval": 300,
  "extraParams": {
    "credit_id": "...",
    "team_id": "..."
  }
}
```

## Troubleshooting

### Extension not appearing

1. Ensure installed: `ls ~/.local/share/gnome-shell/extensions/balance-watch@rossigee.dev/`
2. Restart GNOME Shell or log out/in
3. Check Looking Glass for errors: `Alt+F2` → `lg`

### API errors

- Verify API key is correct
- Check provider supports balance API
- Some providers (xAI, PPQ.AI) require additional IDs
- Monitor logs: `journalctl /usr/bin/gnome-shell -f | grep balance`

### Build errors

```bash
# Clean and rebuild
make clean && make build

# Check TypeScript
make check

# Run lint
make lint
```

## License

MIT License - see LICENSE file

## Contributing

Contributions welcome! Please:
- Run `make lint` and `make check` before submitting
- Add tests for new features
- Update documentation

## Links

- [GitHub Repository](https://github.com/rossigee/gnome-shell-balance-watch)
- [GNOME Extensions](https://extensions.gnome.org/)
- [GJS Documentation](https://gjs.guide/)