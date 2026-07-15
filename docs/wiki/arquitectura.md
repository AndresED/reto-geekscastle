# Arquitectura: hexagonal + CQRS

Qué usamos, cómo aparece en este repositorio y por qué no metemos todo en un `UsersService` gigante.

Referencias: [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md) y [finalize await vs EventsHandler](../architecture/finalize-await-vs-events-handler.md).

---

## 1. Hexagonal: el restaurante

Imagina un **restaurante**:

| En el restaurante | En el código | En el módulo `users` |
|-------------------|--------------|----------------------|
| Las reglas de la casa (qué pedido es válido) | **Dominio** | `User`, errores, `UserCreatedEvent`, puertos |
| Quien toma el pedido y lo gestiona hasta el final | **Aplicación** | Commands, queries, handlers, `FinalizeMissingPasswordService` |
| La puerta a la calle, el delivery, el WhatsApp | **Infraestructura / adaptadores** | Controller HTTP, Firestore, bcrypt |
| El acuerdo “necesito guardar clientes” | **Puerto** | `UserRepositoryPort` |
| El almacén real | **Adaptador** | `FirestoreUserRepository` |

### Idea central

El **dominio no debería saber** si la petición llegó por `curl`, Postman o un bot. Tampoco debería saber si los datos están en Firestore, Postgres o un arreglo en memoria.

Eso es **inversión de dependencias**: la aplicación habla con **interfaces** (puertos). Las implementaciones (adaptadores) se conectan en el módulo de Nest.

```text
        ┌─────────────────────────────────┐
        │         Dominio (núcleo)         │
        │   User · ports · events · errors │
        └────────────▲────────────────────┘
                     │ solo depende del dominio
        ┌────────────┴────────────────────┐
        │         Aplicación               │
        │  CreateUserHandler · ListUsers…  │
        └────────────▲────────────────────┘
                     │ recibe puertos por inyección
   ┌─────────────────┴──────────────────┐
   │          Infraestructura            │
   │  HTTP · Firestore · bcrypt · crypto │
   └────────────────────────────────────┘
```

### Analogía del enchufe

El puerto es el **enchufe de la pared**. El adaptador es el **aparato** que enchufas.

Puedes cambiar el microondas (pasar de Firestore a otra base) sin reescribir la receta (el handler), mientras el enchufe (la interfaz) sea el mismo.

En los tests enchufamos un sustituto barato: `InMemoryUserRepository` en `test-doubles/`. No hace falta encender el emulador.

### Qué rompe el hexágono

| Antipatrón | Por qué molesta |
|------------|-----------------|
| Importar `firebase-admin` en `domain/` o `application/` | El núcleo queda atado a un proveedor |
| Meter reglas de password en el controller | Es cocinar en la mesa del cliente |
| Un `UsersService` que crea, lista, hashea y habla con Firebase | Para probarlo hay que levantar casi todo el sistema |

---

## 2. CQRS: dos ventanillas

**CQRS** consiste en separar lo que **modifica** el sistema de lo que solo **consulta**.

En un banco no usas la misma fila para depositar y para preguntar el saldo, aunque las dos miren la misma cuenta.

| Tipo | Pregunta | ¿Modifica algo? | En esta API |
|------|----------|-----------------|-------------|
| **Command** | “Haz esto” | Sí | `CreateUserCommand` → `CreateUserHandler` |
| **Query** | “¿Cómo está?” | No | `GetUserByIdQuery`, `ListUsersQuery` |

Otra imagen: pedir un plato **sí** mueve inventario; leer la carta **no** debería vaciar la nevera.

En Nest usamos `CommandBus` y `QueryBus`. El controller casi no decide: valida el DTO y despacha.

```text
POST /users       →  CreateUserDto  →  CommandBus  →  CreateUserHandler
GET  /users       →                  →  QueryBus    →  ListUsersHandler
GET  /users/:id                      →  QueryBus    →  GetUserByIdHandler
```

### Por qué un archivo por pieza

La convención del equipo es: cada command, query y handler en **su propio archivo**.

- La revisión se limita a un archivo concreto.
- Cada caso de uso tiene su test.
- Evitamos el archivo monstruo donde cabe “todo users”.

El costo es más archivos y algo de repetición. La ganancia es que, cuando el módulo crece, no se vuelve un nudo imposible.

---

## 3. Cómo se ve en *este* repositorio

```text
apps/api/src/modules/users/
├── domain/           ← TypeScript puro
├── application/      ← CQRS, servicios, handler de auditoría
├── infrastructure/   ← Firestore, crypto, HTTP
├── test-doubles/     ← dobles solo para tests
└── users.module.ts   ← cableado Nest (puertos → adaptadores)
```

### Flujo de create (el más importante)

1. HTTP valida el body (`CreateUserDto`).
2. El handler crea el usuario (transacción: reserva del email + documento).
3. Si no venía password → se hace **await** de `FinalizeMissingPasswordService` (único camino que escribe el hash).
4. Se publica `UserCreatedEvent` como **aviso** (hoy solo deja un log de auditoría).
5. Se responde `201` cuando el documento ya tiene sentido de negocio (`hasPassword` coherente).

```text
Cliente                API                         Firestore
  │                     │                              │
  │  POST /users        │                              │
  │────────────────────►│  create (tx)                 │
  │                     │─────────────────────────────►│
  │                     │  await finalize password     │
  │                     │─────────────────────────────►│
  │                     │  publish UserCreated (audit) │
  │  201 + hasPassword  │                              │
  │◄────────────────────│                              │
```

### Lecturas

- `ListUsersQuery` → `list(limit)` con tope (`USERS_LIST_MAX = 100`).
- `GetUserByIdQuery` → `findById` o error de dominio `NOT_FOUND`.

Ninguna query toca passwords ni borra usuarios.

### Evento de dominio ≠ trabajo asíncrono real

Hoy el aviso vive **dentro del mismo proceso** Nest (`EventBus`). Es el altavoz de la cocina: “mesa 4 lista”.

Mañana ese mismo aviso puede salir por **Pub/Sub** hacia otro servicio: [futuro-pubsub.md](./futuro-pubsub.md).

**Regla práctica:** lo que el cliente ve en el `201` tiene que estar **ya guardado** en el camino con `await`. El `@EventsHandler` **no** es donde se genera el password.

---

## 4. Cada capa en una frase

| Capa | Frase útil |
|------|------------|
| Dominio | Qué es un usuario y qué prometemos. |
| Aplicación | En qué orden hacemos las cosas. |
| Infraestructura | Con qué herramientas concretas (Firebase, bcrypt, HTTP). |
| Controller | Traduce HTTP a comando o consulta, y listo. |

---

## 5. Antes de hacer merge, repasa esto

- [ ] ¿Hay reglas de negocio en el controller? Sácalas.
- [ ] ¿Se coló Firebase en `application` o `domain`? No hagas merge.
- [ ] ¿Escribe? Command. ¿Solo lee? Query.
- [ ] ¿El `2xx` depende de un `@EventsHandler` asíncrono? Rediseña (ver doc de finalize).
- [ ] ¿El handler tiene test con puertos mockeados o in-memory? Si no, agrégalo.

Sigue con: [toma de decisiones](./toma-de-decisiones.md) · [camino del desarrollador](./camino-del-desarrollador.md).
