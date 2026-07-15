## Context

`@nestjs/throttler` + Helmet land; delivery spec already requires 429 on excess create. No automated proof.

## Goals / Non-Goals

**Goals:**

- One automated test fails if create throttle stops returning 429.
- Health (and preferably GET users) not blocked by the create write limit.

**Non-Goals:**

- Changing default 20/min in production.
- CI-only smoke for throttle.

## Decisions

### D1 — Prefer mocked storage or tiny test limit

Options:

1. Override ThrottlerModule in testing module to `limit: 2, ttl: 60_000`, fire 3 POSTs → 429.
2. Mock `ThrottlerStorage` to force blocked state on Nth call.

Prefer (1) for wiring realism with few requests.

### D2 — Scope

HTTP test against Nest app (supertest) with Firebase/Firestore mocked or in-memory repo so create does not need emulator. SkipThrottle paths asserted lightly (health 200 after blocked creates).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Flaky timing | Fixed limit in test module; avoid depending on wall-clock race |
| Slow bcrypt on many creates | Use limit=2 and mock hasher/repo |

## Open Questions

1. Colocate under `users` vs global `app` e2e folder?
