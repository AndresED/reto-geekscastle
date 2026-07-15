## Why

When password finalize fails after Firestore insert, create returns an error but the user document may remain with `passwordHash: null`. ADR-0002 documented this as deferred; it remains a real inconsistency window.

## What Changes

- On missing-password create, if generate/hash/update fails after insert, compensate by deleting the created user (best-effort) or marking it failed — prefer delete for challenge simplicity.
- Ensure HTTP still does not return 201 on that path.
- Add a unit or smoke assertion for compensate behavior.
- Document the policy in README/ADR one-liner.

## Source findings

- FINDING-002 — Orphan user row on generate/update failure

## Non-goals

- Full saga/outbox.
- Decoupling EventBus (separate change).
- Soft-delete product UX beyond a simple status flag if delete is chosen.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: Failure after insert for missing-password create MUST leave no durable orphan with null hash (compensate or equivalent).

## Impact

- `CreateUserHandler` (or finalize use case) + `UserRepositoryPort.delete` if missing.
- Firestore repository adapter.
- Tests for failure path.
