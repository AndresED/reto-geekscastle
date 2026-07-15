# Code Review Report (r7) — Staff / Senior vs Challenge

| Field | Value |
|-------|--------|
| Date | 2026-07-15 |
| Scope | Full challenge delivery review at tip after merge `7dae5f2` (post-r6: list cap, global throttle, wiki). Prior: [r6](./2026-07-15-code-review-r6.md). |
| Evidence | `npm run test:cov` → **44** tests green, **93.45%** statements / **66.66%** branches |
| Reviewer | Staff + Principal Engineer (Cursor agent) |

## Executive summary

El repositorio **cumple el challenge** (PDF + criterios del correo/historial US + Nx/Terraform lite). El diseño create → `await FinalizeMissingPasswordService` → `201` → `UserCreatedEvent` solo-audit es sólido y defendible ante staff: no miente el contrato HTTP pese a Nest `EventBus.publish` no-await. Post-r6 cerró los Medium de listado ilimitado y drift de specs; el throttle ya aplica a POST y GET.

**Recomendación de entrega: Approve — ship.**

Lo abierto es **higiene de narrativa** (checklists US/ADR en `[ ]` con código ya hecho; criterio 4 de ADR-0002 desactualizado) y polish (rules abiertas, tests HTTP 409 / audit estructural, CI lint). Ninguno bloquea el deadline si la demo + README + Swagger son el artefacto evaluado.

## Challenge scorecard

| Requisito | Resultado | Evidencia |
|-----------|-----------|-----------|
| NestJS + TS strict + prefix + health | Pass | `apps/api`, `/api/v1/health` |
| Hexagonal + CQRS archivos separados | Pass | `modules/users/{domain,application,infrastructure}` |
| `POST /users` + password opcional | Pass | Controller → CommandBus → handler |
| Generate+hash+update **antes** del 201 | Pass | `FinalizeMissingPasswordService` await en create path |
| Evento al insertar | Pass* | `UserCreatedEvent` + audit handler sin mutación |
| Nunca plaintext en DB / respuesta | Pass | bcrypt + response DTO |
| GET by id | Pass | `GetUserByIdQuery` |
| Tests ≥ 80% + CI | Pass | 93.45% stmts; GHA build + `test:cov` + TF validate |
| README / docs / Swagger / GCP narrativo | Pass | README + wiki + `/api/docs` |
| Nx lite + Terraform lite | Pass | ADR-0006/0007 |
| Auth HTTP | N/A | Explicitamente fuera de alcance |

\*Pass con diseño consciente documentado (ADR-0002, `docs/architecture/finalize-await-vs-events-handler.md`, wiki).

## Prior findings (r6 → r7)

| Prior (r6) | Status |
|------------|--------|
| FINDING-001 Unbounded list + SkipThrottle GET | **Fixed** — `USERS_LIST_MAX=100`, throttle compartido en `/users` |
| FINDING-002 OpenSpec/C4 drift list | **Fixed** — living specs + archive |
| FINDING-003 findByEmail pre-check | **Open** (Low) |
| FINDING-004 Open firestore.rules | **Open** (Low) |
| FINDING-005 CI lint / shallow health | **Open** (Suggestion) |
| FINDING-006 Weak audit test | **Open** (Suggestion) |

> **Post-r7 hygiene (same day):** FINDING-001 de r7 (checklists US/ADR + wording ADR-0002 #4) **aplicado** — criterios tildados; criterio 4 alinea finalize await vs evento audit.

## Findings index (r7)

| ID | Severity | Area | Title | OpenSpec? |
|----|----------|------|-------|-----------|
| FINDING-001 | Medium | docs | US/ADR acceptance checkboxes + ADR-0002 #4 wording | **Fixed** |
| FINDING-002 | Low | security | Open demo `firestore.rules` until 2026-08-14 | no |
| FINDING-003 | Low | backend | Redundant `findByEmail` before transactional create | no |
| FINDING-004 | Low | backend | Compensate delete can leave orphan if delete fails | no |
| FINDING-005 | Suggestion | tests | No HTTP 409 e2e; audit test only “does not throw” | no |
| FINDING-006 | Suggestion | infra | CI skips lint; health shallow; list no cursor | no |

## Findings

### FINDING-001 — Checklist hygiene + stale ADR criterion

- **Severity:** Medium
- **Area:** docs
- **Status:** **Fixed** (2026-07-15) — criterios US-01…US-22 y ADR-0001…0007 tildados; ADR-0002 #4 reescrito (finalize await + evento audit).
- **Location:** `docs/requirements/reto.md`; `docs/adr/0002-backend-hexagonal-cqrs.md`
- **Problem (histórico):** Checkboxes vacíos + wording que atribuía la generación de password al evento.
- **Recommendation:** N/A — cerrado.

### FINDING-002 — Permissive Firestore rules

- **Severity:** Low
- **Area:** security
- **Location:** `firestore.rules:15`
- **Problem:** `allow read, write` hasta `2026-08-14`. Backend usa Admin SDK (bypassa rules).
- **Why it matters:** Primera puerta que mucha gente abre en un review Firebase.
- **Impact:** Seguro en el path Admin + emulator; peligroso si se copia a un proyecto real con client SDK.
- **Recommendation:** En entrevista: “deny client / admin only”. Opcional: deny-all + nota en README.
- **OpenSpec candidate:** no

### FINDING-003 — Pre-check `findByEmail`

- **Severity:** Low
- **Area:** backend
- **Location:** `create-user.handler.ts:51-54` vs transacción en `firestore-user.repository.ts`
- **Problem:** Lectura no atómica previa; la autoridad es la tx del claim.
- **Why it matters:** Pregunta clásica de race; la respuesta correcta ya está en el adapter.
- **Impact:** Un RTT extra; sin gap de correctness.
- **Recommendation:** Documentar “fast-fail UX” o eliminar.
- **OpenSpec candidate:** no

### FINDING-004 — Compensate orphan residual

- **Severity:** Low
- **Area:** backend
- **Location:** `create-user.handler.ts:98-109`; ADR-0002 ya lo admite
- **Problem:** Si finalize falla y luego `delete` falla, queda documento huérfano.
- **Why it matters:** Honestidad de consistencia eventual en demo.
- **Impact:** Bajo en emulator; en prod pediría outbox/reconciliation.
- **Recommendation:** Mencionar en entrevista; no bloquear deadline.
- **OpenSpec candidate:** no

### FINDING-005 — Test gaps (carried / extended)

- **Severity:** Suggestion
- **Area:** tests
- **Location:** `user-created-audit.handler.spec.ts`; ausencia de HTTP 409 integration
- **Problem:** Audit solo “does not throw”; 409 cubierto vía filter/unit, no create HTTP.
- **Impact:** Bajo con suite actual verde.
- **Recommendation:** Post-deadline.
- **OpenSpec candidate:** no

### FINDING-006 — Ops polish (carried)

- **Severity:** Suggestion
- **Area:** infra
- **Problem:** Sin eslint en CI; health sin Firestore; list capped sin cursor.
- **Impact:** Cosmético vs PDF.
- **Recommendation:** Skip pre-deadline.
- **OpenSpec candidate:** no

## Strengths (staff lens)

1. **Contrato HTTP honesto** con finalize await — el antipatrón EventsHandler-mutator está consciente y documentado.
2. **Unicidad de email** con transacción + harden de mapping 409.
3. **Superficie evaluable:** Swagger, curls, wiki pedagógica, plan GCP sin mentir un deploy.
4. **Respuesta a feedback de staff** (throttle en GET, cap de list).
5. **Cobertura real** sobre el gate (93% stmts, 44 tests) incluyendo smoke bcrypt + throttle HTTP.
6. **Límites de capa clean:** grep mental — no Admin SDK en domain/application.

## Preguntas que el panel debería hacer (y respuestas que ya tenés)

| Pregunta | Respuesta corta en el repo |
|----------|----------------------------|
| ¿Por qué no generás en `@EventsHandler`? | Nest no await-ea; ver `docs/architecture/finalize-await-vs-events-handler.md` |
| ¿Race de email? | Claim `emails/{email}` en `runTransaction` |
| ¿Falla el generate? | No 201 + best-effort delete |
| ¿Auth? | Fuera de alcance; Helmet + 20/min |
| ¿Prod? | Cloud Run + Firestore + Pub/Sub post-finalize (README) |

## Suggested follow-ups

| Orden | Acción | Esfuerzo |
|-------|--------|----------|
| 1 | ~~Tildar US/ADR + fix ADR-0002 #4~~ | **Hecho** |
| 2 | (Opc) deny-all `firestore.rules` + nota README | ~10 min |
| 3 | (Opc) assert estructural audit handler | ~15 min |

No se requieren OpenSpec nuevos para ship.

## Out of scope / not reviewed

- Deploy real a GCP.
- `npm audit` CVE sweep exhaustivo.
- Emulator e2e create en CI.
- Revisión de PDF binario página a página (se usó `docs/requirements/reto.md` + ADRs como proxy).
