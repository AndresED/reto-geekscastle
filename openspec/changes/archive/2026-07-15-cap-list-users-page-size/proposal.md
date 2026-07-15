## Why

`GET /api/v1/users` loads the entire Firestore `users` collection into memory (`listAll`). Fine for emulator demos; unbounded reads are a cost/latency/DoS footgun if the API is exposed more broadly. Cap with a hard max page size before inventing full cursor pagination.

## What Changes

- Enforce a maximum number of users returned per list request (default hard cap, e.g. 100).
- Prefer simplest approach: repository or query applies `.limit(N)` (Firestore) and/or slice after fetch for in-memory double.
- Document the cap in Swagger + README (MVP — not full pagination unless needed).
- Unit tests for “more than N users → at most N returned”.

## Source findings

- FINDING-001 — Unbounded `listAll` for `GET /users`

## Non-goals

- Full cursor/`startAfter` pagination API (unless time remains after hard cap).
- Rate-limiting GET (separate ops concern).
- OpenSpec/C4 sync of list existence (`sync-list-users-into-openspec`).

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `users`: List users MUST NOT return an unbounded dump; responses MUST be capped by a documented maximum page size.

## Impact

- `UserRepositoryPort.listAll` → may become `list(limit)` or `listAll` always capped.
- Firestore adapter, in-memory test double, `ListUsersHandler`, Swagger/README.
- Tests for handler/repo.
