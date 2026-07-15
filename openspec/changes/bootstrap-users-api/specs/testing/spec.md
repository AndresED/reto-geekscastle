## ADDED Requirements

### Requirement: Jest unit test runner
The repository MUST provide npm scripts `test` and `test:cov` that run Jest for the NestJS application.

#### Scenario: Test script runs
- **WHEN** a developer executes `npm run test`
- **THEN** Jest executes the unit test suite and exits non-zero on failures

### Requirement: Coverage threshold eighty percent
Jest configuration MUST enforce a global statements coverage threshold of at least 80 percent (and SHOULD also constrain branches/functions/lines reasonably).

#### Scenario: Coverage below threshold fails
- **WHEN** `npm run test:cov` runs and statements coverage is below 80 percent
- **THEN** the command fails

### Requirement: Critical password and event tests
The suite MUST include unit tests for create-user handling, password generation/hashing adapters or ports, and the user-created event handler that updates the password when missing.

#### Scenario: Create without password publishes missing-password event
- **WHEN** unit tests exercise create without password with mocked ports
- **THEN** they assert the user-created event indicates password missing

#### Scenario: Event handler updates hash when password missing
- **WHEN** unit tests exercise the event handler with password-missing=true
- **THEN** they assert generate + hash + repository update interactions

#### Scenario: Event handler no-op when password present
- **WHEN** unit tests exercise the event handler with password-missing=false
- **THEN** they assert no password regeneration/update occurs

### Requirement: Handlers tested with mocked ports
Application handlers MUST be tested using mocks of ports; unit tests MUST NOT require a live Firestore emulator.

#### Scenario: Create handler test without Firebase
- **WHEN** `CreateUserHandler` unit tests run
- **THEN** they complete successfully with a mocked `UserRepositoryPort`
