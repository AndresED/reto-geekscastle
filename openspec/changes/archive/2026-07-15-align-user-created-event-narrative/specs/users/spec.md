## MODIFIED Requirements

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
