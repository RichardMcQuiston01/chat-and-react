# Installation

[Back to README](../README.md)

| [Web component (most people want this)](#web-component-most-people-want-this) | [Core logic only](#core-logic-only) | [Ready-made adapters](#ready-made-adapters) | [Script tag (CDN)](#script-tag-cdn) |

Pick the package that fits your project.

## Web component (most people want this)

```bash
# npm
npm install @richardmcquiston01/chat-and-react

# bun
bun add @richardmcquiston01/chat-and-react
```

[Back to Top](#installation)

## Core logic only

Use this if you want the "brain" of the form without any screen. It has no browser code. See [Headless Usage](headless-usage.md).

```bash
npm install @richardmcquiston01/chat-and-react-core
```

[Back to Top](#installation)

## Ready-made adapters

These save and send your data to places like webhooks, WebSockets, MongoDB, and MySQL. See [Optional Adapters](optional-adapters.md).

```bash
npm install @richardmcquiston01/chat-and-react-adapters
```

[Back to Top](#installation)

## Script tag (CDN)

No build tools? Add one script tag to your page:

```html
<script src="https://unpkg.com/@richardmcquiston01/chat-and-react/dist/chat-and-react.iife.js"></script>
```

This adds the `<chat-form>` element to your page. It also gives you `window.ChatAndReact`.

[Back to Top](#installation)

---

[Back to README](../README.md)
