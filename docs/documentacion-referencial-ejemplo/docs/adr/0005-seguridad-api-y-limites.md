# ADR-0005: Criterios de seguridad y límites de exposición

## Estado

Aceptado

## Fecha

2026-07-03

## Alcance

Políticas de **seguridad aplicadas** en el reto Pokemon y **límites conscientes** (lo que no está implementado). Aplica principalmente a `apps/api`; el frontend solo consume la API propia.

| ADR | Tema relacionado |
|-----|------------------|
| [ADR-0002](./0002-backend-monolito-modular-hexagonal.md) | Validación DTO, errores de dominio, filtros HTTP |
| [ADR-0004](./0004-ci-github-actions.md) | Gates automáticos (lint, build, tests) |
| **ADR-0005** (este) | Throttle, headers, CORS, secretos, superficie de ataque |

## Contexto

El reto es una demo fullstack sin usuarios ni datos clínicos, pero el evaluador espera **criterio de producción**: no exponer secretos, validar entradas, limitar abuso en rutas mutantes y documentar qué queda fuera de alcance.

No hay requisito de OAuth, WAF ni pentest. El objetivo es **defensa razonable en profundidad** sin sobre-ingeniería.

## Elección final

| Control | Implementación | Rutas / ámbito |
|---------|----------------|----------------|
| Rate limiting | `@nestjs/throttler` + `ThrottlerGuard` global | `POST /pokemon`: **20 req/min** por IP; `GET /pokemon`, `/health`, Swagger: **exentos** (`@SkipThrottle` / sin throttle en lectura) |
| Headers HTTP | `helmet` en `main.ts` | CSP desactivado (`contentSecurityPolicy: false`) para no romper Swagger UI en demo |
| CORS | `enableCors({ origin: parseCorsOrigins() })` | Lista explícita; override con `CORS_ORIGINS` (comma-separated) |
| Validación de entrada | `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`) + `class-validator` en DTOs | Body/query de controllers |
| Secretos y config | `validateEnv` en bootstrap (`ConfigModule`); `.env` en `.gitignore` | `DATABASE_URL`, `PORT`, `POKEAPI_BASE_URL` |
| Errores al cliente | `HttpExceptionFilter` — mensajes de dominio; sin stack traces en respuesta | Todas las rutas HTTP |
| Logging | `Logger` Nest en 5xx; sin tokens ni PII en logs | Errores de persistencia / servidor |
| Frontend | Solo llama a la API propia (`VITE_API_BASE_URL`); `api-client` valida envelope JSON | Browser → `api`, no PokeAPI directo |
| Autenticación | **No implementada** (reto single-tenant demo) | — |
| HTTPS / TLS | **Fuera de alcance** — Compose local sin terminación TLS | Evolución: reverse proxy (Nginx, ALB) |

## Decisión

### 1. Throttle acotado a `POST /pokemon`

**Problema:** `POST /pokemon` dispara llamada externa (PokeAPI) y escritura en DB; es el vector de abuso más costoso.

**Decisión:**

- `ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])` en `AppModule`.
- `APP_GUARD` → `ThrottlerGuard` global.
- `PokemonController.create` → `@Throttle({ default: { ttl: 60000, limit: 20 } })`.
- `PokemonController.list` y `HealthController` → `@SkipThrottle()`.

**Respuesta:** HTTP `429 Too Many Requests` (documentado en Swagger). El frontend mapea el envelope a mensaje en español.

**Verificación:** test HTTP `pokemon-throttle.spec.ts` — 20 POST exitosos + 21.º → `429`; GET no limitado.

### 2. Validación y superficie de entrada

- DTOs rechazan campos extra (`forbidNonWhitelisted`).
- `CreatePokemonDto` exige `name` o `pokemon` (custom validator).
- PokeAPI es la única salida HTTP del backend hacia internet (timeout 5s en `HttpModule`).

### 3. Configuración y secretos

- Variables sensibles solo en `.env` / entorno del contenedor; `.env.example` con placeholders.
- `validateEnv` falla rápido al arrancar si falta `DATABASE_URL` o `PORT` inválido.
- **Nunca** loguear connection strings ni tokens (política de equipo; sin datos de usuario en este reto).

### 4. CORS y Helmet

- CORS restrictivo por origen — no `*` en producción real; en demo localhost + puertos de dev.
- Helmet activo con CSP relajado solo para compatibilidad con Swagger en entorno demo.

### 5. Límites conocidos (no bugs)

| Límite | Riesgo en demo | Mitigación en prod |
|--------|----------------|-------------------|
| Sin auth | Cualquiera puede crear pokemon | API key, JWT, o red privada |
| `DB_SYNCHRONIZE=true` en Compose | Esquema mutable | Migraciones TypeORM + `synchronize: false` |
| PostgreSQL `5432` publicado en host | Acceso local accidental | No publicar puerto; solo red Docker |
| Swagger siempre on | Enumeración de API | `SWAGGER_ENABLED` + auth en edge |
| Throttle por IP | Bypass con muchas IPs | WAF / API gateway rate limit |

## Alternativas consideradas

### A. Throttle global en todas las rutas

**Pros:** Configuración única.  
**Contras:** `GET /pokemon` y `/health` degradan bajo carga de lectura legítima (dashboard, probes).  
**Veredicto:** Descartada; throttle solo en mutación.

### B. Rate limit solo en Nginx

**Pros:** Sin código en Nest.  
**Contras:** No documentado en OpenAPI; duplica lógica si hay múltiples instancias sin Redis compartido.  
**Veredicto:** Descartada para reto; Nest Throttler es suficiente en monolito demo.

### C. Redis store para Throttler

**Pros:** Límite consistente con réplicas.  
**Contras:** Nueva dependencia para un solo contenedor.  
**Veredicto:** Fuera de alcance; upgrade path documentado.

## Consecuencias

### Positivas

- Abuso de `POST` acotado sin penalizar lecturas ni healthchecks.
- Criterios de seguridad trazables para el evaluador (ADR + test 429).
- Alineado con reglas de equipo: validar en frontera, secretos fuera del repo.

### Negativas / trade-offs

- Throttle en memoria — no comparte estado entre réplicas.
- Sin auth, el throttle es la única barrera contra escritura anónima.
- Helmet sin CSP estricto — compromiso explícito por Swagger.

## Evolución (no implementado)

1. **Auth:** Cognito / API key en gateway antes de Nest.
2. **Throttler storage:** Redis si hay horizontal scaling.
3. **Swagger:** flag de entorno + deshabilitar en prod.
4. **DB:** quitar puerto host en Compose; migraciones versionadas.
5. **Observabilidad:** correlation id en logs (sin PII) para incidentes.

## Criterios de aceptación

- [ ] `POST /pokemon` devuelve `429` tras superar 20 peticiones/minuto (test automatizado).
- [ ] `GET /pokemon` y `/health` no están sujetos al mismo límite de escritura.
- [ ] README o guía enlazan este ADR en documentación relacionada.
- [ ] Secretos no aparecen en repo ni en ejemplos de curl con valores reales.

## Referencias

- [ADR-0002 — Backend](./0002-backend-monolito-modular-hexagonal.md)
- [ADR-0004 — CI](./0004-ci-github-actions.md)
- [README — límites conocidos](/README.md)
- [guía del desarrollador — variables de entorno](/docs/guia-desarrollador.md)
- Código: `apps/api/src/app.module.ts`, `main.ts`, `pokemon.controller.ts`, `pokemon-throttle.spec.ts`
