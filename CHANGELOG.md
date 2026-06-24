# CHANGELOG

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

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
