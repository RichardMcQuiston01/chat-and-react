# Options

You can set options in the schema under `x-chat-options`. You can also set them as attributes on the element. If you set both, the attribute wins.

| Option              | Attribute             | Default | What it does                                                                                    |
| ------------------- | --------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `userResumable`     | `user-resumable`      | `true`  | Saves progress so users can come back. When `false`, `page:submit` events are not sent          |
| `localStorage`      | `local-storage`       | `true`  | Saves each answer to `localStorage` while the user types                                        |
| `autoComplete`      | `auto-complete`       | `true`  | When `false`, every input gets `autocomplete="off"`                                             |
| `allowEdit`         | `allow-edit`          | `false` | Shows an Edit icon on each answer so users can change it                                        |
| `autoHideQuestions` | `auto-hide-questions` | `0`     | Hides each answered question after this many milliseconds. `0` keeps them                       |
| `autoHideAnswers`   | `auto-hide-answers`   | `0`     | Hides each answer after this many milliseconds. `0` keeps them                                  |
| `hideAnimation`     | `hide-animation`      | `fade`  | How hidden bubbles leave: `fade`, `pop`, or `none` (at once)                                    |
| `typingSpeed`       | `typing-speed`        | `0`     | Types each question onto the screen, this many milliseconds per character. `0` shows it at once |
| `thinkingDelay`     | `thinking-delay`      | `0`     | Shows a "thinking" bubble for this many milliseconds before each question. `0` turns it off     |
| `thinkingText`      | `thinking-text`       | empty   | Text for the thinking bubble. Empty shows animated dots                                         |
| `showContinueIcon`  | `show-continue-icon`  | `true`  | Shows an icon on the Continue button                                                            |

Example with an attribute:

```html
<chat-form id="my-form" user-resumable="false" typing-speed="25"></chat-form>
```

Attributes are read once, when the element is added to the page. Boolean attributes accept `true` or `false` (writing the attribute with no value counts as `true`). Time attributes are numbers of milliseconds.

## Editing answers

Set `allowEdit` to `true` and every answer in the chat gets an Edit (✎) icon. Click it to go back to that question. The old answer is filled in, and you can change it and press Continue.

- **An answer on the page you are on:** you go back to that question, then carry on as normal.
- **An answer on an earlier page:** that page is re-opened. When you finish, you go back to where you were. The page is submitted again, and `chat-page-submit` fires with `edited: true`. See [Events](events.md).
- **When a changed answer sends the form somewhere else:** the pages that followed, and their answers, are dropped from the chat. The form carries on from the new page.
- **After the form is complete:** the Edit icons go away. Answers are final.

## Hiding finished questions and answers

Two options let the chat tidy itself up as the user moves along. Each takes a number of milliseconds, and `0` (the default) keeps things on screen.

- `autoHideQuestions` hides each question bubble that long after it is answered. The answers stay, so the chat becomes a short list of what the user said.
- `autoHideAnswers` hides each answer that long after it is given. Set both to the same number to make a finished question and its answer leave together.

`hideAnimation` chooses how they leave:

- `fade` (the default): the bubble fades out while the space it took up closes.
- `pop`: the bubble shrinks away quickly, a little faster than a fade.
- `none`: the bubble is gone at once.

Hidden bubbles stay in the page, marked hidden, and the user can't edit an answer that is hidden. If you want people to be able to change answers, leave `autoHideAnswers` at `0`.

When bubbles stay on screen, each question and answer pair has a little space around it so the finished chat is easy to read. Change it with CSS, for example `chat-form::part(bubble-user) { margin-bottom: 24px; }`.

## Edit icon slot

The Edit icon is a pencil (✎) by default. To use your own, such as an icon from Font Awesome, put an element in the `edit-icon` slot:

```html
<chat-form schema="...">
  <i slot="edit-icon" class="fa-solid fa-pen"></i>
</chat-form>
```

Every answer needs its own icon, so the form places a copy of your element on each Edit button. The copy stays in your page, so your icon font and CSS still work. Your original element is never shown. You can also use `<template slot="edit-icon">` to hold the icon's markup. Style it with `chat-form::part(edit-icon)`.

## Number keys

Radio buttons and checkboxes show a number next to each choice. Press the number to pick a radio choice, or to tick or untick a checkbox. This works for the first nine choices and is always on.

## Keyboard

- **Enter** in a text box, dropdown, or multi-line box continues, just like clicking Continue.
- **Shift+Enter** in a multi-line box adds a new line.

## Typing effect

Set `typingSpeed` to a number of milliseconds per character, for example `25`. Each new question is typed onto the screen, and its input and Continue button appear once it is done. Click the question to skip ahead. `0` shows questions at once.

The whole question is still available to screen readers from the start. If a visitor has asked their device to reduce motion, questions appear at once.

Questions you come back to by editing an answer always appear at once.

## Thinking bubble

Set `thinkingDelay` to a number of milliseconds, for example `700`. Before each question, a bubble with three pulsing dots shows for that long, as if someone is typing a reply. Then the question appears (typed, if `typingSpeed` is set).

To show words instead of dots, set `thinkingText`, for example `"Let me think..."`.

You can also set it for one question in the schema with `x-chat-thinking`:

```json
{
  "id": "feedback",
  "x-chat-input": "textarea",
  "title": "Any final comments?",
  "x-chat-thinking": {
    "delay": 1300,
    "text": "Let me think of one last thing..."
  }
}
```

- A number, such as `"x-chat-thinking": 1500`, sets the delay in milliseconds. Use `0` to turn thinking off for that question.
- An object can set `delay` and `text`. Anything you leave out comes from the options above.

## Continue button icon

The Continue button shows a small arrow. You can hide it, restyle it, or swap it for your own icon:

- **Hide it:** set `showContinueIcon` to `false` (or `show-continue-icon="false"`).
- **Use your own icon:** put an element in the `continue-icon` slot. Because it lives in your page, it works with any icon package, such as Font Awesome, Material Icons, or Bootstrap Icons.

  ```html
  <chat-form schema="...">
    <i slot="continue-icon" class="fa-solid fa-paper-plane"></i>
  </chat-form>
  ```

- **Restyle it:** `chat-form::part(btn-icon) { font-size: 1.2em; }`. See [Styling](styling.md).
