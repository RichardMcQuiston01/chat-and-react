import { memoryAdapter, type StorageAdapter } from '@richardmcquiston01/storage-adapters';
import { describe, expect, it, vi } from 'vitest';
import type { ChatError } from '../types.js';
import { AdapterSessionManager } from './adapter-session-manager.js';

/** Wraps an adapter so individual operations can be made to fail. */
function failing(
  adapter: StorageAdapter,
  failOn: Partial<Record<'get' | 'set' | 'remove', string>>,
): StorageAdapter {
  const fail = (code: string) => ({ ok: false as const, code: code as 'unavailable', error: 'x' });
  return {
    ...adapter,
    get: async (key, options) => (failOn.get ? fail(failOn.get) : adapter.get(key, options)),
    set: async (key, value, options) =>
      failOn.set ? fail(failOn.set) : adapter.set(key, value, options),
    remove: async (key, options) =>
      failOn.remove ? fail(failOn.remove) : (adapter.remove?.(key, options) as never),
  };
}

describe('AdapterSessionManager', () => {
  it('creates a session id and keeps it across managers', async () => {
    const adapter = memoryAdapter();
    const first = await AdapterSessionManager.create(adapter);
    const second = await AdapterSessionManager.create(adapter);
    expect(first.getSessionId()).toBe(second.getSessionId());
    expect(first.isStorageAvailable).toBe(true);
  });

  it('restores saved progress and inputs in a new manager', async () => {
    const adapter = memoryAdapter();
    const first = await AdapterSessionManager.create(adapter);
    first.saveProgress('p2', { q1: 'hello' });
    first.saveInput('q2', ['a', 'b']);
    await first.flush();

    const second = await AdapterSessionManager.create(adapter);
    expect(second.loadProgress()).toEqual({ currentPageId: 'p2', answers: { q1: 'hello' } });
    expect(second.loadInput('q2')).toEqual(['a', 'b']);
    expect(second.loadInput('missing')).toBeNull();
  });

  it('clearAll removes saved progress', async () => {
    const adapter = memoryAdapter();
    const first = await AdapterSessionManager.create(adapter);
    first.saveProgress('p1', {});
    await first.flush();
    first.clearAll();
    await first.flush();

    const second = await AdapterSessionManager.create(adapter);
    expect(second.loadProgress()).toBeNull();
  });

  it('runs from memory and reports once when storage is unreachable', async () => {
    const errors: ChatError[] = [];
    const adapter = failing(memoryAdapter(), { get: 'unavailable' });
    const session = await AdapterSessionManager.create(adapter, { onError: (e) => errors.push(e) });
    expect(session.isStorageAvailable).toBe(false);
    session.saveProgress('p1', { q1: 'x' });
    expect(session.loadProgress()).toEqual({ currentPageId: 'p1', answers: { q1: 'x' } });
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('STORAGE_UNAVAILABLE');
  });

  it('reports a failed save and keeps the unsaved data for the next attempt', async () => {
    const errors: ChatError[] = [];
    const base = memoryAdapter();
    let failSets = false;
    const adapter: StorageAdapter = {
      ...base,
      set: async (key, value, options) =>
        failSets && key.startsWith('car:session:')
          ? { ok: false, code: 'quota', error: 'full' }
          : base.set(key, value, options),
    };
    const session = await AdapterSessionManager.create(adapter, { onError: (e) => errors.push(e) });
    failSets = true;
    session.saveInput('q1', 'a');
    await session.flush();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('full');

    failSets = false;
    session.saveInput('q2', 'b');
    await session.flush();
    const reloaded = await AdapterSessionManager.create(base);
    expect(reloaded.loadInput('q1')).toBe('a');
    expect(reloaded.loadInput('q2')).toBe('b');
  });

  it('merges inputs from two tabs without losing either', async () => {
    const adapter = memoryAdapter();
    const tabA = await AdapterSessionManager.create(adapter);
    const tabB = await AdapterSessionManager.create(adapter);
    tabA.saveInput('qa', 'from A');
    await tabA.flush();
    tabB.saveInput('qb', 'from B');
    await tabB.flush();

    const reloaded = await AdapterSessionManager.create(adapter);
    expect(reloaded.loadInput('qa')).toBe('from A');
    expect(reloaded.loadInput('qb')).toBe('from B');
    expect(tabB.loadInput('qa')).toBe('from A');
  });

  it('does not overwrite newer progress from another tab when this tab only typed', async () => {
    const adapter = memoryAdapter();
    const stale = await AdapterSessionManager.create(adapter);
    const active = await AdapterSessionManager.create(adapter);
    active.saveProgress('p3', { q1: 'done' });
    await active.flush();

    stale.saveInput('q9', 'typing');
    await stale.flush();

    const reloaded = await AdapterSessionManager.create(adapter);
    expect(reloaded.loadProgress()).toEqual({ currentPageId: 'p3', answers: { q1: 'done' } });
    expect(reloaded.loadInput('q9')).toBe('typing');
    expect(stale.loadProgress()?.currentPageId).toBe('p3');
  });

  it('notifies and updates its copy when another tab changes progress (subscribe)', async () => {
    const adapter = memoryAdapter();
    const onExternalChange = vi.fn();
    const watcher = await AdapterSessionManager.create(adapter, { onExternalChange });
    const other = await AdapterSessionManager.create(adapter);
    other.saveProgress('p2', { q1: 'x' });
    await other.flush();

    expect(onExternalChange).toHaveBeenCalledWith({ currentPageId: 'p2', answers: { q1: 'x' } });
    expect(watcher.loadProgress()?.currentPageId).toBe('p2');

    watcher.dispose();
    other.saveProgress('p3', {});
    await other.flush();
    expect(onExternalChange).toHaveBeenCalledTimes(1);
  });

  it('gives up and reports after repeated revision conflicts', async () => {
    const errors: ChatError[] = [];
    const base = memoryAdapter();
    const adapter: StorageAdapter = {
      ...base,
      set: async (key, value, options) =>
        key.startsWith('car:session:')
          ? { ok: false, code: 'conflict', error: 'always' }
          : base.set(key, value, options),
    };
    const session = await AdapterSessionManager.create(adapter, { onError: (e) => errors.push(e) });
    session.saveInput('q1', 'a');
    await session.flush();
    expect(errors.some((e) => e.message.includes('revision conflicts'))).toBe(true);
  });

  it('coalesces saves made while one is in flight', async () => {
    const base = memoryAdapter();
    const set = vi.fn(base.set);
    const session = await AdapterSessionManager.create({ ...base, set });
    set.mockClear();
    session.saveInput('q1', 'a');
    session.saveInput('q1', 'ab');
    session.saveInput('q1', 'abc');
    await session.flush();
    expect(set.mock.calls.length).toBeLessThanOrEqual(2);
    const reloaded = await AdapterSessionManager.create(base);
    expect(reloaded.loadInput('q1')).toBe('abc');
  });
});
