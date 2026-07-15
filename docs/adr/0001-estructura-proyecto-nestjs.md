# ADR-0001: Estructura del proyecto NestJS (servicio único)

## Estado

Aceptado

## Enmienda (2026-07-15 — Nx + deadline)

El layout pasa a **Nx workspace lite** con Nest en `apps/api` (señal de stack del proceso de postulación). Ver [ADR-0006](./0006-nx-workspace-lite.md). Terraform lite en `infra/`: [ADR-0007](./0007-terraform-firebase-lite.md).  
**Deadline de entrega del challenge:** antes del **2026-07-16 12:00 CDMX**.

## Enmienda (2026-07-15 — OpenAPI)

- **Swagger / OpenAPI** en `/api/docs` (`@nestjs/swagger`): schemas de request/response y códigos de error documentados.
- JSON export: `/api/docs-json`. Ver README raíz.

## Fecha

2026-07-15

## Alcance

Layout del repositorio, bootstrap NestJS y convenciones de carpetas.  
Backend hexagonal/CQRS → [ADR-0002](./0002-backend-hexagonal-cqrs.md).  
Firebase → [ADR-0003](./0003-firebase-firestore-emulator.md).  
Nx → [ADR-0006](./0006-nx-workspace-lite.md).  
Terraform → [ADR-0007](./0007-terraform-firebase-lite.md).

## Contexto

El reto exige NestJS + TypeScript + Clean Architecture + Firebase. No hay frontend. El proceso de postulación también pedía familiaridad con **Nx** y **Terraform**; se incorporan en forma *lite* para no desviar el PDF.

## Elección final

| Área | Decisión |
|------|----------|
| Forma del repo | **Nx lite** + Nest en `apps/api` (ADR-0006) |
| Package manager | **npm** + Nx (lockfile commiteado) |
| NestJS | Versión actual estable al scaffold |
| TypeScript | `strict` |
| Prefijo HTTP | `/api/v1` |
| Health | `GET /api/v1/health` |
| Documentación API | **Swagger** en `/api/docs` (schemas + errores); ver enmienda OpenAPI |
| Contenedores | Opcional; no sustituye emulator + README |
| IaC | Terraform lite en `infra/` (ADR-0007); demo runtime = emulator |

## Decisión

Entregar un **backend NestJS único**, sin monorepo FE/BE, con documentación en `docs/` y OpenSpec en `openspec/`.

### Estructura objetivo

```
reto-geekscastle/
├── apps/
│   └── api/
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── shared/
│           └── modules/users/{domain,application,infrastructure}
├── infra/                      # Terraform lite (ADR-0007)
├── docs/
├── openspec/
├── .github/workflows/ci.yml
├── firebase.json
├── nx.json
├── .env.example
└── README.md
```

## Alternativas consideradas

### A. Monorepo `apps/api` + `apps/web`

**Pros:** Escalable. **Contras:** Sin UI en el reto. **Veredicto:** Descartada v1.

### B. Servicio Nest solo en raíz `src/`

**Pros:** Mínimo absoluto. **Contras:** No muestra Nx pedido en el proceso. **Veredicto:** Reemplazada por ADR-0006.

### C. Nx lite + `apps/api` (elegida tras enmienda)

**Pros:** Señal Nx + foco en un solo backend. **Contras:** Un poco más de tooling. **Veredicto:** Aceptada.

## Consecuencias

- Evaluador clona un repo y corre API + emulator.
- OpenSpec specs: `platform`, `users`, `testing`, `delivery`.

## Criterios de aceptación

- [ ] Nest arranca en local con health `200`.
- [ ] Árbol de carpetas alineado a este ADR (o desviación documentada en enmienda).
- [ ] `.env.example` + `.gitignore` correctos.
