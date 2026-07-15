## Context

Current `listAll()`:

```ts
const snap = await this.db.collection(this.usersCollection).get();
return snap.docs.map(...).sort(...);
```

No limit. Endpoint uses `@SkipThrottle()`.

## Goals / Non-Goals

**Goals:**

- Hard cap (constant, e.g. `USERS_LIST_MAX = 100`) applied on the list path.
- Firestore query uses `.limit(N)` so the server does not download the whole collection when possible.
- In-memory fake respects the same limit.
- Documented in Swagger description + short README note.

**Non-Goals:**

- Client-supplied `?limit=` / `?cursor=` (optional follow-up).
- Changing sort semantics beyond “still deterministic under the cap” (prefer `orderBy createdAt` + limit in Firestore if index allows — open question).

## Decisions

### D1 — Server hard cap without query params (MVP)

Introducing query DTOs + validation is more work. Ship a constant max first:

- Port: `listAll()` keeps name but documents max; **or** `list({ limit: number })` with handler passing the constant.
Prefer `list(limit: number)` on the port for clarity.

### D2 — Firestore: `orderBy('createdAt').limit(N)` when feasible

Indexes: `createdAt` as string ISO sorts lexicographically = chronological. May need composite/single-field index; emulator usually lenient. If orderBy complicates demo, fallback: `.limit(N)` without order (document “unordered under cap” — worse UX). Prefer orderBy + update `firestore.indexes.json` if required.

### D3 — Tests

- Seed N+1 users in in-memory or mocked query; expect length ≤ N.
- Mock Firestore `limit` called with N.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Truncation surprises clients | Document in Swagger/README; optional `X-Truncated` later |
| Missing Firestore index for orderBy | Add index JSON or drop orderBy for cap-only |
| Cap too low for local demos | 100 is fine for challenge |

## Open Questions

1. Constant value: **100** default — confirm or pick 50.
2. orderBy + index vs limit-only for fastest apply?
