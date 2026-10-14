// The error-log adapters now live in the standalone error-log-adapter package and are
// re-exported here so existing imports keep working.
export type {
  CollectionLike,
  MongoDbErrorOptions,
  WebhookErrorOptions,
} from '@richardmcquiston01/error-log-adapter';
export { MongoDbErrorAdapter, WebhookErrorAdapter } from '@richardmcquiston01/error-log-adapter';
export { MongoDbInputAdapter } from './input/mongodb-input-adapter.js';
export { MySqlInputAdapter } from './input/mysql-input-adapter.js';
export { EventEmitterOutputAdapter } from './output/event-emitter-adapter.js';
export { WebhookOutputAdapter } from './output/webhook-output-adapter.js';
export { WebSocketOutputAdapter } from './output/websocket-output-adapter.js';
