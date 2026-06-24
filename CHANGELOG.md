# CHANGELOG

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.2.0] — 2026-06-24

### Added

**`@chat-and-react/adapters`** — new optional package with seven ready-made adapters

*Output adapters*
- `EventEmitterOutputAdapter` — forwards events to a Node.js `EventEmitter` (or any compatible emitter)
- `WebhookOutputAdapter` — fire-and-forget HTTP POST to a webhook URL; supports custom headers
- `WebSocketOutputAdapter` — sends events over an existing WebSocket connection; guards on open state

*Error-log adapters*
- `WebhookErrorAdapter` — fire-and-forget HTTP POST for `ChatError` objects; supports custom headers
- `MongoDbErrorAdapter` — fire-and-forget `insertOne` into a MongoDB collection

*Input adapters*
- `MySqlInputAdapter` — static async `create()` factory; fetches schema rows via a `mysql2`-compatible connection and caches the result
- `MongoDbInputAdapter` — static async `create()` factory; fetches one document via a MongoDB collection and caches it

**`chat-and-react-demo`** — Vite SPA demo showcasing the `<chat-form>` web component with all five input types, conditional questions, multi-path branching, and a live event log

---

## [0.1.0] — 2026-06-24

Initial release.

### Added

**`@chat-and-react/core`**
- `parseSchema` — validates JSON Schema Draft-07 extended with `x-chat-*` keywords; two-pass validation enforces unique IDs and valid branching destinations
- `RuleEngine` — evaluates JsonLogic rules for per-question visibility (`x-chat-condition`)
- `SessionManager` — session ID and progress persistence with an injectable `StorageBackend` interface for test isolation
- Built-in adapters: `IdentityInputAdapter`, `BrowserEventAdapter`, `ConsoleErrorAdapter`
- `ChatController` — page-graph navigation, answer accumulation, event emission; supports `page:submit` and `form:complete` events
- All shared TypeScript types exported from the package root

**`chat-and-react`**
- `<chat-form>` custom element — Shadow DOM, CSS custom properties (`--car-*`), standard CSS classes (`car-*`)
- `AdapterRegistry` — typed slots for input, output, and error adapters with built-in defaults
- `Renderer` — DOM builder for chat bubbles and input widgets within Shadow DOM
- `getStyles` — returns the Shadow DOM stylesheet
- Dual ESM/CJS build output via tsup; IIFE bundle at `dist/chat-and-react.iife.js` for CDN use

### Input types supported
`text`, `textarea`, `dropdown`, `radio`, `checkbox`

### Options
`userResumable`, `localStorage`, `autoComplete`
