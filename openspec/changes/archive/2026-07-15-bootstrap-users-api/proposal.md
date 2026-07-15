## Why

Debemos entregar la prueba técnica (Users + Firebase + Clean Architecture) antes del **2026-07-16 12:00 CDMX**, con el stack del equipo (NestJS hexagonal + CQRS, Jest ≥ 80 %, GitHub Actions) y señales del proceso (**Nx**, **Terraform**) en modo lite. Hoy el repo solo tiene enunciado y documentación; hace falta un change OpenSpec que fije capacidades y tareas.

## What Changes

- Scaffold NestJS en **Nx lite** (`apps/api`) con health check y config validada.
- Módulo `users` hexagonal + CQRS (command/query/event + handlers en archivos separados).
- Persistencia Firestore vía Firebase Admin SDK, orientada al emulator local.
- Flujo: `POST /users` → create → `UserCreatedEvent` → si falta password, generar seguro, hashear (bcrypt) y actualizar documento.
- `GET /users/:id` de verificación (sin secretos).
- Suite Jest con umbral 80 % y casos clave de password/evento.
- Workflow CI: build + `test:cov` (targets Nx / `apps/api`).
- **Terraform lite** en `infra/` (fmt/validate; apply cloud no obligatorio).
- README de setup alineado a `docs/requirements/reto.md` y ADRs 0001–0007.

## Non-goals

- Frontend / UI.
- Autenticación HTTP (JWT/OAuth) de clientes.
- Firebase Auth como IdP o Cloud Functions como motor del evento.
- CD / `terraform apply` automático a producción.
- Nx multi-lib / module boundaries estrictos.
- Unicidad obligatoria de email (deseable; no bloquea v1 salvo que se implemente `409`).

## Capabilities

### New Capabilities

- `platform`: Bootstrap NestJS, config/env, health, convenciones de capas.
- `users`: Entidad User, CQRS create/get, evento de password, contrato HTTP, ports Firebase/crypto.
- `testing`: Estrategia Jest, umbral 80 %, escenarios obligatorios.
- `delivery`: Emulator local, README, GitHub Actions CI, Nx lite, Terraform lite.

### Modified Capabilities

- _(ninguno — repositorio sin specs previas)_

## Impact

- Nuevo código Nest en `apps/api` (hoy inexistente) + Nx workspace.
- Dependencias: `@nestjs/cqrs`, `firebase-admin`, `bcrypt`, Nx, tooling Firebase CLI (dev), Terraform CLI (autoría/validate).
- API pública v1: `POST/GET /api/v1/users`.
- CI requiere remote GitHub; stories US-01…US-22.
- Fuente de historias: `docs/requirements/reto.md`; *cómo*: `docs/adr/` (incl. 0006 Nx, 0007 Terraform).
- Prioridad bajo deadline: P0 users+Firebase+tests+CI → P1 Nx+Terraform lite.
