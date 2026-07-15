# ADR-0002: Backend — monolito modular con arquitectura hexagonal ligera

## Estado

Aceptado

## Enmienda (2026-07-03)

Los tests E2E **backend** (`supertest` + app levantada) siguen siendo opcionales. La aceptación fullstack se cubre con **Playwright** en `apps/web` — ver [`openspec/specs/delivery/spec.md`](/openspec/specs/delivery/spec.md) y ADR-0001 (enmienda E2E).

## Fecha

2026-07-02

## Alcance

Decisiones **exclusivas de `apps/api`** (NestJS): estructura de código, patrones, integración PokeAPI y persistencia.

| Tema | ADR |
|------|-----|
| Monorepo, Docker, red | [ADR-0001](./0001-monorepo-docker-compose.md) |
| **Backend NestJS** | **ADR-0002 (este)** |
| Frontend React | [ADR-0003](./0003-frontend-react-feature-based-tanstack-query.md) |

## Contexto

La aplicación `apps/api` debe implementar el flujo de negocio del reto:

1. Recibir `POST /pokemon` con `{ "name": "pikachu" }` o `{ "pokemon": "pikachu" }`.
2. Consultar [PokeAPI](https://pokeapi.co/) para obtener datos del personaje.
3. Persistir ID, nombre, un dato básico propio y tres campos adicionales de la API externa.
4. Manejar errores de red, respuestas inválidas y fallos de base de datos.
5. Alcanzar ≥ 85 % de cobertura en tests unitarios.

No hay requisitos de multitenant, colas, eventos distribuidos ni múltiples bounded contexts. El evaluador valora el **diseño de la solución** y el **uso idiomático de NestJS**.

Como referencia se consultó el playbook [nestjs-enterprise-starter](https://github.com/AndresED/nestjs-enterprise-starter). Solo una fracción aplica a este alcance.

## Elección final

| Área | Decisión adoptada |
|------|-------------------|
| Arquitectura | Monolito modular + hexagonal ligera (ports & adapters) |
| Patrón de aplicación | **Use case** (`CreatePokemonUseCase`); sin CQRS |
| Framework | **NestJS 10** |
| Lenguaje | **TypeScript** (`strict`) |
| Base de datos | **PostgreSQL 16** |
| ORM | **TypeORM 0.3** |
| Schema DB | `synchronize: true` (el reto no exige migraciones) |
| Cliente HTTP externo | **`@nestjs/axios`** (Axios) hacia PokeAPI |
| Validación entrada | **`class-validator`** + **`class-transformer`** |
| Tests | **Jest**; cobertura mínima **85 %** (statements) |
| Comando test | `npm run test` · `npm run test:cov` |
| Convención archivos | `*.spec.ts` junto al fuente o en misma carpeta |
| Umbral Jest | `coverageThreshold.global.statements: 85` |
| Tests de integración / E2E (backend) | **No** exigidos; E2E fullstack vía Playwright en `apps/web` (delivery spec) |
| Módulo de negocio | **`pokemon`** (único módulo feature en v1) |
| Inyección de ports | Tokens `POKE_API_PORT`, `POKEMON_REPOSITORY_PORT` |
| Endpoint | `POST /pokemon` |
| Campos persistidos | `id`, `name`, `height`, `weight`, `baseExperience`, `savedAt` |
| Campos desde PokeAPI | `id`, `name`, `height`, `weight`, `base_experience` |
| Campo básico propio | `savedAt` (timestamp de persistencia local) |
| Input aceptado | `{ "name": string }` **o** `{ "pokemon": string }` (DTO unificado) |
| Respuesta éxito | `201 Created` + JSON del pokemon persistido |
| Errores HTTP | `400` validación · `404` no encontrado · `502` PokeAPI caída · `500` DB |

**Descartado definitivamente:** CQRS, Prisma, MongoDB, Redis, Kafka, microservicios, multitenant, BullMQ, migraciones TypeORM.

## Decisión

Implementar en `apps/api` un **monolito modular** con **arquitectura hexagonal ligera** (ports & adapters), organizado por el módulo `pokemon`. La tabla anterior es la especificación vinculante del backend.

### Estructura de `apps/api`

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── shared/
│   │   ├── filters/              # HttpExceptionFilter global
│   │   └── errors/               # Errores de dominio tipados
│   └── modules/
│       └── pokemon/
│           ├── domain/
│           │   ├── entities/
│           │   │   └── pokemon.entity.ts
│           │   └── ports/
│           │       ├── poke-api.port.ts
│           │       └── pokemon-repository.port.ts
│           ├── application/
│           │   └── create-pokemon.use-case.ts
│           ├── infrastructure/
│           │   ├── http/
│           │   │   ├── pokemon.controller.ts
│           │   │   └── dto/
│           │   │       └── create-pokemon.dto.ts
│           │   ├── poke-api/
│           │   │   └── poke-api.client.ts
│           │   └── persistence/
│           │       ├── pokemon.orm-entity.ts
│           │       └── pokemon.repository.ts
│           └── pokemon.module.ts
├── test/                         # opcional: fixtures compartidos
├── jest.config.ts
├── Dockerfile
└── package.json
```

### Estrategia de tests unitarios

Los tests unitarios validan la lógica **sin** PostgreSQL real, **sin** red a PokeAPI y **sin** levantar el servidor HTTP completo salvo tests de controller con `TestingModule` de NestJS.

#### Qué testear por capa

| Capa | Archivo | Enfoque | Dependencias |
|------|---------|---------|--------------|
| **Application** | `create-pokemon.use-case.spec.ts` | Orquestación, ramas de error, normalización `name`/`pokemon` | Mocks de `PokeApiPort` y `PokemonRepositoryPort` |
| **Infrastructure — HTTP** | `pokemon.controller.spec.ts` | Delegación al use case, status `201`, propagación de excepciones | Mock de `CreatePokemonUseCase` |
| **Infrastructure — PokeAPI** | `poke-api.client.spec.ts` | Mapeo respuesta PokeAPI → dominio; 404; timeout/5xx | Mock de `HttpService` (Axios) |
| **Infrastructure — Persistence** | `pokemon.repository.spec.ts` | Mapeo ORM ↔ dominio; error de escritura | Mock de `Repository<PokemonOrmEntity>` |
| **Shared** | `http-exception.filter.spec.ts` | Mapeo errores dominio → status HTTP | — |
| **DTO** | `create-pokemon.dto.spec.ts` | Validación `class-validator` | — |

**Prioridad para alcanzar 85 %:** el grueso de la cobertura debe venir de `CreatePokemonUseCase` y adapters (`poke-api.client`, `pokemon.repository`).

#### Casos de prueba obligatorios — `CreatePokemonUseCase`

| # | Escenario | Resultado esperado |
|---|-----------|-------------------|
| 1 | Input `{ name: "pikachu" }` válido | Llama PokeAPI → persiste → devuelve pokemon con `savedAt` |
| 2 | Input `{ pokemon: "pikachu" }` | Normaliza a `name` y flujo exitoso |
| 3 | PokeAPI devuelve 404 | Lanza `PokemonNotFoundError` |
| 4 | PokeAPI no responde / 5xx | Lanza `ExternalApiUnavailableError` |
| 5 | PokeAPI respuesta sin campos requeridos | Lanza error de dominio (datos inválidos) |
| 6 | Repository falla al guardar | Lanza `PersistenceError` |
| 7 | Pokemon ya existe (si aplica regla) | Comportamiento definido (update o conflicto) |

#### Mocks — reglas

- **Use case:** mock de interfaces `PokeApiPort` y `PokemonRepositoryPort`; nunca TypeORM ni Axios.
- **PokeAPI client:** mock de `HttpService`; fixtures JSON de respuesta PokeAPI en el spec.
- **Repository:** mock del `Repository` de TypeORM o del `DataSource`.
- **Controller:** mock del use case; verificar que no contiene lógica de negocio.

#### Configuración Jest (vinculante)

```json
// package.json — scripts
"test": "jest",
"test:cov": "jest --coverage",
"test:watch": "jest --watch"
```

```typescript
// jest.config.ts — umbrales mínimos
coverageThreshold: {
  global: {
    statements: 85,
    branches: 80,
    functions: 85,
    lines: 85,
  },
},
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/main.ts',
  '!src/**/*.module.ts',
  '!src/**/*.orm-entity.ts',
],
```

Los archivos excluidos del umbral (`main.ts`, `*.module.ts`, `*.orm-entity.ts`) son bootstrap o wiring sin lógica; la lógica debe estar cubierta en use case y adapters.

#### Fuera de alcance (backend)

| Tipo | Estado |
|------|--------|
| Tests con PostgreSQL real (testcontainers) | Opcional; no requerido |
| Tests E2E (`supertest` + app levantada) | Opcional; no cuenta para umbral |
| Tests del frontend | ADR-0003 |

#### Convención de nombres

```
should <comportamiento> when <condición>
```

Ejemplo: `should throw PokemonNotFoundError when PokeAPI returns 404`.

### Reglas de dependencia

| Capa | Puede depender de |
|------|-------------------|
| `domain/` | Nada externo (solo TypeScript puro) |
| `application/` | `domain/` (ports y entidades) |
| `infrastructure/` | `domain/`, `application/`, NestJS, TypeORM, HTTP client |
| `shared/` | Utilidades transversales sin lógica de negocio |

### Patrones adoptados

- **Port `PokeApiPort`**: abstrae PokeAPI; el use case no conoce HTTP.
- **Port `PokemonRepositoryPort`**: abstrae persistencia; el use case no conoce TypeORM.
- **Use case `CreatePokemonUseCase`**: orquestador del POST (sin CQRS).
- **DTO + validación** en capa HTTP.
- **Errores de dominio** mapeados a HTTP en filter global.
- **CORS** habilitado para el origen de `apps/web` (ADR-0001).

### Contrato HTTP expuesto a `apps/web`

```http
POST /pokemon
Content-Type: application/json

{ "name": "pikachu" }
```

```json
// 201 Created
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "baseExperience": 112,
  "savedAt": "2026-07-02T17:00:00.000Z"
}
```

Variante de entrada aceptada: `{ "pokemon": "pikachu" }` — el DTO normaliza a `name` internamente.

## Alternativas consideradas

### A. Controller → Service → Repository

**Pros:** Menos carpetas, patrón NestJS típico.  
**Contras:** Service acumula integración y persistencia; tests más acoplados.  
**Veredicto:** Descartada.

### B. Hexagonal completa + CQRS

**Pros:** Escala en sistemas grandes.  
**Contras:** Sobrecarga para un endpoint.  
**Veredicto:** Descartada. Solo ports/adapters, sin CQRS.

### C. Monolito modular hexagonal ligera (elegida)

**Pros:** Ports mockeables; diagrama de secuencia claro; ≥ 85 % tests alcanzable.  
**Contras:** Más archivos que un CRUD mínimo.  
**Veredicto:** Aceptada.

## Consecuencias

### Positivas

- Secuencia: `Controller → UseCase → PokeApiPort → RepositoryPort → DB`.
- Tests del use case sin NestJS ni DB real.
- Evolución incremental (`GET /pokemon`) sin reestructurar.

### Negativas

- Más archivos que un tutorial básico.
- Mapper explícito si ORM y dominio divergen.
- Tipos de respuesta duplicados respecto a `apps/web` hasta paquete compartido.

## Criterios de aceptación

La implementación debe cumplir **todos** los ítems de **Elección final** y:

- [ ] Código en `apps/api/src/` según estructura definida.
- [ ] Módulo `pokemon/` con capas `domain`, `application`, `infrastructure`.
- [ ] `CreatePokemonUseCase` sin imports de TypeORM ni decoradores NestJS.
- [ ] Ports con tokens `POKE_API_PORT`, `POKEMON_REPOSITORY_PORT`.
- [ ] Persistencia de campos: `id`, `name`, `height`, `weight`, `baseExperience`, `savedAt`.
- [ ] Cliente PokeAPI vía `@nestjs/axios`.
- [ ] `synchronize: true`; sin migraciones.
- [ ] CORS para `http://localhost:80` y `http://localhost:5173`.
- [ ] `npm run test:cov` en `apps/api` ≥ **85 %** statements (Jest).
- [ ] Existen specs de: `CreatePokemonUseCase`, `PokemonController`, `PokeApiClient`, `PokemonRepository`.
- [ ] Casos obligatorios del use case (tabla de 7 escenarios) implementados.
- [ ] `coverageThreshold` configurado en `jest.config.ts`.

## Referencias

- [ADR-0001 — Monorepo y Docker](./0001-monorepo-docker-compose.md)
- [ADR-0003 — Frontend](./0003-frontend-react-feature-based-tanstack-query.md)
- [Reto técnico Pokemon](/docs/requirements/reto.md)
- [nestjs-enterprise-starter](https://github.com/AndresED/nestjs-enterprise-starter)
- [PokeAPI](https://pokeapi.co/)
