# Camino del desarrollador

Para cuando llegas a **mantener** la API o a **meter un feature** sin pelearte con las carpetas.

¿Solo quieres prenderla? → [README](../../README.md).  
¿Quieres el porqué? → [arquitectura](./arquitectura.md).

---

## 0. Mapa en un minuto

```text
Controller HTTP  →  Command o Query  →  Handler  →  Puertos  →  Adaptador
```

Si el cambio es “el usuario hace X”, casi siempre es un **Command** o una **Query**, no un método suelto en el controller.

---

## 1. Primer día

### Arranque

1. Clona, copia `.env.example` → `.env`, `npm install` en la raíz y en `apps/api`.
2. Terminal A: `firebase emulators:start --only firestore`.
3. Terminal B: `npm run api:serve`.
4. Abre http://localhost:3000/api/docs.
5. Prueba health y un `POST /users` del README.

### Lectura mínima

| # | Qué | ~Tiempo |
|---|-----|---------|
| 1 | Este doc | 10 min |
| 2 | [Arquitectura](./arquitectura.md) | 15 min |
| 3 | [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md) | 10 min |
| 4 | [Finalize vs EventsHandler](../architecture/finalize-await-vs-events-handler.md) | 15 min |
| 5 | `create-user.handler.ts` + su test | 20 min |
| 6 | [Base de datos](../infra/base-de-datos.md) | 5 min |

Con eso ya puedes opinar en un PR.

### ¿Ya “entró” el módulo?

- Explicas por qué el password **no** nace en `UserCreatedAuditHandler`.
- Sabes dónde pondrías un `UpdateUserEmailCommand`.
- Sabes mockear `USER_REPOSITORY_PORT` en un test.

---

## 2. Según lo que quieras hacer

| Quieres… | Camino | Empieza por… |
|----------|--------|--------------|
| Endpoint de lectura | Query | `application/queries/…` + `@Get` |
| Endpoint de escritura | Command | `application/commands/…` + DTO |
| Cambiar Firestore | Adaptador | `infrastructure/persistence/…` |
| Mail / SMS / etc. | Puerto + adaptador | `domain/ports` + `infrastructure` + `users.module` |
| Solo docs | Docs | `docs/` (OpenSpec solo si cambia comportamiento) |
| Feature con criterios formales | OpenSpec | propose → apply → archive |

---

## 3. Receta: lectura

Ejemplo: `GET /users/:id/profile-summary`.

1. ¿Ya hay algo parecido? Mira get-by-id y list.
2. Query en su archivo.
3. Handler solo con **puertos** (cero Firebase ahí).
4. Si falta el dato en el puerto → amplías port + Firestore + in-memory.
5. Controller: params → `queryBus.execute` → DTO sin hash.
6. Test del handler; HTTP del controller si aporta.
7. Swagger al día.
8. Si el contrato es nuevo e importa al evaluador → OpenSpec + curl en el README.

### No te la pegues

- [ ] Nada de `password` / `passwordHash` en la respuesta.
- [ ] No pongas `@SkipThrottle` en `/users` (solo health).
- [ ] Listados: respeta el tope de 100 o abre otro cambio para paginar bien.

---

## 4. Receta: escritura

Ejemplo: desactivar usuario.

1. Command + handler + tests.
2. Reglas en dominio/aplicación, no en el controller.
3. Errores tipados → el filtro HTTP los traduce.
4. Efecto “después”:
   - Tiene que verse en la respuesta → `await` en el mismo camino (como el finalize).
   - Solo es un aviso → evento / Pub/Sub ([futuro-pubsub](./futuro-pubsub.md)).
5. Transacción si dos docs tienen que quedar alineados (create + claim en `emails/`).

---

## 5. Dónde no metas código

| Sitio | Evita |
|-------|--------|
| Controller | bcrypt, unicidad de email, generar password |
| `domain/` | Decoradores HTTP, `firebase-admin` |
| `@EventsHandler` | Mutaciones que el cliente asume hechas en el `2xx` |
| Handler de query | `repository.update*` |

---

## 6. Tests

```bash
cd apps/api
npm test
npm run test:cov          # ≥ 80 % statements
npm run test:smoke
```

Handlers con mocks o `InMemoryUserRepository`.  
Throttle HTTP: mira `users.throttle.http.spec.ts`.

---

## 7. Día a día

```text
rama ← US-XX u OpenSpec
  → código + tests
  → README / Swagger / docs si cambió el contrato
  → PR (CI verde)
  → ¿rompe hexagonal o CQRS?
  → merge
```

Sin secretos en git. El reto se demo con emulador; no hace falta `terraform apply`.

---

## 8. Si huele raro

| Qué ves | Sospecha | Dónde mirar |
|---------|----------|-------------|
| `201` y `hasPassword: false` | Finalize sin await | [doc finalize](../architecture/finalize-await-vs-events-handler.md) |
| `500` con email duplicado | Conflicto / tx | Repo Firestore + ADR |
| `429` en health | Sacaron SkipThrottle | ADR-0005 |
| Listado lento | Sin limit | Cap de listado |
| Handler intesteable | Dependencia concreta | [arquitectura](./arquitectura.md) |

---

## 9. Niveles

| Nivel | Ya puedes… |
|-------|------------|
| Entrar | Seguir la receta, pasar tests, respetar capas |
| Mantener | Revisar PRs con ADR-0002, proponer OpenSpec |
| Ser dueño | Enmendar ADRs, pensar Pub/Sub, cuidar `ponytail:` |

---

## 10. Atajos

| Necesitas | Ir a |
|-----------|------|
| Arranque | [README](../../README.md) |
| Arquitectura | [arquitectura.md](./arquitectura.md) |
| Decisiones | [toma-de-decisiones.md](./toma-de-decisiones.md) |
| Pub/Sub | [futuro-pubsub.md](./futuro-pubsub.md) |
| ADRs | [docs/adr/](../adr/) |
| US | [reto.md](../requirements/reto.md) |
| Datos / C4 | [docs/infra/](../infra/README.md) |
