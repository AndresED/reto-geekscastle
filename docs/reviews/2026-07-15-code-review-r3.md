# Code Review Report

| Field | Value |
|-------|--------|
| Date | 2026-07-15 |
| Scope | Post–review-r2 closeout on `main` (`5d7b0c3...f68469e`). Working tree clean; `git diff main...HEAD` empty. Prior: [r2](./2026-07-15-code-review-r2.md), [r1](./2026-07-15-code-review.md). |
| Base commit | `5d7b0c3` → tip `f68469e` |
| Reviewer | Principal Engineer (Cursor agent) |

## Executive summary

The r2 OpenSpec set is **implemented and archived**. Create path now has a single awaited finalize executor, best-effort compensate-on-failure, email uniqueness → 409, and an HTTP throttle test. Correctness bar for the challenge is met: create-without-password returns consistent flags, fails loud on finalize errors, and tests/smoke/coverage (~94% statements) look solid. Remaining risk is mostly **narrative / hiring-signal drift** (README and US-11/US-12 still describe “event handler generates password” while `UserCreatedEvent` has zero subscribers) plus known email TOCTOU and small cleanliness items. **Merge recommendation: Approve with fixes** — shippable for demo; tighten docs and optionally concurrency before calling the event story “done” under evaluator scrutiny.

## Prior findings status (r2 → r3)

| Prior ID (r2) | Status after `f68469e` |
|---------------|------------------------|
| FINDING-001 Dual invoke / concrete event handler | **Fixed** — `FinalizeMissingPasswordService`; no `@EventsHandler` |
| FINDING-002 Orphan on finalize failure | **Fixed** (best-effort) — `delete` + compensate; residual crash window documented |
| FINDING-003 Email uniqueness | **Fixed** — `findByEmail` + 409 (`UserEmailConflictError`) |
| FINDING-004 Throttle HTTP test | **Fixed** — `users.throttle.http.spec.ts` |
| FINDING-005 Dead error / result type location | **Open** (unchanged) |
| FINDING-006 CI lint / deep health | **Open** (unchanged) |

## Findings index

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | Medium | docs | README / US-11 still claim event generates password | yes |
| FINDING-002 | Medium | backend | Email uniqueness is check-then-create (TOCTOU) | maybe |
| FINDING-003 | Low | backend | `InvalidUserError` unused; `CreateUserResult` on handler | no |
| FINDING-004 | Low | backend | Hash client password before uniqueness check | no |
| FINDING-005 | Low | tests | Throttle test proves wiring, not AppModule `limit: 20` | no |
| FINDING-006 | Suggestion | tests | Triplicated `InMemoryUserRepository` | no |
| FINDING-007 | Suggestion | infra | CI lint + shallow health still absent | no |

## Findings

### FINDING-001 — Challenge narrative still says the event generates the password

- **Severity:** Medium
- **Area:** docs
- **Location:** `README.md` (intro paragraph); `docs/requirements/reto.md` US-11/US-12 (event handler file + “handler genera password”); `apps/api/.../create-user.handler.ts:76-78` publishes `UserCreatedEvent` with **no** `@EventsHandler` in the module
- **Problem:** Implementation correctly awaits `FinalizeMissingPasswordService` then publishes `UserCreatedEvent` as a notification (ADR-0002 enmienda). README still says the domain event generates/hashes/updates the password. Reto US-11 still asks for an event handler in its own file that owns generation. Living OpenSpec/ADR match code; README/reto storyboards do not.
- **Why it matters:** Evaluators often skim README + “evento al insertar” before reading ADR footnotes. A hollow publish with zero listeners can look like the dual-invoke smell was “fixed” by removing the challenge’s event handler rather than by a deliberate design.
- **Impact:** Hiring-signal / acceptance confusion; not a runtime bug.
- **Recommendation:** Either (a) update README + US-11/US-12 checkboxes/notes to state: application finalize is the sole mutator; event is audit/signal only; Nest EventBus cannot await handlers — cite ADR-0002; or (b) add a thin non-mutating `@EventsHandler(UserCreatedEvent)` (log/metrics only) so there is literally an event-handler file, without reintroducing dual mutate. Prefer (a) unless the evaluator checklist hard-requires a handler file.
- **OpenSpec candidate:** yes — suggested change slug: `align-user-created-event-narrative`

### FINDING-002 — Email uniqueness race under concurrent creates

- **Severity:** Medium
- **Area:** backend
- **Location:** `create-user.handler.ts:60-65`; `firestore-user.repository.ts:91-109`
- **Problem:** Uniqueness is `findByEmail` then `create` (UUID doc id). Two concurrent requests with the same email can both pass the check and insert twins. README documents TOCTOU; no email-registry document / transaction / deterministic conflict key.
- **Why it matters:** Spec requires unique email and 409; under load or parallel curls the invariant can fail.
- **Impact:** Duplicate emails possible; low probability in a manual challenge demo.
- **Recommendation:** Optional challenge hardening: `emails/{normalizedEmail}` doc created with `create()` (fail if exists) in the same flow, or accept documented TOCTOU for demo. Username uniqueness remains out of scope unless product asks.
- **OpenSpec candidate:** maybe — `harden-email-uniqueness-against-races`

### FINDING-003 — Minor cleanliness debt (carried from r2)

- **Severity:** Low
- **Area:** backend
- **Location:** `user.errors.ts:26-30` (`InvalidUserError`); `users.controller.ts:13` imports `CreateUserResult` from handler module
- **Problem:** Dead domain error; HTTP layer depends on a type living next to the command handler.
- **Why it matters:** Noise and mild layering smell.
- **Impact:** Maintainability only.
- **Recommendation:** Delete or use `InvalidUserError`; move `CreateUserResult` to e.g. `application/create-user.result.ts`.
- **OpenSpec candidate:** no

### FINDING-004 — Expensive hash before conflict short-circuit

- **Severity:** Low
- **Area:** backend
- **Location:** `create-user.handler.ts:47-65`
- **Problem:** Client-supplied passwords are bcrypt-hashed before `findByEmail`. Duplicate email pays a full hash then 409.
- **Why it matters:** Unnecessary CPU under abuse/duplicates; minor DoS amplification relative to uniqueness check alone.
- **Impact:** Low at 20 req/min throttle; unnecessary work on the conflict path.
- **Recommendation:** Run `findByEmail` (after normalizing email via `User.create` or a small helper) before hashing. Keep hash-before-persist for successful creates.
- **OpenSpec candidate:** no

### FINDING-005 — Throttle test uses `limit: 2`, not production `20`

- **Severity:** Low
- **Area:** tests
- **Location:** `users.throttle.http.spec.ts:76-81`; `app.module.ts:16-21`
- **Problem:** HTTP test correctly proves `ThrottlerGuard` + `SkipThrottle` on health with a local `limit: 2`. It does not prove AppModule’s production `limit: 20` / `ttl: 60_000` values remain wired.
- **Why it matters:** Someone could change AppModule to `limit: 2000` and the suite would still pass.
- **Impact:** Config drift risk; wiring regressions are still caught.
- **Recommendation:** Accept for challenge, or assert a shared constant imported by AppModule and the test (single source of truth for create limit).
- **OpenSpec candidate:** no

### FINDING-006 — In-memory repository triplicated in tests

- **Severity:** Suggestion
- **Area:** tests
- **Location:** `create-user-password.smoke.spec.ts`; `users.throttle.http.spec.ts` (nearly identical classes)
- **Problem:** Two copies of `InMemoryUserRepository`; any port method addition requires multi-file edits (already seen with `delete` / `findByEmail`).
- **Why it matters:** Test maintenance tax.
- **Impact:** Slowdowns when evolving the port.
- **Recommendation:** One test helper under `src/modules/users/testing/` (or similar) shared by smoke + HTTP specs.
- **OpenSpec candidate:** no

### FINDING-007 — Remaining CI / ops shallowness

- **Severity:** Suggestion
- **Area:** infra
- **Location:** `.github/workflows/ci.yml`; `health.controller.ts`
- **Problem:** Lint still not in CI; health remains `{ status: 'ok' }` with no Firestore readiness. Terraform validate is present (good).
- **Why it matters:** Nice-to-haves for hiring signals / ops; not blockers for the PDF challenge.
- **Impact:** Cosmetic CI gaps.
- **Recommendation:** Optional lint job; optional emulator readiness probe — only if time remains before deadline.
- **OpenSpec candidate:** no

## Strengths

- Single mutator for missing-password finalize; EventBus no longer double-invokes generate/update.
- Compensate path + smoke asserting empty store after forced update failure.
- Email conflict mapped cleanly via `ConflictDomainError` → HTTP 409; filter covered by unit test.
- Controllers remain thin; domain free of Firebase; ports expanded with `delete` / `findByEmail` in the adapter.
- Throttle HTTP test exercises real `ThrottlerGuard` + `UsersController` (not a stub guard).
- OpenSpec deltas archived into living `users` / `testing` specs; ADR-0002 reflects the await/finalize strategy.
- Suite: 32 tests, ~93–94% statements, smoke green.

## Suggested OpenSpec groupings (preview)

| Change slug (proposed) | Findings | Rationale |
|------------------------|----------|-----------|
| `align-user-created-event-narrative` | FINDING-001 | Docs / evaluator story vs code |
| `harden-email-uniqueness-against-races` | FINDING-002 | Optional stronger uniqueness |

Quiet cleanup (FINDING-003–005) can be a single tasks-only change or a tiny PR without OpenSpec if deadline is tight.

## Out of scope / not reviewed

- Live Firestore emulator walkthrough / production Firebase project.
- Frontend (`apps/web` N/A).
- Dependency CVE audit / `npm audit`.
- Load/K6 beyond the unit throttle test.
- Contents deleted under `docs/documentacion-referencial-ejemplo` (intentional cleanup in the same commit; not re-validated as product docs).
