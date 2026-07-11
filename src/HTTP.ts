import Soup from '@girs/soup-3.0';
import Gio from '@girs/gio-2.0';
import GLib from '@girs/glib-2.0';
import { ExtensionMetadata } from '@gnome-shell/extensions/extension';

const { Bytes } = GLib;

function _promisify(cls: any, function_name: string) {
  Gio._promisify(cls, function_name, undefined as unknown as string);
}

_promisify(Soup.Session.prototype, 'send_and_read_async');
_promisify(Gio.OutputStream.prototype, 'write_bytes_async');
_promisify(Gio.Subprocess.prototype, 'wait_check_async');

const STATUS_TOO_MANY_REQUESTS = 429;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;

export class HTTPError extends Error {
  constructor(
    public override message: string,
    public soupMessage: Soup.Message,
  ) {
    super(message);
    this.soupMessage = soupMessage;
  }

  format(sep = ' '): string {
    return [
      'message=' + this.message,
      'status_code=' + this.soupMessage.status_code,
      'reason_phrase=' + this.soupMessage.reason_phrase,
      'method=' + this.soupMessage.method,
      'uri=' + this.soupMessage.uri.to_string(),
    ].join(sep);
  }

  override toString(): string {
    return this.format();
  }
}

export function isErrTooManyRequests(err: HTTPError): boolean {
  return !!(
    err.soupMessage &&
    err.soupMessage.status_code &&
    Number(err.soupMessage.status_code) === STATUS_TOO_MANY_REQUESTS
  );
}

export function isErrUnauthorized(err: HTTPError): boolean {
  return !!(
    err.soupMessage &&
    err.soupMessage.status_code &&
    (Number(err.soupMessage.status_code) === STATUS_UNAUTHORIZED ||
      Number(err.soupMessage.status_code) === STATUS_FORBIDDEN)
  );
}

function getExtensionVersion(metadata: ExtensionMetadata & Record<string, unknown>) {
  if (metadata['git-version']) {
    return 'git-' + metadata['git-version'];
  } else if (metadata['version']) {
    return 'v' + metadata['version'];
  } else {
    return 'unknown';
  }
}

export function getDefaultUserAgent(metadata: ExtensionMetadata, gnomeVersion: string): string {
  const repository = 'http://github.com/rossigee/gnome-shell-balance-watch';
  const version = getExtensionVersion(metadata as ExtensionMetadata & Record<string, unknown>);
  return `gnome-shell-balance-watch/${version}/Gnome${gnomeVersion} (${repository})`;
}

let _session: Soup.Session | null = null;

export function destroySession(): void {
  if (_session) {
    _session.abort();
    _session = null;
  }
}

export function destroy(): void {
  destroySession();
}

export async function getJSON(
  url: string,
  {
    userAgent,
    headers,
    cancellable,
  }: {
    userAgent: string;
    headers?: Record<string, string>;
    cancellable: Gio.Cancellable | null;
  },
): Promise<unknown> {
  if (!_session) {
    _session = new Soup.Session({
      user_agent: userAgent,
      timeout: 30,
    });
  }

  const message = Soup.Message.new('GET', url);

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      message.request_headers.append(key, value);
    });
  }

  const result = await _session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable);
  const { status_code } = message;
  if (status_code !== Soup.Status.OK) {
    throw new HTTPError('unexpected status', message);
  }

  const data = result.get_data();
  if (!data) {
    throw new HTTPError('no result data', message);
  }

  try {
    const string = new TextDecoder().decode(data);
    return JSON.parse(string);
  } catch {
    throw new HTTPError('json parse error', message);
  }
}

export async function postJSON(
  url: string,
  {
    userAgent,
    headers,
    body,
    cancellable,
  }: {
    userAgent: string;
    headers?: Record<string, string>;
    body: string;
    cancellable: Gio.Cancellable | null;
  },
): Promise<unknown> {
  if (!_session) {
    _session = new Soup.Session({
      user_agent: userAgent,
      timeout: 30,
    });
  }

  const message = Soup.Message.new('POST', url);

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      message.request_headers.append(key, value);
    });
  }

  message.set_request_body_from_bytes(
    'application/json',
    new Bytes(new TextEncoder().encode(body)),
  );

  const result = await _session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable);
  const { status_code } = message;
  if (status_code !== Soup.Status.OK) {
    throw new HTTPError('unexpected status', message);
  }

  const data = result.get_data();
  if (!data) {
    throw new HTTPError('no result data', message);
  }

  try {
    const string = new TextDecoder().decode(data);
    return JSON.parse(string);
  } catch {
    throw new HTTPError('json parse error', message);
  }
}
