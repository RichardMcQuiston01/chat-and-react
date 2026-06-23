# chat-and-react — Design Spec

**Date:** 2026-06-23
**Status:** Approved

---

## 1. Overview

`chat-and-react` is a public open-source TypeScript library that renders a chat-style form interface. The library consumer provides a JSON schema describing questions, input types, and branching logic. The library drives the conversation, manages session state, and emits events as the user progresses.

**Primary goals:**
- Framework-agnostic — works in any HTML environment with no runtime dependency
- Dual distribution — npm package (ESM/CJS) for bundled apps and an IIFE bundle for CDN `<script>` use
- Fully customizable — styling via CSS custom properties and `::part()` without forking the library
- Headless-capable — core logic is usable without the Web Component UI

**Browser support:** Evergreen Chrome, Firefox, Edge (last 2 versions) and Safari 14+. No polyfills required.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                  @chat-and-react/core                │
│                                                      │
│  SchemaParser → RuleEngine → SessionManager          │
│       ↓               ↓            ↓                 │
│  ChatController  (orchestrates all of the above)     │
│       ↓                                              │
│  Adapter interfaces: InputAdapter, OutputAdapter,    │
│                      ErrorLogAdapter                 │
└──────────────────────┬──────────────────────────────┘
                       │ consumed by
       ┌───────────────┴──────────────┐
       ↓                              ↓
┌──────────────────┐       ┌──────────────────────┐
│  <chat-form>     │       │  Direct core usage   │
│  Web Component   │       │  (headless / custom  │
│  (default UI)    │       │   framework wrapper) │
└──────────────────┘       └──────────────────────┘
```

The repository is a Bun monorepo with two packages:

| Package | Path | Purpose |
|---|---|---|
| `@chat-and-react/core` | `packages/core` | Pure TypeScript, no DOM dependency |
| `chat-and-react` | `packages/web` | Web Component shell, depends on core |

Consumers who want headless control import `@chat-and-react/core` directly. The `chat-and-react` package is the default drop-in UI.

---

## 3. Schema Format

The schema is a JSON Schema `object` extended with `x-chat-*` keywords to remain spec-compliant while adding chat-specific behavior. Draft-07 is the base.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "x-chat-version": "1",
  "x-chat-options": {
    "userResumable": true,
    "localStorage": true,
    "autoComplete": false
  },
  "x-chat-pages": [
    {
      "id": "contact",
      "title": "Let's get started",
      "questions": [
        {
          "id": "full_name",
          "type": "string",
          "x-chat-input": "text",
          "title": "What's your full name?",
          "x-chat-placeholder": "Type your name..."
        },
        {
          "id": "preferred_contact",
          "type": "string",
          "x-chat-input": "radio",
          "title": "How should we reach you?",
          "enum": ["Email", "Phone", "SMS"],
          "x-chat-condition": { "ref": "has_name" }
        }
      ]
    }
  ],
  "x-chat-rules": {
    "has_name": { "!!": [{ "var": "full_name" }] }
  }
}
```

### Schema Extension Reference

| Keyword | Location | Type | Description |
|---|---|---|---|
| `x-chat-version` | root | `string` | Schema format version; must be `"1"` |
| `x-chat-options` | root | `object` | Global runtime options (see §5) |
| `x-chat-pages` | root | `array` | Ordered list of pages |
| `x-chat-input` | question | `string` | Widget type: `text`, `textarea`, `dropdown`, `checkbox`, `radio` |
| `x-chat-placeholder` | question | `string` | Placeholder text for the input widget |
| `x-chat-condition` | question | `object` | JsonLogic rule or `{ ref: "ruleName" }` pointer; question is shown only when the condition evaluates to truthy |
| `x-chat-rules` | root | `object` | Named rule dictionary; values are JsonLogic expressions |

### Input Widget Mapping

| `x-chat-input` | JSON Schema type | Rendered as |
|---|---|---|
| `text` | `string` | Single-line text field |
| `textarea` | `string` | Multi-line text field |
| `dropdown` | `string` with `enum` | Select-style dropdown in chat aesthetic |
| `radio` | `string` with `enum` | Radio group in chat aesthetic |
| `checkbox` | `array` with `items.enum` | Checkbox group in chat aesthetic |

---

## 4. Core Library (`@chat-and-react/core`)

### 4.1 `ChatController`

The main entry point. Consumers construct it with a config object.

```ts
interface ChatControllerConfig {
  schema: unknown;                    // raw JSON or pre-parsed object
  inputAdapter?: InputAdapter;        // default: IdentityInputAdapter
  outputAdapter?: OutputAdapter;      // default: BrowserEventAdapter
  errorAdapter?: ErrorLogAdapter;     // default: ConsoleErrorAdapter
}

const controller = new ChatController(config);
controller.start();                   // validates schema, restores session if applicable
controller.on('page:submit', (e) => { /* incremental save */ });
controller.on('form:complete', (e) => { /* final save */ });
controller.destroy();                 // cleans up listeners and session state
```

**Responsibilities:**
1. Passes raw schema through `InputAdapter.transform()` then `SchemaParser.parse()`
2. On `start()`, checks `SessionManager` for saved progress and resumes from the saved page if found
3. Before advancing each page, calls `RuleEngine.evaluate()` to determine which questions on the next page are visible
4. Calls `OutputAdapter.emit()` on `page:submit` and `form:complete`
5. Routes all caught errors through `ErrorLogAdapter.log()`

### 4.2 `SchemaParser`

Validates and normalizes raw input into a typed `ChatSchema` object. Throws `ChatError` with code `SCHEMA_INVALID` if validation fails. Validation checks:
- Required `x-chat-version` field present and equals `"1"`
- All question `id` values are unique across the entire schema
- All `x-chat-condition` refs resolve to entries in `x-chat-rules`
- All `x-chat-input` values are one of the five supported widget types

### 4.3 `RuleEngine`

Evaluates JsonLogic expressions against a flat map of current answers (`{ [questionId]: value }`). Uses the `json-logic-js` library as the evaluation engine.

```ts
interface RuleEngine {
  evaluate(rule: JsonLogicRule, answers: AnswerMap): boolean;
}
```

Supported operators at v1: all standard JsonLogic operators (`==`, `!=`, `>`, `>=`, `<`, `<=`, `!`, `!!`, `and`, `or`, `if`, `var`, `missing`, `missing_some`, `in`, `cat`). If evaluation throws, the engine logs `RULE_EVAL_FAILED` via the error adapter and returns `false` (question is hidden).

### 4.4 `SessionManager`

Manages two localStorage namespaces:

| Key | Written when | Cleared when |
|---|---|---|
| `car:session-id` | First `start()` call ever | Never (persists across forms) |
| `car:progress:<session-id>` | After each page submit (`userResumable: true`) | `form:complete` fires |
| `car:input:<session-id>:<question-id>` | On each input event (`localStorage: true`) | `form:complete` fires |

If localStorage is unavailable (private browsing, quota exceeded), `SessionManager` logs `STORAGE_UNAVAILABLE` and operates in memory-only mode. The session ID is still generated but held in memory for the lifetime of the controller instance.

### 4.5 Adapter Interfaces

```ts
interface InputAdapter {
  transform(raw: unknown): unknown;
}

interface OutputAdapter {
  emit(event: ChatEvent): void;
}

interface ErrorLogAdapter {
  log(error: ChatError): void;
}
```

**Built-in adapters:**

| Adapter | Class | Behavior |
|---|---|---|
| `InputAdapter` | `IdentityInputAdapter` | Returns input unchanged |
| `OutputAdapter` | `BrowserEventAdapter` | Dispatches `CustomEvent` on `document` |
| `ErrorLogAdapter` | `ConsoleErrorAdapter` | Calls `console.error` |

### 4.6 Event Payloads

```ts
interface PageSubmitEvent {
  type: 'page:submit';
  sessionId: string;
  pageId: string;
  pageIndex: number;
  answers: AnswerMap;
}

interface FormCompleteEvent {
  type: 'form:complete';
  sessionId: string;
  allAnswers: AnswerMap;
}

type ChatEvent = PageSubmitEvent | FormCompleteEvent;
```

### 4.7 Error Types

```ts
type ChatErrorCode =
  | 'SCHEMA_INVALID'        // schema fails validation on start()
  | 'RULE_EVAL_FAILED'      // rule engine throws during condition evaluation
  | 'ADAPTER_ERROR'         // InputAdapter or OutputAdapter throws
  | 'STORAGE_UNAVAILABLE';  // localStorage blocked or quota exceeded

interface ChatError {
  code: ChatErrorCode;
  message: string;
  cause?: unknown;
}
```

`SCHEMA_INVALID` and `ADAPTER_ERROR` are fatal — the controller halts. All other codes are non-fatal — the feature degrades gracefully and the form continues.

---

## 5. Web Component Shell (`chat-and-react`)

### 5.1 Element Registration

```ts
import 'chat-and-react'; // registers <chat-form> custom element
```

### 5.2 Attributes

| Attribute | Type | Default | Maps to |
|---|---|---|---|
| `schema` | JSON string | required | `ChatControllerConfig.schema` |
| `user-resumable` | boolean | `true` | `x-chat-options.userResumable` |
| `local-storage` | boolean | `true` | `x-chat-options.localStorage` |
| `auto-complete` | boolean | `true` | `x-chat-options.autoComplete` |
| `input-adapter` | string (registry key) | — | `ChatControllerConfig.inputAdapter` |
| `output-adapter` | string (registry key) | — | `ChatControllerConfig.outputAdapter` |
| `error-adapter` | string (registry key) | — | `ChatControllerConfig.errorAdapter` |

Element attributes take precedence over the equivalent `x-chat-options` values in the schema — this allows the embedding page to override schema defaults without modifying the schema itself.

Custom adapters are registered globally before element use:

```ts
import { AdapterRegistry } from 'chat-and-react';
AdapterRegistry.register('my-output', new MyOutputAdapter());
```

### 5.3 Shadow DOM Structure

```
<chat-form>
  #shadow-root
    <div part="container">
      <div part="message-list">
        <div part="bubble-bot">   <!-- question text -->
        <div part="bubble-user">  <!-- submitted answer -->
        <div part="input-area">
          <!-- active input widget rendered here -->
          <button part="submit-btn">Send</button>
```

### 5.4 CSS Custom Properties

| Property | Default | Controls |
|---|---|---|
| `--chat-bg` | `#f5f5f5` | Container background |
| `--chat-bot-bubble-bg` | `#ffffff` | Bot message bubble background |
| `--chat-user-bubble-bg` | `#0084ff` | User answer bubble background |
| `--chat-font` | `system-ui, sans-serif` | All text |
| `--chat-accent` | `#0084ff` | Submit button, focus rings |
| `--chat-radius` | `1rem` | Bubble border radius |
| `--chat-spacing` | `1rem` | Gap between bubbles |

### 5.5 DOM Events

Events are dispatched on the `<chat-form>` element itself (in addition to the `OutputAdapter`):

```ts
element.addEventListener('chat-page-submit', (e: CustomEvent) => {
  // e.detail: PageSubmitEvent
});

element.addEventListener('chat-form-complete', (e: CustomEvent) => {
  // e.detail: FormCompleteEvent
});

element.addEventListener('chat-error', (e: CustomEvent) => {
  // e.detail: ChatError — only fired for fatal errors
});
```

---

## 6. Build & Distribution

**Build tool:** `tsup` (wraps esbuild). Each package produces:

| Format | File | Use case |
|---|---|---|
| ESM | `dist/index.mjs` | Bundled apps (Vite, webpack) |
| CJS | `dist/index.cjs` | Node.js / CommonJS |
| IIFE | `dist/chat-and-react.iife.js` | CDN `<script>` tag |
| Types | `dist/index.d.ts` | TypeScript consumers |

**Monorepo tooling:** Bun workspaces. Both packages share a root `tsconfig.base.json`.

**Versioning:** Both packages share the same version number. Releases are managed via **Changesets** — contributors add a changeset file describing the change; CI publishes to npm when a release PR is merged.

**CDN usage example:**
```html
<script src="https://unpkg.com/chat-and-react/dist/chat-and-react.iife.js"></script>
<chat-form schema='{"x-chat-version":"1","x-chat-pages":[...]}'></chat-form>
```

---

## 7. Testing Strategy

**Framework:** Vitest throughout.

### Unit Tests (core package, plain Node)

| Module | What is tested |
|---|---|
| `SchemaParser` | Valid schemas parse; invalid schemas throw `SCHEMA_INVALID` with descriptive message |
| `RuleEngine` | JsonLogic expressions evaluate correctly; AND/OR/NOT combinations; missing variable handling; `RULE_EVAL_FAILED` on throw |
| `SessionManager` | Save/restore/clear lifecycle; graceful degradation when localStorage unavailable |
| `ChatController` | Page advance logic; adapter calls in correct order; event sequence; resume from saved progress |

### Integration Tests (web package, jsdom)

| Scenario | Assertion |
|---|---|
| `<chat-form>` renders first question on `start()` | First bot bubble appears in Shadow DOM |
| Submitting answer advances conversation | Next question bubble appears; `chat-page-submit` fires |
| Final page submission | `chat-form-complete` fires; localStorage cleared |
| `userResumable: false` | No progress written to localStorage; `chat-page-submit` not dispatched |
| CSS parts exposed | `::part(bubble-bot)` is targetable from outside Shadow DOM |

### Adapter Contract Tests

Each built-in adapter is tested in isolation to serve as a reference implementation for custom adapter authors.

Test files live alongside source (`*.test.ts` in the same directory as the module under test).

---

## 8. Deferred to Future Versions

- **Schema URL fetching** — the `schema` attribute accepts a JSON string only in v1; fetching from a URL is deferred
- **Advanced rule engine schema** — the `x-chat-rules` / `x-chat-condition` format is established but the full JsonLogic operator surface and authoring tooling is deferred
- **`OutputAdapter` variants** — Webhook, WebSocket, and EventEmitter adapters are mentioned in the README but not part of v1; `BrowserEventAdapter` ships; others are documented as examples
- **`InputAdapter` examples** — CMS-specific adapters (e.g., Contentful, Sanity) are out of scope for v1
- **Accessibility (a11y)** — ARIA roles, live regions, and keyboard navigation should be addressed before v1 public release but are not designed here
- **Animation** — bubble entry animations are intentionally unspecified; consumers control this via CSS
