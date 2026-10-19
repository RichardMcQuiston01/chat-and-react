# Events

[Back to README](../README.md)

| [`chat-page-submit`](#chat-page-submit) | [`chat-form-complete`](#chat-form-complete) | [`chat-external-change`](#chat-external-change) | [`chat-stale-submit`](#chat-stale-submit) | [`chat-error`](#chat-error) | [Listening for events](#listening-for-events) |

The form sends the first two events as the visitor works through it. The next two tell you when another tab changed the saved progress, and `chat-error` tells you the form could not start. All are browser `CustomEvent`s that bubble up the page. The data is in `event.detail`.

## `chat-page-submit`

Fires each time a page is submitted. A page's questions are asked one at a time, each with its own Continue button, so this event fires once, after the last question of the page is answered. It does not fire when `userResumable` is `false`.

```ts
{
  sessionId: string;
  pageId: string;
  visitIndex: number; // starts at 0 and goes up by 1 for each page visited
  answers: Record<string, string | string[]>;
  edited?: true; // only present when the user re-submitted a page they had already answered
}
```

When a user edits an earlier answer (see [Options](options.md#editing-answers)), the page is submitted again with the new answers. The event has `edited: true` and a new `visitIndex`. If you save answers as they arrive, replace what you stored for that `pageId`.

[Back to Top](#events)

## `chat-form-complete`

Fires when there are no more pages left.

```ts
{
  sessionId: string;
  allAnswers: Record<string, string | string[]>;
}
```

[Back to Top](#events)

## `chat-external-change`

Fires when another tab (or another window) changes this form's saved progress. It is only a notice: the form on screen does not move. It does not fire for changes made in this tab.

```ts
{
  progress: {
    currentPageId: string; // the page the other tab is on
    answers: Record<string, string | string[]>;
  } | null; // null when the other tab finished or cleared the form
}
```

It works with the built-in storage (using the browser's `storage` event) and with a [storage adapter](storage-adapters.md#several-tabs) that reports changes, such as `localStorageAdapter()`.

To make this tab follow the other one, call `resync()` on the element. It reloads what is saved, drops the chat on screen, and restarts on the saved page. It resolves to `true` once the form has restarted, and to `false` when there is nothing to restart (the element is not on the page or has no valid `schema`). If the form was finished or cleared elsewhere, it starts again from the first page.

```js
el.addEventListener("chat-external-change", async (e) => {
  if (e.detail.progress === null) return; // finished or cleared elsewhere: leave this tab alone
  if (confirm("This form was updated in another tab. Switch to it?")) {
    const restarted = await el.resync();
    if (!restarted) console.warn("The form could not be restarted");
  }
});
```

[Back to Top](#events)

## `chat-stale-submit`

Fires when a visitor submits a page in a tab that is behind: another tab has changed the saved progress since this tab last read or wrote it. Nothing is saved or sent. `chat-page-submit` and `chat-form-complete` do not fire for that submit, so a second tab cannot send answers again or wipe the newer progress.

```ts
{
  progress: {
    currentPageId: string; // the page the other tab is on
    answers: Record<string, string | string[]>;
  } | null;
  completed: boolean; // true when the other tab finished the form
}
```

What the tab does next depends on `completed`:

- **`false`:** the tab follows the newer one. It does what `resync()` does and restarts on the saved page. If the saved progress was cleared, `progress` is `null` and the form starts again from the first page. The answers the visitor typed on the page they were behind on are not saved.
- **`true`:** the other tab finished the form (within the last 24 hours). This tab shows the form as finished: the input and the Edit icons go away, and the chat history stays.

Use the event to tell the visitor, for example "This form was already completed in another tab". The library shows no message of its own. The check is best-effort, so your server should also ignore repeats; see [Several Tabs](several-tabs.md). Tabs are only compared when `userResumable` is `true`. Two forms with the same schema on one page share progress, so they can be "behind" each other in the same way.

[Back to Top](#events)

## `chat-error`

Fires when the form cannot start. It is the only way your page learns that a form did not appear, because the library shows no message of its own.

```ts
{
  code: "SCHEMA_INVALID" | "ADAPTER_ERROR";
  message: string; // what went wrong, for example 'x-chat-version must be "1"'
  cause?: unknown; // the underlying error, when there is one
  source?: string;
  timestamp?: string; // ISO 8601
}
```

It fires when:

- **The `schema` attribute is not valid JSON.** `code` is `SCHEMA_INVALID` and `message` is `schema attribute is not valid JSON`.
- **The schema is not a valid chat schema.** `code` is `SCHEMA_INVALID` and `message` names the problem, such as an unknown `x-chat-version`, a duplicate page `id`, or a `branching` list that does not end with an `always` rule.
- **Your `InputAdapter` throws** while turning the schema into the native format. `code` is `ADAPTER_ERROR`, and `cause` holds what it threw.

The form does not start after a `chat-error`. For the second and third cases the error is also sent to the [`ErrorLogAdapter`](custom-adapters.md); the invalid JSON case is not.

Errors that do not stop the form, such as storage being unavailable or an `OutputAdapter` that throws, do **not** fire this event. They go only to the `ErrorLogAdapter`, and the form keeps running. By default that writes to `console.error`.

`event.detail` is the error the library raised. If something unexpected throws while the form starts, `detail` is whatever was thrown, so check that `detail.code` exists before you use it.

```js
el.addEventListener("chat-error", (e) => {
  showBanner(`This form could not load (${e.detail?.code ?? "unknown"}).`);
});
```

[Back to Top](#events)

## Listening for events

```js
const el = document.getElementById("my-form");

el.addEventListener("chat-page-submit", (e) => {
  console.log("Page submitted:", e.detail);
});

el.addEventListener("chat-form-complete", (e) => {
  console.log("Form complete:", e.detail);
});
```

Want to send events somewhere else, like a server? See [Custom Adapters](custom-adapters.md).

[Back to Top](#events)

---

[Back to README](../README.md)
