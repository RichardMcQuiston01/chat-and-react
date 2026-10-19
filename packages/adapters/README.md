# @richardmcquiston01/chat-and-react-adapters

Optional input, output, and error-log adapters for [chat-and-react](https://github.com/RichardMcQuiston01/chat-and-react). Use alongside `@richardmcquiston01/chat-and-react-core` or the `@richardmcquiston01/chat-and-react` web component.

## Installation

```bash
npm install @richardmcquiston01/chat-and-react-adapters
```

`mongodb` and `mysql2` are optional peer dependencies — install whichever ones you need.

## Output adapters

**`EventEmitterOutputAdapter`** — emit events on a Node.js `EventEmitter`:

```ts
import { EventEmitter } from "node:events";
import { EventEmitterOutputAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const emitter = new EventEmitter();
const adapter = new EventEmitterOutputAdapter(emitter);
```

**`WebhookOutputAdapter`** — POST each event to a webhook URL (fire-and-forget):

```ts
import { WebhookOutputAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const adapter = new WebhookOutputAdapter("https://api.example.com/events", {
  headers: { Authorization: "Bearer my-token" },
});
```

**`WebSocketOutputAdapter`** — send events over an open WebSocket (no-ops silently if the socket isn't open).

## Error-log adapters

- **`WebhookErrorAdapter`** — POST errors to a webhook URL
- **`MongoDbErrorAdapter`** — insert errors into a MongoDB collection
- **`JsonFileErrorAdapter`** / **`FlatFileErrorAdapter`** — write to a JSON or text file (Node, Bun)
- **`SqliteErrorAdapter`** — insert into a SQLite table through any driver
- **`WebStorageErrorAdapter`** / **`IndexedDbErrorAdapter`** — keep errors in the browser
- **`CompositeErrorAdapter`** — send each error to several adapters

All are imported from [`@richardmcquiston01/error-log-adapter`](https://www.npmjs.com/package/@richardmcquiston01/error-log-adapter).

## Storage adapters

- **`sqliteAdapter`**, **`fileAdapter`**, **`jsonFileAdapter`** — save form progress on a server, imported from [`@richardmcquiston01/storage-adapters`](https://www.npmjs.com/package/@richardmcquiston01/storage-adapters). See [Storage Adapters](https://github.com/RichardMcQuiston01/chat-and-react/blob/main/docs/storage-adapters.md).

## Input adapters

- **`MySqlInputAdapter`** — static async `create()` factory; fetches a schema via a `mysql2`-compatible connection and caches it
- **`MongoDbInputAdapter`** — static async `create()` factory; fetches a schema document from MongoDB and caches it

## Full documentation

See the [project README](https://github.com/RichardMcQuiston01/chat-and-react#readme) for full usage examples for every adapter.

## License

Apache 2.0 — see [LICENSE](https://github.com/RichardMcQuiston01/chat-and-react/blob/main/LICENSE).

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](https://raw.githubusercontent.com/RichardMcQuiston01/chat-and-react/main/donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)
