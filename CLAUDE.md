# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

GNOME Shell extension for displaying AI service account balances in the top panel. Written in TypeScript with GJS bindings, supporting multiple providers (OpenAI, Anthropic, Groq, OpenRouter, OpenCode Zen, PPQ.AI, xAI).

## Essential Commands

### Development
```bash
make              # Build and create archive
make build        # Install deps, build dist/, create archive
make install      # Install extension to ~/.local/share/gnome-shell/extensions/
make restart      # Restart GNOME Shell (after install)
make watch        # Watch mode for development
make prefs        # Open preferences dialog
```

### Quality Checks
```bash
make lint         # Run ESLint
make check        # TypeScript type checking
npm test          # Run tests
```

### Debugging
```bash
journalctl /usr/bin/gnome-shell -f            # Monitor extension logs
npm run check-balances                        # Check all configured accounts (requires make install)
npm run check-balances -- --provider openai --key sk-...  # Test a specific provider/key
```

## Architecture

### Core Components
- **`src/extension.ts`**: Main extension entry point, manages panel indicators
- **`src/prefs/prefs.ts`**: Preferences dialog for account configuration
- **`src/ApiService.ts`**: Manages HTTP polling loops and subscriber notifications
- **`src/KeyringManager.ts`**: Secure API key storage via GNOME Keyring
- **`src/providers/`**: Provider implementations (OpenAI, Anthropic, etc.)

### Provider Pattern
All providers implement `BaseProvider.Api` with:
- `getUrl()`: Build API endpoint
- `getMethod()`: GET or POST
- `getHeaders()`: Authentication headers
- `getBody()`: Request body (for POST)
- `parseData()`: Extract balance from API response

### Keyring Integration
API keys are stored securely in GNOME Keyring using `libsecret`:
- Each account has a unique ID used as the keyring attribute
- Keys are stored with label `Balance Watch - {accountId}`
- Retrieved on extension load and passed to ApiService

### Build System
- TypeScript compiled via Rollup to `dist/`
- Resources (schemas, translations) copied from `res/`
- Git version automatically injected into metadata
- Creates `.zip` archive for distribution

### State Management
- Uses GSettings for persistence (`org.gnome.shell.extensions.balance-watch`)
- Per-provider error states with rate limiting detection
- Circuit breaker pattern prevents repeated failed requests

## Key Development Notes
- Extension supports GNOME Shell versions 46-50
- Uses `@girs` type definitions for GNOME APIs
- Uses `@girs/libsecret-0` for secure key storage
- i18n support with gettext
- API keys stored in GNOME Keyring (not GSettings)
- Per-provider configurable polling intervals (default 5 min)