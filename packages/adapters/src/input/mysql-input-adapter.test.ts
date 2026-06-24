import { describe, it, expect, vi } from 'vitest';
import { MySqlInputAdapter } from './mysql-input-adapter.js';

const SCHEMA = { 'x-chat-version': '1', 'x-chat-pages': [] };

describe('MySqlInputAdapter', () => {
  it('returns the schema row fetched from the database', async () => {
    const execute = vi.fn().mockResolvedValue([[SCHEMA], []]);
    const adapter = await MySqlInputAdapter.create({ execute }, 'SELECT schema FROM schemas WHERE id = ?', [1]);

    expect(execute).toHaveBeenCalledWith('SELECT schema FROM schemas WHERE id = ?', [1]);
    expect(adapter.transform(null)).toBe(SCHEMA);
  });

  it('ignores the raw argument and always returns the cached schema', async () => {
    const execute = vi.fn().mockResolvedValue([[SCHEMA], []]);
    const adapter = await MySqlInputAdapter.create({ execute }, 'SELECT schema FROM schemas');

    expect(adapter.transform('anything')).toBe(SCHEMA);
    expect(adapter.transform(undefined)).toBe(SCHEMA);
  });

  it('throws when the query returns no rows', async () => {
    const execute = vi.fn().mockResolvedValue([[], []]);

    await expect(
      MySqlInputAdapter.create({ execute }, 'SELECT schema FROM schemas WHERE id = ?', [99]),
    ).rejects.toThrow('MySqlInputAdapter: query returned no rows');
  });
});
