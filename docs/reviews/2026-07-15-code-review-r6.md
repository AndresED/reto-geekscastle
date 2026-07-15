# Code Review Report

| Field | Value |
|-------|--------|
| Date | 2026-07-15 |
| Scope | Post–r5 delivery delta on `main`: `2174af2...2616526` (Swagger, list users, docs/GCP, conflict harden, layout). `git diff main...HEAD` empty at tip `2616526`. Prior: [r5](./2026-07-15-code-review-r5.md). |
| Base commit | `2174af2` → tip `2616526` |
| Reviewer | Principal Engineer (Cursor agent) |

## Executive summary

Since r5 the repo closed the email-conflict mapping gap, added OpenAPI with success/error schemas, clarified `application/services` + `test-doubles`, shipped evaluator-facing architecture + GCP narrative, and added `GET /api/v1/users`. Challenge bar (PDF + evaluator email) is met: create/finalize/event story, uniqueness, tests (~93% statements / 42 tests), README, Swagger, GCP description. Remaining issues are delivery polish: unbounded list scan, OpenSpec/ADR diagram drift vs list endpoint, and optional CI/health/test hardeners. **Merge recommendation: Approve** — ship for deadline; OpenSpec only if you still want formal sync of `list` into living specs.

## Prior findings status (r5 → r6)

| Prior ID (r5) | Status after `2616526` |
|---------------|------------------------|
| FINDING-001 C4 Mermaid / TF→emulator | **Mostly fixed** — plain `flowchart`; TF targets cloud only |
| FINDING-002 Conflict `instanceof` fragility | **Fixed** — `asEmailConflict` + claim probe (`1a6fe79`) |
| FINDING-003 CI lint / shallow health | **Open** |
| FINDING-004 Weak audit handler test | **Open** |

## Findings index

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | Medium | backend | `GET /users` (`listAll`) unbounded collection scan | maybe |
| FINDING-002 | Medium | docs | Living OpenSpec / C4 omit `ListUsers` after shipping endpoint | yes |
| FINDING-003 | Low | backend | Redundant `findByEmail` pre-check before transactional create | no |
| FINDING-004 | Low | security | Committed open `firestore.rules` until 2026-08-14 | no |
| FINDING-005 | Suggestion | infra | CI still skips lint; health still shallow | no |
| FINDING-006 | Suggestion | tests | Audit handler test still “does not throw” only | no |

## Findings

### FINDING-001 — Unbounded `listAll` for `GET /users`

- **Severity:** Medium
- **Area:** backend
- **Location:** `apps/api/src/modules/users/infrastructure/persistence/firestore-user.repository.ts:150-160`; `list-users.handler.ts`; `users.controller.ts:90-115`
- **Problem:** Listing loads the entire `users` collection, maps all docs, and sorts in process memory. No `limit`, cursor, or max page size.
- **Why it matters:** Fine for emulator demos with few docs; in any non-trivial dataset (or a curious abuse of a public API) this is a latency/cost/DoS footgun. The endpoint is also `@SkipThrottle()`, so it does not inherit the write throttle.
- **Impact:** Scalability and abuse surface; challenge correctness unaffected at demo scale.
- **Recommendation:** Document “MVP no pagination” in README/Swagger (partial mitigation already via description), or add a hard `limit` (e.g. 100) + optional cursor. Prefer limit before inventing full pagination.
- **OpenSpec candidate:** maybe — `cap-list-users-page-size`

### FINDING-002 — Spec / diagram drift after `ListUsers`

- **Severity:** Medium
- **Area:** docs
- **Location:** `openspec/specs/users/spec.md` (GET by id only); `docs/infra/c4-y-flujos.md:40` (components table lists Create/Get/Finalize/Audit, not List); `docs/requirements/reto.md` US map (still US-15 = get-by-id only)
- **Problem:** Runtime and Swagger expose `GET /api/v1/users` with CQRS `ListUsersQuery`/`ListUsersHandler`, but living OpenSpec and C4 component inventory do not. Documentation-review rule: behavior changes must update specs/diagrams.
- **Why it matters:** Evaluators who trust OpenSpec as source of truth see incomplete contract; hurts the “docs disciplined” hiring signal you otherwise earned.
- **Impact:** Spec drift only — not a runtime defect.
- **Recommendation:** Add a short users requirement + scenario for list (no secrets, empty array OK); update C4 components line; optional US row or note “extra endpoint beyond US-15”.
- **OpenSpec candidate:** yes — `sync-list-users-into-openspec`

### FINDING-003 — Pre-create `findByEmail` before transactional claim

- **Severity:** Low
- **Area:** backend
- **Location:** `create-user.handler.ts:51-54` then `firestore-user.repository.ts` transaction
- **Problem:** Handler performs a non-atomic email lookup, then `create` re-enforces uniqueness inside `runTransaction`. Correctness is owned by the transaction; the pre-check is extra RTT and suggests a check-then-act pattern that is no longer the authority.
- **Why it matters:** Minor latency; interview optics if someone asks about races (you already solved races in the repo layer).
- **Impact:** Extra read under load; no correctness gap given the transaction.
- **Recommendation:** Keep for fast-fail UX **or** remove and rely solely on the transaction — document the choice in ADR-0002/0003 if asked.
- **OpenSpec candidate:** no

### FINDING-004 — Open demo Firestore security rules committed

- **Severity:** Low
- **Area:** security
- **Location:** `firestore.rules:1-17`; README troubleshooting notes Admin SDK path
- **Problem:** Rules allow broad `read, write` until `2026-08-14`. Backend uses Admin SDK (bypasses rules), so local demo works; a mistaken client SDK against a real project with these rules would be wide open until expiry.
- **Why it matters:** Common Firebase footgun in review panels that open `firestore.rules` first.
- **Impact:** Demo-safe with Admin SDK; risky if someone treats rules as production-ready.
- **Recommendation:** Keep README note; in interview state “client denied / admin-only”; optionally replace with deny-all client rules for demo clarity.
- **OpenSpec candidate:** no

### FINDING-005 — CI / health shallowness (carried)

- **Severity:** Suggestion
- **Area:** infra
- **Location:** `.github/workflows/ci.yml`; `shared/health/health.controller.ts`
- **Problem:** CI runs build + `test:cov` + Terraform validate; no eslint job. Health returns `{ status: 'ok' }` without Firestore readiness.
- **Why it matters:** Optional ops signal; not required by challenge PDF/email.
- **Impact:** Cosmetic for delivery.
- **Recommendation:** Skip before deadline unless time remains.
- **OpenSpec candidate:** no

### FINDING-006 — Audit handler regression guard weak (carried)

- **Severity:** Suggestion
- **Area:** tests
- **Location:** `user-created-audit.handler.spec.ts:4-10`
- **Problem:** Spec only asserts `handle` does not throw; does not lock “no repository/hasher ports / no mutate”.
- **Why it matters:** Handler exists specifically to avoid dual-mutate narrative.
- **Impact:** Low while class stays port-free.
- **Recommendation:** Optional structural assertion; leave for post-deadline.
- **OpenSpec candidate:** no

## Strengths

- Email conflict hardening (`asEmailConflict` + claim probe) closes the r5 Medium/Low production footgun.
- OpenAPI at `/api/docs` documents success and error schemas aligned with the filter — matches evaluator expectations.
- Module layout (`application/services`, `test-doubles`, command-colocated result) is easier to navigate for an outsider.
- README now has architecture summary + GCP Cloud Run / Firestore / Pub/Sub plan in natural Spanish — closes the email “describe deploy” gap without fake deploys.
- Password finalize await + non-mutating audit handler remains the strongest architectural story for interview.
- Suites green: **42** tests, ~**92.6%** statements; list/query/handler covered; throttle HTTP test still green with `ListUsersHandler` registered.
- Firebase emulator artifacts (`firestore.rules`/`indexes`, `firebase.json`) are wired and ignore noise from agents/PDFs.

## Suggested OpenSpec groupings (preview)

| Change slug (proposed) | Findings | Rationale |
|------------------------|----------|-----------|
| `sync-list-users-into-openspec` | FINDING-002 | Spec/diagram sync only |
| `cap-list-users-page-size` | FINDING-001 | Optional runtime guard if time allows |

No OpenSpec batch is **required** to meet deadline if README/Swagger already acknowledge list behavior.

## Out of scope / not reviewed

- Live emulator + API smoke beyond unit/smoke suite in this pass.
- `npm audit` / dependency CVE sweep.
- Frontend N/A.
- Actual Cloud Run deploy.
- Working tree `.firebaserc` CRLF noise (not content change).
