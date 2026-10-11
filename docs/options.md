# Options

You can set options in the schema under `x-chat-options`. You can also set them as attributes on the element. If you set both, the attribute wins.

| Option              | Attribute             | Default | What it does                                                                           |
| ------------------- | --------------------- | ------- | -------------------------------------------------------------------------------------- |
| `userResumable`     | `user-resumable`      | `true`  | Saves progress so users can come back. When `false`, `page:submit` events are not sent |
| `localStorage`      | `local-storage`       | `false` | Saves each answer to `localStorage` while the user types                               |
| `autoComplete`      | `auto-complete`       | `true`  | When `false`, every input gets `autocomplete="off"`                                    |
| `allowEdit`         | `allow-edit`          | `false` | Shows an Edit icon on each answer so users can change it                               |
| `autoHideQuestions` | `auto-hide-questions` | `0`     | Hides each answered question after this many milliseconds. `0` keeps them              |

Example with an attribute:

```html
<chat-form id="my-form" user-resumable="false"></chat-form>
```

## Editing answers

Set `allowEdit` to `true` and every answer in the chat gets an Edit (✎) icon. Click it to go back to that question. The old answer is filled in, and you can change it and press Continue.

- **An answer on the page you are on:** you go back to that question, then carry on as normal.
- **An answer on an earlier page:** that page is re-opened. When you finish, you go back to where you were. The page is submitted again, and `chat-page-submit` fires with `edited: true`. See [Events](events.md).
- **When a changed answer sends the form somewhere else:** the pages that followed, and their answers, are dropped from the chat. The form carries on from the new page.
- **After the form is complete:** the Edit icons go away. Answers are final.

## Hiding answered questions

Set `autoHideQuestions` to a number of milliseconds, for example `5000`. Each question bubble fades out that long after you answer it. Your answers stay on screen, so you can still edit them.

## Number keys

Radio buttons and checkboxes show a number next to each choice. Press the number to pick a radio choice, or to tick or untick a checkbox. This works for the first nine choices and is always on.

Press **Enter** in a text box or dropdown to continue, just like clicking Continue.
