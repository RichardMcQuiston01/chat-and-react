export type {
  StorageAdapter,
  StoredValue,
  StoreErrorCode,
  StoreResult,
} from '@richardmcquiston01/storage-adapters';
// `localStorageAdapter` lives in the storage-adapters package; re-exported so imports keep working.
export type {
  LocalStorageAdapterOptions,
  StorageChangeEvent,
  StorageEventTarget,
  WebStorageLike,
} from '@richardmcquiston01/storage-adapters/browser';
export { localStorageAdapter } from '@richardmcquiston01/storage-adapters/browser';
export { BrowserEventAdapter } from './adapters/browser-event-adapter.js';
export { ConsoleErrorAdapter } from './adapters/console-error-adapter.js';
export { IdentityInputAdapter } from './adapters/identity-input-adapter.js';
export { ChatController } from './chat-controller.js';
export { RuleEngine } from './rule-engine.js';
export { parseSchema } from './schema-parser.js';
export type { SessionProgress, SessionStore, StorageBackend } from './session-manager.js';
export { SessionManager } from './session-manager.js';
export type { AdapterSessionManagerOptions } from './storage/adapter-session-manager.js';
export { AdapterSessionManager } from './storage/adapter-session-manager.js';
export * from './types.js';
