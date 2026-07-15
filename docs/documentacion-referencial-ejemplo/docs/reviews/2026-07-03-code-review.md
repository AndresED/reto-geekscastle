# Code Review Report

| Field | Value |
|-------|--------|
| Date | 2026-07-03 |
| Scope | Full repo at `c912442` (clean tree, synced with `origin/main`) |
| Base commit | `c912442` |
| Reviewer | Principal Engineer (Cursor agent) |

## Executive summary

After the fourth review commit (`c912442`), the reto meets the evaluation bar: hexagonal backend, DB-aware health, scoped throttling, resilient frontend with list-error UX and unavailable stats, GitHub Actions CI, ADR-0004, guía/README parity including deep `/health`, and twenty-four archived OpenSpec changes with validated canonical specs. Unit suites pass (API 42/42, web 25/25).

**Merge recommendation: Approve.** No critical, high, or medium defects remain. Residual items are optional hardening (429 test, E2E list-error, lint in CI) and one minor spec scenario gap from an archive merge.

Top risks: POST rate-limit wiring has no automated guard; list-error behavior is Vitest-covered but not Playwright-covered in CI.

## Findings index

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | Low | docs | Frontend spec omits “no error on successful empty list” under list-load error | yes |
| FINDING-002 | Low | tests | No automated assertion for HTTP `429` rate limit | no |
| FINDING-003 | Low | tests | No Vitest for `PokemonStats` `unavailable` prop | no |
| FINDING-004 | Low | tests | No Playwright scenario for `GET /pokemon` failure | maybe |
| FINDING-005 | Suggestion | tests | `apiGet` network/non-JSON paths only covered via `apiPost` | no |
| FINDING-006 | Suggestion | backend | Empty `types[]` accepted when PokeAPI omits types | no |
| FINDING-007 | Suggestion | infra | PostgreSQL `5432` exposed on host in Compose | no |
| FINDING-008 | Suggestion | delivery | CI runs unit tests only (no lint/typecheck/E2E) | no |

## Resolved since prior review (fourth pass at `5e82a2a`)

| Prior ID | Status |
|----------|--------|
| FINDING-001 (stats zeros on list error) | **Fixed** — `c912442` (`PokemonStats` `unavailable`) |
| FINDING-002 (no list-error tests) | **Fixed** — `PokemonList.test.tsx`, `CreatePokemonPage.test.tsx` |
| FINDING-004 (deep health docs) | **Fixed** — README + guía |
| FINDING-005 (initial stats scenario) | **Fixed** — frontend spec |
| Four fourth-review OpenSpec changes | **Applied + archived** |
| ADR-0004 CI documentation | **Fixed** — `0c8178e` |

## Findings

### FINDING-001 — Frontend spec omits successful-empty-list guard under list-load error

- **Severity:** Low
- **Area:** docs
- **Location:** `openspec/specs/frontend/spec.md:383-410`
- **Problem:** **Registered List Load Error Feedback** documents failure behavior and stats placeholders, but no longer includes an explicit scenario that a successful `GET /pokemon` with `data: []` must not show error toast, unavailable stats, or list error banner. That scenario existed before the `test-list-load-error-ux` archive merge.
- **Why it matters:** Empty-list success vs load-failure is the main UX distinction evaluators test manually; the spec encodes failure well but not the negative guard for success.
- **Impact:** Spec ambiguity; low risk because implementation and **Empty registered list** scenario under Registered Pokemon List partially cover list empty UI.
- **Recommendation:** Restore scenario under list-load error requirement: **GIVEN** `200` + `data: []`, **THEN** no error toast, stats show 0/0/—, list shows empty message.
- **OpenSpec candidate:** yes — suggested slug: `restore-empty-list-success-spec-scenario`

### FINDING-002 — No automated `429` test

- **Severity:** Low
- **Area:** tests
- **Location:** `apps/api/src/modules/pokemon/infrastructure/http/pokemon.controller.ts:72`, test suite
- **Problem:** POST rate limit (20/min) is documented in Swagger, README, guía, and specs, but no Jest test asserts `429` with standard envelope after burst POSTs.
- **Why it matters:** Global `ThrottlerGuard` + per-route `@SkipThrottle` / `@Throttle` is easy to misconfigure when adding routes.
- **Impact:** Rate-limit regression undetected until manual testing.
- **Recommendation:** Focused API test: burst POST → `429`; same suite asserts GET `/pokemon` stays unthrottled.
- **OpenSpec candidate:** no

### FINDING-003 — No Vitest for `PokemonStats` unavailable state

- **Severity:** Low
- **Area:** tests
- **Location:** `apps/web/src/features/pokemon/components/PokemonStats.tsx`, no `PokemonStats.test.tsx`
- **Problem:** Unavailable stats (`—`, `No disponible`) are asserted only indirectly via `CreatePokemonPage.test.tsx`. The component has no isolated unit test.
- **Why it matters:** Refactoring `PokemonStats` could break placeholder display without a focused failing test.
- **Impact:** Low — page test provides partial guard.
- **Recommendation:** Add `PokemonStats.test.tsx` with `unavailable={true}` asserting display values and `aria-busy`.
- **OpenSpec candidate:** no

### FINDING-004 — No Playwright scenario for list load failure

- **Severity:** Low
- **Area:** tests
- **Location:** `apps/web/e2e/` (no `list-error` spec)
- **Problem:** List-load error UX is covered by Vitest mocks only. No E2E aborts `/pokemon` to verify banner, stats placeholders, and absence of detail empty-state in a real browser.
- **Why it matters:** CI does not run E2E; optional Playwright would help pre-demo manual checks.
- **Impact:** Browser-specific regressions (e.g. toast + banner stacking) unlikely but unguarded.
- **Recommendation:** Optional `list-error.spec.ts` with `page.route` abort; document as manual gate per ADR-0004.
- **OpenSpec candidate:** maybe — `e2e-list-load-error`

### FINDING-005 — `apiGet` error paths partially tested

- **Severity:** Suggestion
- **Area:** tests
- **Location:** `apps/web/src/shared/api/api-client.test.ts`
- **Problem:** `apiGet` has a 404 case; network failure and non-JSON body tests exist only for `apiPost`.
- **Why it matters:** `usePokemonList` uses `apiGet`; shared `request()` logic is the same.
- **Impact:** Marginal confidence gap only.
- **Recommendation:** Parametrize or duplicate one network + one non-JSON test for `apiGet('/pokemon')`.
- **OpenSpec candidate:** no

### FINDING-006 — Empty `types[]` when PokeAPI omits types

- **Severity:** Suggestion
- **Area:** backend
- **Location:** `apps/api/src/modules/pokemon/infrastructure/poke-api/poke-api.client.ts:70-74`
- **Problem:** Missing or invalid PokeAPI `types` maps to `types: []` without `InvalidExternalDataError`.
- **Why it matters:** **Tipos** degrades silently; unlikely for real PokeAPI resources.
- **Impact:** Edge-case data quality; acceptable for reto demo.
- **Recommendation:** Require ≥1 type on create, or document empty array as valid.
- **OpenSpec candidate:** no

### FINDING-007 — PostgreSQL port exposed on host

- **Severity:** Suggestion
- **Area:** infra
- **Location:** `docker-compose.yml:8-9`
- **Problem:** `5432:5432` maps Postgres to the host by default.
- **Why it matters:** Fine for local reto; unnecessary exposure on shared machines.
- **Impact:** Low security exposure in demo context.
- **Recommendation:** Remove host port mapping or document dev-only in README.
- **OpenSpec candidate:** no

### FINDING-008 — CI scope is unit tests only

- **Severity:** Suggestion
- **Area:** delivery
- **Location:** `.github/workflows/ci.yml`, ADR-0004
- **Problem:** CI runs `test:cov` and `test` only — no ESLint, `tsc --noEmit`, or Playwright. Intentional per ADR-0004.
- **Why it matters:** Type/lint issues can reach `main`; E2E remains manual.
- **Impact:** Acceptable for reto minimum.
- **Recommendation:** Optional follow-up: add lint/build jobs; keep E2E manual unless Docker-in-CI is justified.
- **OpenSpec candidate:** no

## Strengths

- End-to-end delivery stack is coherent: Compose health ordering, deep `/health`, CORS/helmet/env validation, POST-only throttle.
- Frontend error UX is thorough: toast once per list failure, inline banner, guarded empty states, unavailable stats placeholders.
- Test pyramid reasonable for reto: API 42 Jest tests ≥85% coverage; web 25 Vitest including page-level list-error guard.
- Documentation trail is strong: README, guía, four ADRs, OpenSpec archives, code review history.
- Hexagonal Pokemon module unchanged in quality: thin controller, use cases, ports, adapters.
- No active OpenSpec changes; canonical specs validate clean.

## Suggested OpenSpec groupings (preview)

| Change slug (proposed) | Findings | Rationale |
|------------------------|----------|-----------|
| `restore-empty-list-success-spec-scenario` | FINDING-001 | Spec-only delta |
| `e2e-list-load-error` | FINDING-004 | Optional acceptance layer |

## Out of scope / not reviewed

- Live Docker rebuild and full Playwright run in this session (unit tests executed locally).
- Remote GitHub Actions run (workflow reviewed statically).
- Load/stress testing beyond rate-limit configuration.
- Production TLS, secrets manager, Kubernetes.
- PokeAPI SLA and external dependency monitoring.
