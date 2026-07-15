## Why

Email uniqueness throws `UserEmailConflictError` inside a Firestore `runTransaction`. The outer catch only rethrows on `instanceof UserEmailConflictError`. If the Admin SDK wraps/aborts and replaces the error type, duplicates can surface as `UserPersistenceError` → HTTP 502 instead of 409. Unit tests mock the transaction and would not catch wrapping.

## What Changes

- Map transaction failures to email conflict robustly: keep `instanceof`, plus fallback (error message/code, or re-read claim after failure).
- Preserve HTTP 409 for duplicate email when conflict is detected.
- Add a unit test that simulates a wrapped abort / non-instance error carrying conflict semantics.

## Source findings

- FINDING-002 — Transaction conflict detection relies on unwrapped domain error

## Non-goals

- Changing uniqueness strategy / collections.
- Required live emulator e2e (optional).
- CI lint / health (separate suggestion).

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: Duplicate-email create MUST yield conflict (HTTP 409) even if the persistence layer surfaces the conflict through a wrapped transaction failure.

## Impact

- `FirestoreUserRepository.create` error mapping + unit tests.
- Possibly a tiny helper for “is email conflict.”
