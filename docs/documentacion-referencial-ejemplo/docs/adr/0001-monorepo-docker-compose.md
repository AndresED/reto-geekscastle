# ADR-0001: Monorepo y despliegue con Docker Compose

## Estado

Aceptado

## Enmienda (2026-07-03 — CI)

Se añadió **GitHub Actions** para unitarios en push/PR a `main` (change archivado `add-github-actions-ci`). Decisiones de pipeline, alcance y exclusión de CD/E2E en CI: **[ADR-0004 — CI con GitHub Actions](./0004-ci-github-actions.md)**. El requisito canónico está en [`openspec/specs/delivery/spec.md`](/openspec/specs/delivery/spec.md) — *Continuous Integration for Unit Tests*.

## Enmienda (2026-07-03)

Se añadió suite **Playwright** en `apps/web/e2e/` (change archivado `add-e2e-playwright`). El requisito canónico está en [`openspec/specs/delivery/spec.md`](/openspec/specs/delivery/spec.md) — *End-to-End Acceptance Test Suite*. Las menciones originales a E2E “fuera de alcance” en este ADR son **históricas**; la tabla *Elección final* y la política de tests se actualizan abajo.

## Enmienda (2026-07-03 — synchronize)

El `docker-compose.yml` del reto fija `DB_SYNCHRONIZE=true` por defecto aunque la imagen API use `NODE_ENV=production`. Es **intencional** para el demo: TypeORM crea/actualiza el esquema sin migraciones. Entornos production-like deben usar `DB_SYNCHRONIZE=false` (documentado en README). No se añaden migraciones en el alcance del reto.

## Fecha

2026-07-02

## Alcance

Este ADR define la **arquitectura de contenedor del proyecto**: organización del repositorio, límites entre aplicaciones, orquestación con Docker Compose y contrato de comunicación entre servicios.

Las decisiones internas de cada aplicación se documentan por separado:

| ADR | Alcance |
|-----|---------|
| **ADR-0001** (este) | Monorepo, Docker, red, variables de entorno, despliegue |
| [ADR-0002 — Backend](./0002-backend-monolito-modular-hexagonal.md) | NestJS, hexagonal, PokeAPI, persistencia |
| [ADR-0003 — Frontend](./0003-frontend-react-feature-based-tanstack-query.md) | React, capas UI, TanStack Query |
| [ADR-0004 — CI](./0004-ci-github-actions.md) | GitHub Actions, gates, CD fuera de alcance v1 |

## Contexto

El reto técnico Pokemon exige:

1. Servicio **NestJS** con `POST /pokemon`, integración PokeAPI y persistencia en base de datos.
2. Frontend **React** para consumir la API propia (requisito extendido del proyecto).
3. Repositorio público con **`docker-compose.yml`** que compile y despliegue la solución **sin intervención manual**.
4. `README.md` con instrucciones de ejecución y ejemplo del endpoint.
5. Diagrama de la solución (secuencia o flujo).
6. Cobertura de tests unitarios ≥ 85 % en el backend.

Se necesita un contenedor lógico que agrupe backend, frontend y base de datos sin acoplar sus decisiones arquitectónicas internas.

## Elección final

| Área | Decisión adoptada |
|------|-------------------|
| Organización del código | Monorepo simple en raíz (`apps/api` + `apps/web`) |
| Gestor de paquetes | **npm** (un `package.json` por app; sin workspaces) |
| Orquestación | **Docker Compose v2** (`docker compose up --build`) |
| Base de datos | **PostgreSQL 16** (`postgres:16-alpine`) |
| Red entre servicios | Red bridge por defecto de Compose; servicios por nombre DNS (`db`, `api`, `web`) |
| Puerto `db` | `5432` |
| Puerto `api` | `3000` |
| Puerto `web` | `80` (build estático + **nginx**) |
| Imagen base Node | `node:20-alpine` en Dockerfiles de `api` y `web` |
| Comunicación browser → API | `http://localhost:3000` vía `VITE_API_BASE_URL` |
| Integración PokeAPI | **Solo `api`**; el browser no llama a PokeAPI |
| CORS | Orígenes permitidos: `http://localhost:80`, `http://localhost:5173` |
| Variables de entorno | `.env.example` en raíz; `.env` gitignored |
| Paquetes compartidos | **No** (`packages/` fuera de alcance) |
| Herramientas de monorepo | **No** Nx, Turborepo ni pnpm workspaces |
| Orquestación cloud | **No** Kubernetes ni ECS |
| Tests en CI remoto | **GitHub Actions** — ver [ADR-0004](./0004-ci-github-actions.md) |
| Umbral cobertura obligatorio (reto) | **≥ 85 %** solo en **`apps/api`** |
| Tests E2E automatizados | **Añadido** (2026-07-03): Playwright en `apps/web`; ver [delivery spec](/openspec/specs/delivery/spec.md) |
| Schema DB en Compose demo | `DB_SYNCHRONIZE=true` por defecto (TypeORM synchronize); desactivar con `false` en prod-like |

## Decisión

Organizar el proyecto como **monorepo simple** en la raíz del repositorio, con **Docker Compose** como único mecanismo de orquestación para desarrollo y entrega. Los valores de la tabla anterior son **vinculantes** para la implementación.

### Estructura del repositorio

```
reto/
├── apps/
│   ├── api/                 # NestJS — ver ADR-0002
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                 # React + Vite — ver ADR-0003
│       ├── src/
│       ├── Dockerfile
│       └── package.json
├── docs/
│   └── adr/
│       ├── 0001-monorepo-docker-compose.md
│       ├── 0002-backend-monolito-modular-hexagonal.md
│       ├── 0003-frontend-react-feature-based-tanstack-query.md
│       └── 0004-ci-github-actions.md
├── docker-compose.yml
├── .env.example
└── README.md
```

### Servicios Docker Compose

| Servicio | Imagen / build | Puerto host | Rol |
|----------|----------------|-------------|-----|
| `db` | `postgres:16-alpine` | `5432` | Persistencia del backend |
| `api` | `build: ./apps/api` | `3000` | API NestJS |
| `web` | `build: ./apps/web` | `80` | UI React — build Vite servido por nginx |

### Dependencias entre servicios

```
web  ──HTTP──►  api  ──HTTP──►  PokeAPI (externa)
                 │
                 └──TCP──►  db
```

- `api` depende de `db` (`depends_on` + healthcheck).
- `web` depende de `api` (arranque; el browser llama a la API por URL configurada).
- Solo **`api`** contacta PokeAPI. El browser **nunca** llama a PokeAPI directamente.

### Red y URLs

- **`VITE_API_BASE_URL`:** `http://localhost:3000` (inyectada en build de `apps/web`).
- El browser del usuario llama a `api` en el host; dentro de Docker solo `api` conecta a `db`.
- **CORS en `api`:** orígenes `http://localhost:80` y `http://localhost:5173` (dev local sin Docker).

### Variables de entorno (`.env.example` en raíz)

```env
# Database
POSTGRES_USER=pokemon
POSTGRES_PASSWORD=changeme
POSTGRES_DB=pokemon

# API (apps/api)
DATABASE_URL=postgresql://pokemon:changeme@db:5432/pokemon
PORT=3000
POKEAPI_BASE_URL=https://pokeapi.co/api/v2

# Web (apps/web) — build-time Vite
VITE_API_BASE_URL=http://localhost:3000
```

Secretos reales solo en `.env` local (gitignored). `.env.example` sin valores sensibles de producción.

### Flujo de despliegue

```bash
# Un solo comando desde la raíz
docker compose up --build
```

1. `db` arranca y pasa healthcheck.
2. `api` conecta a `db`, expone `POST /pokemon`.
3. `web` se construye y sirve la UI apuntando a `api`.

### Límites de responsabilidad

| Responsabilidad | Dueño |
|-----------------|-------|
| Estructura de carpetas del monorepo | ADR-0001 |
| Docker Compose, redes, puertos | ADR-0001 |
| Arquitectura hexagonal NestJS | ADR-0002 |
| Módulo pokemon, PokeAPI, TypeORM | ADR-0002 |
| Arquitectura React (features, hooks) | ADR-0003 |
| Componentes UI, TanStack Query | ADR-0003 |
| Estrategia de tests (política global) | ADR-0001 |
| Tests unitarios backend (detalle) | ADR-0002 |
| Tests unitarios frontend (detalle) | ADR-0003 |

### Estrategia de tests (nivel monorepo)

El reto exige **cobertura de tests unitarios ≥ 85 %** como criterio de evaluación. Ese umbral es **obligatorio solo para `apps/api`**. El frontend tiene tests definidos en ADR-0003 pero **sin umbral numérico exigido por el reto**.

| App | Framework | Comando | Umbral cobertura | Tipo exigido |
|-----|-----------|---------|------------------|--------------|
| `apps/api` | Jest | `npm run test:cov` | **≥ 85 %** statements | Unitarios |
| `apps/web` | Vitest | `npm run test` | Sin umbral del reto | Unitarios en capas críticas |
| `apps/web` | Playwright | `npm run test:e2e` | — | Aceptación E2E (stack Docker) |

**Política:**

- Los tests se ejecutan **fuera de Docker** en desarrollo/CI (`npm test` dentro de cada app).
- `docker compose up` **no** ejecuta tests; valida despliegue. Los E2E Playwright requieren stack levantado y se ejecutan desde el host contra `http://localhost`.
- No hay paquete `packages/testing` compartido en v1.
- Tests E2E Playwright y tests de integración con DB real en **backend** siguen siendo opcionales; la aceptación fullstack se cubre con Playwright en `apps/web` (ver [delivery spec](/openspec/specs/delivery/spec.md)).
- El README raíz documenta cómo correr tests de `api`, `web` y E2E.

```
apps/api/src/.../*.spec.ts     → Jest (unitarios, mocks de ports)
apps/web/src/.../*.test.tsx    → Vitest + Testing Library
```

## Alternativas consideradas

### A. Dos repositorios separados (api + web)

**Pros:** Despliegue independiente.  
**Contras:** Dos repos para un reto; README y compose fragmentados; evaluación más difícil.  
**Veredicto:** Descartada.

### B. Monorepo con Nx / Turborepo

**Pros:** Cache de builds, graph de dependencias, generators.  
**Contras:** Configuración extra sin beneficio con dos apps y sin paquetes compartidos.  
**Veredicto:** Descartada para v1.

### C. Monorepo simple + Docker Compose (elegida)

**Pros:** Un clone, un `docker compose up`, ADRs separados por app; alineado al reto.  
**Contras:** Tipos TS duplicados entre `api` y `web` hasta extraer `packages/types`.  
**Veredicto:** Aceptada.

### D. Kubernetes / ECS en lugar de Compose

**Pros:** Producción real.  
**Contras:** Fuera del alcance del reto; complejidad innecesaria.  
**Veredicto:** Descartada.

## Consecuencias

### Positivas

- Un diagrama de sistema de alto nivel cubre `Usuario → web → api → db / PokeAPI`.
- Cada ADR hijo puede evolucionar sin reescribir el otro.
- Cumple entrega con `docker-compose.yml` en raíz.

### Negativas / trade-offs

- Sin paquete compartido de tipos: contrato HTTP documentado en README y duplicado en TS de cada app.
- Dos Dockerfiles que mantener.
- `depends_on` no garantiza que `api` esté lista para recibir tráfico; se puede añadir healthcheck en `api` en implementación.

## Criterios de aceptación

La implementación debe cumplir **todos** los ítems de **Elección final** y:

- [ ] Raíz contiene `apps/api/`, `apps/web/`, `docker-compose.yml`, `.env.example`, `README.md`.
- [ ] `docker compose up --build` levanta `db`, `api` y `web` sin pasos manuales.
- [ ] `web` expone puerto **80** con nginx; `api` puerto **3000**; `db` puerto **5432**.
- [ ] Flujo E2E: formulario en `web` → `POST /pokemon` en `api` → persistencia en `db` (automatizado con Playwright en `apps/web/e2e/`).
- [ ] Solo `api` tiene credenciales y conexión a `db`.
- [ ] `.env` no está commiteado; `.env.example` sí.
- [ ] Gestor de paquetes: **npm** en cada app (sin workspaces).
- [ ] `cd apps/api && npm run test:cov` alcanza **≥ 85 %** statements.
- [ ] README raíz documenta comandos de test de `api`, `web` y E2E Playwright.

## Referencias

- [Reto técnico Pokemon](/docs/requirements/reto.md)
- [ADR-0002 — Backend](./0002-backend-monolito-modular-hexagonal.md)
- [ADR-0003 — Frontend](./0003-frontend-react-feature-based-tanstack-query.md)
- [ADR-0004 — CI](./0004-ci-github-actions.md)
