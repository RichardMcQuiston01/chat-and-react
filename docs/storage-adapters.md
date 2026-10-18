# Storage Adapters

[Back to README](../README.md)

| [Why use one](#why-use-one) | [Adapters you can use](#adapters-you-can-use) | [In the web component](#in-the-web-component) | [Headless](#headless-usage) | [Several tabs](#several-tabs) | [Write your own](#write-your-own) |

By default, progress is saved in `localStorage`. A storage adapter lets you save it somewhere else, like your server, or add retries and a memory fallback. Adapters follow the [`@richardmcquiston01/storage-adapters`](https://www.npmjs.com/package/@richardmcquiston01/storage-adapters) contract: an async key-value store that returns results you check instead of throwing.

## Why use one

- Save progress on your server so people can resume on another device.
- Wrap storage with `withFallback`, `withRetry`, `withPrefix` and the other wrappers from the package.
- Find out when saving fails. Failures go to your [error-log adapter](custom-adapters.md#errorlogadapter).

[Back to Top](#storage-adapters)

## Adapters you can use

| Adapter | Saves to | Import from `@richardmcquiston01/…` |
| --- | --- | --- |
| `localStorageAdapter()` | `localStorage` (survives closing the tab) | `storage-adapters/browser` |
| `sessionStorageAdapter()` | `sessionStorage` (lasts as long as the tab) | `storage-adapters/browser` |
| `indexedDbAdapter()` | IndexedDB (large values; other tabs hear about changes) | `storage-adapters/indexeddb` |
| `sqliteAdapter({ database })` | a SQLite table, through `node:sqlite`, `bun:sqlite` or any driver | `storage-adapters/sqlite` |
| `fileAdapter({ directory, fileSystem })` | one file per key in a folder | `storage-adapters/file` |
| `jsonFileAdapter({ path, fileSystem })` | one JSON file for all keys (best for small data) | `storage-adapters/json-file` |

`fileAdapter` and `jsonFileAdapter` take a `fileSystem`. In Node, Bun or Deno, use `nodeFileSystem()` from `@richardmcquiston01/storage-adapters/file/node`. It has its own entry point because it imports `node:fs`. The file adapters are safe within one process only. Use `sqliteAdapter` when more than one process writes.

```ts
import { jsonFileAdapter } from "@richardmcquiston01/storage-adapters/json-file";
import { nodeFileSystem } from "@richardmcquiston01/storage-adapters/file/node";

const adapter = jsonFileAdapter({ path: "progress.json", fileSystem: nodeFileSystem() });
```

[Back to Top](#storage-adapters)

## In the web component

Call `setStorageAdapter()` before the element is added to the page. The saved session loads first, so a returning visitor opens on the page they left.

```ts
import { localStorageAdapter } from "@richardmcquiston01/storage-adapters/browser";

const form = document.createElement("chat-form");
form.setAttribute("schema", JSON.stringify(schema));
form.setStorageAdapter(localStorageAdapter());
document.body.appendChild(form);
```

[Back to Top](#storage-adapters)

## Headless usage

`ChatController` is synchronous, so load the session first with `AdapterSessionManager.create()` and pass it in. Reads come from memory, and writes are saved in the background.

```ts
import { AdapterSessionManager, ChatController } from "@richardmcquiston01/chat-and-react-core";
import { localStorageAdapter } from "@richardmcquiston01/storage-adapters/browser";

const session = await AdapterSessionManager.create(localStorageAdapter(), {
  onError: (error) => myErrorAdapter.log(error),
});
const controller = new ChatController({ schema }, session);
controller.start();
```

If the adapter can't be reached, the form still works. Progress is kept in memory and `onError` is called once.

[Back to Top](#storage-adapters)

## Several tabs

`localStorageAdapter()` (from [`@richardmcquiston01/storage-adapters/browser`](https://www.npmjs.com/package/@richardmcquiston01/storage-adapters)) gives each saved value a revision and reports changes made in other tabs.

- **Conflicts:** if two tabs save at once, they are merged. Answers are merged per question. A tab that only typed never overwrites another tab's progress. After three conflicts in a row, the save is abandoned and reported.
- **Changes from another tab:** the session's copy is updated, and the element fires a [`chat-external-change`](events.md#chat-external-change) event with the new progress (`null` if the form was finished there). The form on screen is not moved; call `resync()` on the element to follow the other tab. With `AdapterSessionManager` on its own, the same notice is the `onExternalChange` option.
- **Finishing the form:** `complete()` clears the saved progress and answers and records when the form was finished (`completedAt()`), so a tab that is still open can tell "finished" from "cleared". The record stays in storage with that time and nothing else; `clearAll()` removes it.

[Back to Top](#storage-adapters)

## Write your own

Implement `StorageAdapter` for your server or database. `get` and `set` are required. Add revisions (an ETag or row version) to get conflict handling, and `subscribe` to hear about changes elsewhere.

```ts
import type { StorageAdapter } from "@richardmcquiston01/chat-and-react-core";

const serverAdapter: StorageAdapter = {
  async get(key, { signal }) {
    const response = await fetch(`/api/progress/${encodeURIComponent(key)}`, { signal });
    if (response.status === 404) return { ok: true, value: null };
    if (!response.ok) {
      return { ok: false, code: "unavailable", error: `GET ${key} returned HTTP ${response.status}` };
    }
    return {
      ok: true,
      value: { value: await response.text(), revision: response.headers.get("ETag") ?? undefined },
    };
  },
  async set(key, value, { signal, ifRevision }) {
    // PUT the value, send ifRevision as If-Match, and return code "conflict" on HTTP 412.
    throw new Error("not shown");
  },
};
```

Combine adapters with the package's wrappers:

```ts
import { withFallback, withRetry, memoryAdapter } from "@richardmcquiston01/storage-adapters";

const adapter = withFallback(withRetry(serverAdapter, { sleep }), memoryAdapter());
```

[Back to Top](#storage-adapters)

---

[Back to README](../README.md)
