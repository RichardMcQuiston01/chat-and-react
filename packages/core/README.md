# @richardmcquiston01/chat-and-react-core

Headless controller, JSON Schema validation, and session management for [chat-and-react](https://github.com/RichardMcQuiston01/chat-and-react) — a framework-agnostic conversational form library. No DOM dependency; use it directly in Node, on the server, or from any UI framework.

## Installation

```bash
npm install @richardmcquiston01/chat-and-react-core
```

## Usage

```ts
import { ChatController, parseSchema } from "@richardmcquiston01/chat-and-react-core";

const schema = parseSchema(rawJson);

const controller = new ChatController({ schema });

controller.on("page:submit", (event) => {
  saveToDatabase(event);
});

controller.on("form:complete", (event) => {
  finalizeSubmission(event.allAnswers);
});

controller.start();

const page = controller.getCurrentPage();
const questions = controller.getVisibleQuestions();

// After collecting answers from your own UI:
controller.submitPage({ question_id: "answer value" });
```

## What's included

- `parseSchema` — validates JSON Schema Draft-07 extended with `x-chat-*` keywords
- `RuleEngine` — evaluates JsonLogic rules for per-question visibility (`x-chat-condition`)
- `SessionManager` — session ID and progress persistence with an injectable `StorageBackend`
- `ChatController` — page-graph navigation, answer accumulation, event emission (`page:submit`, `form:complete`)
- Built-in adapters: `IdentityInputAdapter`, `BrowserEventAdapter`, `ConsoleErrorAdapter`
- `AdapterSessionManager` — saves progress through any storage adapter; `localStorageAdapter`, `sessionStorageAdapter` and `indexedDbAdapter` are re-exported from `@richardmcquiston01/storage-adapters`

## Full documentation

See the [project README](https://github.com/RichardMcQuiston01/chat-and-react#readme) for the complete schema format, branching rules, and adapter guide.

## License

Apache 2.0 — see [LICENSE](https://github.com/RichardMcQuiston01/chat-and-react/blob/main/LICENSE).
