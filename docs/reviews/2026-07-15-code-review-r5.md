# Code Review Report

| Field | Value |
|-------|--------|
| Date | 2026-07-15 |
| Scope | Post–r4 closeout on `main` tip `2174af2` (diff `61cba6c...2174af2`). Working tree clean; `git diff main...HEAD` empty. Prior: [r4](./2026-07-15-code-review-r4.md). |
| Base commit | `61cba6c` → tip `2174af2` |
| Reviewer | Principal Engineer (Cursor agent) |

## Executive summary

The r4 OpenSpec set is **done**: `docs/infra/` now describes Users/Firestore (not Pokémon/Postgres), create persists email claim + user in a **Firestore transaction**, and `USERS_WRITE_THROTTLE` lives under `shared/config`. Prior Medium gaps from r4 are closed. What remains is polish: diagram accuracy/render quirks, possible `instanceof` fragility if the Admin SDK wraps transaction abort errors, and the long-standing optional CI lint / deep health. For the challenge delivery bar (deadline 2026-07-16 12:00 CDMX), this is mergeable. **Merge recommendation: Approve** — optional Lows/Suggestions only; no OpenSpec-blocking defects found.

## Prior findings status (r4 → r5)

| Prior ID (r4) | Status after `2174af2` |
|---------------|------------------------|
| FINDING-001 Pokémon `docs/infra/` | **Fixed** — Users/Firestore rewrite |
| FINDING-002 Non-atomic claim→user | **Fixed** — `runTransaction` dual `set` |
| FINDING-003 Throttle constant in users infra | **Fixed** — `shared/config/throttle.constants.ts` |
| FINDING-004 CI lint / shallow health | **Open** |
| FINDING-005 Weak audit handler test | **Open** |

## Findings index

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | Low | docs | C4 Mermaid may not render; Terraform→emulator arrow misleading | no |
| FINDING-002 | Low | backend | Conflict error may lose `instanceof` if transaction wraps abort | maybe |
| FINDING-003 | Suggestion | infra | CI still skips lint; health still shallow | no |
| FINDING-004 | Suggestion | tests | Audit handler test still only asserts “does not throw” | no |

## Findings

### FINDING-001 — C4 diagram portability / Terraform arrow

- **Severity:** Low
- **Area:** docs
- **Location:** `docs/infra/c4-y-flujos.md:5-29`
- **Problem:** The page uses a `C4Context` Mermaid block (needs C4 plugin / specific renderers). GitHub and many viewers show it raw. The L2 flowchart draws `tf -.->|provisiona cloud| emu`, which incorrectly implies Terraform wires the local emulator.
- **Why it matters:** Minor evaluator friction; fallback prose already says “cliente → Nest → Firestore.”
- **Impact:** Docs clarity only; not a runtime defect.
- **Recommendation:** Prefer plain `flowchart` for L1 as well; show Terraform as optional cloud path separate from emulator (no dashed link into emu).
- **OpenSpec candidate:** no

### FINDING-002 — Transaction conflict detection relies on unwrapped domain error

- **Severity:** Low
- **Area:** backend
- **Location:** `firestore-user.repository.ts:48-65`
- **Problem:** Inside `runTransaction`, conflict throws `UserEmailConflictError`. The outer catch rethrows only when `instanceof UserEmailConflictError`. If the Admin SDK wraps/aborts and replaces the error type in some environments, conflicts could surface as `UserPersistenceError` → HTTP 502 instead of 409.
- **Why it matters:** Unit tests mock `runTransaction` and propagate the domain error verbatim — they would not catch SDK wrapping.
- **Impact:** Wrong status code on duplicate email under real Firestore (if wrapping occurs); correct under current mocked suite.
- **Recommendation:** Map by error message/code as fallback (`Email already registered` / custom code property), or re-check claim existence after failed transaction before mapping persistence errors. Optional emulator integration test once.
- **OpenSpec candidate:** maybe — `harden-email-conflict-error-mapping`

### FINDING-003 — Remaining CI / ops shallowness

- **Severity:** Suggestion
- **Area:** infra
- **Location:** `.github/workflows/ci.yml`; `shared/health/health.controller.ts`
- **Problem:** Lint still not in CI; health remains `{ status: 'ok' }` without Firestore readiness. Terraform validate remains present.
- **Why it matters:** Nice-to-have hiring/ops signals; not a challenge correctness gap.
- **Impact:** Cosmetic.
- **Recommendation:** Optional lint job; optional emulator readiness — only if time remains before deadline.
- **OpenSpec candidate:** no

### FINDING-004 — Audit handler test still minimal

- **Severity:** Suggestion
- **Area:** tests
- **Location:** `user-created-audit.handler.spec.ts`
- **Problem:** Still asserts only that `handle` does not throw; does not guard against a future regression that injects mutators.
- **Why it matters:** Thin handler exists specifically to avoid dual mutate.
- **Impact:** Low while the class has no injectable ports.
- **Recommendation:** Optional structural assertion; leave as-is for challenge delivery.
- **OpenSpec candidate:** no

## Strengths

- `docs/infra/` is product-correct; `docs/README.md` points evaluators there; Terraform clearly separated at repo-root `infra/`.
- Create path uses an all-or-nothing transaction for claim + user; README matches.
- Throttle constant no longer leaks from users infrastructure into AppModule.
- Password finalize / audit split remains sound; compensate delete still clears claim + user.
- Suite: 34 tests, ~93% statements, smoke green; living OpenSpec delivery/users updated.

## Suggested OpenSpec groupings (preview)

| Change slug (proposed) | Findings | Rationale |
|------------------------|----------|-----------|
| `harden-email-conflict-error-mapping` | FINDING-002 | Only if emulator shows 502 on duplicates |

Otherwise **no OpenSpec batch required** for delivery — remaining items are optional.

## Out of scope / not reviewed

- Live Firestore emulator walkthrough against a real machine in this pass.
- Frontend N/A.
- `npm audit` / CVE scan.
- Load/K6 beyond existing unit throttle test.
- Process-crash after successful create transaction and before finalize (pre-existing residual orphan with `passwordHash: null`; still documented via compensate-on-throw only).
