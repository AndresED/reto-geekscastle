## Why

Password generator maps CSPRNG bytes with `byte % charset.length`, introducing slight modulo bias. ADR-0005 claims cryptographically secure generation; fix is small and local.

## What Changes

- Replace modulo mapping with rejection sampling (or equivalent unbiased selection).
- Add/adjust unit test asserting generation still meets length ≥ 16.

## Source findings

- FINDING-008 — Modulo bias in CSPRNG password charset mapping

## Non-goals

- Changing charset or length policy.
- Returning plaintext password to clients.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: generation quality clarification (implementation-level; light spec delta).

## Impact

- `crypto-password.generator.ts` (+ spec).
