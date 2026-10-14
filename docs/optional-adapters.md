# Optional Adapters

[Back to README](../README.md)

| [Output adapters](#output-adapters) | [Error-log adapters](#error-log-adapters) | [Storage adapters](#storage-adapters) | [Input adapters](#input-adapters) | [Using an adapter](#using-an-adapter) |

The `@richardmcquiston01/chat-and-react-adapters` package has ready-made adapters. Install it next to the core package or the web component:

```bash
npm install @richardmcquiston01/chat-and-react-adapters
```

## Output adapters

**`EventEmitterOutputAdapter`** sends events through a Node.js `EventEmitter`:

```ts
import { EventEmitter } from "node:events";
import { EventEmitterOutputAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const emitter = new EventEmitter();
emitter.on("page:submit", (event) => {
  /* ... */
});
emitter.on("form:complete", (event) => {
  /* ... */
});

const adapter = new EventEmitterOutputAdapter(emitter);
```

**`WebhookOutputAdapter`** sends each event to a webhook URL with a POST request. It does not wait for a reply ("fire-and-forget"):

```ts
import { WebhookOutputAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const adapter = new WebhookOutputAdapter("https://api.example.com/events", {
  headers: { Authorization: "Bearer my-token" },
});
```

**`WebSocketOutputAdapter`** sends events over an open WebSocket:

```ts
import { WebSocketOutputAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const socket = new WebSocket("wss://api.example.com/ws");
const adapter = new WebSocketOutputAdapter(socket);
// If the socket is not open when emit() is called, nothing happens.
```

[Back to Top](#optional-adapters)

## Error-log adapters

These come from [`@richardmcquiston01/error-log-adapter`](https://www.npmjs.com/package/@richardmcquiston01/error-log-adapter) and are re-exported here. `log` returns a result you can check, and a failing sink never throws.

| Adapter | Sends errors to | Works in |
| --- | --- | --- |
| `WebhookErrorAdapter` | an HTTP endpoint | anywhere with `fetch` |
| `MongoDbErrorAdapter` | a MongoDB collection | server |
| `JsonFileErrorAdapter` | a JSON file (one object per line, or one array) | Node, Bun |
| `FlatFileErrorAdapter` | a text log file, with optional rotation | Node, Bun |
| `SqliteErrorAdapter` | a SQLite table, through any driver | server |
| `WebStorageErrorAdapter` | `localStorage` or `sessionStorage` | browser |
| `IndexedDbErrorAdapter` | an IndexedDB object store | browser |
| `CompositeErrorAdapter` | several of the above at once | anywhere |

**`WebhookErrorAdapter`** sends errors to a webhook URL:

```ts
import { WebhookErrorAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const adapter = new WebhookErrorAdapter("https://api.example.com/errors", {
  headers: { "X-Api-Key": "secret" },
});
```

**`MongoDbErrorAdapter`** saves errors in a MongoDB collection:

```ts
import { MongoClient } from "mongodb";
import { MongoDbErrorAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const collection = client.db("mydb").collection("chat_errors");
const adapter = new MongoDbErrorAdapter(collection);
```

**`JsonFileErrorAdapter`** and **`FlatFileErrorAdapter`** write to a file. A file that is not valid JSON is moved to `<path>.corrupt` instead of being overwritten, and the flat file can rotate when it gets large:

```ts
import {
  FlatFileErrorAdapter,
  JsonFileErrorAdapter,
} from "@richardmcquiston01/chat-and-react-adapters";

const jsonLog = new JsonFileErrorAdapter("logs/errors.ndjson"); // one JSON object per line
const arrayLog = new JsonFileErrorAdapter("logs/errors.json", { mode: "array", maxEntries: 500 });
const textLog = new FlatFileErrorAdapter("logs/errors.log", { maxBytes: 1_000_000, maxFiles: 3 });
```

**`SqliteErrorAdapter`** works with any driver that can run a statement. It writes to a singular `error_log` table with a UUID `id`:

```ts
import { Database } from "bun:sqlite";
import { SqliteErrorAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const database = new Database("errors.db");
const adapter = new SqliteErrorAdapter({ run: (sql, params) => database.run(sql, params as never[]) });
```

**`WebStorageErrorAdapter`** and **`IndexedDbErrorAdapter`** keep errors in the browser. The web storage one keeps the newest 100 by default:

```ts
import {
  createErrorLogStore,
  IndexedDbErrorAdapter,
  WebStorageErrorAdapter,
} from "@richardmcquiston01/chat-and-react-adapters";

const small = new WebStorageErrorAdapter(localStorage, { key: "my-app:errors", maxEntries: 50 });

// IndexedDB: create the store when the database is opened, then pass the database in.
const request = indexedDB.open("my-app", 1);
request.onupgradeneeded = () => createErrorLogStore(request.result);
request.onsuccess = () => {
  const adapter = new IndexedDbErrorAdapter(request.result);
};
```

**`CompositeErrorAdapter`** sends each error to several adapters and succeeds only if all of them do:

```ts
import { ConsoleErrorAdapter } from "@richardmcquiston01/chat-and-react-core";
import { CompositeErrorAdapter, WebhookErrorAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const adapter = new CompositeErrorAdapter([
  new ConsoleErrorAdapter(),
  new WebhookErrorAdapter("https://api.example.com/errors"),
]);
```

## Storage adapters

The package also re-exports `sqliteAdapter`, `fileAdapter` and `jsonFileAdapter` from [`@richardmcquiston01/storage-adapters`](https://www.npmjs.com/package/@richardmcquiston01/storage-adapters), for saving form progress on a server. See [Storage Adapters](storage-adapters.md).

[Back to Top](#optional-adapters)

## Input adapters

Both database input adapters are created with a static async `create()` method. The schema is loaded once, when you create the adapter. After that, `transform()` returns the saved copy.

**`MySqlInputAdapter`** loads a schema from MySQL:

```ts
import mysql from "mysql2/promise";
import { MySqlInputAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const connection = await mysql.createConnection({
  host: "localhost" /* ... */,
});
const adapter = await MySqlInputAdapter.create(
  connection,
  "SELECT schema_json FROM form_schemas WHERE slug = ?",
  ["contact-form"],
);
```

**`MongoDbInputAdapter`** loads a schema from a MongoDB document:

```ts
import { MongoClient } from "mongodb";
import { MongoDbInputAdapter } from "@richardmcquiston01/chat-and-react-adapters";

const collection = client.db("mydb").collection("schemas");
const adapter = await MongoDbInputAdapter.create(collection, {
  slug: "contact-form",
});
```

[Back to Top](#optional-adapters)

## Using an adapter

Pass any adapter to `ChatController`:

```ts
import { ChatController } from "@richardmcquiston01/chat-and-react-core";

const controller = new ChatController({
  schema: null, // ignored when using a DB input adapter
  inputAdapter: adapter,
  outputAdapter: webhookAdapter,
  errorAdapter: mongoErrorAdapter,
});
controller.start();
```

[Back to Top](#optional-adapters)

---

[Back to README](../README.md)
