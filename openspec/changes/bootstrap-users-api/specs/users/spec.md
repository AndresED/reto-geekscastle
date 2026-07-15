## ADDED Requirements

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
After a user document is inserted, the system MUST publish a `UserCreatedEvent` (or equivalent) indicating whether a password was missing.

#### Scenario: Event published after insert without password
- **WHEN** a user is created without a password
- **THEN** a user-created event is published with a signal that password is missing

#### Scenario: Event published after insert with password
- **WHEN** a user is created with a password
- **THEN** a user-created event is published with a signal that password is not missing

### Requirement: Generate secure password on missing password
When the user-created event indicates a missing password, the event handler MUST generate a cryptographically secure password of at least 16 characters, hash it, and update the user record in Firestore via the repository port.

#### Scenario: Missing password triggers generate and update
- **WHEN** the event handler receives password-missing=true
- **THEN** it generates a password, hashes it, and calls repository update

#### Scenario: Existing password is not regenerated
- **WHEN** the event handler receives password-missing=false
- **THEN** it MUST NOT generate a new password or overwrite the existing hash

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
