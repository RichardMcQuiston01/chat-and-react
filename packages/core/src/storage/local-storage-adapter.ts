import type {
  StorageAdapter,
  StoredValue,
  StoreErrorCode,
  StoreResult,
} from '@richardmcquiston01/storage-adapters';

/** The subset of the Web Storage API this adapter uses. */
export interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The subset of `window` used to hear about changes made in other tabs. */
export interface StorageEventTarget {
  addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
}

export interface LocalStorageAdapterOptions {
  /** Defaults to `globalThis.localStorage`. */
  storage?: WebStorageLike;
  /** Defaults to `globalThis.window`. Without one, `subscribe` does nothing. */
  events?: StorageEventTarget;
}

/** What is written to Web Storage: the value plus a counter used as its revision. */
interface Envelope {
  r: string;
  v: string;
}

function parseEnvelope(raw: string | null): Envelope | null | undefined {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    if (typeof parsed.r === 'string' && typeof parsed.v === 'string') {
      return { r: parsed.r, v: parsed.v };
    }
  } catch {
    // Falls through to the corrupt result below.
  }
  return undefined;
}

function classifyError(error: unknown): StoreErrorCode {
  const name: string = error instanceof Error ? error.name : '';
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') return 'quota';
  if (name === 'SecurityError') return 'forbidden';
  return 'unavailable';
}

function failure<T>(code: StoreErrorCode, key: string, detail: string): StoreResult<T> {
  return { ok: false, code, error: `localStorage ${detail} for key "${key}"` };
}

/**
 * A `StorageAdapter` over `localStorage` (or any Web Storage object). Each value is
 * stored with a counter revision, so `set` with `ifRevision` reports `conflict` when
 * another tab wrote first, and `subscribe` reports changes made in other tabs.
 */
export function localStorageAdapter(options: LocalStorageAdapterOptions = {}): StorageAdapter {
  const resolveStorage = (): WebStorageLike | null => {
    try {
      return options.storage ?? globalThis.localStorage ?? null;
    } catch {
      // Reading `localStorage` itself throws when storage is blocked.
      return null;
    }
  };

  const read = (key: string): StoreResult<Envelope | null> => {
    const storage: WebStorageLike | null = resolveStorage();
    if (!storage) return failure('unavailable', key, 'is not available');
    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch (error: unknown) {
      return failure(classifyError(error), key, `could not be read (${String(error)})`);
    }
    const envelope: Envelope | null | undefined = parseEnvelope(raw);
    if (envelope === undefined) {
      return failure('corrupt', key, 'holds a value that is not a stored envelope');
    }
    return { ok: true, value: envelope };
  };

  const aborted = <T>(key: string, signal: AbortSignal): StoreResult<T> | null =>
    signal.aborted ? failure('unavailable', key, 'request was aborted') : null;

  return {
    async get(key, { signal }) {
      const stopped: StoreResult<StoredValue | null> | null = aborted(key, signal);
      if (stopped) return stopped;
      const result: StoreResult<Envelope | null> = read(key);
      if (!result.ok) return result;
      return {
        ok: true,
        value: result.value ? { value: result.value.v, revision: result.value.r } : null,
      };
    },

    async set(key, value, { signal, ifRevision }) {
      const stopped: StoreResult<StoredValue> | null = aborted(key, signal);
      if (stopped) return stopped;
      const current: StoreResult<Envelope | null> = read(key);
      // A corrupt value is replaced; an unreachable store is an error.
      if (!current.ok && current.code !== 'corrupt') return current;
      const existing: Envelope | null = current.ok ? current.value : null;
      if (ifRevision !== undefined && existing && existing.r !== ifRevision) {
        return failure(
          'conflict',
          key,
          `holds revision ${existing.r}, but revision ${ifRevision} was expected`,
        );
      }
      const revision: string = String((Number(existing?.r) || 0) + 1);
      const storage: WebStorageLike | null = resolveStorage();
      if (!storage) return failure('unavailable', key, 'is not available');
      try {
        storage.setItem(key, JSON.stringify({ r: revision, v: value } satisfies Envelope));
      } catch (error: unknown) {
        return failure(classifyError(error), key, `could not be written (${String(error)})`);
      }
      return { ok: true, value: { value, revision } };
    },

    async remove(key, { signal }) {
      const stopped: StoreResult<null> | null = aborted(key, signal);
      if (stopped) return stopped;
      const storage: WebStorageLike | null = resolveStorage();
      if (!storage) return failure('unavailable', key, 'is not available');
      try {
        storage.removeItem(key);
      } catch (error: unknown) {
        return failure(classifyError(error), key, `could not be removed (${String(error)})`);
      }
      return { ok: true, value: null };
    },

    subscribe(key, onChange) {
      const target: StorageEventTarget | undefined =
        options.events ?? (globalThis.window as StorageEventTarget | undefined);
      if (!target) return () => {};
      const listener = (event: StorageEvent): void => {
        if (event.key !== key) return;
        const envelope: Envelope | null | undefined = parseEnvelope(event.newValue);
        if (envelope === undefined) return;
        onChange(envelope ? { value: envelope.v, revision: envelope.r } : null);
      };
      target.addEventListener('storage', listener);
      return () => target.removeEventListener('storage', listener);
    },
  };
}
