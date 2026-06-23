// packages/core/src/session-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from './session-manager.js';
import type { StorageBackend } from './session-manager.js';

function makeStorage(): StorageBackend {
  const store: Record<string, string> = {};
  const keys: string[] = [];
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      if (!(k in store)) keys.push(k);
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
      const i = keys.indexOf(k);
      if (i >= 0) keys.splice(i, 1);
    },
    key: (i) => keys[i] ?? null,
    get length() {
      return keys.length;
    },
  };
}

function makeThrowingStorage(): StorageBackend {
  return {
    getItem: () => { throw new Error('Storage blocked'); },
    setItem: () => { throw new Error('Storage blocked'); },
    removeItem: () => { throw new Error('Storage blocked'); },
    key: () => null,
    get length() { return 0; },
  };
}

describe('SessionManager', () => {
  let storage: StorageBackend;
  let manager: SessionManager;

  beforeEach(() => {
    storage = makeStorage();
    manager = new SessionManager(storage);
  });

  it('generates a session id on construction', () => {
    expect(manager.getSessionId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('reuses the session id stored in storage', () => {
    const existing = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    storage.setItem('car:session-id', existing);
    const m2 = new SessionManager(storage);
    expect(m2.getSessionId()).toBe(existing);
  });

  it('reports storage as available', () => {
    expect(manager.isStorageAvailable).toBe(true);
  });

  it('reports storage as unavailable when storage throws', () => {
    const m = new SessionManager(makeThrowingStorage());
    expect(m.isStorageAvailable).toBe(false);
  });

  it('still generates a session id when storage is unavailable', () => {
    const m = new SessionManager(makeThrowingStorage());
    expect(m.getSessionId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('saves and loads progress', () => {
    manager.saveProgress('page-2', { q1: 'hello' });
    const loaded = manager.loadProgress();
    expect(loaded).toEqual({ currentPageId: 'page-2', answers: { q1: 'hello' } });
  });

  it('returns null when no progress saved', () => {
    expect(manager.loadProgress()).toBeNull();
  });

  it('saves and loads individual input values', () => {
    manager.saveInput('email', 'test@example.com');
    expect(manager.loadInput('email')).toBe('test@example.com');
  });

  it('saves and loads array input values', () => {
    manager.saveInput('colors', ['red', 'blue']);
    expect(manager.loadInput('colors')).toEqual(['red', 'blue']);
  });

  it('clears progress and input keys but not session id', () => {
    const sessionId = manager.getSessionId();
    manager.saveProgress('p1', { q1: 'a' });
    manager.saveInput('q1', 'a');
    manager.clearAll();
    expect(manager.loadProgress()).toBeNull();
    expect(manager.loadInput('q1')).toBeNull();
    expect(storage.getItem('car:session-id')).toBe(sessionId);
  });

  it('silently does nothing when storage unavailable', () => {
    const m = new SessionManager(makeThrowingStorage());
    expect(() => m.saveProgress('p1', {})).not.toThrow();
    expect(m.loadProgress()).toBeNull();
    expect(() => m.clearAll()).not.toThrow();
  });
});
