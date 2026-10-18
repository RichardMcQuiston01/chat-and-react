# chat-and-react

- Author: [Richard McQuiston](mailto:richard.mcquiston@gmail.com)
- Website: https://richardmcquiston.com/
- Demo: https://richardmcquiston01.github.io/chat-and-react/

## Table of Contents

| [Overview](#overview) | [Features](#features) | [Getting Started](#getting-started) | [Packages](#packages) | [More Information](#more-information) | [Buy Me a Coffee](#buy-me-a-coffee) | [License](#license) | [Copyright](#copyright) |

## Overview

chat-and-react turns a form into a chat. People answer one question at a time, as if they were texting. It is a TypeScript library built as a Web Component, so it works with any framework, or none.

You write a JSON schema. It lists your questions, the paths between them, and the type of answer you want. The library runs the conversation and sends events as the user moves along.

**[Try the live demo](https://richardmcquiston01.github.io/chat-and-react/)**

[Back to Top](#table-of-contents)

## Features

- Five input types: one-line text, multi-line text, dropdown, radio buttons, and checkboxes
- Branching, so answers decide which page comes next
- Questions that only show when a rule says so
- Number keys pick radio and checkbox choices
- Optional edit icon, so users can change an answer
- Optional typing effect and "thinking" bubble before each question
- Questions and answers can fade away after a delay
- Saves progress in `localStorage`, so users can come back
- Plug-in adapters for input, output, and error logging
- Styling with CSS variables and CSS parts

See [Options](docs/options.md) for the full list.

[Back to Top](#table-of-contents)

## Getting Started

### Prerequisites

- A modern web browser. The form is a Web Component.
- [Bun](https://bun.sh) if you want to build or test this repository. The Docker demo does not need it.

### Installation

```bash
# npm
npm install @richardmcquiston01/chat-and-react

# bun
bun add @richardmcquiston01/chat-and-react
```

Want a script tag, the core package only, or ready-made adapters? See [Installation](docs/installation.md).

### Usage

1. Write a schema. See [Schema Format](docs/schema-format.md).
2. Add the `<chat-form>` element and give it the schema.
3. Listen for the `chat-page-submit` and `chat-form-complete` events. See [Events](docs/events.md).

### Examples

```html
<div id="app"></div>

<script type="module">
  import "@richardmcquiston01/chat-and-react";

  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    "x-chat-version": "1",
    "x-chat-pages": [
      {
        id: "intro",
        title: "What's your name?",
        questions: [
          {
            id: "full_name",
            type: "string",
            "x-chat-input": "text",
            title: "Full name",
            "x-chat-placeholder": "Type your name...",
          },
        ],
        branching: [{ type: "always", destination_id: "**FORM_COMPLETED**" }],
      },
    ],
  };

  // Set the schema before the element joins the page. The form reads it once.
  const el = document.createElement("chat-form");
  el.setAttribute("schema", JSON.stringify(schema));

  el.addEventListener("chat-page-submit", (e) => {
    console.log("Page submitted:", e.detail);
    // { sessionId, pageId, visitIndex, answers }
  });

  el.addEventListener("chat-form-complete", (e) => {
    console.log("Form complete:", e.detail);
    // { sessionId, allAnswers }
  });

  document.getElementById("app").appendChild(el);
</script>
```

To run the example app on your computer, see [Demo](docs/demo.md).

[Back to Top](#table-of-contents)

## Packages

This repository holds several packages.

| Package                                                      | What it does                                         |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| [`@richardmcquiston01/chat-and-react`](packages/web)         | The `<chat-form>` Web Component                      |
| [`@richardmcquiston01/chat-and-react-core`](packages/core)   | The form logic, with no screen                       |
| [`@richardmcquiston01/chat-and-react-adapters`](packages/adapters) | Ready-made adapters for webhooks, WebSockets, MongoDB, and MySQL |
| [`chat-and-react-demo`](packages/demo)                       | The demo app                                         |
| [`chat-and-react-schema-builder`](packages/schema-builder)   | A visual editor for schemas                          |

To work on the code, run these from the repository root:

```bash
bun install
bun run build
bun run test
bun run typecheck
```

[Back to Top](#table-of-contents)

## More Information

| Topic                                          | What you will learn                                               |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| [Installation](docs/installation.md)           | All the ways to add the library to your project                   |
| [Schema Format](docs/schema-format.md)         | How to write a schema, set up branching, and pick input types     |
| [Options](docs/options.md)                     | Editing, hiding, typing, thinking, saving, and more               |
| [Events](docs/events.md)                       | The two events the form sends and the data inside them            |
| [Styling](docs/styling.md)                     | Change colors, fonts, and shapes                                  |
| [Custom Adapters](docs/custom-adapters.md)     | Write your own input, output, and error-log adapters              |
| [Optional Adapters](docs/optional-adapters.md) | Use ready-made adapters for webhooks, WebSockets, MongoDB, MySQL  |
| [Storage Adapters](docs/storage-adapters.md)   | Save progress somewhere other than `localStorage`, with conflict handling and cross-tab sync |
| [Versioning Policy](docs/versioning-policy.md) | What is public, support windows, deprecation, and schema versions (draft defaults) |
| [Several Tabs](docs/several-tabs.md)           | What is protected when a form is open in two tabs, and what is not |
| [Headless Usage](docs/headless-usage.md)       | Run the form logic in Node with no screen                         |
| [Demo](docs/demo.md)                           | Run the example app, with or without Docker                       |
| [Schema Builder](docs/schema-builder.md)       | Build schemas in a visual editor instead of writing JSON          |
| [Changelog](CHANGELOG.md)                      | What changed in each version                                      |

[Back to Top](#table-of-contents)

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

[Back to Top](#table-of-contents)

## License

Apache 2

[Back to Top](#table-of-contents)

## Copyright

(c)2026 Richard McQuiston. All rights reserved.

[Back to Top](#table-of-contents)
