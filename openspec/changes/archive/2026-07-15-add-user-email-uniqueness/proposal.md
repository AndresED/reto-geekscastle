## Why

User create always uses a random UUID document id with no uniqueness check. Duplicate emails/usernames are allowed silently. Original challenge treated uniqueness as optional; evaluators can still create twin users unnoticed.

## What Changes

- Enforce uniqueness on email at create (query before create or deterministic conflict strategy).
- Map conflict to HTTP 409 with a clear client-facing error (no internal details).
- Document whether username is also unique (recommend email required; username optional/extra if cheap).
- Unit/repo-level coverage for conflict path.

## Source findings

- FINDING-003 — Duplicate emails/usernames allowed

## Non-goals

- Full identity/auth migration.
- Case-folding edge cases beyond a documented normalization (recommend lowercase email trim).
- Unique index product across multi-region Firebase (document eventual consistency limits if any).

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: Create MUST reject duplicate email with HTTP 409.

## Impact

- Domain/application create path, `UserRepositoryPort` (`findByEmail` or equivalent), Firestore queries/indexes.
- Controller/exception mapping for conflict.
- README limits section updated.
