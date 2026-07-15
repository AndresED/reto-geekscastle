# Por qué `FinalizeMissingPasswordService` (await) ≠ `@EventsHandler`

Documento de diseño para el reto GeeksCastle Users API.  
Complementa [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md).

---

## 1. La pregunta que hay que poder contestar

El PDF pide algo como:

> Al insertar un usuario, si no hay password, un **evento** debe generar uno seguro, hashearlo y **actualizar** el registro.

En NestJS mucha gente traduce eso literalmente a:

```ts
await this.eventBus.publish(new UserCreatedEvent(...));
// y un @EventsHandler que genera el password
```

**Eso no garantiza** que el password esté persistido antes del `201 Created`.  
La razón es una limitación (muy documentada) del `EventBus` de `@nestjs/cqrs`: **`publish` no espera a que terminen los `@EventsHandler`**.

Por eso en este repo:

| Rol | Pieza | ¿Mutación de password? |
|-----|--------|-------------------------|
| Path síncrono del request | `FinalizeMissingPasswordService` + `await` | **Sí** (único path) |
| Señal de dominio / audit | `UserCreatedEvent` + `@EventsHandler` | **No** (solo log) |

---

## 2. Cómo se comporta Nest `EventBus.publish`

Pseudocódigo del modelo mental (simplificado):

```ts
// Lo que muchos imaginan (FALSO):
async publish(event) {
  for (const handler of handlers) {
    await handler.handle(event); // ← Nest NO hace esto
  }
}

// Lo que ocurre en la práctica (verdadero a efectos del request):
async publish(event) {
  for (const handler of handlers) {
    // Se invoca el handler, pero publish NO te permite
    // “esperar a que el side-effect termine” como un await fiable
    // del request path. El flujo del CommandHandler sigue.
    void handler.handle(event);
  }
}
```

Consecuencias para el create:

1. El `CommandHandler` puede devolver el resultado HTTP **antes** de que el handler del evento haya escrito el hash.
2. Un `await this.eventBus.publish(...)` **no convierte** el handler en parte del request path: el await solo espera a que Nest *despache* el evento, no a que tu lógica async de bcrypt + Firestore haya acabado.
3. Si el handler falla después, el cliente **ya recibió 201** → mentira de contrato.

Referencias Nest: Event Bus / CQRS — los domain events vía `EventBus` son notificaciones in-process, no un pipeline síncrono de use-case.

---

## 3. El antipatrón: mutar en el `@EventsHandler`

### Código “parecería cumplir el PDF”

```ts
// ❌ ANTIPATRÓN — no usar en este proyecto
@CommandHandler(CreateUserCommand)
export class CreateUserHandler {
  async execute(command: CreateUserCommand) {
    const created = await this.users.create(/* sin password */);
    await this.eventBus.publish(
      new UserCreatedEvent(created.id, /* passwordMissing */ true),
    );
    // El handler cree que “el evento ya hizo el generate”
    return { user: created, passwordGenerated: true }; // ← flags mentirosos
  }
}

@EventsHandler(UserCreatedEvent)
export class GeneratePasswordOnUserCreatedHandler {
  async handle(event: UserCreatedEvent) {
    if (!event.passwordMissing) return;
    const plain = this.generator.generate();
    const hash = await this.hasher.hash(plain); // lento (bcrypt)
    await this.users.updatePassword(event.userId, hash, true);
  }
}
```

### Timeline problemática

```text
t0  POST /users  (sin password)
t1  repository.create  ✅ documento sin hash
t2  eventBus.publish(UserCreatedEvent)
t3  CommandHandler return → Nest serializa 201
       body: { hasPassword: true, passwordGenerated: true }  ← MENTIRA
t4  (aún corriendo) bcrypt.hash ...
t5  repository.updatePassword  ✅

Cliente en t3: cree que hay password.
GET /users/:id entre t3 y t5: hasPassword: false  ← carrera
Si t4/t5 fallan: cliente ya tiene 201 y un user sin hash  ← peor
```

### Peor aún: dual mutación

Si además alguien “arregla” el 201 haciendo:

```ts
await this.eventBus.publish(...);
await this.finalize.execute(userId); // ¡y el EventsHandler también genera!
```

entonces el mismo create puede:

- generar **dos** passwords,
- pisar el hash,
- o correr dos updates concurrentes.

Eso viola el criterio del evaluador: *eventos sin ejecuciones repetidas / ciclos al actualizar*.

---

## 4. El patrón correcto en este repo

### 4.1 Un solo path mutante (finalize await)

```71:86:apps/api/src/modules/users/application/commands/handlers/create-user.handler.ts
    if (passwordMissing) {
      try {
        await this.finalizeMissingPassword.execute(created.id);
      } catch (error) {
        await this.compensateCreate(created.id);
        throw error;
      }
    }

    await this.eventBus.publish(
      new UserCreatedEvent(created.id, passwordMissing),
    );

    const finalized = passwordMissing
      ? await this.users.findById(created.id)
      : created;
```

Orden **obligatorio**:

1. Persistencia del user (insert).
2. **`await` finalize** → generate → hash → `updatePassword`.
3. Si falla → compensate (delete) y **no** devolver 201.
4. **Luego** publicar el evento (señal).
5. Recargar y responder con `hasPassword: true` / `passwordGenerated: true` coherentes.

### 4.2 El servicio de finalize (no es EventHandler)

```16:45:apps/api/src/modules/users/application/services/finalize-missing-password.service.ts
/**
 * Request-path finalize for missing-password creates.
 * Not an @EventsHandler — Nest EventBus publish does not await handlers.
 */
@Injectable()
export class FinalizeMissingPasswordService {
  // ...
  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    if (user.hasPassword) {
      return; // idempotente: no regenera
    }

    const plain = this.generator.generate();
    const passwordHash = await this.hasher.hash(plain);
    await this.users.updatePassword(userId, passwordHash, true);
  }
}
```

Por qué es un **application service** y no un handler de evento:

- Se puede `await` desde el command (contrato HTTP).
- Es **idempotente** (`hasPassword` → return).
- No depende del bus para la mutación.
- Está registrado como provider Nest normal en `UsersModule`.

### 4.3 El evento + handler de audit (sí cumple “hay evento”)

```ts
// domain
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly passwordMissing: boolean,
  ) {}
}
```

```ts
// application — SOLO observación
@EventsHandler(UserCreatedEvent)
export class UserCreatedAuditHandler
  implements IEventHandler<UserCreatedEvent>
{
  handle(event: UserCreatedEvent): void {
    this.logger.log(
      `UserCreated userId=${event.userId} passwordMissing=${event.passwordMissing}`,
    );
  }
}
```

Esto satisface:

- “Al insertar se dispara un evento” (archivo propio + publicación).
- “Hay un handler del evento en archivo propio”.
- **Sin** ciclos ni segunda escritura de password.

---

## 5. Diagrama: malo vs bueno

### Antipatron (mutación en EventsHandler)

```text
POST /users
   │
   ▼
CreateUserHandler
   │ create(user sin hash)
   │ publish(UserCreated) ──fire-and-forget──► GeneratePasswordHandler
   │ return 201 ─────────────────────────────────────► Cliente
   │                                      (bcrypt + update más tarde)
```

### Este repo

```text
POST /users
   │
   ▼
CreateUserHandler
   │ create(user)
   │ await FinalizeMissingPasswordService.execute  ◄── único mutate
   │     (generate → bcrypt → updatePassword)
   │ si falla → delete + throw (no 201)
   │ publish(UserCreated) ──► UserCreatedAuditHandler (log)
   │ findById → 201 con hasPassword:true
   ▼
Cliente (contrato honesto)
```

---

## 6. Tabla “¿cuándo usar cada cosa?”

| Necesidad | Usar |
|-----------|------|
| El HTTP **debe** reflejar un side-effect (hash persistido) | `await` a un use case / application service |
| Notificar “pasó X” a observadores (log, métricas, email async) | `EventBus` / Pub/Sub **después** del side-effect crítico |
| Idempotencia ante reintentos | Guardas en el servicio (`if (user.hasPassword) return`) |
| Evolución a GCP | Mismo orden: mutate → 201 → publicar a Pub/Sub; el subscriber **no** regenera password |

---

## 7. Ejemplo mental de interview (30 segundos)

> “En Nest, `EventBus.publish` no espera a los `@EventsHandler`. Si generáramos el password ahí, podríamos responder 201 con `hasPassword: true` antes de que bcrypt y Firestore terminaran, o dejar un user sin hash si el handler falla. Por eso el path mutante es `FinalizeMissingPasswordService` con `await` dentro del `CreateUserHandler`. El `UserCreatedEvent` igual se publica, pero su handler solo hace audit. Así cumplimos el evento del reto **sin** mentirle al cliente ni doble-mutar.”

---

## 8. Cómo probar que el diseño se sostiene

Smoke / unit ya existentes:

- Create sin password → respuesta REST con `passwordGenerated: true` **y** `hasPassword: true`.
- Update failure → create **no** es 201 + compensate delete.
- Finalize con hash existente → no regenera.
- Audit handler → no llama repo/hasher (clase sin ports).

Si alguien mueve el generate al `@EventsHandler` sin await real del request, esos tests deberían fallar o dejar de ser válidos.

---

## 9. Relación con el correo de evaluación

> Evitar duplicados, ejecuciones repetidas o ciclos al actualizar registros.

Nuestro diseño:

1. **Una** escritura de password por create (finalize).
2. Event handler **sin** `updatePassword`.
3. Finalize **idempotente** si ya hay hash.
4. Evento publicado **después** del mutate, no como motor del mutate.

Eso es exactamente “evento al insertar” + contrato HTTP serio + sin loops.

---

## Referencias en el repo

| Pieza | Ruta |
|-------|------|
| Command + await finalize | `apps/api/.../commands/handlers/create-user.handler.ts` |
| Application service | `apps/api/.../services/finalize-missing-password.service.ts` |
| Evento de dominio | `apps/api/.../domain/events/user-created.event.ts` |
| Handler audit | `apps/api/.../events/handlers/user-created-audit.handler.ts` |
| ADR | `docs/adr/0002-backend-hexagonal-cqrs.md` |
| Spec viva | `openspec/specs/users/spec.md` (User created domain event / finalize) |
