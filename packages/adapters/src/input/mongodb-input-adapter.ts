import type { InputAdapter } from '@chat-and-react/core';

interface MongoCollectionLike {
  findOne(filter: object): Promise<object | null>;
}

export class MongoDbInputAdapter implements InputAdapter {
  private constructor(private readonly schema: object) {}

  /** Fetches one document matching `filter` and caches it as the schema. */
  static async create(
    collection: MongoCollectionLike,
    filter: object,
  ): Promise<MongoDbInputAdapter> {
    const doc = await collection.findOne(filter);
    if (doc === null) {
      throw new Error('MongoDbInputAdapter: no document found');
    }
    return new MongoDbInputAdapter(doc);
  }

  transform(_raw: unknown): unknown {
    return this.schema;
  }
}
