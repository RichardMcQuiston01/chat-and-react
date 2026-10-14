import type { BrowserContext, Page } from 'playwright';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { type Harness, startHarness } from '../src/harness.js';

let harness: Harness;
const contexts: BrowserContext[] = [];

beforeAll(async () => {
  harness = await startHarness();
});

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close()));
});

afterAll(async () => {
  await harness.close();
});

/** Two or more tabs of one browser context, so they share storage the way real tabs do. */
async function openTabs(count: number): Promise<Page[]> {
  const context = await harness.newContext();
  contexts.push(context);
  const tabs: Page[] = [];
  for (let index = 0; index < count; index += 1) {
    const tab = await context.newPage();
    tab.on('pageerror', (error) => {
      throw error;
    });
    await tab.goto(`${harness.baseUrl}/`);
    tabs.push(tab);
  }
  return tabs;
}

function first(tabs: Page[]): Page {
  const tab = tabs[0];
  if (!tab) throw new Error('expected at least one tab');
  return tab;
}

function second(tabs: Page[]): Page {
  const tab = tabs[1];
  if (!tab) throw new Error('expected at least two tabs');
  return tab;
}

describe('indexedDbAdapter in a real browser', () => {
  it('keeps revisions and reports a conflict for a stale write', async () => {
    const tabs = await openTabs(1);
    const result = await first(tabs).evaluate(async () => {
      const adapter = window.lib.indexedDbAdapter({ databaseName: 'revisions-test' });
      const signal = new AbortController().signal;
      const one = await adapter.set('k', 'one', { signal });
      const two = await adapter.set('k', 'two', { signal, ifRevision: '1' });
      const stale = await adapter.set('k', 'three', { signal, ifRevision: '1' });
      const read = await adapter.get('k', { signal });
      return { one, two, stale, read };
    });
    expect(result.one).toEqual({ ok: true, value: { value: 'one', revision: '1' } });
    expect(result.two).toEqual({ ok: true, value: { value: 'two', revision: '2' } });
    expect(result.stale).toMatchObject({ ok: false, code: 'conflict' });
    expect(result.read).toEqual({ ok: true, value: { value: 'two', revision: '2' } });
  });

  it('tells another tab about a write', async () => {
    const tabs = await openTabs(2);
    await second(tabs).evaluate(() => {
      const events: unknown[] = [];
      Object.assign(window, { events });
      const adapter = window.lib.indexedDbAdapter({ databaseName: 'subscribe-test' });
      adapter.subscribe?.('k', (stored) => events.push(stored));
    });
    await first(tabs).evaluate(async () => {
      const adapter = window.lib.indexedDbAdapter({ databaseName: 'subscribe-test' });
      await adapter.set('k', 'from the other tab', { signal: new AbortController().signal });
    });
    await second(tabs).waitForFunction(
      () => (window as unknown as { events: unknown[] }).events.length > 0,
    );
    const events = await second(tabs).evaluate(
      () => (window as unknown as { events: unknown[] }).events,
    );
    expect(events[0]).toEqual({ value: 'from the other tab', revision: '1' });
  });
});

describe('IndexedDbErrorAdapter, as shown in the docs', () => {
  it('creates its store in onupgradeneeded and saves an error with an id and timestamp', async () => {
    const tabs = await openTabs(1);
    const records = await first(tabs).evaluate(
      () =>
        new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
          const { createErrorLogStore, IndexedDbErrorAdapter } = window.lib;
          // The same steps as docs/optional-adapters.md.
          const request = indexedDB.open('my-app', 1);
          request.onupgradeneeded = () => createErrorLogStore(request.result);
          request.onerror = () => reject(request.error);
          request.onsuccess = async () => {
            const database = request.result;
            const adapter = new IndexedDbErrorAdapter(database);
            const result = await adapter.log({ code: 'ADAPTER_ERROR', message: 'boom' });
            if (!result.ok) {
              reject(new Error(result.error));
              return;
            }
            const all = database.transaction('error_log').objectStore('error_log').getAll();
            all.onsuccess = () => resolve(all.result as Array<Record<string, unknown>>);
            all.onerror = () => reject(all.error);
          };
        }),
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ code: 'ADAPTER_ERROR', message: 'boom' });
    expect(records[0]?.['id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof records[0]?.['timestamp']).toBe('string');
  });
});

describe('cross-tab sync with localStorageAdapter', () => {
  it('tells another tab when progress is saved, and when the form is finished', async () => {
    const tabs = await openTabs(2);
    // The tab that listens creates the session first, so both tabs end up with the same session id.
    await second(tabs).evaluate(async () => {
      const changes: unknown[] = [];
      Object.assign(window, { changes });
      const session = await window.lib.AdapterSessionManager.create(
        window.lib.localStorageAdapter(),
        {
          onExternalChange: (progress) => changes.push(progress),
        },
      );
      Object.assign(window, { session });
    });
    await first(tabs).evaluate(async () => {
      const session = await window.lib.AdapterSessionManager.create(
        window.lib.localStorageAdapter(),
      );
      Object.assign(window, { session });
      session.saveProgress('page-2', { q1: 'hello' });
      await session.flush();
    });
    await second(tabs).waitForFunction(
      () => (window as unknown as { changes: unknown[] }).changes.length >= 1,
    );
    const afterSave = await second(tabs).evaluate(() => ({
      changes: (window as unknown as { changes: unknown[] }).changes,
      progress: (
        window as unknown as { session: { loadProgress(): unknown } }
      ).session.loadProgress(),
    }));
    expect(afterSave.changes[0]).toEqual({ currentPageId: 'page-2', answers: { q1: 'hello' } });
    expect(afterSave.progress).toEqual({ currentPageId: 'page-2', answers: { q1: 'hello' } });

    // Finishing the form clears the session, and the other tab hears that too.
    await first(tabs).evaluate(async () => {
      const session = (
        window as unknown as { session: { clearAll(): void; flush(): Promise<void> } }
      ).session;
      session.clearAll();
      await session.flush();
    });
    await second(tabs).waitForFunction(
      () => (window as unknown as { changes: unknown[] }).changes.length >= 2,
    );
    const changes = await second(tabs).evaluate(
      () => (window as unknown as { changes: unknown[] }).changes,
    );
    expect(changes[1]).toBeNull();
  });

  it('keeps both tabs answers when they type different questions', async () => {
    const tabs = await openTabs(3);
    const setUp = async (tab: Page) =>
      tab.evaluate(async () => {
        const session = await window.lib.AdapterSessionManager.create(
          window.lib.localStorageAdapter(),
        );
        Object.assign(window, { session });
      });
    await setUp(first(tabs));
    await setUp(second(tabs));
    await first(tabs).evaluate(async () => {
      const session = (
        window as unknown as {
          session: { saveInput(id: string, value: string): void; flush(): Promise<void> };
        }
      ).session;
      session.saveInput('qa', 'from A');
      await session.flush();
    });
    await second(tabs).evaluate(async () => {
      const session = (
        window as unknown as {
          session: { saveInput(id: string, value: string): void; flush(): Promise<void> };
        }
      ).session;
      session.saveInput('qb', 'from B');
      await session.flush();
    });
    const third = tabs[2];
    if (!third) throw new Error('expected a third tab');
    const restored = await third.evaluate(async () => {
      const session = await window.lib.AdapterSessionManager.create(
        window.lib.localStorageAdapter(),
      );
      return { qa: session.loadInput('qa'), qb: session.loadInput('qb') };
    });
    expect(restored).toEqual({ qa: 'from A', qb: 'from B' });
  });
});

describe('sessionStorageAdapter', () => {
  it('is private to its tab, unlike localStorageAdapter', async () => {
    const tabs = await openTabs(2);
    const write = (tab: Page) =>
      tab.evaluate(async () => {
        const signal = new AbortController().signal;
        await window.lib.sessionStorageAdapter().set('shared?', 'from tab 1', { signal });
        await window.lib.localStorageAdapter().set('shared?', 'from tab 1', { signal });
      });
    await write(first(tabs));
    const seen = await second(tabs).evaluate(async () => {
      const signal = new AbortController().signal;
      return {
        session: await window.lib.sessionStorageAdapter().get('shared?', { signal }),
        local: await window.lib.localStorageAdapter().get('shared?', { signal }),
      };
    });
    expect(seen.session).toEqual({ ok: true, value: null });
    expect(seen.local).toMatchObject({ ok: true, value: { value: 'from tab 1' } });
  });
});
