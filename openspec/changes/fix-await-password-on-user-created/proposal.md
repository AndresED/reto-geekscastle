## Why

`POST /users` without password can return `201` with `passwordGenerated: true` and `hasPassword: false` because Nest `EventBus.publish` does not await handlers. Event failures after create leave orphaned users with null hash — breaking the challenge invariant that the record is updated with a generated password.

## What Changes

- Await password generation completion (or equivalent sync barrier) before returning create result when password was missing.
- Propagate generate/update failures to the HTTP create path (no silent 201).
- Make password event handling idempotent if the user already has a hash.
- Reload or return user state that reflects persisted `passwordHash` / flags.
- Add unit/regression coverage for happy path and failure path.

## Source findings

- FINDING-001 — EventBus fire-and-forget → stale create response
- FINDING-002 — Event handler failures swallowed after 201
- FINDING-006 — Password event handler not idempotent vs existing hash

## Non-goals

- Returning plaintext generated password to the client.
- Switching from domain event to Cloud Functions.
- Rate limiting / Helmet (separate change).

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: Create-user final state and password-on-created failure/idempotency semantics.

## Impact

- `CreateUserHandler`, `GeneratePasswordOnUserCreatedHandler`, possibly controller mapping.
- Unit tests for create + event handler.
- Aligns implementation with ADR-0002 event flow and ADR-0005 idempotency claim.
