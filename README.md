# Reto GeeksCastle — Users API

API **NestJS** (hexagonal + **CQRS**) + **Firebase Firestore**, orquestada con **Nx lite**, IaC **Terraform lite**.  
Al crear un usuario sin `password`, un evento de dominio genera uno seguro, lo hashea (bcrypt) y actualiza el documento.

**Deadline de entrega:** antes del **2026-07-16 12:00 CDMX**.

## Stack

| Pieza | Detalle |
|-------|---------|
| App | `apps/api` (NestJS 11, TypeScript strict) |
| Workspace | Nx lite (`nx serve/build/test api`) |
| Persistencia | Firestore via `firebase-admin` + emulator |
| Tests | Jest ≥ 80 % statements |
| CI | GitHub Actions — build + `test:cov` |
| IaC | `infra/` Terraform (validate/plan; apply opcional) |

## Prerrequisitos

- Node.js 20+
- npm
- Firebase CLI (`npm i -g firebase-tools`) para emulator
- Terraform (opcional, solo `infra/`)

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

### Crear usuario

```bash
# sin password → evento genera uno seguro (hash en Firestore)
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

## Tests

```bash
npm run test:cov
# o: cd apps/api && npm run test:cov
```

Umbral: `coverageThreshold.global.statements: 80`.

## CI

`.github/workflows/ci.yml` — Node 20: `npm ci` → `build` → `test:cov` en `apps/api`.

## Terraform lite

Ver [`infra/README.md`](./infra/README.md). El challenge se demuestra con **emulator**, no con `terraform apply`.

## Documentación

| Doc | Contenido |
|-----|-----------|
| [docs/requirements/reto.md](./docs/requirements/reto.md) | Historias US-01…US-22 |
| [docs/adr/](./docs/adr/) | ADRs 0001–0007 |
| [openspec/changes/bootstrap-users-api/](./openspec/changes/bootstrap-users-api/) | Proposal / design / specs / tasks |
| [reto.md](./reto.md) | Enunciado original |

## Project board

[GitHub Project — Reto Geekscastle Backend](https://github.com/users/AndresED/projects/7/views/1)
