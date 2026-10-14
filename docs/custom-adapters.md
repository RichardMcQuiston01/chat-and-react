# Custom Adapters

[Back to README](../README.md)

| [InputAdapter](#inputadapter) | [OutputAdapter](#outputadapter) | [ErrorLogAdapter](#errorlogadapter) | [Using your adapters](#using-your-adapters) |

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

[Back to Top](#custom-adapters)

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

[Back to Top](#custom-adapters)

## ErrorLogAdapter

Sends runtime errors to a place you choose. The interface comes from [`@richardmcquiston01/error-log-adapter`](https://www.npmjs.com/package/@richardmcquiston01/error-log-adapter), which you can also use in your other projects.

`log` returns a `Promise<ErrorLogResult>`. Catch your own failures and return `{ ok: false, error: "..." }` instead of throwing. The controller writes a failed result to `console.error`.

```ts
import type {
  ErrorLogAdapter,
  ErrorLogResult,
  ChatError,
} from "@richardmcquiston01/chat-and-react-core";

const myAdapter: ErrorLogAdapter = {
  async log(error: ChatError): Promise<ErrorLogResult> {
    try {
      myLogger.error(error.code, error.message, error.cause);
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: `myLogger failed: ${String(cause)}` };
    }
  },
};
```

[Back to Top](#custom-adapters)

## Using your adapters

If you use `@richardmcquiston01/chat-and-react-core` on its own, pass your adapters to `ChatController`. See [Headless Usage](headless-usage.md).

Don't want to write your own? Try the [Optional Adapters](optional-adapters.md).

[Back to Top](#custom-adapters)

---

[Back to README](../README.md)
