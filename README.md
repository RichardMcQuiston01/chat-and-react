# chat-and-react

A TypeScript library that turns a form into a chat. It works as a Web Component, so it runs with any framework (or none). You give it a JSON schema that lists your questions, the paths between them, and the type of answer you want. The library runs the conversation and sends events as the user moves along.

**[Try the live demo](https://richardmcquiston01.github.io/chat-and-react/)**

## Installation

```bash
# npm
npm install @richardmcquiston01/chat-and-react

# bun
bun add @richardmcquiston01/chat-and-react
```

Want a script tag, the core package only, or ready-made adapters? See [Installation](docs/installation.md).

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
    // { sessionId, pageId, visitIndex, answers }
  });

  el.addEventListener("chat-form-complete", (e) => {
    console.log("Form complete:", e.detail);
    // { sessionId, allAnswers }
  });
</script>
```

## Documentation

| Topic                                          | What you will learn                                              |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| [Installation](docs/installation.md)           | All the ways to add the library to your project                  |
| [Schema Format](docs/schema-format.md)         | How to write a schema, set up branching, and pick input types    |
| [Options](docs/options.md)                     | Turn saving progress, local storage, and autocomplete on or off  |
| [Events](docs/events.md)                       | The two events the form sends and the data inside them           |
| [Styling](docs/styling.md)                     | Change colors, fonts, and shapes                                 |
| [Custom Adapters](docs/custom-adapters.md)     | Write your own input, output, and error-log adapters             |
| [Optional Adapters](docs/optional-adapters.md) | Use ready-made adapters for webhooks, WebSockets, MongoDB, MySQL |
| [Headless Usage](docs/headless-usage.md)       | Run the form logic in Node with no screen                        |
| [Demo](docs/demo.md)                           | Run the example app, with or without Docker                      |
| [Schema Builder](docs/schema-builder.md)       | Build schemas in a visual editor instead of writing JSON         |

## License

Apache 2.0 — see [LICENSE](LICENSE).

## Copyright

Copyright © 2026 Richard McQuiston. All rights reserved.

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)
