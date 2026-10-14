import { describe, expect, it } from 'vitest';
import {
  AdapterSessionManager,
  indexedDbAdapter,
  localStorageAdapter,
  sessionStorageAdapter,
  type WebStorageLike,
} from '../index.js';

function fakeStorage(): WebStorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe('storage adapters re-exported from the storage-adapters package', () => {
  it('exports the browser and IndexedDB adapters', () => {
    expect(typeof localStorageAdapter).toBe('function');
    expect(typeof sessionStorageAdapter).toBe('function');
    expect(typeof indexedDbAdapter).toBe('function');
  });

  it('sessionStorageAdapter saves and restores progress through AdapterSessionManager', async () => {
    const storage = fakeStorage();
    const first = await AdapterSessionManager.create(sessionStorageAdapter({ storage }));
    first.saveProgress('p2', { q1: 'x' });
    await first.flush();

    const second = await AdapterSessionManager.create(sessionStorageAdapter({ storage }));
    expect(second.loadProgress()).toEqual({ currentPageId: 'p2', answers: { q1: 'x' } });
  });

  it('names sessionStorage in its errors', async () => {
    const storage = fakeStorage();
    storage.getItem = () => {
      throw new Error('blocked');
    };
    const result = await sessionStorageAdapter({ storage }).get('k', {
      signal: new AbortController().signal,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sessionStorage');
  });
});
