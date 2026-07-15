## Context

Current adapter: claim `create()` then user `set()`; on user-set failure, delete claim in catch. Concurrent duplicate emails fail at claim. Process kill between claim success and user set (or before catch release) leaves a locked email.

## Goals / Non-Goals

**Goals:**

- Create path cannot persist a claim without the user doc (or rolls both back).
- Keep existing conflict mapping and compensate delete behavior.

**Non-Goals:**

- Exactly-once across multi-instance beyond Firestore transaction guarantees.
- Changing collection names unless needed.

## Decisions

### D1 — Transaction (recommended)

In `create`:

1. `db.runTransaction`: read claim; if exists → conflict; else set claim + set user in the same transaction.
Note: Firestore transactions typically use `set`/`create` carefully — `create` inside transaction may be available via precondition; verify Admin SDK: transactional `create` or `set` with exists-check.

Alternative with batch alone does **not** provide conflict detection for concurrent claims — prefer transaction with exists check on claim ref.

### D2 — Docs-only residual

If transaction proves awkward under deadline: document recovery (`firebase firestore:delete emails/{email}`) in README and accept crash window. Prefer D1.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Emulator transaction quirks | Unit-test with mocked transaction; smoke against emulator optional |
| Contention retries | Rely on Firestore transaction retries; map contention errors to persistence error |

## Open Questions

1. Transaction with exists-check + dual set, or keep sequential create with documented recovery only?
