## MODIFIED Requirements

### Requirement: Generate secure password on missing password
When the user-created flow indicates a missing password, the system MUST generate a cryptographically secure password of at least 16 characters, hash it, and update the user record via the repository port before the create HTTP response is finalized. Password generation/update for create MUST execute through a single awaited application path from the create command (not via dual invoke of the same Nest `@EventsHandler` plus explicit handler call). If the user already has a password hash, the finalize path MUST NOT regenerate or overwrite it. If generation or update fails for a missing-password create, the create request MUST NOT succeed with HTTP 201.

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
