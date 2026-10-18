# Versioning, Support and Deprecation

[Back to README](../README.md)

| [What is public](#what-is-public) | [Version numbers](#version-numbers) | [Support](#support) | [Deprecation](#deprecation) | [Schema version](#schema-version) | [Saved data](#saved-data) | [Environments](#environments) | [Prereleases](#prereleases) |

> **Draft defaults.** The numbers on this page (support windows, deprecation period, environments) are proposed defaults, not promises yet. They take effect at 1.0.0. Until then the library is 0.x and any minor release may break things, as the [changelog](../CHANGELOG.md) shows.

This page says what you can rely on from 1.0.0 onward.

## What is public

These follow the rules below. A change to any of them that could break working code is a breaking change.

- **Exports** of `@richardmcquiston01/chat-and-react` (`ChatFormElement`), `@richardmcquiston01/chat-and-react-core` and `@richardmcquiston01/chat-and-react-adapters`, as listed in the [export audit](export-audit.md): classes, functions and types, with their documented parameters, return values and behavior.
- **The `<chat-form>` element:** its attributes, methods (`setInputAdapter`, `setOutputAdapter`, `setErrorAdapter`, `setStorageAdapter`, `clearProgress`, `resync`) and events (`chat-page-submit`, `chat-form-complete`, `chat-external-change`, `chat-stale-submit`, `chat-error`), including the fields of `event.detail`.
- **The schema format** and its `x-chat-version`. See [Schema version](#schema-version).
- **Documented styling hooks:** the CSS custom properties, CSS parts and CSS classes in [Styling](styling.md).
- **The extension interfaces:** `InputAdapter`, `OutputAdapter`, `ErrorLogAdapter` and `SessionStore`, so an adapter you wrote keeps working.

These are not public and can change in any release: anything not exported, the DOM structure and class names not listed in [Styling](styling.md), the text of error messages, the keys the library writes to storage (see [Saved data](#saved-data)), and the files in `dist/`.

## Version numbers

The three packages share one version and are released together. Install matching versions of all you use. The version follows [Semantic Versioning](https://semver.org/):

| Change | Example | Bumps |
| --- | --- | --- |
| Removing or renaming a public export, attribute, method, event or event field; changing what one does in a way that can break callers; requiring a newer environment; dropping a schema version | removing `clearProgress()` | **major** |
| Adding an export, option, method, event or an optional field to `event.detail`; adding an optional schema field | a new `chat-*` event | **minor** |
| A bug fix, a documentation change, or an internal change | fixing a resume bug | **patch** |

Events and `event.detail` only grow within a major version: fields are added, not removed or changed. Write handlers that ignore fields they do not know.

A bug fix can change behavior that someone relied on. If the old behavior contradicted the documentation, it is a bug fix. If the documentation described it, it is a breaking change.

## Support

Each release line is supported on a best-effort basis by the maintainer:

| Line | Gets |
| --- | --- |
| The latest minor of the current major | Bug fixes and security fixes |
| The last minor of the previous major | Security fixes and critical bug fixes, for **6 months** after the next major is released |
| Anything older | Nothing. Upgrade |

Fixes are released as patch versions. There is no guaranteed response time. To report a security problem, contact the maintainer privately through GitHub instead of opening a public issue.

## Deprecation

Within a major version, things are deprecated before they are removed.

1. **Announce.** The release that deprecates something marks it `@deprecated` in the types (with what to use instead), lists it under a **Deprecated** heading in the [changelog](../CHANGELOG.md), and updates the docs.
2. **Keep.** It keeps working, unchanged, for at least **3 months and one minor release**.
3. **Remove.** It is removed in the next major version, not before. The changelog entry for that major says so under **Removed**.

The exception is a security fix. If something cannot be kept safe, it can be changed in a minor or patch release, and the changelog says why.

## Schema version

A schema declares `"x-chat-version": "1"`. This is the version of the schema format, separate from the package version.

- **Same schema version, same meaning.** Within schema version `"1"`, a schema that works keeps working for the whole life of the major version. New optional fields can be added; existing ones do not change meaning.
- **A breaking schema change gets a new version** (`"2"`) and ships only in a new major version of the packages.
- **The previous schema version is still read.** A major version that adds schema version `"2"` also reads `"1"`, so you can upgrade the packages first and migrate schemas later. Support for `"1"` ends no sooner than the next major after that, and the changelog says when.
- **An unknown version is refused.** A schema with a version the installed packages do not know throws a descriptive error from `parseSchema` (today: `x-chat-version must be "1"`). The form does not guess.

## Saved data

The form saves progress, unsubmitted answers and a finished-form record in storage. The key names and stored shapes are not public, but your visitors' data matters:

- Within a major version, progress saved by an older release is still read by a newer one. If a change makes old data unreadable, the form ignores it and starts again (and removes it), as 0.8.0 did with the keys of 0.7.0 and earlier. It never fails or shows a broken form.
- The `sessionId` in events stays stable for a visitor across releases within a major version.
- Moving to a new major version may reset saved progress. The changelog says so.

## Environments

- **The Web Component** needs a current evergreen browser (the latest two major versions of Chrome, Edge, Firefox and Safari). Dropping support for a browser version is a breaking change only when it is in that range.
- **The core and adapters packages** run in the Node.js versions in active or maintenance LTS, and in Bun. They ship ESM and CommonJS builds with type declarations. Dropping a Node.js version after it leaves LTS is not treated as breaking, and is announced in the changelog.
- **Dependencies:** `@richardmcquiston01/storage-adapters` and `@richardmcquiston01/error-log-adapter` are versioned on their own. A new major version of either that breaks the library's use of it ships with a new major of the library.

## Prereleases

Before a major version, release candidates (`1.0.0-rc.1`) let you try the change. A release candidate is not covered by this page: it can still change before the release. It is published under the `next` npm tag, never `latest`, so `npm install` does not pick it up. To try one, install it by name, for example `npm install @richardmcquiston01/chat-and-react@next`.

[Back to Top](#versioning-support-and-deprecation)
