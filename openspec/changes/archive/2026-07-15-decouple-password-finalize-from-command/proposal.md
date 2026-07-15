## Why

Create-user still injects the concrete `GeneratePasswordOnUserCreatedHandler`, awaits `handle()`, then also `eventBus.publish()`, which re-enters the same `@EventsHandler`. Idempotency hides double work, but command→concrete handler coupling and the dual invoke remain an architecture smell left after the await-password fix.

## What Changes

- Choose a single executor for password finalization on create (command-owned use case/port, or awaiting publisher, or explicit await without `@EventsHandler`).
- Stop injecting the concrete Nest event handler into `CreateUserHandler`.
- Keep request-path consistency: missing-password create still awaits finalize before 201; flags stay coherent.
- Keep `UserCreatedEvent` for audit/domain signaling without a second password write.

## Source findings

- FINDING-001 — Command depends on concrete event handler and invokes it twice in spirit

## Non-goals

- Compensating delete on failure (separate change).
- Email uniqueness / 409.
- Changing password policy, bcrypt, or Firebase adapter.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: Clarify that password finalize on create is a single awaited application path; event publication MUST NOT re-execute password generation as a second write path.

## Impact

- `CreateUserHandler`, `GeneratePasswordOnUserCreatedHandler`, users module providers.
- Unit tests that currently expect direct handler injection or dual invoke.
- Optional ADR-0002 note on chosen CQRS await strategy.
