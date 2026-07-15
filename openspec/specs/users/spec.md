# users Specification

## Purpose
Users bounded context: create/get user via CQRS, Firestore persistence, secure password generation/hashing on create when password is omitted.
## Requirements
### Requirement: User entity fields
The system MUST model a User with auto-generated `id`, `username`, `email`, and optional password at creation time.

#### Scenario: Create payload without password is accepted by contract
- **WHEN** a client submits username and email without password
- **THEN** the create flow is considered valid input for persistence

### Requirement: Create user endpoint
The system MUST expose `POST /api/v1/users` that accepts JSON with required `username` and `email`, and optional `password`, validated at the HTTP boundary.

#### Scenario: Successful create returns 201 without secrets
- **WHEN** a valid create request is processed successfully
- **THEN** the system responds with HTTP 201 and a body that MUST NOT include plaintext password or password hash

#### Scenario: Invalid body returns 400
- **WHEN** the client sends invalid or unexpected fields
- **THEN** the system responds with HTTP 400

### Requirement: Firestore persistence via repository port
The application layer MUST persist users through a `UserRepositoryPort`; the Firestore Admin SDK adapter MUST implement that port.

#### Scenario: Create handler uses port only
- **WHEN** `CreateUserHandler` executes
- **THEN** it MUST interact with persistence only via `UserRepositoryPort` (not `firebase-admin` directly)

### Requirement: Password hashing
When a password is provided or generated, the system MUST store only a bcrypt hash in persistence and MUST NEVER store plaintext passwords.

#### Scenario: Provided password is hashed before persist
- **WHEN** create is called with a password
- **THEN** the repository create/update payload contains a hash and not the original plaintext

### Requirement: User created domain event
After a user document is inserted (and after missing-password finalize has completed when applicable), the system MUST publish a `UserCreatedEvent` (or equivalent) indicating whether a password was missing at create time. Publishing the event MUST NOT be the sole mechanism that generates or persists the password: missing-password generation/hash/update MUST run through the awaited create finalize path. An optional event subscriber MAY observe the event for audit/logging but MUST NOT re-execute password generation/update for that create.

#### Scenario: Event published after insert without password
- **WHEN** a user is created without a password
- **THEN** a user-created event is published with a signal that password is missing (at create intent), after the finalize path has persisted the generated hash

#### Scenario: Event published after insert with password
- **WHEN** a user is created with a password
- **THEN** a user-created event is published with a signal that password is not missing

#### Scenario: Event subscriber does not dual-mutate password
- **WHEN** `UserCreatedEvent` is published after a missing-password create
- **THEN** password generate/hash/update MUST NOT run a second time solely because of EventBus delivery

### Requirement: Generate secure password on missing password
When the user-created flow indicates a missing password, the system MUST generate a cryptographically secure password of at least 16 characters, hash it, and update the user record via the repository port before the create HTTP response is finalized. Password generation/update for create MUST execute through a single awaited application path from the create command (not via dual invoke of the same Nest `@EventsHandler` plus explicit handler call). If the user already has a password hash, the finalize path MUST NOT regenerate or overwrite it. If generation or update fails for a missing-password create, the create request MUST NOT succeed with HTTP 201, and the system MUST compensate so the inserted user is not left as a durable record with a missing password hash (best-effort delete of the created user, or an equivalent failed-state that is not treated as a normal active user).

#### Scenario: Missing password triggers generate and update before response
- **WHEN** a client creates a user without a password
- **THEN** the system generates a password, hashes it, persists the hash via the repository, and completes create only after that update succeeds

#### Scenario: Existing password is not regenerated
- **WHEN** the password finalize path runs for a user that already has a password hash OR receives password-missing=false
- **THEN** it MUST NOT generate a new password or overwrite the existing hash

#### Scenario: Generate or update failure fails create
- **WHEN** password generation or password update fails after user insert for a missing-password create
- **THEN** the create operation MUST fail (not return HTTP 201 success)

#### Scenario: Create command does not dual-invoke password finalize
- **WHEN** create without password completes successfully
- **THEN** password generate/hash/update runs exactly once for that request (no second mutating handler pass caused by EventBus re-entry)

#### Scenario: Finalize failure compensates inserted user
- **WHEN** password generation or password update fails after user insert for a missing-password create
- **THEN** the system MUST attempt to remove the created user (or mark it failed) so a normal subsequent GET does not return an active user without password

### Requirement: Get user by id query
The system MUST expose `GET /api/v1/users/:id` implemented as a Query + Handler in separate files, returning public user fields without password secrets.

#### Scenario: Existing user
- **WHEN** a client requests an existing user id
- **THEN** the system responds with HTTP 200 and public fields only

#### Scenario: Missing user
- **WHEN** a client requests an unknown user id
- **THEN** the system responds with HTTP 404

### Requirement: Thin HTTP controllers
HTTP controllers MUST validate input and dispatch commands/queries only; they MUST NOT contain password generation or Firestore access logic.

#### Scenario: Controller delegates create
- **WHEN** `POST /api/v1/users` is handled
- **THEN** the controller dispatches `CreateUserCommand` through the command bus

### Requirement: Create response reflects finalized password state
After a successful `POST /api/v1/users` without a client-supplied password, the response body MUST report `passwordGenerated: true` and `hasPassword: true` together. The response MUST NOT claim `passwordGenerated: true` while `hasPassword` is false.

#### Scenario: Consistent flags on create without password
- **WHEN** create succeeds without a client-supplied password
- **THEN** `passwordGenerated` is true and `hasPassword` is true in the same response

### Requirement: Unbiased secure password generation
Password generation MUST use a cryptographically secure RNG and MUST NOT use naive modulo mapping of raw bytes onto the charset when that introduces measurable bias. Rejection sampling or an equivalent unbiased method MUST be used.

#### Scenario: Generator produces policy-compliant passwords
- **WHEN** the password generator runs
- **THEN** it returns a password of at least 16 characters using the configured charset without naive biased modulo mapping

### Requirement: Unique user email on create
The system MUST reject creating a user when another user already exists with the same email (after trim and case-insensitive normalization). The client MUST receive HTTP 409 Conflict and MUST NOT receive secrets. Uniqueness MUST NOT rely solely on a non-atomic check-then-create that allows two concurrent successful creates for the same normalized email; the persistence strategy MUST claim the email under a conflict-detecting write (or equivalent) so at most one user is created for that email under concurrent create attempts. A successful create MUST NOT leave a durable email claim without a corresponding user document as a result of a partial write on the create path (claim and user persistence MUST be atomic / all-or-nothing for that create).

#### Scenario: Duplicate email returns 409
- **WHEN** a client creates a user with an email that already belongs to an existing user
- **THEN** the system responds with HTTP 409 and does not create a second user for that email

#### Scenario: Distinct emails still create
- **WHEN** a client creates a user with a new email
- **THEN** the system responds with HTTP 201 as for a normal successful create

#### Scenario: Concurrent creates same email
- **WHEN** two create requests for the same normalized email race
- **THEN** at most one user is persisted for that email and the other request fails with conflict (HTTP 409) or an equivalent client-visible failure that does not leave two active users with that email

#### Scenario: No orphan email claim after failed create write
- **WHEN** user document persistence fails during create after or while claiming the email
- **THEN** the system MUST NOT leave a durable email claim without a corresponding user (transaction abort or equivalent rollback)

