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
bun run lint          # Lint all files
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
Routes runtime errors to a sink. Default writes to a log file. Custom adapters can target SQL/NoSQL databases, webhooks, or AWS services.

## Session & Storage Behavior

- Each user gets a unique session ID stored in `localStorage`, submitted with every event/emit.
- `UserResumable` (boolean option): when `true`, progress is persisted so the user can return and continue. When `false`, no progress is saved and page-submit events are suppressed.
- `LocalStorage` (boolean option): when `true`, each input value is written to `localStorage` as the user types.
- `AutoComplete` (boolean option): when `false`, all input elements render with `autocomplete="off"`.

## Key Design Constraints

- **Framework-agnostic**: no dependency on React, Vue, Angular, etc.
- **Customizable styling**: the library emits a standard set of CSS classes; consumers override them for branding.
- Inputs must visually integrate with the chat bubble aesthetic, not look like traditional form fields.
