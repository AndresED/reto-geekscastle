## ADDED Requirements

### Requirement: Unique user email on create
The system MUST reject creating a user when another user already exists with the same email (after trim and case-insensitive normalization). The client MUST receive HTTP 409 Conflict and MUST NOT receive secrets.

#### Scenario: Duplicate email returns 409
- **WHEN** a client creates a user with an email that already belongs to an existing user
- **THEN** the system responds with HTTP 409 and does not create a second user for that email

#### Scenario: Distinct emails still create
- **WHEN** a client creates a user with a new email
- **THEN** the system responds with HTTP 201 as for a normal successful create
