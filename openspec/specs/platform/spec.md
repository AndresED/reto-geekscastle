# platform Specification

## Purpose
NestJS platform bootstrap: strict TypeScript, /api/v1 prefix, health, hexagonal layout, CQRS file separation, and validated env.
## Requirements
### Requirement: Backend technology stack
The system MUST be implemented as a NestJS application in TypeScript with strict type-checking enabled.

#### Scenario: Application boots
- **WHEN** the developer starts the NestJS application with valid configuration
- **THEN** the process listens on the configured PORT and serves HTTP

### Requirement: Global API prefix and health endpoint
The system MUST expose a health endpoint under the global API prefix `/api/v1`.

#### Scenario: Health check succeeds
- **WHEN** a client calls `GET /api/v1/health`
- **THEN** the system responds with HTTP 200

### Requirement: Hexagonal module layout
The `users` feature MUST be organized into domain, application, and infrastructure layers such that domain code MUST NOT import NestJS HTTP modules or `firebase-admin`.

#### Scenario: Domain independence
- **WHEN** the domain layer source is inspected
- **THEN** it contains entities, ports, domain errors/events only, without Firebase or controller decorators

### Requirement: CQRS file separation
Each command, query, domain/application event, and its corresponding handler MUST live in its own source file and MUST be wired through `@nestjs/cqrs`.

#### Scenario: Create user artifacts are separate files
- **WHEN** a developer locates create-user CQRS artifacts
- **THEN** `CreateUserCommand` and `CreateUserHandler` exist as separate files

### Requirement: Validated configuration
The application MUST validate required environment variables at bootstrap and MUST fail fast when required Firebase/project/port settings are missing or invalid.

#### Scenario: Missing required env fails bootstrap
- **WHEN** required environment variables are absent
- **THEN** the application MUST NOT start successfully

