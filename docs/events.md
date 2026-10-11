# Events

The form sends two events. Both are browser `CustomEvent`s that bubble up the page. The data is in `event.detail`.

## `chat-page-submit`

Fires each time a page is submitted. A page's questions are asked one at a time, each with its own Continue button, so this event fires once, after the last question of the page is answered. It does not fire when `userResumable` is `false`.

```ts
{
  sessionId: string;
  pageId: string;
  visitIndex: number; // starts at 0 and goes up by 1 for each page visited
  answers: Record<string, string | string[]>;
}
```

## `chat-form-complete`

Fires when there are no more pages left.

```ts
{
  sessionId: string;
  allAnswers: Record<string, string | string[]>;
}
```

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
