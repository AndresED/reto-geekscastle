## Context

Current path: normalize email → `findByEmail` → `create` with random UUID. Two parallel requests can both see “no user” and insert twins.

## Goals / Non-Goals

**Goals:**

- Concurrent create with same email yields at most one user document (other gets 409 / conflict).
- Keep existing sequential duplicate → 409 behavior.

**Non-Goals:**

- Full saga across collections beyond what Firestore offers locally.
- Changing email normalization rules (trim + lowercase already in place).

## Decisions

### D1 — Email registry document (recommended)

1. Collection `emails/{normalizedEmail}` with fields `{ userId, createdAt }`.
2. On create: `emails` doc `create()` (fails if exists) then `users/{id}.set`, or a batch/transaction that fails closed.
3. Map registry exists / ALREADY_EXISTS → `UserEmailConflictError` → 409.
4. On compensate delete of user (finalize failure): also delete registry entry for that email (best-effort) to avoid permanent email lockout after compensate.

### D2 — Docs-only deferral (acceptable if deadline)

Leave check-then-create; keep README TOCTOU. OpenSpec apply should prefer D1 for challenge polish unless time-boxed.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| User created but registry write fails | Order: claim email first, then create user; on user failure release claim |
| Compensate deletes user but leaves email claim | Delete registry in compensate path |
| Emulator vs production semantics | Test adapter behavior with mocked Firestore `create` rejection |

## Open Questions

1. Harden now (D1) or document TOCTOU only for demo (D2)?
2. Also unique username?
