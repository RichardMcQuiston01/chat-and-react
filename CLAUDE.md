# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`chat-and-react` is a **framework-agnostic TypeScript library** that renders a chat-style form interface. The library consumer provides a schema describing questions, branching logic, and input types; the library drives the conversation and emits events as the user progresses.

## Development Commands

This project uses `bun` as the package manager and runtime.

```bash
bun install           # Install dependencies
bun run build         # Compile TypeScript
bun run typecheck     # Type-check without emitting
bun run test          # Run all tests
bun run test -- -t "test name"   # Run a single test suite
bun run test:browser # Run the browser tests in real Chromium (needs `bunx playwright install chromium` once; set CHROMIUM_PATH to use an installed Chromium)
bun run lint          # Lint and check formatting with Biome
bun run format        # Apply Biome fixes and formatting
```

## Architecture

The library is built around four extension points (adapter/plugin pattern):

### InputAdapter
Transforms external data sources into the library's internal JSON schema format. The default adapter accepts the native schema format directly. Custom adapters enable sourcing schemas from APIs, CMS platforms, etc.

### Chat Schema
Defines the questions, input types, and branching logic. Supported input types:
- Single-line text
- Multi-line text
- Dropdown
- Checkbox (multi-select)
- Radio (single-select)

Each input type renders within the chat aesthetic (not as standalone form fields).

### OutputAdapter
Handles events emitted by the library. Two event types:
- **Page submit** — fires after each page of inputs is completed; used for incremental saves
- **Form complete** — fires when no further inputs remain

The default OutputAdapter dispatches browser `CustomEvent`s. Custom adapters can target webhooks, WebSockets, or `EventEmitter`.

### ErrorLogAdapter
Routes runtime errors to a sink. The interface and the console, webhook, and MongoDB adapters come from the standalone `@richardmcquiston01/error-log-adapter` package. `log` returns a `Promise<ErrorLogResult>` that is checked, not thrown. The default writes to the console. Custom adapters can target SQL/NoSQL databases, webhooks, or AWS services.

## Session & Storage Behavior

- Storage is pluggable: `SessionManager` (sync Web Storage, the default) and `AdapterSessionManager` (any `@richardmcquiston01/storage-adapters` `StorageAdapter`, loaded into memory by `create()` and saved in the background) both implement `SessionStore`. The web component uses an adapter set with `setStorageAdapter()`.
- Each user gets a unique session ID stored in `localStorage`, submitted with every event/emit. `<chat-form>` saves under `car:form:<name>:`, where the name is its `storage-key` attribute or a hash of its schema, so a form finds its progress again after a reload. With `LocalStorage` on, an input typed or picked but not yet submitted is saved as a draft, restored when the question is asked again, and cleared on submit. `<chat-form>.clearProgress()` deletes a form's saved data.
- `UserResumable` (boolean option): when `true`, progress is persisted so the user can return and continue. When `false`, no progress is saved and page-submit events are suppressed.
- `LocalStorage` (boolean option): when `true`, each input value is written to `localStorage` as the user types.
- `AutoComplete` (boolean option): when `false`, all input elements render with `autocomplete="off"`.

## Releasing

The three published packages (`@richardmcquiston01/chat-and-react-core`, `-adapters`, and `@richardmcquiston01/chat-and-react`) share one version.

1. Move the CHANGELOG's `[Unreleased]` entries under a new `## [x.y.z] — date` heading and bump `version` in `packages/core`, `packages/adapters` and `packages/web`.
2. Run `bun install`, `bun run build`, `bun run typecheck`, `bun run test` and `bun run lint`.
3. Publish by creating a GitHub release tagged `vx.y.z` (the tag must match every package version). The `Publish` workflow (secret `NPM_TOKEN`) runs lint, typecheck, tests and the build, packs each package with `bun pm pack`, and publishes **core first**, then `adapters` and `web`, with `npm publish` on the tarball so it gets provenance. It skips a package that is already on npm, so a failed run can be re-run. It can also be started by hand from the Actions tab (with an optional dry run). Never run `npm publish` from a package directory: it leaves `workspace:*` in the published `package.json`, which npm cannot install (0.5.0 of `-adapters` and `chat-and-react` were published that way). To publish by hand instead, use `bun publish` from each package directory, core first.
4. After publishing, the same workflow replaces GitHub's auto-generated release notes (the list of every merged pull request) with the version's CHANGELOG section, using `scripts/release-notes.mjs`. Notes written by hand are left alone. To do it for an older release: `node scripts/release-notes.mjs 0.7.0 | gh release edit v0.7.0 --notes-file -`.

## Key Design Constraints

- **Framework-agnostic**: no dependency on React, Vue, Angular, etc.
- **Customizable styling**: the library emits a standard set of CSS classes; consumers override them for branding.
- Inputs must visually integrate with the chat bubble aesthetic, not look like traditional form fields.
