# Styling

The `<chat-form>` element uses Shadow DOM. This keeps its styles separate from the rest of your page. You can still change how it looks in two ways: CSS custom properties and CSS parts.

## CSS custom properties

Set these on the element to change colors, corners, and fonts:

```css
chat-form {
  --car-bg: #f5f5f5;
  --car-bubble-bg: #ffffff;
  --car-bubble-user-bg: #0070f3;
  --car-accent: #0070f3;
  --car-radius: 8px;
  --car-font: system-ui, sans-serif;
}
```

## CSS parts

Use `::part()` to style specific pieces:

```css
chat-form::part(bubble-bot) {
  /* bot message bubbles */
}
chat-form::part(bubble-user) {
  /* user reply bubbles */
}
chat-form::part(input) {
  /* input elements */
}
chat-form::part(submit-btn) {
  /* submit button */
}
chat-form::part(btn-icon) {
  /* icon inside the submit button */
}
chat-form::part(edit-btn) {
  /* Edit icon on an answer */
}
```

## CSS class reference

The element uses a standard set of class names. You can target them from a CSS layer or with `::slotted()`.

| Class              | Element            |
| ------------------ | ------------------ |
| `car-chat`         | Root wrapper       |
| `car-page`         | Page container     |
| `car-bubble`       | Bot message bubble |
| `car-bubble--user` | User reply bubble  |
| `car-input-wrap`   | Input wrapper      |
| `car-input`        | Input element      |
| `car-btn-submit`   | Submit button      |
