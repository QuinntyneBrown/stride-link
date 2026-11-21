# Security Policy

## Supported versions

Only the latest release of Stride Link receives security fixes.

| Version | Supported |
| --- | --- |
| 1.x (latest) | Yes |
| Older releases | No |

## Reporting a vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Report them privately through
[GitHub private vulnerability reporting](https://github.com/QuinntyneBrown/beltcheck/security/advisories/new).
Please include:

- The Stride Link version and build commit (shown in the page footer)
- Browser name, version and operating system
- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- An exported log, if relevant, with anything you consider private removed

You can expect an acknowledgement within 5 working days and a status update at least
every 14 days until the issue is resolved. Fixed vulnerabilities are disclosed in the
release notes once a patched release is available.

## Security model

Stride Link is designed so that the most common classes of web vulnerability have
nothing to act on:

- **No network access.** The page makes no requests after it loads, enforced by a
  Content Security Policy of `default-src 'none'` with `connect-src 'none'`.
- **No inline code except by hash.** Scripts and styles are allowed only by SHA-256
  hash. `'unsafe-inline'` and `'unsafe-eval'` are never used.
- **Untrusted input rendered as text.** Bluetooth device names, treadmill frames and
  error messages are never interpreted as HTML.
- **No persistence.** Nothing is written to cookies, local storage, session storage,
  IndexedDB or Cache Storage.
- **Verifiable releases.** Every release publishes a SHA-256 checksum, and the hosted
  copy is byte-identical to the release asset and served with HSTS.

## Scope

In scope:

- Any way for device-supplied data to execute script or alter the page
- Any network request or data persistence the page performs
- Any bypass of the belt-control safety interlocks
- Any mismatch between a release asset and its published checksum

Out of scope:

- The Echelon treadmill's own firmware or its unlock mechanism
- Vulnerabilities in Chrome, Edge or the operating system's Bluetooth stack
- Attacks that require physical control of the tester's unlocked device
