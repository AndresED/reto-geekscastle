## Why

Email uniqueness is enforced with check-then-create (`findByEmail` then UUID `set`). Concurrent creates with the same email can both pass the check and insert duplicates. README documents the TOCTOU; living specs require unique email + 409 under normal use.

## What Changes

- Strengthen uniqueness under concurrency for the challenge (email registry doc with create-if-absent, or equivalent Firestore conflict strategy).
- Keep HTTP 409 on conflict; no secrets in responses.
- Cover the race or registry failure path with at least one unit/adapter test.
- Username uniqueness remains out of scope unless explicitly chosen.

## Source findings

- FINDING-002 — Email uniqueness race under concurrent creates

## Non-goals

- Distributed multi-region strong consistency beyond Firestore primitive used.
- Username uniqueness (unless trivial to add in same pass — open question).
- Changing password finalize / compensate flows.

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: Unique email on create MUST hold under concurrent successful creates for the same normalized email (or document accepted limits if apply chooses docs-only deferral — prefer harden).

## Impact

- `UserRepositoryPort` / Firestore adapter (and possibly create handler orchestration).
- Unit tests for conflict/race path.
- README TOCTOU note updated or removed when closed.
