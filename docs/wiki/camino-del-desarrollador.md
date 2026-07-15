# Camino del desarrollador

Guía para quien llega a **mantener** la API o a **agregar una funcionalidad** sin pelearse con las capas.

Si solo quieres levantar el entorno → [README](../../README.md).  
Si quieres el “por qué” → [arquitectura](./arquitectura.md).

---

## 0. Mapa en un minuto

```text
1. Controller HTTP  →  2. Command o Query  →  3. Handler  →  4. Puertos
                                                              ↓
                                                   5. Adaptador (Firestore / crypto)
```

**Regla práctica:** si el cambio es “el usuario hace X”, casi siempre entra como **Command** o **Query**, no como un método suelto en el controller.

---

## 1. Primer día

### Arranque

1. Clona el repo, copia `.env.example` → `.env`, ejecuta `npm install` en la raíz y en `apps/api`.
2. Terminal A: `firebase emulators:start --only firestore`.
3. Terminal B: `npm run api:serve`.
4. Abre Swagger: http://localhost:3000/api/docs.
5. Prueba `GET /api/v1/health` y un `POST /api/v1/users` del README.

### Lectura mínima (en este orden)

| # | Qué | Tiempo aprox. |
|---|-----|---------------|
| 1 | Este documento | 10 min |
| 2 | [Arquitectura](./arquitectura.md) | 15 min |
| 3 | [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md) | 10 min |
| 4 | [Finalize await vs EventsHandler](../architecture/finalize-await-vs-events-handler.md) | 15 min |
| 5 | `create-user.handler.ts` + su `.spec.ts` | 20 min |
| 6 | [Infra Firestore](../infra/base-de-datos.md) | 5 min |

Con eso ya puedes revisar un pull request con criterio.

### Señales de que el módulo ya se entiende

- Puedes explicar por qué el password **no** se genera en `UserCreatedAuditHandler`.
- Sabes en qué carpetas pondrías un `UpdateUserEmailCommand` nuevo.
- Sabes mockear `USER_REPOSITORY_PORT` en el test de un handler.

---

## 2. Según el tipo de tarea

| Quieres… | Enfoque | Primeros archivos |
|----------|---------|-------------------|
| Endpoint de **lectura** | Query CQRS | `application/queries/…`, handler, `@Get` en el controller, métodos `find*` / `list*` en el puerto |
| Endpoint de **escritura** | Command CQRS | `application/commands/…`, handler, DTO, errores de dominio |
| Cambiar cómo se guarda en Firestore | Adaptador | `infrastructure/persistence/…` (+ test; el dominio solo si cambia el puerto) |
| Integrar correo, SMS, etc. | Puerto + adaptador | `domain/ports/…`, `infrastructure/…`, registro en `users.module.ts` |
| Solo documentación / ADR | Docs | `docs/…` (sin OpenSpec si no hay comportamiento nuevo) |
| Funcionalidad con criterios formales | OpenSpec | propose → apply → archive |

---

## 3. Paso a paso: endpoint de lectura

Ejemplo: `GET /users/:id/profile-summary`.

1. ¿Ya hay algo parecido? Revisa `get-user-by-id` y `list-users`.
2. Define la query (`GetProfileSummaryQuery`) en su propio archivo.
3. El handler habla solo con **puertos** (nada de Firebase ahí).
4. Si el puerto no expone el dato → amplíalo, impleméntalo en Firestore y en el in-memory de `test-doubles/`.
5. Controller: params → `queryBus.execute` → DTO de respuesta (sin hash).
6. Test del handler con repositorio falso; prueba HTTP del controller si aporta.
7. Documenta en Swagger las respuestas y los errores.
8. Si el contrato es nuevo e importa para la evaluación → OpenSpec + ejemplos `curl` en el README.

### Para no meter la pata

- [ ] No devuelvas `password` ni `passwordHash`.
- [ ] Las rutas `/users` ya tienen throttle; no pongas `@SkipThrottle` salvo algo equivalente a health.
- [ ] En listados respeta el tope (`USERS_LIST_MAX`) o abre otro cambio para paginación de verdad.

---

## 4. Paso a paso: endpoint de escritura

Ejemplo: desactivar un usuario.

1. Command + handler + tests.
2. Reglas en **dominio / aplicación**, no en el controller.
3. Errores tipados en `domain/errors`; el filtro HTTP los traduce.
4. Si hay un efecto “después” (correo, métricas):
   - **El cliente necesita verlo reflejado en la respuesta** → `await` en el mismo camino (como el finalize del password).
   - **Solo es un aviso** → evento de dominio / Pub/Sub más adelante ([futuro-pubsub](./futuro-pubsub.md)).
5. Usa transacción en Firestore cuando dos documentos deban quedar consistentes (como create + reserva en `emails/`).

---

## 5. Dónde no pongas código

| Sitio | Evita |
|-------|--------|
| `users.controller.ts` | bcrypt, unicidad de email, generar password |
| `domain/` | Decoradores HTTP de Nest, `firebase-admin` |
| `@EventsHandler` | Mutaciones que el cliente da por hechas en el `2xx` |
| Handler de query | Cualquier `repository.update*` |

---

## 6. Tests

```bash
cd apps/api
npm test                  # suite
npm run test:cov          # ≥ 80 % statements (CI)
npm run test:smoke        # create → password
```

Los handlers se prueban con puertos mockeados o con `InMemoryUserRepository`.  
Para HTTP + throttle, mira `users.throttle.http.spec.ts`.

Nombres: `should <comportamiento> when <condición>` (o el estilo que ya use el archivo).

---

## 7. Flujo del día a día

```text
rama ← issue US-XX u OpenSpec
  → código + tests
  → README / Swagger / docs si cambió el contrato
  → pull request (CI: build + test:cov + terraform validate)
  → revisión: ¿rompe hexagonal o CQRS?
  → merge
```

Nada de secretos en el repositorio ni `.env` real.  
Para el reto no hace falta `terraform apply`: demuestras con el emulador.

---

## 8. Si algo no cuadra

| Síntoma | Sospecha | Dónde mirar |
|---------|----------|-------------|
| `201` pero `hasPassword: false` | Finalize sin await / mutación tardía en el evento | [doc finalize](../architecture/finalize-await-vs-events-handler.md) |
| `500` con email duplicado | Mapeo de conflicto / transacción | ADR de email + repositorio Firestore |
| `429` en health | Quitaron el `@SkipThrottle` de health | ADR-0005 |
| Listado lento o inestable | Sin `limit` / `orderBy` | OpenSpec del tope |
| Handler imposible de testear | Dependencia concreta en application | [arquitectura](./arquitectura.md) |

---

## 9. Tres niveles de soltura

| Nivel | Ya puedes… |
|-------|------------|
| **Entrar al repositorio** | Seguir la guía query/command, pasar tests, respetar capas |
| **Mantener** | Revisar pull requests con el ADR-0002, proponer OpenSpec, tocar adaptadores |
| **Responsable del módulo** | Enmendar ADRs, plantear Pub/Sub / outbox, vigilar la deuda marcada con `ponytail:` |

---

## 10. Atajos

| Necesitas | Ir a |
|-----------|------|
| Arranque | [README](../../README.md) |
| Arquitectura explicada | [arquitectura.md](./arquitectura.md) |
| Cómo decidimos | [toma-de-decisiones.md](./toma-de-decisiones.md) |
| Pub/Sub a futuro | [futuro-pubsub.md](./futuro-pubsub.md) |
| ADRs | [docs/adr/](../adr/) |
| Historias US | [reto.md](../requirements/reto.md) |
| C4 / datos | [docs/infra/](../infra/README.md) |
| OpenSpec | carpeta `openspec/` en la raíz |
