#!/usr/bin/env node
import { execSync } from 'child_process';
import { format } from '../src/format/Format';
import { getProvider, Providers } from '../src/providers/index';
import type { BalanceData, AccountOptions } from '../src/types/index';

interface AccountConfig extends AccountOptions {
  id: string;
}

interface CLIOptions {
  provider?: string;
  key?: string;
  extra: Record<string, string>;
  format?: string;
}

const DEFAULT_FORMAT = '{provider} {v} {cs}';

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const opts: CLIOptions = { extra: {} };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--provider') {
      opts.provider = args[++i];
    } else if (arg === '--key') {
      opts.key = args[++i];
    } else if (arg === '--format') {
      opts.format = args[++i];
    } else if (arg === '--extra') {
      const kv = args[++i];
      const [k, v] = kv.split('=', 2);
      if (k && v) {
        opts.extra[k] = v;
      }
    } else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return opts;
}

function listProviders(): string[] {
  return Object.keys(Providers).sort();
}

async function main() {
  const cliOpts = parseArgs();

  // If explicit provider/key provided, use standalone mode
  if (cliOpts.provider || cliOpts.key) {
    return standaloneMode(cliOpts);
  }

  // Otherwise try auto-discover mode
  return autoDiscoverMode();
}

async function standaloneMode(opts: CLIOptions) {
  // Get provider
  if (!opts.provider) {
    console.error('Error: --provider is required');
    console.error(`Valid providers: ${listProviders().join(', ')}`);
    process.exit(1);
  }

  let provider;
  try {
    provider = getProvider(opts.provider as any);
  } catch (e) {
    console.error(`Error: Unknown provider "${opts.provider}"`);
    console.error(`Valid providers: ${listProviders().join(', ')}`);
    process.exit(1);
  }

  // Get API key
  let apiKey = opts.key;
  if (!apiKey) {
    apiKey = process.env.BALANCE_WATCH_KEY;
  }
  if (!apiKey) {
    console.error('Error: --key is required or set BALANCE_WATCH_KEY env var');
    process.exit(1);
  }

  try {
    const balance = await fetchBalance(
      provider,
      opts.provider,
      apiKey,
      opts.extra,
      opts.format || DEFAULT_FORMAT,
    );
    console.log(balance);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

async function autoDiscoverMode() {
  const accounts = readAccountsFromGSettings();

  if (accounts.length === 0) {
    console.log('No accounts configured.');
    return;
  }

  console.log(`Checking ${accounts.length} account(s)...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const account of accounts) {
    try {
      const apiKey = retrieveApiKeyFromKeyring(account.id);

      if (!apiKey) {
        throw new Error('No API key found in keyring');
      }

      const provider = getProvider(account.provider as any);
      const balance = await fetchBalance(
        provider,
        account.provider,
        apiKey,
        account.extraParams || {},
        account.format || DEFAULT_FORMAT,
      );

      const label = account.label || account.id;
      const providerName = account.provider.toUpperCase();
      console.log(`${label} (${providerName}): ${balance}`);
      successCount++;
    } catch (error) {
      const label = account.label || account.id;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`${label}: ERROR - ${errorMsg}`);
      errorCount++;
    }
  }

  console.log(`\n${successCount} succeeded, ${errorCount} failed.`);
  process.exit(errorCount > 0 ? 1 : 0);
}

function readAccountsFromGSettings(): AccountConfig[] {
  try {
    // Try dconf first (more reliable when schema isn't in user's GSettings schema paths)
    let output: string;
    try {
      output = execSync('dconf read /org/gnome/shell/extensions/balance-watch/accounts', {
        encoding: 'utf-8',
      });
    } catch {
      // Fallback to gsettings
      output = execSync('gsettings get org.gnome.shell.extensions.balance-watch accounts', {
        encoding: 'utf-8',
      });
    }

    // Parse GVariant format: ['...', '...']
    const jsonStr = parseGVariantArray(output);
    const accountStrings = JSON.parse(jsonStr);

    const accounts: AccountConfig[] = [];
    for (const str of accountStrings) {
      try {
        accounts.push(JSON.parse(str) as AccountConfig);
      } catch (e) {
        console.error(`Warning: Failed to parse account config: ${String(e)}`);
      }
    }

    return accounts;
  } catch (error) {
    // Extension not installed or no accounts configured
    return [];
  }
}

function parseGVariantArray(output: string): string {
  // gsettings/dconf outputs in GVariant format, e.g.: ['item1', 'item2'] or @as ['item1', 'item2']
  const trimmed = output.trim();

  // Remove the @as prefix if present
  let content = trimmed.replace(/^@as\s*/, '').trim();
  if (content.startsWith('[') && content.endsWith(']')) {
    content = content.slice(1, -1);
  }

  // Split by comma, handling quoted strings
  const items: string[] = [];
  let current = '';
  let inQuote = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];

    if (char === "'" && (i === 0 || content[i - 1] !== '\\')) {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      items.push(current.trim());
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  // Convert single-quoted strings to JSON double-quoted strings
  const jsonItems = items.map((item) => {
    const trimmed = item.trim();
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      const content = trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"');
      return `"${content}"`;
    }
    return trimmed;
  });

  return `[${jsonItems.join(',')}]`;
}

async function fetchBalance(
  provider: any,
  providerName: string,
  apiKey: string,
  extraParams: Record<string, string>,
  formatStr: string,
): Promise<string> {
  const options: AccountOptions = {
    provider: providerName,
    extraParams: Object.keys(extraParams).length > 0 ? extraParams : undefined,
  };

  const url = provider.getUrl(options, apiKey);
  const method = provider.getMethod();
  const headers = provider.getHeaders(apiKey);
  const body = provider.getBody(apiKey, options);

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  const responseData = await response.json();
  const balanceData = provider.parseData(responseData) as BalanceData;

  return format(balanceData, provider.apiName, formatStr);
}

function retrieveApiKeyFromKeyring(accountId: string): string | null {
  try {
    // Try secret-tool first (most reliable)
    try {
      const output = execSync(`secret-tool lookup account-id ${accountId}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return output.trim() || null;
    } catch {
      // Fallback to Python secretstorage if available
      const pythonScript = `
import secretstorage
bus = secretstorage.dbus_init()
collection = secretstorage.get_default_collection(bus)
if collection:
  for item in collection.get_all_items():
    attrs = item.get_attributes()
    if attrs.get('account-id') == "${accountId.replace(/"/g, '\\"')}":
      secret = item.get_secret()
      print(secret.decode('utf-8') if isinstance(secret, bytes) else secret)
      exit(0)
`;
      const output = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return output.trim() || null;
    }
  } catch (error) {
    return null;
  }
}

main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`Fatal error: ${msg}`);
  process.exit(1);
});
