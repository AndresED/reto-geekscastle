## Context

Repositorio nuevo (sin app Nest aún). Requisitos de producto en `docs/requirements/reto.md`. Decisiones aceptadas en ADRs 0001–0005. Este design concreta el *cómo* del change `bootstrap-users-api` para implementación con `/opsx:apply`.

## Goals / Non-Goals

**Goals:**

- API Nest hexagonal + CQRS que cree users en Firestore.
- Evento de aplicación/dominio post-insert que autogenere password cuando falta.
- Tests unitarios ≥ 80 % y CI build+test.
- Desarrollo local con Firestore emulator.

**Non-Goals:**

- Frontend, auth de API, Cloud Functions, CD.
- Tests e2e obligatorios contra emulator en CI.

## Decisions

### D1 — Nx lite + Nest en `apps/api` (ADR-0001 + ADR-0006)

Workspace Nx con una sola app `apps/api`. Señala experiencia Nx del proceso sin libs especulativas.

**Alternativa:** Nest solo en raíz — descartada tras complemento postulación (Nx).  
**Alternativa:** Nx multi-lib — descartada por deadline 2026-07-16 12:00 CDMX.

### D2 — CQRS + EventBus Nest (ADR-0002)

- `CreateUserCommand` / `CreateUserHandler`
- `GetUserByIdQuery` / `GetUserByIdHandler`
- `UserCreatedEvent` / `GeneratePasswordOnUserCreatedHandler`
- Cada artefacto en archivo propio bajo `modules/users/application/…`

El “evento al insertar” del reto se modela con **EventBus de Nest tras `repository.create`**, no con trigger Firestore. Cumple Clean Architecture + testabilidad.

**Alternativa:** Cloud Function `onCreate` — descartada (ADR-0002).

### D3 — Orden create → event → update password

1. Insert documento (`passwordHash` null si no venía password).
2. Publish event.
3. Handler async del bus genera + hashea + `update`.

Para tests unitarios del create handler: verificar publish del evento; el event handler se testea aparte. Smoke local con emulator valida update real.

**Trade-off:** ventana breve sin password en DB. Aceptable en demo; documentado.

### D4 — Firestore + Admin + emulator (ADR-0003)

Colección `users`. Campos: `username`, `email`, `passwordHash`, `passwordGenerated`, `createdAt`, `updatedAt`.  
DI: token `USER_REPOSITORY_PORT` → `FirestoreUserRepository`.

### D5 — Password ports (ADR-0005)

- `PasswordGeneratorPort`: `crypto.randomBytes`, length 16.
- `PasswordHasherPort`: bcrypt cost 10.
- HTTP nunca devuelve password/hash; sí `passwordGenerated` / `hasPassword`.

### D6 — CI sin emulator (ADR-0004)

`npm ci` → build `api` → `test:cov` (Nx o wrappers). Mocks de ports/Admin en unit tests.

### D6b — Terraform lite (ADR-0007)

Carpeta `infra/` validable con `terraform validate`. Runtime del challenge = emulator; cloud apply opcional y fuera de la demo obligatoria.

### D7 — Validación y errores

`ValidationPipe` global. Domain errors tipados → filter HTTP (`400`/`404`/`500`/`502` según ADR-0005 / US-14).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Event handler falla tras create → user sin password | Log + test; opcional retry futuro; documentar límite demo |
| Confusión bcrypt vs generación | ADR-0005 + ports separados |
| Evaluator espera Cloud Function | README explica EventBus Nest como evento de dominio post-insert |
| Sin git/remote → CI no corre | US-19 + setup git documentado |
| Coverage gaming excluyendo archivos | `collectCoverageFrom` excluye solo `main`, modules wiring, typings |

## Migration Plan

1. Scaffold Nest + deps.
2. Shared config/filter/health.
3. Domain + ports.
4. CQRS handlers + controller.
5. Firestore adapter + emulator scripts.
6. Tests + coverage threshold.
7. CI workflow + README.
8. Archivar OpenSpec change → `openspec/specs/`.

Rollback: N/A (greenfield).

## Open Questions

1. ¿Prefijo exacto `/api/v1` vs `/users` sin versión? **Propuesta:** `/api/v1` (ADR-0001).
2. ¿Unicidad email en v1? **Propuesta:** no bloqueante; si Firebase rules/query lo permiten fácil, añadir `409`.
3. ¿Devolver el password generado una sola vez en `201`? El reto no lo exige; **propuesta:** no devolverlo (más seguro). Flag `passwordGenerated: true` basta.
4. Si el tiempo aprieta antes del deadline: ¿recortar US-21/US-22 a ADRs + esqueleto mínimo ya documentado? **Propuesta:** sí — P0 challenge PDF primero.
