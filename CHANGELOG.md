# CHANGELOG

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- `chat-stale-submit` event. A tab that is behind another tab no longer overwrites the newer saved progress when its visitor submits a page. Nothing is saved or sent: the tab fires `chat-stale-submit` (with `detail.progress` and `detail.completed`) and follows the newer tab, as `resync()` does. See [Events](docs/events.md#chat-stale-submit)
- When another tab finished the form, a tab that is still open and submits shows the finished form instead of sending `chat-page-submit` and `chat-form-complete` again. A finished form is remembered for 24 hours; a cleared one is not taken for a finished one
- `SessionStore` has optional `complete()` and `completedAt()` methods, implemented by `SessionManager` and `AdapterSessionManager`. `ChatController` calls `complete()` when the form is finished and falls back to `clearAll()` for a store without it

### Changed

- With a storage adapter, finishing the form now leaves a small record with the time it was finished (and no answers) instead of removing the record. `clearAll()` and `clearProgress()` remove it

---

## [0.10.0] — 2026-10-17

### Added

- `<chat-form>` fires a `chat-external-change` event when another tab changes the form's saved progress, with `detail.progress` set to the new progress (`null` if it was finished or cleared there). It works with the built-in storage (through the browser's `storage` event) and with a storage adapter that reports changes. The form on screen is not moved. See [Events](docs/events.md#chat-external-change)
- `<chat-form>.resync()` reloads what is saved and restarts the form on the saved page, dropping the chat on screen. It resolves to `true` once the form has restarted and to `false` when there is nothing to restart. Call it from a `chat-external-change` listener to make a tab follow another tab
- `Renderer.reset()` empties the chat

---

## [0.9.0] — 2026-10-17

### Added

- `<chat-form>` has a `clearProgress()` method that deletes the form's saved page, answers and unsubmitted answers, so the next page load starts on the first page. It returns `true` when the data was removed and `false` when there was nothing to clear it from. It works with the built-in storage (even before the element is added to the page) and with a storage adapter once it has loaded. See [Options](docs/options.md#resuming-a-saved-form)
- `SessionStore` has a `clearInput()` method, implemented by `SessionManager` and `AdapterSessionManager`, to forget one saved input

### Fixed

- Answers that were typed or picked but not submitted now come back after a reload. They were written as the visitor typed, but never read again. Every kind of input is saved (not just text boxes), the answer is filled in when the question is asked again, and it is forgotten once the page is submitted. It is not saved while an earlier answer is being edited, and `localStorage: false` turns it off
- Those unsubmitted answers were saved as plain text, which the session could not read back. They are now saved the same way as every other input. Ones saved by earlier versions are ignored

### Changed

- A custom `SessionStore` (the interface `ChatController` takes) needs the new `clearInput()` method. `SessionManager` and `AdapterSessionManager` already have it
- Demo: "Start over" and "Save and restart" use `clearProgress()` instead of removing `localStorage` keys by hand

---

## [0.8.0] — 2026-10-15

### Fixed

- `<chat-form>` now resumes a visitor's saved progress after the page is reloaded. Each element used to save under a random name that changed on every page load, so a returning visitor always started on the first page. A form is now saved under its `storage-key` attribute, or under a hash of its schema when there is none. Different forms on one page stay apart; two forms with the same schema share progress unless they have different `storage-key`s. See [Options](docs/options.md#resuming-a-saved-form)
- Demo: "Start over" and "Save and restart" clear the saved progress first, so they still begin on the first page now that a reload resumes. The demo form uses `storage-key="demo"`
- The `localStorage` keys the old random names left behind (`car:inst:<uuid>:…`) can never be read again, so the form removes them the first time it loads instead of letting them pile up

### Added

- `storage-key` attribute: names the `localStorage` entry a form saves its progress in
- `<chat-form>` now has `setInputAdapter()`, `setOutputAdapter()` and `setErrorAdapter()` next to `setStorageAdapter()`, so the web component can use custom input, output and error-log adapters. Until now only the headless `ChatController` could. See [Custom Adapters](docs/custom-adapters.md#using-your-adapters)

---

## [0.7.0] — 2026-10-14

### Added

- More error-log adapters, re-exported from `@richardmcquiston01/chat-and-react-adapters` (from `error-log-adapter` 0.2.0): `JsonFileErrorAdapter`, `FlatFileErrorAdapter` (with rotation), `SqliteErrorAdapter`, `WebStorageErrorAdapter`, `IndexedDbErrorAdapter` and `CompositeErrorAdapter`, with the `createErrorLogStore` and `buildCreateErrorLogTableSql` helpers
- More storage adapters (from `storage-adapters` 0.5.0): core re-exports `sessionStorageAdapter` and `indexedDbAdapter` next to `localStorageAdapter`, and the adapters package re-exports `sqliteAdapter`, `fileAdapter` and `jsonFileAdapter` for saving progress on a server. `nodeFileSystem()` is not re-exported because it imports `node:fs`; import it from `@richardmcquiston01/storage-adapters/file/node`
- Docs: the adapters you can use for storage, and the new error-log adapters

### Changed

- Updated to `error-log-adapter` ^0.2.0 and `storage-adapters` ^0.5.0. `storage-adapters` 0.5.0 fixes `subscribe` in the browser adapters: a change to the other kind of storage under the same key (for example a `sessionStorage` write in an iframe) no longer notifies a `localStorageAdapter()` subscriber, so cross-tab sync no longer sees those false changes
- `@richardmcquiston01/chat-and-react-adapters` now depends on `storage-adapters` as well as `error-log-adapter`

---

## [0.6.0] — 2026-10-14

### Changed

- **Breaking:** `ErrorLogAdapter.log()` now returns `Promise<ErrorLogResult>` (`{ ok, error? }`) instead of `void`. The interface and the console, webhook and MongoDB adapters now come from the new [`@richardmcquiston01/error-log-adapter`](https://www.npmjs.com/package/@richardmcquiston01/error-log-adapter) package. Custom adapters need to return a result (adapters that return nothing still work at runtime). `ChatError` is now `ErrorLogEntry<ChatErrorCode>`
- The controller writes to `console.error` if the error adapter reports a failure, rejects, or throws, so the original error is never lost
- `WebhookErrorAdapter` now reports a non-2xx response as a failure, and `Error` causes are serialized so they survive JSON. Failure messages use the prefix `[error-log-adapter]`

### Added

- Storage adapters, using [`@richardmcquiston01/storage-adapters`](https://www.npmjs.com/package/@richardmcquiston01/storage-adapters): `AdapterSessionManager` saves progress through any `StorageAdapter` and works with the synchronous `ChatController` (`SessionStore` is the new interface it needs), `localStorageAdapter()` (from `@richardmcquiston01/storage-adapters/browser`, re-exported by core) provides revisions and cross-tab change events, and `<chat-form>.setStorageAdapter()` / `AdapterRegistry.setStorageAdapter()` plug an adapter into the web component. Conflicting saves from two tabs are merged, and storage failures go to the error adapter. See [Storage Adapters](docs/storage-adapters.md)
- `autoHideAnswers` option (attribute `auto-hide-answers`): hides each answer after a delay, so a finished question and its answer can both leave the screen
- `hideAnimation` option (attribute `hide-animation`): `fade` (default), `pop` or `none`. Hidden bubbles now also collapse the space they took up instead of leaving a gap that snaps shut
- `typingSpeed` option (attribute `typing-speed`): types each question onto the screen, in milliseconds per character. `0` shows it at once. Click the question to skip. Screen readers get the full text immediately, and reduced-motion users get no animation
- `thinkingDelay` and `thinkingText` options (attributes `thinking-delay`, `thinking-text`): a "thinking" bubble with animated dots (or your text) before each question, and `x-chat-thinking` on a question to override it for that question
- Continue button icon: a default arrow in a `continue-icon` slot so pages can supply their own icon-font icon, a `btn-icon` part for styling, and a `showContinueIcon` option (attribute `show-continue-icon`) to hide it
- `ChatControllerConfig.options`: option values that win over the schema, used for element attributes
- Element attributes `user-resumable`, `local-storage` and `auto-complete`, as the docs already described
- Radio and checkbox choices show a number (1-9). Pressing the number picks the radio choice, or ticks / unticks the checkbox
- `allowEdit` option (attribute `allow-edit`): an Edit icon on each answer lets users change it. An earlier page can be re-opened; it is submitted again with `edited: true`, and if the new answer changes the route, the pages that followed are dropped
- `autoHideQuestions` option (attribute `auto-hide-questions`): hides each answered question bubble after a delay, in milliseconds. Answers stay visible
- `ChatController.getRoute()`, `getAnswers()` and `reopenPage()`, and `submitPage()` now returns a `SubmitOutcome`
- Schema Builder: toggle for `allowEdit` and a field for `autoHideQuestions`
- Edit icon: a pencil in an `edit-icon` slot, so pages can supply their own icon-font icon, and an `edit-icon` part for styling
- Schema Builder: per-question thinking delay and text
- Demo: a settings widget (gear icon) that opens a window for changing the options. Settings are saved to `localStorage`
- Demo: turned on `allowEdit` and `autoHideQuestions` (5 seconds)

### Changed

- Question and answer pairs in the chat history have space between them, including when the question bubbles are hidden and only answers remain
- Pressing Enter in a dropdown acts like Continue
- A question left blank shows "(no answer)" in the chat history

- `<chat-form>` scrolls the Continue button into view after each question
- `<chat-form>` asks the questions of a page one at a time, each with its own Continue button. `chat-page-submit` still fires once per page, after the last question is answered, with every answer from that page
- Pressing Enter in a single-line input acts like Continue

### Fixed

- `<chat-form>` no longer shows each question twice. Questions now appear once, directly above their own input, and move into the chat history as question / answer pairs when a page is submitted
- Radio buttons and checkboxes sit next to their labels instead of stretching across the full width
- Checkbox questions that declare their choices under `items.enum` now render their options
- Demo: the chat panel scrolls (instead of clipping) so the Continue button stays reachable as the history grows, and a stray piece of the donate card's HTML comment no longer shows as text at the bottom of the page
- Demo: the form renders on load, the "Form complete!" banner stays hidden until the form is done, and "Start over" keeps the event log working

---

## [0.5.0] — 2026-07-15

### Changed

**npm publish readiness** — renamed the three publishable packages under the `@richardmcquiston01` npm scope and filled in the metadata needed for a clean `npm publish`

- Renamed `chat-and-react` → `@richardmcquiston01/chat-and-react`, `@chat-and-react/core` → `@richardmcquiston01/chat-and-react-core`, `@chat-and-react/adapters` → `@richardmcquiston01/chat-and-react-adapters`; updated all internal imports, the `chat-and-react-demo` and `chat-and-react-schema-builder` workspace dependencies, and the root `README.md`
- Added `description`, `license`, `author`, `repository`, `homepage`, `bugs`, and `keywords` fields to each publishable package's `package.json`
- Added `"files": ["dist"]` so published tarballs contain only build output, not source/config files
- Added `"publishConfig": { "access": "public" }` so the scoped packages publish as public rather than defaulting to a private (paid) scope
- Added a per-package `README.md` and a copy of `LICENSE` to `packages/core`, `packages/adapters`, and `packages/web`, since each publishes from its own subdirectory and npm only auto-includes files that live inside the published package root
- Bumped all three publishable packages from `0.1.0` to `0.5.0` to match the version this CHANGELOG had already reached

---

## [0.4.0] — 2026-06-25

### Added

**Docker support** — multi-stage Docker image and Compose file for running the demo SPA without installing Bun or Node locally

- `packages/demo/Dockerfile` — two-stage build: `oven/bun:1-alpine` builds `core` → `web` → `demo` in dependency order; `nginx:alpine` serves the resulting static assets on port 80
- `docker-compose.yml` (repo root) — maps container port 80 to host port 8080; `docker compose up --build` is all that's needed
- `.dockerignore` (repo root) — excludes `.git`, `node_modules`, `dist`, and `.turbo` directories to keep the build context small

---

## [0.3.0] — 2026-06-24

### Added

**`chat-and-react-schema-builder`** — Vite + React 18 SPA for visually creating, editing, importing, and exporting `chat-and-react` JSON schemas without hand-writing JSON

- **Page management** — add, remove, and reorder pages from a sidebar; each page has an editable ID and title
- **Question editor** — per-question fields adapt to the selected input type (`text`, `textarea`, `dropdown`, `radio`, `checkbox`); options list for select-style types; placeholder text for text types
- **Conditional visibility** — attach a named-rule condition ref to any question
- **Branching editor** — add `if` / `always` rules per page with question and destination dropdowns; the terminal `always` rule is protected from deletion and type changes
- **Named rules panel** — edit `x-chat-rules` as raw JSON with live parse-error feedback; rule names populate the condition ref dropdowns automatically
- **Schema options** — `userResumable`, `localStorage`, `autoComplete` checkbox toggles
- **Import** — load any existing schema JSON file; restored to the editor immediately
- **Export** — runs `parseSchema` validation before downloading; schema is only written if valid
- **Validate** — runs `parseSchema` and shows a success or error banner without downloading
- **Live JSON preview** — collapsible bottom drawer showing the current schema as formatted JSON, updated on every keystroke
- Helper functions `emptySchema`, `emptyPage`, `emptyQuestion` covered by 8 unit tests

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
