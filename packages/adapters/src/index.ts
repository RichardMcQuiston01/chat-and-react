// The error-log adapters live in the error-log-adapter package and the storage adapters in
// the storage-adapters package. They are re-exported here so everything optional can be
// imported from one place. `nodeFileSystem` (which imports `node:fs`) is not re-exported;
// import it from '@richardmcquiston01/storage-adapters/file/node'.
export type {
  CollectionLike,
  FlatFileErrorOptions,
  IdbDatabaseLike,
  IdbObjectStoreLike,
  IdbTransactionLike,
  IdbUpgradeDatabaseLike,
  IndexedDbErrorOptions,
  IndexedDbErrorRecord,
  JsonFileErrorOptions,
  JsonFileErrorRecord,
  MongoDbErrorOptions,
  SqliteClientLike,
  SqliteErrorOptions,
  StorageLike,
  WebhookErrorOptions,
  WebStorageErrorOptions,
  WebStorageErrorRecord,
} from '@richardmcquiston01/error-log-adapter';
export {
  buildCreateErrorLogTableSql,
  CompositeErrorAdapter,
  createErrorLogStore,
  FlatFileErrorAdapter,
  IndexedDbErrorAdapter,
  JsonFileErrorAdapter,
  MongoDbErrorAdapter,
  SqliteErrorAdapter,
  WebhookErrorAdapter,
  WebStorageErrorAdapter,
} from '@richardmcquiston01/error-log-adapter';
export type { FileAdapterOptions } from '@richardmcquiston01/storage-adapters/file';
export { fileAdapter } from '@richardmcquiston01/storage-adapters/file';
export type { JsonFileAdapterOptions } from '@richardmcquiston01/storage-adapters/json-file';
export { jsonFileAdapter } from '@richardmcquiston01/storage-adapters/json-file';
export type {
  SqliteAdapterOptions,
  SqliteDatabaseLike,
} from '@richardmcquiston01/storage-adapters/sqlite';
export { sqliteAdapter } from '@richardmcquiston01/storage-adapters/sqlite';
export { MongoDbInputAdapter } from './input/mongodb-input-adapter.js';
export { MySqlInputAdapter } from './input/mysql-input-adapter.js';
export { EventEmitterOutputAdapter } from './output/event-emitter-adapter.js';
export { WebhookOutputAdapter } from './output/webhook-output-adapter.js';
export { WebSocketOutputAdapter } from './output/websocket-output-adapter.js';
