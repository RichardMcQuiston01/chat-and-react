# Several Tabs

[Back to README](../README.md)

| [What is protected](#what-is-protected) | [What is not](#what-is-not) | [Make your server safe](#make-your-server-safe) | [Choosing storage](#choosing-storage) |

A visitor can open the same form in two tabs. The library keeps them from overwriting each other when it can tell they disagree. That check is **best-effort, not atomic**. This page says where it works and where it does not, so you know what your server may still receive.

## What is protected

With `userResumable` on, a tab remembers the saved progress it last read or wrote. When its visitor submits a page, it compares that with what is saved now. If another tab changed it, the submit is stopped:

- Nothing is saved, and `chat-page-submit` and `chat-form-complete` do not fire.
- The tab follows the newer one, or shows the finished form if the other tab finished it.
- [`chat-stale-submit`](events.md#chat-stale-submit) fires so your page can tell the visitor.

A tab does not move on its own when another tab changes the saved progress. It fires [`chat-external-change`](events.md#chat-external-change), and `resync()` makes it follow.

## What is not

- **Check and save are separate steps, with no lock.** If two tabs submit within the same moment, before either has saved, both pass the check. Both send `chat-page-submit` for the page. With the default storage, the later write wins. With a [storage adapter that keeps revisions](storage-adapters.md#several-tabs), the saves are merged per question (or abandoned and reported after three conflicts in a row), but the events have already been sent.
- **A tab can only notice what its storage tells it.** The default storage is read live, so the check sees a change as soon as it is written. A storage adapter keeps a copy in memory that is updated only when the adapter reports a change (`subscribe`). If your adapter has no `subscribe`, or the notice is slow, a tab does not know it is behind. Revisions still protect what is saved, but both tabs can send the same page.
- **Only tabs that share storage are compared.** The default storage is `localStorage`, shared by tabs of one browser profile on one origin. Another browser, a private window or another device is not seen, unless your adapter saves to a server and reports changes.
- **Storage that is blocked or off is not shared.** With `userResumable` set to `false`, or `localStorage` blocked by the browser, nothing is compared and nothing is saved.
- **Unsubmitted answers are last-write-wins.** What a visitor has typed but not submitted is saved per question. Two tabs on the same question overwrite each other's draft.
- **The stopped tab loses its page.** The answers typed on the page a stale tab was behind on are not saved.
- **"Finished" is remembered for 24 hours.** After that, a tab that was left open and submits is not told the form was finished elsewhere.
- **Same schema, same progress.** Two forms with the same schema and `storage-key` on one page share progress, so they can be "behind" each other like two tabs. Give each its own `storage-key`.

## Make your server safe

Do not rely on the browser to send each page once. Make the receiving end idempotent. Every event carries what you need:

- `chat-page-submit` has `sessionId` and `pageId`. For a first submit (no `edited` flag), treat `(sessionId, pageId)` as the key and ignore a repeat. A submit with `edited: true` is a change to an earlier page, so apply it as an update. Do not use `visitIndex` as the key: it counts the submits made by one tab's form, so two tabs can disagree on it.
- `chat-form-complete` has `sessionId`. Accept the first and ignore the rest.

If answers differ between two sends with the same key, keep the first, or decide on a rule that suits your data.

## Choosing storage

| You need | Use |
| --- | --- |
| One browser, tabs mostly agree | The default. Nothing to set up |
| Tabs told quickly, merged saves | A [storage adapter](storage-adapters.md) with revisions and `subscribe`, such as `localStorageAdapter()` |
| Progress shared across devices | An adapter that saves to your server, with revisions, and your own server-side dedupe above |

[Back to Top](#several-tabs)
