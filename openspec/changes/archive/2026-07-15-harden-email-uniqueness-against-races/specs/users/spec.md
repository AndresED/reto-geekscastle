## MODIFIED Requirements

### Requirement: Unique user email on create
The system MUST reject creating a user when another user already exists with the same email (after trim and case-insensitive normalization). The client MUST receive HTTP 409 Conflict and MUST NOT receive secrets. Uniqueness MUST NOT rely solely on a non-atomic check-then-create that allows two concurrent successful creates for the same normalized email; the persistence strategy MUST claim the email under a conflict-detecting write (or equivalent) so at most one user is created for that email under concurrent create attempts.

#### Scenario: Duplicate email returns 409
- **WHEN** a client creates a user with an email that already belongs to an existing user
- **THEN** the system responds with HTTP 409 and does not create a second user for that email

#### Scenario: Distinct emails still create
- **WHEN** a client creates a user with a new email
- **THEN** the system responds with HTTP 201 as for a normal successful create

#### Scenario: Concurrent creates same email
- **WHEN** two create requests for the same normalized email race
- **THEN** at most one user is persisted for that email and the other request fails with conflict (HTTP 409) or an equivalent client-visible failure that does not leave two active users with that email
