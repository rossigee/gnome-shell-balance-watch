import GLib from '@girs/glib-2.0';

type SourceId = number;

export function idleAdd(callback: () => void): SourceId {
  return GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
    callback();
    return GLib.SOURCE_CONTINUE;
  });
}

export function timeoutAdd(milliseconds: number, callback: () => void): SourceId {
  return GLib.timeout_add(GLib.PRIORITY_DEFAULT, milliseconds, () => {
    callback();
    return GLib.SOURCE_REMOVE;
  });
}

export function timeoutRemove(sourceId: SourceId): void {
  GLib.source_remove(sourceId);
}

export function removeAllTimeouts(): void {
  // Intentionally empty - GLib handles this on extension disable
}