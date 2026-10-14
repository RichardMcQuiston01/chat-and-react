import { describe, expect, it, vi } from 'vitest';
import {
  localStorageAdapter,
  type StorageEventTarget,
  type WebStorageLike,
} from './local-storage-adapter.js';

const signal: AbortSignal = new AbortController().signal;

function makeStorage(): WebStorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe('localStorageAdapter', () => {
  it('returns null for a missing key', async () => {
    const adapter = localStorageAdapter({ storage: makeStorage() });
    expect(await adapter.get('a', { signal })).toEqual({ ok: true, value: null });
  });

  it('stores a value with an incrementing revision', async () => {
    const adapter = localStorageAdapter({ storage: makeStorage() });
    const first = await adapter.set('a', 'one', { signal });
    const second = await adapter.set('a', 'two', { signal });
    expect(first).toEqual({ ok: true, value: { value: 'one', revision: '1' } });
    expect(second).toEqual({ ok: true, value: { value: 'two', revision: '2' } });
    expect(await adapter.get('a', { signal })).toEqual({
      ok: true,
      value: { value: 'two', revision: '2' },
    });
  });

  it('reports a conflict when the stored revision differs from ifRevision', async () => {
    const adapter = localStorageAdapter({ storage: makeStorage() });
    await adapter.set('a', 'one', { signal });
    await adapter.set('a', 'two', { signal });
    const result = await adapter.set('a', 'three', { signal, ifRevision: '1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('conflict');
      expect(result.error).toContain('"a"');
    }
  });

  it('accepts a write whose ifRevision matches', async () => {
    const adapter = localStorageAdapter({ storage: makeStorage() });
    await adapter.set('a', 'one', { signal });
    const result = await adapter.set('a', 'two', { signal, ifRevision: '1' });
    expect(result.ok).toBe(true);
  });

  it('maps a full store to the quota code', async () => {
    const storage = makeStorage();
    storage.setItem = () => {
      throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    };
    const result = await localStorageAdapter({ storage }).set('a', 'x', { signal });
    expect(result.ok === false && result.code).toBe('quota');
  });

  it('maps blocked storage to forbidden', async () => {
    const storage = makeStorage();
    storage.getItem = () => {
      throw Object.assign(new Error('denied'), { name: 'SecurityError' });
    };
    const result = await localStorageAdapter({ storage }).get('a', { signal });
    expect(result.ok === false && result.code).toBe('forbidden');
  });

  it('reports a stored value that is not an envelope as corrupt on read, and replaces it on write', async () => {
    const storage = makeStorage();
    storage.store.set('a', 'not json');
    const adapter = localStorageAdapter({ storage });
    const read = await adapter.get('a', { signal });
    expect(read.ok === false && read.code).toBe('corrupt');
    expect((await adapter.set('a', 'fresh', { signal })).ok).toBe(true);
  });

  it('removes a key', async () => {
    const storage = makeStorage();
    const adapter = localStorageAdapter({ storage });
    await adapter.set('a', 'one', { signal });
    await adapter.remove?.('a', { signal });
    expect(storage.store.has('a')).toBe(false);
  });

  it('does nothing when the request was already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await localStorageAdapter({ storage: makeStorage() }).get('a', {
      signal: controller.signal,
    });
    expect(result.ok).toBe(false);
  });

  it('subscribe reports changes to its key made in another tab', () => {
    const listeners = new Set<(event: StorageEvent) => void>();
    const events: StorageEventTarget = {
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
    };
    const adapter = localStorageAdapter({ storage: makeStorage(), events });
    const onChange = vi.fn();
    const unsubscribe = adapter.subscribe?.('a', onChange) ?? (() => {});

    for (const listener of listeners) {
      listener({ key: 'a', newValue: JSON.stringify({ r: '4', v: 'hi' }) } as StorageEvent);
      listener({ key: 'other', newValue: JSON.stringify({ r: '1', v: 'x' }) } as StorageEvent);
      listener({ key: 'a', newValue: null } as StorageEvent);
    }
    expect(onChange).toHaveBeenNthCalledWith(1, { value: 'hi', revision: '4' });
    expect(onChange).toHaveBeenNthCalledWith(2, null);
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(listeners.size).toBe(0);
  });
});
