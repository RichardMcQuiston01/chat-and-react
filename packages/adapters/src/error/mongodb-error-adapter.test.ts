import { describe, it, expect, vi } from 'vitest';
import { MongoDbErrorAdapter } from './mongodb-error-adapter.js';
import type { ChatError } from '@chat-and-react/core';

const ERROR: ChatError = { code: 'RULE_EVAL_FAILED', message: 'bad rule', cause: new Error('x') };

describe('MongoDbErrorAdapter', () => {
  it('calls insertOne on the collection with the error', async () => {
    const insertOne = vi.fn().mockResolvedValue({ insertedId: 'id1' });
    const adapter = new MongoDbErrorAdapter({ insertOne });

    adapter.log(ERROR);
    await vi.waitFor(() => expect(insertOne).toHaveBeenCalledOnce());

    expect(insertOne).toHaveBeenCalledWith(ERROR);
  });

  it('logs to console.error if insertOne rejects', async () => {
    const dbError = new Error('db down');
    const insertOne = vi.fn().mockRejectedValue(dbError);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const adapter = new MongoDbErrorAdapter({ insertOne });

    adapter.log(ERROR);
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledWith('[chat-and-react] MongoDbErrorAdapter:', dbError);
    spy.mockRestore();
  });
});
