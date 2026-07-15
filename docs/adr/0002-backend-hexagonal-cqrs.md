# ADR-0002: Backend hexagonal + CQRS (archivos independientes)

## Estado

Aceptado

## Enmienda (2026-07-15 — await password on create)

Nest `EventBus.publish` **no espera** a los `@EventsHandler`. Para cumplir el contrato HTTP:

1. `CreateUserHandler` **await** `FinalizeMissingPasswordService.execute(userId)` en el request path cuando falta password (único ejecutor mutante).
2. Luego publica `UserCreatedEvent` como señal de dominio / audit — **sin** `@EventsHandler` que vuelva a generar password.
3. Finalize es **idempotente** si ya hay `passwordHash`.
4. Si generate/update falla tras el insert: el create **falla** (no `201`) y se hace **best-effort delete** del documento. Si el delete también falla (o hay crash a mitad), puede quedar huérfano residual.
5. Create sin password solo responde tras reload con `hasPassword: true`.

## Fecha

2026-07-15

## Alcance

Patrones de `src/modules/users`: capas, CQRS, eventos de dominio, inyección de ports.  
Firebase concreto → [ADR-0003](./0003-firebase-firestore-emulator.md).  
Seguridad password → [ADR-0005](./0005-seguridad-passwords-y-api.md).

## Contexto

El reto pide Clean Architecture. El equipo exige **hexagonal + CQRS** con **command/query/handler/event cada uno en su archivo**, para trazabilidad y tests unitarios sin Nest HTTP.

Un solo use-case file (estilo Pokemon referencial) **no** cumple la convención del equipo.

## Elección final

| Área | Decisión |
|------|----------|
| Arquitectura | Hexagonal (ports & adapters) + Clean |
| Application | **CQRS** con `@nestjs/cqrs` |
| Convención | 1 command/query/event + 1 handler = **archivos separados** |
| Controllers | Solo DTO + `CommandBus` / `QueryBus` |
| Domain | Entidad `User`, errors, ports, events (sin Nest/Firebase) |
| Persistencia port | `UserRepositoryPort` |
| Password ports | `PasswordGeneratorPort`, `PasswordHasherPort` |
| Evento del reto | `UserCreatedEvent` (señal); finalize de password en application service await |
| Validación HTTP | `ValidationPipe` global + DTO |
| Errores | Domain errors → `HttpExceptionFilter` |
| Tests | Jest; mocks de ports en handlers |

## Decisión

### Flujo de escritura (create)

1. `UsersController` valida `CreateUserDto` → `CreateUserCommand`.
2. `CreateUserHandler`:
   - Si viene password: hashea y `repository.create` con hash.
   - Si no: `repository.create` sin password → **await** `FinalizeMissingPasswordService`.
   - Publica `UserCreatedEvent` (notificación; no re-ejecuta generate).
   - Si faltaba password: `findById` y devolver usuario finalizado.
3. `FinalizeMissingPasswordService`:
   - Si ya tiene hash → return (idempotencia).
   - Si falta → generate → hash → `repository.updatePassword`.

Esto cumple: “evento al insertar”, “generar password seguro”, “actualizar registro”, un solo path mutante.

### Estructura de archivos (ejemplo vinculante en espíritu)

```
modules/users/
├── domain/
│   ├── entities/user.entity.ts
│   ├── errors/
│   ├── events/user-created.event.ts
│   └── ports/
│       ├── user-repository.port.ts
│       ├── password-generator.port.ts
│       └── password-hasher.port.ts
├── application/
│   ├── commands/create-user.command.ts
│   ├── commands/handlers/create-user.handler.ts
│   ├── queries/get-user-by-id.query.ts
│   ├── queries/handlers/get-user-by-id.handler.ts
│   ├── finalize-missing-password.service.ts
│   └── events/handlers/user-created-audit.handler.ts  # log only
├── infrastructure/
│   ├── persistence/firestore-user.repository.ts
│   ├── crypto/crypto-password.generator.ts
│   ├── crypto/bcrypt-password.hasher.ts
│   └── http/
│       ├── users.controller.ts
│       └── dto/create-user.dto.ts
└── users.module.ts
```

### Reglas de dependencia

| Capa | Puede depender de |
|------|-------------------|
| `domain/` | Solo TypeScript puro |
| `application/` | `domain/` (+ `@nestjs/cqrs` decorators si el equipo lo acepta; preferible handlers sin Admin SDK) |
| `infrastructure/` | domain, application contracts, Nest, Firebase Admin, bcrypt |
| HTTP controller | DTO + buses; **cero** reglas de password |

### Qué no hacer

- Un `UsersService` gordo con create + generate + update.
- Command y Handler en el mismo archivo.
- Importar `firebase-admin` desde `application/` o `domain/`.

## Alternativas consideradas

### A. Use case único sin CQRS

Como el reto Pokemon referencial. **Veredicto:** Descartada — el equipo exige CQRS.

### B. Cloud Function `onCreate` en Firestore

**Pros:** Evento “real” de DB. **Contras:** Sale del Nest/Clean Architecture pedida; dificulta tests locales unificados. **Veredicto:** Descartada como solución principal; Nest EventBus simula el requisito de negocio.

### C. Hexagonal + CQRS (elegida)

**Pros:** Alineado a stack del equipo; handlers 100 % mockeables. **Contras:** Más archivos. **Veredicto:** Aceptada.

## Consecuencias

- Más boilerplate; a cambio specs y reviews por archivo claros.
- Secuencia Controller → CommandBus → Handler → Ports → EventBus → Event Handler.

## Criterios de aceptación

- [ ] No hay lógica de negocio en controllers.
- [ ] Cada command/query/event handler vive en su archivo.
- [ ] Domain sin Firebase/Nest HTTP.
- [ ] Evento de create cubre generación de password cuando falta.
- [ ] Tests de handlers con ports mockeados (ver US-16).
