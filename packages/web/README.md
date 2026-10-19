# @richardmcquiston01/chat-and-react

A framework-agnostic Web Component that renders a chat-style form interface from a JSON schema. Drop in a schema describing your questions, branching logic, and input types — the component drives the conversation and emits events as the user progresses.

## Installation

```bash
npm install @richardmcquiston01/chat-and-react
```

## CDN / Script Tag

```html
<script src="https://unpkg.com/@richardmcquiston01/chat-and-react/dist/chat-and-react.iife.js"></script>
```

The IIFE bundle registers the `<chat-form>` element and exposes `window.ChatAndReact`.

## Quick Start

```html
<chat-form
  id="my-form"
  schema='{"$schema":"...","x-chat-version":"1","x-chat-pages":[...]}'
></chat-form>

<script type="module">
  import "@richardmcquiston01/chat-and-react";

  const el = document.getElementById("my-form");

  el.addEventListener("chat-page-submit", (e) => {
    console.log("Page submitted:", e.detail);
  });

  el.addEventListener("chat-form-complete", (e) => {
    console.log("Form complete:", e.detail);
  });
</script>
```

## Input types supported

`text`, `textarea`, `dropdown`, `radio`, `checkbox`

## Styling

The element uses Shadow DOM. Style it via CSS custom properties (`--car-*`) on the host, or target the standard `car-*` classes / exposed `::part()`s.

## Full documentation

See the [project README](https://github.com/RichardMcQuiston01/chat-and-react#readme) for the complete schema format, branching rules, options, events, and adapter guide.

## License

Apache 2.0 — see [LICENSE](https://github.com/RichardMcQuiston01/chat-and-react/blob/main/LICENSE).

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](https://raw.githubusercontent.com/RichardMcQuiston01/chat-and-react/main/donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)
