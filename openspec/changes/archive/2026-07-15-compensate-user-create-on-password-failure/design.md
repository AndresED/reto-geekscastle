## Context

Insert succeeds → finalize throws → client gets 5xx, but Firestore may keep the row. Documented as known limit after await-password fix.

## Goals / Non-Goals

**Goals:**

- No durable orphan with `passwordHash: null` after a failed missing-password create (best-effort compensate).
- Preserve fail-loud (no 201 on finalize failure).

**Non-Goals:**

- Multi-document transactions across services.
- Guaranteed compensate under process crash mid-delete (document residual race).

## Decisions

### D1 — Delete on finalize failure (recommended)

After catch around finalize: `await users.delete(id)` best-effort, then rethrow original error. If delete also fails, log and rethrow original (document residual orphan possibility).

Alternative: `status: 'failed'` field — larger surface for GET filtering; only if delete is rejected for audit reasons.

### D2 — Port method

Add `delete(id: string): Promise<void>` to `UserRepositoryPort` if not present; implement on Firestore adapter.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Delete fails after finalize fails | Log both; still return error; document residual orphan in README |
| Race with concurrent GET | Acceptable for challenge |

## Open Questions

1. Hard delete vs `status: failed`?
2. Should compensate also apply when client-supplied password hashing somehow fails after insert? (today hash happens before insert — N/A)
