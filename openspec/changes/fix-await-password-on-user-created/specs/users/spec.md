## MODIFIED Requirements

### Requirement: Generate secure password on missing password
When the user-created flow indicates a missing password, the system MUST generate a cryptographically secure password of at least 16 characters, hash it, and update the user record via the repository port before the create HTTP response is finalized. If the user already has a password hash, the handler MUST NOT regenerate or overwrite it. If generation or update fails for a missing-password create, the create request MUST NOT succeed with HTTP 201.

#### Scenario: Missing password triggers generate and update before response
- **WHEN** a client creates a user without a password
- **THEN** the system generates a password, hashes it, persists the hash via the repository, and completes create only after that update succeeds

#### Scenario: Existing password is not regenerated
- **WHEN** the password-on-created handler runs for a user that already has a password hash OR receives password-missing=false
- **THEN** it MUST NOT generate a new password or overwrite the existing hash

#### Scenario: Generate or update failure fails create
- **WHEN** password generation or password update fails after user insert for a missing-password create
- **THEN** the create operation MUST fail (not return HTTP 201 success)

## ADDED Requirements

### Requirement: Create response reflects finalized password state
After a successful `POST /api/v1/users` without a client-supplied password, the response body MUST report `passwordGenerated: true` and `hasPassword: true` together. The response MUST NOT claim `passwordGenerated: true` while `hasPassword` is false.

#### Scenario: Consistent flags on create without password
- **WHEN** create succeeds without a client-supplied password
- **THEN** `passwordGenerated` is true and `hasPassword` is true in the same response
