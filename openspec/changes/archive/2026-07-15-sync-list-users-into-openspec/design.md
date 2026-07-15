## Context

Runtime already has `ListUsersQuery`, `ListUsersHandler`, `UserRepositoryPort.listAll()`, controller `GET /users` before `:id`, Swagger, and unit tests. Docs lag: OpenSpec users only requires get-by-id; C4 components table omits List.

## Goals / Non-Goals

**Goals:**

- OpenSpec delta that matches current list contract.
- C4 components line mentions ListUsers.
- Optional one-line note in requirements map.

**Non-Goals:**

- Soft limit / pagination (separate change).
- Rewriting US-01…US-22 into new epics.

## Decisions

### D1 — Spec mirrors existing API (no behavior change)

Requirement text MUST match shipped behavior: HTTP 200, array of public user fields, empty list when none, CQRS file split, no password/hash in response. Pagination is out of scope here.

### D2 — Docs touched are product-facing only

- `docs/infra/c4-y-flujos.md` components table.
- Optional: US map row or footnote “extra: GET /users list”.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Spec implies pagination later conflict | Explicitly omit pagination; point to other change |
| Requirements checkbox noise | Prefer footnote over new full US story |

## Open Questions

None — behavior already implemented; this is documentation sync.
