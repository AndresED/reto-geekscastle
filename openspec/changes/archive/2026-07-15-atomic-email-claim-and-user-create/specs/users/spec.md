## MODIFIED Requirements

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
