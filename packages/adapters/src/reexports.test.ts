import { describe, expect, it } from 'vitest';
import {
  buildCreateErrorLogTableSql,
  CompositeErrorAdapter,
  createErrorLogStore,
  FlatFileErrorAdapter,
  fileAdapter,
  IndexedDbErrorAdapter,
  JsonFileErrorAdapter,
  jsonFileAdapter,
  MongoDbErrorAdapter,
  SqliteErrorAdapter,
  sqliteAdapter,
  WebhookErrorAdapter,
  WebStorageErrorAdapter,
} from './index.js';

describe('adapters re-exported from error-log-adapter and storage-adapters', () => {
  it('exports every error-log adapter and helper', () => {
    for (const exported of [
      CompositeErrorAdapter,
      FlatFileErrorAdapter,
      IndexedDbErrorAdapter,
      JsonFileErrorAdapter,
      MongoDbErrorAdapter,
      SqliteErrorAdapter,
      WebhookErrorAdapter,
      WebStorageErrorAdapter,
      buildCreateErrorLogTableSql,
      createErrorLogStore,
    ]) {
      expect(typeof exported).toBe('function');
    }
  });

  it('exports the injected-driver storage adapters', () => {
    expect(typeof fileAdapter).toBe('function');
    expect(typeof jsonFileAdapter).toBe('function');
    expect(typeof sqliteAdapter).toBe('function');
  });

  it('WebStorageErrorAdapter appends entries as JSON and reports success', async () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    const result = await new WebStorageErrorAdapter(storage, { key: 'errors' }).log({
      code: 'ADAPTER_ERROR',
      message: 'boom',
    });
    expect(result).toEqual({ ok: true });
    const records = JSON.parse(store.get('errors') ?? '[]') as Array<{ message: string }>;
    expect(records).toHaveLength(1);
    expect(records[0]?.message).toBe('boom');
  });
});
