# Custom Adapters

An adapter is a small piece of code that plugs into the library. You can write your own for three jobs: getting a schema in, sending events out, and logging errors.

## InputAdapter

Turns data from somewhere else into the library's schema format before the form shows up.

```ts
import type { InputAdapter } from "@richardmcquiston01/chat-and-react-core";

const myAdapter: InputAdapter = {
  transform(raw) {
    // raw is whatever you pass as the schema attribute
    return convertMyFormatToChatSchema(raw);
  },
};
```

## OutputAdapter

Handles the `page:submit` and `form:complete` events. Use it to send them to a webhook, a WebSocket, an EventEmitter, or anywhere else.

```ts
import type { OutputAdapter } from "@richardmcquiston01/chat-and-react-core";

const myAdapter: OutputAdapter = {
  emit(event) {
    fetch("/api/form-events", { method: "POST", body: JSON.stringify(event) });
  },
};
```

## ErrorLogAdapter

Sends runtime errors to a place you choose.

```ts
import type {
  ErrorLogAdapter,
  ChatError,
} from "@richardmcquiston01/chat-and-react-core";

const myAdapter: ErrorLogAdapter = {
  log(error: ChatError) {
    myLogger.error(error.code, error.message, error.cause);
  },
};
```

## Using your adapters

If you use `@richardmcquiston01/chat-and-react-core` on its own, pass your adapters to `ChatController`. See [Headless Usage](headless-usage.md).

Don't want to write your own? Try the [Optional Adapters](optional-adapters.md).
