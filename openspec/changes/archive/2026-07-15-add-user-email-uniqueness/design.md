## Context

Firestore `set` with UUID never collides on id; email is unconstrained. Spec today has no uniqueness requirement.

## Goals / Non-Goals

**Goals:**

- Second create with same email → 409, no second row.
- Clear error contract at HTTP boundary.

**Non-Goals:**

- Account recovery / merge duplicates.
- Unique username unless implementer chooses both in one pass (open question).

## Decisions

### D1 — Check then create (challenge-scale)

`findByEmail(normalizedEmail)` before `create`; if found, throw domain `UserConflictError` → HTTP 409.

### D2 — Normalization

Trim + lowercase email before compare/store for uniqueness. Username uniqueness deferred unless trivial.

### D3 — Race window

Two concurrent creates with same email can both pass check. Document for Firestore emulator/challenge; optional email-as-doc-id in lookup collection later if needed.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| TOCTOU race | Document; optional secondary “emails/{email}” doc with create-if-absent for harder uniqueness |
| Existing duplicate data in long-lived emulator | N/A for fresh demo |

## Open Questions

1. Unique email only, or email + username?
2. Accept check-then-create race for challenge, or email registry document for stronger uniqueness?
