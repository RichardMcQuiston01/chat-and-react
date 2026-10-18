# Export audit (1.0 readiness)

> Decided: the internal candidates and the re-exports were removed in 0.12. See the CHANGELOG.

Every export from the three published entry points, with a proposed label. **Public** means covered by semver from 1.0. **Internal** means no longer exported, or exported but documented as unsupported.

Evidence: whether `docs/` or the README mentions it, and whether another package or the browser tests import it.

## `@richardmcquiston01/chat-and-react` (web)

Only one entry point (`.`). The element registers itself on import.

| Export | Proposed | Why |
| --- | --- | --- |
| `ChatFormElement` | Public | The `<chat-form>` class. Its attributes, methods and events are the main API. |
| `AdapterRegistry` | Internal | Only used by `ChatFormElement`; the element's `set*Adapter()` methods cover it. Mentioned only in the archived design doc. |
| `Renderer` | Internal | DOM implementation detail; not in docs. Exposing it freezes the markup and CSS class structure beyond the documented classes. |
| `getStyles` | Internal | Used only by the element. Theming is through CSS classes and custom properties. |

## `@richardmcquiston01/chat-and-react-core`

| Export | Proposed | Why |
| --- | --- | --- |
| `ChatController` | Public | Framework-agnostic driver; documented in 6 docs. |
| `parseSchema` | Public | Documented; used by the schema builder. |
| `SessionStore` (type) | Public | Contract for custom session storage. |
| `SessionProgress` (type) | Public | Appears in `chat-external-change` and `chat-stale-submit` event details. |
| `SessionManager` | Public | Default Web Storage implementation; documented. |
| `AdapterSessionManager`, `AdapterSessionManagerOptions` | Public | Documented; used by the browser tests. |
| `BrowserEventAdapter` | Public | Default output adapter; documented. |
| `ConsoleErrorAdapter` | Public | Default error adapter; documented. |
| `IdentityInputAdapter` | Public | Default input adapter; documented. |
| `RuleEngine` | Internal | Only referenced in the archived design doc; no consumer imports it. Its API is an implementation detail of branching. |
| `StorageBackend` (type) | Internal | Narrow `getItem`/`setItem` shape used by `SessionManager`'s constructor. Keep only if constructor injection is meant to be supported. **Decision needed.** |
| `localStorageAdapter`, `sessionStorageAdapter` and their option and event types | Re-export, pin | Owned by `storage-adapters`. Keep as convenience re-exports only if that package is 1.0 or its contract is pinned. |
| `indexedDbAdapter`, `IndexedDbAdapterOptions` | Re-export, pin | Same as above. |
| `StorageAdapter`, `StoredValue`, `StoreErrorCode`, `StoreResult` (types) | Re-export, pin | Same as above. |
| `ErrorLogEntry`, `ErrorLogResult` (types) | Re-export, pin | Owned by `error-log-adapter`. |

### From `types.ts` (`export *`)

`export *` makes everything in the file public by accident. Proposal: replace it with a named list.

| Export | Proposed | Why |
| --- | --- | --- |
| `ChatSchema`, `ChatPage`, `ChatQuestion`, `ChatOptions`, `ChatInputType`, `HideAnimation`, `BranchingRule`, `BranchingAlways`, `BranchingIf`, `JsonLogicRule`, `ChatConditionRef`, `AnswerMap` | Public | The schema contract (`x-chat-version` `"1"`). |
| `ChatEvent`, `PageSubmitEvent`, `FormCompleteEvent` | Public | Payloads delivered to output adapters and as DOM events. |
| `ChatError`, `ChatErrorCode` | Public | Payload of `chat-error`; codes are matched by consumers. |
| `InputAdapter`, `OutputAdapter`, `ErrorLogAdapter` | Public | The extension points. |
| `ChatControllerConfig` | Public | Needed to construct `ChatController`. |
| `RouteEntry`, `SubmitOutcome` | Internal | Used by the controller's routing and edit flow; undocumented. **Decision needed** if `ChatController` methods that return them are public. |

## `@richardmcquiston01/chat-and-react-adapters`

All of these are optional, runtime-specific, and documented, so the default label is Public. The risk is the re-exports from other packages.

| Export | Proposed | Why |
| --- | --- | --- |
| `MongoDbInputAdapter`, `MySqlInputAdapter` | Public | Documented input adapters. |
| `EventEmitterOutputAdapter`, `WebhookOutputAdapter`, `WebSocketOutputAdapter` | Public | Documented output adapters. |
| Error-log adapters (`CompositeErrorAdapter`, `FlatFileErrorAdapter`, `IndexedDbErrorAdapter`, `JsonFileErrorAdapter`, `MongoDbErrorAdapter`, `SqliteErrorAdapter`, `WebhookErrorAdapter`, `WebStorageErrorAdapter`), helpers (`buildCreateErrorLogTableSql`, `createErrorLogStore`) and about 17 option and `*Like` types | Re-export, pin | Owned by `error-log-adapter`. Re-exporting means our semver covers theirs. |
| `fileAdapter`, `jsonFileAdapter`, `sqliteAdapter` and their option and `*Like` types | Re-export, pin | Owned by `storage-adapters`. |

## Findings

1. **Three internal candidates in web, one in core** (`AdapterRegistry`, `Renderer`, `getStyles`, `RuleEngine`): none is documented or imported by another package.
2. **`export * from './types.js'`** should become a named list so new types are not public by accident.
3. **Re-exports are the real 1.0 risk.** Core and adapters re-export about 40 symbols owned by `storage-adapters` (`^0.5.0`) and `error-log-adapter` (`^0.2.0`). Either take those to 1.0 first, or stop re-exporting and have consumers import from the owning package.
4. **No `exports` subpaths** in the web package, so every export is reachable from the root. Adding any later is non-breaking; removing is breaking. Remove before 1.0, not after.

## Decisions needed

- Remove `AdapterRegistry`, `Renderer`, `getStyles` and `RuleEngine` from the public entry points (breaking in 0.x, so do it in 0.12)?
- Keep or drop `StorageBackend`, `RouteEntry`, `SubmitOutcome`?
- Keep re-exports of `storage-adapters` and `error-log-adapter` symbols, or point consumers at the owning packages?
