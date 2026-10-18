# Security Policy

## Reporting a vulnerability

Please report security problems **privately**. Do not open a public issue or pull request for them.

Use GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/RichardMcQuiston01/chat-and-react/security) of this repository.
2. Choose **Report a vulnerability**.
3. Describe the problem: which package and version, what you did, what happened, and what you expected. A small schema or code sample that reproduces it helps most.

Only the maintainer can see the report. Please give them time to fix the problem before you share it elsewhere.

## What is covered

The three published packages:

- `@richardmcquiston01/chat-and-react`
- `@richardmcquiston01/chat-and-react-core`
- `@richardmcquiston01/chat-and-react-adapters`

Problems in a dependency, such as `@richardmcquiston01/storage-adapters` or `@richardmcquiston01/error-log-adapter`, are best reported in that package's own repository.

## Supported versions

Security fixes go into the latest minor of the current major version. After a new major version is released, the last minor of the previous major also gets security fixes for six months. The details are in [Versioning, Support and Deprecation](docs/versioning-policy.md#support). Before 1.0.0, only the latest release is supported.

## What to expect

This project is maintained by one person on a best-effort basis, so there is no guaranteed response time. A confirmed problem is fixed in a patch release, and the [changelog](CHANGELOG.md) says what was fixed.
