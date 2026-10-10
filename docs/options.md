# Options

You can set options in the schema under `x-chat-options`. You can also set them as attributes on the element. If you set both, the attribute wins.

| Option          | Attribute        | Default | What it does                                                                           |
| --------------- | ---------------- | ------- | -------------------------------------------------------------------------------------- |
| `userResumable` | `user-resumable` | `true`  | Saves progress so users can come back. When `false`, `page:submit` events are not sent |
| `localStorage`  | `local-storage`  | `false` | Saves each answer to `localStorage` while the user types                               |
| `autoComplete`  | `auto-complete`  | `true`  | When `false`, every input gets `autocomplete="off"`                                    |

Example with an attribute:

```html
<chat-form id="my-form" user-resumable="false"></chat-form>
```
