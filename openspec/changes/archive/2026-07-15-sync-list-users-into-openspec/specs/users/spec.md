## ADDED Requirements

### Requirement: List users query
The system MUST expose `GET /api/v1/users` implemented as a Query + Handler in separate files. The response MUST be HTTP 200 with a JSON array of public user fields (same projection as get-by-id) and MUST NOT include plaintext password or password hash. When no users exist, the system MUST return an empty array (not HTTP 404).

#### Scenario: List returns public users
- **WHEN** a client calls `GET /api/v1/users` and at least one user exists
- **THEN** the system responds with HTTP 200 and an array of public user objects without secrets

#### Scenario: Empty list when none exist
- **WHEN** a client calls `GET /api/v1/users` and the store has no users
- **THEN** the system responds with HTTP 200 and `[]`

#### Scenario: List does not expose secrets
- **WHEN** a listed user has a stored password hash
- **THEN** the list response MUST NOT include `password` or `passwordHash` fields
