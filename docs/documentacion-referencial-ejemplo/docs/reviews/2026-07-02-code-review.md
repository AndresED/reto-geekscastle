# Code Review Report

| Field | Value |
|-------|--------|
| Date | 2026-07-02 |
| Scope | Full monorepo (`apps/api`, `apps/web`, `docs`, `openspec`) — no git repository detected; branch diff unavailable |
| Base commit | N/A (`.git` not present) |
| Reviewer | Principal Engineer (Cursor agent) |

## Executive summary

The implementation is solid for a technical challenge: hexagonal boundaries in the Pokemon module, consistent API envelopes, strong unit-test coverage (~98% backend statements), and meaningful Playwright acceptance tests. Docker Compose delivers a working fullstack with documented developer onboarding.

**Merge recommendation: Approve with fixes.** The code is maintainable and production-minded for a reto scope, but delivery and spec-alignment gaps should be addressed before external evaluation: no initialized git repository (blocks public-repo requirement), **Tipos** stat permanently stubbed despite OpenSpec, and several operational hardening items (env validation, API readiness in Compose, fragile HTTP client parsing).

Top risks: evaluator cannot clone a public repo; dashboard stat contradicts canonical frontend spec; silent persistence failures obscure root causes; E2E suite depends on shared DB state without isolation.

## Findings index

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | Critical | delivery | No git repository initialized | yes |
| FINDING-002 | High | frontend | **Tipos** stat stubbed (`"—"`) vs OpenSpec requirement | yes |
| FINDING-003 | High | backend | No startup validation for required env (`DATABASE_URL`) | yes |
| FINDING-004 | High | frontend | `api-client` assumes JSON body on every response | yes |
| FINDING-005 | Medium | infra | API service lacks healthcheck; `web` may start before API is ready | yes |
| FINDING-006 | Medium | backend | `PersistenceError` swallows underlying DB error | yes |
| FINDING-007 | Medium | security | CORS origins hardcoded; not environment-driven | maybe |
| FINDING-008 | Medium | security | No rate limiting on `POST /pokemon` (PokeAPI abuse / cost) | yes |
| FINDING-009 | Medium | backend | Re-create same pokemon upserts by PK without documented contract | maybe |
| FINDING-010 | Medium | tests | E2E tests share persistent DB; no cleanup or isolation | yes |
| FINDING-011 | Medium | docs | README/Swagger drift (`spriteUrl`, `GET /pokemon`, envelope fields) | yes |
| FINDING-012 | Medium | backend | `TypeORM synchronize: true` enabled globally | maybe |
| FINDING-013 | Low | frontend | Duplicated `capitalize()` across four components/pages | no |
| FINDING-014 | Low | frontend | Mobile sticky submit button lacks accessible name | maybe |
| FINDING-015 | Low | frontend | `apiGet` error paths untested (only `apiPost` 404 covered) | no |
| FINDING-016 | Low | backend | `bootstrap()` has no top-level error handler | no |
| FINDING-017 | Low | security | Default Postgres password `changeme` in Compose (dev-only risk if exposed) | no |
| FINDING-018 | Suggestion | backend | Response mapping (`toPokemonResponseDto`) lives in controller | no |
| FINDING-019 | Suggestion | backend | Add `helmet` or security headers on API | maybe |
| FINDING-020 | Suggestion | infra | Pin Docker image digests for reproducible builds | no |

## Findings

### FINDING-001 — No git repository initialized

- **Severity:** Critical
- **Area:** delivery
- **Location:** repository root (`.git` absent)
- **Problem:** The workspace is not a git repository. `openspec/specs/delivery/spec.md` requires a **public git repository** evaluators can clone.
- **Why it matters:** Delivery criterion US-20 / Public Repository cannot be verified. Reviewers have no commit history, tags, or remote URL.
- **Impact:** Blocks formal submission and PR-based review workflow; `/code-review` branch scope is unavailable.
- **Recommendation:** Run `git init`, add `.gitignore` (already present), create initial commit, push to a public remote (GitHub/GitLab), and document the URL in README.
- **OpenSpec candidate:** yes — suggested change slug: `init-public-git-repo`

### FINDING-002 — **Tipos** stat stubbed vs OpenSpec requirement

- **Severity:** High
- **Area:** frontend
- **Location:** `apps/web/src/pages/CreatePokemonPage.tsx:25-30`
- **Problem:** `buildStats()` sets `typesCount: '—'` permanently. OpenSpec requires **Tipos** to show unique types count and update when a new pokemon introduces a type not seen before (`openspec/specs/frontend/spec.md`, Dashboard Statistics).
- **Why it matters:** Canonical spec and UI diverge. Evaluators testing US acceptance for stats will see a non-functional metric.
- **Impact:** User-facing incorrect dashboard; spec non-compliance. Backend does not persist PokeAPI `types`, so the frontend cannot compute this without API changes.
- **Recommendation:** Either (a) extend backend to persist/expose pokemon types from PokeAPI and compute unique count client-side, or (b) amend OpenSpec to document intentional deferral with `"—"` placeholder and adjust acceptance scenarios.
- **OpenSpec candidate:** yes — suggested change slug: `implement-tipos-stat-or-spec-amendment`

### FINDING-003 — No startup validation for required env

- **Severity:** High
- **Area:** backend
- **Location:** `apps/api/src/app.module.ts:10-15`, `apps/api/src/main.ts:8-42`
- **Problem:** `DATABASE_URL` is read directly from `process.env` with no validation. Missing or malformed URL fails at TypeORM connect with an opaque stack trace.
- **Why it matters:** Fail-fast configuration is standard for containerized services; misconfigured Compose/env wastes operator time.
- **Impact:** Poor operability; harder Docker troubleshooting for reviewers.
- **Recommendation:** Add `ConfigModule` validation (e.g. Joi/Zod schema) requiring `DATABASE_URL`, optional `POKEAPI_BASE_URL`/`PORT`; exit with clear message on boot failure.
- **OpenSpec candidate:** yes — suggested change slug: `validate-api-env-on-bootstrap`

### FINDING-004 — `api-client` assumes JSON body on every response

- **Severity:** High
- **Area:** frontend
- **Location:** `apps/web/src/shared/api/api-client.ts:49-56`, `65-72`
- **Problem:** `response.json()` is called unconditionally. Network errors, HTML error pages (nginx 502), or empty bodies throw `SyntaxError` instead of a controlled `ApiError`.
- **Why it matters:** Users see generic browser-level failures; error toasts may not appear when API is down.
- **Impact:** Degraded UX during partial outages; harder E2E debugging when stack is not fully up.
- **Recommendation:** Check `Content-Type`, wrap `json()` in try/catch, map parse/network failures to Spanish user messages; add unit tests for non-JSON and `fetch` rejection.
- **OpenSpec candidate:** yes — suggested change slug: `harden-api-client-parsing`

### FINDING-005 — API service lacks healthcheck in Compose

- **Severity:** Medium
- **Area:** infra
- **Location:** `docker-compose.yml:16-37`
- **Problem:** `db` has a healthcheck; `api` does not. `web` depends only on `api` container start, not readiness.
- **Why it matters:** ADR-0001 already notes this gap. Playwright hitting `http://localhost` immediately after `compose up` can race API boot.
- **Impact:** Flaky E2E and first-load failures for reviewers.
- **Recommendation:** Add Nest health endpoint (`@nestjs/terminus` or minimal `GET /health`) and `depends_on: api: condition: service_healthy` for `web`; document in README.
- **OpenSpec candidate:** yes — suggested change slug: `add-api-healthcheck-compose`

### FINDING-006 — `PersistenceError` swallows underlying DB error

- **Severity:** Medium
- **Area:** backend
- **Location:** `apps/api/src/modules/pokemon/infrastructure/persistence/pokemon.repository.ts:17-23`, `27-32`
- **Problem:** Empty `catch` blocks replace all DB failures with generic `PersistenceError` and no logging.
- **Why it matters:** Operators cannot distinguish constraint violations, connection loss, or schema drift from logs.
- **Impact:** Maintainability and incident response; 500s with no actionable server-side detail.
- **Recommendation:** Log the original error at `error` level (without PII); optionally map known constraint errors to domain errors; rethrow or chain `cause` in Node 20+.
- **OpenSpec candidate:** yes — suggested change slug: `improve-persistence-error-observability`

### FINDING-007 — CORS origins hardcoded

- **Severity:** Medium
- **Area:** security
- **Location:** `apps/api/src/main.ts:11-19`
- **Problem:** Allowed origins are a static localhost list. Deploying to staging/production domains requires code change.
- **Why it matters:** Environment-specific CORS is a common production requirement; hardcoding invites merge mistakes.
- **Impact:** Security/maintainability when hostnames change; not an issue for local Docker reto.
- **Recommendation:** Drive origins from env (`CORS_ORIGINS` comma-separated) with localhost defaults for dev.
- **OpenSpec candidate:** maybe — suggested change slug: `configurable-cors-origins`

### FINDING-008 — No rate limiting on `POST /pokemon`

- **Severity:** Medium
- **Area:** security
- **Location:** `apps/api/src/modules/pokemon/infrastructure/http/pokemon.controller.ts:66-89`
- **Problem:** Unauthenticated endpoint triggers external PokeAPI call + DB write per request with no throttling.
- **Why it matters:** Abuse can exhaust outbound bandwidth, hit PokeAPI fair-use limits, or fill DB in a public demo deployment.
- **Impact:** Availability and cost risk if API is exposed beyond local reto.
- **Recommendation:** Add `@nestjs/throttler` or reverse-proxy rate limits on `POST /pokemon`; document limits in Swagger.
- **OpenSpec candidate:** yes — suggested change slug: `add-post-pokemon-rate-limit`

### FINDING-009 — Re-create same pokemon upserts without documented API contract

- **Severity:** Medium
- **Area:** backend
- **Location:** `apps/api/src/modules/pokemon/application/create-pokemon.use-case.ts:11-24`, `pokemon.orm-entity.ts:5-6`
- **Problem:** Pokemon `id` is primary key. Re-posting the same name updates the row (new `savedAt`) rather than returning 409 or idempotent 200. Test documents this as "upsert" but API/Swagger do not.
- **Why it matters:** Clients may expect duplicate rejection or stable `savedAt`; **Total** does not increase but **Último** changes.
- **Impact:** Subtle UX/data semantics; acceptable for reto if documented.
- **Recommendation:** Document upsert behavior in Swagger and README, or return `409 Conflict` / skip PokeAPI when id exists.
- **OpenSpec candidate:** maybe — suggested change slug: `clarify-duplicate-pokemon-semantics`

### FINDING-010 — E2E tests share persistent DB without isolation

- **Severity:** Medium
- **Area:** tests
- **Location:** `apps/web/playwright.config.ts:5-6`, `apps/web/e2e/*.spec.ts`
- **Problem:** `workers: 1` avoids parallelism but tests mutate shared Postgres. No `beforeAll` reset, unique prefixes, or test DB. Order-dependent assertions (e.g. Total not zero) assume prior runs left data.
- **Why it matters:** CI reruns and local re-runs accumulate state; failures become order-sensitive.
- **Impact:** Flaky acceptance suite over time.
- **Recommendation:** Use unique pokemon names per run (`eevee-${Date.now()}`), reset DB via API hook/fixture, or dedicated `e2e` Compose profile with volume wipe.
- **OpenSpec candidate:** yes — suggested change slug: `isolate-e2e-database-state`

### FINDING-011 — README and Swagger documentation drift

- **Severity:** Medium
- **Area:** docs
- **Location:** `README.md:103-128`, `apps/api/src/main.ts:33-34`
- **Problem:** README curl example omits `spriteUrl` in response sample; does not document `GET /pokemon`. Swagger description still says "Reto Pokemon — POST /pokemon" only.
- **Why it matters:** Documentation-review rule: behavior changes must stay aligned with README/Swagger/OpenSpec.
- **Impact:** Reviewer confusion; manual verification friction.
- **Recommendation:** Update README with `GET /pokemon` example and full response shape; expand Swagger title/description to list both endpoints.
- **OpenSpec candidate:** yes — suggested change slug: `sync-readme-swagger-with-api`

### FINDING-012 — `TypeORM synchronize: true` globally enabled

- **Severity:** Medium
- **Area:** backend
- **Location:** `apps/api/src/app.module.ts:13`
- **Problem:** Schema auto-sync is on for all environments. Documented as intentional for reto, but same binary/image used in Compose has no env guard.
- **Why it matters:** Accidental schema mutations or data loss risk if reused beyond dev.
- **Impact:** Production safety if someone deploys Compose as-is.
- **Recommendation:** Gate with `NODE_ENV !== 'production'` or explicit `DB_SYNCHRONIZE=true`; ADR already mentions future migrations path.
- **OpenSpec candidate:** maybe — suggested change slug: `gate-typeorm-synchronize`

### FINDING-013 — Duplicated `capitalize()` helper

- **Severity:** Low
- **Area:** frontend
- **Location:** `CreatePokemonPage.tsx:16-18`, `PokemonList.tsx:10-12`, `PokemonResult.tsx:7-9`, others
- **Problem:** Same one-liner copied in multiple feature files.
- **Why it matters:** Minor DRY violation; inconsistent future changes possible.
- **Impact:** Maintainability (low).
- **Recommendation:** Single `capitalizeName()` in `features/pokemon/utils` or shared lib if touched again.
- **OpenSpec candidate:** no

### FINDING-014 — Mobile sticky submit button accessibility

- **Severity:** Low
- **Area:** frontend
- **Location:** `apps/web/src/pages/CreatePokemonPage.tsx:89-97`
- **Problem:** Fixed bottom `<button type="submit" form={FORM_ID}>` duplicates desktop submit without `aria-label` distinguishing mobile action.
- **Why it matters:** Screen readers may announce two identical "Agregar" controls in DOM (one hidden on md+ via CSS on form button only).
- **Impact:** Accessibility noise on small viewports.
- **Recommendation:** Hide desktop button on mobile with `hidden md:inline-flex` or add `aria-label="Agregar pokemon (barra inferior)"` on sticky control.
- **OpenSpec candidate:** maybe — suggested change slug: `fix-mobile-submit-a11y`

### FINDING-015 — `apiGet` error paths untested

- **Severity:** Low
- **Area:** tests
- **Location:** `apps/web/src/shared/api/api-client.test.ts` (only `apiPost` 404)
- **Problem:** No tests for `apiGet`, empty data, or generic 500 mapping.
- **Why it matters:** List fetch is critical path for dashboard load.
- **Impact:** Regression risk on list error UX.
- **Recommendation:** Add Vitest cases mirroring `apiPost` coverage for `apiGet`.
- **OpenSpec candidate:** no

### FINDING-016 — `bootstrap()` without top-level error handler

- **Severity:** Low
- **Area:** backend
- **Location:** `apps/api/src/main.ts:43`
- **Problem:** `bootstrap()` is invoked without `.catch()`; unhandled rejection on listen/DB failure.
- **Why it matters:** Container may exit with unclear Node warning instead of logged fatal error.
- **Impact:** Operability in Docker logs.
- **Recommendation:** `bootstrap().catch((err) => { logger.error(err); process.exit(1); })`.
- **OpenSpec candidate:** no

### FINDING-017 — Default Postgres password in Compose

- **Severity:** Low
- **Area:** security
- **Location:** `docker-compose.yml:6-7`, `.env.example:3`
- **Problem:** `changeme` default password is committed and port `5432` is published.
- **Why it matters:** Acceptable for local reto; risky if machine exposes port to LAN without `.env` override.
- **Impact:** Low in isolated dev; credential scanning on exposed hosts.
- **Recommendation:** Document "change before any non-local deploy"; consider not publishing `5432` externally in default Compose.
- **OpenSpec candidate:** no

### FINDING-018 — Response DTO mapping in controller

- **Severity:** Suggestion
- **Area:** backend
- **Location:** `apps/api/src/modules/pokemon/infrastructure/http/pokemon.controller.ts:21-31`
- **Problem:** `toPokemonResponseDto` is appropriate infrastructure concern but inline in controller file.
- **Why it matters:** Controller stays thin today; mapper may grow with fields.
- **Impact:** None currently.
- **Recommendation:** Optional `pokemon-response.mapper.ts` if more endpoints appear.
- **OpenSpec candidate:** no

### FINDING-019 — No security headers on API

- **Severity:** Suggestion
- **Area:** security
- **Location:** `apps/api/src/main.ts`
- **Problem:** No `helmet` or equivalent headers (`X-Content-Type-Options`, etc.).
- **Why it matters:** Defense in depth for any browser-accessed API docs/Swagger UI.
- **Impact:** Low for JSON API behind SPA.
- **Recommendation:** Add `helmet` middleware if scope expands beyond reto.
- **OpenSpec candidate:** maybe

### FINDING-020 — Docker images use floating tags

- **Severity:** Suggestion
- **Area:** infra
- **Location:** `apps/api/Dockerfile:1`, `apps/web/Dockerfile:1`, `docker-compose.yml:3`
- **Problem:** `node:20-alpine`, `postgres:16-alpine`, `nginx:alpine` without digest pins.
- **Why it matters:** Reproducible builds for evaluation months later.
- **Impact:** Low; occasional upstream drift.
- **Recommendation:** Pin digests in CI/production pipelines.
- **OpenSpec candidate:** no

## Strengths

- **Hexagonal module structure** in `apps/api/src/modules/pokemon`: use cases depend on ports; TypeORM and Axios isolated in infrastructure; factory providers wire dependencies cleanly (`pokemon.module.ts`).
- **Consistent API contract**: global `TransformInterceptor` + `HttpExceptionFilter` produce predictable envelopes; domain errors map to correct HTTP status (404, 502, 500).
- **Input validation at boundaries**: `ValidationPipe` with whitelist/forbid; `CreatePokemonDto` custom constraint for `name`/`pokemon` alias; frontend Zod + react-hook-form.
- **Strong automated testing**: backend 36 Jest tests at ~98% statement coverage with meaningful branch tests for PokeAPI client; frontend unit tests for form, list, hooks; 8 Playwright scenarios covering layout, create flow, errors, list, persistence.
- **Operational docs**: root README, developer guide, ADRs, infra C4, OpenSpec specs archived with traceability.
- **Docker ergonomics**: multi-stage builds, `db` healthcheck, sensible defaults in `.env.example`, nginx SPA fallback.
- **UX polish**: sonner toasts, Spanish error messages, loading states, sprite display, accessible list with `aria-current`, mobile sticky CTA.

## Suggested OpenSpec groupings (preview)

Preview only — `/review-to-openspec` creates the real changes.

| Change slug (proposed) | Findings | Rationale |
|------------------------|----------|-----------|
| `init-public-git-repo` | FINDING-001 | Delivery blocker |
| `implement-tipos-stat-or-spec-amendment` | FINDING-002 | Spec vs implementation gap |
| `validate-api-env-on-bootstrap` | FINDING-003 | Shared bootstrap hardening |
| `harden-api-client-parsing` | FINDING-004, FINDING-015 | Frontend HTTP client resilience + tests |
| `add-api-healthcheck-compose` | FINDING-005 | Compose reliability for web/e2e |
| `improve-persistence-error-observability` | FINDING-006 | Backend observability |
| `add-post-pokemon-rate-limit` | FINDING-008 | Security / abuse prevention |
| `isolate-e2e-database-state` | FINDING-010 | Test reliability |
| `sync-readme-swagger-with-api` | FINDING-011 | Documentation drift |
| `delivery-hardening` | FINDING-007, FINDING-012, FINDING-009 | Optional ops/security bundle |

## Out of scope / not reviewed

- Dependency CVE audit (`npm audit`) — not executed in this review
- Playwright E2E execution against live Docker stack — unit tests verified only
- Public remote repository URL verification (no git remote)
- `node_modules` and generated `dist/` artifacts
- Cursor workflow files (`.cursor/commands`, rules) — tooling, not product code
- Performance/load testing (K6)
- CodeGraph index (`.codegraph/` not available in session)
