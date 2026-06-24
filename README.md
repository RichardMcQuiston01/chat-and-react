# chat-and-react

A framework-agnostic TypeScript library that renders a chat-style form interface as a Web Component. Drop in a JSON schema describing your questions, branching logic, and input types — the library drives the conversation and emits events as the user progresses.

## Installation

```bash
# npm
npm install chat-and-react

# bun
bun add chat-and-react
```

The core logic is also available separately if you only need the headless controller:

```bash
npm install @chat-and-react/core
```

Optional pre-built adapters (webhook, WebSocket, MongoDB, MySQL, EventEmitter):

```bash
npm install @chat-and-react/adapters
```

## CDN / Script Tag

```html
<script src="https://unpkg.com/chat-and-react/dist/chat-and-react.iife.js"></script>
```

The IIFE bundle registers the `<chat-form>` element and exposes `window.ChatAndReact`.

---

## Quick Start

```html
<chat-form id="my-form" schema='{"$schema":"...","x-chat-version":"1","x-chat-pages":[...]}'></chat-form>

<script type="module">
  import 'chat-and-react';

  const el = document.getElementById('my-form');

  el.addEventListener('chat-page-submit', (e) => {
    console.log('Page submitted:', e.detail);
    // { sessionId, pageId, visitIndex, answers }
  });

  el.addEventListener('chat-form-complete', (e) => {
    console.log('Form complete:', e.detail);
    // { sessionId, allAnswers }
  });
</script>
```

---

## Demo

The repository includes a Vite SPA demo in `packages/demo` that shows the web component in action.

### Running the demo

```bash
# From the repo root — install all workspace deps first
bun install

# Then start the dev server
cd packages/demo
bun run dev
```

Open `http://localhost:5173` in your browser.

### What the demo shows

The demo runs a five-page form covering all supported input types and branching:

| Page | Input types used |
|------|-----------------|
| Welcome | `text` (name), `textarea` (bio — conditional on name being filled) |
| Preferences | `radio` (contact method), `checkbox` (interests), `dropdown` (country), `radio` (occupation) |
| Education *(students only)* | `text` (school), `dropdown` (study level) |
| Profession *(workers only)* | `text` (job title), `dropdown` (industry) |
| Final | `textarea` (feedback) |

The occupation answer on the Preferences page drives branching: students are routed to the Education page, workers to the Profession page, and everyone else jumps straight to Final.

A **live event log** panel on the right side of the screen displays the JSON payload of every `chat-page-submit` and `chat-form-complete` event as they fire. A **Start over** button appears when the form completes, clearing the log and resetting the form.

### Building the demo for static hosting

```bash
cd packages/demo
bun run build   # output written to packages/demo/dist/
bun run preview # serve the built output locally
```

---

## Schema Builder

The repository includes a visual schema editor in `packages/schema-builder` — a Vite + React 18 SPA that lets you create, edit, import, and export `chat-and-react` JSON schemas without hand-writing JSON.

### Running the Schema Builder

```bash
# From the repo root — install all workspace deps first
bun install

# Then start the dev server
cd packages/schema-builder
bun run dev
```

Open `http://localhost:5173` in your browser (port may increment if already in use).

### What you can do

| Feature | Description |
|---------|-------------|
| **Page management** | Add, remove, and select pages from the left sidebar |
| **Question editor** | Edit ID, title, input type, options, and placeholder per question; move questions up/down |
| **Conditional visibility** | Attach a named-rule condition ref to any question so it only appears when the rule passes |
| **Branching rules** | Add `if` / `always` rules per page — pick the triggering question, expected value, and destination page; the terminal `always` rule is protected |
| **Named rules** | Edit `x-chat-rules` as raw JSON; rule names auto-populate condition ref dropdowns |
| **Schema options** | Toggle `userResumable`, `localStorage`, and `autoComplete` |
| **Import** | Load an existing `schema.json` file to continue editing it |
| **Validate** | Run `parseSchema` against the current schema and see a success or error banner |
| **Export** | Download `schema.json` — validation runs first; the file is only written if the schema is valid |
| **JSON preview** | Collapsible bottom drawer showing the live formatted JSON output |

### Building the Schema Builder for static hosting

```bash
cd packages/schema-builder
bun run build   # output written to packages/schema-builder/dist/
bun run preview # serve the built output locally
```

---

## Schema Format

Schemas follow JSON Schema Draft-07 extended with `x-chat-*` keywords.

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
      "id": "intro",
      "title": "What's your name?",
      "questions": [
        {
          "id": "full_name",
          "type": "string",
          "x-chat-input": "text",
          "title": "Full name",
          "x-chat-placeholder": "Type your name..."
        }
      ],
      "branching": [
        { "type": "always", "destination_id": "**FORM_COMPLETED**" }
      ]
    }
  ]
}
```

### Page branching

Each page has a `branching` array. Rules are evaluated top-to-bottom; the first match wins.

| Rule type | Description |
|-----------|-------------|
| `"if"` | Matches when a named answer equals a specific value |
| `"always"` | Unconditional fallback |

Use `"**FORM_COMPLETED**"` as a `destination_id` to end the form.

```json
"branching": [
  { "type": "if", "form_element": "student_status", "value": "Yes", "destination_id": "student-page" },
  { "type": "always", "destination_id": "final-page" }
]
```

### Question visibility

Add `x-chat-condition` with a JsonLogic rule to conditionally show a question:

```json
{
  "id": "follow_up",
  "x-chat-input": "text",
  "title": "Tell us more",
  "x-chat-condition": { "!!": [{ "var": "initial_answer" }] }
}
```

### Input types

| `x-chat-input` | Renders as |
|----------------|-----------|
| `text` | Single-line text input |
| `textarea` | Multi-line text input |
| `dropdown` | `<select>` — options from `enum` |
| `radio` | Radio buttons — options from `enum` |
| `checkbox` | Checkboxes — options from `enum` (multi-select) |

---

## Options

Options can be set in the schema under `x-chat-options`, or as element attributes (attributes take precedence).

| Option | Attribute | Default | Description |
|--------|-----------|---------|-------------|
| `userResumable` | `user-resumable` | `true` | Persist progress; suppress `page:submit` events when `false` |
| `localStorage` | `local-storage` | `false` | Save each answer to `localStorage` as the user types |
| `autoComplete` | `auto-complete` | `true` | Set `autocomplete="off"` on all inputs when `false` |

---

## Events

Both events bubble as browser `CustomEvent`s with a `detail` payload.

### `chat-page-submit`

Fires after each page is submitted (suppressed when `userResumable` is `false`).

```ts
{
  sessionId: string;
  pageId: string;
  visitIndex: number;  // 0-based, increments per page visited
  answers: Record<string, string | string[]>;
}
```

### `chat-form-complete`

Fires when no further pages remain.

```ts
{
  sessionId: string;
  allAnswers: Record<string, string | string[]>;
}
```

---

## Styling

The element uses Shadow DOM. Style it via CSS custom properties on the host, or override the standard CSS classes using `::part()`.

### CSS custom properties

```css
chat-form {
  --car-bg: #f5f5f5;
  --car-bubble-bg: #ffffff;
  --car-bubble-user-bg: #0070f3;
  --car-accent: #0070f3;
  --car-radius: 8px;
  --car-font: system-ui, sans-serif;
}
```

### CSS parts

```css
chat-form::part(bubble-bot)  { /* bot message bubbles */ }
chat-form::part(bubble-user) { /* user reply bubbles */ }
chat-form::part(input)       { /* input elements */ }
chat-form::part(submit-btn)  { /* submit button */ }
```

### CSS class reference

The element emits a standard set of classes that can be targeted from within a CSS layer or via `::slotted()`:

| Class | Element |
|-------|---------|
| `car-chat` | Root wrapper |
| `car-page` | Page container |
| `car-bubble` | Bot message bubble |
| `car-bubble--user` | User reply bubble |
| `car-input-wrap` | Input wrapper |
| `car-input` | Input element |
| `car-btn-submit` | Submit button |

---

## Custom Adapters

### InputAdapter

Transform an external data source into the library's schema format before the form renders.

```ts
import type { InputAdapter } from '@chat-and-react/core';

const myAdapter: InputAdapter = {
  transform(raw) {
    // raw is whatever you pass as the schema attribute
    return convertMyFormatToChatSchema(raw);
  },
};
```

### OutputAdapter

Handle `page:submit` and `form:complete` events with a custom sink (webhook, WebSocket, EventEmitter, etc.).

```ts
import type { OutputAdapter } from '@chat-and-react/core';

const myAdapter: OutputAdapter = {
  emit(event) {
    fetch('/api/form-events', { method: 'POST', body: JSON.stringify(event) });
  },
};
```

### ErrorLogAdapter

Route runtime errors to a custom sink.

```ts
import type { ErrorLogAdapter, ChatError } from '@chat-and-react/core';

const myAdapter: ErrorLogAdapter = {
  log(error: ChatError) {
    myLogger.error(error.code, error.message, error.cause);
  },
};
```

Adapters are supplied to `ChatController` directly when using `@chat-and-react/core` headlessly (see [Headless Usage](#headless-usage-chat-and-reactcore) below).

---

## Optional Adapters (`@chat-and-react/adapters`)

Install the adapters package alongside core or the web component:

```bash
npm install @chat-and-react/adapters
```

### Output adapters

**`EventEmitterOutputAdapter`** — emit events on a Node.js `EventEmitter`:

```ts
import { EventEmitter } from 'node:events';
import { EventEmitterOutputAdapter } from '@chat-and-react/adapters';

const emitter = new EventEmitter();
emitter.on('page:submit', (event) => { /* ... */ });
emitter.on('form:complete', (event) => { /* ... */ });

const adapter = new EventEmitterOutputAdapter(emitter);
```

**`WebhookOutputAdapter`** — POST each event to a webhook URL (fire-and-forget):

```ts
import { WebhookOutputAdapter } from '@chat-and-react/adapters';

const adapter = new WebhookOutputAdapter('https://api.example.com/events', {
  headers: { Authorization: 'Bearer my-token' },
});
```

**`WebSocketOutputAdapter`** — send events over an open WebSocket:

```ts
import { WebSocketOutputAdapter } from '@chat-and-react/adapters';

const socket = new WebSocket('wss://api.example.com/ws');
const adapter = new WebSocketOutputAdapter(socket);
// Silently no-ops if the socket is not open when emit() is called.
```

### Error-log adapters

**`WebhookErrorAdapter`** — POST errors to a webhook URL:

```ts
import { WebhookErrorAdapter } from '@chat-and-react/adapters';

const adapter = new WebhookErrorAdapter('https://api.example.com/errors', {
  headers: { 'X-Api-Key': 'secret' },
});
```

**`MongoDbErrorAdapter`** — insert errors into a MongoDB collection:

```ts
import { MongoClient } from 'mongodb';
import { MongoDbErrorAdapter } from '@chat-and-react/adapters';

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const collection = client.db('mydb').collection('chat_errors');
const adapter = new MongoDbErrorAdapter(collection);
```

### Input adapters

Both database input adapters use a static async `create()` factory. The schema is fetched once at creation time; `transform()` returns the cached result.

**`MySqlInputAdapter`** — load a schema from MySQL:

```ts
import mysql from 'mysql2/promise';
import { MySqlInputAdapter } from '@chat-and-react/adapters';

const connection = await mysql.createConnection({ host: 'localhost', /* ... */ });
const adapter = await MySqlInputAdapter.create(
  connection,
  'SELECT schema_json FROM form_schemas WHERE slug = ?',
  ['contact-form'],
);
```

**`MongoDbInputAdapter`** — load a schema from a MongoDB document:

```ts
import { MongoClient } from 'mongodb';
import { MongoDbInputAdapter } from '@chat-and-react/adapters';

const collection = client.db('mydb').collection('schemas');
const adapter = await MongoDbInputAdapter.create(collection, { slug: 'contact-form' });
```

Use any adapter with `ChatController`:

```ts
import { ChatController } from '@chat-and-react/core';

const controller = new ChatController({
  schema: null,        // ignored when using a DB input adapter
  inputAdapter: adapter,
  outputAdapter: webhookAdapter,
  errorAdapter: mongoErrorAdapter,
});
controller.start();
```

---

## Headless Usage (`@chat-and-react/core`)

Use the core package directly in a Node or server-side context without any DOM dependency.

```ts
import { ChatController, parseSchema } from '@chat-and-react/core';

const schema = parseSchema(rawJson);

const controller = new ChatController({ schema });

controller.on('page:submit', (event) => {
  saveToDatabase(event);
});

controller.on('form:complete', (event) => {
  finalizeSubmission(event.allAnswers);
});

controller.start();

const page = controller.getCurrentPage();
const questions = controller.getVisibleQuestions();

// After collecting answers from your own UI:
controller.submitPage({ question_id: 'answer value' });
```

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

## Copyright

Copyright © 2026 Richard McQuiston. All rights reserved.
