import type { ErrorLogAdapter, ChatError } from '@chat-and-react/core';

interface CollectionLike {
  insertOne(doc: object): Promise<unknown>;
}

export class MongoDbErrorAdapter implements ErrorLogAdapter {
  constructor(private readonly collection: CollectionLike) {}

  log(error: ChatError): void {
    this.collection.insertOne(error).catch((err: unknown) => {
      console.error('[chat-and-react] MongoDbErrorAdapter:', err);
    });
  }
}
