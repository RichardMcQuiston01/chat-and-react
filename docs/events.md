# Events

[Back to README](../README.md)

| [`chat-page-submit`](#chat-page-submit) | [`chat-form-complete`](#chat-form-complete) | [`chat-external-change`](#chat-external-change) | [Listening for events](#listening-for-events) |

The form sends the first two events as the visitor works through it. A third tells you when another tab changed the saved progress. All are browser `CustomEvent`s that bubble up the page. The data is in `event.detail`.

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

Two tabs on the same form can each submit their own pages, so the page that was submitted last is the one that is saved. If a form sends answers to your server, use this event to stop a second tab from sending them again.

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
