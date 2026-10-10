# Installation

Pick the package that fits your project.

## Web component (most people want this)

```bash
# npm
npm install @richardmcquiston01/chat-and-react

# bun
bun add @richardmcquiston01/chat-and-react
```

## Core logic only

Use this if you want the "brain" of the form without any screen. It has no browser code. See [Headless Usage](headless-usage.md).

```bash
npm install @richardmcquiston01/chat-and-react-core
```

## Ready-made adapters

These save and send your data to places like webhooks, WebSockets, MongoDB, and MySQL. See [Optional Adapters](optional-adapters.md).

```bash
npm install @richardmcquiston01/chat-and-react-adapters
```

## Script tag (CDN)

No build tools? Add one script tag to your page:

```html
<script src="https://unpkg.com/@richardmcquiston01/chat-and-react/dist/chat-and-react.iife.js"></script>
```

This adds the `<chat-form>` element to your page. It also gives you `window.ChatAndReact`.
