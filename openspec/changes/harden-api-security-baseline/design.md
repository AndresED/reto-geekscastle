## Context

Security ADR lists throttle and Helmet as recommended; code only has ValidationPipe + exception filter.

## Goals / Non-Goals

**Goals:** Throttle mutating create; Helmet on; health remaining usable under load of create spam.

**Non-Goals:** Auth; distributed rate limit; Swagger CSP gymnastics until Swagger exists.

## Decisions

### D1 — Throttler

- `ThrottlerModule` with TTL 60s / limit 20 (or equivalent Nest 11 API).
- Apply to `POST /users` (controller-level `@Throttle` or guard).
- `@SkipThrottle()` on `HealthController`.

### D2 — Helmet

- `app.use(helmet())` in `main.ts` early after create.
- Default CSP OK for JSON API without Swagger UI.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| In-memory throttle per instance | Document; Redis upgrade path in ADR |
| Tests hitting 429 | Reset or raise limits in test env |

## Open Questions

- Exact Nest 11 throttler decorator API — verify against installed Nest version at apply time.
