## Why

ADR-0005 (Accepted) recommends `@nestjs/throttler` on `POST /users` and Helmet headers. Neither is implemented, creating ADR/code drift and an open abuse surface on unauthenticated create + bcrypt.

## What Changes

- Add rate limiting for `POST /api/v1/users` (target ~20/min per ADR).
- Exempt `/health` from the same write throttle.
- Enable Helmet in Nest bootstrap.
- Update ADR-0005 acceptance notes / checkboxes to match implementation.

## Source findings

- FINDING-003 — No rate limiting on `POST /users`
- FINDING-004 — Helmet / security headers missing

## Non-goals

- API authentication/JWT.
- Redis-backed throttler store.
- CORS policy expansion (no browser client in v1).

## Capabilities

### New Capabilities

- _(none)_

### Modified Capabilities

- `delivery`: security baseline at bootstrap (throttle + Helmet) as delivery quality bar for the API.

## Impact

- `apps/api` deps: `@nestjs/throttler`, `helmet`
- `main.ts`, `app.module.ts`, possibly `UsersController` / `HealthController`
- ADR-0005
