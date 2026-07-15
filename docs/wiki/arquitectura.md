# Arquitectura: hexagonal + CQRS

Qué usamos, cómo se ve en *este* repo y por qué no metemos todo en un `UsersService` enorme.

Si quieres la decisión formal: [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md).  
Si te trabas con el password y el evento: [finalize await vs EventsHandler](../architecture/finalize-await-vs-events-handler.md).

---

## 1. Hexagonal: piensa en un restaurante

| En el restaurante | En el código | En `users` |
|-------------------|--------------|------------|
| Reglas de la casa (qué pedido vale) | **Dominio** | `User`, errores, evento, puertos |
| Quien arma el pedido de punta a punta | **Aplicación** | Commands, queries, handlers, finalize del password |
| La puerta a la calle / delivery | **Infra / adaptadores** | Controller HTTP, Firestore, bcrypt |
| El trato “necesito guardar clientes” | **Puerto** | `UserRepositoryPort` |
| El almacén de verdad | **Adaptador** | `FirestoreUserRepository` |

### La idea, sin humo

El **dominio no tiene por qué enterarse** si la petición llegó por `curl`, Postman o un bot. Tampoco si los datos están en Firestore, Postgres o un arreglo en memoria.

Eso se llama **inversión de dependencias**: la aplicación habla con **interfaces** (puertos). Las implementaciones (adaptadores) se enchufan en el módulo de Nest.

```text
        ┌─────────────────────────────────┐
        │         Dominio (núcleo)         │
        │   User · ports · events · errors │
        └────────────▲────────────────────┘
                     │ solo mira al dominio
        ┌────────────┴────────────────────┐
        │         Aplicación               │
        │  CreateUserHandler · ListUsers…  │
        └────────────▲────────────────────┘
                     │ recibe puertos
   ┌─────────────────┴──────────────────┐
   │          Infraestructura            │
   │  HTTP · Firestore · bcrypt · crypto │
   └────────────────────────────────────┘
```

### Enchufe y electrodoméstico

El puerto es el **enchufe**. El adaptador es lo que enchufas.

Puedes cambiar de Firestore a otra base sin reescribir la receta (el handler), mientras el enchufe (la interfaz) sea el mismo.

En los tests enchufamos algo barato: `InMemoryUserRepository` en `test-doubles/`. No hace falta prender el emulador.

### Qué rompe esto

| Si haces esto… | Duele porque… |
|----------------|---------------|
| Metes `firebase-admin` en `domain/` o `application/` | El núcleo queda casado con un vendor |
| Pones reglas de password en el controller | Es cocinar en la mesa del cliente |
| Armas un `UsersService` que hace de todo | Para probarlo levantas medio sistema |

---

## 2. CQRS: dos filas distintas

**CQRS** = separar lo que **cambia** algo de lo que solo **pregunta**.

En el banco no usas la misma ventanilla para depositar y para ver el saldo.

| Tipo | Pregunta | ¿Cambia algo? | Aquí |
|------|----------|---------------|------|
| **Command** | “Haz esto” | Sí | `CreateUserCommand` |
| **Query** | “¿Cómo está?” | No | `GetUserByIdQuery`, `ListUsersQuery` |

Pedir un plato mueve inventario. Leer la carta no debería vaciar la nevera.

En Nest: `CommandBus` y `QueryBus`. El controller casi no decide: valida el DTO y despacha.

```text
POST /users       →  CommandBus  →  CreateUserHandler
GET  /users       →  QueryBus    →  ListUsersHandler
GET  /users/:id   →  QueryBus    →  GetUserByIdHandler
```

### Un archivo por pieza

Es la convención del equipo: cada command, query y handler en **su archivo**.

- El review se acota.
- Cada caso de uso tiene su test.
- Evitas el monstruo “todo-users.ts”.

Sí, hay más archivos. A cambio, cuando el módulo crece no se vuelve un nudo.

---

## 3. Cómo se ve aquí

```text
apps/api/src/modules/users/
├── domain/           ← TypeScript puro
├── application/      ← CQRS + servicios + audit
├── infrastructure/   ← Firestore, crypto, HTTP
├── test-doubles/     ← fakes de test
└── users.module.ts   ← cableado Nest
```

### Create sin password (el flujo que más importa)

1. HTTP valida el body.
2. El handler crea el usuario (transacción: reserva del email + doc).
3. Si faltaba password → **await** a `FinalizeMissingPasswordService` (único sitio que escribe el hash).
4. Se publica `UserCreatedEvent` como **aviso** (hoy: un log).
5. Recién ahí el `201`, cuando `hasPassword` ya cuadra.

```text
Cliente → API: POST /users
API → Firestore: create (tx)
API → Firestore: await finalize password
API: publish UserCreated (audit)
Cliente ← 201 + hasPassword
```

### Lecturas

- Listado: topado a 100 (`USERS_LIST_MAX`).
- Get by id: o el user, o `NOT_FOUND`.

Ninguna query toca passwords ni borra usuarios.

### El “evento” de hoy ≠ un job de verdad

Hoy el aviso vive **en el mismo proceso** Nest. Es el altavoz de la cocina: “mesa 4 lista”.

Mañana puede salir por Pub/Sub: [futuro-pubsub.md](./futuro-pubsub.md).

**Regla de oro:** lo que ves en el `201` ya tiene que estar guardado. El `@EventsHandler` **no** genera el password.

---

## 4. Cada capa en una frase

| Capa | Frase |
|------|--------|
| Dominio | Qué es un usuario y qué prometemos. |
| Aplicación | En qué orden hacemos las cosas. |
| Infra | Con qué herramientas (Firebase, bcrypt, HTTP). |
| Controller | De HTTP a comando/consulta, y listo. |

---

## 5. Antes del merge

- [ ] ¿Reglas de negocio en el controller? Sácalas.
- [ ] ¿Firebase en application/domain? No merges.
- [ ] ¿Escribe? Command. ¿Solo lee? Query.
- [ ] ¿El `2xx` depende de un EventsHandler async? Rediseña ([doc](../architecture/finalize-await-vs-events-handler.md)).
- [ ] ¿Hay test del handler con puertos falsos? Si no, agrégalo.

Sigue con: [toma de decisiones](./toma-de-decisiones.md) · [camino del desarrollador](./camino-del-desarrollador.md).
