# Code Review Report

| Field | Value |
|-------|--------|
| Date | 2026-07-15 |
| Scope | Full repo on `main` after remediation (`5d7b0c3`). `git diff main...HEAD` empty (review tip is HEAD). Prior report: [2026-07-15-code-review.md](./2026-07-15-code-review.md). |
| Base commit | `5d7b0c3` |
| Reviewer | Principal Engineer (Cursor agent) |

## Executive summary

Critical correctness issues from the first review (EventBus race, silent generate failures, ADR security baseline, smoke gap, docs drift) are **resolved**. The create-without-password path now awaits password finalization, is idempotent on replay, fails the command on update errors, and is covered by a handler-graph smoke test. Remaining debt is mostly architectural smell (command depends on concrete event handler; dual invoke via await + `EventBus.publish`), acknowledged orphan rows without compensation, and optional product gaps (email uniqueness, 429 test). **Merge recommendation: Approve with fixes** — acceptable for challenge delivery; address Medium items before calling it production-ready.

## Prior findings status

| Prior ID | Status after `5d7b0c3` |
|----------|------------------------|
| FINDING-001 EventBus race | **Fixed** — await handler + reload user |
| FINDING-002 Silent 201 on failure | **Fixed** — handler errors fail create; orphan still possible |
| FINDING-003 Throttle | **Fixed** |
| FINDING-004 Helmet | **Fixed** |
| FINDING-005 Smoke | **Fixed** — `create-user-password.smoke.spec.ts` + `test:smoke` |
| FINDING-006 Idempotency | **Fixed** — `hasPassword` short-circuit |
| FINDING-007 README OpenSpec link | **Fixed** |
| FINDING-008 Modulo bias | **Fixed** — rejection sampling |
| FINDING-009 Email uniqueness | **Open** (still out of challenge must-haves) |
| FINDING-010 Dead error / result type location | **Open** |
| FINDING-011 ADR/Purpose drift | **Mostly fixed** |
| FINDING-012 CI shallow | **Partially fixed** — Terraform job added; lint/deep health still absent |

## Findings index

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | Medium | backend | Command couples to concrete event handler + dual invoke | yes |
| FINDING-002 | Medium | backend | Orphan user document when generate fails after insert | maybe |
| FINDING-003 | Medium | backend | No email/username uniqueness | maybe |
| FINDING-004 | Low | tests | No automated assertion for HTTP 429 throttle | maybe |
| FINDING-005 | Low | backend | `InvalidUserError` unused; `CreateUserResult` lives on handler | no |
| FINDING-006 | Suggestion | infra | CI does not run lint; health has no Firestore probe | no |

## Findings

### FINDING-001 — Command depends on concrete event handler and invokes it twice in spirit

- **Severity:** Medium
- **Area:** backend
- **Location:** `apps/api/src/modules/users/application/commands/handlers/create-user.handler.ts:33-60`
- **Problem:** `CreateUserHandler` injects the concrete `GeneratePasswordOnUserCreatedHandler` class and `await`s `handle()`, then also `eventBus.publish(event)`, which re-triggers the same `@EventsHandler` (mitigated by idempotency). This couples command → concrete handler and pays an extra findById/handler cycle on the EventBus path.
- **Why it matters:** Hexagonal/CQRS purity and long-term maintainability; harder to swap event processing strategy; subtle “why is handle called twice?” for the next reader.
- **Impact:** Extra latency/DB read on EventBus re-entry; tighter module coupling; risk of future double side-effects if idempotency regresses.
- **Recommendation:** Prefer one of: (a) extract password-finalize use-case/port invoked only from the command, publish event for audit with a separate no-op-or-notification listener; or (b) custom awaiting EventPublisher and **do not** inject the handler into the command; or (c) drop `@EventsHandler` if publish is only for audit and keep explicit await as the sole executor.
- **OpenSpec candidate:** yes — suggested change slug: `decouple-password-finalize-from-command`

### FINDING-002 — Orphan user row on generate/update failure

- **Severity:** Medium
- **Area:** backend
- **Location:** `create-user.handler.ts:55-60`; ADR-0002 enmienda (documented)
- **Problem:** Insert succeeds, then password finalize throws → create fails HTTP-wise, but Firestore may retain a user with `passwordHash: null`. No compensate/delete.
- **Why it matters:** Data hygiene; documented as deferred, still a real inconsistency window under failure.
- **Impact:** Orphan documents; possible confusion on later GET (`hasPassword: false`).
- **Recommendation:** On finalize failure, delete the created doc (best-effort) or mark `status: failed`; add smoke for compensate. Acceptable to leave as known limit for challenge if documented in README one-liner.
- **OpenSpec candidate:** maybe — `compensate-user-create-on-password-failure`

### FINDING-003 — Duplicate emails/usernames allowed

- **Severity:** Medium
- **Area:** backend
- **Location:** `apps/api/src/modules/users/infrastructure/persistence/firestore-user.repository.ts` (UUID `set` only)
- **Problem:** No uniqueness check or conflict mapping (`409`). Still optional per original requirements, but remains a product gap.
- **Why it matters:** Identity clarity for a User aggregate; evaluator curls can create twins silently.
- **Impact:** Data quality; not a security hole by itself.
- **Recommendation:** Query by email before create or use a deterministic doc id; map conflict to `409`. Or explicitly document “duplicates allowed in v1” in README limits.
- **OpenSpec candidate:** maybe — `add-user-email-uniqueness`

### FINDING-004 — Throttle behavior untested

- **Severity:** Low
- **Area:** tests
- **Location:** `apps/api/src/app.module.ts:16-30`, `users.controller.ts` `@Throttle`; no `*throttle*.spec.ts`
- **Problem:** ADR/OpenSpec require 429 on excess create; no automated test proves the guard is wired (task “optional 429 test” was checked without a suite).
- **Why it matters:** Config regressions (wrong TTL/limit, missing APP_GUARD) would go unnoticed.
- **Impact:** Low for challenge demo; medium for production hardening narrative.
- **Recommendation:** One Nest HTTP test: 20 POST ok + 21st → 429 (or mock ThrottlerStorage). Keep health/`GET` unconstrained.
- **OpenSpec candidate:** maybe — `add-users-throttle-http-test`

### FINDING-005 — Minor cleanliness debt

- **Severity:** Low
- **Area:** backend
- **Location:** `apps/api/src/modules/users/domain/errors/user.errors.ts` (`InvalidUserError`); `users.controller.ts` imports `CreateUserResult` from handler file
- **Problem:** Dead domain error; HTTP imports a type from a handler module.
- **Why it matters:** Noise and mild layering smell.
- **Impact:** Maintainability only.
- **Recommendation:** Move `CreateUserResult` to `application/create-user.result.ts`; delete or use `InvalidUserError`.
- **OpenSpec candidate:** no

### FINDING-006 — Remaining CI/ops shallowness

- **Severity:** Suggestion
- **Area:** infra
- **Location:** `.github/workflows/ci.yml`; `health.controller.ts`
- **Problem:** Lint still not in CI; health remains a shallow `{ status: 'ok' }` without Firestore readiness. Terraform validate **is** present (good).
- **Why it matters:** Nice-to-haves for hiring signals / ops; not blockers for the PDF challenge.
- **Impact:** Cosmetic CI gaps.
- **Recommendation:** Optional lint job; optional emulator readiness probe — only if time remains.
- **OpenSpec candidate:** no

## Strengths

- Prior Critical/High findings closed with coherent design notes in ADR-0002/0005.
- Create-without-password now returns consistent `passwordGenerated` + `hasPassword` after persisted hash.
- Idempotent password handler supports dual invoke / replay safely.
- Smoke test exercises real CQRS handlers + bcrypt hash shape (`$2…`).
- Security baseline (Helmet + throttler) matches Accepted ADR-0005.
- OpenSpec living specs have purposes; archive hygiene looks sound; CI covers API coverage + Terraform validate.
- Domain remains free of Firebase; controllers stay thin.

## Suggested OpenSpec groupings (preview)

| Change slug (proposed) | Findings | Rationale |
|------------------------|----------|-----------|
| `decouple-password-finalize-from-command` | FINDING-001 | Architecture cleanup of dual invoke |
| `compensate-user-create-on-password-failure` | FINDING-002 | Data integrity on failure path |
| `add-user-email-uniqueness` | FINDING-003 | Optional product hardening |
| `add-users-throttle-http-test` | FINDING-004 | Lock security wiring |

## Out of scope / not reviewed

- Live emulator/manual curl session in this pass.
- `npm audit` CVE triage.
- Frontend (none).
- CodeGraph (still no `.codegraph/` index).
- Production GCP Auth for Admin SDK beyond emulator path.
