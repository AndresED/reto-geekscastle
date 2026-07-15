# Code Review Report

| Field | Value |
|-------|--------|
| Date | 2026-07-15 |
| Scope | Post–r3 closeout on `main` tip `61cba6c` (diff `f68469e...61cba6c`). Working tree clean; `git diff main...HEAD` empty. Prior: [r3](./2026-07-15-code-review-r3.md). |
| Base commit | `f68469e` → tip `61cba6c` |
| Reviewer | Principal Engineer (Cursor agent) |

## Executive summary

Review-r3 OpenSpec items and the Low cleanups land correctly: docs match finalize-as-mutator, `UserCreatedAuditHandler` is log-only, email uniqueness uses an atomic `emails/{email}` claim, and the suite stays healthy (34 tests, ~91% statements). Residual risk is no longer about dual EventBus writes or missing 409 — it is **stale evaluation docs under `docs/infra/` (still Pokémon/Postgres)** and a **non-transactional claim→user write** that can permanently lock an email if the process dies between steps. For the challenge demo bar this is still shippable. **Merge recommendation: Approve with fixes** — rewrite or quarantine `docs/infra/` before an evaluator opens it; optionally harden create with a batch/transaction if time allows.

## Prior findings status (r3 → r4)

| Prior ID (r3) | Status after `61cba6c` |
|---------------|------------------------|
| FINDING-001 Event narrative drift | **Fixed** — README/US-11–12/diagram + audit handler |
| FINDING-002 Email TOCTOU (twins) | **Fixed** — `emails` doc `create()` is authoritative; pre-check is optimization |
| FINDING-003 Dead error / result type location | **Fixed** |
| FINDING-004 Hash before uniqueness | **Fixed** |
| FINDING-005 Throttle prod constant | **Fixed** — `USERS_WRITE_THROTTLE` asserted in test |
| FINDING-006 Triplicated in-memory repo | **Fixed** — shared test double |
| FINDING-007 CI lint / deep health | **Open** |

## Findings index

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | Medium | docs | `docs/infra/` still documents Pokémon + PostgreSQL | yes |
| FINDING-002 | Medium | backend | Email claim + user `set` not atomic (orphan claim lockout) | maybe |
| FINDING-003 | Low | backend | `AppModule` imports throttle constant from users infrastructure | no |
| FINDING-004 | Suggestion | infra | CI still skips lint; health still shallow | no |
| FINDING-005 | Suggestion | tests | Audit handler test does not prove non-mutation | no |

## Findings

### FINDING-001 — `docs/infra/` is leftover Pokémon/Postgres documentation

- **Severity:** Medium
- **Area:** docs
- **Location:** `docs/infra/README.md`, `docs/infra/base-de-datos.md`, `docs/infra/c4-y-flujos.md`
- **Problem:** After relocating “documentación referencial”, `docs/infra/` still describes React web + Nest + PostgreSQL `pokemon`, Docker Compose, Swagger `/api/docs`, and PokeAPI flows. The living product is Firestore Users API + Terraform under repo-root `infra/`. README/ADRs for Users are correct; this folder contradicts them.
- **Why it matters:** An evaluator browsing `docs/infra/` (or following the folder name “infra”) gets the wrong system architecture in minutes — worse than a missing diagram.
- **Impact:** Hiring-signal / credibility hit; confusion vs `infra/` Terraform and Nest Users module.
- **Recommendation:** Replace with a short Firestore data model (`users` + `emails` claim) + pointer to `infra/README.md` and C4 of Users create flow, **or** delete/move the Pokémon content back under an explicitly named `documentacion-referencial-ejemplo/` and leave `docs/infra/` as Users-only.
- **OpenSpec candidate:** yes — suggested change slug: `rewrite-docs-infra-for-users-firestore`

### FINDING-002 — Non-atomic email claim then user write

- **Severity:** Medium
- **Area:** backend
- **Location:** `firestore-user.repository.ts:48-67`
- **Problem:** Create does `emails/{email}.create(claim)` then `users/{id}.set(doc)`. If the process dies after a successful claim and before (or during) user `set`, and the catch-path release never runs, the email remains claimed with no user document — permanent 409 for that email until manual cleanup. Compensating delete on finalize failure is covered; mid-create crash is not.
- **Why it matters:** Spec requires uniqueness under concurrency (met for live races via `create()`), but availability of the email after partial failure is not guaranteed.
- **Impact:** Locked email without a recoverable user row; low probability in demo, real operational footgun.
- **Recommendation:** Prefer Firestore transaction or batched write that creates both docs (or claim-with-user payload) so partial persistence cannot leave a claim without a user. Document manual recovery (`delete emails/{email}`) in README if left as best-effort.
- **OpenSpec candidate:** maybe — `atomic-email-claim-and-user-create`

### FINDING-003 — Root `AppModule` depends on users infrastructure path

- **Severity:** Low
- **Area:** backend
- **Location:** `app.module.ts:5-17` → `modules/users/infrastructure/http/throttle.constants.ts`
- **Problem:** Platform bootstrap imports a constant from the users HTTP infrastructure folder to configure global ThrottlerModule.
- **Why it matters:** Mild layering smell — root app shouldn’t reach into a feature’s infrastructure tree for shared config.
- **Impact:** Maintainability only; works fine for a one-module challenge.
- **Recommendation:** Move `USERS_WRITE_THROTTLE` to `shared/config/` (or `shared/http/`) and import from both AppModule and the throttle test.
- **OpenSpec candidate:** no

### FINDING-004 — Remaining CI / ops shallowness

- **Severity:** Suggestion
- **Area:** infra
- **Location:** `.github/workflows/ci.yml`; `shared/health/health.controller.ts`
- **Problem:** Lint still not in CI; health remains shallow `{ status: 'ok' }` without Firestore readiness. Terraform validate remains present.
- **Why it matters:** Nice-to-have hiring/ops signals; not a challenge correctness gap.
- **Impact:** Cosmetic.
- **Recommendation:** Optional lint job; optional emulator readiness — only if time before deadline.
- **OpenSpec candidate:** no

### FINDING-005 — Audit handler test is smoke-level only

- **Severity:** Suggestion
- **Area:** tests
- **Location:** `user-created-audit.handler.spec.ts`
- **Problem:** Test only asserts `handle` does not throw. It does not guard against a future regression that injects repository/generator and mutates again.
- **Why it matters:** The whole point of the thin handler is “no dual mutate.”
- **Impact:** Low — class currently has no deps to misuse.
- **Recommendation:** Optional structural assertion (no `USER_REPOSITORY_PORT` / empty constructor) or leave as-is for challenge.
- **OpenSpec candidate:** no

## Strengths

- Sole password mutator remains `FinalizeMissingPasswordService`; audit `@EventsHandler` does not write.
- Email registry `create()` closes the twin-document concurrency hole; adapter maps ALREADY_EXISTS → `UserEmailConflictError` → 409.
- Compensating `delete` releases user + email claim; smoke covers orphan cleanup after forced update failure.
- Shared `InMemoryUserRepository` + `USERS_WRITE_THROTTLE` reduce test/config drift.
- Evaluator-facing README and US-11/US-12 now match ADR-0002; living OpenSpec users requirements updated (event signal + concurrent uniqueness).
- Controllers stay thin; domain stays Firebase-free; suite green.

## Suggested OpenSpec groupings (preview)

| Change slug (proposed) | Findings | Rationale |
|------------------------|----------|-----------|
| `rewrite-docs-infra-for-users-firestore` | FINDING-001 | Stop Pokémon docs from impersonating product infra |
| `atomic-email-claim-and-user-create` | FINDING-002 | Close orphan-claim crash window |

FINDING-003 is a five-minute move if touched alongside something else; 004–005 optional.

## Out of scope / not reviewed

- Live Firestore emulator / production GCP project.
- Frontend N/A.
- `npm audit` / CVE scan.
- Load testing beyond unit throttle test.
- Contents of repo-root `infra/` Terraform beyond prior validate-in-CI assumption (not re-run in this review).
