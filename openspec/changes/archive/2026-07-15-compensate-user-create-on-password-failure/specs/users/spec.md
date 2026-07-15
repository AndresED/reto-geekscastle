## MODIFIED Requirements

### Requirement: Generate secure password on missing password
When the user-created flow indicates a missing password, the system MUST generate a cryptographically secure password of at least 16 characters, hash it, and update the user record via the repository port before the create HTTP response is finalized. If the user already has a password hash, the handler MUST NOT regenerate or overwrite it. If generation or update fails for a missing-password create, the create request MUST NOT succeed with HTTP 201, and the system MUST compensate so the inserted user is not left as a durable record with a missing password hash (best-effort delete of the created user, or an equivalent failed-state that is not treated as a normal active user).

#### Scenario: Missing password triggers generate and update before response
- **WHEN** a client creates a user without a password
- **THEN** the system generates a password, hashes it, persists the hash via the repository, and completes create only after that update succeeds

#### Scenario: Existing password is not regenerated
- **WHEN** the password-on-created handler runs for a user that already has a password hash OR receives password-missing=false
- **THEN** it MUST NOT generate a new password or overwrite the existing hash

#### Scenario: Generate or update failure fails create
- **WHEN** password generation or password update fails after user insert for a missing-password create
- **THEN** the create operation MUST fail (not return HTTP 201 success)

#### Scenario: Finalize failure compensates inserted user
- **WHEN** password generation or password update fails after user insert for a missing-password create
- **THEN** the system MUST attempt to remove the created user (or mark it failed) so a normal subsequent GET does not return an active user without password
