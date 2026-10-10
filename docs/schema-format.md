# Schema Format

A schema is a JSON file that describes your form. It follows JSON Schema Draft-07 and adds some extra keywords that start with `x-chat-`.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "x-chat-version": "1",
  "x-chat-options": {
    "userResumable": true,
    "localStorage": true,
    "autoComplete": false
  },
  "x-chat-pages": [
    {
      "id": "intro",
      "title": "What's your name?",
      "questions": [
        {
          "id": "full_name",
          "type": "string",
          "x-chat-input": "text",
          "title": "Full name",
          "x-chat-placeholder": "Type your name..."
        }
      ],
      "branching": [
        { "type": "always", "destination_id": "**FORM_COMPLETED**" }
      ]
    }
  ]
}
```

You can set the options in `x-chat-options`. See [Options](options.md) for what each one does.

## Page branching

Branching decides which page comes next. Each page has a `branching` list. The rules are checked from top to bottom, and the first rule that matches wins.

| Rule type  | What it means                                     |
| ---------- | ------------------------------------------------- |
| `"if"`     | Matches when a question's answer equals a value   |
| `"always"` | Always matches. Use it as the last, fallback rule |

Use `"**FORM_COMPLETED**"` as the `destination_id` to end the form.

```json
"branching": [
  { "type": "if", "form_element": "student_status", "value": "Yes", "destination_id": "student-page" },
  { "type": "always", "destination_id": "final-page" }
]
```

## Question visibility

Sometimes you only want to show a question in certain cases. Add `x-chat-condition` with a [JsonLogic](https://jsonlogic.com/) rule:

```json
{
  "id": "follow_up",
  "x-chat-input": "text",
  "title": "Tell us more",
  "x-chat-condition": { "!!": [{ "var": "initial_answer" }] }
}
```

This question only shows if the user answered `initial_answer`.

## Input types

Set `x-chat-input` to one of these:

| `x-chat-input` | What the user sees                              |
| -------------- | ----------------------------------------------- |
| `text`         | A one-line text box                             |
| `textarea`     | A multi-line text box                           |
| `dropdown`     | A `<select>` list. Choices come from `enum`     |
| `radio`        | Radio buttons. Choices come from `enum`         |
| `checkbox`     | Checkboxes. Choices come from `enum`. Pick many |
