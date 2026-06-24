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

  el.addEventListener('car:page:submit', (e) => {
    console.log('Page submitted:', e.detail);
    // { sessionId, pageId, visitIndex, answers }
  });

  el.addEventListener('car:form:complete', (e) => {
    console.log('Form complete:', e.detail);
    // { sessionId, allAnswers }
  });
</script>
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

### `car:page:submit`

Fires after each page is submitted (suppressed when `userResumable` is `false`).

```ts
{
  sessionId: string;
  pageId: string;
  visitIndex: number;  // 0-based, increments per page visited
  answers: Record<string, string | string[]>;
}
```

### `car:form:complete`

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
import type { ErrorLogAdapter } from '@chat-and-react/core';

const myAdapter: ErrorLogAdapter = {
  log(code, message, cause) {
    myLogger.error({ code, message, cause });
  },
};
```

### Registering adapters

```ts
import { AdapterRegistry } from 'chat-and-react';

const registry = new AdapterRegistry();
registry.setInputAdapter(myAdapter);
registry.setOutputAdapter(myOutputAdapter);
registry.setErrorAdapter(myErrorAdapter);
```

Pass the registry to the element before it connects to the DOM (or supply adapters via `ChatController` directly when using `@chat-and-react/core` headlessly).

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
