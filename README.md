# Reto GeeksCastle — Users API

API **NestJS** (hexagonal + **CQRS**) + **Firebase Firestore**, orquestada con **Nx lite**, IaC **Terraform lite**.  
Al crear un usuario sin `password`, `FinalizeMissingPasswordService` genera uno seguro, lo hashea (bcrypt) y actualiza el documento **en el request path** (await). Luego se publica `UserCreatedEvent` como señal de dominio/audit — Nest `EventBus` no espera handlers (ADR-0002), así que la generación **no** vive en el `@EventsHandler`.

**Deadline de entrega:** antes del **2026-07-16 12:00 CDMX**.

## Stack

| Pieza | Detalle |
|-------|---------|
| App | `apps/api` (NestJS 11, TypeScript strict) |
| Workspace | Nx lite (`nx serve/build/test api`) |
| Persistencia | Firestore via `firebase-admin` + emulator |
| Seguridad | Helmet + throttle `POST /users` 20/min |
| OpenAPI | Swagger UI en `/api/docs` (+ `/api/docs-json`) |
| Tests | Jest ≥ 80 % statements + smoke create→password |
| CI | GitHub Actions — API build/`test:cov` + Terraform validate |
| IaC | `infra/` Terraform (validate/plan; apply opcional) |

## Prerrequisitos

- Node.js 20+
- npm
- Firebase CLI (`npm i -g firebase-tools`) para emulator
- Terraform (opcional en local; validado en CI)

## Setup rápido

```bash
cp .env.example .env
npm install                          # Nx (raíz)
cd apps/api && npm install && cd ../..
```

### Emulator + API

```bash
# terminal 1
firebase emulators:start --only firestore

# terminal 2
npm run api:serve
# o: cd apps/api && npm run start:dev
```

Health: `GET http://localhost:3000/api/v1/health`  
Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (OpenAPI JSON: `/api/docs-json`)

### Crear usuario

```bash
# sin password → genera hash seguro y responde con hasPassword:true
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"jane","email":"jane@example.com"}'

# con password
curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"secret123"}'

# leer (nunca expone password/hash)
curl -s http://localhost:3000/api/v1/users/<id>
```

`POST /api/v1/users` está limitado a **20 req/min** (HTTP 429 si se supera).

Si falla la generación/persistencia del password tras el insert, el create no responde 201 y se intenta borrar el documento (best-effort; un crash a mitad podría dejar un huérfano residual).

El **email** es único (trim + lowercase). Un duplicado responde **409 Conflict**. Claim `emails/{email}` + doc `users/{id}` se escriben en la misma **transacción** Firestore (sin claim huérfano si falla el write del user).

## Tests

```bash
npm run test:cov
# o: cd apps/api && npm run test:cov

# smoke create-without-password → persisted hash
cd apps/api && npm run test:smoke
```

Umbral: `coverageThreshold.global.statements: 80`.

## CI

`.github/workflows/ci.yml`:

- **api** — Node 20: `npm ci` → `build` → `test:cov`
- **terraform** — `fmt -check` + `init -backend=false` + `validate` en `infra/`

## Terraform lite

Ver [`infra/README.md`](./infra/README.md). El challenge se demuestra con **emulator**, no con `terraform apply`.

## Documentación

| Doc | Contenido |
|-----|-----------|
| [docs/requirements/reto.md](./docs/requirements/reto.md) | Historias US-01…US-22 |
| [docs/adr/](./docs/adr/) | ADRs 0001–0007 |
| [openspec/specs/](./openspec/specs/) | Specs vivas (OpenSpec) |
| [openspec/changes/archive/](./openspec/changes/archive/) | Changes archivados |
| [docs/reviews/latest.md](./docs/reviews/latest.md) | Último code review |

## Project board

[GitHub Project — Reto Geekscastle Backend](https://github.com/users/AndresED/projects/7/views/1)
