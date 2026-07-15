# Code Review Report

| Field | Value |
|-------|--------|
| Date | 2026-07-15 |
| Scope | Full delivery on `main` (no divergent feature branch; `git diff main...HEAD` empty). Reviewed `apps/api`, `docs/`, `openspec/`, `infra/`, `.github/workflows`, root delivery files since `b5630cb`. |
| Base commit | `b5630cb` (init) → HEAD `b9034a4` |
| Reviewer | Principal Engineer (Cursor agent) |

## Executive summary

The Nest hexagonal + CQRS Users API is well structured for a challenge delivery: thin controllers, domain without Firebase, ports for persistence/crypto, Jest ≥ 80 % with handler-focused unit tests, and CI build+coverage. **Request changes** before presenting as production-quality: Nest `EventBus.publish` does not await event handlers, so `POST /users` without a password can return `passwordGenerated: true` with `hasPassword: false`, and generate failures leave orphaned users after a `201`. ADR-0005 “recomendado” controls (throttler, Helmet) and event-handler idempotency are also unimplemented, which is documentation drift at Acceptéd ADRs.

## Findings index

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | Critical | backend | EventBus fire-and-forget → stale create response | yes |
| FINDING-002 | Critical | backend | Event handler failures swallowed after 201 | yes |
| FINDING-003 | High | security | No rate limiting on `POST /users` (ADR-0005) | yes |
| FINDING-004 | High | security | Helmet / security headers missing (ADR-0005) | yes |
| FINDING-005 | High | tests | No integration/smoke for create→password→GET | yes |
| FINDING-006 | Medium | backend | Password event handler not idempotent vs existing hash | yes |
| FINDING-007 | Medium | docs | README links to archived OpenSpec change path | yes |
| FINDING-008 | Medium | backend | Modulo bias in CSPRNG password charset mapping | maybe |
| FINDING-009 | Medium | backend | No email/username uniqueness | maybe |
| FINDING-010 | Low | backend | `InvalidUserError` unused; controller imports result type from handler | no |
| FINDING-011 | Low | docs | ADR acceptance checkboxes still open; OpenSpec `Purpose: TBD` | yes |
| FINDING-012 | Suggestion | infra | CI skips lint, e2e, terraform validate; health is shallow | maybe |

## Findings

### FINDING-001 — EventBus does not await password generation

- **Severity:** Critical
- **Area:** backend
- **Location:** `apps/api/src/modules/users/application/commands/handlers/create-user.handler.ts:54-61`, `apps/api/src/modules/users/infrastructure/http/users.controller.ts:41-58`
- **Problem:** `await this.eventBus.publish(...)` returns before `GeneratePasswordOnUserCreatedHandler.handle` finishes. The command returns the pre-event `User` (`passwordHash: null`) while setting `passwordGenerated: passwordMissing` from intent. Nest CQRS default pub/sub is RxJS fire-and-forget.
- **Why it matters:** The HTTP contract becomes self-contradictory (`passwordGenerated: true`, `hasPassword: false`). Immediate `GET /users/:id` races the async update. Evaluators and clients cannot trust create response as finalized state.
- **Impact:** Functional correctness of the challenge’s core flow; flaky demos; misleading API semantics.
- **Recommendation:** Await completion of password generation in the write path before responding (invoke handler and wait, use a pub/sub that returns `Promise.all` of handlers, or reload user after handlers settle). Keep publishing the domain event for audit, but make 201 reflect post-update state. Add a regression test: create without password → response/GET has `hasPassword: true`.
- **OpenSpec candidate:** yes — suggested change slug: `fix-await-password-on-user-created`

### FINDING-002 — Orphan users when event handler fails

- **Severity:** Critical
- **Area:** backend
- **Location:** `apps/api/src/modules/users/application/events/handlers/generate-password-on-user-created.handler.ts:34-42` (failure surface); Nest CQRS unhandled event path
- **Problem:** If generate/hash/`updatePassword` throws after successful `create`, Nest CQRS surfaces it on the unhandled-exception bus (logged), while `POST` has already returned `201` with the unfinished user (null hash).
- **Why it matters:** Design ADR already notes a brief window without password; silent permanent failure breaks the challenge invariant “update the record with the generated password.”
- **Impact:** Data integrity; users stuck without credentials; hard-to-debug production incidents.
- **Recommendation:** Propagate failure to the command (await handler and rethrow), or compensate (mark failed / delete) and return 5xx. Never claim `passwordGenerated: true` unless hash persisted. Cover with a unit/integration test that forces `updatePassword` to reject.
- **OpenSpec candidate:** yes — same change as FINDING-001 or sibling `harden-user-created-failure-path`

### FINDING-003 — Missing rate limiting on mutating endpoint

- **Severity:** High
- **Area:** security
- **Location:** `apps/api/src/main.ts`, `apps/api/src/modules/users/infrastructure/http/users.controller.ts:34-41`; `docs/adr/0005-seguridad-passwords-y-api.md:36`
- **Problem:** ADR-0005 (Aceptado) recommends `@nestjs/throttler` on `POST /users` (~20/min). Not installed or configured. Unauthenticated create + bcrypt is an easy abuse/DoS vector.
- **Why it matters:** Security criteria and ADR acceptance are part of evaluation; open write surface without throttle is a known demo footgun.
- **Impact:** Resource exhaustion; credential-stuffing style spam; ADR/code drift.
- **Recommendation:** Add global/throttled guard for `POST /users`; skip throttle on `/health`. Or amend ADR-0005 to explicitly defer throttle with rationale if consciously out of deadline scope.
- **OpenSpec candidate:** yes — suggested change slug: `add-users-post-throttling`

### FINDING-004 — Missing Helmet / security headers

- **Severity:** High
- **Area:** security
- **Location:** `apps/api/src/main.ts:7-22`; `docs/adr/0005-seguridad-passwords-y-api.md:38`
- **Problem:** ADR-0005 recommends Helmet in `main.ts`. Bootstrap only sets prefix, ValidationPipe, and exception filter.
- **Why it matters:** Accepted ADR without implementation is documentation debt that evaluators will notice; baseline headers are low-cost hardening.
- **Impact:** Missing `X-Content-Type-Options` / related defenses; ADR/implementation mismatch.
- **Recommendation:** Enable `helmet` in bootstrap (relax CSP only if Swagger is added later). Align ADR checkbox when done.
- **OpenSpec candidate:** yes — suggested change slug: `add-api-helmet-headers` (or combine with FINDING-003 as `harden-api-security-baseline`)

### FINDING-005 — No integration/smoke covering password persistence

- **Severity:** High
- **Area:** tests
- **Location:** Unit specs under `apps/api/src/**/*.spec.ts`; `apps/api/test/app.e2e-spec.ts` (health only); `.github/workflows/ci.yml` (unit cov only)
- **Problem:** Critical path create-without-password → generate → Firestore update is never exercised end-to-end (emulator or in-process Nest + mocked EventBus wait). Unit tests mock ports in isolation and would not catch FINDING-001/002.
- **Why it matters:** Testing rules require regression coverage for detected bugs; challenge evaluation hinges on this flow.
- **Impact:** False confidence from ≥80 % unit coverage; regressions ship silently.
- **Recommendation:** Add one smoke: TestingModule or emulator — create without password, assert persisted `passwordHash` / GET `hasPassword: true`. Optionally run against Firebase emulator in local README recipe; keep CI unit-only if emulator is too heavy, but do not leave the gap untested.
- **OpenSpec candidate:** yes — suggested change slug: `add-create-user-password-smoke`

### FINDING-006 — Event handler lacks hash-existence idempotency

- **Severity:** Medium
- **Area:** backend
- **Location:** `apps/api/src/modules/users/application/events/handlers/generate-password-on-user-created.handler.ts:35-41`; `docs/adr/0005-seguridad-passwords-y-api.md:47`
- **Problem:** ADR states generation is “idempotente si ya hay hash.” Handler only checks `passwordMissing` on the event; a redelivery/replay would regenerate and overwrite without `findById` guard.
- **Why it matters:** Event-driven writes must tolerate duplicate delivery; ADR claims are currently false.
- **Impact:** Accidental password rotation on replay; ADR drift.
- **Recommendation:** Load user; if `hasPassword`, return; else generate/update. Add unit test for replay.
- **OpenSpec candidate:** yes — group with FINDING-001/002: `harden-user-created-event`

### FINDING-007 — README points to non-existent OpenSpec change path

- **Severity:** Medium
- **Area:** docs
- **Location:** `README.md:87` → `openspec/changes/bootstrap-users-api/`; actual: `openspec/changes/archive/2026-07-15-bootstrap-users-api/` and `openspec/specs/`
- **Problem:** Post-archive, the live link is broken.
- **Why it matters:** Documentation rules forbid drift after behavior/process changes; evaluators follow README first.
- **Impact:** Broken onboarding path; looks unfinished.
- **Recommendation:** Point to `openspec/specs/` and/or the archive folder.
- **OpenSpec candidate:** yes — suggested change slug: `fix-readme-openspec-links` (small; may be docs-only without delta specs)

### FINDING-008 — Password generator charset mapping bias

- **Severity:** Medium
- **Area:** security
- **Location:** `apps/api/src/modules/users/infrastructure/crypto/crypto-password.generator.ts:12-16`
- **Problem:** `bytes[i] % CHARSET.length` introduces slight modulo bias (charset length 70 does not divide 256 evenly).
- **Why it matters:** ADR-0005 claims cryptographically secure generation; bias is small but real and easy to fix.
- **Impact:** Marginal entropy reduction; pedantic security nit for a challenge but valid Principal review.
- **Recommendation:** Rejection sampling until `byte < 256 - (256 % CHARSET.length)`.
- **OpenSpec candidate:** maybe — `fix-password-generator-unbiased`

### FINDING-009 — No uniqueness constraints for email/username

- **Severity:** Medium
- **Area:** backend
- **Location:** `apps/api/src/modules/users/infrastructure/persistence/firestore-user.repository.ts` (`set` by UUID only)
- **Problem:** Duplicate emails/usernames are allowed. Requirements marked uniqueness as optional/non-blocking, but no 409 path exists.
- **Why it matters:** Duplicate identities confuse the demo and diverge from typical User aggregates.
- **Impact:** Data quality; possible confusion during evaluation curls.
- **Recommendation:** If kept out of scope, document explicitly in ADR/README as accepted limit. Otherwise query-by-email + `409` before create.
- **OpenSpec candidate:** maybe — `add-user-email-uniqueness`

### FINDING-010 — Minor maintainability nits

- **Severity:** Low
- **Area:** backend
- **Location:** `apps/api/src/modules/users/domain/errors/user.errors.ts` (`InvalidUserError`); `apps/api/src/modules/users/infrastructure/http/users.controller.ts:12` imports `CreateUserResult` from handler file
- **Problem:** Dead domain error type; HTTP layer couples to handler module for a result type.
- **Why it matters:** Noise and layering smell over time.
- **Impact:** Low — readability/maintainability only.
- **Recommendation:** Move `CreateUserResult` to a shared application types file; use or remove `InvalidUserError`.
- **OpenSpec candidate:** no

### FINDING-011 — ADR / OpenSpec process drift

- **Severity:** Low
- **Area:** docs
- **Location:** `docs/adr/*.md` acceptance checklists mostly `[ ]`; `openspec/specs/*/spec.md` Purpose leftovers (`TBD`) after archive
- **Problem:** Specs/ADRs marked accepted/archived but checklists and Purpose fields incomplete.
- **Why it matters:** Documentation review expects living docs to match delivery state.
- **Impact:** Evaluators may discount documentation discipline.
- **Recommendation:** Tick criteria that are met; fill Purpose from proposal; leave unmet ADR-0005 items either implemented or demoted via enmienda.
- **OpenSpec candidate:** yes — `sync-docs-after-bootstrap-delivery`

### FINDING-012 — CI and ops shallow for optional signals

- **Severity:** Suggestion
- **Area:** infra
- **Location:** `.github/workflows/ci.yml`; `apps/api/src/shared/health/health.controller.ts`; `infra/README.md`
- **Problem:** CI is build + `test:cov` only (aligned with ADR-0004 minimum). No lint gate, no terraform fmt/validate, no emulator job. Health returns `{ status: 'ok' }` without Firestore probe.
- **Why it matters:** Nx/Terraform were hiring signals; optional CI checks would strengthen them without bloating local demo.
- **Impact:** Missed early detection of formatting/IaC errors; weak readiness signal.
- **Recommendation:** Optional job: `terraform fmt -check` + `validate`; keep emulator smoke local. Deep health optional.
- **OpenSpec candidate:** maybe — `extend-ci-terraform-validate`

## Strengths

- Clear hexagonal layout with CQRS file-per-handler matching team constraints (ADR-0002 / OpenSpec `platform` + `users`).
- Controllers stay thin; domain has no `firebase-admin` / HTTP coupling.
- Password never persisted or returned in plaintext; bcrypt + generator behind ports.
- Env validation fail-fast for `PORT` / `FIREBASE_PROJECT_ID`; emulator path documented.
- Solid unit coverage of handlers/controllers/adapters with port mocks; Jest threshold enforced and green in CI recipe.
- Terraform lite + Nx lite present without overbuilding into multi-app monorepo.

## Suggested OpenSpec groupings (preview)

| Change slug (proposed) | Findings | Rationale |
|------------------------|----------|-----------|
| `fix-await-password-on-user-created` | FINDING-001, FINDING-002, FINDING-006 | Same write-path correctness + event semantics |
| `harden-api-security-baseline` | FINDING-003, FINDING-004 | ADR-0005 security controls deferred |
| `add-create-user-password-smoke` | FINDING-005 | Test that locks the race/failure fixes |
| `fix-readme-and-docs-drift` | FINDING-007, FINDING-011 | Docs-only sync after archive |
| `fix-password-generator-unbiased` | FINDING-008 | Small isolated crypto fix |
| `extend-ci-terraform-validate` | FINDING-012 | Optional delivery hardening |

## Out of scope / not reviewed

- Frontend (none in repo).
- Live Firebase / Terraform apply against real GCP.
- Dependency CVE audit (`npm audit`) beyond surface note of prior moderate/high advisories in install logs.
- Manual browser/curl evaluation against emulator in this review session.
- CodeGraph index (`.codegraph/` not initialized — structural review via file scan + explore agent).
