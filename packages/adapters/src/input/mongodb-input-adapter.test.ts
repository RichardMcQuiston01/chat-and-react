import { describe, it, expect, vi } from 'vitest';
import { MongoDbInputAdapter } from './mongodb-input-adapter.js';

const SCHEMA = { 'x-chat-version': '1', 'x-chat-pages': [], _id: 'abc' };

describe('MongoDbInputAdapter', () => {
  it('returns the document fetched from the collection', async () => {
    const findOne = vi.fn().mockResolvedValue(SCHEMA);
    const adapter = await MongoDbInputAdapter.create({ findOne }, { slug: 'contact-form' });

    expect(findOne).toHaveBeenCalledWith({ slug: 'contact-form' });
    expect(adapter.transform(null)).toBe(SCHEMA);
  });

  it('ignores the raw argument and always returns the cached document', async () => {
    const findOne = vi.fn().mockResolvedValue(SCHEMA);
    const adapter = await MongoDbInputAdapter.create({ findOne }, {});

    expect(adapter.transform('ignored')).toBe(SCHEMA);
  });

  it('throws when findOne returns null', async () => {
    const findOne = vi.fn().mockResolvedValue(null);

    await expect(
      MongoDbInputAdapter.create({ findOne }, { slug: 'missing' }),
    ).rejects.toThrow('MongoDbInputAdapter: no document found');
  });
});
