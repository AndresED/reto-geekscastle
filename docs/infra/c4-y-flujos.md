# C4 y flujos — Users API

## Contexto (C4 L1)

```mermaid
flowchart LR
  client[Evaluador / HTTP client]
  api[Users API NestJS]
  fs[Firestore Emulator o GCP]

  client -->|POST /users · GET /users · GET /users/:id| api
  api -->|Admin SDK users + emails| fs
```

Resumen: cliente → Nest API → Firestore.

## Contenedores (C4 L2)

```mermaid
flowchart LR
  client[HTTP client]
  nest[apps/api NestJS]
  emu[Firestore Emulator]
  cloud[Firestore cloud opcional]
  tf[infra/ Terraform opcional]

  client -->|api/v1| nest
  nest -->|FIRESTORE_EMULATOR_HOST| emu
  nest -.->|prod sin emulator| cloud
  tf -.->|provisiona proyecto GCP| cloud
```

No hay frontend web ni Postgres en el alcance del challenge. Terraform no configura el emulator local.

## Componentes (módulo users)

| Capa | Piezas |
|------|--------|
| HTTP | `UsersController`, DTO, throttle global (health `@SkipThrottle`) |
| Application | `CreateUserHandler`, `ListUsersHandler`, `GetUserByIdHandler`, `FinalizeMissingPasswordService`, `UserCreatedAuditHandler` |
| Domain | `User`, ports, `UserCreatedEvent`, errors |
| Infrastructure | Firestore repo, bcrypt hasher, crypto password generator, Firebase provider |

## Secuencia: create sin password

```mermaid
sequenceDiagram
  participant C as Cliente
  participant Ctrl as UsersController
  participant CH as CreateUserHandler
  participant Fin as FinalizeMissingPassword
  participant Repo as FirestoreUserRepository
  participant FS as Firestore
  participant Audit as UserCreatedAuditHandler

  C->>Ctrl: POST /api/v1/users {username,email}
  Ctrl->>CH: CreateUserCommand
  CH->>Repo: create(user sin hash)
  Repo->>FS: transaction emails+users
  CH->>Fin: execute(userId) await
  Fin->>Repo: updatePassword(hash)
  Repo->>FS: update users/{id}
  CH-->>Audit: UserCreatedEvent (log only)
  CH-->>C: 201 hasPassword=true passwordGenerated=true
```

## Secuencia: email duplicado

```mermaid
sequenceDiagram
  participant C as Cliente
  participant CH as CreateUserHandler
  participant Repo as FirestoreUserRepository
  participant FS as Firestore

  C->>CH: CreateUserCommand same email
  CH->>Repo: findByEmail / create
  Repo->>FS: claim exists
  Repo-->>CH: UserEmailConflictError
  CH-->>C: 409 Conflict
```

## Referencias

- [Base de datos](./base-de-datos.md)
- [ADR-0002](../adr/0002-backend-hexagonal-cqrs.md) — await finalize + evento señal
- [ADR-0003](../adr/0003-firebase-firestore-emulator.md)
- [Terraform lite](../../infra/README.md)
